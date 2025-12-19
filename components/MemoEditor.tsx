
import React, { useState, useRef } from 'react';
import { Icons } from '../constants.js';
import VoiceInterface from './VoiceInterface.js';
import Whiteboard from './Whiteboard.js';
import { extractTasks, suggestTags } from '../services/gemini.js';
import { Memo, TodoItem, Priority, RepeatInterval } from '../types.js';

interface MemoEditorProps {
  onSave: (memo: Partial<Memo>) => void;
}

const MemoEditor: React.FC<MemoEditorProps> = ({ onSave }) => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [priority, setPriority] = useState<Priority>('normal');
  const [dueDate, setDueDate] = useState<string>('');
  const [reminderAt, setReminderAt] = useState<string>('');
  const [reminderRepeat, setReminderRepeat] = useState<RepeatInterval>('none');
  const [sketchData, setSketchData] = useState<string | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const reminderInputRef = useRef<HTMLInputElement>(null);

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
        priority: priority
      });
      
      setContent('');
      setDueDate('');
      setReminderAt('');
      setReminderRepeat('none');
      setSketchData(null);
      setPriority('normal');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-14 border border-slate-50 shadow-sm focus-within:shadow-xl transition-all duration-500">
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mr-2">优先级:</span>
        {(['important', 'normal', 'secondary'] as Priority[]).map(p => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              priority === p 
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                : 'bg-slate-50 text-slate-400 border-slate-50 hover:border-slate-200'
            }`}
          >
            {p === 'important' ? '重要' : p === 'normal' ? '一般' : '次要'}
          </button>
        ))}
      </div>

      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入新的待办任务..."
          className="w-full min-h-[140px] resize-none border-none focus:ring-0 text-slate-900 placeholder:text-slate-200 text-xl md:text-3xl font-black leading-tight bg-transparent outline-none tracking-tight no-scrollbar"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3 mt-8">
        {dueDate && (
          <button onClick={() => setDueDate('')} className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95">
            <Icons.Calendar /> 截止: {new Date(dueDate).toLocaleDateString()} &times;
          </button>
        )}
        {reminderAt && (
          <button onClick={() => setReminderAt('')} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95">
            <Icons.Bell /> 提醒: {new Date(reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({reminderRepeat === 'none' ? '单次' : reminderRepeat === 'daily' ? '每天' : '每周'}) &times;
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-12 gap-6 pt-10 border-t border-slate-50">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <VoiceInterface onTranscriptionComplete={(text) => setContent(prev => prev ? prev + '\n' + text : text)} isCompact={false} />
          <div className="h-10 w-[1px] bg-slate-100 hidden sm:block mx-1" />
          <div className="flex gap-2">
            <button onClick={() => setShowWhiteboard(true)} className={`p-4 rounded-2xl transition-all active:scale ${sketchData ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:bg-slate-50'}`} title="添加手绘">
              <Icons.Pen />
            </button>
            <div className="relative">
              <button onClick={() => dateInputRef.current?.showPicker()} className={`p-4 rounded-2xl transition-all active:scale ${dueDate ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                <Icons.Calendar />
              </button>
              <input ref={dateInputRef} type="date" className="absolute opacity-0 w-0 h-0" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowReminderOptions(!showReminderOptions)} 
                className={`p-4 rounded-2xl transition-all active:scale ${reminderAt ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:bg-slate-50'}`}
              >
                <Icons.Clock />
              </button>
              {showReminderOptions && (
                <div className="absolute bottom-full mb-4 left-0 bg-white shadow-2xl rounded-3xl p-4 border border-slate-50 z-20 min-w-[200px] animate-card">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">提醒设置</p>
                  <input type="datetime-local" className="w-full p-3 bg-slate-50 rounded-xl text-sm mb-3 border-none outline-none" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
                  <div className="flex flex-col gap-1">
                    {(['none', 'daily', 'weekly'] as RepeatInterval[]).map(r => (
                      <button 
                        key={r}
                        onClick={() => { setReminderRepeat(r); if (!reminderAt) reminderInputRef.current?.showPicker(); }}
                        className={`text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all ${reminderRepeat === r ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {r === 'none' ? '不重复' : r === 'daily' ? '每天重复' : '每周重复'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowReminderOptions(false)} className="w-full mt-3 py-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest">确认</button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={(!content.trim() && !sketchData) || isProcessing}
          className={`w-full sm:w-auto flex items-center justify-center gap-3 px-12 py-5 rounded-[30px] font-black text-xs uppercase tracking-widest transition-all active-scale ${
            isProcessing || (!content.trim() && !sketchData) ? 'bg-slate-50 text-slate-200' : 'bg-slate-900 text-white shadow-xl shadow-slate-200'
          }`}
        >
          {isProcessing ? "处理中..." : "创建任务"}
        </button>
      </div>

      {showWhiteboard && (
        <Whiteboard 
          initialData={sketchData || undefined}
          onSave={(data) => { setSketchData(data); setShowWhiteboard(false); }}
          onCancel={() => setShowWhiteboard(false)}
        />
      )}
    </div>
  );
};

export default MemoEditor;
