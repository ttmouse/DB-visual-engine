import { HistoryItem } from '../types';

const DB_NAME = 'ImaginAI_DB';
const STORE_NAME = 'history';
const DB_VERSION = 2;

/** Opens the IndexedDB database with proper upgrade handling */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      const store = db.objectStoreNames.contains(STORE_NAME)
        ? transaction!.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'id' });

      if (!store.indexNames.contains('timestamp')) {
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Executes a transaction on the history store */
async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Gets all history items sorted by timestamp (newest first) */
export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const hasIndex = store.indexNames.contains('timestamp');
      const request = hasIndex
        ? store.index('timestamp').getAll()
        : store.getAll();

      request.onsuccess = () => {
        const result = request.result as HistoryItem[];
        // Index returns ascending order, reverse for newest first
        resolve(hasIndex ? result.reverse() : result.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IDB Read Error:", e);
    return [];
  }
}

/** Creates a lightweight version of a history item (strips heavy base64 data) */
function createLightweightItem(fullItem: HistoryItem): HistoryItem {
  return {
    ...fullItem,
    originalImage: '',
    generatedImage: '',
    hasOriginalImage: !!fullItem.originalImage,
    generatedImageThumb: fullItem.generatedImageThumb || fullItem.generatedImage
  };
}

/** Gets history items with pagination, returning lightweight versions */
export async function getHistoryPaginated(
  limit: number,
  offset: number = 0
): Promise<{ items: HistoryItem[]; hasMore: boolean; total: number }> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const total = countRequest.result;
        const items: HistoryItem[] = [];
        const index = store.index('timestamp');
        const cursorRequest = index.openCursor(null, 'prev');
        let hasSkipped = false;

        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;

          if (!cursor) {
            resolve({ items, hasMore: false, total });
            return;
          }

          // Skip to offset position
          if (offset > 0 && !hasSkipped) {
            hasSkipped = true;
            cursor.advance(offset);
            return;
          }

          if (items.length < limit) {
            items.push(createLightweightItem(cursor.value as HistoryItem));
            cursor.continue();
          } else {
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
}

/** Saves or updates a history item */
export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(item));
  } catch (e) {
    console.error("IDB Save Error:", e);
    throw e;
  }
}

/** Deletes a history item by ID */
export async function deleteHistoryItemById(id: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(id));
  } catch (e) {
    console.error("IDB Delete Error:", e);
    throw e;
  }
}

/** Gets a single history item by ID */
export async function getHistoryItemById(id: string): Promise<HistoryItem | null> {
  try {
    const result = await withStore('readonly', (store) => store.get(id));
    return result || null;
  } catch (e) {
    console.error("IDB Get Error:", e);
    return null;
  }
}

/** Clears legacy localStorage data */
export function clearLegacyStorage(): void {
  try {
    localStorage.removeItem('imaginai_history');
  } catch {
    // Ignore errors
  }
}