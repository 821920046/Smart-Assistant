import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Memo } from './types.js';
import { storage } from './services/storage.js';
import { syncService } from './services/sync.js';
import Sidebar from './components/Sidebar.js';
import MemoEditor from './components/MemoEditor.js';
import MemoCard from './components/MemoCard.js';
import ChatAssistant from './components/ChatAssistant.js';
import SyncSettings from './components/SyncSettings.js';
import CalendarView from './components/CalendarView.js';
import KanbanView from './components/KanbanView.js';
import FocusMode from './components/FocusMode.js';
import { Icons, CATEGORIES } from './constants.js';

const App: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('darkMode') === 'true' || 
             (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch { return false; }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const notifiedIds = useRef<Set<string>>(new Set());

  const performSync = useCallback(async (currentMemos: Memo[]) => {
    const config = syncService.getConfig();
    if (config.provider === 'none') return currentMemos;
    setIsSyncing(true);
    try {
      let merged: Memo[] = currentMemos;
      if (config.provider === 'supabase') merged = await syncService.syncWithSupabase(config, currentMemos);
      else if (config.provider === 'webdav') merged = await syncService.syncWithWebDAV(config, currentMemos);
      else if (config.provider === 'gist') merged = await syncService.syncWithGist(config, currentMemos);

      await storage.saveMemos(merged);
      setMemos(merged.filter(m => !m.isDeleted));
      return merged;
    } catch (err) {
      console.error("Sync failed:", err);
      return currentMemos;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Notification Scheduler
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      memos.forEach(memo => {
        if (memo.reminderAt && now >= memo.reminderAt && !notifiedIds.current.has(memo.id)) {
          notifiedIds.current.add(memo.id);

          if (Notification.permission === "granted") {
            try {
              new Notification("任务提醒", {
                body: memo.content || "你有一个待办事项到期了",
                icon: '/favicon.ico'
              });
            } catch (e) {
              console.warn("Notification failed to display", e);
            }
          } else {
            alert(`提醒: ${memo.content}`);
          }

          // Handle repeat logic
          if (memo.reminderRepeat && memo.reminderRepeat !== 'none') {
            const nextTime = memo.reminderAt + (memo.reminderRepeat === 'daily' ? 86400000 : 86400000 * 7);
            updateMemo({ ...memo, reminderAt: nextTime });
            notifiedIds.current.delete(memo.id); // Allow re-notification for the new time
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [memos]);

  useEffect(() => {
    const initApp = async () => {
      try {
        await storage.migrateFromLocalStorage();
        let storedMemos = await storage.getMemos();

        // 自动清理 2 天前完成的任务
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
        await performSync(storedMemos);
      } catch (err) {
        console.error("App initialization failed:", err);
        setIsLoading(false);
      }
    };
    initApp();
  }, [performSync]);

  const addMemo = async (memoData: Partial<Memo>) => {
    const now = Date.now();
    const newMemo: Memo = {
      id: Math.random().toString(36).substr(2, 6),
      content: memoData.content || '',
      type: 'todo',
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
    const updatedLocal = [newMemo, ...memos];
    setMemos(updatedLocal);
    await storage.upsertMemo(newMemo);
    const allMemos = await storage.getMemos(true);
    await performSync(allMemos);
  };

  const updateMemo = async (updatedMemo: Memo) => {
    const upgraded = { ...updatedMemo, updatedAt: Date.now() };
    setMemos(prev => prev.map(m => m.id === upgraded.id ? upgraded : m));
    await storage.upsertMemo(upgraded);
    const allMemos = await storage.getMemos(true);
    await performSync(allMemos);
  };

  const deleteMemo = async (id: string) => {
    const memoToDelete = memos.find(m => m.id === id);
    if (memoToDelete) {
      const deletedMemo = { ...memoToDelete, isDeleted: true, updatedAt: Date.now() };
      setMemos(prev => prev.filter(m => m.id !== id));
      await storage.upsertMemo(deletedMemo);
      const allMemos = await storage.getMemos(true);
      await performSync(allMemos);
    }
  };

  const clearHistory = async () => {
    const archivedMemos = memos.filter(m => m.isArchived);
    if (archivedMemos.length === 0) return;

    for (const memo of archivedMemos) {
      await storage.upsertMemo({ ...memo, isDeleted: true, updatedAt: Date.now() });
    }
    setMemos(prev => prev.filter(m => !m.isArchived));
    const allMemos = await storage.getMemos(true);
    await performSync(allMemos);
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    memos.forEach(memo => {
      memo.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [memos]);

  const filteredMemos = useMemo(() => {
    let result = memos;

    if (filter === 'important') result = result.filter(m => m.priority === 'important');
    else if (filter === 'favorites') result = result.filter(m => m.isFavorite);
    else if (filter === 'archived') result = result.filter(m => m.isArchived);
    else if (CATEGORIES.includes(filter)) result = result.filter(m => m.category === filter);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => m.content.toLowerCase().includes(q));
    }

    const priorityWeight = { important: 3, normal: 2, secondary: 1 };
    return [...result].sort((a, b) => {
      const pA = priorityWeight[a.priority || 'normal'];
      const pB = priorityWeight[b.priority || 'normal'];
      if (pA !== pB) return pB - pA;
      return b.createdAt - a.createdAt;
    });
  }, [memos, filter, searchQuery]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-t-blue-600 border-4 border-slate-200 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar
        activeFilter={filter}
        setActiveFilter={setFilter}
        tags={allTags}
        onExport={() => {}}
        onImport={() => {}}
        onOpenSyncSettings={() => setIsSyncSettingsOpen(true)}
        isSyncing={isSyncing}
        memos={memos}
        onClearHistory={clearHistory}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-md shadow-blue-200">
              <Icons.Logo className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Smart Assistant</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={toggleDarkMode}
              className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-600 dark:text-slate-300"
            >
              {darkMode ? <Icons.Moon className="w-5 h-5" /> : <Icons.Sun className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsSyncSettingsOpen(true)}
              className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-600 dark:text-slate-300"
            >
              <Icons.Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md py-4 mb-6 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none">
          <div className="relative group">
            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>
        </div>

        {/* Editor */}
        {filter !== 'archived' && filter !== 'calendar' && filter !== 'kanban' && filter !== 'focus' && (
          <MemoEditor 
            onSave={addMemo} 
            defaultCategory={CATEGORIES.includes(filter) ? filter : undefined}
          />
        )}

        {/* Content Area */}
        {filter === 'calendar' ? (
          <CalendarView memos={filteredMemos} />
        ) : filter === 'kanban' ? (
          <KanbanView memos={filteredMemos} onUpdate={updateMemo} onDelete={deleteMemo} />
        ) : filter === 'focus' ? (
          <FocusMode />
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-24">
            {filteredMemos.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Icons.List className="w-8 h-8" />
                </div>
                <p className="text-slate-500 font-medium">No tasks found</p>
              </div>
            ) : (
              filteredMemos.map(memo => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  onUpdate={updateMemo}
                  onDelete={deleteMemo}
                />
              ))
            )}
          </div>
        )}
      </main>

      <ChatAssistant contextMemos={memos.map(m => m.content)} />

      {isSyncSettingsOpen && (
        <SyncSettings 
          isOpen={isSyncSettingsOpen} 
          onClose={() => setIsSyncSettingsOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
