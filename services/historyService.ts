import { HistoryItem } from '../types';

const DB_NAME = 'ImaginAI_DB';
const STORE_NAME = 'history';
const DB_VERSION = 2; // Bump version to add index

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        store = transaction!.objectStore(STORE_NAME);
      }

      // Add timestamp index if not exists
      if (!store.indexNames.contains('timestamp')) {
        store.createIndex('timestamp', 'timestamp', { unique: false });
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

      // Use index if available, else standard fallback
      const request = store.indexNames.contains('timestamp')
        ? store.index('timestamp').getAll()
        : store.getAll();

      request.onsuccess = () => {
        let result = request.result as HistoryItem[];
        // If used index, getAll doesn't guarantee sort order in some old browsers, but usually does.
        // If not using index (fallback), we must sort.
        if (!store.indexNames.contains('timestamp')) {
          result.sort((a, b) => b.timestamp - a.timestamp);
        } else {
          // Index 'getAll' returns in ascending order by default. Reverse it.
          result.reverse();
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IDB Read Error:", e);
    return [];
  }
};

// Get history items with pagination for progressive loading
// Lightweight Mode: Strips heavy image data
export const getHistoryPaginated = async (
  limit: number,
  offset: number = 0
): Promise<{ items: HistoryItem[]; hasMore: boolean; total: number }> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const total = countRequest.result;
        const items: HistoryItem[] = [];

        // Use Index to iterate
        // 'prev' direction gives us newest first (Descending)
        const index = store.index('timestamp');
        const cursorRequest = index.openCursor(null, 'prev');

        let hasSkipped = false;
        let counter = 0;

        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;

          if (!cursor) {
            // End of cursor
            resolve({ items, hasMore: false, total });
            return;
          }

          // Optimized Skip
          if (offset > 0 && !hasSkipped) {
            hasSkipped = true;
            // advance() is much faster than iterating one by one
            cursor.advance(offset);
            return;
          }

          // Collect items up to limit
          if (items.length < limit) {
            const fullItem = cursor.value as HistoryItem;

            // LIGHTWEIGHT MODE: Strip heavy base64 strings
            // Only keep thumbnail. 
            // IMPORTANT: We do NOT delete from DB, only from the return object!
            const lightweightItem: HistoryItem = {
              ...fullItem,
              originalImage: '', // Strip
              generatedImage: '', // Strip (ensure thumbnails are used in UI)
              hasOriginalImage: !!fullItem.originalImage, // Flag to indicate if original exists (to prevent UI flickering)
              // Ensure we have a thumbnail. If not, we might have to fallback (but for performance we assume thumbs exist)
              generatedImageThumb: fullItem.generatedImageThumb || fullItem.generatedImage // Fallback if no thumb, but risky for memory. ideally migrating thumbs.
            };

            // Safety check: if fallback was used and it's huge, maybe truncate? 
            // For now trust the plan that we rely on thumbnails.

            items.push(lightweightItem);
            cursor.continue();
          } else {
            // We have enough
            resolve({ items, hasMore: offset + items.length < total, total });
          }
        };

        cursorRequest.onerror = () => reject(cursorRequest.error);
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