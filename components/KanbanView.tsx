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

  const handleKeyDown = (e: React.KeyboardEvent, columnId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAdd(columnId);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-8 h-[calc(100vh-140px)] items-start snap-x snap-mandatory md:snap-none px-4 md:px-0">
      {columns.map(col => {
        const colMemos = getColumnMemos(col.id);
        const isCompletedCol = col.id === 'completed';

        return (
          <div 
            key={col.id} 
            className={`min-w-[300px] w-[320px] shrink-0 rounded-2xl border ${col.color} flex flex-col h-full snap-center bg-opacity-50 backdrop-blur-sm transition-colors duration-200`}
          >
            {/* Header */}
            <div className={`p-4 flex items-center justify-between font-bold ${col.titleColor} border-b border-black/5 dark:border-white/5`}>
              <div className="flex items-center gap-2">
                <span className="text-sm uppercase tracking-wider">{col.label}</span>
                <span className="bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs font-mono">
                  {colMemos.length}
                </span>
              </div>
              {isCompletedCol && <Icons.CheckCircle className="w-4 h-4 opacity-50" />}
              {!isCompletedCol && col.id === 'important' && <Icons.AlertCircle className="w-4 h-4 opacity-50" />}
            </div>
            
            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
              {colMemos.map(memo => (
                <div key={memo.id} className="transform transition-all hover:-translate-y-1 duration-200">
                  <MemoCard 
                    memo={memo} 
                    onUpdate={onUpdate} 
                    onDelete={onDelete} 
                    compact 
                  />
                </div>
              ))}
              {colMemos.length === 0 && (
                <div className="h-32 border-2 border-dashed border-black/5 dark:border-white/5 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-full">
                    {isCompletedCol ? <Icons.Check className="w-5 h-5 opacity-50" /> : <Icons.Tag className="w-5 h-5 opacity-50" />}
                  </div>
                  <span className="text-xs font-medium">No tasks</span>
                </div>
              )}
            </div>

            {/* Quick Add Footer */}
            {!isCompletedCol && (
              <div className="p-3 border-t border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/10 rounded-b-2xl backdrop-blur-sm">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickAddText[col.id] || ''}
                    onChange={(e) => setQuickAddText(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={(e) => handleKeyDown(e, col.id)}
                    placeholder="Add task..."
                    className="flex-1 bg-white dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500/50 dark:text-white placeholder-slate-400"
                  />
                  <button
                    onClick={() => handleQuickAdd(col.id)}
                    disabled={!quickAddText[col.id]?.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icons.Plus className="w-4 h-4" />
                  </button>
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
