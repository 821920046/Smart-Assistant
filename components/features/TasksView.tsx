import React, { useState } from 'react';
import { Memo } from '../../types';
import MemoList from './MemoList';
import KanbanView from './KanbanView';
import MemoEditor from './MemoEditor';
import { useStore } from '../../services/store';

interface TasksViewProps {
  memos: Memo[];
  title?: string;
  onClearAll?: () => void;
  defaultType?: 'todo' | 'memo' | 'sketch';
}

type ViewType = 'today' | 'board';

const TasksView: React.FC<TasksViewProps> = ({
  memos,
  title,
  onClearAll,
  defaultType = 'todo'
}) => {
  const { searchQuery, addMemo } = useStore();
  const [currentView, setCurrentView] = useState<ViewType>('today');

  return (
    <div className="space-y-6">
      {/* View Switcher/Header */}
      <div className="flex items-center justify-between">
        {title && <h2 className="text-xl font-bold dark:text-white">{title}</h2>}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setCurrentView('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'today'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
          >
            Today
          </button>
          <button
            onClick={() => setCurrentView('board')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'board'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
          >
            Board
          </button>
        </div>

        {onClearAll && memos.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {currentView === 'today' && (
          <div className="space-y-6">
            <MemoEditor onSave={addMemo} defaultType={defaultType} />
            <MemoList
              memos={memos}
              searchQuery={searchQuery}
            />
          </div>
        )}
        {currentView === 'board' && (
          <KanbanView />
        )}
      </div>
    </div>
  );
};

export default TasksView;
