import { RecordedTake } from '../types';

const DB_NAME = 'reaction_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'takes';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTakeToStorage(take: RecordedTake): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // We don't store videoUrl because Object URLs are ephemeral per session
      const record = {
        id: take.id,
        timestamp: take.timestamp,
        duration: take.duration,
        videoBlob: take.videoBlob,
        title: take.title,
        layout: take.layout,
        aspectRatio: take.aspectRatio,
        sizeBytes: take.sizeBytes,
        thumbnailUrl: take.thumbnailUrl || null,
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save take to IndexedDB:', err);
  }
}

export async function loadTakesFromStorage(): Promise<RecordedTake[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []) as Array<{
          id: string;
          timestamp: number;
          duration: number;
          videoBlob: Blob;
          title: string;
          layout: any;
          aspectRatio: any;
          sizeBytes: number;
          thumbnailUrl?: string;
        }>;

        // Sort descending by timestamp
        records.sort((a, b) => b.timestamp - a.timestamp);

        const loaded: RecordedTake[] = records.map((rec) => ({
          id: rec.id,
          timestamp: rec.timestamp,
          duration: rec.duration,
          videoBlob: rec.videoBlob,
          videoUrl: URL.createObjectURL(rec.videoBlob),
          title: rec.title,
          layout: rec.layout,
          aspectRatio: rec.aspectRatio,
          sizeBytes: rec.sizeBytes,
          thumbnailUrl: rec.thumbnailUrl,
        }));

        resolve(loaded);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load takes from IndexedDB:', err);
    return [];
  }
}

export async function deleteTakeFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete take from IndexedDB:', err);
  }
}
