
import React, { useState, useRef } from 'react';
import { Icons } from '../constants.js';
import VoiceInterface from './VoiceInterface.js';
import Whiteboard from './Whiteboard.js';
import { extractTasks, suggestTags, refineText } from '../services/gemini.js';
import { Memo } from '../types.js';

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

  return (
    <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-14 border border-slate-50 shadow-sm focus-within:shadow-xl transition-all duration-500">
      <div className="relative">
        {sketchData && (
          <div className="relative mb-6 group/sketch">
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/30 aspect-video">
              <img src={sketchData} className="w-full h-full object-contain" alt="Sketch Preview" />
            </div>
            <button onClick={() => setSketchData(null)} className="absolute top-2 right-2 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-400">&times;</button>
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={sketchData ? "写点关于这张画的..." : "此时此刻的想法..."}
          className="w-full min-h-[120px] md:min-h-[180px] resize-none border-none focus:ring-0 text-slate-900 placeholder:text-slate-200 text-xl md:text-3xl font-black leading-tight bg-transparent no-scrollbar outline-none tracking-tight"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3 mt-6">
        {dueDate && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-wider">
            <Icons.Calendar />
            <span>{new Date(dueDate).toLocaleDateString()}</span>
          </div>
        )}
        {reminderAt && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider">
            <Icons.Bell />
            <span>{new Date(reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-8 md:mt-12 gap-6 pt-8 border-t border-slate-50">
        <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <VoiceInterface onTranscriptionComplete={handleVoiceTranscription} isCompact={false} />
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={() => setShowWhiteboard(true)} className={`p-3 md:p-4 rounded-xl transition-all active-scale ${sketchData ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`} title="白板">
              <Icons.Pen />
            </button>
            <button onClick={handleRefine} disabled={!content.trim() || isRefining} className={`p-3 md:p-4 rounded-xl transition-all active-scale ${isRefining ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`} title="AI 润色">
              <Icons.Sparkles />
            </button>
            <div className="relative">
              <button onClick={() => dateInputRef.current?.showPicker()} className={`p-3 md:p-4 rounded-xl transition-all active-scale ${dueDate ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}>
                <Icons.Calendar />
              </button>
              <input ref={dateInputRef} type="date" className="absolute opacity-0 w-0 h-0" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="relative">
              <button onClick={() => reminderInputRef.current?.showPicker()} className={`p-3 md:p-4 rounded-xl transition-all active-scale ${reminderAt ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}>
                <Icons.Clock />
              </button>
              <input ref={reminderInputRef} type="datetime-local" className="absolute opacity-0 w-0 h-0" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={(!content.trim() && !sketchData) || isProcessing}
          className={`w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 md:py-5 rounded-[24px] md:rounded-[30px] font-black text-xs uppercase tracking-widest transition-all active-scale ${
            isProcessing || (!content.trim() && !sketchData) ? 'bg-slate-50 text-slate-300' : 'bg-slate-900 text-white shadow-xl'
          }`}
        >
          {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "完成并保存"}
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
