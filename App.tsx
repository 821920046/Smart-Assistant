
import React, { useState, useEffect, useMemo } from 'react';
import { Memo } from './types';
import { storage } from './services/storage';
import Sidebar from './components/Sidebar';
import MemoEditor from './components/MemoEditor';
import MemoCard from './components/MemoCard';
import ChatAssistant from './components/ChatAssistant';
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

  useEffect(() => {
    const initApp = async () => {
      await storage.migrateFromLocalStorage();
      const storedMemos = await storage.getMemos();
      setMemos(storedMemos);
      setIsLoading(false);
    };

    initApp();

    const interval = setInterval(async () => {
      const now = Date.now();
      const currentMemos = await storage.getMemos();
      const dueMemo = currentMemos.find(m => m.reminderAt && m.reminderAt <= now);
      if (dueMemo) {
        const updatedMemo = { ...dueMemo, reminderAt: undefined, updatedAt: now };
        await storage.upsertMemo(updatedMemo);
        setMemos(prev => prev.map(m => m.id === dueMemo.id ? updatedMemo : m));
        
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("记录提醒", { body: dueMemo.content.substring(0, 50) });
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

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
      updatedAt: now, // 核心：同步基准
      isArchived: false,
      isFavorite: false,
    };
    const updatedMemos = [newMemo, ...memos];
    setMemos(updatedMemos);
    await storage.upsertMemo(newMemo);
    setIsEditorOpen(false);
  };

  const updateMemo = async (updatedMemo: Memo) => {
    const upgraded = { ...updatedMemo, updatedAt: Date.now() };
    setMemos(prev => prev.map(m => m.id === upgraded.id ? upgraded : m));
    await storage.upsertMemo(upgraded);
  };

  const deleteMemo = async (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      const memoToDelete = memos.find(m => m.id === id);
      if (memoToDelete) {
        // 软删除逻辑，为同步做准备
        const deletedMemo = { ...memoToDelete, isDeleted: true, updatedAt: Date.now() };
        setMemos(prev => prev.filter(m => m.id !== id));
        await storage.upsertMemo(deletedMemo);
      }
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(memos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `memo-backup-${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
  };

  const handleImportData = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedMemos = JSON.parse(event.target?.result as string) as Memo[];
        if (Array.isArray(importedMemos)) {
          if (confirm(`准备恢复 ${importedMemos.length} 条记录。确定吗？`)) {
            // 合并逻辑：基于 id 和 updatedAt
            const existingMemos = await storage.getMemos(true);
            const memoMap = new Map(existingMemos.map(m => [m.id, m]));
            
            importedMemos.forEach(imported => {
              const existing = memoMap.get(imported.id);
              if (!existing || imported.updatedAt > existing.updatedAt) {
                memoMap.set(imported.id, imported);
              }
            });

            const merged = Array.from(memoMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
            setMemos(merged.filter(m => !m.isDeleted));
            await storage.saveMemos(merged);
            alert('数据恢复/同步成功！');
          }
        }
      } catch (e) {
        alert('解析备份文件失败。');
      }
    };
    reader.readAsText(file);
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
    return '记录';
  }, [filter]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">正在同步空间...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900">
      <Sidebar 
        activeFilter={filter} 
        setActiveFilter={setFilter} 
        tags={allTags}
        onExport={handleExportData}
        onImport={handleImportData}
      />
      
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-6 md:px-16 pt-12 md:pt-32 pb-40">
        <header className="flex flex-col gap-12 mb-16">
          <div className="flex items-end justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-indigo-500 font-bold text-[11px] uppercase tracking-[0.2em]">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm" />
                Intelligent Hub
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">{activeLabel}</h1>
            </div>
            <button 
              onClick={handleGenerateSummary}
              disabled={isSummarizing || filteredMemos.length === 0}
              className="p-4 rounded-3xl border transition-all flex items-center gap-3 bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
            >
              {isSummarizing ? <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /> : <Icons.Sparkles />}
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">AI Summary</span>
            </button>
          </div>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"><Icons.Search /></div>
            <input
              type="text"
              placeholder="搜索任何记录..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-16 bg-white border border-slate-200 rounded-[28px] pl-16 pr-8 text-base font-medium outline-none focus:border-indigo-400 shadow-sm transition-all"
            />
          </div>
        </header>

        {summary && (
          <section className="mb-20 animate-card">
            <div className="ai-summary-card p-10 rounded-[48px] relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-purple-100 flex items-center justify-center text-purple-500 shadow-sm"><Icons.Sparkles /></div>
                  <div><h3 className="font-black text-slate-900 text-base">AI 智能分析</h3></div>
                </div>
                <button onClick={() => setSummary(null)} className="w-10 h-10 rounded-full hover:bg-white/60 flex items-center justify-center text-slate-300 transition-colors">&times;</button>
              </div>
              <div className="text-slate-800 leading-relaxed text-base md:text-lg whitespace-pre-wrap font-medium">{summary}</div>
            </div>
          </section>
        )}

        <section className="hidden md:block mb-24 animate-card"><MemoEditor onSave={addMemo} /></section>

        <div className="grid grid-cols-1 gap-10">
          {filteredMemos.length > 0 ? (
            filteredMemos.map((memo, idx) => (
              <div key={memo.id} className="animate-card" style={{ animationDelay: `${idx * 40}ms` }}>
                <MemoCard memo={memo} onUpdate={updateMemo} onDelete={deleteMemo} onTagClick={setFilter} />
              </div>
            ))
          ) : (
            <div className="py-48 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200 mb-8"><Icons.Archive /></div>
              <h3 className="text-slate-900 font-black text-2xl mb-3 tracking-tight">暂无记录</h3>
            </div>
          )}
        </div>
      </main>

      <ChatAssistant contextMemos={filteredMemos.map(m => m.content)} />

      <nav className="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] glass rounded-[36px] p-2.5 flex items-center justify-between z-50 shadow-2xl border border-white/50">
        <button onClick={() => setFilter('all')} className={`p-4 rounded-3xl ${filter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}><Icons.Plus /></button>
        <button onClick={() => setIsEditorOpen(true)} className="w-16 h-16 assistant-gradient text-white rounded-full flex items-center justify-center -translate-y-8 border-4 border-white shadow-xl active:scale-95 transition-all"><Icons.Plus /></button>
        <button onClick={() => setFilter('favorites')} className={`p-4 rounded-3xl ${filter === 'favorites' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}><Icons.Star /></button>
      </nav>

      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditorOpen(false)} />
          <div className="w-full bg-white rounded-t-[48px] p-8 animate-card relative z-10 border-t border-slate-100">
             <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8" />
             <MemoEditor onSave={addMemo} />
             <div className="h-10" />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
