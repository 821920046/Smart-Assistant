
export type Priority = 'important' | 'normal' | 'secondary';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
}

export interface Memo {
  id: string;
  title?: string;
  content: string;
  type: 'memo' | 'todo' | 'sketch';
  todos?: TodoItem[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  sketchData?: string;
  isArchived: boolean;
  isFavorite: boolean;
  isDeleted?: boolean;
  remoteId?: string;
  priority: Priority;
  completedAt?: number;
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
