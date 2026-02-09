import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Memo, Priority } from '../../types';
import { Icons } from '../../constants';
import SimpleMarkdown, { parseInline } from '../ui/SimpleMarkdown';
import MemoEditor from './MemoEditor';
import MemoDetailModal from './MemoDetailModal';
import { storage } from '../../services/storage';
import { useStore } from '../../services/store';
import { useHaptic } from '../../hooks/useHaptic';
import { cn } from '../../utils/cn';

interface MemoCardProps {
  memo: Memo;
  compact?: boolean;
  onTagClick?: (tag: string) => void;
}

const PriorityTag = ({ priority }: { priority: Priority }) => {
  const colors = {
    important: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900',
    normal: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900',
    secondary: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900'
  };

  const labels = {
    important: 'High',
    normal: 'Medium',
    secondary: 'Low'
  };

  return (
    <motion.span
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
        colors[priority]
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Icons.Priority priority={priority} className="w-2 h-2" />
      <span>{labels[priority]}</span>
    </motion.span>
  );
};

const MemoCard: React.FC<MemoCardProps> = ({ memo, compact }) => {
  const { updateMemo, deleteMemo } = useStore();
  const { hapticFeedback } = useHaptic();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      hapticFeedback('success');
    } else {
      updateMemo({ ...memo, todos: updatedTodos });
      hapticFeedback('selection');
    }
  };

  const handleToggleMemo = () => {
    updateMemo({
      ...memo,
      isArchived: !memo.isArchived,
      completedAt: !memo.isArchived ? Date.now() : undefined
    });
    hapticFeedback('selection');
  };

  const handleCardClick = () => {
    if (!isEditing) {
      setIsDetailOpen(true);
      hapticFeedback('light');
    }
  };

  const hasTodos = memo.todos && memo.todos.length > 0;

  // Enhanced card variants
  const cardVariants = {
    initial: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      rotateX: 10
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    hover: {
      scale: compact ? 1.02 : 1.03,
      y: compact ? -2 : -4,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
    tap: {
      scale: 0.98,
      y: 0,
      transition: { duration: 0.1 }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      rotateX: -10,
      transition: { duration: 0.2 }
    }
  };

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
            hapticFeedback('success');
          }}
          onCancel={() => setIsEditing(false)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "memo-card group relative cursor-pointer overflow-hidden",
        "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
        "shadow-sm hover:shadow-lg transition-all duration-300",
        compact
          ? "p-4 rounded-xl"
          : hasTodos
            ? "p-6 rounded-xl"
            : "p-6 rounded-2xl max-w-2xl mx-auto"
      )}
      style={{
        willChange: 'transform, box-shadow'
      }}
    >
      {/* Enhanced hover gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Priority indicator line */}
      {memo.priority === 'important' && memo.type !== 'memo' && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        {!compact && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {memo.type !== 'memo' && <PriorityTag priority={memo.priority || 'normal'} />}
              {memo.tags?.map((tag, tagIndex) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: { delay: 0.3 + tagIndex * 0.05 }
                  }}
                  className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600"
                >
                  #{tag}
                </motion.span>
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
              className={cn(
                "mt-1 -ml-2 -mt-2 p-2 flex-shrink-0 transition-all duration-200 rounded-lg active:scale-95",
                memo.isArchived
                  ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              )}
              title={memo.isArchived ? "Unarchive" : "Complete Task"}
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
                      className={cn(
                        "mt-1 -ml-2 -mt-2 p-2 flex items-center justify-center transition-all active:scale-95",
                        todo.completed
                          ? 'text-indigo-500'
                          : 'text-slate-300 hover:text-indigo-500'
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border transition-all",
                        todo.completed
                          ? 'bg-indigo-500 border-indigo-500 text-white'
                          : 'border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600'
                      )}>
                        {todo.completed && <Icons.Check className="w-3 h-3" />}
                      </div>
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
              {memo.type !== 'memo' && <PriorityTag priority={memo.priority || 'normal'} />}
              <span>{new Date(memo.createdAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}</span>
            </div>
          )}
        </div>

        {/* Full Footer Actions */}
        {!compact && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{new Date(memo.createdAt).toLocaleDateString()}</span>
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
        <MemoDetailModal
          memo={memo}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onEdit={() => setIsEditing(true)}
          onDelete={deleteMemo}
          onToggleTodo={handleToggleTodo}
          audioUrl={audioUrl}
          formatTime={formatTime}
        />
      </div>
    </motion.div>
  );
};

export default React.memo(MemoCard);
