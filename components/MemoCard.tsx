
import React, { useState, useRef, useEffect } from 'react';
import { Memo, Priority } from '../types';
import { Icons } from '../constants';
import { GoogleGenAI, Modality } from "@google/genai";

interface MemoCardProps {
  memo: Memo;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const MemoCard: React.FC<MemoCardProps> = ({ memo, onUpdate, onDelete, onTagClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const pausedAtRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => { return () => stopAudio(); }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  };

  const handleTTSToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ttsStatus === 'playing') { pauseAudio(); return; }
    if (ttsStatus === 'paused' || audioBuffer) { playAudio(); return; }

    setTtsStatus('loading');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: memo.content }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        initAudioContext();
        const decoded = await decodeAudioData(decode(base64Audio), audioContextRef.current!, 24000, 1);
        setAudioBuffer(decoded);
        startPlayback(decoded, 0);
      }
    } catch (error) { setTtsStatus('idle'); }
  };

  const startPlayback = (buffer: AudioBuffer, offset: number) => {
    initAudioContext();
    const source = audioContextRef.current!.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current!.destination);
    source.onended = () => { if (sourceRef.current === source && ttsStatus !== 'paused') { setTtsStatus('idle'); pausedAtRef.current = 0; } };
    source.start(0, offset);
    sourceRef.current = source;
    startTimeRef.current = audioContextRef.current!.currentTime - offset;
    setTtsStatus('playing');
  };

  const playAudio = () => audioBuffer && startPlayback(audioBuffer, pausedAtRef.current);
  const pauseAudio = () => { if (sourceRef.current && audioContextRef.current) { sourceRef.current.onended = null; sourceRef.current.stop(); pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current; sourceRef.current = null; setTtsStatus('paused'); } };
  const stopAudio = () => { if (sourceRef.current) { sourceRef.current.onended = null; sourceRef.current.stop(); sourceRef.current = null; } setTtsStatus('idle'); };

  const toggleTodo = (id: string) => {
    const newTodos = memo.todos?.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    onUpdate({ ...memo, todos: newTodos });
  };

  const isTodo = memo.type === 'todo';
  const progress = memo.todos && memo.todos.length > 0 
    ? (memo.todos.filter(t => t.completed).length / memo.todos.length) * 100 
    : 0;

  return (
    <div 
      className={`memo-card rounded-[32px] overflow-hidden ${
        isExpanded ? 'p-6 md:p-8' : 'p-5 md:p-6'
      }`}
    >
      {/* 顶部进度条 (仅 Todo) */}
      {isTodo && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-50">
          <div className="h-full assistant-gradient transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 uppercase tracking-widest">
            {new Date(memo.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
           </span>
           {memo.isFavorite && <div className="text-amber-400"><Icons.Star filled /></div>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
           <button onClick={handleTTSToggle} className={`p-2 rounded-xl transition-all ${ttsStatus === 'playing' ? 'bg-sky-50 text-sky-600' : 'text-slate-300 hover:text-sky-500'}`}>
             {ttsStatus === 'loading' ? <div className="w-4 h-4 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div> : ttsStatus === 'playing' ? <Icons.Pause /> : <Icons.Play />}
           </button>
           <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-2 text-slate-300">
             {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <p className={`text-slate-800 font-medium leading-relaxed whitespace-pre-wrap ${isExpanded ? 'text-lg md:text-xl' : 'text-base line-clamp-2'}`}>
          {memo.content}
        </p>

        {isExpanded && memo.todos && memo.todos.length > 0 && (
          <div className="mt-8 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Action Items</p>
            {memo.todos.map(todo => (
              <div 
                key={todo.id} 
                className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all ${
                  todo.completed ? 'bg-slate-50/80 border-slate-50 opacity-50' : 'bg-white border-slate-100 shadow-sm'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <input 
                  type="checkbox" 
                  checked={todo.completed} 
                  onChange={() => toggleTodo(todo.id)}
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-sky-600 focus:ring-0 cursor-pointer"
                />
                <span className={`flex-1 text-sm font-bold ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {todo.text}
                </span>
                {!todo.completed && (
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${
                    todo.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                    todo.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {todo.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {isExpanded && (
          <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {memo.tags.map(tag => (
                <button 
                  key={tag} 
                  onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                  className="text-[10px] font-black text-sky-600 bg-sky-50 px-3.5 py-1.5 rounded-xl border border-sky-100/50 hover:bg-sky-100 transition-colors"
                >
                  #{tag.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdate({ ...memo, isFavorite: !memo.isFavorite }); }}
                className={`p-2 rounded-xl transition-all ${memo.isFavorite ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:bg-slate-50'}`}
              >
                <Icons.Star filled={memo.isFavorite} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(memo.id); }}
                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Icons.Trash />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoCard;
