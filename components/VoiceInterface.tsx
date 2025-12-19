
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Icons } from '../constants.js';

interface VoiceInterfaceProps {
  onTranscriptionComplete: (text: string) => void;
  isCompact?: boolean;
}

/**
 * Encodes Uint8Array to Base64 string.
 * Using a manual loop to avoid stack limits on large arrays.
 */
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Creates a PCM blob from Float32Array audio data.
 */
function createAudioBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to prevent distortion
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onTranscriptionComplete, isCompact = true }) => {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionBufferRef = useRef('');
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const stopListening = useCallback(() => {
    setIsListening(false);
    
    // Cleanup script processor first
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // Close session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try { session.close(); } catch (e) {}
      });
      sessionPromiseRef.current = null;
    }

    // Finalize transcription
    if (transcriptionBufferRef.current.trim()) {
      onTranscriptionComplete(transcriptionBufferRef.current.trim());
    }
    
    transcriptionBufferRef.current = '';
    setCurrentTranscription('');
    
    // Stop tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, [onTranscriptionComplete]);

  const startListening = async () => {
    try {
      setIsListening(true);
      setCurrentTranscription('正在启动...');
      transcriptionBufferRef.current = '';

      // Initialize AI Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Request Microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Audio Context
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 16000 
      });
      audioContextRef.current = inputAudioContext;
      
      // Mandatory: AudioContext must be resumed after a user gesture
      if (inputAudioContext.state === 'suspended') {
        await inputAudioContext.resume();
      }

      // Connect to Gemini Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setCurrentTranscription('正在倾听...');
            
            // Start streaming audio
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const pcmBlob = createAudioBlob(inputData);
              
              // Only send if session is ready
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(err => {
                console.error("Failed to send audio chunk", err);
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle transcriptions of user's audio
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              transcriptionBufferRef.current += text;
              setCurrentTranscription(prev => 
                (prev === '正在倾听...' || prev === '正在启动...' || prev === 'Connecting...') ? text : prev + text
              );
            }
            
            // Turn complete is a good place to do partial commits if needed, 
            // but we'll wait for manual stop as per this app's design.
            if (message.serverContent?.turnComplete) {
              console.log("Turn finalized");
            }
          },
          onerror: (e) => {
            console.error('Live session error:', e);
            stopListening();
          },
          onclose: (e) => {
            console.log('Live session closed');
            setIsListening(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, // Required for speech-to-text
          systemInstruction: '你是一个高效的备忘录转写助手。请将用户的每一句话准确转写为文字。不需要回复用户，也不需要总结，只需要输出听到的原话。',
        },
      });

      sessionPromiseRef.current = sessionPromise;

      sessionPromise.catch(err => {
        console.error("Could not establish AI connection", err);
        setCurrentTranscription('连接失败，请重试');
        setTimeout(stopListening, 2000);
      });

    } catch (err) {
      console.error('Failed to initialize microphone or AI session', err);
      setIsListening(false);
      setCurrentTranscription('启动失败，请检查麦克风权限');
    }
  };

  return (
    <div className="flex items-center">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold active:scale-95 ${
          isListening 
            ? 'bg-rose-500 text-white animate-pulse shadow-xl shadow-rose-200' 
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
        }`}
        title={isListening ? "停止录音" : "语音输入"}
      >
        <Icons.Mic />
        {!isCompact && <span>{isListening ? '停止' : '语音输入'}</span>}
      </button>
      
      {isListening && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-end justify-center pb-24 px-4 z-[210] pointer-events-none">
          <div className="w-full max-w-xl bg-white p-8 rounded-[40px] shadow-2xl border border-indigo-50 pointer-events-auto animate-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                智能听写中
              </div>
              <button 
                onClick={stopListening}
                className="text-[10px] bg-slate-900 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest active:scale-90 transition-all shadow-lg"
              >
                结束并保存
              </button>
            </div>
            <div className="min-h-[100px] max-h-[300px] overflow-y-auto no-scrollbar scroll-smooth">
              <p className="text-slate-800 text-xl md:text-2xl leading-relaxed font-black tracking-tight">
                {currentTranscription || "等待语音输入..."}
              </p>
            </div>
            <div className="mt-8 flex justify-center items-end gap-1.5 h-12">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 bg-indigo-400 rounded-full animate-pulse transition-all" 
                  style={{ 
                    height: `${Math.random() * 80 + 20}%`,
                    animationDelay: `${i * 0.08}s`,
                    opacity: 0.3 + (Math.random() * 0.7)
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
