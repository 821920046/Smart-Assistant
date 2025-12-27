
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
  category?: string;
  completedAt?: number; // 任务完成时间，用于自动清理
  audio?: {
    id: string;
    duration: number;
  };
  source?: 'voice' | 'text';
}

export interface TranscriptionTurn {
  role: 'user' | 'model';
  text: string;
}

export interface SyncMeta {
  version: number;
  updatedAt: number;
  deviceId: string;
  checksum?: string;
}

export interface SyncData {
  memos: Memo[];
  todos: Memo[];
  whiteboards: Memo[];
}

export interface SyncSnapshot {
  meta: SyncMeta;
  data: SyncData;
}

export const APP_VERSION = '2.7.0';
