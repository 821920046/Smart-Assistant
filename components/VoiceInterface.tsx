
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

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (transcriptionBufferRef.current.trim()) {
      onTranscriptionComplete(transcriptionBufferRef.current.trim());
    }
    transcriptionBufferRef.current = '';
    setCurrentTranscription('');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, [onTranscriptionComplete]);

  const startListening = async () => {
    try {
      setIsListening(true);
      setCurrentTranscription('Connecting...');
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
            setCurrentTranscription('Listening...');
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
                session.sendRealtimeInput({
                  media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              transcriptionBufferRef.current += text;
              setCurrentTranscription(prev => (prev === 'Listening...' || prev === 'Connecting...') ? text : prev + text);
            }
          },
          onerror: (e) => {
            console.error('Live error', e);
            stopListening();
          },
          onclose: () => setIsListening(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: 'You are a memo transcription assistant. Your only task is to transcribe the user audio accurately into text without adding any commentary.',
        },
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
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
        }`}
        title={isListening ? "Stop Recording" : "Record Voice Memo"}
      >
        <Icons.Mic />
        {!isCompact && <span>{isListening ? 'Stop' : 'Voice Memo'}</span>}
      </button>
      
      {isListening && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-end justify-center pb-24 px-4 z-50 pointer-events-none">
          <div className="w-full max-w-lg bg-white p-6 rounded-2xl shadow-2xl border border-indigo-100 pointer-events-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-widest">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Live Transcription
              </div>
              <button 
                onClick={stopListening}
                className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full font-bold text-slate-500 transition-colors"
              >
                DONE
              </button>
            </div>
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
              <p className="text-slate-700 text-lg leading-relaxed font-medium">
                {currentTranscription || "Start speaking clearly..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInterface;
