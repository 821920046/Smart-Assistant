import React from 'react';
import { Icons } from '../constants';

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isSyncing: boolean;
  syncError?: Error | null;
  onOpenSyncSettings: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClearHistory: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  darkMode, onToggleDarkMode, isSyncing, syncError, onOpenSyncSettings, onExport, onImport, onClearHistory
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your preferences and data</p>
      </div>

      {/* Theme */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Sun className="w-5 h-5" />
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-200">Dark Mode</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Switch between light and dark themes</p>
          </div>
          <button
            onClick={onToggleDarkMode}
            className={`w-14 h-7 rounded-full p-1 transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      {/* Sync */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Cloud className="w-5 h-5" />
          Sync & Cloud
        </h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-200">Cloud Synchronization</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isSyncing ? 'Syncing...' : syncError ? 'Sync Error' : 'Sync Active'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            isSyncing 
              ? 'bg-amber-400 animate-pulse' 
              : syncError 
                ? 'bg-red-500' 
                : 'bg-emerald-400'
          }`} />
        </div>
        <button
          onClick={onOpenSyncSettings}
          className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Configure Sync Settings
        </button>
      </section>

      {/* Data */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Archive className="w-5 h-5" />
          Data Management
        </h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={onExport}
              className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Export Data (JSON)
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Import Data
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleFileChange}
            />
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
                  onClearHistory();
                }
              }}
              className="text-red-500 hover:text-red-600 text-sm font-medium"
            >
              Clear All Data & History
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
