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
    const eligibleCards = pool.filter(c => {
      if (!c.vocationAffinity || c.vocationAffinity === 'neutral') return true;
      if (Array.isArray(c.vocationAffinity)) return c.vocationAffinity.includes(vocation);
      return c.vocationAffinity === vocation;
    });

    const orderedPool = [...eligibleCards];
    FateGrantSystem.shuffle(orderedPool);

    // Helper to find player's existing item matching item_id or actionKey
    const findExistingItem = (itemId, cardItem) => {
      if (!player) return null;
      const catalogEntry = ITEMS_CATALOG[itemId];
      if (!catalogEntry?.upgradeSpec) return null;
      const cardActionKey = cardItem?.actionKey || catalogEntry?.actionKey;
      const allSlots = [...(player.action_bar || []), ...(player.paperdoll ? Object.values(player.paperdoll) : []), ...(player.backpack || [])];
      return allSlots.find(item => item && (item.item_id === itemId || (cardActionKey && (item.actionKey === cardActionKey || ITEMS_CATALOG[item.item_id]?.actionKey === cardActionKey))));
    };

    const chosenCards = [];
    for (const c of orderedPool) {
      if (chosenCards.length >= 5) break;
      const card = JSON.parse(JSON.stringify(c));
      const itemId = card.item?.item_id;
      const catalogEntry = ITEMS_CATALOG[itemId] || {};
      const existing = findExistingItem(itemId, card.item);

      if (existing) {
        const currentLevel = existing.itemLevel || 1;
        if (currentLevel >= 5) continue;

        card.isUpgrade = true;
        card.targetItemId = existing.item_id;
        card.targetItemLevel = currentLevel;

        const spec = catalogEntry.upgradeSpec;
        const prevRank = currentLevel;
        const nextRank = currentLevel + 1;

        if (spec) {
          const dmgInc = spec.randomDamageInc ? (Math.floor(Math.random() * (spec.randomDamageInc[1] - spec.randomDamageInc[0] + 1)) + spec.randomDamageInc[0]) : (spec.stepDamageInc || 0);
          if (dmgInc) card.upgradeDmgInc = dmgInc;

          const cooldownSec = Math.max(12, 22 - 2 * nextRank);
          card.name = `LEVEL UP: ${existing.name || card.name} (Rank ${nextRank})`;
          card.description = (spec.descriptionPattern || '')
            .replace('{prevRank}', prevRank)
            .replace('{nextRank}', nextRank)
            .replace('{dmgInc}', dmgInc)
            .replace('{cooldownSec}', cooldownSec);
          card.statBonusText = (spec.statBonusTextPattern || '')
            .replace('{dmgInc}', dmgInc)
            .replace('{nextRank}', nextRank)
            .replace('{cooldownSec}', cooldownSec);
        } else {
          card.name = `LEVEL UP: ${existing.name || card.name} (Rank ${nextRank})`;
          card.description = `Level Up ${existing.name || card.name} (Rank ${prevRank} ➔ ${nextRank}).`;
          card.statBonusText = `Rank ${nextRank}`;
        }
      } else {
        if (catalogEntry.damageMin && catalogEntry.damageMax && !card.item?.damage) {
          const rolledDmg = Math.floor(Math.random() * (catalogEntry.damageMax - catalogEntry.damageMin + 1)) + catalogEntry.damageMin;
          if (card.item) card.item.damage = rolledDmg;
          card.description = `${card.description} (${rolledDmg} Dmg)`;
        }
        if (card.item && !card.item.itemLevel) {
          card.item.itemLevel = 1;
        }
      }

      chosenCards.push(card);
    }

    // Rule guard: at game start (level 1) every vocation must be OFFERED at
    // least one main_hand card and one off_hand card so the player can always
    // attack and progress. This is an offer-only guarantee — nothing is
    // auto-equipped and selection is never forced. Level > 1 drafts are unchanged.
    if (level === 1) {
      FateGrantSystem.guaranteeLevelOneHandSlots(chosenCards, eligibleCards, vocation);
    }

    return {
      cards: chosenCards,
      requiredSelections: { min: 1, max: 2 },
    };
  }

  /**
   * Resolves the paperdoll slot for a card's item by falling back to the
   * items catalog entry. Cards embed no slot themselves.
   */
  static resolveCardSlot(card) {
    const itemId = card?.item?.item_id;
    if (!itemId) return null;
    return card.item?.slot || ITEMS_CATALOG[itemId]?.slot || null;
  }

  /**
   * Level-1 rule guard: ensures the offered draft contains at least one
   * main_hand and one off_hand card for the vocation. If a slot is missing,
   * a matching offer card is injected (preferring the vocation's own affinity
   * cards, then neutral). The injection only touches the OFFER — it never
   * equips anything and never forces a selection. If no catalog candidate
   * exists for a slot, nothing is invented (the gap is surfaced by the caller).
   */
  static guaranteeLevelOneHandSlots(offeredCards, eligibleCards, vocation) {
    const hasSlot = (slot) => offeredCards.some((c) => FateGrantSystem.resolveCardSlot(c) === slot);

    const injectForSlot = (slot) => {
      if (hasSlot(slot)) return;

      const candidates = eligibleCards.filter((c) => FateGrantSystem.resolveCardSlot(c) === slot);
      if (candidates.length === 0) return; // no catalog candidate — do not fabricate

      // Prefer the vocation's own affinity cards over neutral ones.
      const affinityScore = (card) => {
        const aff = card.vocationAffinity;
        if (!aff || aff === 'neutral') return 0;
        if (Array.isArray(aff)) return aff.includes(vocation) ? 2 : 1;
        return aff === vocation ? 2 : 1;
      };
      candidates.sort((a, b) => affinityScore(b) - affinityScore(a));

      const offerCard = JSON.parse(JSON.stringify(candidates[0]));
      if (offerCard.item && !offerCard.item.itemLevel) offerCard.item.itemLevel = 1;

      // Replace a non-hand-slot card so the draft stays a 5-card offer.
      const replaceIdx = offeredCards.findIndex((c) => {
        const s = FateGrantSystem.resolveCardSlot(c);
        return s !== 'main_hand' && s !== 'off_hand';
      });
      if (replaceIdx !== -1) {
        offeredCards[replaceIdx] = offerCard;
      } else {
        offeredCards.push(offerCard);
      }
    };

    injectForSlot('main_hand');
    injectForSlot('off_hand');
  }

  static applyDraftedCards(player, cards, gridMap) {
    const result = {
      addedToHotbar: [],
      addedToBackpack: [],
      droppedOnFloor: [],
    };

    for (const card of cards) {
      const targetItemId = card.targetItemId || card.item?.item_id;
      const catalogEntry = ITEMS_CATALOG[targetItemId] || {};

      const allSlots = [
        ...(player.action_bar ? player.action_bar.map((it, idx) => ({ it, container: 'action_bar', idx })) : []),
        ...(player.paperdoll ? Object.entries(player.paperdoll).map(([key, it]) => ({ it, container: 'paperdoll', key })) : []),
        ...(player.backpack ? player.backpack.map((it, idx) => ({ it, container: 'backpack', idx })) : []),
      ];

      const cardActionKey = card.item?.actionKey || catalogEntry?.actionKey;
      const existingSlot = allSlots.find(s => s.it && (s.it.item_id === targetItemId || (cardActionKey && (s.it.actionKey === cardActionKey || ITEMS_CATALOG[s.it.item_id]?.actionKey === cardActionKey))));

      if (existingSlot || card.isUpgrade) {
        const item = existingSlot ? existingSlot.it : null;
        if (item) {
          item.itemLevel = Math.min(5, (item.itemLevel || 1) + 1);
          const spec = catalogEntry.upgradeSpec || {};
          const rank = item.itemLevel;

          if (spec.randomDamageInc || spec.rangeInc || spec.manaCostInc) {
            const dmgInc = card.upgradeDmgInc || (spec.randomDamageInc ? (Math.floor(Math.random() * (spec.randomDamageInc[1] - spec.randomDamageInc[0] + 1)) + spec.randomDamageInc[0]) : 0);
            if (dmgInc) item.damage = (item.damage || catalogEntry.damageMin || 12) + dmgInc;
            if (spec.rangeInc) item.range = (item.range || catalogEntry.range || 5) + spec.rangeInc;
            if (spec.manaCostInc) item.manaCost = (item.manaCost || catalogEntry.manaCost || 1) + spec.manaCostInc;
            result.addedToHotbar.push(`${item.name} Upgraded to Rank ${rank}`);
          } else if (spec.stepDamageInc) {
            item.stepDamageBonus = (item.stepDamageBonus || 0) + spec.stepDamageInc;
            if (spec.rangeInc) item.range = (item.range || catalogEntry.range || 4) + spec.rangeInc;
            if (spec.manaCostInc) item.manaCost = (item.manaCost || catalogEntry.manaCost || 5) + spec.manaCostInc;
            result.addedToHotbar.push(`${item.name} Upgraded to Rank ${rank}`);
          } else if (spec.maxHpInc || spec.maxMpInc) {
            player.max_hp = (player.max_hp || 100) + (spec.maxHpInc || 0);
            player.max_mana = (player.max_mana || 100) + (spec.maxMpInc || 0);
            player.hp = Math.min(player.max_hp, (player.hp || 100) + (spec.maxHpInc || 0));
            player.mana = Math.min(player.max_mana, (player.mana || 100) + (spec.maxMpInc || 0));
            result.addedToHotbar.push(`${item.name} Upgraded to Rank ${rank}`);
          } else if (spec.mpPulseInc) {
            const cooldownSec = Math.max(12, 22 - 2 * rank);
            result.addedToHotbar.push(`${item.name} Upgraded to Rank ${rank} (Power Pulse: +${rank} MP / ${cooldownSec}s)`);
          } else {
            result.addedToHotbar.push(`${item.name} Upgraded to Rank ${rank}`);
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

      // Auto-assign staff to main_hand, wand to off_hand, armor to armor, or relic to relic slot if paperdoll slot is empty
      const catalogItem = ITEMS_CATALOG[itemToPlace.item_id];
      const targetSlot = itemToPlace.slot || catalogItem?.slot;
      if (!player.paperdoll) {
        player.paperdoll = { main_hand: null, off_hand: null, armor: null, relic: null };
      }

      if (targetSlot && (targetSlot === 'main_hand' || targetSlot === 'off_hand' || targetSlot === 'armor' || targetSlot === 'relic') && !player.paperdoll[targetSlot]) {
        player.paperdoll[targetSlot] = itemToPlace;
        if (targetSlot === 'relic' && itemToPlace.item_id === 'relic_luminous_amulet') {
          const rank = itemToPlace.itemLevel || 1;
          const hpMpBonus = rank * 5;
          player.max_hp = (player.max_hp || 100) + hpMpBonus;
          player.max_mana = (player.max_mana || 100) + hpMpBonus;
          player.hp = Math.min(player.max_hp, (player.hp || 100) + hpMpBonus);
          player.mana = Math.min(player.max_mana, (player.mana || 100) + hpMpBonus);
        }
        result.addedToHotbar.push(`${itemToPlace.name} (Equipped to ${targetSlot.replace('_', ' ')})`);
        continue;
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
