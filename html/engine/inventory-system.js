/**
 * Lokarta: Come Into The Light - Inventory & Equipment Subsystem
 *
 * LIV-22 inventory overhaul:
 *   - 8 keyed slots: `q w e r` = equipment (main_hand/off_hand/armor/relic),
 *     `1 2 3 4` = active items (consumables/usables).
 *   - One backpack grid, default 36 slots (6x6).
 *   - Potions/consumables auto-fill an empty active slot; equipment with no
 *     free keyed slot banks into the backpack. Banked gear can be swapped into
 *     any of the 8 keyed slots.
 *
 * Slot counts and rules are catalog-driven (`items.json`, `ui.json`,
 * `keybindings.json`); there are no hardcoded constants here.
 */

import { CONFIG, INVENTORY_CONFIG } from './config.js';
import { ITEMS_CATALOG } from '../data/index.js';
import { findOwnedItem, applyItemRankUp, formatRankUpMessage } from './item-progression.js';

const EQUIP_SLOT_ORDER = ['main_hand', 'off_hand', 'armor', 'relic'];

/** Item types that occupy an equipment slot. */
const EQUIPPABLE_TYPES = new Set(['weapon', 'offhand', 'armor', 'relic']);

export class InventorySystem {
  static getMaxStack(itemId) {
    if (ITEMS_CATALOG[itemId] && typeof ITEMS_CATALOG[itemId].maxStack === 'number') {
      return ITEMS_CATALOG[itemId].maxStack;
    }
    return 1;
  }

  /** The paperdoll target slot for an item, or null when it is not equippable. */
  static equipSlotFor(item) {
    if (!item) return null;
    const catalogItem = ITEMS_CATALOG[item.item_id];
    const slot = item.slot || catalogItem?.slot;
    if (slot) return slot;
    const type = item.type || catalogItem?.type;
    if (type === 'weapon') return 'main_hand';
    if (type === 'offhand') return 'off_hand';
    if (type === 'armor') return 'armor';
    if (type === 'relic') return 'relic';
    return null;
  }

  static isEquippable(item) {
    const type = item?.type || ITEMS_CATALOG[item?.item_id]?.type;
    return EQUIPPABLE_TYPES.has(type) || item?.item_id === 'torch';
  }

  /** True when the item is a consumable/usable that belongs in 1-4. */
  static isActiveItem(item) {
    if (!item) return false;
    const type = item.type || ITEMS_CATALOG[item.item_id]?.type;
    return type === 'consumable';
  }

  static ensureContainers(player) {
    if (!player) return;
    if (!Array.isArray(player.action_bar) || player.action_bar.length !== INVENTORY_CONFIG.ACTIVE_SLOTS) {
      const next = new Array(INVENTORY_CONFIG.ACTIVE_SLOTS).fill(null);
      for (let i = 0; i < Math.min(next.length, player.action_bar?.length || 0); i++) {
        next[i] = player.action_bar[i] || null;
      }
      player.action_bar = next;
    }
    if (!Array.isArray(player.backpack) || player.backpack.length !== INVENTORY_CONFIG.BACKPACK_SLOTS) {
      const next = new Array(INVENTORY_CONFIG.BACKPACK_SLOTS).fill(null);
      for (let i = 0; i < Math.min(next.length, player.backpack?.length || 0); i++) {
        next[i] = player.backpack[i] || null;
      }
      player.backpack = next;
    }
    if (!player.paperdoll) {
      player.paperdoll = { main_hand: null, off_hand: null, armor: null, relic: null };
    }
  }

  static firstEmpty(slots) {
    if (!slots) return -1;
    for (let i = 0; i < slots.length; i++) if (slots[i] === null) return i;
    return -1;
  }

  /**
   * Resolves a keyed slot request into `{ list, index }` or null.
   * `key` may be a keybinding code (`KeyQ`, `Digit1`), an equipment slot name
   * (`main_hand`), or an active-slot string ('active:1').
   */
  static resolveKeyedSlot(player, key) {
    if (!player || key === undefined || key === null) return null;
    const k = String(key);
    const equipMap = { KeyQ: 'main_hand', KeyW: 'off_hand', KeyE: 'armor', KeyR: 'relic' };
    const slotName = equipMap[k] || (EQUIP_SLOT_ORDER.includes(k) ? k : null);
    if (slotName) return { kind: 'equipment', slot: slotName, list: null, index: -1 };
    const activeMatch = /^(Digit|active:)?([1-4])$/.exec(k);
    if (activeMatch) {
      const idx = Number(activeMatch[2]) - 1;
      if (idx >= 0 && idx < INVENTORY_CONFIG.ACTIVE_SLOTS) {
        return { kind: 'active', slot: `active_${idx}`, list: player.action_bar, index: idx };
      }
    }
    // Explicit container refs used by mouse-drag swaps: `backpack:3`, `active:2`.
    const backpackMatch = /^backpack:(\d+)$/.exec(k);
    if (backpackMatch) {
      const idx = Number(backpackMatch[1]);
      if (idx >= 0 && idx < player.backpack.length) {
        return { kind: 'backpack', slot: `backpack_${idx}`, list: player.backpack, index: idx };
      }
    }
    const activeRefMatch = /^active:(\d+)$/.exec(k);
    if (activeRefMatch) {
      const idx = Number(activeRefMatch[1]);
      if (idx >= 0 && idx < INVENTORY_CONFIG.ACTIVE_SLOTS) {
        return { kind: 'active', slot: `active_${idx}`, list: player.action_bar, index: idx };
      }
    }
    return null;
  }

  /**
   * Automatically collects the top ground item, routing consumables into empty
   * active slots and everything else into the backpack (equipment banks).
   */
  static pickUpItem(player, gridMap) {
    InventorySystem.ensureContainers(player);
    const tileItems = gridMap.getItems(player.x, player.y);
    if (tileItems.length === 0) {
      return { success: false, message: 'There is nothing here to pick up.' };
    }

    const groundItem = tileItems[tileItems.length - 1];
    const maxStack = InventorySystem.getMaxStack(groundItem.item_id);
    let totalPickedUp = 0;

    // 0. Floor arrow drops fill the equipped quiver first.
    if (groundItem.item_id === 'arrows') {
      const quiver = player.paperdoll?.off_hand;
      if (quiver && typeof quiver.arrowCount === 'number' && typeof quiver.arrowCapacity === 'number') {
        const space = quiver.arrowCapacity - quiver.arrowCount;
        if (space > 0) {
          const toFill = Math.min(space, groundItem.quantity);
          quiver.arrowCount += toFill;
          groundItem.quantity -= toFill;
          totalPickedUp += toFill;
        }
      }
    }

    const lists = [player.action_bar, player.backpack];

    // 1. Stack into any container that already holds the same item.
    if (maxStack > 1) {
      for (const list of lists) {
        for (let i = 0; i < list.length && groundItem.quantity > 0; i++) {
          const slotItem = list[i];
          if (slotItem && slotItem.item_id === groundItem.item_id && slotItem.quantity < maxStack) {
            const space = maxStack - slotItem.quantity;
            const toAdd = Math.min(space, groundItem.quantity);
            slotItem.quantity += toAdd;
            groundItem.quantity -= toAdd;
            totalPickedUp += toAdd;
          }
        }
      }
    }

    // 2. Consumables auto-fill an empty active slot (1-4).
    if (InventorySystem.isActiveItem(groundItem)) {
      while (groundItem.quantity > 0) {
        const emptyIndex = InventorySystem.firstEmpty(player.action_bar);
        if (emptyIndex === -1) break;
        const toMove = Math.min(maxStack, groundItem.quantity);
        groundItem.quantity -= toMove;
        totalPickedUp += toMove;
        player.action_bar[emptyIndex] = { ...groundItem, quantity: toMove };
      }
    }

    // 3. Anything remaining banks into the backpack grid.
    while (groundItem.quantity > 0) {
      const emptyIndex = InventorySystem.firstEmpty(player.backpack);
      if (emptyIndex === -1) break;
      const toMove = Math.min(maxStack, groundItem.quantity);
      groundItem.quantity -= toMove;
      totalPickedUp += toMove;
      player.backpack[emptyIndex] = { ...groundItem, quantity: toMove };
    }

    if (groundItem.quantity <= 0) {
      gridMap.popTopItem(player.x, player.y);
    }

    if (totalPickedUp === 0) {
      return { success: false, message: 'Active slots and backpack are full!' };
    }

    return {
      success: true,
      message: `Picked up ${groundItem.name}${totalPickedUp > 1 ? ` (x${totalPickedUp})` : ''}.`,
      item: groundItem,
    };
  }

  /**
   * Grants an item directly to the player: consumables to active slots, other
   * items bank into the backpack. Never drops to the ground. Duplicate unique
   * gear levels up the owned copy instead of stacking a second one.
   */
  static addItem(player, item) {
    if (!player || !item || !item.item_id) {
      return { success: false, message: 'Nothing to add.', item: null };
    }
    InventorySystem.ensureContainers(player);

    const maxStackForDup = InventorySystem.getMaxStack(item.item_id);
    if (maxStackForDup <= 1) {
      const owned = findOwnedItem(player, item);
      if (owned) {
        const upgrade = applyItemRankUp(player, owned, { source: 'duplicate' });
        if (upgrade) {
          return { success: true, message: formatRankUpMessage(upgrade), item: upgrade.item, upgraded: true, rank: upgrade.rank };
        }
        return { success: true, message: `${owned.name || owned.item_id} is already at max rank.`, item: owned, upgraded: false, duplicateIgnored: true };
      }
    }

    // Just-granted gear (chest loot, draft rewards) auto-equips into its empty
    // paperdoll slot; anything with no free slot banks into the backpack below.
    if (InventorySystem.autoEquipIfEmpty(player, item)) {
      return { success: true, message: `Equipped ${item.name}.`, item };
    }

    const maxStack = maxStackForDup;
    let remaining = item.quantity || 1;
    const lists = [player.action_bar, player.backpack];

    if (maxStack > 1) {
      for (const list of lists) {
        for (let i = 0; i < list.length && remaining > 0; i++) {
          const slot = list[i];
          if (slot && slot.item_id === item.item_id && slot.quantity < maxStack) {
            const toAdd = Math.min(maxStack - slot.quantity, remaining);
            slot.quantity += toAdd;
            remaining -= toAdd;
          }
        }
      }
    }

    // Consumables prefer an empty active slot before banking.
    if (InventorySystem.isActiveItem(item)) {
      for (let i = 0; i < player.action_bar.length && remaining > 0; i++) {
        if (player.action_bar[i] === null) {
          const toMove = Math.min(maxStack, remaining);
          player.action_bar[i] = { ...item, quantity: toMove };
          remaining -= toMove;
        }
      }
    }

    for (let i = 0; i < player.backpack.length && remaining > 0; i++) {
      if (player.backpack[i] === null) {
        const toMove = Math.min(maxStack, remaining);
        player.backpack[i] = { ...item, quantity: toMove };
        remaining -= toMove;
      }
    }

    if (remaining > 0) {
      return { success: false, message: 'Active slots and backpack are full!', item: null };
    }

    const qty = item.quantity || 1;
    return { success: true, message: `Added ${item.name}${qty > 1 ? ` (x${qty})` : ''}.`, item };
  }

  static dropItem(player, source, slotIndex, gridMap) {
    InventorySystem.ensureContainers(player);
    const list = source === 'action_bar' ? player.action_bar : player.backpack;
    if (!list || slotIndex < 0 || slotIndex >= list.length) {
      return { success: false, message: 'Invalid slot index.' };
    }
    const item = list[slotIndex];
    if (!item) return { success: false, message: 'Slot is empty.' };

    list[slotIndex] = null;
    gridMap.addItem(player.x, player.y, item);
    return { success: true, message: `Dropped ${item.name} on the floor.`, item };
  }

  static recomputeGearBonuses(player) {
    if (!player?.paperdoll) return;
    let hpBonus = 0;
    let manaBonus = 0;
    for (const slotName of Object.keys(player.paperdoll)) {
      const equipped = player.paperdoll[slotName];
      if (!equipped) continue;
      hpBonus += equipped.hpBonus || 0;
      manaBonus += equipped.manaBonus || 0;
    }

    if (player._gearBonusMaxHp === undefined || player._gearBonusMaxMana === undefined) {
      player._gearBonusMaxHp = hpBonus;
      player._gearBonusMaxMana = manaBonus;
      return;
    }

    const deltaHp = hpBonus - player._gearBonusMaxHp;
    const deltaMana = manaBonus - player._gearBonusMaxMana;
    if (deltaHp !== 0 || deltaMana !== 0) {
      player.max_hp = Math.max(1, (player.max_hp || 1) + deltaHp);
      player.max_mana = Math.max(1, (player.max_mana || 1) + deltaMana);
      if (deltaHp > 0) player.hp = Math.min(player.max_hp, (player.hp || 0) + deltaHp);
      if (deltaMana > 0) player.mana = Math.min(player.max_mana, (player.mana || 0) + deltaMana);
      player.hp = Math.min(player.max_hp, player.hp || 0);
      player.mana = Math.min(player.max_mana, player.mana || 0);
      player._gearBonusMaxHp = hpBonus;
      player._gearBonusMaxMana = manaBonus;
    }
  }

  /**
   * Auto-equips a just-granted item into its empty paperdoll slot. Kept for
   * draft/chest rewards so a first Golden piece lands directly on the player;
   * pickup banking for overflow is handled by `pickUpItem`.
   */
  static autoEquipIfEmpty(player, item) {
    if (!player || !item) return false;
    InventorySystem.ensureContainers(player);
    const targetSlot = InventorySystem.equipSlotFor(item);
    if (!targetSlot) return false;
    if (player.paperdoll[targetSlot] !== null && player.paperdoll[targetSlot] !== undefined) return false;

    const affinity = item.vocationAffinity || ITEMS_CATALOG[item.item_id]?.vocationAffinity;
    if (affinity && affinity !== 'neutral' && player.vocation) {
      const matches = Array.isArray(affinity) ? affinity.includes(player.vocation) : affinity === player.vocation;
      if (!matches) return false;
    }

    player.paperdoll[targetSlot] = { ...item, quantity: 1 };
    InventorySystem.recomputeGearBonuses(player);
    return true;
  }

  /**
   * Equips an item currently in the action bar or backpack into its paperdoll
   * slot, banking the previously equipped item into the backpack (bank rule).
   */
  static equipItem(player, source, slotIndex) {
    InventorySystem.ensureContainers(player);
    const list = source === 'action_bar' ? player.action_bar : player.backpack;
    if (!list || slotIndex < 0 || slotIndex >= list.length) {
      return { success: false, message: 'Invalid slot.' };
    }
    const item = list[slotIndex];
    if (!item) return { success: false, message: 'No item in selected slot.' };

    const targetSlot = InventorySystem.equipSlotFor(item);
    if (!targetSlot) return { success: false, message: `${item.name} cannot be equipped.` };

    const affinity = item.vocationAffinity || ITEMS_CATALOG[item.item_id]?.vocationAffinity;
    if (affinity && affinity !== 'neutral' && player?.vocation) {
      const vocationMatches = Array.isArray(affinity) ? affinity.includes(player.vocation) : affinity === player.vocation;
      if (!vocationMatches) {
        const label = Array.isArray(affinity)
          ? affinity.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join('/')
          : (affinity.charAt(0).toUpperCase() + affinity.slice(1));
        return { success: false, message: `Only a ${label} can equip ${item.name}!` };
      }
    }

    const currentlyEquipped = player.paperdoll[targetSlot];

    if (item.quantity > 1) {
      item.quantity -= 1;
      player.paperdoll[targetSlot] = { ...item, quantity: 1 };
      if (currentlyEquipped) {
        const emptyIdx = InventorySystem.firstEmpty(player.backpack);
        if (emptyIdx !== -1) {
          player.backpack[emptyIdx] = currentlyEquipped;
        } else {
          item.quantity += 1;
          player.paperdoll[targetSlot] = currentlyEquipped;
          return { success: false, message: 'Cannot swap: backpack is full!' };
        }
      }
    } else {
      player.paperdoll[targetSlot] = item;
      list[slotIndex] = currentlyEquipped || null;
    }

    InventorySystem.recomputeGearBonuses(player);
    return { success: true, message: `Equipped ${item.name} in ${targetSlot.replace('_', ' ')}.`, item: player.paperdoll[targetSlot] };
  }

  static unequipItem(player, slotName) {
    InventorySystem.ensureContainers(player);
    if (!player.paperdoll || !player.paperdoll[slotName]) {
      return { success: false, message: `No item equipped in ${slotName.replace('_', ' ')}.` };
    }
    const item = player.paperdoll[slotName];
    const emptyBpIdx = InventorySystem.firstEmpty(player.backpack);
    if (emptyBpIdx !== -1) {
      player.paperdoll[slotName] = null;
      player.backpack[emptyBpIdx] = item;
      InventorySystem.recomputeGearBonuses(player);
      return { success: true, message: `Unequipped ${item.name} to backpack slot ${emptyBpIdx + 1}.`, item };
    }
    return { success: false, message: 'Cannot unequip: backpack is full!' };
  }

  static useBackpackItem(player, slotIndex) {
    InventorySystem.ensureContainers(player);
    if (slotIndex < 0 || slotIndex >= player.backpack.length) {
      return { success: false, message: 'Invalid backpack slot.' };
    }
    const item = player.backpack[slotIndex];
    if (!item) return { success: false, message: 'Slot is empty.' };

    if (item.type === 'consumable') {
      return InventorySystem.consumeItem(player, item, () => {
        if (item.quantity > 1) item.quantity -= 1;
        else player.backpack[slotIndex] = null;
      });
    }
    if (InventorySystem.isEquippable(item)) {
      return InventorySystem.equipItem(player, 'backpack', slotIndex);
    }
    return { success: false, message: `Cannot use ${item.name}.` };
  }

  /**
   * Swaps a banked item (action bar or backpack) into any of the 8 keyed slots
   * (`KeyQ`..`KeyR`, `Digit1`..`Digit4`). Equipment destinations swap with the
   * paperdoll; active destinations swap with the action bar. A keyed-slot
   * source can also be moved to the backpack.
   *
   * @returns {{ success: boolean, message: string }}
   */
  static swapKeyedItem(player, from, to) {
    InventorySystem.ensureContainers(player);
    const src = InventorySystem.resolveKeyedSlot(player, from);
    const dst = InventorySystem.resolveKeyedSlot(player, to);
    if (!src || !dst) return { success: false, message: 'Invalid swap target.' };

    const read = ref => (ref.kind === 'equipment' ? player.paperdoll[ref.slot] : ref.list[ref.index]);
    const write = (ref, value) => {
      if (ref.kind === 'equipment') player.paperdoll[ref.slot] = value;
      else ref.list[ref.index] = value;
    };

    const a = read(src);
    const b = read(dst);

    // Validate the mover against the destination.
    if (dst.kind === 'equipment' && a) {
      const targetSlot = InventorySystem.equipSlotFor(a);
      // Equipment slots accept any equippable item; the swap places it in the
      // requested slot regardless of its natural slot (player intent wins).
      if (!targetSlot && !InventorySystem.isEquippable(a)) {
        return { success: false, message: `${a.name} cannot be equipped.` };
      }
    }
    if (dst.kind === 'active' && a && !InventorySystem.isActiveItem(a)) {
      return { success: false, message: `${a.name} is not an active item.` };
    }

    write(src, b || null);
    write(dst, a || null);
    InventorySystem.recomputeGearBonuses(player);

    const aName = a ? a.name : 'Empty';
    const bName = b ? b.name : 'Empty';
    return { success: true, message: `Swapped ${aName} ↔ ${bName}.` };
  }

  static consumeItem(player, item, removeCallback) {
    if (item.item_id === 'health_potion') {
      if (player.hp >= player.max_hp) return { success: false, message: 'Health is already full!' };
      const healAmount = item.stat_bonus || CONFIG.HEALTH_POTION_HEAL;
      const restored = Math.min(healAmount, player.max_hp - player.hp);
      player.hp = Math.min(player.max_hp, player.hp + healAmount);
      removeCallback();
      return { success: true, message: `Drank Health Potion. Restored +${restored} HP (${player.hp}/${player.max_hp}).`, item };
    }
    if (item.item_id === 'mana_potion') {
      if (player.mana >= player.max_mana) return { success: false, message: 'Mana is already full!' };
      const restoreAmount = item.stat_bonus || CONFIG.MANA_POTION_RESTORE;
      const restored = Math.min(restoreAmount, player.max_mana - player.mana);
      player.mana = Math.min(player.max_mana, player.mana + restoreAmount);
      removeCallback();
      return { success: true, message: `Drank Mana Potion. Restored +${restored} MP (${player.mana}/${player.max_mana}).`, item };
    }
    return { success: false, message: `Unknown consumable item: ${item.name}` };
  }
}
