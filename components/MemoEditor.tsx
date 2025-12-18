
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
  const dateInputRef = useRef<HTMLInputElement>(null);

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
        type: todos.length > 0 ? 'todo' : 'memo',
        createdAt: Date.now(),
        isArchived: false,
        isFavorite: false,
      });

      setContent('');
      setDueDate('');
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

  const triggerDatePicker = () => {
    dateInputRef.current?.showPicker();
  };

  return (
    <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm transition-all focus-within:shadow-xl focus-within:border-slate-300 focus-within:-translate-y-1 duration-300">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今天有什么新灵感？"
          className="w-full min-h-[160px] resize-none border-none focus:ring-0 text-slate-800 placeholder:text-slate-300 text-xl font-medium leading-relaxed bg-transparent"
        />
        
        {!content && (
          <div className="absolute top-24 left-0 flex items-center gap-3 text-slate-200 pointer-events-none transition-opacity">
             <div className="flex gap-1 items-end h-4">
               <span className="w-1 bg-slate-100 rounded-full animate-pulse h-2"></span>
               <span className="w-1 bg-slate-100 rounded-full animate-pulse h-4" style={{ animationDelay: '200ms' }}></span>
               <span className="w-1 bg-slate-100 rounded-full animate-pulse h-3" style={{ animationDelay: '400ms' }}></span>
             </div>
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">智能引擎已就绪</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {dueDate && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-bold tracking-wider border border-slate-900 transition-all hover:bg-slate-800">
            <Icons.Calendar />
            截止: {new Date(dueDate).toLocaleDateString().toUpperCase()}
            <button 
              onClick={() => setDueDate('')}
              className="ml-1 text-slate-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
        <div className="flex gap-1 items-center">
          <VoiceInterface onTranscriptionComplete={handleVoiceTranscription} isCompact={false} />
          
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          
          <div className="flex gap-1">
            <button 
              onClick={handleRefine}
              disabled={!content.trim() || isRefining}
              className={`p-2.5 transition-all rounded-xl hover:bg-sky-50 ${isRefining ? 'animate-pulse text-sky-600' : 'text-slate-400 hover:text-sky-600'}`}
              title="智能润色"
            >
              <Icons.Sparkles />
            </button>
            <div className="relative">
              <button 
                onClick={triggerDatePicker}
                className={`p-2.5 transition-all rounded-xl hover:bg-slate-50 ${dueDate ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-900'}`}
                title="设置截止日期"
              >
                <Icons.Calendar />
              </button>
              <input 
                ref={dateInputRef}
                type="date" 
                className="absolute opacity-0 pointer-events-none w-0 h-0"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all duration-300 ${
            isProcessing || !content.trim() 
              ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100' 
              : 'bg-black text-white hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-[0.98]'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-sm">合成中...</span>
            </div>
          ) : (
            <span className="text-sm">记录想法</span>
          )}
        </button>
      </div>
      
      {isProcessing && (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 animate-pulse">
          <Icons.Sparkles />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">智能助手正在提取任务、标签和优先级...</span>
        </div>
      )}
    </div>
  );
};

export default MemoEditor;
