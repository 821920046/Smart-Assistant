import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Memo, Priority } from '../../types';
import { Icons } from '../../constants';
import { generateSpeech } from '../../services/gemini';
import SimpleMarkdown, { parseInline } from '../ui/SimpleMarkdown';
import MemoEditor from './MemoEditor';
import { storage } from '../../services/storage';
import { useStore } from '../../services/store';

interface MemoCardProps {
  memo: Memo;
  compact?: boolean;
  onTagClick?: (tag: string) => void;
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

const MemoCard: React.FC<MemoCardProps> = ({ memo, compact }) => {
  const { updateMemo, deleteMemo } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
        }
      } catch (error) {
        console.error('Failed to load audio:', error);
        setAudioUrl(null);
      }
    };

    loadAudio();

    return () => {
      isCancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [memo.audio?.id, memo.id]);

  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTodo = (todoId: string) => {
    const updatedTodos = memo.todos?.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    const allCompleted = updatedTodos?.every(t => t.completed);

    if (allCompleted && updatedTodos && updatedTodos.length > 0) {
      updateMemo({
        ...memo,
        todos: updatedTodos,
        isArchived: true,
        completedAt: Date.now()
      });
    } else {
      updateMemo({ ...memo, todos: updatedTodos });
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

  const handleToggleMemo = () => {
    updateMemo({
      ...memo,
      isArchived: !memo.isArchived,
      completedAt: !memo.isArchived ? Date.now() : undefined
    });
  };

  const hasTodos = memo.todos && memo.todos.length > 0;

  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-4"
      >
        <MemoEditor
          initialMemo={memo}
          onSave={(updated) => {
            updateMemo(updated as Memo);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      whileHover={{ y: -2 }}
      onClick={() => {
        if (!isEditing) setIsDetailOpen(true);
      }}
      className={`memo-card group relative bg-white dark:bg-slate-800 transition-shadow duration-200 text-left ${compact
        ? 'p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm cursor-pointer hover:shadow-md'
        : hasTodos
          ? 'p-6 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md w-full cursor-pointer'
          : 'p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md w-full max-w-2xl mx-auto cursor-pointer'
        }`}
    >
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
      <div className={compact ? "" : "space-y-4"}>
        <div className="flex gap-3 items-start group/content">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMemo();
            }}
            className={`mt-1 flex-shrink-0 transition-colors duration-200 ${memo.isArchived
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400'
              }`}
          >
            {memo.isArchived ? (
              <Icons.CheckSquare className="w-5 h-5" />
            ) : (
              <div className="w-5 h-5 border-2 border-current rounded-md" />
            )}
          </button>

          <div className="flex-1 min-w-0 text-left">
            <div className={`break-words ${compact ? 'mb-1' : 'mb-2'} ${compact
              ? 'text-sm font-semibold text-slate-900 dark:text-slate-100'
              : hasTodos
                ? 'text-xl font-bold leading-normal text-slate-900 dark:text-slate-100'
                : 'text-lg font-semibold text-slate-900 dark:text-slate-100'
              } ${memo.isArchived ? 'line-through opacity-50' : ''}`}>
              {parseInline(memo.title || (memo.content && memo.content.split('\n')[0]) || '')}
            </div>

            {(memo.title || (memo.content && memo.content.includes('\n'))) && (
              <div className="mt-1">
                <div className={`line-clamp-3 opacity-90 break-words ${compact ? 'mb-3' : ''}`}>
                  <SimpleMarkdown
                    content={memo.title ? (memo.content || '') : (memo.content ? memo.content.split('\n').slice(1).join('\n') : '')}
                    className={`${compact
                      ? 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed'
                      : 'text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-4'
                      } ${memo.isArchived ? 'opacity-50' : ''}`}
                  />
                </div>
                {!compact && !memo.isArchived && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-widest group-hover/content:text-indigo-600 transition-colors">
                    <Icons.Maximize2 className="w-3 h-3" />
                    <span>Read Full content</span>
                  </div>
                )}
              </div>
            )}

            {memo.sketchData && (
              <div className={`relative mt-2 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/50 ${compact ? 'w-full h-24' : 'w-full max-w-sm h-48'}`}>
                <img src={memo.sketchData} alt="Sketch" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Audio Player */}
        {memo.audio && audioUrl && (
          <div
            className={`flex items-center gap-3 mt-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700 ${compact ? 'w-full' : 'w-fit'}`}
            onClick={(e) => e.stopPropagation()}
          >
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
          <div className={`space-y-2.5 ${compact ? 'mb-3' : 'pt-2'}`}>
            {memo.todos.slice(0, compact ? 3 : undefined).map(todo => {
              const [title, ...desc] = todo.text.split('\n');
              return (
                <div
                  key={todo.id}
                  className={`flex items-start gap-3 group/todo transition-all duration-200 ${compact
                    ? 'p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    : 'p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:shadow-sm'
                    }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleTodo(todo.id); }}
                    className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-all ${todo.completed
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'border-slate-300 hover:border-indigo-500 bg-white dark:bg-slate-800 dark:border-slate-600'
                      }`}
                  >
                    {todo.completed && <Icons.Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-medium leading-relaxed break-words ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-200'}`}>
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

        {/* Compact Footer */}
        {compact && (
          <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${memo.priority === 'important' ? 'bg-rose-50 text-rose-600' :
              memo.priority === 'secondary' ? 'bg-slate-100 text-slate-500' :
                'bg-indigo-50 text-indigo-600'
              }`}>
              {memo.priority === 'important' ? 'High' : memo.priority === 'secondary' ? 'Low' : 'Normal'}
            </span>
            <span>{new Date(memo.createdAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* Full Footer Actions */}
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
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                title="Edit"
              >
                <Icons.Edit className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handlePlayTTS(); }}
              className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${isPlaying ? 'text-blue-500 animate-pulse' : 'text-slate-400 hover:text-blue-600'}`}
              title="Speak"
            >
              {isPlaying ? <Icons.Volume2 className="w-4 h-4" /> : <Icons.Volume1 className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this memo?')) {
                  deleteMemo(memo.id);
                }
              }}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Icons.Trash className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border border-white/20 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 px-8 border-b border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                    {memo.type === 'todo' ? <Icons.CheckSquare className="w-6 h-6" /> : <Icons.FileText className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                      {memo.type === 'todo' ? 'Task Detail' : 'Note Detail'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 font-medium uppercase tracking-[0.1em]">View & Manage</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all hover:rotate-90"
                >
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 custom-scrollbar">
                {/* Meta & Tags */}
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${memo.priority === 'important' ? 'bg-rose-500 text-white' :
                        memo.priority === 'secondary' ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-indigo-500 text-white'
                      }`}>
                      {memo.priority || 'Normal'} Priority
                    </div>
                    {memo.tags?.map(tag => (
                      <span key={tag} className="text-[11px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700/50">
                        #{tag}
                      </span>
                    ))}
                    {memo.category && (
                      <span className="text-[11px] font-bold text-indigo-500/80 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                        {memo.category}
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                    {parseInline(memo.title || (memo.content && memo.content.split('\n')[0]) || 'Untitled')}
                  </h1>
                </div>

                {/* Main Markdown Content */}
                {(memo.content && (memo.title || memo.content.includes('\n'))) && (
                  <div className="relative group">
                    <div className="absolute -left-6 top-0 bottom-0 w-1 bg-indigo-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <SimpleMarkdown
                      content={memo.title ? (memo.content || '') : (memo.content ? memo.content.split('\n').slice(1).join('\n') : '')}
                      className="text-lg md:text-xl text-slate-700 dark:text-slate-300 leading-[1.6] space-y-6 font-medium"
                    />
                  </div>
                )}

                {/* Media Assets */}
                {(memo.sketchData || (memo.audio && audioUrl)) && (
                  <div className="grid grid-cols-1 gap-6 pt-4">
                    {memo.sketchData && (
                      <div className="rounded-[24px] overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 shadow-inner">
                        <img src={memo.sketchData} alt="Sketch" className="w-full max-h-[500px] object-contain rounded-[20px]" />
                      </div>
                    )}

                    {memo.audio && audioUrl && (
                      <div className="p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-[28px] border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-6 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse-slow shadow-lg shadow-indigo-500/30">
                          <Icons.Mic className="w-7 h-7" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em]">Voice Recording</span>
                            <span className="text-xs font-mono font-bold text-slate-400">{formatTime(memo.audio.duration)}</span>
                          </div>
                          <audio src={audioUrl} controls className="h-8 w-full filter saturate-150" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Task List Section */}
                {memo.todos && memo.todos.length > 0 && (
                  <div className="space-y-6 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 flex items-center gap-2">
                        <Icons.List className="w-4 h-4" /> Checklist
                      </h3>
                      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="grid gap-3">
                      {memo.todos.map(todo => {
                        const [title, ...desc] = todo.text.split('\n');
                        return (
                          <motion.div
                            key={todo.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`flex items-start gap-4 p-5 rounded-[24px] transition-all border ${todo.completed
                              ? 'bg-slate-50/50 dark:bg-slate-950/30 border-transparent opacity-60'
                              : 'bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]'
                              }`}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleTodo(todo.id); }}
                              className={`mt-1 w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${todo.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'border-slate-200 hover:border-indigo-500 bg-white dark:bg-slate-800'
                                }`}
                            >
                              {todo.completed && <Icons.Check className="w-4 h-4" />}
                            </button>
                            <div className="flex-1">
                              <p className={`text-lg font-bold leading-snug ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                                {title}
                              </p>
                              {desc.length > 0 && !todo.completed && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed italic">
                                  {desc.join('\n')}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-6 px-8 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created on</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                    {new Date(memo.createdAt).toLocaleString(undefined, {
                      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                      setIsDetailOpen(false);
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-sm transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
                  >
                    <Icons.Edit className="w-4 h-4" />
                    <span>Quick Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Permanently delete this item?')) {
                        deleteMemo(memo.id);
                        setIsDetailOpen(false);
                      }
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl font-black text-sm transition-all hover:bg-red-600 hover:text-white active:scale-95"
                  >
                    <Icons.Trash className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default React.memo(MemoCard);
