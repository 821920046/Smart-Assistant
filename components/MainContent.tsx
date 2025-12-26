import React from 'react';
import { Memo } from '../types';
import { CATEGORIES } from '../constants';
import MemoEditor from './MemoEditor';
import CalendarView from './CalendarView';
import KanbanView from './KanbanView';
import FocusMode from './FocusMode';
import MemoList from './MemoList';

interface MainContentProps {
  filter: string;
  searchQuery: string;
  filteredMemos: Memo[];
  onAdd: (memo: Partial<Memo>) => void;
  onUpdate: (memo: Memo) => void;
  onDelete: (id: string) => void;
}

const MainContent: React.FC<MainContentProps> = ({ 
  filter, searchQuery, filteredMemos, onAdd, onUpdate, onDelete 
}) => {
  const showEditor = !['archived', 'calendar', 'kanban', 'focus'].includes(filter);

  return (
    <>
      {/* Editor */}
      {showEditor && (
        <MemoEditor 
          onSave={onAdd} 
          defaultCategory={CATEGORIES.includes(filter) ? filter : undefined}
        />
      )}

      {/* Content Area */}
      {filter === 'calendar' ? (
        <CalendarView memos={filteredMemos} />
      ) : filter === 'kanban' ? (
        <KanbanView 
          memos={filteredMemos} 
          onUpdate={onUpdate} 
          onDelete={onDelete}
          onAdd={onAdd}
        />
      ) : filter === 'focus' ? (
        <FocusMode />
      ) : (
        <MemoList 
           memos={filteredMemos}
           searchQuery={searchQuery}
           onUpdate={onUpdate}
           onDelete={onDelete}
        />
      )}

      {/* Mobile FAB */}
      <button 
        onClick={() => {
          if (filter === 'kanban') {
            onAdd({ type: 'todo', priority: 'normal', content: '' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Small timeout to allow scroll to start/finish
            setTimeout(() => {
              const textarea = document.querySelector('textarea');
              if (textarea) textarea.focus();
            }, 100);
          }
        }}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-500 text-white shadow-lg text-xl flex items-center justify-center hover:bg-indigo-600 active:scale-95 transition-all z-50"
        aria-label="Add new memo"
      >
        +
      </button>
    </>
  );
};

export default MainContent;
