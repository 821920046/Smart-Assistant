import { Memo, SyncSnapshot, SyncData } from '../../types';
import { SyncConfig, SyncConflictError, DATA_BRANCH } from '../sync';
import { storage } from '../storage';
import { encryption } from '../encryption';
import { BaseSyncStrategy } from './SyncStrategy';

export class GitHubStrategy extends BaseSyncStrategy {
    async sync(config: SyncConfig, localMemos: Memo[]): Promise<Memo[]> {
        // ... (moving logic from syncWithGitHubRepo)
        const { githubToken, githubRepo, encryptionPassword } = config.settings;
        if (!githubToken || !githubRepo || !encryptionPassword) throw new Error('GitHub Repo 配置不完整');

        const token = githubToken.trim();
        const repoFullName = githubRepo.trim();
        const [owner, repo] = repoFullName.split('/');
        if (!owner || !repo) throw new Error('Invalid Repo Format. Use "owner/repo"');

        // Ensure branch exists
        await this.ensureSyncBranch(token, owner, repo);

        const localSnapshotData = await storage.exportSnapshot();
        const localMeta = {
            version: 1,
            updatedAt: Date.now(),
            deviceId: localStorage.getItem('memo_device_id') || 'unknown'
        };

        if (localMeta.deviceId === 'unknown') {
            localMeta.deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('memo_device_id', localMeta.deviceId);
        }

        const fullLocalSnapshot: SyncSnapshot = {
            meta: localMeta,
            data: localSnapshotData
        };

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/sync-data.json?ref=${DATA_BRANCH}&t=${Date.now()}`;
        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        let cloudSnapshot: SyncSnapshot | null = null;
        let sha: string | undefined;

        try {
            const res = await fetch(apiUrl, { headers });
            if (res.ok) {
                const data = await res.json();
                sha = data.sha;
                const content = atob(data.content);
                const encryptedData = JSON.parse(content);
                const decryptedString = await encryption.decrypt(encryptedData, encryptionPassword);
                cloudSnapshot = JSON.parse(decryptedString);
            } else if (res.status !== 404) {
                throw new Error(`GitHub API Error: ${res.status}`);
            }
        } catch (e) {
            if (e instanceof Error && e.message.includes('Decryption failed')) throw e;
            console.log('Fetching cloud data failed or empty', e);
        }

        const lastSyncTime = this.getLastSyncTime();

        // 冲突检测
        if (cloudSnapshot && cloudSnapshot.meta.updatedAt > lastSyncTime) {
            throw new SyncConflictError(fullLocalSnapshot, cloudSnapshot);
        }

        // 推送数据
        const jsonString = JSON.stringify(fullLocalSnapshot);
        const encrypted = await encryption.encrypt(jsonString, encryptionPassword);

        const body = {
            message: `Sync from ${localMeta.deviceId} at ${new Date().toISOString()}`,
            content: btoa(JSON.stringify(encrypted)),
            sha: sha,
            branch: DATA_BRANCH
        };

        const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/sync-data.json`;
        let putRes = await fetch(putUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
        });

        if (putRes.status === 409) {
            putRes = await this.retryWithFreshSha(putUrl, headers, body, owner, repo);
        }

        if (!putRes.ok) throw new Error(`GitHub Push Failed: ${putRes.status}`);

        this.setLastSyncTime(localMeta.updatedAt);
        return await storage.getMemos();
    }

    async getProviderStatus(config: SyncConfig): Promise<any> {
        const { githubToken, githubRepo } = config.settings;
        if (!githubToken || !githubRepo) return { exists: false };
        const [owner, repo] = githubRepo.split('/');
        const headers = { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' };

        try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/sync-data.json?ref=${DATA_BRANCH}&t=${Date.now()}`, { headers, cache: 'no-store' });
            if (res.status === 404) return { exists: false };
            if (!res.ok) return { exists: false };
            const data = await res.json();
            if (!data || Array.isArray(data)) return { exists: false };
            return { exists: true, size: data.size, sha: data.sha };
        } catch (e) {
            return { exists: false };
        }
    }

    async cleanupRemote(config: SyncConfig): Promise<void> {
        const { githubToken, githubRepo } = config.settings;
        if (!githubToken || !githubRepo) return;
        const [owner, repo] = githubRepo.split('/');
        const headers = { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' };

        const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/sync-data.json?ref=${DATA_BRANCH}`, { headers });
        if (!getRes.ok) return;
        const data = await getRes.json();

        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/sync-data.json`, {
            method: 'DELETE',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Cleanup sync data', sha: data.sha, branch: DATA_BRANCH })
        });
    }

    private async ensureSyncBranch(token: string, owner: string, repo: string) {
        const headers = { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' };
        const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${DATA_BRANCH}`, { headers });
        if (branchRes.ok) return;

        // Fetch repo info to get default branch
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        if (!repoRes.ok) throw new Error(`Fetch repo failed: ${repoRes.status}`);
        const repoData = await repoRes.json();
        const defaultBranch = repoData.default_branch || 'main';

        // Get default branch commit SHA
        const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, { headers });
        if (!refRes.ok) throw new Error(`Fetch ${defaultBranch} ref failed: ${refRes.status}`);
        const refData = await refRes.json();

        if (!refData.object || !refData.object.sha) {
            throw new Error(`Could not find SHA for branch ${defaultBranch}`);
        }

        await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: `refs/heads/${DATA_BRANCH}`, sha: refData.object.sha })
        });
    }

    private async retryWithFreshSha(url: string, headers: any, body: any, owner: string, repo: string) {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/sync-data.json?ref=${DATA_BRANCH}&t=${Date.now()}`, { headers });
        if (res.ok) {
            const data = await res.json();
            if (data && !Array.isArray(data) && data.sha) {
                return await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ ...body, sha: data.sha }) });
            }
        }
        return res;
    }

    private getLastSyncTime(): number {
        const time = localStorage.getItem('memo_last_sync_time');
        return time ? parseInt(time, 10) : 0;
    }

    private setLastSyncTime(time: number) {
        localStorage.setItem('memo_last_sync_time', time.toString());
    }

    async getRepoDetails(config: SyncConfig): Promise<{ size: number } | null> {
        const { githubToken, githubRepo } = config.settings;
        if (!githubToken || !githubRepo) return null;
        const [owner, repo] = githubRepo.split('/');
        const headers = { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' };

        try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    async uploadSyncConfig(config: SyncConfig) {
        const { githubToken, githubRepo } = config.settings;
        if (!githubToken || !githubRepo) return;
        const [owner, repo] = githubRepo.split('/');
        const headers = {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        // Save a simple config file (no tokens!) to the repo for discovery
        const publicConfig = {
            repo: githubRepo,
            encryptionPassword: config.settings.encryptionPassword, // This is okay as it's the main key
            updatedAt: Date.now()
        };

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/.sync-config.json`;

        // Check if exists for SHA
        let sha: string | undefined;
        try {
            const res = await fetch(apiUrl, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data && !Array.isArray(data)) {
                    sha = data.sha;
                }
            }
        } catch (e) { }

        await fetch(apiUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: 'Update sync discovery config',
                content: btoa(JSON.stringify(publicConfig)),
                sha
            })
        });
    }

    async restoreConfig(token: string): Promise<SyncConfig | null> {
        const cleanToken = token.trim();
        const userRes = await fetch(`https://api.github.com/user?t=${Date.now()}`, {
            headers: { 'Authorization': `token ${cleanToken}` }
        });
        if (!userRes.ok) throw new Error('Invalid Token');
        const user = await userRes.json();
        const username = user.login;

        const searchUrl = `https://api.github.com/search/code?q=filename:.sync-config.json+user:${username}&t=${Date.now()}`;
        const searchRes = await fetch(searchUrl, {
            headers: { 'Authorization': `token ${cleanToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!searchRes.ok) throw new Error('Search failed.');

        const searchData = await searchRes.json();
        if (!searchData.items || searchData.items.length === 0) return null;

        const fileUrl = searchData.items[0].url;
        const fileRes = await fetch(`${fileUrl}&t=${Date.now()}`, {
            headers: { 'Authorization': `token ${cleanToken}` }
        });
        const fileData = await fileRes.json();
        const content = decodeURIComponent(escape(atob(fileData.content.replace(/\s/g, ''))));
        const json = JSON.parse(content);

        return {
            provider: 'github_repo',
            settings: {
                githubToken: token,
                githubRepo: json.repo,
                encryptionPassword: json.encryptionPassword
            }
        };
    }
}
