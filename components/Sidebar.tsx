import React from 'react';
import { Icons, CATEGORIES } from '../constants.js';
import { Memo } from '../types.js';
import TaskInsights from './TaskInsights.js';

interface SidebarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  tags: string[];
  onExport: () => void;
  onImport: (file: File) => void;
  onOpenSyncSettings: () => void;
  onOpenAuth: () => void;
  isSyncing: boolean;
  syncError?: Error | null;
  memos: Memo[];
  onClearHistory?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeFilter, setActiveFilter, tags, onOpenSyncSettings, onOpenAuth, isSyncing, syncError, memos, onClearHistory, darkMode, onToggleDarkMode, isOpen, onClose
}) => {
  const menuItems = [
    { id: 'all', icon: Icons.List, label: 'Tasks' },
    { id: 'calendar', icon: Icons.Clock, label: 'Calendar' },
    { id: 'kanban', icon: Icons.Grid, label: 'Kanban' },
    { id: 'focus', icon: Icons.Target, label: 'Focus' },
    { id: 'important', icon: Icons.Sparkles, label: 'Important' },
    { id: 'archived', icon: Icons.Archive, label: 'History' },
  ];

  const handleFilterClick = (id: string) => {
    setActiveFilter(id);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 
        transform transition-transform duration-300 ease-in-out 
        md:translate-x-0 md:static md:h-screen md:bg-transparent md:border-none md:z-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6 overflow-y-auto no-scrollbar">
          {/* Mobile Close Button */}
          <div className="md:hidden absolute right-4 top-4">
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-10 px-2 mt-2 md:mt-0">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200">
              <Icons.Logo className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Smart Assistant</h1>
              <p className="text-xs text-slate-500 font-medium">Second Brain</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-8">
            <nav className="space-y-1">
              {menuItems.map(item => (
                <div key={item.id} className="flex items-center group">
                  <button
                    onClick={() => handleFilterClick(item.id)}
                    className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      activeFilter === item.id 
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className={activeFilter === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}>
                      <item.icon />
                    </span> 
                    {item.label}
                  </button>
                  {item.id === 'archived' && activeFilter === 'archived' && onClearHistory && (
                    <button
                      onClick={onClearHistory}
                      className="p-2 ml-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Clear History"
                    >
                      <Icons.Trash />
                    </button>
                  )}
                </div>
              ))}
            </nav>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4">Folders</h3>
              <div className="space-y-1">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => handleFilterClick(category)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeFilter === category
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icons.Folder className={`w-4 h-4 ${activeFilter === category ? 'text-blue-500' : 'text-slate-400'}`} />
                      <span>{category}</span>
                    </div>
                    <span className={`text-xs ${activeFilter === category ? 'text-blue-500 font-bold' : 'text-slate-400'}`}>
                      {memos.filter(m => m.category === category && !m.isArchived && !m.isDeleted).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4">Insights</h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                <TaskInsights memos={memos} />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cloud Sync</span>
                <div className={`w-2 h-2 rounded-full transition-all ${
                  isSyncing 
                    ? 'bg-amber-400 animate-pulse ring-2 ring-amber-100 dark:ring-amber-900' 
                    : syncError 
                      ? 'bg-red-500 ring-2 ring-red-100 dark:ring-red-900'
                      : 'bg-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-900'
                }`} title={syncError ? syncError.message : isSyncing ? 'Syncing...' : 'Synced'} />
              </div>
              <button
                onClick={onOpenSyncSettings}
                className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-slate-200 dark:shadow-none"
              >
                Manage Sync
              </button>
            </div>

            <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
            >
              <span className="flex items-center gap-3">
                {darkMode ? <Icons.Moon className="w-4 h-4" /> : <Icons.Sun className="w-4 h-4" />}
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
