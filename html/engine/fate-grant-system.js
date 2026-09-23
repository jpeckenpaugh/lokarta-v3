/**
 * Lokarta: Come Into The Light - Fate Grant Draft Subsystem
 */

import { CARDS_CATALOG, ITEMS_CATALOG } from '../data/index.js';

export class FateGrantSystem {
  static CARD_DATABASE = CARDS_CATALOG;

  static generateDraftOffer(vocation, level = 1) {
    const pool = [...FateGrantSystem.CARD_DATABASE];
    // Filter to include ONLY cards matching the player's class OR neutral cards
    const eligibleCards = pool.filter(
      c => !c.vocationAffinity || c.vocationAffinity === 'neutral' || c.vocationAffinity === vocation
    );

    FateGrantSystem.shuffle(eligibleCards);

    const chosenCards = eligibleCards.slice(0, 5);

    return {
      cards: chosenCards,
      requiredSelections: { min: 1, max: 2 },
    };
  }

  static applyDraftedCards(player, cards, gridMap) {
    const result = {
      addedToHotbar: [],
      addedToBackpack: [],
      droppedOnFloor: [],
    };

    for (const card of cards) {
      const itemToPlace = { ...card.item };

      // 1. Try placing into lowest empty Action Slot (0..9)
      let placedInHotbar = false;
      if (player.action_bar) {
        for (let i = 0; i < player.action_bar.length; i++) {
          if (player.action_bar[i] === null) {
            player.action_bar[i] = itemToPlace;
            result.addedToHotbar.push(`${itemToPlace.name} (Slot ${i + 1})`);
            placedInHotbar = true;
            break;
          }
        }
      }

      // If drafting an item that grants starter ammo (e.g. bow), grant starter ammo if none exist
      const grantedAmmo = itemToPlace.grantedAmmo || ITEMS_CATALOG[itemToPlace.item_id]?.grantedAmmo;
      if (grantedAmmo) {
        const ammoId = grantedAmmo.item_id;
        const hasAmmo = player.action_bar?.some(s => s?.item_id === ammoId) || player.backpack?.some(s => s?.item_id === ammoId);
        if (!hasAmmo && player.backpack) {
          const ammoCatalogItem = ITEMS_CATALOG[ammoId] || {};
          const arrowItem = {
            item_id: ammoId,
            name: ammoCatalogItem.name || 'Arrows',
            type: ammoCatalogItem.type || 'ammo',
            quantity: grantedAmmo.quantity || 20,
            stat_bonus: ammoCatalogItem.stat_bonus || 0,
            icon: ammoCatalogItem.icon || '🏹',
          };
          const emptyBp = player.backpack.findIndex(s => s === null);
          if (emptyBp !== -1) {
            player.backpack[emptyBp] = arrowItem;
            result.addedToBackpack.push(`Starter Arrows (x${arrowItem.quantity})`);
          }
        }
      }

      if (placedInHotbar) continue;

      // 2. Try placing into lowest empty Backpack Slot (0..5)
      let placedInBackpack = false;
      if (player.backpack) {
        for (let i = 0; i < player.backpack.length; i++) {
          if (player.backpack[i] === null) {
            player.backpack[i] = itemToPlace;
            result.addedToBackpack.push(`${itemToPlace.name} (Backpack ${i + 1})`);
            placedInBackpack = true;
            break;
          }
        }
      }

      if (placedInBackpack) continue;

      // 3. Drop onto floor
      if (gridMap) {
        gridMap.addItem(player.x, player.y, itemToPlace);
        result.droppedOnFloor.push(itemToPlace.name);
      }
    }

    return result;
  }

  static shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
