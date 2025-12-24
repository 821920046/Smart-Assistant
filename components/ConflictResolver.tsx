import React from 'react';
import { SyncSnapshot, Memo } from '../types.js';
import { SyncConflictError, syncService } from '../services/sync.js';

interface ConflictResolverProps {
  error: SyncConflictError;
  onResolve: (memos: Memo[]) => void;
  onCancel: () => void;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({ error, onResolve, onCancel }) => {
  const { localSnapshot, cloudSnapshot } = error;
  
  const handleResolve = async (resolution: 'use_local' | 'use_cloud') => {
    try {
        const config = syncService.getConfig();
        const resolvedMemos = await syncService.resolveConflict(resolution, localSnapshot, cloudSnapshot, config);
        onResolve(resolvedMemos);
    } catch (e) {
        alert('Resolution failed: ' + (e as Error).message);
    }
  };

  const downloadJson = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8 space-y-6 animate-card">
        <div className="text-center">
            <h2 className="text-xl font-black text-red-500">Sync Conflict Detected</h2>
            <p className="text-sm text-slate-500 mt-2">Cloud version is newer than your local version.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="font-bold text-slate-700 mb-2">Local Device</div>
                <div className="text-slate-500">Device: {localSnapshot.meta.deviceId}</div>
                <div className="text-slate-500">Time: {new Date(localSnapshot.meta.updatedAt).toLocaleString()}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl">
                <div className="font-bold text-blue-700 mb-2">Cloud Backup</div>
                <div className="text-blue-500">Device: {cloudSnapshot.meta.deviceId}</div>
                <div className="text-blue-500">Time: {new Date(cloudSnapshot.meta.updatedAt).toLocaleString()}</div>
            </div>
        </div>

        <div className="space-y-3">
            <button 
                onClick={() => handleResolve('use_local')}
                className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
            >
                Keep Local Version (Overwrite Cloud)
            </button>
            <button 
                onClick={() => handleResolve('use_cloud')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-200"
            >
                Use Cloud Version (Overwrite Local)
            </button>
             <button 
                onClick={() => {
                    downloadJson(localSnapshot, 'local-backup.json');
                    downloadJson(cloudSnapshot, 'cloud-backup.json');
                }}
                className="w-full py-3 border-2 border-slate-100 hover:border-blue-200 text-slate-400 hover:text-blue-500 rounded-xl font-bold transition-colors"
            >
                Export Both (Manual Merge)
            </button>
        </div>
        
        <button onClick={onCancel} className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600">
            Cancel Sync
        </button>
      </div>
    </div>
  );
};

export default ConflictResolver;
