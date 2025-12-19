
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

  getMemos: async (): Promise<Memo[]> => {
    const db = await storage.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    });
  },

  saveMemos: async (memos: Memo[]) => {
    const db = await storage.initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Clear and rewrite for simplicity in this version
      // In a real high-perf app, we would use individual put/delete
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        memos.forEach(memo => store.add(memo));
        transaction.oncomplete = () => resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // Legacy support for migration
  migrateFromLocalStorage: async () => {
    const legacyData = localStorage.getItem('memoai_memos');
    if (legacyData) {
      try {
        const memos = JSON.parse(legacyData);
        await storage.saveMemos(memos);
        localStorage.removeItem('memoai_memos');
        console.log('Successfully migrated data to IndexedDB');
      } catch (e) {
        console.error('Migration failed', e);
      }
    }
  }
};
