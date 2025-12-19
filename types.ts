
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
  dueDate?: number;
  reminderAt?: number;
  sketchData?: string; // Base64 image data for sketches
  isArchived: boolean;
  isFavorite: boolean;
}

export interface TranscriptionTurn {
  role: 'user' | 'model';
  text: string;
}
