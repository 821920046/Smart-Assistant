
import React from 'react';
import { Icons } from '../constants.js';

interface SidebarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  tags: string[];
  onExport: () => void;
  onImport: (file: File) => void;
  onOpenSyncSettings: () => void;
  isSyncing: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeFilter, setActiveFilter, tags, onOpenSyncSettings, isSyncing 
}) => {
  const menuItems = [
    { id: 'all', icon: Icons.Plus, label: 'Timeline' },
    { id: 'todo', icon: Icons.CheckCircle, label: 'Tasks' },
    { id: 'favorites', icon: Icons.Star, label: 'Favorites' },
    { id: 'archived', icon: Icons.Archive, label: 'Archived' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 lg:w-80 p-8 sticky top-0 h-screen overflow-y-auto bg-white border-r border-slate-100 no-scrollbar z-10">
      <div className="flex items-center gap-4 mb-16 px-2">
        <Icons.Logo />
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">Smart Assistant</h1>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-2">v2.5 Sync</span>
        </div>
      </div>

      <div className="space-y-12">
        <div className="mx-1 p-5 rounded-[28px] bg-slate-50 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cloud Sync</span>
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          </div>
          <p className="text-[11px] font-bold text-slate-600 leading-tight">Sync your thoughts across mobile and desktop devices.</p>
          <button 
            onClick={onOpenSyncSettings}
            className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-indigo-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
          >
            {isSyncing ? 'Syncing...' : 'Sync Settings'}
          </button>
        </div>

        <nav className="space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id)}
              className={`flex items-center gap-4 w-full px-5 py-4 rounded-3xl text-[14px] font-bold transition-all ${
                activeFilter === item.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <item.icon /> {item.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
