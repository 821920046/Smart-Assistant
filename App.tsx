import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import { Icons } from './constants';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { useMemoData } from './hooks/useMemoData';
import { useDarkMode } from './hooks/useDarkMode';
import { useMemoFilter } from './hooks/useMemoFilter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncConflictError } from './services/sync';

const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const SyncSettings = React.lazy(() => import('./components/SyncSettings'));
const AuthModal = React.lazy(() => import('./components/AuthModal'));
const ConflictResolver = React.lazy(() => import('./components/ConflictResolver'));

const AppContent: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conflictError, setConflictError] = useState<SyncConflictError | null>(null);

  const { darkMode, toggleDarkMode } = useDarkMode();
  const { 
    memos, setMemos, isLoading, addMemo, updateMemo, deleteMemo, clearHistory, allTags, isSyncing, performSync, syncError
  } = useMemoData();

  const filteredMemos = useMemoFilter(memos, filter, searchQuery);

  const { user } = useAuth();

  const { addToast } = useToast();

  // Handle Sync Error (Task D)
  useEffect(() => {
    if (syncError) {
      if (syncError.name === 'SyncConflictError') {
          setConflictError(syncError as SyncConflictError);
      }
      // 1. Auth Error (401)
      else if (syncError.message.includes('401') || syncError.message.includes('Key')) {
        addToast("Authentication failed. Please check your sync settings.", "error");
        setIsSyncSettingsOpen(true);
      } 
      // 2. Conflict Error (409) - Supabase specific
      else if (syncError.message.includes('409')) {
        addToast("Sync conflict detected. Please retry manually.", "error");
      }
      // 3. Server Error (500)
      else if (syncError.message.includes('500') || syncError.message.includes('服务器错误')) {
         addToast("Server error. Sync will be retried later.", "error");
      } else {
         addToast(`Sync Error: ${syncError.message}`, "error");
      }
    }
  }, [syncError, addToast]);

  // Auto Sync Triggers
  useEffect(() => {
      if (!user) return;

      // 1. Timer (5 min)
      const timer = setInterval(() => {
          performSync(memos, setMemos, true);
      }, 5 * 60 * 1000);

      // 2. Window Blur
      const handleBlur = () => {
          performSync(memos, setMemos, true);
      };
      window.addEventListener('blur', handleBlur);

      return () => {
          clearInterval(timer);
          window.removeEventListener('blur', handleBlur);
      };
  }, [user, performSync, memos, setMemos]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="w-10 h-10 border-t-blue-600 border-4 border-slate-200 dark:border-slate-800 rounded-full animate-spin" /></div>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar
          activeFilter={filter}
          setActiveFilter={setFilter}
          tags={allTags}
          onExport={() => {}}
          onImport={() => {}}
          onOpenSyncSettings={() => user ? setIsSyncSettingsOpen(true) : setIsAuthModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          isSyncing={isSyncing}
          syncError={syncError}
          memos={memos}
          onClearHistory={clearHistory}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
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
                onClick={() => user ? setIsSyncSettingsOpen(true) : setIsAuthModalOpen(true)}
                className={`p-2 rounded-full shadow-sm border transition-all ${
                  user 
                    ? 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800' 
                    : 'bg-white text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                <Icons.User className="w-5 h-5" />
              </button>
              <button 
                onClick={toggleDarkMode}
                className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700"
              >
                {darkMode ? <Icons.Moon className="w-5 h-5" /> : <Icons.Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="sticky top-20 md:top-0 z-30 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md py-2 md:py-4 mb-6 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none transition-all">
            <div className="relative group">
              <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-200 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          <MainContent 
            filter={filter}
            searchQuery={searchQuery}
            filteredMemos={filteredMemos}
            onAdd={addMemo}
            onUpdate={updateMemo}
            onDelete={deleteMemo}
          />
        </main>

        <Suspense fallback={null}>
          <ChatAssistant contextMemos={memos.map(m => m.content)} />
        </Suspense>

        <Suspense fallback={null}>
          {isSyncSettingsOpen && (
            <SyncSettings 
              onClose={() => setIsSyncSettingsOpen(false)} 
              onSyncComplete={() => performSync(memos, setMemos, false)}
            />
          )}
        </Suspense>

        <Suspense fallback={null}>
          {isAuthModalOpen && (
            <AuthModal onClose={() => setIsAuthModalOpen(false)} />
          )}
        </Suspense>

        <Suspense fallback={null}>
            {conflictError && (
                <ConflictResolver 
                    error={conflictError}
                    onResolve={(resolvedMemos) => {
                        setMemos(resolvedMemos);
                        setConflictError(null);
                        addToast('Sync conflict resolved.', 'success');
                    }}
                    onCancel={() => setConflictError(null)}
                />
            )}
        </Suspense>
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
