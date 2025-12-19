
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
    <div className="bg-white rounded-[28px] md:rounded-[32px] p-5 md:p-6 border border-slate-100 shadow-sm focus-within:shadow-xl focus-within:border-slate-200 transition-all duration-300">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="有什么新灵感？"
          className="w-full min-h-[120px] md:min-h-[160px] resize-none border-none focus:ring-0 text-slate-800 placeholder:text-slate-300 text-lg md:text-xl font-medium leading-relaxed bg-transparent no-scrollbar"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {dueDate && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-bold tracking-wider">
            <Icons.Calendar />
            截止: {new Date(dueDate).toLocaleDateString().toUpperCase()}
            <button onClick={() => setDueDate('')} className="ml-1 opacity-60">×</button>
          </div>
        )}
        {reminderAt && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white rounded-full text-[9px] font-bold tracking-wider">
            <Icons.Bell />
            提醒: {new Date(reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <button onClick={() => setReminderAt('')} className="ml-1 opacity-60">×</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 md:mt-6 pt-4 md:pt-5 border-t border-slate-50">
        <div className="flex gap-1 items-center">
          <VoiceInterface onTranscriptionComplete={handleVoiceTranscription} isCompact={true} />
          
          <div className="h-5 w-px bg-slate-100 mx-2"></div>
          
          <div className="flex gap-0.5">
            <button 
              onClick={handleRefine}
              disabled={!content.trim() || isRefining}
              className={`p-2.5 transition-all rounded-xl hover:bg-sky-50 ${isRefining ? 'animate-pulse text-sky-600' : 'text-slate-400'}`}
              title="AI 润色"
            >
              <Icons.Sparkles />
            </button>
            <div className="relative">
              <button 
                onClick={triggerDatePicker}
                className={`p-2.5 rounded-xl ${dueDate ? 'text-sky-600 bg-sky-50' : 'text-slate-400'}`}
              >
                <Icons.Calendar />
              </button>
              <input ref={dateInputRef} type="date" className="absolute opacity-0 w-0 h-0" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="relative">
              <button 
                onClick={triggerReminderPicker}
                className={`p-2.5 rounded-xl ${reminderAt ? 'text-sky-600 bg-sky-50' : 'text-slate-400'}`}
              >
                <Icons.Clock />
              </button>
              <input ref={reminderInputRef} type="datetime-local" className="absolute opacity-0 w-0 h-0" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className={`flex items-center gap-2 px-6 md:px-8 py-2.5 md:py-3 rounded-2xl font-bold transition-all ${
            isProcessing || !content.trim() 
              ? 'bg-slate-50 text-slate-300' 
              : 'bg-black text-white hover:bg-slate-800'
          }`}
        >
          {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <span className="text-sm">保存</span>}
        </button>
      </div>
    </div>
  );
};

export default MemoEditor;
