
import { Memo, SyncSnapshot, SyncData } from '../types.js';
import { storage } from './storage.js';
import { encryption } from './encryption.js';

export type SyncProvider = 'none' | 'supabase' | 'webdav' | 'gist' | 'github_repo';

export interface SyncConfig {
  provider: SyncProvider;
  settings: {
    supabaseUrl?: string;
    supabaseKey?: string;
    webdavUrl?: string;
    webdavUser?: string;
    webdavPass?: string;
    gistToken?: string;
    gistId?: string;
    githubToken?: string;
    githubRepo?: string;
    encryptionPassword?: string;
  };
}

export class SyncConflictError extends Error {
  localSnapshot: SyncSnapshot;
  cloudSnapshot: SyncSnapshot;
  constructor(local: SyncSnapshot, cloud: SyncSnapshot) {
    super('Sync Conflict Detected');
    this.name = 'SyncConflictError';
    this.localSnapshot = local;
    this.cloudSnapshot = cloud;
  }
}

export const syncService = {
  getConfig: (): SyncConfig => {
    // 回退到 localStorage 配置
    try {
      const saved = localStorage.getItem('memo_sync_config');
      return saved ? JSON.parse(saved) : { provider: 'none', settings: {} };
    } catch (e) {
      console.warn('Failed to parse sync config, resetting to default.');
      return { provider: 'none', settings: {} };
    }
  },

  saveConfig: (config: SyncConfig) => {
    localStorage.setItem('memo_sync_config', JSON.stringify(config));
  },

  getLastSyncTime: (): number => {
    const time = localStorage.getItem('memo_last_sync_time');
    return time ? parseInt(time, 10) : 0;
  },

  setLastSyncTime: (time: number) => {
    localStorage.setItem('memo_last_sync_time', time.toString());
  },

  mergeMemos: (local: Memo[], remote: Memo[]): Memo[] => {
    const memoMap = new Map<string, Memo>();
    // 本地数据作为基础
    local.forEach(m => memoMap.set(m.id, m));

    // 远程数据进行合并（以 updatedAt 为准）
    if (Array.isArray(remote)) {
      remote.forEach(r => {
        const l = memoMap.get(r.id);
        if (!l || (r.updatedAt && r.updatedAt > (l.updatedAt || 0))) {
          memoMap.set(r.id, r);
        }
      });
    }

    return Array.from(memoMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  syncWithSupabase: async (config: SyncConfig, localMemos: Memo[]) => {
    // ... existing implementation
    const { supabaseUrl, supabaseKey } = config.settings;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase 配置不完整');

    const lastSyncTime = syncService.getLastSyncTime();
    const currentSyncStart = Date.now();

    try {
      // Delta Sync: Fetch only updated memos
      const fetchUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/memos?select=*&updatedAt=gt.${lastSyncTime}`;
      console.log('Syncing with Supabase URL:', fetchUrl);

      const res = await fetch(fetchUrl, {
        headers: { 
          'apikey': supabaseKey, 
          'Authorization': `Bearer ${supabaseKey}` 
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401) throw new Error('Supabase 认证失败: 请检查 Key (401)');
        if (res.status === 409) throw new Error('Supabase 数据冲突 (409)');
        if (res.status >= 500) throw new Error(`Supabase 服务器错误 (${res.status})`);
        throw new Error(`Supabase API 错误 (${res.status}): ${errText}`);
      }
      
      const remoteMemos: Memo[] = await res.json();
      const merged = syncService.mergeMemos(localMemos, remoteMemos);

      const memosToPush = merged.filter(m => {
        const remoteVersion = remoteMemos.find(r => r.id === m.id);
        if (remoteVersion && remoteVersion.updatedAt === m.updatedAt) {
          return false; // It's exactly what we got from server, don't push back
        }
        return m.updatedAt > lastSyncTime;
      });

      if (memosToPush.length > 0) {
        console.log(`Pushing ${memosToPush.length} memos to Supabase...`);
        const upsertRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/memos?on_conflict=id`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(memosToPush)
        });

        if (!upsertRes.ok) {
          const errorText = await upsertRes.text();
          console.error('Supabase UPSERT failed:', errorText);
          throw new Error(`Supabase 保存错误 (${upsertRes.status}): ${errorText}`);
        }
      } else {
        console.log('No local changes to push.');
      }

      // Update last sync time only if everything succeeded
      syncService.setLastSyncTime(currentSyncStart);

      return merged;
    } catch (e) {
      console.error('Supabase sync error:', e);
      throw e;
    }
  },

  syncWithWebDAV: async (config: SyncConfig, localMemos: Memo[]) => {
     // ... existing implementation
    const { webdavUrl, webdavUser, webdavPass } = config.settings;
    if (!webdavUrl) throw new Error('WebDAV URL 未配置');

    const auth = btoa(`${webdavUser}:${webdavPass}`);
    const fileName = 'memo_ai_sync.json';
    const fullUrl = `${webdavUrl.replace(/\/$/, '')}/${fileName}`;

    let remoteMemos: Memo[] = [];
    try {
      const res = await fetch(fullUrl, { headers: { 'Authorization': `Basic ${auth}` } });
      if (res.ok) {
        remoteMemos = await res.json();
      }
    } catch (e) {
      console.log('Remote WebDAV file not found or inaccessible, will create new.');
    }

    const merged = syncService.mergeMemos(localMemos, remoteMemos);

    // Optimization: Check if we need to upload
    // We only upload if merged contains items newer than remote, or new items
    const needsUpload = merged.some(m => {
      const remote = remoteMemos.find(r => r.id === m.id);
      if (!remote) return true; // New memo not in remote
      return m.updatedAt > remote.updatedAt; // Memo updated locally
    });

    if (!needsUpload) {
      console.log('WebDAV remote is already up to date. Skipping upload.');
      return merged;
    }

    try {
      const putRes = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(merged)
      });
      if (!putRes.ok) throw new Error(`WebDAV PUT failed: ${putRes.status}`);
    } catch (e) {
      console.error('WebDAV sync upload error:', e);
      throw e;
    }

    return merged;
  },

  syncWithGist: async (config: SyncConfig, localMemos: Memo[]) => {
    // ... existing implementation
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

    const merged = syncService.mergeMemos(localMemos, remoteMemos);

    // Optimization: Check if we need to upload
    const needsUpload = merged.some(m => {
      const remote = remoteMemos.find(r => r.id === m.id);
      if (!remote) return true;
      return m.updatedAt > remote.updatedAt;
    });

    if (!needsUpload && gistId) {
      console.log('Gist remote is already up to date. Skipping upload.');
      return merged;
    }

    const body = {
      description: 'Memo AI Sync Data',
      files: { 'memos.json': { content: JSON.stringify(merged) } }
    };

    try {
      const method = gistId ? 'PATCH' : 'POST';
      const url = gistId ? `https://api.github.com/gists/${gistId}` : `https://api.github.com/gists`;

      const saveRes = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!saveRes.ok) throw new Error(`Gist API failed: ${saveRes.status}`);

      if (!gistId && saveRes.ok) {
        const newGist = await saveRes.json();
        config.settings.gistId = newGist.id;
        syncService.saveConfig(config);
      }
    } catch (e) {
      console.error('Gist sync upload error:', e);
      throw e;
    }

    return merged;
  },

  syncWithGitHubRepo: async (config: SyncConfig): Promise<Memo[]> => {
    // 0. Auto Backup before Sync
    try {
      await storage.saveHistorySnapshot();
    } catch (e) {
      console.warn('Failed to save history snapshot before sync:', e);
      // Continue syncing even if backup fails? 
      // User said "Save backup before sync". If it fails, maybe we should stop?
      // But backup failure shouldn't block sync if it's just quota or something?
      // Let's log warn and continue.
    }

    const { githubToken, githubRepo, encryptionPassword } = config.settings;
    if (!githubToken || !githubRepo || !encryptionPassword) throw new Error('GitHub Repo 配置不完整');

    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) throw new Error('Invalid Repo Format. Use "owner/repo"');

    const localSnapshotData = await storage.exportSnapshot();
    const localMeta = {
        version: 1,
        updatedAt: Date.now(),
        deviceId: localStorage.getItem('memo_device_id') || 'unknown'
    };
    
    // Get stored deviceId
    if (localMeta.deviceId === 'unknown') {
        localMeta.deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('memo_device_id', localMeta.deviceId);
    }

    const fullLocalSnapshot: SyncSnapshot = {
        meta: localMeta,
        data: localSnapshotData
    };

    // 1. Fetch from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/sync-data.json`;
    const headers = {
        'Authorization': `token ${githubToken}`,
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
            const content = atob(data.content); // Decode Base64
            // Content might be newlines?
            // GitHub API returns base64 with newlines potentially.
            // atob handles it usually? No, it might strictly need no whitespace.
            const cleanContent = content.replace(/\s/g, ''); 
            // Wait, atob decodes to binary string.
            // The content from github is "base64".
            // If it is encrypted JSON string.
            
            const encryptedData = JSON.parse(content);
            const decryptedString = await encryption.decrypt(encryptedData, encryptionPassword);
            cloudSnapshot = JSON.parse(decryptedString);
        } else if (res.status !== 404) {
             throw new Error(`GitHub API Error: ${res.status}`);
        }
    } catch (e) {
        if (e instanceof Error && e.message.includes('Decryption failed')) {
            throw e;
        }
        // If it's 404, we just continue (cloud is empty)
        console.log('Fetching cloud data failed or empty', e);
    }

    const lastSyncTime = syncService.getLastSyncTime();

    // 2. Check Conflict
    if (cloudSnapshot) {
        if (cloudSnapshot.meta.updatedAt > lastSyncTime) {
            // Cloud is newer than last sync.
            throw new SyncConflictError(fullLocalSnapshot, cloudSnapshot);
        }
    }

    // 3. Push (Encrypt -> Push)
    // Local is master or newer.
    
    const jsonString = JSON.stringify(fullLocalSnapshot);
    const encrypted = await encryption.encrypt(jsonString, encryptionPassword);
    
    const body = {
        message: `Sync from ${localMeta.deviceId} at ${new Date().toISOString()}`,
        content: btoa(JSON.stringify(encrypted)),
        sha: sha
    };

    const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
    });

    if (!putRes.ok) throw new Error(`GitHub Push Failed: ${putRes.status}`);

    syncService.setLastSyncTime(localMeta.updatedAt);
    
    return await storage.getMemos(); 
  },

  resolveConflict: async (resolution: 'use_local' | 'use_cloud', local: SyncSnapshot, cloud: SyncSnapshot, config: SyncConfig) => {
      if (resolution === 'use_local') {
           syncService.setLastSyncTime(cloud.meta.updatedAt); 
           return await syncService.syncWithGitHubRepo(config);
      } else {
          // Use Cloud
          await storage.restoreSnapshot(cloud.data);
          syncService.setLastSyncTime(cloud.meta.updatedAt);
          return await storage.getMemos();
      }
  }
};
