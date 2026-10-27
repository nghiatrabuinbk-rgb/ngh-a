// Utility for safely storing and retrieving video evidence using IndexedDB + Blob URLs
// Prevents Firestore 1MB document limit overflow while enabling unlimited video size

const DB_NAME = 'CompetitionEvidenceDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openVideoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredVideoRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

export async function saveVideoEvidence(file: File): Promise<string> {
  const id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  try {
    const db = await openVideoDB();
    const record: StoredVideoRecord = {
      id,
      name: file.name,
      type: file.type || 'video/mp4',
      size: file.size,
      blob: file,
      createdAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Return an indexed video URI that can be resolved anywhere
    return `indexeddb://${id}`;
  } catch (err) {
    console.warn('Failed to store video in IndexedDB, fallback to object URL:', err);
    return URL.createObjectURL(file);
  }
}

// In-memory cache of resolved blob URLs to prevent repeatedly querying IndexedDB
const blobUrlCache = new Map<string, string>();

export async function resolveVideoUrl(videoUri: string): Promise<string> {
  if (!videoUri) return '';
  if (videoUri.startsWith('blob:') || videoUri.startsWith('data:') || videoUri.startsWith('http')) {
    return videoUri;
  }

  if (videoUri.startsWith('indexeddb://')) {
    const id = videoUri.replace('indexeddb://', '');
    if (blobUrlCache.has(id)) {
      return blobUrlCache.get(id)!;
    }
    try {
      const db = await openVideoDB();
      const record = await new Promise<StoredVideoRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (record && record.blob) {
        const url = URL.createObjectURL(record.blob);
        blobUrlCache.set(id, url);
        return url;
      }
    } catch (err) {
      console.warn(`Could not load video for id ${id} from IndexedDB:`, err);
    }
  }

  return videoUri;
}

export async function deleteVideoEvidence(videoUri: string): Promise<void> {
  if (videoUri.startsWith('indexeddb://')) {
    const id = videoUri.replace('indexeddb://', '');
    if (blobUrlCache.has(id)) {
      URL.revokeObjectURL(blobUrlCache.get(id)!);
      blobUrlCache.delete(id);
    }
    try {
      const db = await openVideoDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Error deleting video from IndexedDB:', err);
    }
  } else if (videoUri.startsWith('blob:')) {
    URL.revokeObjectURL(videoUri);
  }
}

export function formatVideoSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
