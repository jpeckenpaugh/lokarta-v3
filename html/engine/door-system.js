/**
 * Lokarta: Come Into The Light - Key & Gated-Door Subsystem
 *
 * Runtime half of the key-gated progression authored in `doors.json` /
 * `tower_levels.json`: key holders drop their key on defeat, holding a key
 * unlocks the matching GATED_DOOR tiles, and closed gates block movement.
 *
 * Pure and data-driven — every tier resolves through `DOORS_CATALOG[tier]
 * .keyItemId`, never a hardcoded copper/silver/gold list.
 */

import { DOORS_CATALOG, ITEMS_CATALOG } from '../data/index.js';
import { TILE_TYPES } from './config.js';

export class DoorSystem {
  /** Resolves the key item id that opens `tier`, or null when unauthored. */
  static keyItemForTier(tier) {
    return DOORS_CATALOG?.[tier]?.keyItemId || null;
  }

  /**
   * Builds the guaranteed key drop for a key-holding monster, resolving the
   * item definition from `items.json`. Returns null for ordinary monsters.
   * @param {{ holdsKey?: string|null }} monster
   * @returns {object|null} serializable key stack, or null
   */
  static keyDropForMonster(monster) {
    const tier = monster?.holdsKey;
    if (!tier) return null;
    const itemId = DoorSystem.keyItemForTier(tier);
    if (!itemId) return null;
    const def = ITEMS_CATALOG?.[itemId] || {};
    return {
      item_id: itemId,
      name: def.name || `${tier} Key`,
      type: def.type || 'key',
      keyTier: tier,
      quantity: 1,
      ...(def.icon ? { icon: def.icon } : {}),
      ...(def.svgCode ? { svgCode: def.svgCode } : {}),
      ...(def.maxStack !== undefined ? { maxStack: def.maxStack } : {}),
    };
  }

  /** True when the player's action bar or backpack carries the tier's key. */
  static hasKey(player, tier) {
    const itemId = DoorSystem.keyItemForTier(tier);
    if (!itemId) return false;
    const slots = [...(player?.action_bar || []), ...(player?.backpack || [])];
    return slots.some(slot => slot && slot.item_id === itemId);
  }

  /** Every gate tier the player currently holds a key for. */
  static unlockedTiers(player) {
    return Object.keys(DOORS_CATALOG || {}).filter(tier => DoorSystem.hasKey(player, tier));
  }

  /**
   * Opens every closed GATED_DOOR tile tagged with `tier`. One-shot on key
   * grant / floor load, so the O(W*H) scan never touches a per-tick loop.
   * @returns {number} count of tiles unlocked
   */
  static openTierGates(gridMap, tier) {
    if (!gridMap || !tier) return 0;
    let opened = 0;
    for (let y = 0; y < gridMap.height; y++) {
      const row = gridMap.tiles[y];
      for (let x = 0; x < gridMap.width; x++) {
        const tile = row[x];
        if (
          tile.gateTier === tier &&
          !tile.gateOpen &&
          tile.type === TILE_TYPES.GATED_DOOR
        ) {
          tile.gateOpen = true;
          opened += 1;
        }
      }
    }
    return opened;
  }

  /**
   * Reopens every gate whose key the player already holds. Called on floor
   * load so returning to a level cannot soft-lock behind an already-earned key.
   * @returns {number} count of tiles unlocked
   */
  static syncPlayerGates(gridMap, player) {
    let opened = 0;
    for (const tier of DoorSystem.unlockedTiers(player)) {
      opened += DoorSystem.openTierGates(gridMap, tier);
    }
    return opened;
  }
}
