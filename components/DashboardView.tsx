import React from 'react';
import { Memo } from '../types';
import { Icons } from '../constants';
import MemoCard from './MemoCard';
import { Gauge } from './Gauge';

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
    .filter(m => m.type === 'todo' && !m.isArchived && !m.isDeleted);
    
  const todayCompleted = todayTodos.filter(m => m.completedAt).length;
  const todayTotal = todayTodos.length;

  // Filter for Ongoing/Important Tasks
  const importantTasks = memos
    .filter(m => m.priority === 'important' && !m.completedAt && !m.isArchived && !m.isDeleted);
    
  const importantTotal = importantTasks.length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{getGreeting()}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            You have {todayTodos.filter(t => !t.completedAt).length} tasks for today.
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('tasks')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200 dark:shadow-none"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
          <button 
            onClick={() => onNavigate('notes')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
          >
            <Icons.FileText className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* 仪表盘 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Gauge 
          title="Today's Tasks" 
          value={todayCompleted} 
          total={todayTotal} 
          subtitle={
            todayTotal === 0 
              ? "You're all caught up!" 
              : "Keep going 💪"
          }
          color="#6366F1" 
          emptyText="All done" 
        />

        <Gauge 
          title="Important & Ongoing" 
          value={importantTotal} 
          total={importantTotal || 1} 
          subtitle={
            importantTotal === 0 
              ? "Enjoy your free time 👍" 
              : "Needs attention"
          }
          color="#22C55E" 
          emptyText="No urgent tasks" 
        />
      </div>
    </div>
  );
};

export default DashboardView;
