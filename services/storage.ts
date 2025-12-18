
import { Memo } from '../types';

const STORAGE_KEY = 'memoai_memos';

export const storage = {
  getMemos: (): Memo[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveMemos: (memos: Memo[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  },
};
