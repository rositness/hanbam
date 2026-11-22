// Хранилище «ключ → значение» в IndexedDB с запасным вариантом в localStorage.

const DB_NAME = 'hanbam';
const STORE = 'kv';
const LS_PREFIX = 'hb:';
let dbPromise = null;
let useLocal = !('indexedDB' in self);

function openDB() {
  if (useLocal) return Promise.reject(new Error('no idb'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    }).catch((e) => { useLocal = true; throw e; });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export async function kvGet(key) {
  try {
    return await tx('readonly', (s) => s.get(key));
  } catch {
    try { const raw = localStorage.getItem(LS_PREFIX + key); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
  }
}

export async function kvSet(key, value) {
  try {
    await tx('readwrite', (s) => s.put(value, key));
  } catch {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch { /* хранилище недоступно */ }
  }
}

export async function kvClear() {
  try { await tx('readwrite', (s) => s.clear()); } catch { /* ignore */ }
  try { Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
}

export async function requestPersistence() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch { /* ignore */ }
  return false;
}
