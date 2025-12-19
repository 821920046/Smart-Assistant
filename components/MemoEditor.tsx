
import React, { useState, useRef } from 'react';
import { Icons } from '../constants';
import VoiceInterface from './VoiceInterface';
import Whiteboard from './Whiteboard';
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
  const [sketchData, setSketchData] = useState<string | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const reminderInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!content.trim() && !sketchData) return;
    setIsProcessing(true);
    try {
      const [todos, tags] = await Promise.all([
        content.trim() ? extractTasks(content) : Promise.resolve([]),
        content.trim() ? suggestTags(content) : Promise.resolve([])
      ]);
      
      onSave({
        content: content || (sketchData ? '[手绘内容]' : ''),
        todos,
        tags,
        sketchData: sketchData || undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined,
        type: sketchData ? 'sketch' : (todos.length > 0 ? 'todo' : 'memo'),
        createdAt: Date.now(),
        isArchived: false,
        isFavorite: false,
      });
      
      setContent('');
      setDueDate('');
      setReminderAt('');
      setSketchData(null);
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
        {sketchData && (
          <div className="relative mb-10 group/sketch">
            <div className="rounded-[32px] overflow-hidden border border-slate-100 bg-slate-50/50 aspect-video md:aspect-[21/9]">
              <img src={sketchData} className="w-full h-full object-contain" alt="Sketch Preview" />
            </div>
            <button 
              onClick={() => setSketchData(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
            >
              &times;
            </button>
            <button 
              onClick={() => setShowWhiteboard(true)}
              className="absolute bottom-4 right-4 px-5 py-2.5 bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-all"
            >
              <Icons.Pen />
              重新编辑
            </button>
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={sketchData ? "为这幅画添加一些描述..." : "分享你的记录或灵感..."}
          className="w-full min-h-[140px] md:min-h-[180px] resize-none border-none focus:ring-0 text-slate-900 placeholder:text-slate-200 text-2xl md:text-3xl font-black leading-[1.35] bg-transparent no-scrollbar outline-none tracking-tight"
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
              onClick={() => setShowWhiteboard(true)}
              className={`p-4 transition-all rounded-2xl hover:scale-110 active:scale-90 ${sketchData ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-300 hover:text-indigo-500 hover:bg-indigo-50'}`}
              title="打开白板"
            >
              <Icons.Pen />
            </button>
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
          disabled={(!content.trim() && !sketchData) || isProcessing}
          className={`group flex items-center justify-center gap-4 px-12 py-5 rounded-[30px] font-black text-xs uppercase tracking-[0.25em] transition-all shadow-2xl active:scale-95 ${
            isProcessing || (!content.trim() && !sketchData)
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
