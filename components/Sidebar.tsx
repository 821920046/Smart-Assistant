
import React from 'react';
import { Icons } from '../constants';

interface SidebarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  tags: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeFilter, setActiveFilter, tags }) => {
  const menuItems = [
    { id: 'all', icon: Icons.Plus, label: '主时间轴' },
    { id: 'todo', icon: Icons.CheckCircle, label: '待办任务' },
    { id: 'favorites', icon: Icons.Star, label: '收藏夹' },
    { id: 'archived', icon: Icons.Archive, label: '已归档' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 lg:w-80 p-8 sticky top-0 h-screen overflow-y-auto bg-white border-r border-slate-100 no-scrollbar z-10">
      <div className="flex items-center gap-4 mb-20 px-2">
        <Icons.Logo />
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">智能助理</h1>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-2">v2.5 Intelligence</span>
        </div>
      </div>

      <div className="space-y-16">
        <nav className="space-y-2">
          <p className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] mb-6">导航</p>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id)}
              className={`flex items-center gap-4 w-full px-5 py-4 rounded-3xl text-[14px] font-bold transition-all relative group ${
                activeFilter === item.id 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-2' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon />
              {item.label}
              {activeFilter === item.id && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="space-y-8">
          <div className="px-4 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">主题标签</p>
            <div className="w-8 h-[1px] bg-slate-100" />
          </div>
          <div className="px-1 space-y-1 max-h-[40vh] overflow-y-auto no-scrollbar">
            {tags.length > 0 ? tags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveFilter(`tag:${tag}`)}
                className={`flex items-center gap-4 w-full px-5 py-3 text-[13.5px] font-bold rounded-2xl transition-all group ${
                  activeFilter === `tag:${tag}` 
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeFilter === `tag:${tag}` ? 'bg-indigo-500 scale-125' : 'bg-slate-300 group-hover:bg-slate-400'
                }`} />
                <span className="truncate">#{tag}</span>
              </button>
            )) : (
              <span className="px-5 text-xs text-slate-300 font-medium italic">暂无可用标签</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-16">
        <div className="p-7 bg-slate-50 rounded-[32px] border border-slate-100/50 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl assistant-gradient flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Icons.Sparkles />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Pro Workspace</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Unlimited Syncing</p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-4 px-3 opacity-20">
           <span className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-400">© 2025 SmartAssistant AI</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
