
import React, { useState } from 'react';
import { Memo, Priority } from '../types.js';
import { Icons } from '../constants.js';

interface MemoCardProps {
  memo: Memo;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

const PriorityTag = ({ priority }: { priority: Priority }) => {
  const styles = {
    important: 'bg-rose-50 text-rose-600 border-rose-100',
    normal: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    secondary: 'bg-slate-100 text-slate-400 border-slate-200'
  };
  const labels = { important: '重要', normal: '一般', secondary: '次要' };
  return (
    <span className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

const MemoCard: React.FC<MemoCardProps> = ({ memo, onUpdate, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleToggleTodo = (todoId: string) => {
    const updatedTodos = memo.todos?.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    const anyDone = updatedTodos?.some(t => t.completed);
    
    if (anyDone) {
      // Immediate auto-deletion as per user request
      setIsDeleting(true);
      setTimeout(() => onDelete(memo.id), 400);
    } else {
      onUpdate({ ...memo, todos: updatedTodos });
    }
  };

  const getRepeatLabel = () => {
    if (!memo.reminderRepeat || memo.reminderRepeat === 'none') return '单次';
    if (memo.reminderRepeat === 'daily') return '每天';
    return '每周';
  };

  return (
    <div className={`memo-card group relative rounded-[42px] overflow-hidden transition-all duration-500 p-8 md:p-12 border-l-[8px] ${
      isDeleting ? 'opacity-0 scale-95 translate-x-10' : 'opacity-100 scale-100'
    } ${
      memo.priority === 'important' ? 'border-l-rose-500' : memo.priority === 'normal' ? 'border-l-indigo-500' : 'border-l-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
           <PriorityTag priority={memo.priority || 'normal'} />
           {memo.reminderAt && (
             <div className="flex items-center gap-2 text-indigo-500 text-[10px] font-black uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
               <Icons.Bell />
               <span>{getRepeatLabel()} 提醒</span>
             </div>
           )}
        </div>
        <button onClick={() => onDelete(memo.id)} className="p-3 text-slate-300 hover:text-rose-500 transition-colors active:scale-90"><Icons.Trash /></button>
      </div>

      <div className="space-y-6">
        <p className="text-slate-800 font-black text-xl md:text-3xl leading-tight whitespace-pre-wrap tracking-tight">
          {memo.content}
        </p>

        {memo.todos && memo.todos.length > 0 && (
          <div className="space-y-4 pt-4">
            {memo.todos.map(todo => (
              <div 
                key={todo.id} 
                className="flex items-center gap-5 p-6 rounded-[28px] border bg-slate-50/30 border-slate-50 transition-all cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-slate-100 group/todo"
                onClick={() => handleToggleTodo(todo.id)}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-3 transition-all ${
                  todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 group-hover/todo:border-indigo-400'
                }`}>
                  {todo.completed && <Icons.CheckCircle />}
                </div>
                <span className={`flex-1 text-base md:text-lg font-bold transition-all ${
                  todo.completed ? 'line-through text-slate-300' : 'text-slate-700'
                }`}>
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {memo.reminderAt && (
        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <Icons.Clock />
          下次提醒: {new Date(memo.reminderAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default MemoCard;
