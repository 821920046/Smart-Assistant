
import React, { useState, useEffect } from 'react';
import { syncService, SyncConfig, SyncProvider } from '../services/sync.js';
import { storage } from '../services/storage.js';

interface SyncSettingsProps {
  onClose: () => void;
  onSyncComplete: () => void;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ onClose, onSyncComplete }) => {
  const [config, setConfig] = useState<SyncConfig>(syncService.getConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [snapshots, setSnapshots] = useState<{id: number, date: string, data: any}[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  useEffect(() => {
    loadSnapshots();
    setLastSyncTime(syncService.getLastSyncTime());
  }, []);

  const loadSnapshots = async () => {
    try {
      const list = await storage.getHistorySnapshots();
      setSnapshots(list);
    } catch (e) {
      console.error('Failed to load snapshots', e);
    }
  };

  const handleRestore = async (snapshot: any) => {
    if (!confirm(`Restore snapshot from ${new Date(snapshot.date).toLocaleString()}? Current data will be replaced.`)) return;
    try {
        await storage.restoreSnapshot(snapshot.data);
        alert('Restored successfully! Page will reload.');
        window.location.reload();
    } catch(e) {
        alert('Restore failed: ' + (e as Error).message);
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    if (!confirm('Delete this snapshot?')) return;
    try {
        await storage.deleteHistorySnapshot(id);
        loadSnapshots();
    } catch(e) {
        alert('Delete failed: ' + (e as Error).message);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      await storage.saveHistorySnapshot();
      await loadSnapshots();
      alert('Backup created successfully!');
    } catch (e) {
      alert('Backup failed: ' + (e as Error).message);
    }
  };

  const saveAndSync = async () => {
    setIsTesting(true);
    try {
      syncService.saveConfig(config);
      // 这里由 App.tsx 处理实际同步，此处仅关闭
      if (typeof onSyncComplete === 'function') {
        try {
          onSyncComplete();
        } catch (innerErr) {
          console.warn('onSyncComplete failed:', innerErr);
        }
      }
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (e) {
      alert('配置有误: ' + (e as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  const handleExportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-assistant-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedConfig = JSON.parse(event.target?.result as string);
        if (importedConfig && importedConfig.provider) {
          setConfig(importedConfig);
          alert('Config imported successfully!');
        } else {
          alert('Invalid config file.');
        }
      } catch (err) {
        alert('Failed to parse config file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-card">
        <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">同步设置</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                {lastSyncTime ? `Last Sync: ${new Date(lastSyncTime).toLocaleString()}` : 'Not synced yet'}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportConfig}
              title="Export Config"
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <label 
              title="Import Config"
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </label>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 text-2xl ml-2">&times;</button>
          </div>
        </header>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
          <section className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">选择同步方案</label>
            <div className="grid grid-cols-2 gap-3">
              {(['none', 'supabase', 'webdav', 'github_repo'] as SyncProvider[]).map(p => (
                <button
                  key={p}
                  onClick={() => setConfig({ ...config, provider: p })}
                  className={`py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                    config.provider === p 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'
                  }`}
                >
                  {p === 'none' ? '仅本地' : p === 'github_repo' ? 'GitHub Repo' : p}
                </button>
              ))}
            </div>
          </section>

          {config.provider === 'supabase' && (
            <div className="space-y-4 animate-card">
              <input 
                type="text" placeholder="Supabase Project URL (https://xyz.supabase.co)" 
                value={config.settings.supabaseUrl || ''} 
                onChange={e => updateSetting('supabaseUrl', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input 
                type="password" placeholder="Supabase Anon Key" 
                value={config.settings.supabaseKey || ''} 
                onChange={e => updateSetting('supabaseKey', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          {config.provider === 'github_repo' && (
            <div className="space-y-4 animate-card">
               <div className="bg-blue-50/50 p-4 rounded-2xl text-xs text-blue-600 mb-2">
                核心原则：Local-First / 云端仅备份 / 单人使用 / 冲突可控
              </div>
              <input 
                type="password" placeholder="GitHub Personal Access Token (Repo Scope)" 
                value={config.settings.githubToken || ''} 
                onChange={e => updateSetting('githubToken', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input 
                type="text" placeholder="Repository (username/repo)" 
                value={config.settings.githubRepo || ''} 
                onChange={e => updateSetting('githubRepo', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input 
                type="password" placeholder="Sync Password (Encryption)" 
                value={config.settings.encryptionPassword || ''} 
                onChange={e => updateSetting('encryptionPassword', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[10px] text-slate-400 px-2">
                数据将使用 AES-256 加密存储在您的私有仓库中。
              </p>
            </div>
          )}

          {config.provider === 'webdav' && (
            <div className="space-y-4 animate-card">
              <input 
                type="text" placeholder="WebDAV URL (如坚果云 dav.jianguoyun.com/dav/)" 
                value={config.settings.webdavUrl || ''} 
                onChange={e => updateSetting('webdavUrl', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" placeholder="用户名" 
                  value={config.settings.webdavUser || ''} 
                  onChange={e => updateSetting('webdavUser', e.target.value)}
                  className="px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <input 
                  type="password" placeholder="应用密码" 
                  value={config.settings.webdavPass || ''} 
                  onChange={e => updateSetting('webdavPass', e.target.value)}
                  className="px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}

          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">本地历史快照 (Auto Backup)</label>
                <div className="flex gap-2">
                    <button onClick={handleCreateSnapshot} className="text-[10px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">NEW BACKUP</button>
                    <button onClick={loadSnapshots} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1">REFRESH</button>
                </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-2 max-h-40 overflow-y-auto space-y-2">
                {snapshots.length === 0 && <div className="text-center text-xs text-slate-400 py-4">No snapshots found.</div>}
                {snapshots.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{new Date(s.date).toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400">{s.data.memos.length + s.data.todos.length + s.data.whiteboards.length} items</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleRestore(s)} className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-200">RESTORE</button>
                            <button onClick={() => handleDeleteSnapshot(s.id)} className="text-[10px] font-black text-slate-300 hover:text-red-500 px-2">×</button>
                        </div>
                    </div>
                ))}
            </div>
          </section>
        </div>

        <footer className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
          >
            取消
          </button>
          <button 
            onClick={saveAndSync}
            disabled={isTesting}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all"
          >
            {isTesting ? '正在验证...' : '保存并开始同步'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SyncSettings;
