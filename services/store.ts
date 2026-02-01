import { create } from 'zustand';
import { Memo, NotificationConfig } from '../types';
import { storage } from './storage';
import { syncService, SyncConflictError } from './sync';

interface AppState {
    // Data State
    memos: Memo[];
    isLoading: boolean;
    isSyncing: boolean;
    syncError: Error | null;
    lastSyncTime: number;

    // UI State
    filter: string;
    searchQuery: string;
    isSyncSettingsOpen: boolean;
    isSidebarOpen: boolean;
    conflictError: SyncConflictError | null;
    darkMode: boolean;

    // Actions
    init: () => Promise<void>;
    setMemos: (memos: Memo[]) => void;
    addMemo: (memo: Partial<Memo>) => Promise<void>;
    updateMemo: (memo: Memo) => Promise<void>;
    deleteMemo: (id: string) => Promise<void>;
    clearHistory: () => Promise<void>;

    setFilter: (filter: string) => void;
    setSearchQuery: (query: string) => void;
    setSyncSettingsOpen: (open: boolean) => void;
    setSidebarOpen: (open: boolean) => void;
    setConflictError: (error: SyncConflictError | null) => void;
    setDarkMode: (dark: boolean) => void;
    toggleDarkMode: () => void;

    performSync: (silent?: boolean) => Promise<void>;

    // Notification Actions
    notificationConfig: NotificationConfig;
    setNotificationConfig: (config: NotificationConfig) => void;
}

const safeId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const useStore = create<AppState>((set, get) => ({
    // Initial State
    memos: [],
    isLoading: true,
    isSyncing: false,
    syncError: null,
    lastSyncTime: syncService.getLastSyncTime(),

    filter: 'dashboard',
    searchQuery: '',
    isSyncSettingsOpen: false,
    isSidebarOpen: false,
    conflictError: null,
    darkMode: localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),

    // Initialize
    init: async () => {
        set({ isLoading: true });
        try {
            await storage.initDB();
            await storage.migrateFromLocalStorage();
            const memos = await storage.getMemos();
            set({ memos, isLoading: false });

            // Initial silent sync
            get().performSync(true);
        } catch (error) {
            console.error('Failed to init store:', error);
            set({ isLoading: false });
        }
    },

    setMemos: (memos) => set({ memos }),

    addMemo: async (memoData) => {
        try {
            const config = get().notificationConfig;
            let finalReminderAt = memoData.reminderAt;

            // Auto-reminder logic
            if (!finalReminderAt && config.autoReminder?.enabled && (memoData.type === 'todo' || get().filter === 'tasks')) {
                const afterMinutes = config.autoReminder.afterMinutes || 30;
                finalReminderAt = Date.now() + (afterMinutes * 60 * 1000);
            }

            const newMemo: Memo = {
                id: safeId(),
                title: memoData.title || '',
                content: memoData.content || '',
                type: memoData.type || (get().filter === 'tasks' ? 'todo' : 'memo'),
                category: memoData.category || 'Personal',
                priority: memoData.priority || 'normal',
                tags: memoData.tags || [],
                isArchived: false,
                isFavorite: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                todos: memoData.todos || [],
                sketchData: memoData.sketchData,
                audio: memoData.audio,
                dueDate: memoData.dueDate,
                reminderAt: finalReminderAt,
                reminderRepeat: memoData.reminderRepeat || 'none'
            };

            await storage.upsertMemo(newMemo);
            set(state => ({ memos: [newMemo, ...state.memos] }));

            // Trigger sync without blocking local state
            get().performSync(true).catch(err => {
                console.error('Silent sync failed after addMemo:', err);
            });
        } catch (error) {
            console.error('Failed to add memo:', error);
            throw error; // Let the UI handle it
        }
    },

    updateMemo: async (updatedMemo) => {
        const memo = { ...updatedMemo, updatedAt: Date.now() };
        await storage.upsertMemo(memo);
        set(state => ({
            memos: state.memos.map(m => m.id === memo.id ? memo : m)
        }));
        get().performSync(true);
    },

    deleteMemo: async (id) => {
        await storage.deleteMemoOffline(id);
        set(state => ({
            memos: state.memos.map(m => m.id === id ? { ...m, isDeleted: true, updatedAt: Date.now() } : m)
                .filter(m => !m.isDeleted)
        }));
        get().performSync(true);
    },

    clearHistory: async () => {
        const currentMemos = get().memos;
        const historyMemos = currentMemos.filter(m => m.isArchived || m.completedAt);

        for (const m of historyMemos) {
            await storage.deleteMemoOffline(m.id);
        }

        set({
            memos: currentMemos.filter(m => !m.isArchived && !m.completedAt)
        });
        get().performSync(true);
    },

    setFilter: (filter) => set({ filter }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSyncSettingsOpen: (isSyncSettingsOpen) => set({ isSyncSettingsOpen }),
    setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
    setConflictError: (conflictError) => set({ conflictError }),

    setDarkMode: (darkMode) => {
        set({ darkMode });
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    },

    toggleDarkMode: () => {
        const newMode = !get().darkMode;
        get().setDarkMode(newMode);
    },

    performSync: async (silent = false) => {
        const { isSyncing, memos } = get();
        if (isSyncing) return;

        const config = syncService.getConfig();
        if (config.provider === 'none') return;

        set({ isSyncing: true, syncError: null });
        try {
            let merged: Memo[] = memos;
            if (config.provider === 'webdav') merged = await syncService.syncWithWebDAV(config, memos);
            else if (config.provider === 'gist') merged = await syncService.syncWithGist(config, memos);
            else if (config.provider === 'github_repo') merged = await syncService.syncWithGitHubRepo(config);

            await storage.saveMemos(merged);
            const finalMemos = merged.filter(m => !m.isDeleted);

            set({
                memos: finalMemos,
                isSyncing: false,
                lastSyncTime: syncService.getLastSyncTime()
            });
        } catch (error) {
            console.error('Sync failed:', error);
            set({
                isSyncing: false,
                syncError: error as Error
            });

            if (error instanceof SyncConflictError) {
                set({ conflictError: error });
            }
        }
    },

    notificationConfig: JSON.parse(localStorage.getItem('notification_config') || JSON.stringify({
        channels: { browser: true },
        autoReminder: { enabled: false, afterMinutes: 30 }
    })),

    setNotificationConfig: (config) => {
        set({ notificationConfig: config });
        localStorage.setItem('notification_config', JSON.stringify(config));
    }
}));
