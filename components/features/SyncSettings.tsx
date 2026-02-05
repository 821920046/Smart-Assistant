import React, { useState, useEffect } from 'react';
import { syncService, SyncConfig, SyncProvider } from '../../services/sync';
import { storage } from '../../services/storage';

interface SyncSettingsProps {
    onClose: () => void;
    onSyncComplete: () => void;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ onClose, onSyncComplete }) => {
    const [config, setConfig] = useState<SyncConfig>(syncService.getConfig());
    const [isTesting, setIsTesting] = useState(false);
    const [snapshots, setSnapshots] = useState<{ id: number, date: string, data: any }[]>([]);
    const [lastSyncTime, setLastSyncTime] = useState<number>(0);

    const [repoInfo, setRepoInfo] = useState<{ size: number } | null>(null);
    const [syncFileStatus, setSyncFileStatus] = useState<{ exists: boolean, size?: number } | null>(null);

    useEffect(() => {
        // 加载并尝试解密配置
        syncService.getDecryptedConfig().then(decryptedConfig => {
            setConfig(decryptedConfig);
        });
        loadSnapshots();
        setLastSyncTime(syncService.getLastSyncTime());
    }, []);

    useEffect(() => {
        // Only fetch repo details if we have a valid token and repo configured
        if (config.provider === 'github_repo' && config.settings.githubToken && config.settings.githubRepo) {
            // Silently fetch repo info - don't show 401 errors during initial load
            syncService.getRepoDetails(config)
                .then(setRepoInfo)
                .catch((err) => {
                    // Only log actual errors, not auth failures
                    if (!err.message?.includes('401') && !err.message?.includes('Unauthorized')) {
                        console.error('Failed to get repo details:', err);
                    }
                    setRepoInfo(null);
                });
            syncService.getRemoteFileStatus(config)
                .then(setSyncFileStatus)
                .catch((err) => {
                    if (!err.message?.includes('401') && !err.message?.includes('Unauthorized')) {
                        console.error('Failed to get file status:', err);
                    }
                    setSyncFileStatus(null);
                });
        } else {
            setRepoInfo(null);
            setSyncFileStatus(null);
        }
    }, [config.provider, config.settings.githubToken, config.settings.githubRepo]);

    const handleCleanupRemote = async () => {
        if (!confirm('Are you sure you want to delete the remote sync file? This will not delete the repository history, but will remove the current data file. Local data will not be affected.')) return;
        try {
            await syncService.deleteRemoteData(config);
            alert('Remote data deleted successfully.');
            if (config.provider === 'github_repo') {
                syncService.getRepoDetails(config).then(setRepoInfo).catch(() => setRepoInfo(null));
                syncService.getRemoteFileStatus(config).then(setSyncFileStatus).catch(() => setSyncFileStatus(null));
            }
        } catch (e) {
            alert('Cleanup failed: ' + (e as Error).message);
        }
    };

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
        } catch (e) {
            alert('Restore failed: ' + (e as Error).message);
        }
    };

    const handleDeleteSnapshot = async (id: number) => {
        if (!confirm('Delete this snapshot?')) return;
        try {
            await storage.deleteHistorySnapshot(id);
            loadSnapshots();
        } catch (e) {
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
            // Validate configuration before saving
            if (config.provider === 'github_repo') {
                if (!config.settings.githubToken?.trim()) {
                    alert('请输入 GitHub Personal Access Token');
                    return;
                }
                if (!config.settings.githubRepo?.trim()) {
                    alert('请输入 Repository (格式: username/repo)');
                    return;
                }
                if (!config.settings.encryptionPassword?.trim()) {
                    alert('请设置同步密码用于加密数据');
                    return;
                }

                // Test connection before saving
                try {
                    const repoDetails = await syncService.getRepoDetails(config);
                    if (!repoDetails) {
                        alert('无法连接到仓库，请检查 Token 和仓库名称是否正确');
                        return;
                    }
                } catch (err) {
                    alert('连接测试失败: ' + (err as Error).message);
                    return;
                }
            } else if (config.provider === 'webdav') {
                if (!config.settings.webdavUrl?.trim()) {
                    alert('请输入 WebDAV URL');
                    return;
                }
            }

            syncService.saveConfig(config);

            if (config.provider === 'github_repo') {
                try {
                    await syncService.uploadSyncConfigToGithub(config);
                } catch (e) {
                    console.warn('Failed to upload sync config to GitHub:', e);
                }
            }

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

    const handleCloudRestore = async () => {
        const token = config.settings.githubToken;
        if (!token) {
            alert('Please enter your GitHub Token first.');
            return;
        }

        if (!confirm('This will search your GitHub repositories for a sync config and overwrite current settings. Continue?')) return;

        setIsTesting(true);
        try {
            const restoredConfig = await syncService.restoreConfigFromGithub(token);
            if (restoredConfig) {
                setConfig(restoredConfig);
                alert('Config found and restored! Click "Save & Sync" to apply.');
            } else {
                alert('No config file (.sync-config.json) found in your repositories.');
            }
        } catch (e) {
            alert('Restore failed: ' + (e as Error).message);
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        <label
                            title="Import Config"
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                            <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        </label>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-900 text-2xl ml-2">&times;</button>
                    </div>
                </header>

                <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                    <section className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">选择同步方案</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['github_repo', 'none', 'webdav'] as SyncProvider[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setConfig({ ...config, provider: p })}
                                    className={`py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${config.provider === p
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                                        : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'
                                        }`}
                                >
                                    {p === 'none' ? '仅本地' : p === 'github_repo' ? 'GitHub Repo' : p}
                                </button>
                            ))}
                        </div>
                    </section>

                    {config.provider === 'github_repo' && (
                        <div className="space-y-4 animate-card">
                            <div className="bg-blue-50/50 p-4 rounded-2xl text-xs text-blue-600 mb-2 leading-relaxed">
                                <p className="font-bold mb-1 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                    核心原则：Local-First / 安全加密同步
                                </p>
                                提醒配置（含 API Key）将随数据一同加密存储在您的私有仓库中。清除缓存后，只需重新输入 Token 即可通过“云端恢复”找回所有设置。
                            </div>
                            <div className="relative">
                                <input
                                    type="password" placeholder="GitHub Personal Access Token (Repo Scope)"
                                    value={config.settings.githubToken || ''}
                                    onChange={e => updateSetting('githubToken', e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 pr-32"
                                />
                                {config.settings.githubToken && !config.settings.githubRepo && (
                                    <button
                                        onClick={handleCloudRestore}
                                        className="absolute right-2 top-2 bottom-2 px-3 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-xl hover:bg-blue-200 transition-colors"
                                    >
                                        云端找回配置
                                    </button>
                                )}
                            </div>
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

                            {repoInfo && (
                                <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2 border border-slate-100">
                                    <div className="flex justify-between font-bold text-slate-700">
                                        <span>Repository Size (incl. history):</span>
                                        <span>{(repoInfo.size / 1024).toFixed(2)} MB</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-700 border-t border-slate-200 pt-2 mt-2">
                                        <span>Sync Data File Size:</span>
                                        <span className={syncFileStatus?.exists ? 'text-blue-600' : 'text-slate-400'}>
                                            {syncFileStatus?.exists
                                                ? `${((syncFileStatus.size || 0) / 1024).toFixed(2)} KB`
                                                : 'Not Found (Empty)'}
                                        </span>
                                    </div>
                                    {repoInfo.size > 100000 && (
                                        <p className="text-red-500 mb-2 mt-2">Warning: Repository size is large (&gt;100MB). Consider creating a new repository to reset history.</p>
                                    )}
                                    <div className="text-slate-400 mb-2 mt-2">
                                        GitHub saves history for every sync. Over time, the repository size will grow.
                                    </div>
                                    <button
                                        onClick={handleCleanupRemote}
                                        className="w-full py-2 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 transition-colors"
                                    >
                                        Delete Remote Sync File
                                    </button>
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
                                        <span className="text-[10px] text-slate-400">{s.data.memos?.length || 0} items</span>
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
