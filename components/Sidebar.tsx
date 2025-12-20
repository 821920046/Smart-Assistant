
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
    { id: 'all', icon: Icons.List, label: 'Task Center' },
    { id: 'important', icon: Icons.Sparkles, label: 'Important' },
    { id: 'favorites', icon: Icons.Star, label: 'Favorites' },
    { id: 'archived', icon: Icons.Archive, label: 'History' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-80 p-10 sticky top-0 h-screen overflow-y-auto premium-glass border-r border-white/20 no-scrollbar z-10">
      <div className="flex items-center gap-5 mb-16 px-2 animate-float">
        <Icons.Logo />
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-slate-900 tracking-[-0.05em] leading-none">Smart Assistant</h1>
          <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-[0.25em] mt-3 opacity-80">v3.0 Premium Docs</span>
        </div>
      </div>

      <div className="space-y-12">
        <nav className="space-y-2">
          {menuItems.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter(item.id)}
                className={`sidebar-item flex items-center gap-4 flex-1 px-6 py-5 text-[15px] font-bold transition-all ${activeFilter === item.id ? 'active-sidebar-item' : 'text-slate-500'
                  }`}
              >
                <span className={activeFilter === item.id ? 'text-white' : 'text-slate-400'}><item.icon /></span> {item.label}
              </button>
              {item.id === 'archived' && activeFilter === 'archived' && onClearHistory && (
                <button
                  onClick={onClearHistory}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-xs"
                  title="清除全部历史"
                >
                  <Icons.Trash />
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="mx-1 p-8 rounded-[35px] bg-white/40 border border-white/60 shadow-sm space-y-6">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">数据洞察</span>
          <TaskInsights memos={memos} />
        </div>

        <div className="mx-1 p-6 rounded-[30px] border border-white/60 bg-white/20 space-y-5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cloud Sync</span>
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`} />
          </div>
          <button
            onClick={onOpenSyncSettings}
            className="w-full py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-[11px] font-black uppercase text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg active:scale-95"
          >
            {isSyncing ? 'Syncing...' : 'Connectivity'}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
