import React from 'react';
import { Icons } from '../constants.js';
import { Memo } from '../types.js';
import TaskInsights from './TaskInsights.js';

interface SidebarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  tags: string[];
  onExport: () => void;
  onImport: (file: File) => void;
  onOpenSyncSettings: () => void;
  isSyncing: boolean;
  memos: Memo[];
  onClearHistory?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeFilter, setActiveFilter, tags, onOpenSyncSettings, isSyncing, memos, onClearHistory
}) => {
  const menuItems = [
    { id: 'all', icon: Icons.List, label: 'Tasks' },
    { id: 'important', icon: Icons.Sparkles, label: 'Important' },
    { id: 'archived', icon: Icons.Archive, label: 'History' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 p-6 sticky top-0 h-screen overflow-y-auto premium-glass z-10 no-scrollbar">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200">
          <Icons.Logo />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Smart Assistant</h1>
          <p className="text-xs text-slate-500 font-medium">Second Brain</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8">
        <nav className="space-y-1">
          {menuItems.map(item => (
            <div key={item.id} className="flex items-center group">
              <button
                onClick={() => setActiveFilter(item.id)}
                className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeFilter === item.id 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={activeFilter === item.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}>
                  <item.icon />
                </span> 
                {item.label}
              </button>
              {item.id === 'archived' && activeFilter === 'archived' && onClearHistory && (
                <button
                  onClick={onClearHistory}
                  className="p-2 ml-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Clear History"
                >
                  <Icons.Trash />
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4">Insights</h3>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <TaskInsights memos={memos} />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cloud Sync</span>
            <div className={`w-2 h-2 rounded-full transition-all ${
              isSyncing 
                ? 'bg-amber-400 animate-pulse ring-2 ring-amber-100' 
                : 'bg-emerald-400 ring-2 ring-emerald-100'
            }`} />
          </div>
          <button
            onClick={onOpenSyncSettings}
            className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-slate-200"
          >
            {isSyncing ? 'Syncing...' : 'Manage Sync'}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
