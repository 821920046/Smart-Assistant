
import React, { useState, useRef } from 'react';
import { Icons } from '../constants';
import VoiceInterface from './VoiceInterface';
import { extractTasks, suggestTags, refineText } from '../services/gemini';
import { Memo } from '../types';

interface MemoEditorProps {
  onSave: (memo: Partial<Memo>) => void;
}

const MemoEditor: React.FC<MemoEditorProps> = ({ onSave }) => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [reminderAt, setReminderAt] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const reminderInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsProcessing(true);
    try {
      const [todos, tags] = await Promise.all([
        extractTasks(content),
        suggestTags(content)
      ]);
      onSave({
        content,
        todos,
        tags,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined,
        type: todos.length > 0 ? 'todo' : 'memo',
        createdAt: Date.now(),
        isArchived: false,
        isFavorite: false,
      });
      setContent('');
      setDueDate('');
      setReminderAt('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefine = async () => {
    if (!content.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const refined = await refineText(content);
      setContent(refined);
    } finally {
      setIsRefining(false);
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setContent(prev => {
      const trimmedText = text.trim();
      if (!prev) return trimmedText;
      return prev.endsWith('\n') ? prev + trimmedText : prev + '\n' + trimmedText;
    });
  };

  const triggerDatePicker = () => dateInputRef.current?.showPicker();
  const triggerReminderPicker = () => reminderInputRef.current?.showPicker();

  return (
    <div className="bg-white rounded-[48px] p-8 md:p-14 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] focus-within:shadow-[0_24px_50px_rgba(99,102,241,0.05)] focus-within:border-indigo-100 transition-all duration-700">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享你的记录或灵感..."
          className="w-full min-h-[180px] md:min-h-[260px] resize-none border-none focus:ring-0 text-slate-900 placeholder:text-slate-200 text-2xl md:text-4xl font-black leading-[1.35] bg-transparent no-scrollbar outline-none tracking-tight"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-4 mt-10">
        {dueDate && (
          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black tracking-widest uppercase animate-card shadow-lg shadow-slate-200">
            <Icons.Calendar />
            <span>{new Date(dueDate).toLocaleDateString()}</span>
            <button onClick={() => setDueDate('')} className="ml-3 opacity-50 hover:opacity-100 transition-opacity">×</button>
          </div>
        )}
        {reminderAt && (
          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-indigo-500 text-white rounded-2xl text-[10px] font-black tracking-widest uppercase animate-card shadow-lg shadow-indigo-100">
            <Icons.Bell />
            <span>{new Date(reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={() => setReminderAt('')} className="ml-3 opacity-50 hover:opacity-100 transition-opacity">×</button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-12 gap-8 pt-12 border-t border-slate-50">
        <div className="flex items-center gap-4">
          <VoiceInterface onTranscriptionComplete={handleVoiceTranscription} isCompact={false} />
          
          <div className="h-8 w-[1px] bg-slate-100 mx-4 hidden sm:block"></div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleRefine}
              disabled={!content.trim() || isRefining}
              className={`p-4 transition-all rounded-2xl hover:scale-110 active:scale-90 ${isRefining ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-indigo-500 hover:bg-indigo-50'}`}
              title="智能润色"
            >
              <Icons.Sparkles />
            </button>
            <div className="relative">
              <button onClick={triggerDatePicker} className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-90 ${dueDate ? 'text-indigo-600 bg-indigo-50 shadow-sm' : 'text-slate-300 hover:text-slate-900 hover:bg-slate-50'}`}>
                <Icons.Calendar />
              </button>
              <input ref={dateInputRef} type="date" className="absolute opacity-0 w-0 h-0" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="relative">
              <button onClick={triggerReminderPicker} className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-90 ${reminderAt ? 'text-indigo-600 bg-indigo-50 shadow-sm' : 'text-slate-300 hover:text-slate-900 hover:bg-slate-50'}`}>
                <Icons.Clock />
              </button>
              <input ref={reminderInputRef} type="datetime-local" className="absolute opacity-0 w-0 h-0" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className={`group flex items-center justify-center gap-4 px-12 py-5 rounded-[30px] font-black text-xs uppercase tracking-[0.25em] transition-all shadow-2xl active:scale-95 ${
            isProcessing || !content.trim() 
              ? 'bg-slate-50 text-slate-300 shadow-none cursor-not-allowed' 
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
          }`}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              确认保存
              <span className="opacity-40 group-hover:translate-x-1.5 transition-transform duration-300">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MemoEditor;
