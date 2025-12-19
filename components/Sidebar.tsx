
import React, { useRef, useState } from 'react';
import { Icons } from '../constants';

interface SidebarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  tags: string[];
  onExport: () => void;
  onImport: (file: File) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeFilter, setActiveFilter, tags, onExport, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const menuItems = [
    { id: 'all', icon: Icons.Plus, label: '主时间轴' },
    { id: 'todo', icon: Icons.CheckCircle, label: '待办任务' },
    { id: 'favorites', icon: Icons.Star, label: '收藏夹' },
    { id: 'archived', icon: Icons.Archive, label: '已归档' },
  ];

  const handleSync = () => {
    setIsSyncing(true);
    // 模拟同步过程
    setTimeout(() => {
      setIsSyncing(false);
      alert('同步功能需要配置云端服务器。当前数据已安全保存在本地。');
    }, 1000);
  };

  return (
    <aside className="hidden md:flex flex-col w-72 lg:w-80 p-8 sticky top-0 h-screen overflow-y-auto bg-white border-r border-slate-100 no-scrollbar z-10">
      <div className="flex items-center gap-4 mb-16 px-2">
        <Icons.Logo />
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">智能助理</h1>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-2">v2.5 Intelligence</span>
        </div>
      </div>

      <div className="space-y-12">
        {/* Cloud Sync Status Card */}
        <div className="mx-1 p-5 rounded-[28px] bg-slate-50 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cloud Sync</span>
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`} />
          </div>
          <p className="text-[11px] font-bold text-slate-600 leading-tight">登录后可在手机端实时同步你的笔记。</p>
          <button 
            onClick={handleSync}
            className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
          >
            {isSyncing ? '正在检查...' : '立即登录同步'}
          </button>
        </div>

        <nav className="space-y-1">
          <p className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] mb-4">导航</p>
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
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          <p className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">主题标签</p>
          <div className="px-1 space-y-1 max-h-[25vh] overflow-y-auto no-scrollbar">
            {tags.length > 0 ? tags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveFilter(`tag:${tag}`)}
                className={`flex items-center gap-4 w-full px-5 py-3 text-[13.5px] font-bold rounded-2xl transition-all group ${
                  activeFilter === `tag:${tag}` 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">#{tag}</span>
              </button>
            )) : (
              <span className="px-5 text-xs text-slate-300 italic">暂无标签</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onExport} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-900 hover:text-white transition-all">导出</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-900 hover:text-white transition-all">导入</button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
