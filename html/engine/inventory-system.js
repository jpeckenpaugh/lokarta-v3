/**
 * Lokarta: Come Into The Light - Inventory & Equipment Subsystem
 */

import { CONFIG } from './config.js';
import { ITEMS_CATALOG } from '../data/index.js';

export class InventorySystem {
  static getMaxStack(itemId) {
    if (ITEMS_CATALOG[itemId] && typeof ITEMS_CATALOG[itemId].maxStack === 'number') {
      return ITEMS_CATALOG[itemId].maxStack;
    }
    if (itemId === 'health_potion' || itemId === 'mana_potion' || itemId === 'torch') {
      return 9;
    }
    if (itemId === 'arrows') {
      return 99;
    }
    return 1;
  }

  /**
   * Automatically picks up top item into lowest empty Action Slot, then Backpack.
   */
  static pickUpItem(player, gridMap) {
    const tileItems = gridMap.getItems(player.x, player.y);
    if (tileItems.length === 0) {
      return { success: false, message: 'There is nothing here to pick up.' };
    }

    const groundItem = tileItems[tileItems.length - 1];
    const maxStack = InventorySystem.getMaxStack(groundItem.item_id);
    let totalPickedUp = 0;

    // Auto-equip gear into its empty paperdoll slot on pickup (LIV-16), so a
    // picked-up weapon/armor/relic goes straight onto the player.
    if (InventorySystem.autoEquipIfEmpty(player, groundItem)) {
      gridMap.popTopItem(player.x, player.y);
      return { success: true, message: `Auto-equipped ${groundItem.name}.`, item: groundItem };
    }

    // 0. Floor arrow drops fill the equipped quiver first (Grey Stalker arrow
    //    economy); any remainder spills to the `arrows` reserve stack below.
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

    // 1. Stack into Action Bar if stackable
    if (maxStack > 1 && player.action_bar) {
      for (let i = 0; i < player.action_bar.length; i++) {
        const slotItem = player.action_bar[i];
        if (slotItem && slotItem.item_id === groundItem.item_id && slotItem.quantity < maxStack) {
          const space = maxStack - slotItem.quantity;
          const toAdd = Math.min(space, groundItem.quantity);
          slotItem.quantity += toAdd;
          groundItem.quantity -= toAdd;
          totalPickedUp += toAdd;
          if (groundItem.quantity <= 0) break;
        }
      }
    }

    // 2. Stack into Backpack if stackable
    if (maxStack > 1 && groundItem.quantity > 0 && player.backpack) {
      for (let i = 0; i < player.backpack.length; i++) {
        const slotItem = player.backpack[i];
        if (slotItem && slotItem.item_id === groundItem.item_id && slotItem.quantity < maxStack) {
          const space = maxStack - slotItem.quantity;
          const toAdd = Math.min(space, groundItem.quantity);
          slotItem.quantity += toAdd;
          groundItem.quantity -= toAdd;
          totalPickedUp += toAdd;
          if (groundItem.quantity <= 0) break;
        }
      }
    }

    // 3. Place into lowest empty Action Slot (0..9)
    if (player.action_bar) {
      while (groundItem.quantity > 0) {
        const emptyIndex = player.action_bar.findIndex(slot => slot === null);
        if (emptyIndex === -1) break;

        const toMove = Math.min(maxStack, groundItem.quantity);
        groundItem.quantity -= toMove;
        totalPickedUp += toMove;

        player.action_bar[emptyIndex] = {
          ...groundItem,
          quantity: toMove,
        };
      }
    }

    // 4. Place into lowest empty Backpack Slot (0..5)
    if (player.backpack) {
      while (groundItem.quantity > 0) {
        const emptyIndex = player.backpack.findIndex(slot => slot === null);
        if (emptyIndex === -1) break;

        const toMove = Math.min(maxStack, groundItem.quantity);
        groundItem.quantity -= toMove;
        totalPickedUp += toMove;

        player.backpack[emptyIndex] = {
          ...groundItem,
          quantity: toMove,
        };
      }
    }

    if (groundItem.quantity <= 0) {
      gridMap.popTopItem(player.x, player.y);
    }

    if (totalPickedUp === 0) {
      return { success: false, message: 'Action Slots & Backpack are full!' };
    }

    return {
      success: true,
      message: `Picked up ${groundItem.name}${totalPickedUp > 1 ? ` (x${totalPickedUp})` : ''}.`,
      item: groundItem,
    };
  }

  /**
   * Grants an item directly to the player (guaranteed drops such as the
   * key-holder keys): stacks where possible, then fills the first empty
   * Action Slot, then Backpack. Never drops to the ground.
   * @returns {{ success: boolean, message: string, item: object|null }}
   */
  static addItem(player, item) {
    if (!player || !item || !item.item_id) {
      return { success: false, message: 'Nothing to add.', item: null };
    }

    // Auto-equip gear into its empty paperdoll slot on grant (LIV-16): chest
    // loot and rewards go straight onto the player when the slot is free.
    if (InventorySystem.autoEquipIfEmpty(player, item)) {
      return { success: true, message: `Auto-equipped ${item.name}.`, item };
    }

    const maxStack = InventorySystem.getMaxStack(item.item_id);
    let remaining = item.quantity || 1;
    const lists = [player.action_bar, player.backpack].filter(Boolean);

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

    for (const list of lists) {
      for (let i = 0; i < list.length && remaining > 0; i++) {
        if (list[i] === null) {
          const toMove = Math.min(maxStack, remaining);
          list[i] = { ...item, quantity: toMove };
          remaining -= toMove;
        }
      }
    }

    if (remaining > 0) {
      return { success: false, message: 'Action Slots & Backpack are full!', item: null };
    }

    const qty = item.quantity || 1;
    return {
      success: true,
      message: `Added ${item.name}${qty > 1 ? ` (x${qty})` : ''}.`,
      item,
    };
  }

  static dropItem(player, source, slotIndex, gridMap) {
    const list = source === 'action_bar' ? player.action_bar : player.backpack;
    if (!list || slotIndex < 0 || slotIndex >= list.length) {
      return { success: false, message: 'Invalid slot index.' };
    }

    const item = list[slotIndex];
    if (!item) {
      return { success: false, message: 'Slot is empty.' };
    }

    list[slotIndex] = null;
    gridMap.addItem(player.x, player.y, item);

    return {
      success: true,
      message: `Dropped ${item.name} on the floor.`,
      item,
    };
  }

  /**
   * Recomputes the player's max HP/MP against the equipped gear's
   * `hpBonus` / `manaBonus` totals (LOK-12: generalizes the amulet special
   * case so any slot's bonuses work). Applies only the delta between the
   * previously-applied bonus and the current equipped total, so re-equipping
   * never double-counts. Positive deltas bump current HP/MP by the gain;
   * negative deltas clamp current values to the new max.
   *
   * Legacy saves that predate `_gearBonusMaxHp` are treated as already having
   * their bonuses baked in (no re-application, no double count).
   */
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
      // First time: assume the pre-existing bonuses are already applied.
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
   * Auto-equips a picked-up/just-granted item into its empty paperdoll slot
   * (LIV-16). Data-driven via the item's `slot` (or its catalog `slot`), and
   * vocation-gated by `vocationAffinity` exactly like manual `equipItem`.
   * Consumables, keys, ammo (no `slot`) and wrong-vocation gear are left alone.
   *
   * @param {object} player
   * @param {object} item
   * @returns {boolean} true when the item was equipped
   */
  static autoEquipIfEmpty(player, item) {
    if (!player || !item) return false;
    const catalogItem = ITEMS_CATALOG[item.item_id];
    const targetSlot = item.slot || catalogItem?.slot;
    if (!targetSlot) return false;
    if (!player.paperdoll) {
      player.paperdoll = { main_hand: null, off_hand: null, armor: null, relic: null };
    }
    if (player.paperdoll[targetSlot] !== null && player.paperdoll[targetSlot] !== undefined) {
      return false;
    }

    const affinity = item.vocationAffinity || catalogItem?.vocationAffinity;
    if (affinity && affinity !== 'neutral' && player.vocation) {
      const matches = Array.isArray(affinity) ? affinity.includes(player.vocation) : affinity === player.vocation;
      if (!matches) return false;
    }

    player.paperdoll[targetSlot] = { ...item, quantity: 1 };
    InventorySystem.recomputeGearBonuses(player);
    return true;
  }

  static equipItem(player, source, slotIndex) {
    const list = source === 'action_bar' ? player.action_bar : player.backpack;
    if (!list || slotIndex < 0 || slotIndex >= list.length) {
      return { success: false, message: 'Invalid slot.' };
    }

    const item = list[slotIndex];
    if (!item) {
      return { success: false, message: 'No item in selected slot.' };
    }

    const catalogItem = ITEMS_CATALOG[item.item_id];
    const targetSlot = item.slot || catalogItem?.slot;
    if (!targetSlot) {
      return { success: false, message: `${item.name} cannot be equipped.` };
    }

    const affinity = item.vocationAffinity || catalogItem?.vocationAffinity;
    if (affinity && affinity !== 'neutral' && player?.vocation) {
      const vocationMatches = Array.isArray(affinity) ? affinity.includes(player.vocation) : affinity === player.vocation;
      if (!vocationMatches) {
        const label = Array.isArray(affinity)
          ? affinity.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join('/')
          : (affinity.charAt(0).toUpperCase() + affinity.slice(1));
        return { success: false, message: `Only a ${label} can equip ${item.name}!` };
      }
    }

    if (!player.paperdoll) {
      player.paperdoll = { main_hand: null, off_hand: null, armor: null, relic: null };
    }

    const currentlyEquipped = player.paperdoll[targetSlot];

    if (item.quantity > 1) {
      item.quantity -= 1;
      player.paperdoll[targetSlot] = { ...item, quantity: 1 };
      if (currentlyEquipped) {
        const emptyIdx = list.findIndex(s => s === null);
        if (emptyIdx !== -1) {
          list[emptyIdx] = currentlyEquipped;
        } else {
          item.quantity += 1;
          player.paperdoll[targetSlot] = currentlyEquipped;
          return { success: false, message: 'Cannot swap: Inventory is full!' };
        }
      }
    } else {
      player.paperdoll[targetSlot] = item;
      list[slotIndex] = currentlyEquipped;
    }

    // Recompute max HP/MP from the post-swap paperdoll (hpBonus/manaBonus on
    // any slot; generalizes the old amulet-only special case).
    InventorySystem.recomputeGearBonuses(player);

    return {
      success: true,
      message: `Equipped ${item.name} in ${targetSlot.replace('_', ' ')}.`,
      item: player.paperdoll[targetSlot],
    };
  }

  static unequipItem(player, slotName) {
    if (!player.paperdoll || !player.paperdoll[slotName]) {
      return { success: false, message: `No item equipped in ${slotName.replace('_', ' ')}.` };
    }

    const item = player.paperdoll[slotName];

    // Try placing into Action Bar first
    if (player.action_bar) {
      const emptyActionIdx = player.action_bar.findIndex(s => s === null);
      if (emptyActionIdx !== -1) {
        player.paperdoll[slotName] = null;
        player.action_bar[emptyActionIdx] = item;
        InventorySystem.recomputeGearBonuses(player);
        return { success: true, message: `Unequipped ${item.name} to Action Slot ${emptyActionIdx + 1}.`, item };
      }
    }

    // Try placing into Backpack
    if (player.backpack) {
      const emptyBpIdx = player.backpack.findIndex(s => s === null);
      if (emptyBpIdx !== -1) {
        player.paperdoll[slotName] = null;
        player.backpack[emptyBpIdx] = item;
        InventorySystem.recomputeGearBonuses(player);
        return { success: true, message: `Unequipped ${item.name} to Backpack Slot ${emptyBpIdx + 1}.`, item };
      }
    }

    return { success: false, message: 'Cannot unequip: Inventory is full!' };
  }

  static useBackpackItem(player, slotIndex) {
    if (slotIndex < 0 || slotIndex >= player.backpack.length) {
      return { success: false, message: 'Invalid backpack slot.' };
    }

    const item = player.backpack[slotIndex];
    if (!item) {
      return { success: false, message: 'Slot is empty.' };
    }

    if (item.type === 'consumable') {
      return InventorySystem.consumeItem(player, item, () => {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          player.backpack[slotIndex] = null;
        }
      });
    }

    if (item.type === 'weapon' || item.type === 'offhand' || item.type === 'armor' || item.type === 'relic' || item.item_id === 'torch') {
      return InventorySystem.equipItem(player, 'backpack', slotIndex);
    }

    return { success: false, message: `Cannot use ${item.name}.` };
  }

  static consumeItem(player, item, removeCallback) {
    if (item.item_id === 'health_potion') {
      if (player.hp >= player.max_hp) {
        return { success: false, message: 'Health is already full!' };
      }
      const healAmount = item.stat_bonus || CONFIG.HEALTH_POTION_HEAL;
      const restored = Math.min(healAmount, player.max_hp - player.hp);
      player.hp = Math.min(player.max_hp, player.hp + healAmount);
      removeCallback();
      return {
        success: true,
        message: `Drank Health Potion. Restored +${restored} HP (${player.hp}/${player.max_hp}).`,
        item,
      };
    }

    if (item.item_id === 'mana_potion') {
      if (player.mana >= player.max_mana) {
        return { success: false, message: 'Mana is already full!' };
      }
      const restoreAmount = item.stat_bonus || CONFIG.MANA_POTION_RESTORE;
      const restored = Math.min(restoreAmount, player.max_mana - player.mana);
      player.mana = Math.min(player.max_mana, player.mana + restoreAmount);
      removeCallback();
      return {
        success: true,
        message: `Drank Mana Potion. Restored +${restored} MP (${player.mana}/${player.max_mana}).`,
        item,
      };
    }

    return { success: false, message: `Unknown consumable item: ${item.name}` };
  }
}
