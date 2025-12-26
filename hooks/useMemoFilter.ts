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

    // 2. Filter by View/Category
    switch (filter) {
      case 'dashboard':
      case 'tasks':
      case 'all':
      case 'calendar':
      case 'kanban':
        // Show active memos (not archived)
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
      case 'archived':
        filtered = filtered.filter(m => m.isArchived);
        break;
      default:
        // Assume it's a category or tag
        if (filter.startsWith('#')) {
             // Tag filter (if implemented in UI)
             const tag = filter; // Tags usually stored with #? Or just text?
             // In App.tsx tags are string[]. Usually user stores "tag". 
             // If filter passed is "#tag", we might need to strip # or match exactly.
             // Sidebar passes activeFilter.
             // Let's assume standard category matching first.
             // If it's a tag, it might just be the tag string.
             
             // Check if it matches a category first?
             // Since we don't import CATEGORIES, we rely on the fact that if it's not standard, it's a custom filter.
             
             // If the user's tag includes #, match it.
             filtered = filtered.filter(m => !m.isArchived && m.tags.includes(filter));
        } else {
             // Category filter (Sidebar "Folders")
             // or Tag filter without #?
             // Let's try matching category first, as that's explicit in Sidebar.
             filtered = filtered.filter(m => !m.isArchived && m.category === filter);
        }
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
