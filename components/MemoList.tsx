import React from 'react';
import { Memo } from '../types';
import { Icons } from '../constants';
import MemoCard from './MemoCard';

interface MemoListProps {
  memos: Memo[];
  searchQuery: string;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
}

const MemoList: React.FC<MemoListProps> = ({ memos, searchQuery, onUpdate, onDelete }) => {
  return (
    <div className="grid grid-cols-1 gap-4 pb-24">
      {memos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-60">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400 dark:text-slate-500 shadow-inner">
            <Icons.List className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No tasks found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs text-center">
            {searchQuery ? `No matches for "${searchQuery}"` : "You're all caught up! Add a new task to get started."}
          </p>
        </div>
      ) : (
        memos.map(memo => (
          <MemoCard
            key={memo.id}
            memo={memo}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
};

export default MemoList;
