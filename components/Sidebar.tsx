import React from 'react';
import { Icons } from '../constants';
import { Memo } from '../types';

interface SidebarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  isOpen: boolean;
  onClose: () => void;
  // Kept for compatibility if passed, but ignored
  tags?: string[];
  onExport?: () => void;
  onImport?: (file: File) => void;
  onOpenSyncSettings?: () => void;
  onOpenAuth?: () => void;
  isSyncing?: boolean;
  syncError?: Error | null;
  memos?: Memo[];
  onClearHistory?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeFilter, setActiveFilter, isOpen, onClose
}) => {
  const menuItems = [
    { id: 'dashboard', icon: Icons.Home, label: 'Dashboard' },
    { id: 'notes', icon: Icons.FileText, label: 'Notes' },
    { id: 'tasks', icon: Icons.CheckSquare, label: 'Tasks' },
    { id: 'archive', icon: Icons.Archive, label: 'Archive' },
    { id: 'settings', icon: Icons.Settings, label: 'Settings' },
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
        fixed inset-y-0 left-0 z-50 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 
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
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Icons.Logo className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Smart Assistant</h1>
              <p className="text-xs text-slate-500 font-medium">Second Brain</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleFilterClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeFilter === item.id 
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <item.icon />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Bottom attribution or minimal info if needed */}
          <div className="text-center pb-4">
             <p className="text-[10px] text-slate-300 dark:text-slate-700">v2.7.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
