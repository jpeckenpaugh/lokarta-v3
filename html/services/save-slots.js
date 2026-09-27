/**
 * Lokarta: Come Into The Light - Save Slot & Options Helpers
 *
 * Pure, browser-free helpers shared by the storage layer, the game worker,
 * and the native Node test suite. Nothing here touches IndexedDB, the DOM,
 * the Web Worker API, or timers.
 */

import { UI_CATALOG } from '../data/index.js';

/** Number of independent save slots (from the ui.json presentation catalog). */
export const SAVE_SLOT_COUNT = (UI_CATALOG && UI_CATALOG.saveSlots && UI_CATALOG.saveSlots.count) || 5;

/** Default persisted options (from the ui.json presentation catalog). */
export const OPTION_DEFAULTS = Object.freeze({
  ...(UI_CATALOG?.options?.defaults || {}),
});

/** Option value ranges/enums (from the ui.json presentation catalog). */
export const OPTION_RANGES = Object.freeze({
  ...(UI_CATALOG?.options?.ranges || {}),
});

const REDUCE_MOTION_VALUES = ['system', 'on', 'off'];

/**
 * Canonical slot id for a 1-based slot index.
 * @param {number} slotIndex
 * @returns {string}
 */
export function slotId(slotIndex) {
  return `slot_${slotIndex}`;
}

/**
 * Canonical composite key for a slot's cached floor record.
 * @param {number} slotIndex
 * @param {number} floorNumber
 * @returns {[number, number]}
 */
export function slotFloorKey(slotIndex, floorNumber) {
  return [slotIndex, floorNumber];
}

/**
 * A blank slot record for an unused slot.
 * @param {number} slotIndex
 * @returns {object}
 */
export function emptySlotRecord(slotIndex) {
  return {
    id: slotId(slotIndex),
    slotIndex,
    status: 'empty',
    characterId: null,
    name: null,
    vocation: null,
    level: null,
    currentFloor: null,
    biome: null,
    playtimeMs: 0,
    floorEntry: null,
    createdAt: null,
    updatedAt: null,
    lastPlayedAt: null,
  };
}

/**
 * A deep, serializable snapshot of the player state restored by Retry/Continue.
 * @param {object|null} player
 * @returns {object|null}
 */
export function snapshotFloorEntry(player) {
  if (!player) return null;
  return {
    hp: player.hp,
    max_hp: player.max_hp,
    mana: player.mana,
    max_mana: player.max_mana,
    x: player.x,
    y: player.y,
    current_floor: player.current_floor,
    level: player.level,
    xp: player.xp,
    action_bar: clone(player.action_bar),
    backpack: clone(player.backpack),
    paperdoll: clone(player.paperdoll),
    skillBoosts: clone(player.skillBoosts),
  };
}

/**
 * Applies a floor-entry snapshot onto a player object (mutates and returns it).
 * @param {object} player
 * @param {object|null} entry
 * @returns {object}
 */
export function restoreFloorEntry(player, entry) {
  if (!player || !entry) return player;
  for (const [key, value] of Object.entries(entry)) {
    player[key] = clone(value);
  }
  return player;
}

/**
 * Builds the persisted metadata record for an occupied slot from a player.
 * @param {object} player
 * @param {number} slotIndex
 * @param {string} [biome]
 * @returns {object}
 */
export function deriveSlotMeta(player, slotIndex, biome = null) {
  const existing = player?.updatedAt || null;
  return {
    id: slotId(slotIndex),
    slotIndex,
    status: 'occupied',
    characterId: player?.id || null,
    name: player?.name || null,
    vocation: player?.vocation || null,
    level: Number(player?.level) || 1,
    currentFloor: Number(player?.current_floor) || 1,
    biome: biome || null,
    playtimeMs: Number(player?.playtimeMs) || 0,
    floorEntry: snapshotFloorEntry(player),
    createdAt: player?.createdAt || existing,
    updatedAt: existing,
    lastPlayedAt: player?.lastPlayedAt || existing,
  };
}

/**
 * Renders the destructive-confirm summary for an occupied slot.
 * @param {object} slot
 * @returns {string}
 */
export function summarizeSlot(slot) {
  const vocation = String(slot?.vocation || 'unknown').toUpperCase();
  const level = Number(slot?.level) || 1;
  const floor = Number(slot?.currentFloor) || 1;
  return `${vocation} — Level ${level}, Floor ${floor}`;
}

/**
 * Formats playtime for a slot card: "New" under a minute, else "Xh Ym".
 * @param {number} ms
 * @returns {string}
 */
export function formatPlaytime(ms) {
  const totalMs = Number(ms) || 0;
  if (totalMs < 60000) return 'New';
  const totalMinutes = Math.floor(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Resolves the effective reduce-motion boolean from a setting + system pref.
 * @param {'system'|'on'|'off'} setting
 * @param {boolean} systemPrefersReduced
 * @returns {boolean}
 */
export function resolveReducedMotion(setting, systemPrefersReduced) {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return Boolean(systemPrefersReduced);
}

/**
 * Merges raw persisted options over the catalog defaults. Unknown keys are
 * dropped, numeric ranges are clamped, invalid enums fall back to defaults,
 * and missing keys are filled. Never throws.
 * @param {object|null} raw
 * @returns {object}
 */
export function normalizeOptions(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const result = {};
  for (const [key, fallback] of Object.entries(OPTION_DEFAULTS)) {
    const value = source[key];
    if (value === undefined || value === null) {
      result[key] = fallback;
      continue;
    }

    if (typeof fallback === 'boolean') {
      result[key] = typeof value === 'boolean' ? value : Boolean(value);
      continue;
    }

    if (typeof fallback === 'number') {
      const range = OPTION_RANGES[key] || {};
      let num = Number(value);
      if (!Number.isFinite(num)) {
        result[key] = fallback;
        continue;
      }
      if (typeof range.min === 'number') num = Math.max(range.min, num);
      if (typeof range.max === 'number') num = Math.min(range.max, num);
      result[key] = num;
      continue;
    }

    if (key === 'reduceMotion') {
      result[key] = REDUCE_MOTION_VALUES.includes(value) ? value : fallback;
      continue;
    }

    const allowed = OPTION_RANGES[key];
    if (allowed && typeof allowed === 'object') {
      result[key] = Object.prototype.hasOwnProperty.call(allowed, value) ? value : fallback;
      continue;
    }

    result[key] = value;
  }
  return result;
}

/**
 * Pure planner for the v1 -> v2 single-save migration.
 *
 * Returns the exact writes the storage layer must perform. When the guard is
 * already present the migration is a no-op. When there is no legacy
 * character, only the guard is written.
 *
 * @param {object[]} legacyCharacters
 * @param {object[]} legacyFloors
 * @param {object|null} guard - existing `migration_slot_v2` record
 * @returns {{ alreadyDone: boolean, guard: object|null, slot: object|null, character: object|null, floors: object[] }}
 */
export function planLegacyMigration(legacyCharacters, legacyFloors, guard = null) {
  if (guard && guard.done) {
    return { alreadyDone: true, guard: null, slot: null, character: null, floors: [] };
  }

  const guardRecord = {
    key: 'migration_slot_v2',
    done: true,
    migratedAt: null,
    fromCharacterId: null,
  };

  const characters = Array.isArray(legacyCharacters) ? legacyCharacters.filter(Boolean) : [];
  if (characters.length === 0) {
    return { alreadyDone: false, guard: guardRecord, slot: null, character: null, floors: [] };
  }

  const newest = characters.slice().sort((a, b) => {
    const timeA = a.updatedAt || a.createdAt || '';
    const timeB = b.updatedAt || b.createdAt || '';
    return timeB.localeCompare(timeA);
  })[0];

  const character = { ...newest, slotId: slotId(1), slotIndex: 1, playtimeMs: Number(newest.playtimeMs) || 0 };
  const slot = deriveSlotMeta(character, 1, newest.biome || null);
  guardRecord.fromCharacterId = character.id || null;

  const floors = (Array.isArray(legacyFloors) ? legacyFloors : [])
    .filter(Boolean)
    .map(floor => ({ key: slotFloorKey(1, floor.floor_number), floor }));

  return { alreadyDone: false, guard: guardRecord, slot, character, floors };
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
