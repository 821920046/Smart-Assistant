
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
      
      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 md:px-12 pt-8 md:pt-24 pb-40">
        {/* Page Header */}
        <header className="flex flex-col gap-10 mb-16">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                Workspace
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight">{activeLabel}</h1>
            </div>
            
            <button 
              onClick={handleGenerateSummary}
              disabled={isSummarizing || filteredMemos.length === 0}
              className={`p-4 rounded-[20px] border transition-all flex items-center gap-3 shadow-sm active:scale-95 ${
                isSummarizing 
                ? 'bg-zinc-50 text-zinc-400 border-zinc-100 cursor-not-allowed' 
                : 'bg-white text-slate-800 border-zinc-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {isSummarizing ? <div className="w-4 h-4 border-2 border-zinc-200 border-t-indigo-500 rounded-full animate-spin" /> : <Icons.Sparkles />}
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">AI Summary</span>
            </button>
          </div>

          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="搜索任何内容、任务或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-16 bg-white border border-zinc-200 rounded-[24px] pl-16 pr-8 text-base font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none shadow-sm"
            />
          </div>
        </header>

        {/* AI Summary View */}
        {summary && (
          <section className="mb-16 animate-slide-up">
            <div className="ai-summary-gradient p-10 rounded-[40px] relative overflow-hidden">
              <div className="absolute right-[-20px] top-[-20px] p-12 opacity-[0.03] rotate-12">
                <Icons.Sparkles />
              </div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                    <Icons.Sparkles />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">AI 智绘简报</h3>
                    <p className="text-[10px] text-purple-500 font-black uppercase tracking-[0.2em]">Contextual Intelligence</p>
                  </div>
                </div>
                <button onClick={() => setSummary(null)} className="w-10 h-10 rounded-full hover:bg-white/60 flex items-center justify-center text-zinc-400 transition-colors">&times;</button>
              </div>
              <div className="text-slate-800 leading-relaxed text-base md:text-lg whitespace-pre-wrap font-medium">
                {summary}
              </div>
            </div>
          </section>
        )}

        {/* Desktop Editor */}
        <section className="hidden md:block mb-20 animate-slide-up">
          <MemoEditor onSave={addMemo} />
        </section>

        {/* List Content */}
        <div className="grid grid-cols-1 gap-8">
          {filteredMemos.length > 0 ? (
            filteredMemos.map((memo, idx) => (
              <div key={memo.id} className="animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <MemoCard 
                  memo={memo} 
                  onUpdate={updateMemo} 
                  onDelete={deleteMemo} 
                  onTagClick={(t) => setFilter(`tag:${t}`)}
                />
              </div>
            ))
          ) : (
            <div className="py-40 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-200 mb-8">
                <Icons.Archive />
              </div>
              <h3 className="text-slate-900 font-black text-xl mb-3">空空如也</h3>
              <p className="text-zinc-400 text-sm max-w-[280px] font-medium leading-relaxed">
                这里还没有内容。开启一段新的思考，记录每一个闪光瞬间。
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Floating Bar */}
      <nav className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] glass rounded-[32px] p-2 flex items-center justify-between z-50 shadow-2xl border border-white/50">
        <div className="flex flex-1 justify-around">
          {[
            { id: 'all', icon: Icons.Plus, label: '首页' },
            { id: 'todo', icon: Icons.CheckCircle, label: '待办' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setFilter(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex flex-col items-center p-4 rounded-2xl transition-all ${
                filter === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-zinc-400'
              }`}
            >
              <item.icon />
            </button>
          ))}
        </div>

        <button 
          onClick={() => setIsEditorOpen(true)}
          className="w-16 h-16 assistant-gradient text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/40 active:scale-90 transition-all -translate-y-6 border-4 border-white"
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
              className={`flex flex-col items-center p-4 rounded-2xl transition-all ${
                filter === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-zinc-400'
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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsEditorOpen(false)} />
          <div className="w-full bg-white rounded-t-[48px] p-8 shadow-2xl animate-slide-up relative z-10 border-t border-zinc-100">
             <div className="w-14 h-1.5 bg-zinc-200 rounded-full mx-auto mb-8" />
             <div className="flex justify-between items-center mb-8">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Capture Idea</span>
                <button onClick={() => setIsEditorOpen(false)} className="text-zinc-900 font-black text-sm uppercase p-2">Close</button>
             </div>
             <MemoEditor onSave={addMemo} />
             <div className="h-10" />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
