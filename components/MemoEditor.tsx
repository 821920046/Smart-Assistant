
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
    <div className="bg-white rounded-[40px] p-6 md:p-10 border border-slate-200/60 shadow-xl shadow-slate-200/20 focus-within:shadow-2xl focus-within:border-sky-500/20 transition-all duration-500">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今天有什么值得记录的？"
          className="w-full min-h-[160px] md:min-h-[220px] resize-none border-none focus:ring-0 text-slate-900 placeholder:text-slate-300 text-xl md:text-2xl font-black leading-[1.4] bg-transparent no-scrollbar outline-none"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3 mt-6">
        {dueDate && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black tracking-widest uppercase animate-slide-up">
            <Icons.Calendar />
            <span>{new Date(dueDate).toLocaleDateString()}</span>
            <button onClick={() => setDueDate('')} className="ml-2 hover:text-rose-400">×</button>
          </div>
        )}
        {reminderAt && (
          <div className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-2xl text-[10px] font-black tracking-widest uppercase animate-slide-up">
            <Icons.Bell />
            <span>{new Date(reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={() => setReminderAt('')} className="ml-2 hover:text-sky-900">×</button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 pt-8 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <VoiceInterface onTranscriptionComplete={handleVoiceTranscription} isCompact={false} />
          
          <div className="h-6 w-[1.5px] bg-slate-100 mx-3 hidden sm:block"></div>
          
          <div className="flex gap-1.5">
            <button 
              onClick={handleRefine}
              disabled={!content.trim() || isRefining}
              className={`p-3.5 transition-all rounded-2xl hover:scale-110 active:scale-90 ${isRefining ? 'bg-sky-50 text-sky-600' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}
              title="智能润色"
            >
              <Icons.Sparkles />
            </button>
            <div className="relative">
              <button onClick={triggerDatePicker} className={`p-3.5 rounded-2xl transition-all hover:scale-110 active:scale-90 ${dueDate ? 'text-sky-600 bg-sky-50' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>
                <Icons.Calendar />
              </button>
              <input ref={dateInputRef} type="date" className="absolute opacity-0 w-0 h-0" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="relative">
              <button onClick={triggerReminderPicker} className={`p-3.5 rounded-2xl transition-all hover:scale-110 active:scale-90 ${reminderAt ? 'text-sky-600 bg-sky-50' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>
                <Icons.Clock />
              </button>
              <input ref={reminderInputRef} type="datetime-local" className="absolute opacity-0 w-0 h-0" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className={`group flex items-center justify-center gap-3 px-10 py-4 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${
            isProcessing || !content.trim() 
              ? 'bg-slate-50 text-slate-300 shadow-none' 
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
          }`}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              保存
              <span className="opacity-40 group-hover:translate-x-1 transition-transform">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MemoEditor;
