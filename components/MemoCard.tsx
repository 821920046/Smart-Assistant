
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

// Helper functions for audio processing as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const MemoCard: React.FC<MemoCardProps> = ({ memo, onUpdate, onDelete, onTagClick }) => {
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [lastToggledId, setLastToggledId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  const speeds = [0.75, 1, 1.25, 1.5];

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    if (sourceRef.current && audioContextRef.current) {
      const currentPos = (audioContextRef.current.currentTime - startTimeRef.current) * playbackRate;
      sourceRef.current.playbackRate.value = nextSpeed;
      startTimeRef.current = audioContextRef.current.currentTime - (currentPos / nextSpeed);
    }
    setPlaybackRate(nextSpeed);
  };

  const handleTTSToggle = async () => {
    if (ttsStatus === 'playing') {
      pauseAudio();
      return;
    }

    if (ttsStatus === 'paused' || audioBuffer) {
      playAudio();
      return;
    }

    // Initial Fetch
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
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        initAudioContext();
        const decodedBuffer = await decodeAudioData(
          decode(base64Audio),
          audioContextRef.current!,
          24000,
          1
        );
        setAudioBuffer(decodedBuffer);
        startPlayback(decodedBuffer, 0);
      } else {
        setTtsStatus('idle');
      }
    } catch (error) {
      console.error("TTS failed:", error);
      setTtsStatus('idle');
    }
  };

  const startPlayback = (buffer: AudioBuffer, offset: number) => {
    initAudioContext();
    const source = audioContextRef.current!.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(audioContextRef.current!.destination);
    
    source.onended = () => {
      if (sourceRef.current === source) {
        setTtsStatus('idle');
        pausedAtRef.current = 0;
      }
    };

    source.start(0, offset);
    sourceRef.current = source;
    startTimeRef.current = audioContextRef.current!.currentTime - (offset / playbackRate);
    setTtsStatus('playing');
  };

  const playAudio = () => {
    if (!audioBuffer) return;
    startPlayback(audioBuffer, pausedAtRef.current);
  };

  const pauseAudio = () => {
    if (sourceRef.current && audioContextRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
      pausedAtRef.current = (audioContextRef.current.currentTime - startTimeRef.current) * playbackRate;
      setTtsStatus('paused');
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    pausedAtRef.current = 0;
    setTtsStatus('idle');
  };

  const toggleTodo = (todoId: string) => {
    if (!memo.todos) return;
    setLastToggledId(todoId);
    setTimeout(() => setLastToggledId(null), 500);
    const newTodos = memo.todos.map(t => 
      t.id === todoId ? { ...t, completed: !t.completed } : t
    );
    onUpdate({ ...memo, todos: newTodos });
  };

  const changePriority = (todoId: string, newPriority: Priority) => {
    if (!memo.todos) return;
    const newTodos = memo.todos.map(t => 
      t.id === todoId ? { ...t, priority: newPriority } : t
    );
    onUpdate({ ...memo, todos: newTodos });
  };

  const toggleFavorite = () => onUpdate({ ...memo, isFavorite: !memo.isFavorite });
  const toggleArchive = () => onUpdate({ ...memo, isArchived: !memo.isArchived });

  const priorityStyles = {
    high: { accent: 'bg-rose-500', container: 'bg-rose-50/30 border-rose-100/50', badge: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200', checkbox: 'text-rose-600 focus:ring-rose-500 border-rose-300' },
    medium: { accent: 'bg-amber-500', container: 'bg-amber-50/30 border-amber-100/50', badge: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200', checkbox: 'text-amber-600 focus:ring-amber-500 border-amber-300' },
    low: { accent: 'bg-emerald-500', container: 'bg-emerald-50/30 border-emerald-100/50', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200', checkbox: 'text-emerald-600 focus:ring-emerald-500 border-emerald-300' },
  };

  const isOverdue = memo.dueDate && memo.dueDate < Date.now() && !memo.todos?.every(t => t.completed);
  
  const progress = memo.todos && memo.todos.length > 0 
    ? Math.round((memo.todos.filter(t => t.completed).length / memo.todos.length) * 100) 
    : 0;

  return (
    <div className={`bg-white rounded-[24px] p-7 border group transition-all duration-300 memo-card-shadow relative overflow-hidden ${isOverdue ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'}`}>
      {memo.todos && memo.todos.length > 0 && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-50">
          <div 
            className="h-full assistant-gradient transition-all duration-700 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}

      {isOverdue && (
        <div className="absolute top-0 right-0">
          <div className="bg-rose-500 text-white text-[8px] font-black px-4 py-1 uppercase tracking-widest rotate-45 translate-x-3 translate-y-1 shadow-sm">
            过期
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-6 pt-1">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              {new Date(memo.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}
            </span>
            {memo.dueDate && (
              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${isOverdue ? 'text-rose-600 bg-rose-50 border-rose-200 shadow-sm shadow-rose-100' : 'text-sky-600 bg-sky-50 border-sky-100'}`}>
                <Icons.Calendar />
                {new Date(memo.dueDate).toLocaleDateString().toUpperCase()}
              </div>
            )}
            {memo.todos && memo.todos.length > 0 && (
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                {progress}%
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
          {/* Enhanced TTS Controls */}
          <div className="flex items-center bg-slate-50 rounded-xl px-1 mr-1">
            {ttsStatus === 'loading' ? (
              <div className="p-2 animate-spin text-sky-500">
                <div className="w-4 h-4 border-2 border-sky-500/20 border-t-sky-500 rounded-full"></div>
              </div>
            ) : (
              <div className="flex items-center">
                {/* Unified Play/Pause Button */}
                <button 
                  onClick={handleTTSToggle} 
                  className={`p-2 rounded-xl transition-all duration-300 ${ttsStatus === 'playing' ? 'text-sky-600 bg-sky-50 scale-110' : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50'}`}
                  title={ttsStatus === 'playing' ? "暂停播放" : ttsStatus === 'paused' ? "继续播放" : "语音朗读"}
                >
                  {ttsStatus === 'playing' ? <Icons.Pause /> : <Icons.Play />}
                </button>
                
                {/* Additional Controls visible only when active */}
                {(ttsStatus === 'playing' || ttsStatus === 'paused') && (
                  <>
                    <button onClick={stopAudio} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="停止播放">
                      <Icons.Stop />
                    </button>
                    <button 
                      onClick={cycleSpeed}
                      className="px-2 py-1 text-[9px] font-black text-sky-600 bg-sky-50 rounded-lg transition-colors border-l border-white ml-1 hover:bg-sky-100"
                      title="调整语速"
                    >
                      {playbackRate}x
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <button onClick={toggleFavorite} className="p-2 rounded-xl hover:bg-slate-50 transition-colors" title="收藏">
            <Icons.Star filled={memo.isFavorite} />
          </button>
          <button onClick={toggleArchive} className="p-2 rounded-xl hover:bg-slate-50 transition-colors" title="归档">
            <Icons.Archive />
          </button>
          <button onClick={() => onDelete(memo.id)} className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors" title="删除">
            <Icons.Trash />
          </button>
        </div>
      </div>

      <div className="text-slate-800 text-lg font-medium leading-relaxed mb-6 whitespace-pre-wrap">
        {memo.content}
        {ttsStatus === 'playing' && (
          <span className="inline-flex gap-0.5 ml-2 h-3 items-end overflow-hidden">
            <span className="w-0.5 bg-sky-400 animate-[bounce_0.8s_infinite] h-full"></span>
            <span className="w-0.5 bg-sky-400 animate-[bounce_1.2s_infinite] h-2/3"></span>
            <span className="w-0.5 bg-sky-400 animate-[bounce_1s_infinite] h-1/2"></span>
          </span>
        )}
      </div>

      {memo.todos && memo.todos.length > 0 && (
        <div className="space-y-3 mb-6">
          {memo.todos.map(todo => {
            const style = priorityStyles[todo.priority];
            const itemIsOverdue = isOverdue && !todo.completed;
            const isJustToggled = lastToggledId === todo.id;
            
            return (
              <div 
                key={todo.id} 
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border ${
                  isJustToggled ? 'animate-springy' : ''
                } ${
                  todo.completed 
                    ? 'bg-slate-50/50 border-slate-100 opacity-60' 
                    : itemIsOverdue
                      ? 'bg-rose-50/60 border-rose-200 shadow-sm'
                      : `${style.container} border-transparent hover:shadow-sm`
                }`}
              >
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className={`h-5 w-5 rounded-lg border-2 transition-all cursor-pointer ${
                      todo.completed 
                        ? 'text-slate-300 border-slate-200 focus:ring-slate-200' 
                        : itemIsOverdue 
                          ? 'text-rose-600 border-rose-300 focus:ring-rose-500' 
                          : style.checkbox
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold transition-all duration-500 ${
                    todo.completed 
                      ? 'text-slate-400 font-medium line-through opacity-70' 
                      : itemIsOverdue ? 'text-rose-900' : 'text-slate-900'
                  }`}>
                    {todo.text}
                  </p>
                </div>
                
                {!todo.completed && (
                  <div className="flex items-center gap-2">
                    {itemIsOverdue && (
                      <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest bg-rose-100 px-1.5 py-1 rounded shadow-sm border border-rose-200">
                        过期
                      </span>
                    )}
                    <div className="relative group/priority">
                      <button className={`text-[9px] font-black uppercase tracking-tighter px-2.5 py-1.5 rounded-lg border transition-all ${style.badge}`}>
                        {todo.priority}
                      </button>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover/priority:flex gap-1 bg-white p-1 rounded-xl shadow-xl border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
                        {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => changePriority(todo.id, p)}
                            className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border transition-all ${
                              todo.priority === p 
                                ? priorityStyles[p].badge 
                                : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {memo.tags.map(tag => (
          <button 
            key={tag} 
            onClick={() => onTagClick?.(tag)}
            className="text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 cursor-pointer transition-all border border-slate-100"
          >
            #{tag.toUpperCase()}
          </button>
        ))}
        <div className="ml-auto flex items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
          #{memo.id.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default MemoCard;
