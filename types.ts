
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
  updatedAt: number; // 用于同步冲突检测
  dueDate?: number;
  reminderAt?: number;
  sketchData?: string; 
  isArchived: boolean;
  isFavorite: boolean;
  isDeleted?: boolean; // 软删除，方便同步删除指令
  remoteId?: string;   // 远程数据库对应的 ID
}

export interface TranscriptionTurn {
  role: 'user' | 'model';
  text: string;
}
