
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Memo } from './types.js';
import { storage } from './services/storage.js';
import { syncService } from './services/sync.js';
import Sidebar from './components/Sidebar.js';
import MemoEditor from './components/MemoEditor.js';
import MemoCard from './components/MemoCard.js';
import ChatAssistant from './components/ChatAssistant.js';
import SyncSettings from './components/SyncSettings.js';
import { Icons } from './constants.js';

const App: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
        const storedMemos = await storage.getMemos();
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

  const filteredMemos = useMemo(() => {
    let result = memos;
    if (filter === 'important') result = result.filter(m => m.priority === 'important');
    else if (filter === 'favorites') result = result.filter(m => m.isFavorite);
    else if (filter === 'archived') result = result.filter(m => m.isArchived);

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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-t-indigo-500 border-4 border-slate-100 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      <Sidebar
        activeFilter={filter} setActiveFilter={setFilter}
        tags={[]} onExport={() => { }} onImport={() => { }}
        onOpenSyncSettings={() => setIsSyncSettingsOpen(true)} isSyncing={isSyncing}
        memos={memos}
      />

      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-6 md:px-16 pt-20 pb-40">
        <header className="mb-20">
          <div className="flex items-center gap-3 text-indigo-500 font-black text-[11px] uppercase tracking-[0.4em] mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse" />
            Active Tasks Only
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-[-0.04em] mb-12 leading-[0.9] text-slate-900">
            {filter === 'all' ? 'Task Center' : filter === 'important' ? 'Priority High' : 'Archive'}
          </h1>
          <div className="relative group">
            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-all duration-300 scale-110"><Icons.Search /></div>
            <input
              type="text" placeholder="搜索待办任务..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-24 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[40px] pl-20 pr-10 text-2xl outline-none focus:border-indigo-200/50 focus:bg-white focus:shadow-[0_20px_60px_-15px_rgba(99,102,241,0.1)] transition-all duration-500 shadow-sm font-semibold text-slate-800 placeholder:text-slate-300"
            />
          </div>
        </header>

        <section className="mb-20"><MemoEditor onSave={addMemo} /></section>

        <div className="space-y-10">
          {filteredMemos.length > 0 ? (
            filteredMemos.map((memo) => (
              <MemoCard key={memo.id} memo={memo} onUpdate={updateMemo} onDelete={deleteMemo} />
            ))
          ) : (
            <div className="py-40 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-100 mb-8 border-4 border-dashed border-slate-100"><Icons.CheckCircle /></div>
              <h3 className="text-slate-400 font-black text-2xl tracking-tight">暂无任务</h3>
              <p className="text-slate-300 font-bold mt-2">快去创建一个重要任务吧！</p>
            </div>
          )}
        </div>
      </main>

      <ChatAssistant contextMemos={memos.map(m => m.content)} />
      {isSyncSettingsOpen && <SyncSettings onClose={() => setIsSyncSettingsOpen(false)} onSyncComplete={() => performSync(memos)} />}
    </div>
  );
};

export default App;
