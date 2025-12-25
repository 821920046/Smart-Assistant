import React, { useState } from 'react';
import { Memo, Priority } from '../types.js';
import MemoCard from './MemoCard.js';
import { Icons } from '../constants.js';

interface KanbanViewProps {
  memos: Memo[];
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onAdd: (memo: Partial<Memo>) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({ memos, onUpdate, onDelete, onAdd }) => {
  const columns = [
    { id: 'important', label: 'Important', color: 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900', titleColor: 'text-rose-700 dark:text-rose-400' },
    { id: 'normal', label: 'Normal', color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900', titleColor: 'text-blue-700 dark:text-blue-400' },
    { id: 'secondary', label: 'Low Priority', color: 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700', titleColor: 'text-slate-700 dark:text-slate-400' },
    { id: 'completed', label: 'Completed', color: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900', titleColor: 'text-emerald-700 dark:text-emerald-400' },
  ];

  const [quickAddText, setQuickAddText] = useState<{ [key: string]: string }>({});

  const getColumnMemos = (columnId: string) => {
    if (columnId === 'completed') {
      return memos.filter(m => !!m.completedAt);
    }
    return memos.filter(m => !m.completedAt && (m.priority || 'normal') === columnId);
  };

  const handleQuickAdd = (columnId: string) => {
    const text = quickAddText[columnId];
    if (!text?.trim()) return;

    onAdd({
      content: text,
      priority: columnId as Priority,
      type: 'todo'
    });
    setQuickAddText(prev => ({ ...prev, [columnId]: '' }));
  };

  const handleDragStart = (e: React.DragEvent, memoId: string) => {
    e.dataTransfer.setData('text/plain', memoId);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback class to dragged element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('opacity-50', 'scale-105', 'shadow-2xl');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.classList.remove('opacity-50', 'scale-105', 'shadow-2xl');
    }
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) {
        setDragOverColumn(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const memoId = e.dataTransfer.getData('text/plain');
    const memo = memos.find(m => m.id === memoId);
    
    if (memo) {
      if (columnId === 'completed') {
        onUpdate({ ...memo, completedAt: Date.now() });
      } else {
        onUpdate({ 
          ...memo, 
          priority: columnId as Priority,
          completedAt: undefined 
        });
      }
    }
  };

  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-8 h-[calc(100vh-140px)] items-start snap-x snap-mandatory md:snap-none px-4 md:px-0">
      {columns.map(col => {
        const colMemos = getColumnMemos(col.id);
        const isCompletedCol = col.id === 'completed';
        const isDragOver = dragOverColumn === col.id;

        return (
          <div 
            key={col.id} 
            className={`min-w-[300px] w-[320px] shrink-0 rounded-2xl border flex flex-col h-full snap-center bg-opacity-50 backdrop-blur-sm transition-all duration-200 
                ${isDragOver 
                    ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-900/30 scale-[1.02] shadow-xl' 
                    : `${col.color} hover:border-black/10 dark:hover:border-white/10`
                }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Header */}
            <div className={`p-4 flex items-center justify-between font-bold ${col.titleColor} border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 sticky top-0 z-10 backdrop-blur-md rounded-t-2xl`}>
              <div className="flex items-center gap-3">
                <span className="text-base uppercase tracking-wider font-extrabold">{col.label}</span>
                <span className="bg-white/60 dark:bg-black/20 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                  {colMemos.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                 {!isCompletedCol && (
                     <button 
                        onClick={() => {
                            const input = document.getElementById(`quick-add-${col.id}`);
                            input?.focus();
                        }}
                        className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-blue-500 hover:text-white text-current transition-all shadow-sm active:scale-95"
                        title="Quick Add Task"
                     >
                         <Icons.Plus className="w-5 h-5" />
                     </button>
                 )}
                 {isCompletedCol && <Icons.CheckCircle className="w-5 h-5 opacity-50" />}
              </div>
            </div>
            
            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
              {colMemos.map(memo => (
                <div 
                    key={memo.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, memo.id)}
                    onDragEnd={handleDragEnd}
                    className="transform transition-all hover:-translate-y-1 duration-200 cursor-move active:cursor-grabbing"
                >
                  <MemoCard 
                    memo={memo} 
                    onUpdate={onUpdate} 
                    onDelete={onDelete} 
                    compact 
                  />
                </div>
              ))}
              {colMemos.length === 0 && (
                <div className="h-32 border-2 border-dashed border-black/5 dark:border-white/5 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2 m-2">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-full">
                    {isCompletedCol ? <Icons.Check className="w-5 h-5 opacity-50" /> : <Icons.Tag className="w-5 h-5 opacity-50" />}
                  </div>
                  <span className="text-xs font-medium">Drop items here</span>
                </div>
              )}
            </div>

            {/* Quick Add Footer */}
            {!isCompletedCol && (
              <div className="p-3 border-t border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/30 rounded-b-2xl backdrop-blur-md sticky bottom-0 z-10">
                <div className="flex flex-col gap-2">
                    <div className="relative group">
                        <input
                            id={`quick-add-${col.id}`}
                            type="text"
                            value={quickAddText[col.id] || ''}
                            onChange={(e) => setQuickAddText(prev => ({ ...prev, [col.id]: e.target.value }))}
                            onKeyDown={(e) => handleKeyDown(e, col.id)}
                            placeholder="Type a new task..."
                            className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm shadow-sm dark:text-white placeholder-slate-400 transition-all outline-none"
                        />
                         <button
                            onClick={() => handleQuickAdd(col.id)}
                            disabled={!quickAddText[col.id]?.trim()}
                            className={`absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-lg transition-all ${
                                quickAddText[col.id]?.trim() 
                                ? 'bg-blue-600 text-white shadow-md hover:scale-105 active:scale-95' 
                                : 'bg-slate-100 text-slate-300 dark:bg-slate-700 dark:text-slate-600'
                            }`}
                        >
                            <Icons.ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KanbanView;
