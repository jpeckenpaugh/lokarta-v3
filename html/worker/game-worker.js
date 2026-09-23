/**
 * Lokarta: Come Into The Light - Game Worker
 * Authoritative Web Worker managing game state persistence, floor generation,
 * character progression, and settings storage.
 */

import { openStorage, read, put, getAll, clearStore, now, STORES } from '../services/storage.js';
import { generateFloor } from '../services/floor-generator.js';
import { createPlayer } from '../engine/index.js';

/**
 * Bootstraps game storage, retrieves or creates profile settings,
 * checks for an active saved character, and loads the active floor if present.
 * @param {object} [payload={}]
 * @returns {Promise<{ player: object|null, profile: object, activeFloor: object|null }>}
 */
async function handleBootstrap(payload = {}) {
  await openStorage();

  // 1. Read or initialize profile settings
  let profile = await read(STORES.PROFILE, 'default_profile');
  if (!profile) {
    profile = {
      id: 'default_profile',
      soundEnabled: true,
      volume: 0.7,
      createdAt: now(),
      updatedAt: now(),
    };
    await put(STORES.PROFILE, profile);
  }

  // 2. Check if an active character exists in characters store
  const characters = await getAll(STORES.CHARACTERS);
  let player = null;
  if (characters && characters.length > 0) {
    // Select most recently updated character
    player = characters.slice().sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt || '';
      const timeB = b.updatedAt || b.createdAt || '';
      return timeB.localeCompare(timeA);
    })[0];
  }

  // 3. Retrieve or generate active floor for the character
  let activeFloor = null;
  if (player && player.current_floor) {
    const fn = Math.max(1, Math.min(20, Math.floor(player.current_floor)));
    activeFloor = await read(STORES.DUNGEON_FLOORS, fn);
    if (!activeFloor) {
      activeFloor = generateFloor(fn);
      await put(STORES.DUNGEON_FLOORS, activeFloor);
    }
  }

  return { player, profile, activeFloor };
}

/**
 * Initializes a new character entity from vocation archetype at Level 1,
 * generates Floor 1, commits both to IndexedDB, and returns player & floor data.
 * @param {object} [payload={}]
 * @param {'magician'|'archer'} [payload.vocation='magician']
 * @returns {Promise<{ player: object, floor: object }>}
 */
async function handleNewGame(payload = {}) {
  const { vocation = 'magician' } = payload;
  await openStorage();

  // 1. Create player entity at level 1 with starter equipment & backpack
  const player = createPlayer(vocation);
  const currentTime = now();
  player.createdAt = currentTime;
  player.updatedAt = currentTime;

  // 2. Generate Floor 1
  const floor = generateFloor(1);
  if (floor.spawn_coords) {
    player.x = floor.spawn_coords.x;
    player.y = floor.spawn_coords.y;
  }
  player.current_floor = 1;

  // 3. Commit player and floor to IndexedDB
  await put(STORES.CHARACTERS, player);
  await put(STORES.DUNGEON_FLOORS, floor);

  return { player, floor };
}

/**
 * Commits current player character state to IndexedDB.
 * @param {object} payload
 * @param {object} payload.player
 * @returns {Promise<{ success: boolean, savedAt: string }>}
 */
async function handleSaveCharacter(payload = {}) {
  const { player } = payload;
  if (!player) {
    throw new Error('Missing player object in saveCharacter payload.');
  }

  await openStorage();
  const savedAt = now();
  player.updatedAt = savedAt;

  await put(STORES.CHARACTERS, player);

  return { success: true, savedAt };
}

/**
 * Retrieves cached floor from IndexedDB or generates a new one with generateFloor.
 * @param {object} [payload={}]
 * @param {number} [payload.floorNumber=1]
 * @param {boolean} [payload.forceRegenerate=false]
 * @returns {Promise<object>}
 */
async function handleGetFloor(payload = {}) {
  const { floorNumber = 1, forceRegenerate = false } = payload;
  const fn = Math.max(1, Math.min(20, Math.floor(floorNumber)));

  await openStorage();

  let floor = null;
  if (!forceRegenerate) {
    floor = await read(STORES.DUNGEON_FLOORS, fn);
  }

  if (!floor) {
    floor = generateFloor(fn);
    await put(STORES.DUNGEON_FLOORS, floor);
  }

  return floor;
}

/**
 * Advances player to next floor, updating current_floor, resetting coordinates
 * to next floor's spawn_coords, persisting character, and returning player & floor.
 * @param {object} payload
 * @param {object} payload.player
 * @param {number} [nextFloorNumber]
 * @returns {Promise<{ player: object, floor: object }>}
 */
async function handleAdvanceFloor(payload = {}) {
  const { player, nextFloorNumber } = payload;
  if (!player) {
    throw new Error('Missing player object in advanceFloor payload.');
  }

  await openStorage();

  const currentFloor = Number(player.current_floor) || 1;
  const nextFloor = Math.max(1, Math.min(20, Math.floor(nextFloorNumber !== undefined ? nextFloorNumber : (currentFloor + 1))));

  // Load or generate target floor
  let floor = await read(STORES.DUNGEON_FLOORS, nextFloor);
  if (!floor) {
    floor = generateFloor(nextFloor);
    await put(STORES.DUNGEON_FLOORS, floor);
  }

  // Update player coordinates and floor
  player.current_floor = nextFloor;
  if (floor.spawn_coords) {
    player.x = floor.spawn_coords.x;
    player.y = floor.spawn_coords.y;
  }
  player.updatedAt = now();

  // Save character
  await put(STORES.CHARACTERS, player);

  return { player, floor };
}

/**
 * Updates sound setting preference in profile store.
 * @param {object} payload
 * @param {boolean} payload.soundEnabled
 * @returns {Promise<{ soundEnabled: boolean }>}
 */
async function handleSetSoundEnabled(payload = {}) {
  const { soundEnabled } = payload;
  const isEnabled = Boolean(soundEnabled);

  await openStorage();

  let profile = await read(STORES.PROFILE, 'default_profile');
  if (!profile) {
    profile = {
      id: 'default_profile',
      soundEnabled: isEnabled,
      volume: 0.7,
      createdAt: now(),
      updatedAt: now(),
    };
  } else {
    profile.soundEnabled = isEnabled;
    profile.updatedAt = now();
  }

  await put(STORES.PROFILE, profile);

  return { soundEnabled: isEnabled };
}

/**
 * Clears characters and cached dungeon floors from IndexedDB for a clean restart.
 * @returns {Promise<{ success: boolean }>}
 */
async function handleResetProgress() {
  await openStorage();

  await clearStore(STORES.CHARACTERS);
  await clearStore(STORES.DUNGEON_FLOORS);

  return { success: true };
}

const COMMAND_HANDLERS = {
  bootstrap: handleBootstrap,
  newGame: handleNewGame,
  saveCharacter: handleSaveCharacter,
  getFloor: handleGetFloor,
  advanceFloor: handleAdvanceFloor,
  setSoundEnabled: handleSetSoundEnabled,
  resetProgress: handleResetProgress,
};

/**
 * Worker message event listener.
 * Protocol:
 * Incoming: { id: string|number, command: string, payload: object }
 * Outgoing: { id: string|number, ok: boolean, data?: any, error?: string }
 */
if (typeof self !== 'undefined') {
  self.onmessage = async ({ data }) => {
    const { id, command, payload = {} } = data || {};

    if (id === undefined || id === null) {
      console.error('game-worker: received message without request ID:', data);
      return;
    }

    try {
      const handler = COMMAND_HANDLERS[command];
      if (!handler) {
        throw new Error(`Unknown worker command: '${command}'`);
      }

      const result = await handler(payload);
      self.postMessage({ id, ok: true, data: result });
    } catch (err) {
      self.postMessage({
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
