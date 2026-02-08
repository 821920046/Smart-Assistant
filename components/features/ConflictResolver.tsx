import React from 'react';
import { SyncConflictError, syncService, SyncConfig } from '../../services/sync';
import { Memo } from '../../types';

interface ConflictResolverProps {
    error: SyncConflictError;
    config: SyncConfig;
    onResolve: (memos: Memo[]) => void;
    onCancel: () => void;
}

export default function ConflictResolver({ error, config, onResolve, onCancel }: ConflictResolverProps) {
    const handleResolve = async (resolution: 'use_local' | 'use_cloud') => {
        try {
            const merged = await syncService.resolveConflict(resolution, error.localSnapshot, error.cloudSnapshot, config);
            onResolve(merged);
        } catch (err) {
            alert('Failed to resolve conflict: ' + (err as Error).message);
        }
    };

    if (!error || !error.localSnapshot || !error.cloudSnapshot) {
        return null;
    }

    const localDate = new Date(error.localSnapshot.meta.updatedAt).toLocaleString();
    const cloudDate = new Date(error.cloudSnapshot.meta.updatedAt).toLocaleString();

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <header className="p-8 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sync Conflict Detected</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cloud data is newer due to updates from another device. Please choose which version to keep.</p>
                </header>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Current Device (Local)</h3>
                        <div className="flex-1">
                            <p className="text-xs font-mono text-slate-500 mb-2">Last Updated: {localDate}</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{error.localSnapshot.data.memos.length} Memos</p>
                            <p className="text-xs text-slate-400 mt-2">Device ID: {error.localSnapshot.meta.deviceId}</p>
                        </div>
                        <button
                            onClick={() => handleResolve('use_local')}
                            className="mt-6 w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            Keep Local Version (Overwrite Cloud)
                        </button>
                    </div>

                    <div className="flex-1 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-500/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Cloud Storage (Cloud)</h3>
                            <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Recommended</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-mono text-indigo-400 mb-2">Last Updated: {cloudDate}</p>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{error.cloudSnapshot.data.memos.length} Memos</p>
                            <p className="text-xs text-indigo-400 mt-2">Device ID: {error.cloudSnapshot.meta.deviceId}</p>
                        </div>
                        <button
                            onClick={() => handleResolve('use_cloud')}
                            className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-colors"
                        >
                            Use Cloud Version (Update Local)
                        </button>
                    </div>
                </div>

                <footer className="p-6 border-t border-slate-50 dark:border-slate-700/50 flex justify-center">
                    <button onClick={onCancel} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Resolve Later (Sync paused)</button>
                </footer>
            </div>
        </div>
    );
}
