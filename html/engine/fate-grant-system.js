/**
 * Lokarta: Come Into The Light - Fate Grant Draft Subsystem
 */

import { CARDS_CATALOG } from '../data/index.js';

export class FateGrantSystem {
  static CARD_DATABASE = CARDS_CATALOG;

  static generateDraftOffer(vocation, level = 1) {
    const pool = [...FateGrantSystem.CARD_DATABASE];
    const alignedCards = pool.filter(c => c.vocationAffinity === vocation);
    const otherCards = pool.filter(c => !c.vocationAffinity || c.vocationAffinity !== vocation);

    FateGrantSystem.shuffle(alignedCards);
    FateGrantSystem.shuffle(otherCards);

    const chosenCards = [];

    if (level === 1) {
      const alignedCount = Math.min(2, alignedCards.length);
      for (let i = 0; i < alignedCount; i++) {
        chosenCards.push(alignedCards[i]);
      }
      const remainingPool = [...alignedCards.slice(alignedCount), ...otherCards];
      FateGrantSystem.shuffle(remainingPool);
      for (const card of remainingPool) {
        if (chosenCards.length >= 5) break;
        if (!chosenCards.some(c => c.id === card.id)) {
          chosenCards.push(card);
        }
      }
    } else {
      const allShuffled = [...pool];
      FateGrantSystem.shuffle(allShuffled);
      for (const card of allShuffled) {
        if (chosenCards.length >= 5) break;
        if (!chosenCards.some(c => c.id === card.id)) {
          chosenCards.push(card);
        }
      }
    }

    return {
      cards: chosenCards.slice(0, 5),
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

      // If drafting a bow weapon/spell, grant starter arrows if none exist
      if (itemToPlace.item_id.includes('bow')) {
        const hasArrows = player.action_bar?.some(s => s?.item_id === 'arrows') || player.backpack?.some(s => s?.item_id === 'arrows');
        if (!hasArrows && player.backpack) {
          const arrowItem = {
            item_id: 'arrows',
            name: 'Arrows',
            type: 'ammo',
            quantity: 20,
            stat_bonus: 0,
            icon: '🏹',
          };
          const emptyBp = player.backpack.findIndex(s => s === null);
          if (emptyBp !== -1) {
            player.backpack[emptyBp] = arrowItem;
            result.addedToBackpack.push('Starter Arrows (x20)');
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
