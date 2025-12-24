
import { Memo, SyncData } from '../types.js';

const DB_NAME = 'MemoAI_DB';
const STORE_NAME = 'memos';
const SNAPSHOT_STORE_NAME = 'snapshots';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

export const storage = {
  initDB: (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        dbPromise = null; // Reset on error
        reject(request.error);
      };
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE_NAME)) {
          db.createObjectStore(SNAPSHOT_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
    return dbPromise;
  },

  getMemos: async (includeDeleted = false): Promise<Memo[]> => {
    const db = await storage.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        let results = request.result;
        if (!includeDeleted) {
          results = results.filter(m => !m.isDeleted);
        }
        resolve(results.sort((a, b) => b.updatedAt - a.updatedAt));
      };
      request.onerror = () => reject(request.error);
    });
  },

  // 增量保存单个记录
  upsertMemo: async (memo: Memo) => {
    const db = await storage.initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(memo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // 批量保存
  saveMemos: async (memos: Memo[]) => {
    const db = await storage.initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      memos.forEach(memo => store.put(memo));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  exportSnapshot: async (): Promise<SyncData> => {
    const memos = await storage.getMemos(true);
    return {
      memos: memos.filter(m => m.type === 'memo'),
      todos: memos.filter(m => m.type === 'todo'),
      whiteboards: memos.filter(m => m.type === 'sketch')
    };
  },

  restoreSnapshot: async (data: SyncData) => {
    // Clear existing data? Or upsert?
    // User says "Use Cloud Version" -> implies replacing local with cloud.
    // So we should probably clear or just overwrite.
    // Since it's ID based, overwrite handles updates.
    // But if local has items that cloud doesn't, and we "Use Cloud", those local items should be removed.
    // So clear is safer for "Use Cloud".
    await storage.clearDatabase();
    const allItems = [...data.memos, ...data.todos, ...data.whiteboards];
    await storage.saveMemos(allItems);
  },

  clearDatabase: async () => {
    const db = await storage.initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  migrateFromLocalStorage: async () => {
    const legacyData = localStorage.getItem('memoai_memos');
    if (legacyData) {
      try {
        const memos = JSON.parse(legacyData);
        // 为旧数据补充 updatedAt
        const upgradedMemos = memos.map((m: any) => ({
          ...m,
          updatedAt: m.updatedAt || m.createdAt || Date.now()
        }));
        await storage.saveMemos(upgradedMemos);
        localStorage.removeItem('memoai_memos');
      } catch (e) {
        console.error('Migration failed', e);
      }
    }
  },

  // History Snapshots
  saveHistorySnapshot: async () => {
    const data = await storage.exportSnapshot();
    const snapshot = {
      id: Date.now(),
      date: new Date().toISOString(),
      data: data
    };
    const db = await storage.initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(SNAPSHOT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(SNAPSHOT_STORE_NAME);
      const request = store.put(snapshot);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getHistorySnapshots: async (): Promise<{id: number, date: string, data: SyncData}[]> => {
    const db = await storage.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SNAPSHOT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(SNAPSHOT_STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.id - a.id));
      request.onerror = () => reject(request.error);
    });
  },

  deleteHistorySnapshot: async (id: number) => {
    const db = await storage.initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(SNAPSHOT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(SNAPSHOT_STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
