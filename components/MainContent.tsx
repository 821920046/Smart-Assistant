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
    </>
  );
};

export default MainContent;
