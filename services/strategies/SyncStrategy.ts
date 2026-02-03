import { Memo, SyncSnapshot } from '../../types';
import { SyncConfig } from '../sync';

export interface SyncStrategy {
    /**
     * 执行同步核心逻辑
     */
    sync(config: SyncConfig, localMemos: Memo[]): Promise<Memo[]>;

    /**
     * 获取提供者相关的额外信息（如仓库大小、文件状态等）
     */
    getProviderStatus?(config: SyncConfig): Promise<any>;

    /**
     * 清理远程数据
     */
    cleanupRemote?(config: SyncConfig): Promise<void>;

    /**
     * 从远程恢复配置（如 GitHub 仓库中的 .sync-config.json）
     */
    restoreConfig?(token: string): Promise<SyncConfig | null>;
}

export abstract class BaseSyncStrategy implements SyncStrategy {
    abstract sync(config: SyncConfig, localMemos: Memo[]): Promise<Memo[]>;

    protected mergeMemos(local: Memo[], remote: Memo[]): Memo[] {
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
    }
}
