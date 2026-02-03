import { Memo } from '../../types';
import { SyncConfig } from '../sync';
import { BaseSyncStrategy } from './SyncStrategy';

export class GistStrategy extends BaseSyncStrategy {
    async sync(config: SyncConfig, localMemos: Memo[]): Promise<Memo[]> {
        const { gistToken, gistId } = config.settings;
        if (!gistToken) throw new Error('GitHub Token 未配置');

        const headers = {
            'Authorization': `token ${gistToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        let remoteMemos: Memo[] = [];
        try {
            if (gistId) {
                const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
                if (res.ok) {
                    const gistData = await res.json();
                    if (gistData.files && gistData.files['memos.json']) {
                        remoteMemos = JSON.parse(gistData.files['memos.json'].content);
                    }
                }
            }
        } catch (e) {
            console.error('Gist fetch error:', e);
        }

        const merged = this.mergeMemos(localMemos, remoteMemos);

        const needsUpload = merged.some(m => {
            const remote = remoteMemos.find(r => r.id === m.id);
            return !remote || m.updatedAt > remote.updatedAt;
        });

        if (needsUpload || !gistId) {
            const method = gistId ? 'PATCH' : 'POST';
            const url = gistId ? `https://api.github.com/gists/${gistId}` : `https://api.github.com/gists`;
            const body = {
                description: 'Memo AI Sync Data',
                files: { 'memos.json': { content: JSON.stringify(merged) } }
            };

            const saveRes = await fetch(url, { method, headers, body: JSON.stringify(body) });
            if (!saveRes.ok) throw new Error(`Gist API failed: ${saveRes.status}`);

            if (!gistId) {
                const newGist = await saveRes.json();
                config.settings.gistId = newGist.id;
                // 注意：这里需要外部保存配置，或者在这里直接操作 localStorage
                localStorage.setItem('memo_sync_config', JSON.stringify(config));
            }
        }

        return merged;
    }
}
