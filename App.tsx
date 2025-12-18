
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

  useEffect(() => {
    setMemos(storage.getMemos());
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
    all: '所有记录',
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
            placeholder="搜索您的灵感与记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none focus:ring-0 text-sm bg-transparent font-medium placeholder:text-slate-300"
          />
          <div className="flex items-center gap-3 pr-2">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-slate-100 pr-3 mr-1">
              {memos.length} 条记录
            </div>
            <button className="w-10 h-10 rounded-2xl assistant-gradient flex items-center justify-center text-white shadow-lg shadow-sky-200">
              <Icons.Logo />
            </button>
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
            <div className="animate-in fade-in zoom-in-95 duration-500 glass border border-sky-100 p-6 rounded-[28px] assistant-glow bg-gradient-to-br from-white to-sky-50/30">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2 text-sky-600">
                   <Icons.Sparkles />
                   <h3 className="text-xs font-black uppercase tracking-widest">智能简报</h3>
                 </div>
                 <button onClick={() => setSummary(null)} className="text-slate-300 hover:text-slate-500">×</button>
              </div>
              <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium italic">
                {summary}
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
    </div>
  );
};

export default App;
