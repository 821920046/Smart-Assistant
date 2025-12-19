
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

    try {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/memos?select=*`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      if (!res.ok) throw new Error(`Supabase API 错误: ${res.status}`);
      const remoteMemos: Memo[] = await res.json();

      const merged = syncService.mergeMemos(localMemos, remoteMemos);

      await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/memos`, {
        method: 'POST',
        headers: { 
          'apikey': supabaseKey, 
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates' 
        },
        body: JSON.stringify(merged)
      });

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
