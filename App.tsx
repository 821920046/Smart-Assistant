
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Memo } from './types';
import { storage } from './services/storage';
import { syncService } from './services/sync';
import Sidebar from './components/Sidebar';
import MemoEditor from './components/MemoEditor';
import MemoCard from './components/MemoCard';
import ChatAssistant from './components/ChatAssistant';
import SyncSettings from './components/SyncSettings';
import { Icons } from './constants';
import { generateSummary } from './services/gemini';

const App: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const performSync = useCallback(async (currentMemos: Memo[]) => {
    const config = syncService.getConfig();
    if (config.provider === 'none') return currentMemos;

    setIsSyncing(true);
    try {
      let merged: Memo[] = currentMemos;
      if (config.provider === 'supabase') merged = await syncService.syncWithSupabase(config, currentMemos);
      if (config.provider === 'webdav') merged = await syncService.syncWithWebDAV(config, currentMemos);
      if (config.provider === 'gist') merged = await syncService.syncWithGist(config, currentMemos);
      
      await storage.saveMemos(merged);
      const visible = merged.filter(m => !m.isDeleted);
      setMemos(visible);
      return merged;
    } catch (e) {
      console.error('Sync failed:', e);
      return currentMemos;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      await storage.migrateFromLocalStorage();
      const storedMemos = await storage.getMemos();
      setMemos(storedMemos);
      setIsLoading(false);
      await performSync(storedMemos);
    };
    initApp();
  }, [performSync]);

  const addMemo = async (memoData: Partial<Memo>) => {
    const now = Date.now();
    const newMemo: Memo = {
      id: Math.random().toString(36).substr(2, 6),
      content: memoData.content || '',
      type: memoData.type || 'memo',
      todos: memoData.todos || [],
      tags: memoData.tags || [],
      dueDate: memoData.dueDate,
      reminderAt: memoData.reminderAt,
      sketchData: memoData.sketchData,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      isFavorite: false,
    };
    const updatedLocal = [newMemo, ...memos];
    setMemos(updatedLocal);
    await storage.upsertMemo(newMemo);
    setIsEditorOpen(false);
    // 异步触发同步
    const all = await storage.getMemos(true);
    performSync(all);
  };

  const updateMemo = async (updatedMemo: Memo) => {
    const upgraded = { ...updatedMemo, updatedAt: Date.now() };
    setMemos(prev => prev.map(m => m.id === upgraded.id ? upgraded : m));
    await storage.upsertMemo(upgraded);
    const all = await storage.getMemos(true);
    performSync(all);
  };

  const deleteMemo = async (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      const memoToDelete = memos.find(m => m.id === id);
      if (memoToDelete) {
        const deletedMemo = { ...memoToDelete, isDeleted: true, updatedAt: Date.now() };
        setMemos(prev => prev.filter(m => m.id !== id));
        await storage.upsertMemo(deletedMemo);
        const all = await storage.getMemos(true);
        performSync(all);
      }
    }
  };

  const handleGenerateSummary = async () => {
    if (filteredMemos.length === 0) return;
    setIsSummarizing(true);
    setSummary(null);
    try {
      const textSummary = await generateSummary(filteredMemos.map(m => m.content));
      setSummary(textSummary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const filteredMemos = useMemo(() => {
    let result = memos;
    if (filter === 'archived') {
      result = result.filter(m => m.isArchived);
    } else {
      result = result.filter(m => !m.isArchived);
      if (filter === 'todo') result = result.filter(m => m.type === 'todo');
      if (filter === 'favorites') result = result.filter(m => m.isFavorite);
      if (filter.startsWith('tag:')) {
        const tagName = filter.split(':')[1];
        result = result.filter(m => m.tags.includes(tagName));
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.content.toLowerCase().includes(q) || 
        m.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [memos, filter, searchQuery]);

  const activeLabel = useMemo(() => {
    if (filter === 'all') return '时间轴';
    if (filter === 'todo') return '待办事项';
    if (filter === 'favorites') return '收藏夹';
    if (filter === 'archived') return '已归档';
    if (filter.startsWith('tag:')) return `#${filter.split(':')[1]}`;
    return '记录';
  }, [filter]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 border-[3px] border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Thinking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900 bg-[#fcfcfd]">
      <Sidebar 
        activeFilter={filter} 
        setActiveFilter={setFilter} 
        tags={Array.from(new Set(memos.flatMap(m => m.tags))).sort()}
        onExport={() => {}} 
        onImport={() => {}}
        onOpenSyncSettings={() => setIsSyncSettingsOpen(true)}
        isSyncing={isSyncing}
      />
      
      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 md:px-12 pt-6 md:pt-24 pb-safe-nav">
        <header className="flex flex-col gap-6 md:gap-12 mb-8 md:mb-16">
          <div className="flex items-end justify-between">
            <div className="space-y-1.5 md:space-y-3">
              <div className="flex items-center gap-2 text-indigo-500 font-bold text-[9px] md:text-[11px] uppercase tracking-[0.2em]">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-indigo-500'}`} />
                {isSyncing ? 'Synchronizing' : 'Intelligent Space'}
              </div>
              <h1 className="text-3xl md:text-7xl font-black tracking-tighter leading-none">{activeLabel}</h1>
            </div>
            <button 
              onClick={handleGenerateSummary}
              disabled={isSummarizing || filteredMemos.length === 0}
              className="p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 bg-white hover:border-indigo-200 transition-all active-scale shadow-sm"
              title="生成 AI 摘要"
            >
              {isSummarizing ? <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /> : <Icons.Sparkles />}
            </button>
          </div>
          
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="搜索思维、任务或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 md:h-20 bg-white border border-slate-100 rounded-2xl md:rounded-[32px] pl-14 pr-6 text-sm md:text-lg font-medium outline-none focus:border-indigo-200 shadow-sm transition-all placeholder:text-slate-300"
            />
          </div>
        </header>

        {summary && (
          <section className="mb-10 md:mb-16 animate-card">
            <div className="p-6 md:p-12 rounded-[32px] md:rounded-[48px] glass border-indigo-50/50 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500"><Icons.Sparkles /></div>
                  <h3 className="font-black text-slate-900 text-sm tracking-tight">AI 分析摘要</h3>
                </div>
                <button onClick={() => setSummary(null)} className="text-slate-300 hover:text-slate-900 transition-colors text-2xl">&times;</button>
              </div>
              <div className="text-slate-700 leading-relaxed text-[15px] md:text-lg whitespace-pre-wrap font-medium">{summary}</div>
            </div>
          </section>
        )}

        <section className="hidden md:block mb-24"><MemoEditor onSave={addMemo} /></section>

        <div className="grid grid-cols-1 gap-6 md:gap-12">
          {filteredMemos.length > 0 ? (
            filteredMemos.map((memo, idx) => (
              <div key={memo.id} className="animate-card" style={{ animationDelay: `${idx * 40}ms` }}>
                <MemoCard memo={memo} onUpdate={updateMemo} onDelete={deleteMemo} onTagClick={setFilter} />
              </div>
            ))
          ) : (
            <div className="py-24 md:py-40 flex flex-col items-center text-center px-8">
              <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200 mb-8"><Icons.Archive /></div>
              <h3 className="text-slate-900 font-black text-xl mb-3 tracking-tight">暂无内容</h3>
              <p className="text-slate-400 text-sm max-w-xs">在这里记下你的第一条灵感、待办或手绘，开启高效的一天。</p>
            </div>
          )}
        </div>
      </main>

      {/* 移动端底部操作栏 */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass rounded-3xl p-2.5 flex items-center justify-between z-[80] shadow-2xl border border-white/40 ring-1 ring-slate-900/5">
        <button 
          onClick={() => setFilter('all')} 
          className={`flex-1 py-3.5 rounded-2xl flex justify-center active-scale transition-colors ${filter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
        >
          <Icons.Archive />
        </button>
        <button 
          onClick={() => setIsEditorOpen(true)} 
          className="w-14 h-14 assistant-gradient text-white rounded-full flex items-center justify-center -translate-y-6 border-[6px] border-white shadow-xl active-scale transition-all"
        >
          <Icons.Plus />
        </button>
        <button 
          onClick={() => setFilter('favorites')} 
          className={`flex-1 py-3.5 rounded-2xl flex justify-center active-scale transition-colors ${filter === 'favorites' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
        >
          <Icons.Star filled={filter === 'favorites'} />
        </button>
      </nav>

      {/* 移动端全屏编辑器浮层 */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex flex-col">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditorOpen(false)} />
          <div className="mt-auto w-full bg-white rounded-t-[40px] p-6 animate-card relative z-[101] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
             <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0" />
             <div className="overflow-y-auto no-scrollbar pb-12 flex-1">
                <MemoEditor onSave={addMemo} />
             </div>
          </div>
        </div>
      )}

      <ChatAssistant contextMemos={memos.map(m => m.content)} />

      {isSyncSettingsOpen && (
        <SyncSettings 
          onClose={() => setIsSyncSettingsOpen(false)} 
          onSyncComplete={async () => {
            const current = await storage.getMemos(true);
            performSync(current);
          }}
        />
      )}
    </div>
  );
};

export default App;
