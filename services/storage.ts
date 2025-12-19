
import { Memo } from '../types';

const DB_NAME = 'MemoAI_DB';
const STORE_NAME = 'memos';
const DB_VERSION = 1;

export const storage = {
  initDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
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
  }
};
