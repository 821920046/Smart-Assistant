
import { Memo } from '../types.js';
import { storage } from './storage.js';

export type SyncProvider = 'none' | 'supabase' | 'webdav' | 'gist';

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
  };
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

      // Delta Sync: Upload only local memos modified since last sync
      // We check against lastSyncTime. 
      // Note: We should filter based on the ORIGINAL localMemos, but merged contains the latest state.
      // If a remote memo updated our local memo, we don't necessarily need to push it back unless we changed it too.
      // However, simplified approach: Push anything in 'merged' that has updatedAt > lastSyncTime.
      // But wait, if we just downloaded it, it has a new updatedAt? 
      // Actually, usually we keep the remote updatedAt if it's newer.
      // So if we downloaded a remote memo with updatedAt > lastSyncTime, we don't need to push it back.
      // We only need to push if the ID was in localMemos AND its updatedAt > lastSyncTime, 
      // OR if it's a new memo created locally (updatedAt > lastSyncTime).
      
      const memosToPush = merged.filter(m => {
        // Push if it's newer than last sync
        // AND (it originated locally OR we modified it locally)
        // A simple heuristic: if the timestamp is newer than lastSyncTime, we might need to push it.
        // But we want to avoid echoing back what we just downloaded.
        
        // If the memo came from remoteMemos, we don't need to push it back unless we merged it with local changes that made it even newer.
        // But merge logic takes the one with larger updatedAt.
        // If remote is newer, merged has remote version. We don't need to push.
        // If local is newer, merged has local version. We need to push.
        
        const remoteVersion = remoteMemos.find(r => r.id === m.id);
        if (remoteVersion && remoteVersion.updatedAt === m.updatedAt) {
          return false; // It's exactly what we got from server, don't push back
        }
        
        // Otherwise, it's either local-only or local is newer
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
  }
};
