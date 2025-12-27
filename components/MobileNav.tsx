import React from 'react';
import { Icons } from '../constants';

interface MobileNavProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeFilter, setActiveFilter }) => {
  const navItems = [
    { id: 'dashboard', icon: Icons.Home, label: 'Home' },
    { id: 'notes', icon: Icons.FileText, label: 'Notes' },
    { id: 'tasks', icon: Icons.CheckSquare, label: 'Tasks' },
    { id: 'settings', icon: Icons.Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 md:hidden pb-safe">
      <div className="flex items-center justify-around px-2 pt-2 pb-3">
        {navItems.map((item) => {
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                setActiveFilter(item.id);
              }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[64px] ${
                isActive 
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;
