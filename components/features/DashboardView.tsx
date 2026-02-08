import React, { useEffect, useState } from 'react';
import { Icons } from '../../constants';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { storage } from '../../services/storage';
import { useStore } from '../../services/store';

const DashboardView: React.FC = () => {
    const { memos, addMemo, isSyncing } = useStore();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const {
        isRecording,
        recordingTime,
        audioBlob,
        startRecording,
        stopRecording,
        resetRecording
    } = useAudioRecorder();

    useEffect(() => {
        const saveVoiceNote = async () => {
            if (audioBlob) {
                try {
                    const audioId = await storage.saveAudio(audioBlob);
                    addMemo({
                        content: 'Voice Note',
                        type: 'memo',
                        // @ts-ignore - source is a custom field for tracking
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
    }, [audioBlob, addMemo, recordingTime, resetRecording]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVoiceClick = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const activeTodos = memos.filter(m => m.type === 'todo' && !m.isArchived);
    const completedToday = memos.filter(m => m.type === 'todo' && m.isArchived && m.completedAt && m.completedAt >= todayStart).length;
    const totalToday = activeTodos.length + completedToday;
    const completionRate = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

    const importantCount = activeTodos.filter(m => m.priority === 'important').length;
    let pressureStatus = { text: "All clear", color: "#10B981", bg: "from-emerald-500/10 to-teal-500/10" };
    if (importantCount > 3) pressureStatus = { text: "High load", color: "#EF4444", bg: "from-rose-500/10 to-red-500/10" };
    else if (importantCount > 0) pressureStatus = { text: "Active", color: "#F59E0B", bg: "from-amber-500/10 to-orange-500/10" };

    const getGreeting = () => {
        const hour = now.getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 shadow-2xl shadow-violet-500/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-violet-200 text-xs md:text-sm font-medium mb-1">{getGreeting()}</p>
                            <h1 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-2 md:gap-3">
                                Dashboard
                                {isSyncing && (
                                    <span className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-medium text-violet-200 bg-white/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                                        Syncing
                                    </span>
                                )}
                            </h1>
                            <p className="text-violet-200/80 mt-1 md:mt-2 text-xs md:text-base">Capture, Organize, and Achieve.</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-2xl md:text-3xl font-bold text-white">{activeTodos.length}</p>
                                <p className="text-violet-200 text-[10px] md:text-xs uppercase tracking-wider">Active Tasks</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            onClick={handleVoiceClick}
                            className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${isRecording
                                ? 'bg-rose-500 text-white animate-pulse'
                                : 'bg-white text-violet-600 hover:bg-violet-50'
                                }`}
                        >
                            {isRecording ? (
                                <>
                                    <Icons.Stop width={18} height={18} fill="currentColor" />
                                    <span>{formatTime(recordingTime)}</span>
                                </>
                            ) : (
                                <>
                                    <Icons.Mic width={18} height={18} />
                                    <span className="text-sm">Voice Note</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Progress Card */}
                <div className="group relative bg-white dark:bg-slate-800/80 rounded-3xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Progress</h3>
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <Icons.TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="url(#progressGradient)" strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray={`${completionRate * 2.51} 251`} className="transition-all duration-1000" />
                                    <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#6366F1" />
                                            <stop offset="100%" stopColor="#8B5CF6" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">{completionRate}%</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{completedToday}/{totalToday}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Tasks completed</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pressure Card */}
                <div className={`group relative bg-white dark:bg-slate-800/80 rounded-3xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${pressureStatus.bg} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Pressure</h3>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${pressureStatus.color}20` }}>
                                <Icons.Zap className="w-4 h-4" style={{ color: pressureStatus.color }} />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                                    <circle cx="50" cy="50" r="40" fill="none" stroke={pressureStatus.color} strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray={`${Math.min(importantCount * 25, 251)} 251`} className="transition-all duration-1000" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold" style={{ color: pressureStatus.color }}>{importantCount}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{pressureStatus.text}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">High priority tasks</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Capture Card */}
                <div className="group relative bg-white dark:bg-slate-800/80 rounded-3xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${isRecording ? 'from-rose-500/10 to-red-500/10' : 'from-cyan-500/5 via-transparent to-teal-500/5'} transition-all duration-300`}></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {isRecording ? "Recording..." : "Quick Capture"}
                            </h3>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isRecording ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-cyan-100 dark:bg-cyan-900/30'}`}>
                                <Icons.Mic className={`w-4 h-4 ${isRecording ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-cyan-600 dark:text-cyan-400'}`} />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleVoiceClick}
                                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${isRecording
                                    ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30 animate-pulse'
                                    : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-violet-500 hover:to-indigo-600 hover:shadow-lg hover:shadow-violet-500/30'
                                    }`}
                            >
                                {isRecording ? (
                                    <Icons.Stop className="w-8 h-8 text-white" />
                                ) : (
                                    <Icons.Mic className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors" />
                                )}
                            </button>
                            <div>
                                {isRecording ? (
                                    <>
                                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{formatTime(recordingTime)}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Tap to stop</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">Voice Note</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Tap to start</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
