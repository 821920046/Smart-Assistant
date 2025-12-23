import { useState, useCallback } from 'react';
import { Memo } from '../types.js';
import { syncService } from '../services/sync.js';
import { storage } from '../services/storage.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';

export const useSyncService = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const { addToast } = useToast();
  const { user } = useAuth();
  const debounceRef = useState<{ timer: NodeJS.Timeout | null }>({ timer: null })[0];

  const executeSync = useCallback(async (currentMemos: Memo[], setMemos: (memos: Memo[]) => void, silent = false) => {
    // Enforce sync only for logged-in users
    if (!user) return currentMemos;

    const config = syncService.getConfig();
    if (config.provider === 'none') return currentMemos;
    
    setIsSyncing(true);
    setSyncError(null);
    try {
      let merged: Memo[] = currentMemos;
      if (config.provider === 'supabase') merged = await syncService.syncWithSupabase(config, currentMemos);
      else if (config.provider === 'webdav') merged = await syncService.syncWithWebDAV(config, currentMemos);
      else if (config.provider === 'gist') merged = await syncService.syncWithGist(config, currentMemos);

      await storage.saveMemos(merged);
      const finalMemos = merged.filter(m => !m.isDeleted);
      setMemos(finalMemos);
      
      if (!silent) {
        addToast('Sync completed successfully', 'success');
      }
      return merged;
    } catch (err) {
      console.error("Sync failed:", err);
      const error = err as Error;
      setSyncError(error);
      if (!silent) {
        addToast(`Sync failed: ${error.message}`, 'error');
      }
      return currentMemos;
    } finally {
      setIsSyncing(false);
    }
  }, [addToast, user]);

  const performSync = useCallback(async (currentMemos: Memo[], setMemos: (memos: Memo[]) => void, silent = false) => {
    if (silent) {
      // Debounce logic for silent sync
      if (debounceRef.timer) {
        clearTimeout(debounceRef.timer);
      }
      
      return new Promise<Memo[]>((resolve) => {
        debounceRef.timer = setTimeout(async () => {
          const result = await executeSync(currentMemos, setMemos, true);
          resolve(result);
        }, 2000); // 2 seconds debounce
      });
    } else {
      // Immediate execution for manual sync
      if (debounceRef.timer) {
        clearTimeout(debounceRef.timer);
        debounceRef.timer = null;
      }
      return executeSync(currentMemos, setMemos, silent);
    }
  }, [executeSync, debounceRef]);

  return { isSyncing, performSync, syncError };
};
