
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    setMemos(storage.getMemos());
    const interval = setInterval(() => {
      const now = Date.now();
      const storedMemos = storage.getMemos();
      const dueMemo = storedMemos.find(m => m.reminderAt && m.reminderAt <= now);
      if (dueMemo) {
        setActiveReminder(dueMemo);
        const updatedMemos = storedMemos.map(m => 
          m.id === dueMemo.id ? { ...m, reminderAt: undefined } : m
        );
        saveMemos(updatedMemos);
      }
    }, 15000);
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
    setIsEditorOpen(false);
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

  const activeLabel = useMemo(() => {
    if (filter === 'all') return '主时间轴';
    if (filter === 'todo') return '待办事项';
    if (filter === 'favorites') return '收藏夹';
    if (filter === 'archived') return '已归档内容';
    if (filter.startsWith('tag:')) return `# ${filter.split(':')[1]}`;
    return '备忘录';
  }, [filter]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar 
        activeFilter={filter} 
        setActiveFilter={(f) => { setFilter(f); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
        tags={allTags} 
      />
      
      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 md:px-8 pt-8 md:pt-20 pb-40">
        {/* Page Header */}
        <header className="flex flex-col gap-8 mb-12">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sky-600 font-bold text-[10px] uppercase tracking-[0.2em]">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                智能工作空间
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">{activeLabel}</h1>
            </div>
            
            <button 
              onClick={handleGenerateSummary}
              disabled={isSummarizing || filteredMemos.length === 0}
              className={`p-3 rounded-2xl border transition-all flex items-center gap-2 shadow-sm active:scale-95 ${
                isSummarizing 
                ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' 
                : 'bg-white text-slate-700 border-slate-200 hover:border-sky-200 hover:text-sky-600'
              }`}
            >
              {isSummarizing ? <div className="w-4 h-4 border-2 border-slate-200 border-t-sky-500 rounded-full animate-spin" /> : <Icons.Sparkles />}
              <span className="text-xs font-bold hidden sm:inline">AI 摘要</span>
            </button>
          </div>

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="搜索任何内容、任务或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-[20px] pl-14 pr-6 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none"
            />
          </div>
        </header>

        {/* Desktop Editor */}
        <section className="hidden md:block mb-16 animate-slide-up">
          <MemoEditor onSave={addMemo} />
        </section>

        {/* AI Summary View */}
        {summary && (
          <section className="mb-12 animate-slide-up">
            <div className="bg-gradient-to-br from-indigo-50/80 to-sky-50/50 border border-indigo-100 p-8 rounded-[32px] relative overflow-hidden shadow-sm">
              <div className="absolute right-0 top-0 p-8 opacity-5">
                <Icons.Sparkles />
              </div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                    <Icons.Sparkles />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight text-sm">AI 智能洞察</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Generated Summaries</p>
                  </div>
                </div>
                <button onClick={() => setSummary(null)} className="w-8 h-8 rounded-full hover:bg-white/50 flex items-center justify-center text-slate-400 transition-colors">&times;</button>
              </div>
              <div className="text-slate-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap font-medium">
                {summary}
              </div>
            </div>
          </section>
        )}

        {/* List Content */}
        <div className="grid grid-cols-1 gap-6">
          {filteredMemos.length > 0 ? (
            filteredMemos.map((memo, idx) => (
              <div key={memo.id} className="animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <MemoCard 
                  memo={memo} 
                  onUpdate={updateMemo} 
                  onDelete={deleteMemo} 
                  onTagClick={(t) => setFilter(`tag:${t}`)}
                />
              </div>
            ))
          ) : (
            <div className="py-32 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
                <Icons.Archive />
              </div>
              <h3 className="text-slate-900 font-bold text-lg mb-2">暂无记录</h3>
              <p className="text-slate-400 text-sm max-w-[240px]">
                这里还没有内容。开启一段新的思考，或者切换筛选条件。
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Floating Bar */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass rounded-[28px] p-2 flex items-center justify-between z-50 mobile-dock border border-white/50">
        <div className="flex flex-1 justify-around">
          {[
            { id: 'all', icon: Icons.Plus, label: '首页' },
            { id: 'todo', icon: Icons.CheckCircle, label: '待办' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setFilter(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex flex-col items-center p-3 rounded-2xl transition-all ${
                filter === item.id ? 'bg-sky-50 text-sky-600' : 'text-slate-400'
              }`}
            >
              <item.icon />
            </button>
          ))}
        </div>

        <button 
          onClick={() => setIsEditorOpen(true)}
          className="w-14 h-14 assistant-gradient text-white rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 active:scale-90 transition-all -translate-y-4 border-4 border-[#f8fafc]"
        >
          <Icons.Plus />
        </button>

        <div className="flex flex-1 justify-around">
          {[
            { id: 'favorites', icon: Icons.Star, label: '收藏' },
            { id: 'archived', icon: Icons.Archive, label: '归档' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setFilter(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex flex-col items-center p-3 rounded-2xl transition-all ${
                filter === item.id ? 'bg-sky-50 text-sky-600' : 'text-slate-400'
              }`}
            >
              <item.icon />
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Modal Editor */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditorOpen(false)} />
          <div className="w-full bg-white rounded-t-[40px] p-6 shadow-2xl animate-slide-up relative z-10 border-t border-slate-100">
             <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
             <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">捕捉灵感</span>
                <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 font-bold p-2">关闭</button>
             </div>
             <MemoEditor onSave={addMemo} />
             <div className="h-[var(--safe-bottom)]" />
          </div>
        </div>
      )}

      {/* Reminder Global Alert */}
      {activeReminder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
          <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl text-center animate-slide-up border border-slate-100">
             <div className="w-24 h-24 rounded-[32px] assistant-gradient text-white flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-sky-500/20">
               <div className="scale-150"><Icons.Bell /></div>
             </div>
             <h2 className="text-2xl font-black text-slate-900 mb-2">任务提醒</h2>
             <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed px-4">{activeReminder.content}</p>
             <button 
               onClick={() => setActiveReminder(null)}
               className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 shadow-xl shadow-slate-900/20"
             >
               我知道了
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
