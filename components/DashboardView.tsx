import React from 'react';
import { Memo } from '../types';
import { Icons } from '../constants';
import MemoCard from './MemoCard';

interface DashboardViewProps {
  memos: Memo[];
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onAdd: (memo: Partial<Memo>) => void;
  onNavigate: (view: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ memos, onUpdate, onDelete, onAdd, onNavigate }) => {
  // Filter for Today's Todos (Assuming non-completed todos)
  // In a real app, this would filter by dueDate === today
  const todayTodos = memos
    .filter(m => m.type === 'todo' && !m.completedAt && !m.isArchived && !m.isDeleted)
    .slice(0, 5);

  // Filter for Ongoing/Important Tasks
  const ongoingTasks = memos
    .filter(m => m.priority === 'important' && !m.completedAt && !m.isArchived && !m.isDeleted)
    .slice(0, 2);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
            {getGreeting()}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            You have {todayTodos.length} tasks for today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Todos */}
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Icons.CheckSquare className="w-4 h-4 text-indigo-500" />
                    Today's Tasks
                </h3>
                <button 
                    onClick={() => onNavigate('tasks')}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                    View All
                </button>
            </div>
            
            {todayTodos.length > 0 ? (
                <div className="space-y-3">
                    {todayTodos.map(memo => (
                        <MemoCard 
                            key={memo.id} 
                            memo={memo} 
                            onUpdate={onUpdate} 
                            onDelete={onDelete} 
                            compact 
                        />
                    ))}
                </div>
            ) : (
                <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-center">
                    <Icons.CheckCircle className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No tasks for today</p>
                    <button 
                        onClick={() => onNavigate('tasks')}
                        className="mt-2 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:underline"
                    >
                        Add a task
                    </button>
                </div>
            )}
        </div>

        {/* Ongoing / Important */}
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Icons.Star className="w-4 h-4 text-amber-500" filled />
                    Important & Ongoing
                </h3>
            </div>
            
            {ongoingTasks.length > 0 ? (
                <div className="space-y-3">
                    {ongoingTasks.map(memo => (
                        <MemoCard 
                            key={memo.id} 
                            memo={memo} 
                            onUpdate={onUpdate} 
                            onDelete={onDelete} 
                            compact 
                        />
                    ))}
                </div>
            ) : (
                <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-center h-[200px]">
                    <p className="text-sm">No urgent tasks</p>
                    <p className="text-xs opacity-70 mt-1">You're doing great!</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
