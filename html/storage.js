/**
 * Lokarta: Come Into The Light - Storage Manager
 * IndexedDB database manager for persistent offline gameplay.
 */

export const DB_NAME = 'lokarta_browser_db';
export const DB_VERSION = 1;

export const STORES = {
  PROFILE: 'profile',
  CHARACTERS: 'characters',
  DUNGEON_FLOORS: 'dungeon_floors',
  GAME_SETTINGS: 'game_settings',
};

let dbInstance = null;

/**
 * Returns the current ISO 8601 UTC timestamp string.
 * @returns {string}
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Opens and initializes the IndexedDB database.
 * Creates the required object stores on initial setup or upgrade.
 * @returns {Promise<IDBDatabase>}
 */
export function openStorage() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  const idb = globalThis.indexedDB;
  if (!idb) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Profile store: player preferences (soundEnabled, volume, updatedAt, etc.)
      if (!db.objectStoreNames.contains(STORES.PROFILE)) {
        db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
      }

      // 2. Characters store: character entities and progression
      if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
        db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' });
      }

      // 3. Dungeon floors store: cached and generated floor states
      if (!db.objectStoreNames.contains(STORES.DUNGEON_FLOORS)) {
        db.createObjectStore(STORES.DUNGEON_FLOORS, { keyPath: 'floor_number' });
      }

      // 4. Game settings store: arbitrary key-value settings
      if (!db.objectStoreNames.contains(STORES.GAME_SETTINGS)) {
        db.createObjectStore(STORES.GAME_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;

      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error || new Error('Failed to open IndexedDB storage.'));
    };
  });
}

/**
 * Closes the cached database connection.
 */
export function closeStorage() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Executes a callback within an IndexedDB transaction.
 * Supports flexible signatures:
 *   transaction(db, mode, callback)
 *   transaction(storeNames, mode, callback)
 * 
 * @param {IDBDatabase|string|string[]} dbOrStores - Database instance or store name(s)
 * @param {IDBTransactionMode|Function} modeOrCallback - Transaction mode ('readonly'|'readwrite') or callback if db was passed
 * @param {Function} [callback] - Function receiving (storesMap, transaction) returning a promise or value
 * @returns {Promise<any>}
 */
export async function transaction(dbOrStores, modeOrCallback, callback) {
  let db;
  let storeNames;
  let mode;
  let cb;

  // Handle case where first param is an IDBDatabase
  if (dbOrStores && typeof dbOrStores.transaction === 'function') {
    db = dbOrStores;
    if (typeof modeOrCallback === 'function') {
      mode = 'readonly';
      cb = modeOrCallback;
      storeNames = Array.from(db.objectStoreNames);
    } else {
      mode = modeOrCallback || 'readonly';
      cb = callback;
      storeNames = Array.from(db.objectStoreNames);
    }
  } else {
    db = await openStorage();
    if (Array.isArray(dbOrStores)) {
      storeNames = dbOrStores;
    } else if (typeof dbOrStores === 'string') {
      storeNames = [dbOrStores];
    } else {
      storeNames = Object.values(STORES);
    }

    if (typeof modeOrCallback === 'function') {
      mode = 'readonly';
      cb = modeOrCallback;
    } else {
      mode = modeOrCallback || 'readonly';
      cb = callback;
    }
  }

  if (typeof cb !== 'function') {
    throw new TypeError('Transaction callback must be a function');
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const storeMap = {};
    for (const name of storeNames) {
      storeMap[name] = tx.objectStore(name);
    }

    let result;
    try {
      result = cb(storeNames.length === 1 ? storeMap[storeNames[0]] : storeMap, tx);
    } catch (err) {
      tx.abort();
      return reject(err);
    }

    tx.oncomplete = () => {
      resolve(result);
    };

    tx.onerror = (event) => {
      reject(event.target.error || new Error('Transaction failed'));
    };

    tx.onabort = (event) => {
      reject(event.target.error || new Error('Transaction was aborted'));
    };
  });
}

/**
 * Reads a single record by its key from the specified object store.
 * @param {string} storeName - Store name
 * @param {IDBValidKey} key - Key value
 * @returns {Promise<any>}
 */
export async function read(storeName, key) {
  const db = await openStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result !== undefined ? request.result : null);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Stores or updates a record in the specified object store.
 * @param {string} storeName - Store name
 * @param {any} value - Value object to store
 * @param {IDBValidKey} [key] - Optional key (if store has no inline keyPath)
 * @returns {Promise<IDBValidKey>}
 */
export async function put(storeName, value, key) {
  const db = await openStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = key !== undefined ? store.put(value, key) : store.put(value);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Retrieves all records from the specified object store.
 * @param {string} storeName - Store name
 * @returns {Promise<any[]>}
 */
export async function getAll(storeName) {
  const db = await openStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Deletes a record by key from the specified object store.
 * @param {string} storeName - Store name
 * @param {IDBValidKey} key - Key value
 * @returns {Promise<void>}
 */
export async function deleteRecord(storeName, key) {
  const db = await openStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Clears all records from the specified object store.
 * @param {string} storeName - Store name
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
  const db = await openStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}
