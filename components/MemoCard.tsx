
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
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: 'Kore' } 
            } 
          } 
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        initAudioContext();
        const decoded = await decodeAudioData(decode(base64Audio), audioContextRef.current!, 24000, 1);
        setAudioBuffer(decoded);
        startPlayback(decoded, 0);
      } else {
        setTtsStatus('idle');
      }
    } catch (error) { 
      console.error("TTS generation failed:", error);
      setTtsStatus('idle'); 
    }
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
    <div className={`memo-card group relative rounded-[42px] overflow-hidden ${isExpanded ? 'p-12' : 'p-10'}`}>
      {isTodo && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-50">
          <div className="h-full assistant-gradient transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.2)]" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
           <div className="px-5 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {new Date(memo.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
           </div>
           {memo.isFavorite && <div className="text-amber-400 drop-shadow-sm"><Icons.Star filled /></div>}
           {memo.type === 'todo' && (
             <div className="text-indigo-600 px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100/50 text-[10px] font-black uppercase tracking-widest">Active Task</div>
           )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
           <button onClick={handleTTSToggle} className={`p-3.5 rounded-2xl transition-all shadow-sm active:scale-90 ${ttsStatus === 'playing' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
             {ttsStatus === 'loading' ? <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div> : ttsStatus === 'playing' ? <Icons.Pause /> : <Icons.Play />}
           </button>
           <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-3.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all active:scale-90">
             {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
           </button>
        </div>
      </div>

      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <p className={`text-slate-900 font-bold leading-[1.6] whitespace-pre-wrap transition-all tracking-tight ${isExpanded ? 'text-3xl md:text-4xl' : 'text-xl line-clamp-2'}`}>
          {memo.content}
        </p>

        {isExpanded && memo.todos && memo.todos.length > 0 && (
          <div className="mt-14 space-y-6">
            <div className="flex items-center gap-5 mb-10">
              <div className="h-[1px] flex-1 bg-slate-100" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Checklist</p>
              <div className="h-[1px] flex-1 bg-slate-100" />
            </div>
            {memo.todos.map(todo => (
              <div 
                key={todo.id} 
                className={`group/item flex items-center gap-6 p-7 rounded-[32px] border transition-all ${
                  todo.completed 
                  ? 'bg-slate-50/50 border-transparent opacity-60' 
                  : 'bg-white border-slate-100 shadow-sm hover:border-indigo-200 hover:translate-x-1'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={todo.completed} 
                    onChange={() => toggleTodo(todo.id)}
                    className="peer w-8 h-8 rounded-2xl border-2 border-slate-200 text-indigo-600 focus:ring-0 cursor-pointer appearance-none transition-all checked:bg-indigo-600 checked:border-indigo-600"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100">
                    <Icons.CheckCircle />
                  </div>
                </div>
                <span className={`flex-1 text-[17px] font-bold transition-all ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {todo.text}
                </span>
                {!todo.completed && (
                  <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl border ${
                    todo.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-100' : 
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

        <div className={`mt-14 pt-12 border-t border-slate-50 flex flex-wrap items-center justify-between gap-10 transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <div className="flex flex-wrap gap-3">
            {memo.tags.map(tag => (
              <button 
                key={tag} 
                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                className="text-[10px] font-black text-slate-500 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all uppercase tracking-widest active:scale-95 shadow-sm"
              >
                #{tag}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-5">
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...memo, isFavorite: !memo.isFavorite }); }}
              className={`p-4.5 rounded-[24px] transition-all active:scale-90 ${memo.isFavorite ? 'text-amber-500 bg-amber-50 border border-amber-200 shadow-xl shadow-amber-200/20' : 'text-slate-300 bg-slate-50 border border-slate-100 hover:bg-white hover:text-amber-400'}`}
            >
              <Icons.Star filled={memo.isFavorite} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(memo.id); }}
              className="p-4.5 text-slate-300 bg-slate-50 border border-slate-100 hover:text-white hover:bg-rose-500 hover:border-rose-500 rounded-[24px] transition-all active:scale-90"
            >
              <Icons.Trash />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoCard;
