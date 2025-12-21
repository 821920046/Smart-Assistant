import React from 'react';
import { Memo, Priority } from '../types.js';
import MemoCard from './MemoCard.js';

interface KanbanViewProps {
  memos: Memo[];
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({ memos, onUpdate, onDelete }) => {
  const columns = [
    { id: 'important', label: 'Important', color: 'bg-rose-50 border-rose-100', titleColor: 'text-rose-700' },
    { id: 'normal', label: 'Normal', color: 'bg-blue-50 border-blue-100', titleColor: 'text-blue-700' },
    { id: 'secondary', label: 'Low Priority', color: 'bg-slate-50 border-slate-100', titleColor: 'text-slate-700' },
    { id: 'completed', label: 'Completed', color: 'bg-emerald-50 border-emerald-100', titleColor: 'text-emerald-700' },
  ];

  const getColumnMemos = (columnId: string) => {
    if (columnId === 'completed') {
      return memos.filter(m => m.todos ? m.todos.every(t => t.completed) : false); 
      // Note: The logic for 'completed' memo is slightly ambiguous in current type. 
      // Usually Memo doesn't have a global 'completed' flag except 'completedAt'.
      // Let's use 'completedAt' or check if it's archived/done.
      // Actually, let's just use the Priority columns for active tasks, and maybe 'completed' is separate.
      // Re-reading types.ts: export interface Memo { ... completedAt?: number; ... }
      return memos.filter(m => !!m.completedAt);
    }
    return memos.filter(m => !m.completedAt && m.priority === columnId);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-8 h-[calc(100vh-140px)] items-start">
      {columns.map(col => {
        const colMemos = getColumnMemos(col.id);
        return (
          <div 
            key={col.id} 
            className={`min-w-[300px] w-[320px] shrink-0 rounded-2xl border ${col.color} p-4 flex flex-col h-full`}
          >
            <div className={`flex items-center justify-between mb-4 font-bold ${col.titleColor}`}>
              <span>{col.label}</span>
              <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">
                {colMemos.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
              {colMemos.map(memo => (
                <div key={memo.id} className="scale-95 origin-top hover:scale-100 transition-transform">
                  <MemoCard 
                    memo={memo} 
                    onUpdate={onUpdate} 
                    onDelete={onDelete} 
                    compact 
                  />
                </div>
              ))}
              {colMemos.length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanView;
