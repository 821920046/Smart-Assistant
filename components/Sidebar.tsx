
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
    { id: 'archived', icon: Icons.Archive, label: '归档' },
  ];

  const handleTagClick = (tag: string) => {
    const tagId = `tag:${tag}`;
    // Toggle: if the same tag is clicked, revert to 'all'
    setActiveFilter(activeFilter === tagId ? 'all' : tagId);
  };

  return (
    <aside className="hidden md:flex flex-col w-72 p-8 sticky top-0 h-screen overflow-y-auto border-r border-slate-100 bg-white/50">
      {/* Brand Section */}
      <div className="flex items-center gap-4 mb-14">
        <div className="assistant-gradient assistant-glow w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 duration-300">
          <Icons.Logo />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">
            智能助理
          </h1>
          <p className="text-[9px] font-black text-sky-500 uppercase tracking-[0.2em] mt-0.5">
            智能思考中心
          </p>
        </div>
      </div>

      <nav className="space-y-1.5 mb-12">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveFilter(item.id)}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeFilter === item.id 
                ? 'bg-sky-600 text-white shadow-xl shadow-sky-200' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <item.icon />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">标签</h3>
          <button 
            onClick={() => setActiveFilter('all')}
            className="text-slate-300 hover:text-slate-500 transition-colors text-[9px] font-bold uppercase tracking-tighter"
          >
            重置
          </button>
        </div>
        <div className="px-2 space-y-1">
          {tags.length > 0 ? tags.map(tag => {
            const tagId = `tag:${tag}`;
            const isActive = activeFilter === tagId;
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold transition-all rounded-lg group text-left ${
                  isActive 
                    ? 'bg-sky-50 text-sky-600 shadow-sm border border-sky-100' 
                    : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50/50 border border-transparent'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-sky-500' : 'bg-slate-300 group-hover:bg-sky-400'}`} />
                <span className="truncate flex-1">#{tag.toLowerCase()}</span>
              </button>
            );
          }) : (
            <p className="px-3 text-xs text-slate-400 italic font-medium">尚无标签</p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-8 border-t border-slate-100">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold">
           <div className="w-6 h-6 rounded-full assistant-gradient border border-white/50" />
           个人设置
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
