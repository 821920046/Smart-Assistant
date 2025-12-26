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
      // User request: Enhanced drag feedback
      e.currentTarget.classList.add('scale-[1.02]', 'shadow-lg', 'ring-2', 'ring-indigo-400', 'bg-white', 'dark:bg-slate-800', 'z-50', 'rotate-1', 'cursor-grabbing');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.classList.remove('scale-[1.02]', 'shadow-lg', 'ring-2', 'ring-indigo-400', 'bg-white', 'dark:bg-slate-800', 'z-50', 'rotate-1', 'cursor-grabbing');
        // Add drop animation class
        e.currentTarget.classList.add('transition-transform', 'duration-300');
        setTimeout(() => e.currentTarget.classList.remove('transition-transform', 'duration-300'), 300);
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
            className={`w-[320px] flex-shrink-0 rounded-2xl border flex flex-col h-full snap-center transition-all duration-200 
                ${isDragOver 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 ring-4 ring-indigo-200 dark:ring-indigo-900/30' 
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                } p-3`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  {col.label}
                </h3>
                <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                  {colMemos.length}
                </span>
              </div>
              
              {!isCompletedCol && (
                 <button 
                    onClick={() => {
                        const input = document.getElementById(`quick-add-${col.id}`);
                        input?.focus();
                    }}
                    className="px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                 >
                   + New
                 </button>
               )}
            </div>
            
            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-2">
              {colMemos.map(memo => (
                <div 
                    key={memo.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, memo.id)}
                    onDragEnd={handleDragEnd}
                    className="transform transition-all duration-200 cursor-move active:cursor-grabbing touch-manipulation select-none"
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
                <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1 opacity-60">
                    <span className="text-xs font-medium">No tasks</span>
                </div>
              )}
            </div>

            {/* Quick Add Footer (Simplified) */}
            {!isCompletedCol && (
              <div className="mt-2 relative group">
                <input
                    id={`quick-add-${col.id}`}
                    type="text"
                    value={quickAddText[col.id] || ''}
                    onChange={(e) => setQuickAddText(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={(e) => {
                         if (e.key === 'Enter') handleQuickAdd(col.id);
                    }}
                    placeholder="Add a card..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm shadow-sm dark:text-white placeholder-slate-400 transition-all outline-none"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KanbanView;
