
import React, { useState, useEffect } from 'react';
import { syncService, SyncConfig, SyncProvider } from '../services/sync.js';

interface SyncSettingsProps {
  onClose: () => void;
  onSyncComplete: () => void;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ onClose, onSyncComplete }) => {
  const [config, setConfig] = useState<SyncConfig>(syncService.getConfig());
  const [isTesting, setIsTesting] = useState(false);

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

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-card">
        <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">同步设置</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Multi-device Continuity</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 text-2xl">&times;</button>
        </header>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
          <section className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">选择同步方案</label>
            <div className="grid grid-cols-2 gap-3">
              {(['none', 'supabase', 'webdav', 'gist'] as SyncProvider[]).map(p => (
                <button
                  key={p}
                  onClick={() => setConfig({ ...config, provider: p })}
                  className={`py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                    config.provider === p 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'
                  }`}
                >
                  {p === 'none' ? '仅本地' : p}
                </button>
              ))}
            </div>
          </section>

          {config.provider === 'supabase' && (
            <div className="space-y-4 animate-card">
              {((window as any).process?.env?.SUPABASE_URL || process.env.SUPABASE_URL) ? (
                 <div className="p-4 bg-green-50 text-green-700 rounded-2xl text-xs flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                   <span>已检测到系统环境变量配置，Supabase 连接已就绪。</span>
                 </div>
              ) : (
                 <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl text-xs flex flex-col gap-2">
                   <div className="flex items-center gap-2 font-bold">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     <span>未配置环境变量</span>
                   </div>
                   <p className="opacity-90">请在后台配置 SUPABASE_URL 和 SUPABASE_KEY 以启用同步功能。</p>
                 </div>
              )}
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

          {config.provider === 'gist' && (
            <div className="space-y-4 animate-card">
              <input 
                type="password" placeholder="GitHub Personal Access Token" 
                value={config.settings.gistToken || ''} 
                onChange={e => updateSetting('gistToken', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input 
                type="text" placeholder="Gist ID (留空自动创建)" 
                value={config.settings.gistId || ''} 
                onChange={e => updateSetting('gistId', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}
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
