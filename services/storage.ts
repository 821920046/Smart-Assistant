import { Memo, SyncSnapshot, SyncData } from '../types.js';
import { StorageError } from './errors.js';

const DB_NAME = 'MemoAI_DB';
const STORE_NAME = 'memos';
const SNAPSHOT_STORE_NAME = 'snapshots';
const AUDIO_STORE_NAME = 'audio_notes';
const DB_VERSION = 4; // Upgraded for index support

let dbPromise: Promise<IDBDatabase> | null = null;

export const storage = {
  /**
   * Initialize IndexedDB with required object stores and indexes
   */
  initDB: (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          dbPromise = null;
          reject(new StorageError(request.error?.message || 'Failed to open database', 'INIT'));
        };

        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = request.result;
          const oldVersion = event.oldVersion;

          let memosStore: IDBObjectStore;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            memosStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          } else {
            const transaction = (event.target as IDBOpenDBRequest).transaction;
            memosStore = transaction!.objectStore(STORE_NAME);
          }

          if (oldVersion < 4) {
            if (!memosStore.indexNames.contains('updatedAt')) {
              memosStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
            if (!memosStore.indexNames.contains('type')) {
              memosStore.createIndex('type', 'type', { unique: false });
            }
            if (!memosStore.indexNames.contains('isArchived')) {
              memosStore.createIndex('isArchived', 'isArchived', { unique: false });
            }
          }

          if (!db.objectStoreNames.contains(SNAPSHOT_STORE_NAME)) {
            db.createObjectStore(SNAPSHOT_STORE_NAME, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
            db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
          }
        };
      } catch (err) {
        dbPromise = null;
        reject(new StorageError((err as Error).message, 'INIT'));
      }
    });
    return dbPromise;
  },

  /**
   * Get all memos, optionally including deleted ones
   */
  getMemos: async (includeDeleted = false): Promise<Memo[]> => {
    try {
      const db = await storage.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          let results = request.result as Memo[];
          if (!includeDeleted) {
            results = results.filter(m => !m.isDeleted);
          }
          resolve(results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
        };
        request.onerror = () => reject(new StorageError(request.error?.message || 'Failed to get memos', 'READ'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'READ');
    }
  },

  /**
   * Batch save an array of memos
   */
  saveMemos: async (memos: Memo[]) => {
    try {
      const db = await storage.initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        memos.forEach(memo => {
          try {
            store.put(memo);
          } catch (e) {
            console.error('Failed to put memo during batch save:', memo.id, e);
          }
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new StorageError(transaction.error?.message || 'Batch save failed', 'WRITE'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'WRITE');
    }
  },

  /**
   * Insert or update a single memo
   */
  upsertMemo: async (memo: Memo) => {
    try {
      const db = await storage.initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(memo);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new StorageError(request.error?.message || 'Upsert failed', 'WRITE'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'WRITE');
    }
  },

  /**
   * Mark a memo as deleted (soft delete)
   */
  deleteMemoOffline: async (id: string) => {
    try {
      const db = await storage.initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const memo = getRequest.result as Memo;
          if (memo) {
            memo.isDeleted = true;
            memo.updatedAt = Date.now();
            store.put(memo);
          }
          resolve();
        };
        getRequest.onerror = () => reject(new StorageError(getRequest.error?.message || 'Delete failed', 'WRITE'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'WRITE');
    }
  },

  /**
   * Export database state as a syncable snapshot
   */
  exportSnapshot: async (): Promise<SyncData> => {
    const memos = await storage.getMemos(true);
    let notificationConfig;
    try {
      const saved = localStorage.getItem('notification_config');
      if (saved) notificationConfig = JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse notification config for export');
    }

    return {
      memos: memos.filter(m => m.type === 'memo'),
      todos: memos.filter(m => m.type === 'todo'),
      whiteboards: memos.filter(m => m.type === 'sketch'),
      notificationConfig
    };
  },

  /**
   * Restore database from a snapshot
   */
  restoreSnapshot: async (data: SyncData) => {
    await storage.clearDatabase();
    const allItems = [...data.memos, ...data.todos, ...data.whiteboards];
    await storage.saveMemos(allItems);

    if (data.notificationConfig) {
      localStorage.setItem('notification_config', JSON.stringify(data.notificationConfig));
      // Notify the store to reload its state
      window.dispatchEvent(new CustomEvent('notification-config-restored', { detail: data.notificationConfig }));
    }
  },

  /**
   * Clear the entire memos store
   */
  clearDatabase: async () => {
    try {
      const db = await storage.initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new StorageError(request.error?.message || 'Clear failed', 'WRITE'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'WRITE');
    }
  },

  /**
   * Migrate data from legacy LocalStorage format
   */
  migrateFromLocalStorage: async () => {
    try {
      // Check for multiple possible legacy keys
      const legacyKeys = ['memos', 'memoai_memos'];
      for (const key of legacyKeys) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const memos = JSON.parse(saved) as Memo[];
            const upgradedMemos = memos.map(m => ({
              ...m,
              updatedAt: m.updatedAt || m.createdAt || Date.now()
            }));
            await storage.saveMemos(upgradedMemos);
            localStorage.removeItem(key);
            console.log(`✅ Migrated memos from legacy key '${key}' to IndexedDB`);
          } catch (parseError) {
            console.error(`Failed to parse legacy migration data for key '${key}':`, parseError);
          }
        }
      }
    } catch (e) {
      console.warn('Migration process encountered an error:', e);
    }
  },

  /**
   * Save a historical snapshot for backup/undo
   */
  saveHistorySnapshot: async () => {
    try {
      const data = await storage.exportSnapshot();
      const snapshot = {
        id: Date.now(),
        date: new Date().toISOString(),
        data: data,
        timestamp: Date.now()
      };
      const db = await storage.initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(SNAPSHOT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SNAPSHOT_STORE_NAME);
        const request = store.put(snapshot);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new StorageError(request.error?.message || 'History save failed', 'WRITE'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'WRITE');
    }
  },

  /**
   * Get all historical snapshots
   */
  getHistorySnapshots: async (): Promise<{ id: number, date: string, data: SyncData }[]> => {
    try {
      const db = await storage.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SNAPSHOT_STORE_NAME, 'readonly');
        const store = transaction.objectStore(SNAPSHOT_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result || []).sort((a: any, b: any) => b.id - a.id));
        request.onerror = () => reject(new StorageError(request.error?.message || 'Failed to get history', 'READ'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'READ');
    }
  },

  /**
   * Delete a historical snapshot
   */
  deleteHistorySnapshot: async (id: number) => {
    try {
      const db = await storage.initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(SNAPSHOT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SNAPSHOT_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new StorageError(request.error?.message || 'Snapshot deletion failed', 'WRITE'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'WRITE');
    }
  },

  /**
   * Save audio blob and return an ID
   */
  saveAudio: async (blob: Blob): Promise<string> => {
    try {
      const db = await storage.initDB();
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const audioData = { id, blob, createdAt: Date.now() };

      return new Promise<string>((resolve, reject) => {
        const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AUDIO_STORE_NAME);
        const request = store.put(audioData);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(new StorageError(request.error?.message || 'Audio save failed', 'WRITE'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'WRITE');
    }
  },

  /**
   * Retrieve audio blob by ID
   */
  getAudio: async (id: string): Promise<Blob | null> => {
    try {
      const db = await storage.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUDIO_STORE_NAME, 'readonly');
        const store = transaction.objectStore(AUDIO_STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result?.blob || null);
        request.onerror = () => reject(new StorageError(request.error?.message || 'Audio retrieval failed', 'READ'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'READ');
    }
  },

  /**
   * Delete audio blob by ID
   */
  deleteAudio: async (id: string) => {
    try {
      const db = await storage.initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AUDIO_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new StorageError(request.error?.message || 'Audio deletion failed', 'WRITE'));
      });
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError((err as Error).message, 'WRITE');
    }
  }
};
