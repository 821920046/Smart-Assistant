import React, { useState, useRef } from 'react';
import { Icons, CATEGORIES } from '../constants.js';
import Whiteboard from './Whiteboard.js';
import { extractTasks, suggestTags } from '../services/gemini.js';
import { Memo, TodoItem, Priority, RepeatInterval } from '../types.js';

interface MemoEditorProps {
  onSave: (memo: Partial<Memo>) => void;
  defaultCategory?: string;
}

const MemoEditor: React.FC<MemoEditorProps> = ({ onSave, defaultCategory }) => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [priority, setPriority] = useState<Priority>('normal');
  const [dueDate, setDueDate] = useState<string>('');
  const [reminderAt, setReminderAt] = useState<string>('');
  const [reminderRepeat, setReminderRepeat] = useState<RepeatInterval>('none');
  const [sketchData, setSketchData] = useState<string | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [category, setCategory] = useState<string>(defaultCategory || 'Personal');
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

  React.useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [defaultCategory]);

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
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => ({
      id: Math.random().toString(36).substr(2, 9),
      text: line.replace(/^[-*]\s+|\d+\.\s+/, '').trim(),
      completed: false,
      priority: priority
    }));
  };

  const handleSave = async () => {
    if (!content.trim() && !sketchData) return;
    setIsProcessing(true);
    try {
      let todos: TodoItem[] = [];
      let tags: string[] = [];

      if (content.trim()) {
        const results = await Promise.all([
          extractTasks(content, true),
          suggestTags(content)
        ]);
        todos = results[0].map(t => ({ ...t, priority: priority }));
        tags = results[1];

        if (todos.length === 0) {
          todos = localParseTasks(content);
        }
      }

      onSave({
        content: content || (sketchData ? '[Sketch]' : ''),
        todos,
        tags,
        sketchData: sketchData || undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined,
        reminderRepeat,
        type: 'todo',
        createdAt: Date.now(),
        isArchived: false,
        isFavorite: false,
        priority: priority,
        category: category
      });

      setContent('');
      setDueDate('');
      setReminderAt('');
      setReminderRepeat('none');
      setSketchData(null);
      setPriority('normal');
      setCategory(defaultCategory || 'Personal');
      setShowReminderOptions(false);
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
    <div className="memo-card p-6 mb-8 relative z-20">
      {/* Input Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind? Type here..."
          className="w-full h-32 bg-transparent border-none resize-none text-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 p-0 leading-relaxed"
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
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 gap-4">
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Selector */}
          <div className="relative">
             <button
                onClick={() => setShowCategoryOptions(!showCategoryOptions)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors border border-slate-100 dark:border-slate-700"
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
                     className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                       category === cat 
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
          <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
            {(Object.keys(priorityConfig) as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  priority === p ? priorityConfig[p].active : priorityConfig[p].inactive
                }`}
              >
                {priorityConfig[p].label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

          {/* Editor Toolbar */}
          <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => insertMarkdown('h1')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all"
              title="Heading 1"
            >
              <Icons.Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('h2')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all"
              title="Heading 2"
            >
              <Icons.Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button
              onClick={() => insertMarkdown('bold')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all"
              title="Bold"
            >
              <Icons.Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('italic')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all"
              title="Italic"
            >
              <Icons.Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button
              onClick={() => insertMarkdown('list')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all"
              title="List"
            >
              <Icons.ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('quote')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all"
              title="Quote"
            >
              <Icons.Quote className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('code')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all"
              title="Code Block"
            >
              <Icons.Code className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

          {/* Action Buttons */}
          <button 
            onClick={() => setShowWhiteboard(true)}
            className={`p-2 rounded-lg transition-all ${sketchData ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title="Draw"
          >
            <Icons.Pen />
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowReminderOptions(!showReminderOptions)}
              className={`p-2 rounded-lg transition-all ${reminderAt ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Set Reminder"
            >
              <Icons.Clock />
            </button>
            
            {showReminderOptions && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Reminder Settings</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Date & Time</label>
                    <input 
                      type="datetime-local"
                      ref={reminderInputRef}
                      value={reminderAt ? new Date(reminderAt).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setReminderAt(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-slate-700 dark:text-white border-none rounded-lg focus:ring-2 focus:ring-blue-500/20 py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Repeat</label>
                    <select
                      value={reminderRepeat}
                      onChange={(e) => setReminderRepeat(e.target.value as RepeatInterval)}
                      className="w-full text-sm bg-slate-50 dark:bg-slate-700 dark:text-white border-none rounded-lg focus:ring-2 focus:ring-blue-500/20 py-2"
                    >
                      <option value="none">No Repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={(!content.trim() && !sketchData) || isProcessing}
          className="w-full md:w-auto px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200 dark:shadow-blue-900/30 hover:bg-blue-600 hover:shadow-blue-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Icons.Plus />
              <span>Create Task</span>
            </>
          )}
        </button>
      </div>

      {showWhiteboard && (
        <Whiteboard 
          initialData={sketchData || undefined}
          onSave={(data) => {
            setSketchData(data);
            setShowWhiteboard(false);
          }}
          onCancel={() => setShowWhiteboard(false)}
        />
      )}
    </div>
  );
};

export default MemoEditor;
