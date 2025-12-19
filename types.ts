
export type Priority = 'low' | 'medium' | 'high';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
}

export interface Memo {
  id: string;
  content: string;
  type: 'memo' | 'todo';
  todos?: TodoItem[];
  tags: string[];
  createdAt: number;
  dueDate?: number;
  reminderAt?: number; // Added reminder timestamp
  isArchived: boolean;
  isFavorite: boolean;
}

export interface TranscriptionTurn {
  role: 'user' | 'model';
  text: string;
}
