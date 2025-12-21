import React, { useState } from 'react';
import { Memo, Priority } from '../types.js';
import { Icons } from '../constants.js';
import { generateSpeech } from '../services/gemini.js';

interface MemoCardProps {
  memo: Memo;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

const PriorityTag = ({ priority }: { priority: Priority }) => {
  const styles = {
    important: 'bg-rose-100 text-rose-700',
    normal: 'bg-blue-100 text-blue-700',
    secondary: 'bg-slate-100 text-slate-500'
  };
  const labels = { important: 'Important', normal: 'Normal', secondary: 'Low' };
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

const MemoCard: React.FC<MemoCardProps> = ({ memo, onUpdate, onDelete }) => {
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
    <div className={`memo-card group relative p-6 ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PriorityTag priority={memo.priority || 'normal'} />
          {memo.reminderAt && (
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium bg-slate-50 px-2 py-1 rounded-lg">
              <Icons.Clock className="w-3 h-3" />
              <span>{new Date(memo.reminderAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              {memo.reminderRepeat && memo.reminderRepeat !== 'none' && (
                <span className="text-[9px] px-1 bg-slate-200 rounded text-slate-600">{getRepeatLabel()}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handlePlayTTS} 
            disabled={isPlaying}
            className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isPlaying ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`}
            title="Read Aloud"
          >
            <Icons.Volume />
          </button>
          <button 
            onClick={() => {
              setIsDeleting(true);
              setTimeout(() => onDelete(memo.id), 300);
            }}
            className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
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
                    : 'bg-white border-slate-300 group-hover/item:border-blue-400'
                }`}>
                  {todo.completed && <Icons.Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={`text-sm leading-relaxed transition-all ${
                  todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}>
                  {todo.text}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{memo.content}</p>
          </div>
        )}
        
        {memo.sketchData && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
             <img src={memo.sketchData} alt="Sketch" className="w-full h-auto" />
          </div>
        )}
      </div>

      {/* Footer Tags */}
      {memo.tags && memo.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-50">
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

export default MemoCard;
