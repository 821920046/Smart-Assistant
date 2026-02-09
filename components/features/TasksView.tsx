import React from 'react';
import { Memo } from '../../types';
import MemoList from './MemoList';
import MemoEditor from './MemoEditor';
import { useStore } from '../../services/store';

interface TasksViewProps {
  memos: Memo[];
  title?: string;
  onClearAll?: () => void;
  defaultType?: 'todo' | 'memo' | 'sketch';
  hideViewSwitcher?: boolean;
  hideSelectors?: boolean;
  hideEditor?: boolean;
}

const TasksView: React.FC<TasksViewProps> = ({
  memos,
  title,
  onClearAll,
  defaultType = 'todo',
  hideSelectors = false,
  hideEditor = false
}) => {
  const { searchQuery, addMemo } = useStore();

  return (
    <div className="space-y-6">
      {/* View Switcher/Header */}
      <div className="flex items-center justify-between">
        {title && <h2 className="text-xl font-bold dark:text-white">{title}</h2>}

        {onClearAll && memos.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        <div className="space-y-6">
          {!hideEditor && <MemoEditor onSave={addMemo} defaultType={defaultType} hideSelectors={hideSelectors} />}
          <MemoList
            memos={memos}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  );
};

export default TasksView;
