
import React, { useState, useRef, useEffect } from 'react';
import { Memo, Priority } from '../types.js';
import { Icons } from '../constants.js';
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
    
    const speakableContent = memo.content.replace(/\[手绘内容\]/g, '').trim();
    if (!speakableContent) return;

    setTtsStatus('loading');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read the following text clearly: ${speakableContent}` }] }],
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { 
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
          } 
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (base64Audio) {
        initAudioContext();
        const decoded = await decodeAudioData(decode(base64Audio), audioContextRef.current!, 24000, 1);
        setAudioBuffer(decoded);
        startPlayback(decoded, 0);
      } else {
        setTtsStatus('idle');
      }
    } catch (error) { 
      setTtsStatus('idle'); 
    }
  };

  const startPlayback = (buffer: AudioBuffer, offset: number) => {
    initAudioContext();
    const source = audioContextRef.current!.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current!.destination);
    source.onended = () => { 
      if (sourceRef.current === source && ttsStatus !== 'paused') { 
        setTtsStatus('idle'); 
        pausedAtRef.current = 0; 
      } 
    };
    source.start(0, offset);
    sourceRef.current = source;
    startTimeRef.current = audioContextRef.current!.currentTime - offset;
    setTtsStatus('playing');
  };

  const playAudio = () => audioBuffer && startPlayback(audioBuffer, pausedAtRef.current);
  const pauseAudio = () => { if (sourceRef.current && audioContextRef.current) { sourceRef.current.onended = null; sourceRef.current.stop(); pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current; sourceRef.current = null; setTtsStatus('paused'); } };
  const stopAudio = () => { if (sourceRef.current) { sourceRef.current.onended = null; sourceRef.current.stop(); sourceRef.current = null; } setTtsStatus('idle'); };

  const isTodo = memo.type === 'todo';
  const progress = memo.todos && memo.todos.length > 0 ? (memo.todos.filter(t => t.completed).length / memo.todos.length) * 100 : 0;

  return (
    <div className={`memo-card group relative rounded-[32px] md:rounded-[42px] overflow-hidden transition-all active:scale-[0.99] md:active:scale-100 ${isExpanded ? 'p-6 md:p-12' : 'p-5 md:p-10'}`}>
      {isTodo && (
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
          <div className="h-full assistant-gradient transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(99,102,241,0.3)]" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between mb-6 md:mb-10">
        <div className="flex items-center gap-2.5">
           <div className="px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {new Date(memo.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
           </div>
           {memo.isFavorite && <div className="text-amber-400"><Icons.Star filled /></div>}
        </div>
        <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
           <button onClick={handleTTSToggle} className={`p-2.5 md:p-3.5 rounded-xl transition-all active-scale ${ttsStatus === 'playing' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:text-indigo-600'}`}>
             {ttsStatus === 'loading' ? <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div> : ttsStatus === 'playing' ? <Icons.Pause /> : <Icons.Play />}
           </button>
           <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-2.5 md:p-3.5 text-slate-300 rounded-xl active-scale">
             {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
           </button>
        </div>
      </div>

      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        {memo.sketchData && (
          <div className={`mb-6 rounded-2xl md:rounded-[32px] overflow-hidden border border-slate-50 bg-slate-50/20 transition-all ${isExpanded ? 'scale-100' : 'scale-[0.98]'}`}>
            <img src={memo.sketchData} className="w-full h-auto object-contain max-h-[300px] md:max-h-[500px]" alt="Sketch" />
          </div>
        )}

        <p className={`text-slate-800 font-bold leading-snug md:leading-relaxed whitespace-pre-wrap transition-all tracking-tight ${isExpanded ? 'text-lg md:text-2xl' : 'text-[15px] md:text-xl line-clamp-2'}`}>
          {memo.content === '[手绘内容]' && memo.sketchData ? '' : memo.content}
        </p>

        {isExpanded && memo.todos && memo.todos.length > 0 && (
          <div className="mt-8 md:mt-14 space-y-4 md:space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] flex-1 bg-slate-100" />
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Tasks</p>
              <div className="h-[1px] flex-1 bg-slate-100" />
            </div>
            {memo.todos.map(todo => (
              <div 
                key={todo.id} 
                className={`flex items-center gap-4 p-4 md:p-7 rounded-[24px] md:rounded-[32px] border transition-all active-scale ${
                  todo.completed ? 'bg-slate-50/30 border-transparent opacity-60' : 'bg-white border-slate-50 shadow-sm'
                }`}
                onClick={(e) => { e.stopPropagation(); onUpdate({ ...memo, todos: memo.todos?.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t) }); }}
              >
                <div className="relative flex-shrink-0">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>
                    {todo.completed && <Icons.CheckCircle />}
                  </div>
                </div>
                <span className={`flex-1 text-sm md:text-lg font-bold transition-all ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={`mt-8 md:mt-14 pt-6 md:pt-12 border-t border-slate-50 flex flex-wrap items-center justify-between gap-6 transition-all ${isExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
          <div className="flex flex-wrap gap-2">
            {memo.tags.map(tag => (
              <button 
                key={tag} 
                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                className="text-[9px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-xl transition-all active-scale uppercase tracking-wider"
              >
                #{tag}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...memo, isFavorite: !memo.isFavorite }); }}
              className={`p-3 rounded-xl transition-all active-scale ${memo.isFavorite ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-400'}`}
            >
              <Icons.Star filled={memo.isFavorite} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(memo.id); }}
              className="p-3 text-slate-300 hover:text-rose-500 rounded-xl transition-all active-scale"
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
