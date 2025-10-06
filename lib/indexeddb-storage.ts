'use client';

// IndexedDB storage for form data - survives Clear-Site-Data headers
const DB_NAME = 'LavsitFormStorage';
const DB_VERSION = 1;
const STORE_NAME = 'formData';
const FORM_DATA_KEY = 'deliveryFormData';
const APP_VERSION_KEY = 'appVersion';

interface IndexedDBFormData {
  key: string;
  value: string;
  timestamp: number;
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB not available in SSR'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[INDEXEDDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[INDEXEDDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[INDEXEDDB] Object store created');
        }
      };
    });

    return this.initPromise;
  }

  async setItem(key: string, value: string): Promise<boolean> {
    try {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const data: IndexedDBFormData = {
          key,
          value,
          timestamp: Date.now()
        };

        const request = store.put(data);

        request.onsuccess = () => {
          console.log(`[INDEXEDDB] Saved ${key}`);
          resolve(true);
        };

        request.onerror = () => {
          console.error(`[INDEXEDDB] Failed to save ${key}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`[INDEXEDDB] Error saving ${key}:`, error);
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            console.log(`[INDEXEDDB] Retrieved ${key}`);
            resolve(result.value);
          } else {
            console.log(`[INDEXEDDB] No data found for ${key}`);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error(`[INDEXEDDB] Failed to retrieve ${key}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`[INDEXEDDB] Error retrieving ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => {
          console.log(`[INDEXEDDB] Removed ${key}`);
          resolve(true);
        };

        request.onerror = () => {
          console.error(`[INDEXEDDB] Failed to remove ${key}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`[INDEXEDDB] Error removing ${key}:`, error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[INDEXEDDB] All data cleared');
          resolve(true);
        };

        request.onerror = () => {
          console.error('[INDEXEDDB] Failed to clear data:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[INDEXEDDB] Error clearing data:', error);
      return false;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => {
          console.error('[INDEXEDDB] Failed to get keys:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[INDEXEDDB] Error getting keys:', error);
      return [];
    }
  }
}

// Singleton instance
const indexedDBStorage = new IndexedDBStorage();

// Public API functions
export const saveFormDataToIndexedDB = async (formData: string): Promise<boolean> => {
  return await indexedDBStorage.setItem(FORM_DATA_KEY, formData);
};

export const loadFormDataFromIndexedDB = async (): Promise<string | null> => {
  return await indexedDBStorage.getItem(FORM_DATA_KEY);
};

export const saveAppVersionToIndexedDB = async (version: string): Promise<boolean> => {
  return await indexedDBStorage.setItem(APP_VERSION_KEY, version);
};

export const loadAppVersionFromIndexedDB = async (): Promise<string | null> => {
  return await indexedDBStorage.getItem(APP_VERSION_KEY);
};

export const clearFormDataFromIndexedDB = async (): Promise<boolean> => {
  const success1 = await indexedDBStorage.removeItem(FORM_DATA_KEY);
  const success2 = await indexedDBStorage.removeItem(APP_VERSION_KEY);
  return success1 && success2;
};

export const clearAllIndexedDBData = async (): Promise<boolean> => {
  return await indexedDBStorage.clear();
};

// Helper function to check if IndexedDB is available
export const isIndexedDBAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

console.log('[INDEXEDDB] Storage module initialized');