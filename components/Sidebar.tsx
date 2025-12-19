
import React from 'react';
import { Icons } from '../constants';

interface SidebarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  tags: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeFilter, setActiveFilter, tags }) => {
  const menuItems = [
    { id: 'all', icon: Icons.Plus, label: '时间轴' },
    { id: 'todo', icon: Icons.CheckCircle, label: '待办任务' },
    { id: 'favorites', icon: Icons.Star, label: '收藏夹' },
    { id: 'archived', icon: Icons.Archive, label: '归档整理' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 p-8 sticky top-0 h-screen overflow-y-auto bg-[#f5f5f7] border-r border-slate-200/50 no-scrollbar">
      <div className="flex items-center gap-3.5 mb-14">
        <div className="scale-90"><Icons.Logo /></div>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">SmartMind</h1>
          <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mt-1.5">Assistant</span>
        </div>
      </div>

      <div className="space-y-8">
        <nav className="space-y-1">
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Main Navigation</p>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id)}
              className={`flex items-center gap-3.5 w-full px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${
                activeFilter === item.id 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              <item.icon />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keywords</p>
          <div className="px-1 space-y-0.5 max-h-[40vh] overflow-y-auto no-scrollbar">
            {tags.length > 0 ? tags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveFilter(`tag:${tag}`)}
                className={`flex items-center gap-3.5 w-full px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
                  activeFilter === `tag:${tag}` ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="truncate">#{tag}</span>
              </button>
            )) : (
              <span className="px-4 text-xs text-slate-400 italic">No tags found</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8 flex items-center gap-3 px-4 text-slate-400">
         <div className="w-8 h-8 rounded-full assistant-gradient opacity-20" />
         <span className="text-[10px] font-bold tracking-widest uppercase">Version 2.0</span>
      </div>
    </aside>
  );
};

export default Sidebar;
