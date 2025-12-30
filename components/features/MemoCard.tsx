import React, { useState, useEffect } from 'react';
import { Memo, Priority } from '../../types';
import { Icons } from '../../constants';
import { generateSpeech } from '../../services/gemini';
import SimpleMarkdown, { parseInline } from '../ui/SimpleMarkdown';
import MemoEditor from './MemoEditor';
import { storage } from '../../services/storage';

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
    <span className={`px - 2.5 py - 1 rounded - lg text - [11px] font - bold ${styles[priority]} `}>
      {labels[priority]}
    </span>
  );
};

const MemoCard: React.FC<MemoCardProps> = ({ memo, onUpdate, onDelete, compact }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let currentUrl: string | null = null;
    let isCancelled = false;

    const loadAudio = async () => {
      const id = memo.audio?.id;
      if (!id) {
        setAudioUrl(null);
        return;
      }

      try {
        const blob = await storage.getAudio(id);
        if (blob && !isCancelled) {
          const url = URL.createObjectURL(blob);
          currentUrl = url;
          setAudioUrl(url);
        } else if (!blob) {
          console.warn('Audio blob not found for ID:', id);
          setAudioUrl(null);
        }
      } catch (error) {
        console.error('Failed to load audio:', error);
        setAudioUrl(null);
      }
    };

    loadAudio();

    return () => {
      isCancelled = true;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [memo.audio?.id, memo.id]); // Added memo.id as a fallback dependency

  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} `;
  };

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

  const handleToggleMemo = () => {
    onUpdate({
      ...memo,
      isArchived: !memo.isArchived,
      completedAt: !memo.isArchived ? Date.now() : undefined
    });
  };

  const hasTodos = memo.todos && memo.todos.length > 0;

  if (isEditing) {
    return (
      <div className="mb-4">
        <MemoEditor
          initialMemo={memo}
          onSave={(updated) => {
            onUpdate(updated as Memo);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className={`memo - card group relative bg - white dark: bg - slate - 800 transition - all duration - 200 text - left ${compact
        ? 'p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-[1px]'
        : hasTodos
          ? 'p-6 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md w-full'
          : 'p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md w-full max-w-2xl mx-auto'
      } ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} `}>

      {/* Header - Non-compact only */}
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
      <div className={compact ? "" : "space-y-4"}>
        {/* Main Content Title Style */}
        <div className="flex gap-3 items-start group/content cursor-pointer" onClick={() => onUpdate(memo)}>
          {/* Checkbox for Card */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMemo();
            }}
            className={`mt - 1 flex - shrink - 0 transition - colors duration - 200 ${memo.isArchived
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400'
              } `}
          >
            {memo.isArchived ? (
              <Icons.CheckSquare className="w-5 h-5" />
            ) : (
              <div className="w-5 h-5 border-2 border-current rounded-md" />
            )}
          </button>

          <div className="flex-1 min-w-0 text-left">
            {/* Title */}
            <div className={`break-words ${compact ? 'mb-1' : 'mb-2'} ${compact
                ? 'text-sm font-semibold text-slate-900 dark:text-slate-100'
                : hasTodos
                  ? 'text-xl font-bold leading-normal text-slate-900 dark:text-slate-100'
                  : 'text-lg font-semibold text-slate-900 dark:text-slate-100'
              } ${memo.isArchived ? 'line-through opacity-50' : ''} `}>
              {parseInline(memo.title || (memo.content && memo.content.split('\n')[0]) || '')}
            </div>

            {/* Description */}
            {(memo.title || (memo.content && memo.content.includes('\n'))) && (
              <div className={`line - clamp - 3 opacity - 90 break-words ${compact ? 'mb-3' : 'mt-1'} `}>
                <SimpleMarkdown
                  content={memo.title ? (memo.content || '') : (memo.content ? memo.content.split('\n').slice(1).join('\n') : '')}
                  className={`${compact
                      ? 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed'
                      : 'text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-4'
                    } ${memo.isArchived ? 'opacity-50' : ''} `}
                />
              </div>
            )}
          </div>
        </div>

        {/* Audio Player */}
        {memo.audio && audioUrl && (
          <div className={`flex items - center gap - 3 mt - 3 p - 2 bg - slate - 50 dark: bg - slate - 700 / 50 rounded - lg border border - slate - 100 dark: border - slate - 700 ${compact ? 'w-full' : 'w-fit'} `} onClick={(e) => e.stopPropagation()}>
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <Icons.Mic className="w-4 h-4" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audio Note</span>
                <span className="text-[10px] font-mono text-slate-400">{formatTime(memo.audio.duration)}</span>
              </div>
              <audio src={audioUrl} controls className="h-6 w-full max-w-[200px] mt-1" />
            </div>
          </div>
        )}

        {/* Todos */}
        {memo.todos && memo.todos.length > 0 && (
          <div className={`space - y - 2.5 ${compact ? 'mb-3' : 'pt-2'} `}>
            {memo.todos.slice(0, compact ? 3 : undefined).map(todo => {
              const [title, ...desc] = todo.text.split('\n');
              return (
                <div key={todo.id} className={`flex items - start gap - 3 group / todo transition - all duration - 200 ${compact
                    ? 'p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    : 'p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:shadow-sm'
                  } `}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleTodo(todo.id); }}
                    className={`mt - 1 w - 4 h - 4 rounded border flex items - center justify - center transition - all ${todo.completed
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'border-slate-300 hover:border-indigo-500 bg-white dark:bg-slate-800 dark:border-slate-600'
                      } `}
                  >
                    {todo.completed && <Icons.Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text - sm font - medium leading - relaxed break-words ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-200'} `}>
                      {title}
                    </p>
                    {desc.length > 0 && !todo.completed && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {desc.join(' ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {compact && memo.todos.length > 3 && (
              <p className="text-[10px] text-slate-400 pl-7">... {memo.todos.length - 3} more</p>
            )}
          </div>
        )}

        {/* Compact Footer Structure (User Requested) */}
        {compact && (
          <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-2">
            <span className={`px - 2 py - 0.5 rounded - md text - [10px] font - medium ${memo.priority === 'important' ? 'bg-rose-50 text-rose-600' :
                memo.priority === 'secondary' ? 'bg-slate-100 text-slate-500' :
                  'bg-indigo-50 text-indigo-600'
              } `}>
              {memo.priority === 'important' ? 'High' : memo.priority === 'secondary' ? 'Low' : 'Normal'}
            </span>
            <span>{new Date(memo.createdAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* Footer Actions (Only show on hover or non-compact) */}
      {!compact && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{new Date(memo.createdAt).toLocaleDateString()}</span>
            {memo.reminderAt && (
              <div className="flex items-center gap-1 text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                <Icons.Bell className="w-3 h-3" />
                <span>{new Date(memo.reminderAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!memo.isArchived && (
              <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="编辑">
                <Icons.Edit className="w-4 h-4" />
              </button>
            )}
            <button onClick={handlePlayTTS} className={`p - 2 hover: bg - slate - 100 dark: hover: bg - slate - 700 rounded - lg transition - colors ${isPlaying ? 'text-blue-500 animate-pulse' : 'text-slate-400 hover:text-blue-600'} `}>
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
};

export default React.memo(MemoCard);
