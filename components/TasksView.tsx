import React, { useState } from 'react';
import { Memo } from '../types';
import { Icons } from '../constants';
import MemoList from './MemoList';
import KanbanView from './KanbanView';
import CalendarView from './CalendarView';
import MemoEditor from './MemoEditor';

interface TasksViewProps {
  memos: Memo[];
  searchQuery: string;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onAdd: (memo: Partial<Memo>) => void;
}

type ViewType = 'today' | 'board' | 'upcoming';

const TasksView: React.FC<TasksViewProps> = ({ memos, searchQuery, onUpdate, onDelete, onAdd }) => {
  const [currentView, setCurrentView] = useState<ViewType>('today');

  // Ensure we only show Todos in this view
  const todoMemos = memos.filter(m => m.type === 'todo');

  return (
    <div className="space-y-6">
      {/* View Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setCurrentView('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentView === 'today'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setCurrentView('board')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentView === 'board'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setCurrentView('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentView === 'upcoming'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {currentView === 'today' && (
          <div className="space-y-6">
             <MemoEditor onSave={onAdd} defaultType="todo" />
             <MemoList 
                memos={todoMemos} 
                searchQuery={searchQuery}
                onUpdate={onUpdate}
                onDelete={onDelete}
             />
          </div>
        )}
        {currentView === 'board' && (
          <KanbanView 
            memos={todoMemos} 
            onUpdate={onUpdate} 
            onDelete={onDelete}
            onAdd={onAdd}
          />
        )}
        {currentView === 'upcoming' && (
          <CalendarView memos={todoMemos} />
        )}
      </div>
    </div>
  );
};

export default TasksView;
