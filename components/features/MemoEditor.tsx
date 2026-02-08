import React, { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import { Icons } from '../../constants';
import { Memo, TodoItem, Priority } from '../../types';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { storage } from '../../services/storage';
import { useToast } from '../../context/ToastContext';

const SketchCanvas = React.lazy(() => import('@/components/features/SketchCanvas').then(m => ({ default: m.SketchCanvas })));

interface MemoEditorProps {
  onSave: (memo: Partial<Memo>) => void;
  onCancel?: () => void;
  initialMemo?: Memo;
  defaultCategory?: string;
  defaultType?: 'todo' | 'memo' | 'sketch';
  hideSelectors?: boolean;
}

const MemoEditor: React.FC<MemoEditorProps> = ({ onSave, onCancel, initialMemo, defaultCategory, defaultType = 'todo', hideSelectors = false }) => {
  const [title, setTitle] = useState(initialMemo?.title || '');
  const [content, setContent] = useState(initialMemo?.content || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [priority, setPriority] = useState<Priority>(initialMemo?.priority || 'normal');
  const [dueDate, setDueDate] = useState<string>(initialMemo?.dueDate ? new Date(initialMemo.dueDate).toISOString().split('T')[0] : '');
  const [sketchData, setSketchData] = useState<string | null>(initialMemo?.sketchData || null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { addToast } = useToast();

  const isEditing = !!initialMemo;

  // Word count calculation
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
      return undefined;
    }
  }, [audioBlob]);

  // Debounced Auto-save for existing memos
  useEffect(() => {
    if (!isEditing || isProcessing) return;

    const hasChanged =
      title !== (initialMemo?.title || '') ||
      content !== (initialMemo?.content || '') ||
      priority !== initialMemo?.priority ||
      dueDate !== (initialMemo?.dueDate ? new Date(initialMemo.dueDate).toISOString().split('T')[0] : '');

    if (!hasChanged) return;

    const timer = setTimeout(() => {
      onSave({
        ...initialMemo,
        title: title.trim() || undefined,
        content: content || '',
        priority: priority,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        updatedAt: Date.now()
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, priority, dueDate]);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback((type: 'bold' | 'italic' | 'list' | 'h1' | 'h2' | 'code' | 'quote' | 'link') => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const before = value.substring(0, selectionStart);
    const selected = value.substring(selectionStart, selectionEnd);
    const after = value.substring(selectionEnd);

    let newText = '';
    let newCursorPos = 0;

    if (type === 'bold') {
      newText = `${before}**${selected || 'bold text'}**${after}`;
      newCursorPos = selected ? selectionEnd + 4 : selectionStart + 2;
    } else if (type === 'italic') {
      newText = `${before}_${selected || 'italic text'}_${after}`;
      newCursorPos = selected ? selectionEnd + 2 : selectionStart + 1;
    } else if (type === 'list') {
      newText = `${before}\n- ${selected}${after}`;
      newCursorPos = selectionEnd + 3;
    } else if (type === 'h1') {
      newText = `${before}\n# ${selected}${after}`;
      newCursorPos = selectionEnd + 3;
    } else if (type === 'h2') {
      newText = `${before}\n## ${selected}${after}`;
      newCursorPos = selectionEnd + 4;
    } else if (type === 'code') {
      newText = `${before}\n\`\`\`\n${selected || 'code'}\n\`\`\`\n${after}`;
      newCursorPos = selectionEnd + 5;
    } else if (type === 'quote') {
      newText = `${before}\n> ${selected}${after}`;
      newCursorPos = selectionEnd + 3;
    } else if (type === 'link') {
      newText = `${before}[${selected || 'link text'}](url)${after}`;
      newCursorPos = selected ? selectionEnd + 7 : selectionStart + 1;
    }

    setContent(newText);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, []);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          insertMarkdown('bold');
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown('italic');
          break;
        case 'l':
          e.preventDefault();
          insertMarkdown('list');
          break;
        case 'k':
          e.preventDefault();
          insertMarkdown('link');
          break;
        case 's':
          e.preventDefault();
          handleSave();
          break;
      }
    }
  }, [insertMarkdown]);

  const localParseTasks = (text: string): TodoItem[] => {
    const lines = text.split('\n').filter(l => /^(?:[-*]|\d+\.)\s/.test(l.trim()));
    return lines.map(line => ({
      id: Math.random().toString(36).substr(2, 9),
      text: line.replace(/^[-*]\s+|\d+\.\s+/, '').trim(),
      completed: false,
      priority: priority
    }));
  };

  const handleSave = async () => {
    if (!content.trim() && !title.trim() && !sketchData && !audioBlob && !initialMemo?.audio) return;
    setIsProcessing(true);
    try {
      let todos: TodoItem[] = isEditing ? (initialMemo.todos || []) : [];
      let tags: string[] = isEditing ? (initialMemo.tags || []) : [];
      let audioId = initialMemo?.audio?.id;
      let finalDuration = initialMemo?.audio?.duration || 0;

      if (audioBlob) {
        audioId = await storage.saveAudio(audioBlob);
        finalDuration = recordingTime;
      }

      await onSave({
        ...initialMemo,
        title: title.trim() || undefined,
        content: content || (sketchData ? '[Sketch]' : '') || (audioId ? `[Audio Note (${Math.floor(finalDuration / 60)}:${(finalDuration % 60).toString().padStart(2, '0')})]` : ''),
        todos,
        tags,
        sketchData: sketchData || undefined,
        audio: audioId ? { id: audioId, duration: finalDuration } : undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        type: initialMemo?.type || defaultType,
        updatedAt: Date.now(),
        priority: priority
      });

      addToast(isEditing ? 'Updated successfully' : 'Created successfully', 'success');

      if (!isEditing) {
        setContent('');
        setTitle('');
        setDueDate('');
        setSketchData(null);
        resetRecording();
        setPriority('normal');
      }
    } catch (error) {
      console.error('Error saving memo:', error);
      addToast(error instanceof Error ? error.message : 'Save failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const priorityConfig = {
    important: {
      label: 'High Priority',
      shortLabel: 'High',
      icon: <div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-sm shadow-rose-300" />,
      active: 'bg-rose-50 border-rose-200 ring-2 ring-rose-500 ring-offset-1 dark:bg-rose-900/20 dark:border-rose-800 dark:ring-offset-slate-900',
      inactive: 'bg-slate-50 border-slate-200 hover:bg-rose-50 hover:border-rose-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-rose-900/20'
    },
    normal: {
      label: 'Medium Priority',
      shortLabel: 'Medium',
      icon: <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-300" />,
      active: 'bg-amber-50 border-amber-200 ring-2 ring-amber-500 ring-offset-1 dark:bg-amber-900/20 dark:border-amber-800 dark:ring-offset-slate-900',
      inactive: 'bg-slate-50 border-slate-200 hover:bg-amber-50 hover:border-amber-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-amber-900/20'
    },
    secondary: {
      label: 'Low Priority',
      shortLabel: 'Low',
      icon: <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-300" />,
      active: 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500 ring-offset-1 dark:bg-emerald-900/20 dark:border-emerald-800 dark:ring-offset-slate-900',
      inactive: 'bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-emerald-900/20'
    }
  };

  const toolbarButtons = [
    { type: 'h1' as const, icon: Icons.Heading1, title: 'Heading 1', shortcut: '' },
    { type: 'h2' as const, icon: Icons.Heading2, title: 'Heading 2', shortcut: '' },
    { type: 'divider' as const },
    { type: 'bold' as const, icon: Icons.Bold, title: 'Bold', shortcut: 'Ctrl+B' },
    { type: 'italic' as const, icon: Icons.Italic, title: 'Italic', shortcut: 'Ctrl+I' },
    { type: 'divider' as const },
    { type: 'list' as const, icon: Icons.ListOrdered, title: 'List', shortcut: 'Ctrl+L' },
    { type: 'quote' as const, icon: Icons.Quote, title: 'Quote', shortcut: '' },
    { type: 'code' as const, icon: Icons.Code, title: 'Code Block', shortcut: '' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-4 md:p-7 mb-8 relative z-20 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700/50">
      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-full text-xs font-bold shadow-lg shadow-rose-500/30 animate-pulse z-30">
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          <span>Recording {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
        </div>
      )}

      {/* Input Area */}
      <div className="relative space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full bg-transparent border-none text-2xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:ring-0 p-0 focus:outline-none"
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start typing... Use Ctrl+B for bold, Ctrl+I for italic"
          className="w-full min-h-[140px] md:min-h-[160px] max-h-[50vh] bg-transparent border-none resize-none text-base text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 p-0 leading-relaxed overflow-y-auto focus:outline-none"
        />

        {/* Word Count */}
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700/50 pt-3">
          <div className="flex items-center gap-4">
            <span>{charCount} characters</span>
            <span>{wordCount} words</span>
          </div>
          {isEditing && (
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Auto-saving
            </span>
          )}
        </div>

        {/* Sketch Preview */}
        {sketchData && (
          <div className="relative mt-4 group w-36 h-36 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <img src={sketchData} alt="Sketch" className="w-full h-full object-cover" />
            <button
              onClick={() => setSketchData(null)}
              className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all backdrop-blur-sm"
            >
              <Icons.Trash className="w-5 h-5" />
              <span className="text-sm font-medium">Remove</span>
            </button>
          </div>
        )}

        {/* Audio Preview */}
        {(isRecording || audioBlob) && (
          <div className="relative mt-4 flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRecording ? 'bg-gradient-to-br from-rose-500 to-red-600 animate-pulse' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
              <Icons.Mic className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{isRecording ? 'Recording in progress...' : 'Audio Note'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Duration: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</p>
            </div>
            {audioUrl && !isRecording && (
              <audio src={audioUrl} controls className="h-10 w-40" />
            )}
            {!isRecording && (
              <button
                onClick={() => {
                  if (confirm('Discard this recording?')) resetRecording();
                }}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-rose-500 transition-all"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Formatting Toolbar - Scrollable on Mobile */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth mt-4 border border-slate-100/50 dark:border-slate-700/20">
        {toolbarButtons.map((btn, idx) =>
          btn.type === 'divider' ? (
            <div key={idx} className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
          ) : (
            <button
              key={btn.type}
              onClick={() => insertMarkdown(btn.type as 'bold' | 'italic' | 'list' | 'h1' | 'h2' | 'code' | 'quote')}
              className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all shrink-0"
              title={btn.shortcut ? `${btn.title} (${btn.shortcut})` : btn.title}
            >
              <btn.icon className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Action Toolbar - Optimized for Mobile */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority Selector */}
          {!hideSelectors && (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl gap-0.5">
              {(Object.keys(priorityConfig) as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all text-[10px] sm:text-xs font-medium border ${priority === p ? priorityConfig[p].active : priorityConfig[p].inactive}`}
                  title={priorityConfig[p].label}
                >
                  {priorityConfig[p].icon}
                  <span className="inline">{priorityConfig[p].shortLabel}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions (Mic, Sketch, Date) */}
          <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            {/* Due Date */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`p-2 rounded-xl transition-all ${dueDate ? 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                title={dueDate ? `Due: ${new Date(dueDate).toLocaleDateString()}` : 'Set Due Date'}
              >
                <Icons.Clock className="w-4 h-4" />
              </button>
              {showDatePicker && (
                <div className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Due Date</p>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Voice Recording */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-xl transition-all ${isRecording ? 'text-white bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30 animate-pulse' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <Icons.Mic className="w-4 h-4" />
            </button>

            {/* Sketch */}
            <button
              onClick={() => setShowWhiteboard(true)}
              className={`p-2 rounded-xl transition-all ${sketchData ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              <Icons.Pen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={(!content.trim() && !sketchData && !audioBlob && !initialMemo?.audio) || isProcessing}
            className="flex-1 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Saving...' : (isEditing ? 'Save Changes' : 'Quick Save')}
          </button>
        </div>
      </div>


      {/* Due Date Badge */}
      {dueDate && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-full border border-violet-200 dark:border-violet-800">
            <Icons.Clock className="w-3 h-3" />
            <span>Due: {new Date(dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <button
              onClick={() => setDueDate('')}
              className="hover:text-rose-500 transition-colors"
            >
              <Icons.X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Whiteboard Modal */}
      {showWhiteboard && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"><div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div></div>}>
          <SketchCanvas
            initialData={sketchData || undefined}
            onSave={(data: string) => {
              setSketchData(data);
              setShowWhiteboard(false);
            }}
            onCancel={() => setShowWhiteboard(false)}
          />
        </Suspense>
      )}

      {/* Click outside to close date picker */}
      {showDatePicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
      )}
    </div>
  );
};

export default MemoEditor;
