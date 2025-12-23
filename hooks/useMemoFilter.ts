import { useMemo } from 'react';
import { Memo } from '../types';
import { CATEGORIES } from '../constants';

export const useMemoFilter = (memos: Memo[], filter: string, searchQuery: string) => {
  const filteredMemos = useMemo(() => {
    let result = memos;

    if (filter === 'important') result = result.filter(m => m.priority === 'important');
    else if (filter === 'favorites') result = result.filter(m => m.isFavorite);
    else if (filter === 'archived') result = result.filter(m => m.isArchived);
    else if (CATEGORIES.includes(filter)) result = result.filter(m => m.category === filter);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => m.content.toLowerCase().includes(q));
    }

    const priorityWeight = { important: 3, normal: 2, secondary: 1 };
    return [...result].sort((a, b) => {
      const pA = priorityWeight[a.priority || 'normal'];
      const pB = priorityWeight[b.priority || 'normal'];
      if (pA !== pB) return pB - pA;
      return b.createdAt - a.createdAt;
    });
  }, [memos, filter, searchQuery]);

  return filteredMemos;
};
