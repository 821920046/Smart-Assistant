
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
    <div className={`memo-card group relative rounded-[32px] overflow-hidden transition-all duration-500 ${isExpanded ? 'p-8 ring-1 ring-sky-500/10' : 'p-6'}`}>
      {isTodo && (
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
          <div className="h-full assistant-gradient transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(14,165,233,0.4)]" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
           <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {new Date(memo.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
           </div>
           {memo.isFavorite && <div className="text-amber-500 animate-pulse"><Icons.Star filled /></div>}
           {memo.type === 'todo' && (
             <div className="text-sky-600 px-2 py-1 rounded-md bg-sky-50 text-[9px] font-black uppercase tracking-wider">Task</div>
           )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 md:transition-opacity">
           <button onClick={handleTTSToggle} className={`p-2.5 rounded-xl transition-all ${ttsStatus === 'playing' ? 'bg-sky-50 text-sky-600' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}>
             {ttsStatus === 'loading' ? <div className="w-4 h-4 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div> : ttsStatus === 'playing' ? <Icons.Pause /> : <Icons.Play />}
           </button>
           <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-2.5 text-slate-400 hover:text-slate-900 transition-all">
             {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
           </button>
        </div>
      </div>

      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <p className={`text-slate-900 font-semibold leading-[1.6] whitespace-pre-wrap transition-all ${isExpanded ? 'text-xl md:text-2xl tracking-tight' : 'text-base line-clamp-2'}`}>
          {memo.content}
        </p>

        {isExpanded && memo.todos && memo.todos.length > 0 && (
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-[1px] flex-1 bg-slate-100" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">代办清单</p>
              <div className="h-[1px] flex-1 bg-slate-100" />
            </div>
            {memo.todos.map(todo => (
              <div 
                key={todo.id} 
                className={`group/item flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                  todo.completed 
                  ? 'bg-slate-50/50 border-slate-50 opacity-60' 
                  : 'bg-white border-slate-100 shadow-sm hover:border-sky-200'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={todo.completed} 
                    onChange={() => toggleTodo(todo.id)}
                    className="peer w-6 h-6 rounded-lg border-2 border-slate-200 text-sky-600 focus:ring-0 cursor-pointer appearance-none transition-all checked:bg-sky-500 checked:border-sky-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100">
                    <Icons.CheckCircle />
                  </div>
                </div>
                <span className={`flex-1 text-[15px] font-bold transition-all ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {todo.text}
                </span>
                {!todo.completed && (
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border shadow-sm ${
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

        <div className={`mt-10 pt-8 border-t border-slate-50 flex flex-wrap items-center justify-between gap-6 transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <div className="flex flex-wrap gap-2">
            {memo.tags.map(tag => (
              <button 
                key={tag} 
                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                className="text-[10px] font-black text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all uppercase tracking-wider"
              >
                #{tag}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...memo, isFavorite: !memo.isFavorite }); }}
              className={`p-3 rounded-2xl transition-all shadow-sm ${memo.isFavorite ? 'text-amber-500 bg-amber-50 border border-amber-100' : 'text-slate-400 bg-white border border-slate-100 hover:bg-slate-50'}`}
            >
              <Icons.Star filled={memo.isFavorite} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(memo.id); }}
              className="p-3 text-slate-400 bg-white border border-slate-100 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-2xl transition-all shadow-sm"
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
