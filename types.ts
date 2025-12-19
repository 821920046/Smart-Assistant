
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
  type: 'memo' | 'todo' | 'sketch';
  todos?: TodoItem[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  reminderAt?: number;
  sketchData?: string; 
  isArchived: boolean;
  isFavorite: boolean;
  isDeleted?: boolean;
  remoteId?: string;
}

export interface TranscriptionTurn {
  role: 'user' | 'model';
  text: string;
}

export const APP_VERSION = '2.5.1';
