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
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Sync Conflict Detected</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">云端数据由于在其他设备上的更新而较新，请选择保留哪个版本。</p>
                </header>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-700 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">当前设备版本 (Local)</h3>
                        <div className="flex-1">
                            <p className="text-xs font-mono text-slate-500 mb-2">Last Updated: {localDate}</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{error.localSnapshot.data.memos.length} Memos</p>
                            <p className="text-xs text-slate-400 mt-2">设备 ID: {error.localSnapshot.meta.deviceId}</p>
                        </div>
                        <button
                            onClick={() => handleResolve('use_local')}
                            className="mt-6 w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            保留此版本 (强制覆盖云端)
                        </button>
                    </div>

                    <div className="p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">云端存储版本 (Cloud)</h3>
                            <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">推荐</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-mono text-indigo-400 mb-2">Last Updated: {cloudDate}</p>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{error.cloudSnapshot.data.memos.length} Memos</p>
                            <p className="text-xs text-indigo-400 mt-2">设备 ID: {error.cloudSnapshot.meta.deviceId}</p>
                        </div>
                        <button
                            onClick={() => handleResolve('use_cloud')}
                            className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-colors"
                        >
                            采用云端版本 (更新本地)
                        </button>
                    </div>
                </div>

                <footer className="p-6 border-t border-slate-50 dark:border-slate-700/50 flex justify-center">
                    <button onClick={onCancel} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">稍后解决 (暂时停止同步)</button>
                </footer>
            </div>
        </div>
    );
}
