import React, { useState } from 'react';
import { Memo, Priority } from '../types.js';
import { Icons } from '../constants.js';
import { generateSpeech } from '../services/gemini.js';
import SimpleMarkdown from './SimpleMarkdown.js';

interface MemoCardProps {
  memo: Memo;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
  compact?: boolean;
}

const PriorityTag = ({ priority }: { priority: Priority }) => {
  const styles = {
    important: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    secondary: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  };
  const labels = { important: 'Important', normal: 'Normal', secondary: 'Low' };
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

const MemoCard: React.FC<MemoCardProps> = ({ memo, onUpdate, onDelete, compact }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleToggleTodo = (todoId: string) => {
    const updatedTodos = memo.todos?.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    
    // Check if all tasks are completed
    const allCompleted = updatedTodos?.every(t => t.completed);

    if (allCompleted && updatedTodos && updatedTodos.length > 0) {
      // All tasks completed, move to history
      onUpdate({
        ...memo,
        todos: updatedTodos,
        isArchived: true,
        completedAt: Date.now()
      });
    } else {
      onUpdate({ ...memo, todos: updatedTodos });
    }
  };

  const handlePlayTTS = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64Audio = await generateSpeech(memo.content);
      if (!base64Audio) return;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const dataInt16 = new Int16Array(bytes.buffer);
      const audioBuffer = audioContext.createBuffer(1, dataInt16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        setIsPlaying(false);
        audioContext.close();
      };
      source.start();
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  };

  const getRepeatLabel = () => {
    if (!memo.reminderRepeat || memo.reminderRepeat === 'none') return 'Once';
    if (memo.reminderRepeat === 'daily') return 'Daily';
    return 'Weekly';
  };

  return (
    <div className={`memo-card group relative bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all duration-200 ${compact ? 'p-4' : 'p-6'} ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PriorityTag priority={memo.priority || 'normal'} />
            {memo.tags?.map(tag => (
                <span key={tag} className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-md">
                    #{tag}
                </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
         {/* Main Content Title Style */}
         <div className="cursor-pointer" onClick={() => onUpdate(memo)}>
            <SimpleMarkdown 
                content={memo.content} 
                className={`${compact ? 'text-base font-semibold leading-snug' : 'text-lg font-bold leading-relaxed'} text-slate-800 dark:text-slate-100 line-clamp-3`} 
            />
         </div>
         
         {/* Meta Info Line (Compact Mode) */}
         {compact && (
             <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-50 dark:border-slate-700/30">
                 <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${
                         memo.priority === 'important' ? 'bg-rose-500' : 
                         memo.priority === 'secondary' ? 'bg-slate-300' : 'bg-blue-500'
                     }`} />
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                         {memo.priority || 'NORMAL'}
                     </span>
                 </div>
                 {memo.tags && memo.tags.length > 0 && (
                     <div className="flex gap-1">
                         {memo.tags.slice(0, 2).map(tag => (
                             <span key={tag} className="text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                 #{tag}
                             </span>
                         ))}
                         {memo.tags.length > 2 && <span className="text-[9px] text-slate-400">+{memo.tags.length - 2}</span>}
                     </div>
                 )}
             </div>
         )}

         {/* Todos */}
         {memo.todos && memo.todos.length > 0 && (
             <div className="space-y-1.5 pt-2">
                 {memo.todos.slice(0, compact ? 3 : undefined).map(todo => (
                     <div key={todo.id} className="flex items-start gap-2 group/todo">
                         <button 
                             onClick={(e) => { e.stopPropagation(); handleToggleTodo(todo.id); }}
                             className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                 todo.completed 
                                 ? 'bg-blue-500 border-blue-500 text-white' 
                                 : 'border-slate-300 hover:border-blue-400 bg-white dark:bg-slate-700 dark:border-slate-600'
                             }`}
                         >
                             {todo.completed && <Icons.Check className="w-3 h-3" />}
                         </button>
                         <span className={`text-sm flex-1 break-words ${todo.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700 dark:text-slate-300'}`}>
                             {todo.text}
                         </span>
                     </div>
                 ))}
                 {compact && memo.todos.length > 3 && (
                     <p className="text-xs text-slate-400 pl-6">... {memo.todos.length - 3} more items</p>
                 )}
             </div>
         )}
      </div>

      {/* Footer Actions (Only show on hover or non-compact) */}
      {!compact && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
             <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{new Date(memo.createdAt).toLocaleDateString()}</span>
                {memo.reminderTime && (
                    <div className="flex items-center gap-1 text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                        <Icons.Bell className="w-3 h-3" />
                        <span>{new Date(memo.reminderTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                )}
             </div>
             
             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onUpdate(memo)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                    <Icons.Edit className="w-4 h-4" />
                </button>
                <button onClick={handlePlayTTS} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${isPlaying ? 'text-blue-500 animate-pulse' : 'text-slate-400 hover:text-blue-600'}`}>
                     {isPlaying ? <Icons.Volume2 className="w-4 h-4" /> : <Icons.Volume1 className="w-4 h-4" />}
                </button>
                <button onClick={() => {
                    if (confirm('Delete this memo?')) {
                        setIsDeleting(true);
                        setTimeout(() => onDelete(memo.id), 200);
                    }
                }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                    <Icons.Trash className="w-4 h-4" />
                </button>
             </div>
        </div>
      )}
    </div>
  );
};          {memo.category && (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
              {memo.category}
            </span>
          )}
          {memo.reminderAt && !compact && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg">
              <Icons.Clock className="w-3 h-3" />
              <span>{new Date(memo.reminderAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              {memo.reminderRepeat && memo.reminderRepeat !== 'none' && (
                <span className="text-[9px] px-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">{getRepeatLabel()}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handlePlayTTS} 
            disabled={isPlaying}
            className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isPlaying ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`}
            title="Read Aloud"
          >
            <Icons.Volume />
          </button>
          <button 
            onClick={() => {
              setIsDeleting(true);
              setTimeout(() => onDelete(memo.id), 300);
            }}
            className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
            title="Delete"
          >
            <Icons.Trash />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        {memo.todos && memo.todos.length > 0 ? (
          <ul className="space-y-2">
            {memo.todos.map(todo => (
              <li 
                key={todo.id} 
                className="flex items-start gap-3 group/item cursor-pointer"
                onClick={() => handleToggleTodo(todo.id)}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  todo.completed 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover/item:border-blue-400'
                }`}>
                  {todo.completed && <Icons.Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={`text-sm leading-relaxed transition-all ${
                  todo.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {todo.text}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="prose prose-sm max-w-none">
            <SimpleMarkdown content={memo.content} />
          </div>
        )}
        
        {memo.sketchData && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
             <img src={memo.sketchData} alt="Sketch" className="w-full h-auto" />
          </div>
        )}
      </div>

      {/* Footer Tags */}
      {memo.tags && memo.tags.length > 0 && !compact && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
          {memo.tags.map(tag => (
            <span key={tag} className="text-xs text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(MemoCard);
