import React, { useEffect, useState } from 'react';
import { Icons } from '../../constants';
import { Gauge } from '../ui/Gauge';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { storage } from '../../services/storage';
import { useStore } from '../../services/store';

const DashboardView: React.FC = () => {
    const { memos, addMemo, setFilter: onNavigate, isSyncing } = useStore();
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
    let pressureStatus = { text: "All under control", color: "#22C55E" };
    if (importantCount > 3) pressureStatus = { text: "High pressure", color: "#EF4444" };
    else if (importantCount > 0) pressureStatus = { text: "Need attention", color: "#F59E0B" };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                        Dashboard {isSyncing && <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse ml-2" />}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Capture, Organize, and Achieve.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => onNavigate('tasks')} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-100"><Icons.Plus className="w-5 h-5" /> New Task</button>
                    <button onClick={() => onNavigate('notes')} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border rounded-2xl font-semibold shadow-sm"><Icons.FileText className="w-5 h-5" /> New Note</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Gauge title="Today's Progress" value={completedToday} max={totalToday || 1} color="#6366F1" centerContent={<div className="text-center"><div className="text-3xl font-bold dark:text-white">{completionRate}%</div><div className="text-[10px] text-slate-400 font-bold uppercase">Done</div></div>} />
                <Gauge title="Tasks Pressure" value={importantCount} max={10} color={pressureStatus.color} centerContent={<div className="text-center"><div className="text-3xl font-bold" style={{ color: pressureStatus.color }}>{importantCount}</div><div className="text-[10px] text-slate-400 font-bold uppercase">High Priority</div></div>} />
                <Gauge title={isRecording ? "Recording..." : "Voice Center"} value={recordingTime} max={60} color={isRecording ? "#EF4444" : "#F43F5E"} centerContent={<div className="text-center cursor-pointer" onClick={handleVoiceClick}>{isRecording ? <div className="text-2xl font-bold text-red-500">{formatTime(recordingTime)}</div> : <Icons.Mic className="w-10 h-10 text-slate-300 mx-auto" />}</div>} />
            </div>
        </div>
    );
};
export default DashboardView;
