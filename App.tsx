import React, { useEffect, Suspense, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import MainContent from '@/components/layout/MainContent';
import { Icons } from './constants';
import { AuthProvider } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { storage } from './services/storage';
import MobileNav from '@/components/layout/MobileNav';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { syncService } from './services/sync';
import { Memo } from './types';
import { useStore } from './services/store';
import { useMemoFilter } from './hooks/useMemoFilter';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';

import SyncSettings from '@/components/features/SyncSettings';
import ConflictResolver from './components/features/ConflictResolver';

const AppContent: React.FC = () => {
    const memos = useStore(state => state.memos);
    const isLoading = useStore(state => state.isLoading);
    const init = useStore(state => state.init);
    const filter = useStore(state => state.filter);
    const setFilter = useStore(state => state.setFilter);
    const searchQuery = useStore(state => state.searchQuery);
    const setSearchQuery = useStore(state => state.setSearchQuery);
    const isSyncSettingsOpen = useStore(state => state.isSyncSettingsOpen);
    const setSyncSettingsOpen = useStore(state => state.setSyncSettingsOpen);
    const isSidebarOpen = useStore(state => state.isSidebarOpen);
    const setSidebarOpen = useStore(state => state.setSidebarOpen);
    const conflictError = useStore(state => state.conflictError);
    const setConflictError = useStore(state => state.setConflictError);
    const darkMode = useStore(state => state.darkMode);
    const toggleDarkMode = useStore(state => state.toggleDarkMode);
    const isSyncing = useStore(state => state.isSyncing);
    const syncError = useStore(state => state.syncError);
    const performSync = useStore(state => state.performSync);
    const setMemos = useStore(state => state.setMemos);
    const updateMemo = useStore(state => state.updateMemo);
    const notificationConfig = useStore(state => state.notificationConfig);

    // Initialize Notification Scheduler
    useNotificationScheduler(memos, updateMemo, notificationConfig);

    const filteredMemos = useMemoFilter(memos, filter, searchQuery);
    const { addToast } = useToast();

    const handleExport = useCallback(async () => {
        try {
            const data = await storage.exportSnapshot();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smart-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            addToast('Failed to export data', 'error');
        }
    }, [addToast]);

    const handleImport = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await storage.restoreSnapshot(data);
            init(); // Re-init to load new data
            addToast('Data imported successfully', 'success');
        } catch (error) {
            console.error('Import failed:', error);
            addToast('Failed to import data', 'error');
        }
    }, [init, addToast]);

    // Initialize Store
    useEffect(() => {
        init();
    }, [init]);

    // Handle Sync Error
    useEffect(() => {
        if (syncError) {
            if (syncError.name === 'SyncConflictError') {
                // Handled via conflictError in store
            } else if (syncError.message.includes('401') || syncError.message.includes('Key')) {
                addToast("Authentication failed. Please check your sync settings.", "error");
                setSyncSettingsOpen(true);
            } else if (syncError.message.includes('409')) {
                addToast("Sync conflict detected. Please retry manually.", "error");
            } else if (syncError.message.includes('500') || syncError.message.includes('服务器错误')) {
                addToast("Server error. Sync will be retried later.", "error");
            } else {
                addToast(`Sync Error: ${syncError.message}`, "error");
            }
        }
    }, [syncError, addToast, setSyncSettingsOpen]);

    // Auto Sync Triggers
    useEffect(() => {
        if (isLoading) return;

        const SYNC_INTERVAL = 5 * 60 * 1000;
        const SYNC_DEBOUNCE = 30 * 1000;
        let lastSyncTime = Date.now();

        const timer = setInterval(() => {
            performSync(true);
            lastSyncTime = Date.now();
        }, SYNC_INTERVAL);

        const handleBlur = () => {
            const now = Date.now();
            if (now - lastSyncTime > SYNC_DEBOUNCE) {
                performSync(true);
                lastSyncTime = now;
            }
        };
        window.addEventListener('blur', handleBlur);

        return () => {
            clearInterval(timer);
            window.removeEventListener('blur', handleBlur);
        };
    }, [performSync, isLoading]);

    // Listen for custom export events from subcomponents
    useEffect(() => {
        const handleExportEvent = () => handleExport();
        window.addEventListener('app-export', handleExportEvent);
        return () => window.removeEventListener('app-export', handleExportEvent);
    }, [handleExport]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="w-10 h-10 border-t-blue-600 border-4 border-slate-200 dark:border-slate-800 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="min-h-screen flex flex-col md:flex-row">
                <Sidebar />

                <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-32 md:pb-8">
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-slate-200/50 dark:border-slate-800/50">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 -ml-2 text-slate-600 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-800 rounded-lg transition-colors"
                            >
                                <Icons.Menu />
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-md shadow-blue-200">
                                    <Icons.Logo className="w-5 h-5" />
                                </div>
                                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Smart Assistant</h1>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={toggleDarkMode}
                                className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700"
                            >
                                {darkMode ? <Icons.Moon className="w-5 h-5" /> : <Icons.Sun className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="sticky top-20 md:top-0 z-30 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md py-2 md:py-4 mb-6 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none transition-all">
                        <div className="relative group">
                            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search tasks & notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-200 placeholder-slate-400 transition-all"
                            />
                        </div>
                    </div>

                    <MainContent />
                </main>

                {isSyncSettingsOpen && (
                    <SyncSettings
                        onClose={() => setSyncSettingsOpen(false)}
                        onSyncComplete={() => performSync(false)}
                    />
                )}

                {conflictError && (
                    <ConflictResolver
                        error={conflictError}
                        config={syncService.getConfig()}
                        onResolve={(resolvedMemos: Memo[]) => {
                            setMemos(resolvedMemos);
                            setConflictError(null);
                            addToast('Sync conflict resolved.', 'success');
                        }}
                        onCancel={() => setConflictError(null)}
                    />
                )}

                <MobileNav />
            </div>
        </ErrorBoundary>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
