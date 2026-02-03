import { Memo, SyncSnapshot, SyncData } from '../types.js';
import { storage } from './storage.js';
import { encryption } from './encryption.js';
import { SyncStrategy } from './strategies/SyncStrategy.js';
import { GitHubStrategy } from './strategies/GitHubStrategy.js';
import { WebDAVStrategy } from './strategies/WebDAVStrategy.js';
import { GistStrategy } from './strategies/GistStrategy.js';

export type SyncProvider = 'none' | 'webdav' | 'gist' | 'github_repo';

export interface SyncConfig {
  provider: SyncProvider;
  settings: {
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

export const DATA_BRANCH = 'smart-assistant-data';

/**
 * 策略工厂，根据配置返回对应的同步策略
 */
const getStrategy = (provider: SyncProvider): SyncStrategy | null => {
  switch (provider) {
    case 'github_repo': return new GitHubStrategy();
    case 'webdav': return new WebDAVStrategy();
    case 'gist': return new GistStrategy();
    default: return null;
  }
};

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

  // 自动解密敏感字段
  async getDecryptedConfig(password?: string): Promise<SyncConfig> {
    const config = this.getConfig();
    const pwd = password || config.settings.encryptionPassword;
    if (!pwd) return config;

    const fieldsToDecrypt: (keyof SyncConfig['settings'])[] = ['githubToken', 'webdavPass', 'gistToken'];

    for (const field of fieldsToDecrypt) {
      const value = config.settings[field];
      if (value && value.includes('ciphertext') && value.includes('salt')) {
        try {
          const decrypted = await encryption.decryptString(value, pwd);
          if (decrypted) (config.settings as any)[field] = decrypted;
        } catch (e) {
          console.warn(`Failed to decrypt field ${field}`);
        }
      }
    }
    return config;
  },

  async saveConfig(config: SyncConfig) {
    const pwd = config.settings.encryptionPassword;
    if (pwd) {
      const fieldsToEncrypt: (keyof SyncConfig['settings'])[] = ['githubToken', 'webdavPass', 'gistToken'];
      for (const field of fieldsToEncrypt) {
        const value = config.settings[field];
        // Only encrypt if not already encrypted and not empty
        if (value && !(value.includes('ciphertext') && value.includes('salt'))) {
          (config.settings as any)[field] = await encryption.encryptString(value, pwd);
        }
      }
    }
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
    local.forEach(m => memoMap.set(m.id, m));

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

  // 统一入口
  async performSync(config: SyncConfig, localMemos: Memo[]): Promise<Memo[]> {
    const strategy = getStrategy(config.provider);
    if (!strategy) return localMemos;
    return await strategy.sync(config, localMemos);
  },

  // 向后兼容的方法
  async syncWithGitHubRepo(config: SyncConfig): Promise<Memo[]> {
    const localMemos = await storage.getMemos();
    return await this.performSync(config, localMemos);
  },

  async syncWithWebDAV(config: SyncConfig, localMemos: Memo[]): Promise<Memo[]> {
    return await this.performSync(config, localMemos);
  },

  async syncWithGist(config: SyncConfig, localMemos: Memo[]): Promise<Memo[]> {
    return await this.performSync(config, localMemos);
  },

  async resolveConflict(resolution: 'use_local' | 'use_cloud', local: SyncSnapshot, cloud: SyncSnapshot, config: SyncConfig) {
    if (resolution === 'use_local') {
      this.setLastSyncTime(cloud.meta.updatedAt);
      return await this.syncWithGitHubRepo(config);
    } else {
      await storage.restoreSnapshot(cloud.data);
      this.setLastSyncTime(cloud.meta.updatedAt);
      return await storage.getMemos();
    }
  },

  // 特定提供者方法委派
  async getRemoteFileStatus(config: SyncConfig) {
    const strategy = getStrategy(config.provider);
    return strategy?.getProviderStatus ? await strategy.getProviderStatus(config) : { exists: false };
  },

  async deleteRemoteData(config: SyncConfig) {
    const strategy = getStrategy(config.provider);
    if (strategy?.cleanupRemote) await strategy.cleanupRemote(config);
  },

  async getRepoDetails(config: SyncConfig) {
    const strategy = new GitHubStrategy();
    return await strategy.getRepoDetails(config);
  },

  async uploadSyncConfigToGithub(config: SyncConfig) {
    const strategy = new GitHubStrategy();
    return await strategy.uploadSyncConfig(config);
  },

  async restoreConfigFromGithub(token: string): Promise<SyncConfig | null> {
    const strategy = new GitHubStrategy();
    return await strategy.restoreConfig(token);
  }
};
