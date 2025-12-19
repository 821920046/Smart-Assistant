
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
    <aside className="hidden md:flex flex-col w-64 lg:w-80 p-8 sticky top-0 h-screen overflow-y-auto bg-[#f4f4f5] border-r border-zinc-200 no-scrollbar">
      <div className="flex items-center gap-4 mb-16">
        <Icons.Logo />
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">智能助理</h1>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-2">SmartBrain AI</span>
        </div>
      </div>

      <div className="space-y-12">
        <nav className="space-y-2">
          <p className="px-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">导航</p>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id)}
              className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-[13.5px] font-bold transition-all relative ${
                activeFilter === item.id 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 translate-x-1 active-nav-glow' 
                  : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900'
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

        <div className="space-y-6">
          <div className="px-4 flex items-center justify-between">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">智能标签</p>
            <div className="w-8 h-[1px] bg-zinc-200" />
          </div>
          <div className="px-1 space-y-1 max-h-[40vh] overflow-y-auto no-scrollbar">
            {tags.length > 0 ? tags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveFilter(`tag:${tag}`)}
                className={`flex items-center gap-4 w-full px-5 py-3 text-[13px] font-bold rounded-xl transition-all group ${
                  activeFilter === `tag:${tag}` 
                  ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' 
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeFilter === `tag:${tag}` ? 'bg-indigo-500 scale-125' : 'bg-zinc-300 group-hover:bg-zinc-400'
                }`} />
                <span className="truncate">#{tag}</span>
              </button>
            )) : (
              <span className="px-5 text-xs text-zinc-400 font-medium italic">暂无可用标签</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-12">
        <div className="p-6 bg-white rounded-[24px] border border-zinc-200 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl assistant-gradient flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Icons.Sparkles />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 uppercase">Pro 账户</p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">无限 AI 云空间</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4 px-2 opacity-30">
           <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">© 2025 v2.1</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
