
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Icons } from '../constants';

interface VoiceInterfaceProps {
  onTranscriptionComplete: (text: string) => void;
  isCompact?: boolean;
}

// Manual encoding function as per guidelines to avoid stack overflow issues with large spreads
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onTranscriptionComplete, isCompact = true }) => {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionBufferRef = useRef('');
  const sessionRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    setIsListening(false);
    
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    if (transcriptionBufferRef.current.trim()) {
      onTranscriptionComplete(transcriptionBufferRef.current.trim());
    }
    
    transcriptionBufferRef.current = '';
    setCurrentTranscription('');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [onTranscriptionComplete]);

  const startListening = async () => {
    try {
      setIsListening(true);
      setCurrentTranscription('正在启动...');
      transcriptionBufferRef.current = '';

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setCurrentTranscription('正在倾听...');
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const base64 = encode(new Uint8Array(int16.buffer));
              
              sessionPromise.then(session => {
                sessionRef.current = session;
                session.sendRealtimeInput({
                  media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                });
              }).catch(err => {
                console.error("Realtime input failed", err);
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              transcriptionBufferRef.current += text;
              setCurrentTranscription(prev => 
                (prev === '正在倾听...' || prev === '正在启动...' || prev === 'Connecting...') ? text : prev + text
              );
            }
            
            if (message.serverContent?.turnComplete) {
              console.log("Turn complete");
            }
          },
          onerror: (e) => {
            console.error('Live error', e);
            stopListening();
          },
          onclose: () => {
            setIsListening(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: '你是一个备忘录听写助手。你的任务是准确地将用户的语音转换为文字，不要添加任何额外的评论或回复。',
        },
      });

      sessionPromise.catch(err => {
        console.error("Session connection failed", err);
        stopListening();
      });

    } catch (err) {
      console.error('Failed to start voice interface', err);
      setIsListening(false);
    }
  };

  return (
    <div className="flex items-center">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-medium ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
            : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
        }`}
        title={isListening ? "停止录音" : "语音记事"}
      >
        <Icons.Mic />
        {!isCompact && <span>{isListening ? '停止' : '语音记事'}</span>}
      </button>
      
      {isListening && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-end justify-center pb-24 px-4 z-[110] pointer-events-none">
          <div className="w-full max-w-lg bg-white p-6 rounded-[32px] shadow-2xl border border-sky-100 pointer-events-auto animate-card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 text-[10px] font-black text-sky-500 uppercase tracking-widest">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                正在实时转写
              </div>
              <button 
                onClick={stopListening}
                className="text-[10px] bg-slate-900 text-white px-4 py-1.5 rounded-full font-black uppercase tracking-widest active:scale-95 transition-transform"
              >
                完成
              </button>
            </div>
            <div className="max-h-[200px] overflow-y-auto no-scrollbar">
              <p className="text-slate-800 text-lg md:text-xl leading-relaxed font-bold italic">
                {currentTranscription || "请开始说话..."}
              </p>
            </div>
            <div className="mt-6 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i} 
                  className="w-1 bg-sky-400 rounded-full animate-pulse" 
                  style={{ 
                    height: `${Math.random() * 20 + 10}px`,
                    animationDelay: `${i * 0.1}s` 
                  }} 
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInterface;
