import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Memo } from '../types';
import { storage } from '../services/storage';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSyncService } from './useSyncService';
import { useNotificationScheduler } from './useNotificationScheduler';

export const useMemoData = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const memosRef = useRef<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { addToast } = useToast();
  const { performSync, isSyncing, syncError } = useSyncService();
  const { user } = useAuth();

  // Keep ref in sync
  useEffect(() => {
    memosRef.current = memos;
  }, [memos]);

  // Initial Sync on User Change
  useEffect(() => {
    if (user) {
      performSync(memosRef.current, setMemos, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Define updateMemo first
  const updateMemo = useCallback(async (updatedMemo: Memo) => {
    const currentMemos = memosRef.current;
    const upgraded = { ...updatedMemo, updatedAt: Date.now() };
    
    // Update local state
    const newMemos = currentMemos.map(m => m.id === upgraded.id ? upgraded : m);
    setMemos(newMemos);
    
    await storage.upsertMemo(upgraded);
    
    // Use local state for sync instead of reading from storage
    await performSync(newMemos, setMemos, true); // Silent sync
  }, [performSync]);

  // Notification Scheduler
  useNotificationScheduler(memos, updateMemo);

  // Initialize App Data
  useEffect(() => {
    const initApp = async () => {
      try {
        await storage.migrateFromLocalStorage();
        let storedMemos = await storage.getMemos();

        // Auto-clean tasks completed > 2 days ago
        const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
        const memosToDelete = storedMemos.filter(m =>
          m.isArchived && m.completedAt && m.completedAt < twoDaysAgo
        );

        if (memosToDelete.length > 0) {
          for (const memo of memosToDelete) {
            await storage.upsertMemo({ ...memo, isDeleted: true, updatedAt: Date.now() });
          }
          storedMemos = storedMemos.filter(m =>
            !(m.isArchived && m.completedAt && m.completedAt < twoDaysAgo)
          );
        }

        setMemos(storedMemos);
        setIsLoading(false);
        await performSync(storedMemos, setMemos, true); // Initial sync silent
      } catch (err) {
        console.error("App initialization failed:", err);
        addToast("Failed to load data", "error");
        setIsLoading(false);
      }
    };
    initApp();
  }, [performSync, addToast]);

  const addMemo = useCallback(async (memoData: Partial<Memo>) => {
    const currentMemos = memosRef.current;
    const now = Date.now();
    const newMemo: Memo = {
      id: Math.random().toString(36).substr(2, 6),
      content: memoData.content || '',
      type: memoData.type || 'todo',
      todos: memoData.todos || [],
      tags: memoData.tags || [],
      dueDate: memoData.dueDate,
      reminderAt: memoData.reminderAt,
      reminderRepeat: memoData.reminderRepeat || 'none',
      sketchData: memoData.sketchData,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      isFavorite: false,
      priority: memoData.priority || 'normal'
    };
    
    // Optimistic update
    const newMemos = [newMemo, ...currentMemos];
    setMemos(newMemos);
    await storage.upsertMemo(newMemo);
    addToast("Task created successfully", "success");
    
    await performSync(newMemos, setMemos, true);
  }, [addToast, performSync]);

  const deleteMemo = useCallback(async (id: string) => {
    const currentMemos = memosRef.current;
    const memoToDelete = currentMemos.find(m => m.id === id);
    if (memoToDelete) {
      const deletedMemo = { ...memoToDelete, isDeleted: true, updatedAt: Date.now() };
      const newMemos = currentMemos.filter(m => m.id !== id);
      setMemos(newMemos);
      await storage.upsertMemo(deletedMemo);
      addToast("Task deleted", "info");
      
      await performSync(newMemos, setMemos, true);
    }
  }, [addToast, performSync]);

  const clearHistory = useCallback(async () => {
    const currentMemos = memosRef.current;
    const archivedMemos = currentMemos.filter(m => m.isArchived);
    if (archivedMemos.length === 0) return;

    for (const memo of archivedMemos) {
      await storage.upsertMemo({ ...memo, isDeleted: true, updatedAt: Date.now() });
    }
    const newMemos = currentMemos.filter(m => !m.isArchived);
    setMemos(newMemos);
    addToast("History cleared", "info");
    
    await performSync(newMemos, setMemos, true);
  }, [addToast, performSync]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    memos.forEach(memo => {
      memo.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [memos]);

  return {
    memos,
    setMemos,
    isLoading,
    addMemo,
    updateMemo,
    deleteMemo,
    clearHistory,
    allTags,
    isSyncing,
    performSync,
    syncError
  };
};
