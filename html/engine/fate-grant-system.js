/**
 * Lokarta: Come Into The Light - Fate Grant Draft Subsystem
 */

import { CARDS_CATALOG, ITEMS_CATALOG } from '../data/index.js';

export class FateGrantSystem {
  static CARD_DATABASE = CARDS_CATALOG;

  static generateDraftOffer(vocationOrPlayer, level = 1) {
    const player = typeof vocationOrPlayer === 'object' ? vocationOrPlayer : null;
    const vocation = player ? (player.vocation || 'magician') : vocationOrPlayer;

    const pool = [...FateGrantSystem.CARD_DATABASE];
    // Filter to include ONLY cards matching the player's class OR neutral cards
    const eligibleCards = pool.filter(
      c => !c.vocationAffinity || c.vocationAffinity === 'neutral' || c.vocationAffinity === vocation
    );

    FateGrantSystem.shuffle(eligibleCards);

    // Helper to find player's existing item of an item_id
    const findExistingItem = (itemId) => {
      if (!player) return null;
      const allSlots = [...(player.action_bar || []), ...(player.paperdoll ? Object.values(player.paperdoll) : []), ...(player.backpack || [])];
      return allSlots.find(item => item && (item.item_id === itemId || (itemId === 'apprentice_wand' && item.item_id === 'spell_wand_spark') || (itemId === 'spell_wand_spark' && item.item_id === 'apprentice_wand') || (itemId === 'astral_scepter' && item.item_id === 'spell_energy_beam') || (itemId === 'spell_energy_beam' && item.item_id === 'astral_scepter')));
    };

    const chosenCards = [];
    for (const c of eligibleCards) {
      if (chosenCards.length >= 5) break;
      const card = JSON.parse(JSON.stringify(c));
      const itemId = card.item?.item_id;
      const existing = findExistingItem(itemId);

      if (existing) {
        const currentLevel = existing.itemLevel || 1;
        if (currentLevel >= 5) {
          // Max level reached, skip offering this item duplicate
          continue;
        }

        // Convert card offer to a Level Up upgrade card
        card.isUpgrade = true;
        card.targetItemId = existing.item_id;
        card.targetItemLevel = currentLevel;

        if (itemId === 'apprentice_wand' || itemId === 'spell_wand_spark') {
          const dmgInc = Math.floor(Math.random() * (6 - 4 + 1)) + 4; // +4-6 damage
          card.upgradeDmgInc = dmgInc;
          card.name = `LEVEL UP: ${existing.name || 'Spark Wand'} (Rank ${currentLevel + 1})`;
          card.description = `Level Up ${existing.name || 'Spark Wand'} (Rank ${currentLevel} ➔ ${currentLevel + 1}): +${dmgInc} Damage, +1 Targeting Range, +1 MP Cost.`;
          card.statBonusText = `+${dmgInc} Dmg, +1 Range (+1 MP)`;
        } else if (itemId === 'astral_scepter' || itemId === 'spell_energy_beam') {
          card.name = `LEVEL UP: ${existing.name || 'Beam Staff'} (Rank ${currentLevel + 1})`;
          card.description = `Level Up ${existing.name || 'Beam Staff'} (Rank ${currentLevel} ➔ ${currentLevel + 1}): +5 Wave Dmg, +1 Wave Range, +5 MP Cost.`;
          card.statBonusText = `+5 Wave Dmg, +1 Range (+5 MP)`;
        }
      } else {
        // First-time grant
        if (card.item && (card.item.item_id === 'apprentice_wand' || card.item.item_id === 'spell_wand_spark')) {
          const rolledDmg = Math.floor(Math.random() * (16 - 12 + 1)) + 12;
          card.item.damage = rolledDmg;
          card.item.itemLevel = 1;
          card.description = `Cast radiant projectile for ${rolledDmg} magic damage (${card.item.manaCost || 1} MP).`;
          card.statBonusText = `${rolledDmg} Dmg (${card.item.manaCost || 1} MP)`;
        } else if (card.item && (card.item.item_id === 'astral_scepter' || card.item.item_id === 'spell_energy_beam')) {
          card.item.itemLevel = 1;
        }
      }

      chosenCards.push(card);
    }

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
      const targetItemId = card.targetItemId || card.item?.item_id;

      // Check if player already possesses this item to perform an in-place upgrade
      const allSlots = [
        ...(player.action_bar ? player.action_bar.map((it, idx) => ({ it, container: 'action_bar', idx })) : []),
        ...(player.paperdoll ? Object.entries(player.paperdoll).map(([key, it]) => ({ it, container: 'paperdoll', key })) : []),
        ...(player.backpack ? player.backpack.map((it, idx) => ({ it, container: 'backpack', idx })) : []),
      ];

      const existingSlot = allSlots.find(s => s.it && (s.it.item_id === targetItemId || (targetItemId === 'apprentice_wand' && s.it.item_id === 'spell_wand_spark') || (targetItemId === 'spell_wand_spark' && s.it.item_id === 'apprentice_wand') || (targetItemId === 'astral_scepter' && s.it.item_id === 'spell_energy_beam') || (targetItemId === 'spell_energy_beam' && s.it.item_id === 'astral_scepter')));

      if (existingSlot || card.isUpgrade) {
        const item = existingSlot ? existingSlot.it : null;
        if (item) {
          item.itemLevel = Math.min(5, (item.itemLevel || 1) + 1);
          const itemBaseId = item.item_id;

          if (itemBaseId === 'apprentice_wand' || itemBaseId === 'spell_wand_spark') {
            const dmgInc = card.upgradeDmgInc || (Math.floor(Math.random() * (6 - 4 + 1)) + 4);
            item.damage = (item.damage || 14) + dmgInc;
            item.range = (item.range || 5) + 1;
            item.manaCost = (item.manaCost || 1) + 1;
            result.addedToHotbar.push(`${item.name || 'Spark Wand'} Upgraded to Rank ${item.itemLevel} (+${dmgInc} Dmg, +1 Range, +1 MP)`);
          } else if (itemBaseId === 'astral_scepter' || itemBaseId === 'spell_energy_beam') {
            item.stepDamageBonus = (item.stepDamageBonus || 0) + 5;
            item.range = (item.range || 4) + 1;
            item.manaCost = (item.manaCost || 5) + 5;
            result.addedToHotbar.push(`${item.name || 'Beam Staff'} Upgraded to Rank ${item.itemLevel} (+5 Wave Dmg, +1 Range, +5 MP)`);
          }
          continue;
        }
      }

      const itemToPlace = JSON.parse(JSON.stringify(card.item));
      if (!itemToPlace.itemLevel) itemToPlace.itemLevel = 1;

      // Roll fixed damage stats for items with random ranges when offered/drafted
      if ((itemToPlace.item_id === 'apprentice_wand' || itemToPlace.item_id === 'spell_wand_spark') && !itemToPlace.damage) {
        itemToPlace.damage = Math.floor(Math.random() * (16 - 12 + 1)) + 12;
      }

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
