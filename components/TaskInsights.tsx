
import React from 'react';
import { Memo } from '../types.js';

interface TaskInsightsProps {
  memos: Memo[];
}

const TaskInsights: React.FC<TaskInsightsProps> = ({ memos }) => {
  const activeMemos = memos.filter(m => !m.isDeleted && !m.isArchived);
  const totalTodos = activeMemos.reduce((acc, m) => acc + (m.todos?.length || 0), 0);
  const completedTodos = activeMemos.reduce((acc, m) => acc + (m.todos?.filter(t => t.completed).length || 0), 0);

  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  const priorities = {
    important: activeMemos.filter(m => m.priority === 'important').length,
    normal: activeMemos.filter(m => m.priority === 'normal').length,
    secondary: activeMemos.filter(m => m.priority === 'secondary').length,
  };

  const totalMemos = activeMemos.length || 1; // avoid div by zero

  return (
    <div className="space-y-6 px-1">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">任务完成率</span>
          <span className="text-[10px] font-black text-indigo-500">{completionRate}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">优先级分布</span>
        <div className="flex h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-700"
            style={{ width: `${(priorities.important / totalMemos) * 100}%` }}
            title={`重要: ${priorities.important}`}
          />
          <div
            className="h-full bg-indigo-500 transition-all duration-700"
            style={{ width: `${(priorities.normal / totalMemos) * 100}%` }}
            title={`一般: ${priorities.normal}`}
          />
          <div
            className="h-full bg-slate-400 transition-all duration-700"
            style={{ width: `${(priorities.secondary / totalMemos) * 100}%` }}
            title={`次要: ${priorities.secondary}`}
          />
        </div>
        <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400 uppercase tracking-tight opacity-70">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> 重要</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> 一般</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> 次要</div>
        </div>
      </div>
    </div>
  );
};

export default TaskInsights;
