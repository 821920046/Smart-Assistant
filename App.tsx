
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
    setIsEditorOpen(false); // 移动端保存后关闭
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
    if (filter === 'all') return '时间轴';
    if (filter === 'todo') return '待办任务';
    if (filter === 'favorites') return '收藏夹';
    if (filter === 'archived') return '已归档';
    if (filter.startsWith('tag:')) return `# ${filter.split(':')[1]}`;
    return '记录';
  }, [filter]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fcfcfd]">
      <Sidebar 
        activeFilter={filter} 
        setActiveFilter={(f) => { setFilter(f); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
        tags={allTags} 
      />
      
      {/* 桌面端装饰性背景 */}
      <div className="hidden lg:block fixed top-0 right-0 w-[400px] h-[400px] bg-sky-100/30 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2" />
      
      <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-16 pb-32">
        {/* Header Section */}
        <div className="flex flex-col gap-6 mb-10">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Workspace</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{activeLabel}</h1>
            </div>
            <div className="flex items-center gap-2">
               {filteredMemos.length > 0 && (
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                  className="p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-600 hover:text-sky-600 active:scale-95 transition-all"
                  title="AI 总结"
                >
                  <Icons.Sparkles />
                </button>
               )}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-500">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="搜索任何想法..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass border border-slate-100/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-sky-500/20 shadow-sm"
            />
          </div>
        </div>

        {/* Editor (Desktop) */}
        <section className="hidden md:block mb-12">
          <MemoEditor onSave={addMemo} />
        </section>

        {/* Summary (AI) */}
        {summary && (
          <section className="mb-10 animate-slide-up">
            <div className="bg-gradient-to-br from-indigo-50/50 to-sky-50/30 border border-indigo-100 p-8 rounded-[32px] relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Icons.Sparkles />
              </div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Icons.Sparkles />
                  </div>
                  <span className="font-bold text-slate-900">AI 智能简报</span>
                </div>
                <button onClick={() => setSummary(null)} className="text-slate-400 text-xl">&times;</button>
              </div>
              <div className="text-slate-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap font-medium">
                {summary}
              </div>
            </div>
          </section>
        )}

        {/* Memo List */}
        <div className="grid grid-cols-1 gap-6">
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
            <div className="py-24 flex flex-col items-center opacity-30">
               <div className="scale-150 mb-4 text-slate-300"><Icons.Archive /></div>
               <p className="text-sm font-bold uppercase tracking-widest text-slate-400">目前空空如也</p>
            </div>
          )}
        </div>
      </main>

      {/* 移动端 Dock */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] glass border border-slate-200/50 rounded-[28px] p-3 flex items-center justify-around z-50 mobile-dock">
        {[
          { id: 'all', icon: Icons.Plus, label: '首页' },
          { id: 'todo', icon: Icons.CheckCircle, label: '待办' },
          { id: 'action', icon: null, label: '添加' }, // 特殊占位
          { id: 'favorites', icon: Icons.Star, label: '收藏' },
          { id: 'archived', icon: Icons.Archive, label: '归档' },
        ].map(item => {
          if (item.id === 'action') {
            return (
              <button 
                key="fab"
                onClick={() => setIsEditorOpen(true)}
                className="w-14 h-14 assistant-gradient text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-sky-200 active:scale-90 transition-all -translate-y-2"
              >
                <Icons.Plus />
              </button>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => { setFilter(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex flex-col items-center gap-1 transition-all ${
                filter === item.id ? 'text-sky-600 scale-110 font-bold' : 'text-slate-400 opacity-60'
              }`}
            >
              <item.icon />
              <span className="text-[9px] uppercase tracking-tighter">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 移动端全屏编辑器 */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] glass flex items-end md:hidden">
          <div className="w-full bg-white rounded-t-[40px] p-6 shadow-2xl animate-slide-up border-t border-slate-100">
             <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-black uppercase tracking-widest text-slate-400">新建灵感</span>
                <button onClick={() => setIsEditorOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <Icons.ChevronDown />
                </button>
             </div>
             <MemoEditor onSave={addMemo} />
             <div className="h-[var(--safe-bottom)]" />
          </div>
        </div>
      )}

      {/* Reminder Alert */}
      {activeReminder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl text-center animate-slide-up">
             <div className="w-20 h-20 rounded-3xl assistant-gradient text-white flex items-center justify-center mx-auto mb-8 shadow-xl">
               <Icons.Bell />
             </div>
             <p className="text-slate-900 text-lg font-bold mb-10 leading-relaxed">{activeReminder.content}</p>
             <button 
               onClick={() => setActiveReminder(null)}
               className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95"
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
