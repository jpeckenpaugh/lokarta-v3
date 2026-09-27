import test from 'node:test';
import assert from 'node:assert/strict';

import {
  openStorage,
  closeStorage,
  put,
  read,
  getAll,
  STORES,
  MIGRATION_GUARD_KEY,
  migrateLegacySave,
} from '../services/storage.js';

/**
 * Minimal in-memory IndexedDB shim, just large enough to exercise
 * `html/services/storage.js`. It enforces the same in-line keyPath contract as
 * a browser: `put(value, explicitKey)` on an in-line-keyed store must reject
 * with a `DataError`. That is the exact defect this suite guards against.
 *
 * Registered on `globalThis.indexedDB` per test and torn down afterwards.
 */
function createFakeIndexedDB() {
  const queue = (fn) => queueMicrotask(fn);
  const keyId = (key) => JSON.stringify(key);
  const decodeInlineKey = (keyPath, value) =>
    Array.isArray(keyPath) ? keyPath.map((k) => value[k]) : value[keyPath];

  function dataError() {
    const err = new Error('The object store uses in-line keys and the key parameter was provided.');
    err.name = 'DataError';
    return err;
  }

  class FakeRequest {
    constructor() {
      this.onsuccess = null;
      this.onerror = null;
      this.result = undefined;
      this.error = null;
    }
    succeed(result) {
      queue(() => {
        this.result = result;
        this.onsuccess?.({ target: this });
      });
    }
    fail(error) {
      queue(() => {
        this.error = error;
        this.onerror?.({ target: this });
      });
    }
  }

  class FakeObjectStore {
    constructor(name, keyPath) {
      this.name = name;
      this.keyPath = keyPath ?? null;
      this.data = new Map();
    }
    get(key) {
      const req = new FakeRequest();
      req.succeed(this.data.has(keyId(key)) ? structuredClone(this.data.get(keyId(key))) : undefined);
      return req;
    }
    getAll() {
      const req = new FakeRequest();
      req.succeed([...this.data.values()].map((v) => structuredClone(v)));
      return req;
    }
    put(value, key) {
      const req = new FakeRequest();
      let effective;
      if (this.keyPath !== null) {
        if (key !== undefined) {
          req.fail(dataError());
          return req;
        }
        effective = decodeInlineKey(this.keyPath, value);
      } else {
        effective = key;
      }
      if (effective === undefined) {
        const err = new Error('DataError: no key could be derived.');
        err.name = 'DataError';
        req.fail(err);
        return req;
      }
      this.data.set(keyId(effective), structuredClone(value));
      req.succeed(effective);
      return req;
    }
    delete(key) {
      const req = new FakeRequest();
      this.data.delete(keyId(key));
      req.succeed(undefined);
      return req;
    }
    clear() {
      const req = new FakeRequest();
      this.data.clear();
      req.succeed(undefined);
      return req;
    }
  }

  class FakeTransaction {
    constructor(db, names) {
      this.db = db;
      this.names = names;
      this.oncomplete = null;
      this.onerror = null;
      this.onabort = null;
      queue(() => this.oncomplete?.({ target: this }));
    }
    objectStore(name) {
      if (!this.names.includes(name)) throw new Error(`Object store "${name}" is not in this transaction.`);
      return this.db._store(name);
    }
    abort() {
      queue(() => this.onabort?.({ target: this }));
    }
  }

  class FakeDB {
    constructor() {
      this.stores = new Map();
      this.names = new Set();
      this.version = 0;
      this.onversionchange = null;
    }
    get objectStoreNames() {
      const names = this.names;
      return { contains: (name) => names.has(name) };
    }
    createObjectStore(name, { keyPath = null } = {}) {
      this.names.add(name);
      const store = new FakeObjectStore(name, keyPath);
      this.stores.set(name, store);
      return store;
    }
    _store(name) {
      const store = this.stores.get(name);
      if (!store) throw new Error(`Object store "${name}" does not exist.`);
      return store;
    }
    transaction(names, _mode) {
      return new FakeTransaction(this, Array.isArray(names) ? names : [names]);
    }
    close() {}
  }

  return {
    _dbs: new Map(),
    open(name, version) {
      const req = new FakeRequest();
      queue(() => {
        let db = this._dbs.get(name);
        const previousVersion = db ? db.version : 0;
        if (!db) {
          db = new FakeDB();
          this._dbs.set(name, db);
        }
        if (version > previousVersion) {
          db.version = version;
          req.result = db;
          req.onupgradeneeded?.({ target: req });
        }
        req.result = db;
        req.onsuccess?.({ target: req });
      });
      return req;
    },
  };
}

const LEGACY_CHARACTER = {
  id: 'char_old',
  vocation: 'archer',
  level: 3,
  current_floor: 5,
  hp: 12,
  max_hp: 50,
  mana: 6,
  max_mana: 40,
  x: 2,
  y: 2,
  xp: 30,
  action_bar: [],
  backpack: [],
  paperdoll: {},
  skillBoosts: {},
  updatedAt: '2026-02-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

test('LIV-16 D3: legacy migration populates slot_floors', async (t) => {
  const originalIndexedDB = globalThis.indexedDB;
  globalThis.indexedDB = createFakeIndexedDB();
  t.after(() => {
    closeStorage();
    globalThis.indexedDB = originalIndexedDB;
  });

  await openStorage();
  await put(STORES.CHARACTERS, { ...LEGACY_CHARACTER });
  await put(STORES.DUNGEON_FLOORS, { floor_number: 7, template_version: 2, tiles: [] });
  await put(STORES.DUNGEON_FLOORS, { floor_number: 8, template_version: 2, tiles: [] });

  await t.test('explicit key on the in-line slot_floors store is a DataError', async () => {
    await assert.rejects(
      put(STORES.SLOT_FLOORS, { floor_number: 91 }, [1, 91]),
      (err) => err && err.name === 'DataError',
      'put(value, [slotIndex, floor]) must reject on an in-line-key store'
    );
  });

  const result = await migrateLegacySave();
  assert.equal(result.migrated, true, 'legacy character should migrate');
  assert.equal(result.recovered, false);

  await t.test('every legacy floor is copied into slot_floors keyed [1, n]', async () => {
    const floors = await getAll(STORES.SLOT_FLOORS);
    assert.equal(floors.length, 2, 'both legacy dungeon_floors rows copied');
    for (const floor of floors) {
      assert.equal(floor.slotIndex, 1, 'migrated floor must carry its slot index');
    }
    const byFloor = new Map(floors.map((f) => [f.floor_number, f]));
    assert.ok(byFloor.has(7) && byFloor.has(8));

    const direct = await read(STORES.SLOT_FLOORS, [1, 7]);
    assert.ok(direct, 'composite key round-trips through the real key shape');
    assert.equal(direct.floor_number, 7);
    assert.equal(direct.slotIndex, 1);
  });

  await t.test('slot, guard, and legacy stores are all written/left intact', async () => {
    const slot = await read(STORES.SAVE_SLOTS, 'slot_1');
    assert.ok(slot, 'slot_1 metadata written');
    assert.equal(slot.characterId, 'char_old');
    assert.equal(slot.status, 'occupied');

    const guard = await read(STORES.GAME_SETTINGS, MIGRATION_GUARD_KEY);
    assert.ok(guard && guard.done, 'migration guard written');

    const legacyFloors = await getAll(STORES.DUNGEON_FLOORS);
    assert.equal(legacyFloors.length, 2, 'legacy dungeon_floors left untouched');
    const legacyCharacter = await read(STORES.CHARACTERS, 'char_old');
    assert.ok(legacyCharacter, 'legacy character left in place');
  });

  await t.test('a second run is a no-op (idempotent)', async () => {
    const rerun = await migrateLegacySave();
    assert.equal(rerun.migrated, false);
    const floors = await getAll(STORES.SLOT_FLOORS);
    assert.equal(floors.length, 2, 'no duplicate floor rows after rerun');
  });
});
