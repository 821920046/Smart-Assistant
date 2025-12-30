import React, { useState } from 'react';
import { Memo, Priority } from '../../types';
import MemoCard from './MemoCard';
import { Icons } from '../../constants';

interface KanbanColumnProps {
  id: string;
  label: string;
  count: number;
  memos: Memo[];
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onDragStart: (e: React.DragEvent, memoId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onAdd?: (text: string, priority: Priority) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  label,
  count,
  memos,
  isDragOver,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onUpdate,
  onDelete,
  onAdd
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newMemoText, setNewMemoText] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemoText.trim() && onAdd) {
      onAdd(newMemoText.trim(), id as Priority);
      setNewMemoText('');
      setIsAdding(false);
    }
  };

  return (
    <div
      className={`flex-shrink-0 w-80 flex flex-col max-h-full rounded-2xl transition-colors duration-200 ${
        isDragOver ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-400 ring-inset' : 'bg-slate-50/50 dark:bg-slate-900/20'
      }`}
      onDragOver={(e) => onDragOver(e, id)}
      onDrop={(e) => onDrop(e, id)}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between sticky top-0 bg-inherit z-10 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">{label}</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
            {count}
          </span>
        </div>
        {onAdd && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <Icons.Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 min-h-[150px]">
        {isAdding && (
          <form onSubmit={handleAddSubmit} className="mb-4">
            <textarea
              autoFocus
              value={newMemoText}
              onChange={(e) => setNewMemoText(e.target.value)}
              placeholder="Type a new task..."
              className="w-full p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddSubmit(e);
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newMemoText.trim()}
                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </form>
        )}

        {memos.map((memo) => (
          <div
            key={memo.id}
            draggable
            onDragStart={(e) => onDragStart(e, memo.id)}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            <MemoCard memo={memo} onUpdate={onUpdate} onDelete={onDelete} compact />
          </div>
        ))}
        
        {memos.length === 0 && !isAdding && (
           <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-xs font-medium">No tasks</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
