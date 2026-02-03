import { useMemo } from 'react';
import { Memo } from '../types';

export const useMemoFilter = (memos: Memo[], filter: string, searchQuery: string) => {
  return useMemo(() => {
    let filtered = memos;

    // 1. Filter by Search Query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(memo =>
        memo.content.toLowerCase().includes(lowerQuery) ||
        (memo.todos && memo.todos.some(todo => todo.text.toLowerCase().includes(lowerQuery))) ||
        (memo.tags && memo.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      );
    }

    // 2. Filter by View
    switch (filter) {
      case 'tasks':
        // Show active memos of type 'todo'
        filtered = filtered.filter(m => !m.isArchived && m.type === 'todo');
        break;
      case 'dashboard':
      case 'all':
      case 'kanban':
        // Show all active memos (not archived)
        filtered = filtered.filter(m => !m.isArchived);
        break;
      case 'notes':
        // Show active memos of type 'memo'
        filtered = filtered.filter(m => !m.isArchived && m.type === 'memo');
        break;
      case 'settings':
        // No memos needed specifically, or all? Just return all active for now to prevent errors
        filtered = filtered.filter(m => !m.isArchived);
        break;
      case 'important':
        filtered = filtered.filter(m => !m.isArchived && m.priority === 'important');
        break;
      case 'archive':
        filtered = filtered.filter(m => m.isArchived);
        break;
      default:
        // Assume it's a tag filter if it's not a built-in view
        filtered = filtered.filter(m => !m.isArchived && m.tags.includes(filter));
        break;
    }

    return filtered.sort((a, b) => {
      // Favorites on top for non-archived views
      if (filter !== 'archived') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
      }
      // Then by updated time
      return b.updatedAt - a.updatedAt;
    });
  }, [memos, filter, searchQuery]);
};
