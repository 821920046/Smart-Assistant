import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants.js';

const FocusMode: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'short-break' | 'long-break'>('focus');

  const modes = {
    'focus': { label: 'Focus', minutes: 25 },
    'short-break': { label: 'Short Break', minutes: 5 },
    'long-break': { label: 'Long Break', minutes: 15 },
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play sound or notification here
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(modes[mode].minutes * 60);
  };

  const changeMode = (newMode: 'focus' | 'short-break' | 'long-break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(modes[newMode].minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((modes[mode].minutes * 60 - timeLeft) / (modes[mode].minutes * 60)) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] w-full max-w-2xl mx-auto p-8">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-12 w-full text-center border border-white/20">
        <div className="flex justify-center gap-4 mb-12">
          {Object.entries(modes).map(([key, value]) => (
            <button
              key={key}
              onClick={() => changeMode(key as any)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                mode === key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {value.label}
            </button>
          ))}
        </div>

        <div className="relative w-72 h-72 mx-auto mb-12">
          {/* Progress Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="144"
              cy="144"
              r="136"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-100"
            />
            <circle
              cx="144"
              cy="144"
              r="136"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 136}
              strokeDashoffset={2 * Math.PI * 136 * (1 - progress / 100)}
              className="text-blue-600 transition-all duration-1000 ease-linear"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-7xl font-bold text-slate-800 tracking-tighter">
              {formatTime(timeLeft)}
            </div>
            <div className="text-slate-500 mt-2 font-medium uppercase tracking-widest text-sm">
              {isActive ? 'Running' : 'Paused'}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button
            onClick={toggleTimer}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isActive
                ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                : 'bg-blue-600 text-white shadow-xl shadow-blue-200 hover:scale-105 hover:bg-blue-700'
            }`}
          >
            {isActive ? <Icons.Pause /> : <Icons.Play />}
          </button>
          <button
            onClick={resetTimer}
            className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-all"
          >
            <Icons.Stop />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusMode;
