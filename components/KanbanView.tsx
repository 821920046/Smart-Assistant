import React, { useState } from 'react';
import { Memo, Priority } from '../types';
import KanbanColumn from './KanbanColumn';

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

  const getColumnMemos = (columnId: string) => {
    if (columnId === 'completed') {
      return memos.filter(m => !!m.completedAt);
    }
    return memos.filter(m => !m.completedAt && (m.priority || 'normal') === columnId);
  };

  const handleDragStart = (e: React.DragEvent, memoId: string) => {
    e.dataTransfer.setData('text/plain', memoId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('scale-[1.02]', 'shadow-lg', 'ring-2', 'ring-indigo-400', 'bg-white', 'dark:bg-slate-800', 'z-50', 'rotate-1', 'cursor-grabbing');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.classList.remove('scale-[1.02]', 'shadow-lg', 'ring-2', 'ring-indigo-400', 'bg-white', 'dark:bg-slate-800', 'z-50', 'rotate-1', 'cursor-grabbing');
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
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            count={colMemos.length}
            memos={colMemos}
            isDragOver={isDragOver}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAdd={!isCompletedCol ? (text, priority) => onAdd({
              content: text,
              priority,
              type: 'todo'
            }) : undefined}
          />
        );
      })}
    </div>
  );
};

export default KanbanView;
