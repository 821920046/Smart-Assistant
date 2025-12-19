
import { Memo } from '../types';
import { storage } from './storage';

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
    const saved = localStorage.getItem('memo_sync_config');
    return saved ? JSON.parse(saved) : { provider: 'none', settings: {} };
  },

  saveConfig: (config: SyncConfig) => {
    localStorage.setItem('memo_sync_config', JSON.stringify(config));
  },

  // 执行增量同步的核心算法
  mergeMemos: (local: Memo[], remote: Memo[]): Memo[] => {
    const memoMap = new Map<string, Memo>();
    local.forEach(m => memoMap.set(m.id, m));
    
    remote.forEach(r => {
      const l = memoMap.get(r.id);
      if (!l || r.updatedAt > l.updatedAt) {
        memoMap.set(r.id, r);
      }
    });
    
    return Array.from(memoMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  // 1. Supabase 引擎 (使用标准 Fetch API 以减少依赖)
  syncWithSupabase: async (config: SyncConfig, localMemos: Memo[]) => {
    const { supabaseUrl, supabaseKey } = config.settings;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase 配置不完整');

    // 拉取远程
    const res = await fetch(`${supabaseUrl}/rest/v1/memos?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const remoteMemos: Memo[] = await res.json();

    // 合并
    const merged = syncService.mergeMemos(localMemos, remoteMemos);

    // 推送更新 (这里简化为推送到远程，实际应只推送增量)
    await fetch(`${supabaseUrl}/rest/v1/memos`, {
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
  },

  // 2. WebDAV 引擎 (支持坚果云等)
  syncWithWebDAV: async (config: SyncConfig, localMemos: Memo[]) => {
    const { webdavUrl, webdavUser, webdavPass } = config.settings;
    if (!webdavUrl) throw new Error('WebDAV URL 未配置');
    
    const auth = btoa(`${webdavUser}:${webdavPass}`);
    const fileName = 'memo_ai_sync.json';
    const fullUrl = `${webdavUrl.replace(/\/$/, '')}/${fileName}`;

    // 尝试获取远程文件
    let remoteMemos: Memo[] = [];
    try {
      const res = await fetch(fullUrl, { headers: { 'Authorization': `Basic ${auth}` } });
      if (res.ok) remoteMemos = await res.json();
    } catch (e) { console.log('Remote file not found, creating new...'); }

    const merged = syncService.mergeMemos(localMemos, remoteMemos);

    // 上传合并后的数据
    await fetch(fullUrl, {
      method: 'PUT',
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(merged)
    });

    return merged;
  },

  // 3. GitHub Gist 引擎
  syncWithGist: async (config: SyncConfig, localMemos: Memo[]) => {
    const { gistToken, gistId } = config.settings;
    if (!gistToken) throw new Error('GitHub Token 未配置');

    const headers = { 'Authorization': `token ${gistToken}`, 'Accept': 'application/vnd.github.v3+json' };
    
    let remoteMemos: Memo[] = [];
    if (gistId) {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
      if (res.ok) {
        const gistData = await res.json();
        remoteMemos = JSON.parse(gistData.files['memos.json'].content);
      }
    }

    const merged = syncService.mergeMemos(localMemos, remoteMemos);
    
    // 更新或创建 Gist
    const body = {
      description: 'Memo AI Sync Data',
      files: { 'memos.json': { content: JSON.stringify(merged) } }
    };

    const method = gistId ? 'PATCH' : 'POST';
    const url = gistId ? `https://api.github.com/gists/${gistId}` : `https://api.github.com/gists`;
    
    const saveRes = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (!gistId && saveRes.ok) {
      const newGist = await saveRes.json();
      config.settings.gistId = newGist.id;
      syncService.saveConfig(config);
    }

    return merged;
  }
};
