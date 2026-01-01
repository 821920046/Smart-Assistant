import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Memo } from '../../types';
import { Icons } from '../../constants';
import SimpleMarkdown, { parseInline } from '../ui/SimpleMarkdown';

interface MemoDetailModalProps {
  memo: Memo;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onToggleTodo: (id: string) => void;
  audioUrl?: string | null;
  formatTime: (seconds?: number) => string;
}

const MemoDetailModal: React.FC<MemoDetailModalProps> = ({
  memo,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleTodo,
  audioUrl,
  formatTime
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Get the scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
              onClick={onClose}
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
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Icons.Mic className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Voice Note</div>
                      <audio src={audioUrl} controls className="h-8 w-full" />
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                      {formatTime(memo.audio.duration)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Todo List (Interactive) */}
            {memo.todos && memo.todos.length > 0 && (
              <div className="space-y-4 pt-4">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Checklist</h4>
                <div className="space-y-3">
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
                          onClick={(e) => { e.stopPropagation(); onToggleTodo(todo.id); }}
                          className={`mt-1 w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${todo.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'border-slate-200 hover:border-indigo-500 bg-white dark:bg-slate-800'
                            }`}
                        >
                          {todo.completed && <Icons.Check className="w-4 h-4" />}
                        </button>
                        <div className="flex-1">
                          <p className={`text-base font-bold leading-relaxed ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-200'}`}>
                            {title}
                          </p>
                          {desc.length > 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
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

          {/* Modal Footer */}
          <div className="p-6 px-8 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
              <span>Created {new Date(memo.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>
                Last updated {new Date(memo.updatedAt).toLocaleString(undefined, {
                  month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  onClose();
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-sm transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <Icons.Edit className="w-4 h-4" />
                <span>Quick Edit</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Permanently delete this item?')) {
                    onDelete(memo.id);
                    onClose();
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
    </AnimatePresence>,
    document.body
  );
};

export default MemoDetailModal;
