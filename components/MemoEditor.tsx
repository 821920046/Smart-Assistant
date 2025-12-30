import React, { useState, useRef, Suspense, useEffect } from 'react';
import { Icons, CATEGORIES } from '../constants';
import { extractTasks, suggestTags } from '../services/gemini';
import { Memo, TodoItem, Priority, RepeatInterval } from '../types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { storage } from '../services/storage';

const Whiteboard = React.lazy(() => import('./Whiteboard'));

interface MemoEditorProps {
  onSave: (memo: Partial<Memo>) => void;
  onCancel?: () => void;
  initialMemo?: Memo;
  defaultCategory?: string;
  defaultType?: 'todo' | 'memo';
}

const MemoEditor: React.FC<MemoEditorProps> = ({ onSave, onCancel, initialMemo, defaultCategory, defaultType = 'todo' }) => {
  const [title, setTitle] = useState(initialMemo?.title || '');
  const [content, setContent] = useState(initialMemo?.content || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [priority, setPriority] = useState<Priority>(initialMemo?.priority || 'normal');
  const [dueDate, setDueDate] = useState<string>(initialMemo?.dueDate ? new Date(initialMemo.dueDate).toISOString().split('T')[0] : '');
  const [reminderAt, setReminderAt] = useState<string>(initialMemo?.reminderAt ? new Date(initialMemo.reminderAt).toISOString().slice(0, 16) : '');
  const [reminderRepeat, setReminderRepeat] = useState<RepeatInterval>(initialMemo?.reminderRepeat || 'none');
  const [sketchData, setSketchData] = useState<string | null>(initialMemo?.sketchData || null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [category, setCategory] = useState<string>(initialMemo?.category || defaultCategory || 'Personal');
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

  const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const isEditing = !!initialMemo;

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

  React.useEffect(() => {
    if (defaultCategory && !isEditing) {
      setCategory(defaultCategory);
    }
  }, [defaultCategory, isEditing]);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const reminderInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (type: 'bold' | 'italic' | 'list' | 'h1' | 'h2' | 'code' | 'quote') => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const before = value.substring(0, selectionStart);
    const selected = value.substring(selectionStart, selectionEnd);
    const after = value.substring(selectionEnd);

    let newText = '';
    let newCursorPos = 0;

    if (type === 'bold') {
      newText = `${before}**${selected}**${after}`;
      newCursorPos = selectionEnd + 4;
    } else if (type === 'italic') {
      newText = `${before}_${selected}_${after}`;
      newCursorPos = selectionEnd + 2;
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
      newText = `${before}\n\`\`\`\n${selected}\n\`\`\`\n${after}`;
      newCursorPos = selectionEnd + 5;
    } else if (type === 'quote') {
      newText = `${before}\n> ${selected}${after}`;
      newCursorPos = selectionEnd + 3;
    }

    setContent(newText);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const localParseTasks = (text: string): TodoItem[] => {
    // Only parse lines that start with -, *, or 1. as tasks
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

      if (content.trim() && content !== initialMemo?.content) {
        // Only re-parse if content changed
        const newTodos = localParseTasks(content);
        if (newTodos.length > 0) {
          // Merge or replace? For simplicity, if editing and new tasks found, replace list.
          // But usually we don't want to lose completion status.
          // Here we'll just use new ones if it's a new note, or keep old ones if editing unless content changed significantly.
          // Actually, for editing, we might just want to update the text.
          todos = newTodos;
        }

        const tagsResult = await suggestTags(content);
        tags = tagsResult;
      }

      onSave({
        ...initialMemo,
        title: title.trim() || undefined,
        content: content || (sketchData ? '[Sketch]' : '') || (audioId ? `[音频笔记 (${Math.floor(finalDuration / 60)}:${(finalDuration % 60).toString().padStart(2, '0')})]` : ''),
        todos,
        tags,
        sketchData: sketchData || undefined,
        audio: audioId ? { id: audioId, duration: finalDuration } : undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined,
        reminderRepeat,
        type: initialMemo?.type || defaultType,
        updatedAt: Date.now(),
        priority: priority,
        category: category
      });

      if (!isEditing) {
        setContent('');
        setTitle('');
        setDueDate('');
        setReminderAt('');
        setReminderRepeat('none');
        setSketchData(null);
        resetRecording();
        setPriority('normal');
        setCategory(defaultCategory || 'Personal');
        setShowReminderOptions(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const priorityConfig = {
    important: {
      label: 'Important',
      active: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 ring-2 ring-rose-500 ring-offset-1 dark:ring-offset-slate-800',
      inactive: 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600'
    },
    normal: {
      label: 'Normal',
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800',
      inactive: 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
    },
    secondary: {
      label: 'Low',
      active: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 ring-2 ring-slate-500 ring-offset-1 dark:ring-offset-slate-800',
      inactive: 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700'
    }
  };

  return (
    <div className="memo-card p-4 md:p-6 mb-8 relative z-20">
      {/* Input Area */}
      <div className="relative space-y-3">
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full text-xs font-bold shadow-lg animate-pulse z-30">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span>Recording {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
          </div>
        )}

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full bg-transparent border-none text-xl font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 p-0"
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Description or details... Type here..."
          className="w-full h-32 bg-transparent border-none resize-none text-base text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 p-0 leading-relaxed"
        />

        {sketchData && (
          <div className="relative mt-4 group w-32 h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <img src={sketchData} alt="Sketch" className="w-full h-full object-cover" />
            <button
              onClick={() => setSketchData(null)}
              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Icons.Trash />
            </button>
          </div>
        )}

        {(isRecording || audioBlob) && (
          <div className="relative mt-4 group w-full md:w-fit flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
              <Icons.Mic className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{isRecording ? 'Recording...' : 'Audio Note'}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
            </div>
            {audioUrl && !isRecording && (
              <audio src={audioUrl} controls className="h-8 w-32 md:w-48 ml-2" />
            )}
            {!isRecording && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to discard this recording?')) {
                    resetRecording();
                  }
                }}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-colors ml-1"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 gap-4">

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryOptions(!showCategoryOptions)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors border border-slate-100 dark:border-slate-700 min-h-[36px]"
            >
              <Icons.Folder className="w-3.5 h-3.5" />
              <span>{category}</span>
              <Icons.ChevronDown className="w-3 h-3" />
            </button>
            {showCategoryOptions && (
              <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-1 z-50">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setShowCategoryOptions(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${category === cat
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority Selector */}
          <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 min-h-[36px]">
            {(Object.keys(priorityConfig) as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${priority === p ? priorityConfig[p].active : priorityConfig[p].inactive
                  }`}
              >
                {priorityConfig[p].label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

          {/* Editor Toolbar */}
          <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-full min-h-[36px]">
            <button
              onClick={() => insertMarkdown('h1')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all flex-shrink-0"
              title="Heading 1"
            >
              <Icons.Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('h2')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all flex-shrink-0"
              title="Heading 2"
            >
              <Icons.Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0" />
            <button
              onClick={() => insertMarkdown('bold')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all flex-shrink-0"
              title="Bold"
            >
              <Icons.Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('italic')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all flex-shrink-0"
              title="Italic"
            >
              <Icons.Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0" />
            <button
              onClick={() => insertMarkdown('list')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all flex-shrink-0"
              title="List"
            >
              <Icons.ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('quote')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all flex-shrink-0"
              title="Quote"
            >
              <Icons.Quote className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('code')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all flex-shrink-0"
              title="Code Block"
            >
              <Icons.Code className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${isRecording ? 'text-red-600 bg-red-50 dark:bg-red-900/30 animate-pulse' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title={isRecording ? "Stop Recording" : "Record Audio"}
            >
              {isRecording ? <Icons.Stop className="w-4 h-4" /> : <Icons.Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowWhiteboard(true)}
              className={`p-2 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${sketchData ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Draw"
            >
              <Icons.Pen />
            </button>

            <div className="relative">
              {/* Reminder Feature Removed as per user request */}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={(!content.trim() && !sketchData && !audioBlob && !initialMemo?.audio) || isProcessing}
          className="w-full md:w-auto px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200 dark:shadow-blue-900/30 hover:bg-blue-600 hover:shadow-blue-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{isEditing ? 'Updating...' : 'Processing...'}</span>
            </>
          ) : (
            <>
              {isEditing ? <Icons.Check /> : <Icons.Plus />}
              <span>{isEditing ? 'Update Task' : 'Create Task'}</span>
            </>
          )}
        </button>
        {isEditing && (
          <button
            onClick={onCancel}
            className="w-full md:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
          >
            取消
          </button>
        )}
      </div>

      {showWhiteboard && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"><div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div></div>}>
          <Whiteboard
            initialData={sketchData || undefined}
            onSave={(data) => {
              setSketchData(data);
              setShowWhiteboard(false);
            }}
            onCancel={() => setShowWhiteboard(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default MemoEditor;
