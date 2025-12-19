
import React, { useState, useEffect, useMemo } from 'react';
import { Memo } from './types';
import { storage } from './services/storage';
import Sidebar from './components/Sidebar';
import MemoEditor from './components/MemoEditor';
import MemoCard from './components/MemoCard';
import { Icons } from './constants';
import { generateSummary } from './services/gemini';

const App: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [activeReminder, setActiveReminder] = useState<Memo | null>(null);

  useEffect(() => {
    setMemos(storage.getMemos());
    
    // Background reminder check
    const interval = setInterval(() => {
      const now = Date.now();
      const storedMemos = storage.getMemos();
      const dueMemo = storedMemos.find(m => m.reminderAt && m.reminderAt <= now);
      
      if (dueMemo) {
        setActiveReminder(dueMemo);
        // Clear the reminder so it doesn't trigger again
        const updatedMemos = storedMemos.map(m => 
          m.id === dueMemo.id ? { ...m, reminderAt: undefined } : m
        );
        saveMemos(updatedMemos);
        
        // Browser notification attempt
        if (Notification.permission === 'granted') {
          new Notification('智能助理提醒', { body: dueMemo.content.slice(0, 50) + '...' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const saveMemos = (newMemos: Memo[]) => {
    setMemos(newMemos);
    storage.saveMemos(newMemos);
  };

  const addMemo = (memoData: Partial<Memo>) => {
    const newMemo: Memo = {
      id: Math.random().toString(36).substr(2, 6),
      content: memoData.content || '',
      type: memoData.type || 'memo',
      todos: memoData.todos || [],
      tags: memoData.tags || [],
      dueDate: memoData.dueDate,
      reminderAt: memoData.reminderAt,
      createdAt: Date.now(),
      isArchived: false,
      isFavorite: false,
    };
    saveMemos([newMemo, ...memos]);
  };

  const updateMemo = (updatedMemo: Memo) => {
    saveMemos(memos.map(m => m.id === updatedMemo.id ? updatedMemo : m));
  };

  const deleteMemo = (id: string) => {
    saveMemos(memos.filter(m => m.id !== id));
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

  const handleGenerateSummary = async () => {
    if (filteredMemos.length === 0) return;
    setIsSummarizing(true);
    setSummary(null);
    try {
      const textSummary = await generateSummary(filteredMemos.map(m => m.content));
      setSummary(textSummary);
    } finally {
      setIsSummarizing(false);
    }
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    memos.forEach(m => m.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [memos]);

  const handleTagClick = (tag: string) => {
    const tagId = `tag:${tag}`;
    setFilter(filter === tagId ? 'all' : tagId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterLabelMap: Record<string, string> = {
    all: '时间轴',
    todo: '待办任务',
    favorites: '收藏夹',
    archived: '归档'
  };

  const filterLabel = useMemo(() => {
    if (filter.startsWith('tag:')) return `#${filter.split(':')[1]}`;
    return filterLabelMap[filter] || filter;
  }, [filter]);

  return (
    <div className="min-h-screen flex text-slate-900">
      <Sidebar 
        activeFilter={filter} 
        setActiveFilter={setFilter} 
        tags={allTags} 
      />
      
      <main className="flex-1 flex flex-col max-w-4xl mx-auto px-10 py-12 gap-12">
        <header className="flex items-center gap-6 glass p-4 rounded-3xl border border-white shadow-xl shadow-sky-100/50 sticky top-6 z-20 backdrop-blur-xl">
          <div className="pl-4 text-slate-400">
            <Icons.Search />
          </div>
          <input
            type="text"
            placeholder="搜索记录或想法..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none focus:ring-0 text-sm bg-transparent font-medium placeholder:text-slate-300"
          />
          <div className="flex items-center gap-3 pr-2">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-slate-100 pr-3 mr-1">
              {memos.length} 条数据
            </div>
            <div className="transition-transform hover:rotate-6 duration-300 drop-shadow-sm scale-90">
              <Icons.Logo />
            </div>
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <MemoEditor onSave={addMemo} />
        </section>

        {/* AI Briefing Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {filterLabel}
              </h2>
              {filteredMemos.length > 0 && (
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                  className="flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-sky-100 hover:bg-sky-100 transition-all"
                >
                  <Icons.Sparkles />
                  {isSummarizing ? '生成总结中...' : '智能总结'}
                </button>
              )}
            </div>
            <div className="h-[1px] flex-1 ml-6 bg-slate-100"></div>
          </div>

          {summary && (
            <div className="animate-in fade-in zoom-in-95 duration-500 glass border border-indigo-100 p-8 rounded-[32px] assistant-glow bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 text-indigo-500/5 rotate-12 scale-[3]">
                <Icons.Sparkles />
              </div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                    <Icons.Sparkles />
                   </div>
                   <div>
                     <h3 className="text-sm font-black text-indigo-900 uppercase tracking-[0.2em]">AI Briefing</h3>
                     <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">智能内容简报</p>
                   </div>
                 </div>
                 <button 
                  onClick={() => setSummary(null)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 border border-indigo-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all shadow-sm"
                  title="关闭简报"
                 >
                   <span className="text-lg leading-none">&times;</span>
                 </button>
              </div>
              <div className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap font-medium relative z-10 pl-2 border-l-2 border-indigo-200/50">
                {summary}
              </div>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-indigo-300 uppercase tracking-widest relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                内容基于当前筛选的 {filteredMemos.length} 条记录自动生成
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-10">
            {filteredMemos.length > 0 ? (
              filteredMemos.map((memo, idx) => (
                <div 
                  key={memo.id} 
                  className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <MemoCard 
                    memo={memo} 
                    onUpdate={updateMemo} 
                    onDelete={deleteMemo} 
                    onTagClick={handleTagClick}
                  />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[32px] border border-dashed border-slate-200">
                <div className="text-slate-100 mb-6 scale-150">
                  <Icons.Archive />
                </div>
                <p className="text-slate-300 text-sm font-bold uppercase tracking-widest">目前空空如也</p>
                <button onClick={() => setFilter('all')} className="mt-4 text-xs font-bold text-sky-500 hover:text-sky-600 underline">查看所有记录</button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Reminder Alert UI */}
      {activeReminder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl assistant-glow animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 assistant-gradient"></div>
             <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-[28px] assistant-gradient text-white flex items-center justify-center mb-8 shadow-xl animate-bounce">
                  <Icons.Bell />
                </div>
                <h3 className="text-[10px] font-black text-sky-500 uppercase tracking-[0.4em] mb-4">时间到了！</h3>
                <p className="text-slate-900 text-xl font-bold leading-relaxed mb-10 line-clamp-4">
                  {activeReminder.content}
                </p>
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => setActiveReminder(null)}
                    className="flex-1 py-4 px-6 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                  >
                    我知道了
                  </button>
                  <button 
                    onClick={() => {
                      // Simple snooze logic: remind again in 5 mins
                      const updated = { ...activeReminder, reminderAt: Date.now() + 5 * 60000 };
                      updateMemo(updated);
                      setActiveReminder(null);
                    }}
                    className="flex-1 py-4 px-6 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                  >
                    稍后提醒 (5分)
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
