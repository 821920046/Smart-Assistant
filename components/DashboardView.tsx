import React, { useEffect } from 'react';
import { Memo } from '../types';
import { Icons } from '../constants';
import { Gauge } from './Gauge';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { storage } from '../services/storage';

interface DashboardViewProps {
  memos: Memo[];
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onAdd: (memo: Partial<Memo>) => void;
  onNavigate: (view: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ memos, onUpdate, onDelete, onAdd, onNavigate }) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording
  } = useAudioRecorder();

  // Handle Audio Save
  useEffect(() => {
    const saveVoiceNote = async () => {
      if (audioBlob) {
        try {
          const audioId = await storage.saveAudio(audioBlob);
          onAdd({
            content: 'Voice Note',
            type: 'memo',
            source: 'voice',
            audio: {
              id: audioId,
              duration: recordingTime
            }
          });
          resetRecording();
        } catch (error) {
          console.error('Failed to save voice note:', error);
        }
      }
    };
    saveVoiceNote();
  }, [audioBlob, onAdd, recordingTime, resetRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // --- 1. Tasks Data ---
  // Active todos (not archived, not deleted)
  const activeTodos = memos.filter(m => m.type === 'todo' && !m.isArchived && !m.isDeleted);
  // Completed today (archived today)
  const completedToday = memos.filter(m => m.type === 'todo' && m.isArchived && m.completedAt && m.completedAt >= todayStart).length;
  const totalToday = activeTodos.length + completedToday;
  const completionRate = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

  // --- 2. Pressure Data ---
  // Important & Active
  const importantCount = activeTodos.filter(m => m.priority === 'important').length;
  let pressureStatus = { text: "All under control", color: "#22C55E" }; // Green
  if (importantCount > 3) {
    pressureStatus = { text: "High pressure", color: "#EF4444" }; // Red
  } else if (importantCount > 0) {
    pressureStatus = { text: "Need attention", color: "#F59E0B" }; // Orange
  }

  // --- 3. Trend Data ---
  const completedYesterday = memos.filter(m => 
    m.type === 'todo' && m.isArchived && m.completedAt && m.completedAt >= yesterdayStart && m.completedAt < todayStart
  ).length;
  
  const trendDiff = completedToday - completedYesterday;
  const trendDirection = trendDiff > 0 ? 'up' : trendDiff < 0 ? 'down' : 'neutral';

  // --- 4. Voice Data ---
  const audioMemos = memos.filter(m => (m.audio || m.source === 'voice') && !m.isDeleted);
  const voiceTodayCount = audioMemos.filter(m => m.createdAt >= todayStart).length;
  const voiceTotalCount = audioMemos.length;
  
  const lastVoiceMemo = audioMemos.length > 0 
    ? audioMemos.reduce((prev, current) => (prev.createdAt > current.createdAt) ? prev : current)
    : null;

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return 'Days ago';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{getGreeting()}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Here's your daily summary.
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('tasks')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            <Icons.Plus className="w-5 h-5" />
            <span>New Task</span>
          </button>
          <button 
            onClick={() => onNavigate('notes')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl font-semibold transition-all active:scale-95"
          >
            <Icons.FileText className="w-5 h-5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Task Completion Gauge */}
        <Gauge 
          title="Today's Progress" 
          value={completedToday} 
          max={totalToday || 1} 
          color="#6366F1" // Indigo
          centerContent={
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800 dark:text-white">
                {completionRate}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                COMPLETED
              </div>
            </div>
          }
          footerContent={
            <div className="flex items-center justify-between px-2 mt-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {completedToday} / {totalToday} Tasks
              </span>
              <div className={`flex items-center text-xs font-bold ${
                trendDirection === 'up' ? 'text-green-500' : 
                trendDirection === 'down' ? 'text-red-500' : 'text-slate-400'
              }`}>
                {trendDirection === 'up' && <Icons.ChevronUp className="w-3 h-3 mr-0.5" />}
                {trendDirection === 'down' && <Icons.ChevronDown className="w-3 h-3 mr-0.5" />}
                vs Yesterday
              </div>
            </div>
          }
        />

        {/* 2. Pressure Gauge */}
        <Gauge 
          title="Workload Pressure" 
          value={importantCount} 
          max={10} // Visual max
          color={pressureStatus.color}
          centerContent={
            <div className="text-center">
              <div className="text-4xl font-bold" style={{ color: pressureStatus.color }}>
                {importantCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase">
                Important
              </div>
            </div>
          }
          footerContent={
            <div className="text-center mt-2">
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/50" style={{ color: pressureStatus.color }}>
                {pressureStatus.text}
              </span>
            </div>
          }
        />

        {/* 3. Voice Notes Stats & Input */}
        <Gauge 
          title={isRecording ? "Recording..." : "Voice Notes"}
          value={isRecording ? recordingTime : voiceTodayCount} 
          max={isRecording ? 60 : Math.max(voiceTodayCount * 1.5, 10)} 
          color={isRecording ? "#EF4444" : "#F43F5E"} // Red when recording
          centerContent={
            <div className="text-center">
              {isRecording ? (
                <div className="animate-pulse">
                  <div className="text-3xl font-bold text-red-500">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-xs text-red-400 font-medium mt-1">
                    RECORDING
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-slate-800 dark:text-white">
                    {voiceTodayCount}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    TODAY
                  </div>
                </>
              )}
            </div>
          }
          footerContent={
            <div className="flex flex-col items-center gap-2 mt-1">
              {!isRecording && (
                <div className="w-full flex justify-between px-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex flex-col items-start">
                     <span className="text-xs text-slate-400">Total</span>
                     <span className="font-bold">{voiceTotalCount}</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-xs text-slate-400">Last</span>
                     <span className="text-xs">{lastVoiceMemo ? getTimeAgo(lastVoiceMemo.createdAt) : '-'}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleVoiceClick}
                className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  isRecording 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {isRecording ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-medium">Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Icons.Mic className="w-4 h-4" />
                    <span className="font-medium">Quick Record</span>
                  </>
                )}
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default DashboardView;
