import { useState, useCallback } from 'react';
import { Memo } from '../types.js';
import { syncService } from '../services/sync.js';
import { storage } from '../services/storage.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';

export const useSyncService = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();

  const performSync = useCallback(async (currentMemos: Memo[], setMemos: (memos: Memo[]) => void, silent = false) => {
    // Enforce sync only for logged-in users
    if (!user) return currentMemos;

    const config = syncService.getConfig();
    if (config.provider === 'none') return currentMemos;
    
    setIsSyncing(true);
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
      if (!silent) {
        addToast(`Sync failed: ${(err as Error).message}`, 'error');
      }
      return currentMemos;
    } finally {
      setIsSyncing(false);
    }
  }, [addToast]);

  return { isSyncing, performSync };
};
