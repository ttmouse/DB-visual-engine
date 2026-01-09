import { HistoryItem } from '../types';

const DB_NAME = 'ImaginAI_DB';
const STORE_NAME = 'history';
const DB_VERSION = 1;

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// Get all history items sorted by timestamp
export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result as HistoryItem[];
        // Sort descending by timestamp
        resolve(result.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IDB Read Error:", e);
    return [];
  }
};

// Get history items with pagination for progressive loading
export const getHistoryPaginated = async (
  limit: number,
  offset: number = 0
): Promise<{ items: HistoryItem[]; hasMore: boolean; total: number }> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      // First get count
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const total = countRequest.result;
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const allItems = (getAllRequest.result as HistoryItem[])
            .sort((a, b) => b.timestamp - a.timestamp);

          const items = allItems.slice(offset, offset + limit);
          const hasMore = offset + limit < total;

          resolve({ items, hasMore, total });
        };

        getAllRequest.onerror = () => reject(getAllRequest.error);
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  } catch (e) {
    console.error("IDB Paginated Read Error:", e);
    return { items: [], hasMore: false, total: 0 };
  }
};

// Save or Update a history item
export const saveHistoryItem = async (item: HistoryItem): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item); // put handles both insert and update

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IDB Save Error:", e);
    throw e;
  }
};

// Delete a specific item
export const deleteHistoryItemById = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IDB Delete Error:", e);
    throw e;
  }
};

// Get a single history item by ID (for on-demand original loading)
export const getHistoryItemById = async (id: string): Promise<HistoryItem | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IDB Get Error:", e);
    return null;
  }
};

// Optional: Clear old localStorage data to free up space
export const clearLegacyStorage = () => {
  try {
    localStorage.removeItem('imaginai_history');
  } catch (e) {
    // Ignore
  }
};