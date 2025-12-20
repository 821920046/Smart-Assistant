
export type Priority = 'important' | 'normal' | 'secondary';
export type RepeatInterval = 'none' | 'daily' | 'weekly';

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
  reminderRepeat?: RepeatInterval; // Added periodic reminder support
  sketchData?: string;
  isArchived: boolean;
  isFavorite: boolean;
  isDeleted?: boolean;
  remoteId?: string;
  priority: Priority;
  completedAt?: number; // 任务完成时间，用于自动清理
}

export interface TranscriptionTurn {
  role: 'user' | 'model';
  text: string;
}

export const APP_VERSION = '2.7.0';
