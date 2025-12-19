
import { Memo } from '../types';
import { storage } from './storage';

/**
 * 这是一个同步逻辑的骨架。
 * 当你需要接入 Supabase 或其他后端时，只需填充这些方法。
 */
export const syncService = {
  // 模拟同步状态
  getStatus: () => {
    return localStorage.getItem('sync_status') || 'local_only';
  },

  // 模拟执行同步
  performSync: async (localMemos: Memo[]) => {
    console.log('Syncing with remote server...');
    // 1. 这里的逻辑通常是：将本地 updatedAt 晚于上次同步时间的记录推送到云端
    // 2. 从云端拉取UpdatedAt 晚于本地的记录
    // 3. 解决冲突（谁的时间戳新听谁的）
    
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem('sync_last_at', Date.now().toString());
        resolve(true);
      }, 1500);
    });
  }
};
