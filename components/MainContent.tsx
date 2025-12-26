import React from 'react';
import { Memo } from '../types';
import DashboardView from './DashboardView';
import TasksView from './TasksView';
import SettingsView from './SettingsView';
import MemoList from './MemoList';
import MemoEditor from './MemoEditor';

interface MainContentProps {
  filter: string;
  searchQuery: string;
  memos: Memo[]; // Raw memos for Dashboard/Tasks
  filteredMemos: Memo[]; // Filtered memos for List views
  onAdd: (memo: Partial<Memo>) => void;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onNavigate: (view: string) => void;
  
  // Settings Props
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isSyncing: boolean;
  syncError?: Error | null;
  onOpenSyncSettings: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClearHistory: () => void;
}

const MainContent: React.FC<MainContentProps> = ({ 
  filter, searchQuery, memos, filteredMemos, onAdd, onUpdate, onDelete, onNavigate,
  darkMode, onToggleDarkMode, isSyncing, syncError, onOpenSyncSettings, onExport, onImport, onClearHistory
}) => {
  
  // Render Dashboard
  if (filter === 'dashboard') {
    return (
      <DashboardView 
        memos={memos}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAdd={onAdd}
        onNavigate={onNavigate}
      />
    );
  }

  // Render Tasks (Merged Todo + Kanban + Calendar)
  if (filter === 'tasks') {
    return (
      <TasksView 
        memos={memos}
        searchQuery={searchQuery}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAdd={onAdd}
      />
    );
  }

  // Render Settings
  if (filter === 'settings') {
    return (
      <SettingsView 
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        isSyncing={isSyncing}
        syncError={syncError}
        onOpenSyncSettings={onOpenSyncSettings}
        onExport={onExport}
        onImport={onImport}
        onClearHistory={onClearHistory}
      />
    );
  }

  // Render Notes / Archive / Other Lists
  const showEditor = filter === 'notes'; // Only show editor in Notes view

  return (
    <>
      {showEditor && (
        <MemoEditor 
          onSave={onAdd} 
          defaultType="memo"
        />
      )}

      <MemoList 
        memos={filteredMemos}
        searchQuery={searchQuery}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />

      {/* Mobile FAB - Only for Notes view or fallback */}
      {/* Tasks view has its own Quick Add. Dashboard has its own. */}
      {filter === 'notes' && (
        <button 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
              const textarea = document.querySelector('textarea');
              if (textarea) textarea.focus();
            }, 100);
          }}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-500 text-white shadow-lg text-xl flex items-center justify-center hover:bg-indigo-600 active:scale-95 transition-all z-50"
          aria-label="Add new note"
        >
          +
        </button>
      )}
    </>
  );
};

export default MainContent;
