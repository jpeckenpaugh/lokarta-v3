/**
 * Lokarta LIV-22 board overhaul regression coverage.
 *
 * Pins the seven board requests:
 *   1. Inventory/hotbar cleanup: 8 keyed slots + 36-slot backpack + banking.
 *   2. HP/MP bars above actors (allocation-free fillRect, verified structurally).
 *   3. Equipment consolidation/balance (one solid item per class per slot).
 *   4. Passive HP/MP recovery (~1/10s).
 *   5. Town shop/temple + revive in the Town Temple.
 *   6. Gold from monsters and chests + shop purchase/upgrade loop.
 *   7. Healing springs (+10 HP/MP per use, 1 charge / 60s).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  InventorySystem,
  EconomySystem,
  TILE_TYPES,
  createPlayer,
} from '../engine/index.js';
import { generateFloor, getLevelSpec } from '../services/floor-generator.js';
import { ITEMS_CATALOG, ECONOMY_CATALOG, UI_CATALOG } from '../data/index.js';

const LEVELS = [1, 2, 3, 4, 5];

describe('LIV-22 #1 inventory/hotbar cleanup', () => {
  it('creates 4 active slots and a 36-slot backpack on every vocation', () => {
    const layout = UI_CATALOG.inventory;
    assert.equal(layout.backpackSlots, 36);
    for (const voc of ['magician', 'archer', 'fighter', 'paladin']) {
      const p = createPlayer(voc);
      assert.equal(p.action_bar.length, 4);
      assert.equal(p.backpack.length, 36);
      assert.ok(p.backpack.every(s => s === null));
    }
  });

  it('routes picked-up consumables to active slots and equipment to the backpack', () => {
    const player = createPlayer('magician');
    InventorySystem.addItem(player, { item_id: 'health_potion', name: 'Health Potion', type: 'consumable', quantity: 1 });
    assert.equal(player.action_bar[0].item_id, 'health_potion', 'consumable fills active slot');

    const gear = createPlayer('fighter');
    InventorySystem.ensureContainers(gear);
    gear.paperdoll.main_hand = { ...ITEMS_CATALOG.astral_scepter, item_id: 'some_weapon', type: 'weapon', slot: 'main_hand' };
    InventorySystem.unequipItem(gear, 'main_hand');
    assert.equal(gear.backpack[0].item_id, 'some_weapon', 'unequipped gear banks to backpack');
  });

  it('swaps a banked item into any of the 8 keyed slots and back', () => {
    const player = createPlayer('magician');
    player.backpack[3] = { ...ITEMS_CATALOG.astral_scepter, item_id: 'astral_scepter', quantity: 1 };

    InventorySystem.swapKeyedItem(player, 'backpack:3', 'KeyQ');
    assert.equal(player.paperdoll.main_hand.item_id, 'astral_scepter');

    // Move it to a different keyed slot (armor) — keyed <-> keyed swap.
    InventorySystem.swapKeyedItem(player, 'KeyQ', 'KeyE');
    assert.equal(player.paperdoll.main_hand, null);
    assert.equal(player.paperdoll.armor.item_id, 'astral_scepter');

    // And back to the backpack.
    InventorySystem.swapKeyedItem(player, 'KeyE', 'backpack:0');
    assert.equal(player.paperdoll.armor, null);
    assert.ok(player.backpack.some(s => s && s.item_id === 'astral_scepter'));
  });

  it('refuses to place a non-consumable into an active slot', () => {
    const player = createPlayer('magician');
    player.backpack[0] = { ...ITEMS_CATALOG.astral_scepter, item_id: 'astral_scepter', type: 'weapon', slot: 'main_hand' };
    const res = InventorySystem.swapKeyedItem(player, 'backpack:0', 'Digit1');
    assert.equal(res.success, false);
    assert.equal(player.action_bar[0], null, 'active slot stays empty');
  });
});

describe('LIV-22 #3 equipment consolidation', () => {
  it('each class declares one solid item per equipment slot', async () => {
    const { VOCATIONS_CATALOG } = await import('../data/index.js');
    const slots = ['main_hand', 'off_hand', 'armor', 'relic'];
    for (const voc of ['fighter', 'paladin', 'magician', 'archer']) {
      const spec = VOCATIONS_CATALOG[voc].solidEquipment;
      for (const slot of slots) {
        assert.ok(spec[slot], `${voc}.${slot} must exist`);
      }
    }
  });

  it('minimizes the Consecrated War Hammer mana cost so the paladin stays usable', () => {
    assert.ok((ITEMS_CATALOG.consecrated_warhammer.manaCost || 0) <= 1);
  });
});

describe('LIV-22 #4 passive HP/MP recovery', () => {
  it('regenerates ~1 HP and ~1 MP per catalog interval', () => {
    const p = createPlayer('fighter');
    p.hp = 10;
    p.mana = 5;
    const first = EconomySystem.applyPassiveRecovery(p);
    assert.equal(first.hp, 1);
    assert.equal(first.mp, 1);
    assert.equal(p.hp, 11);
    assert.equal(p.mana, 6);
    assert.equal(ECONOMY_CATALOG.passiveRecovery.intervalSec, 10);
  });

  it('never overheals past the maximum', () => {
    const p = createPlayer('fighter');
    p.hp = p.max_hp;
    p.mana = p.max_mana;
    const res = EconomySystem.applyPassiveRecovery(p);
    assert.equal(res.hp, 0);
    assert.equal(res.mp, 0);
  });
});

describe('LIV-22 #5/#6 town, gold, shop', () => {
  it('tracks and caps gold', () => {
    const p = createPlayer('magician');
    assert.equal(p.gold, 0);
    EconomySystem.addGold(p, 50);
    assert.equal(p.gold, 50);
    assert.equal(EconomySystem.spendGold(p, 20), true);
    assert.equal(p.gold, 30);
    assert.equal(EconomySystem.spendGold(p, 100), false, 'cannot overspend');
    assert.equal(p.gold, 30);
  });

  it('drops gold from monsters and chests', () => {
    const rng = () => 0.5;
    const ratGold = EconomySystem.goldFromMonster({ type: 'giant_rat' }, rng);
    assert.ok(ratGold > 0, 'monster drops gold');
    const chestGold = EconomySystem.goldFromChest('gold', rng);
    assert.ok(chestGold > 0, 'chest yields gold');
  });

  it('buys shop stock and spends gold, returning an item stack', () => {
    const p = createPlayer('magician');
    EconomySystem.addGold(p, 500);
    const stock = EconomySystem.shopStock('magician');
    assert.ok(stock.length > 0);
    const res = EconomySystem.buyItem(p, 'health_potion', { purchasedCount: 0 });
    assert.equal(res.success, true);
    assert.ok(res.cost > 0);
    assert.equal(p.gold, 500 - res.cost);
    assert.equal(res.item.item_id, 'health_potion');
  });

  it('heals at the town temple for gold and revives there', () => {
    const p = createPlayer('fighter');
    p.hp = 1;
    p.mana = 1;
    EconomySystem.addGold(p, 1000);
    const cost = EconomySystem.templeHealCost(p);
    assert.ok(cost > 0);
    const res = EconomySystem.templeHeal(p);
    assert.equal(res.success, true);
    assert.equal(p.hp, p.max_hp);
    assert.equal(p.mana, p.max_mana);
    assert.equal(EconomySystem.reviveLocation(), 'town_temple');
  });

  it('upgrades owned gear in the shop', async () => {
    const { applyItemRankUp } = await import('../engine/item-progression.js');
    const p = createPlayer('magician');
    const staff = { ...ITEMS_CATALOG.astral_scepter, itemLevel: 1 };
    p.paperdoll.main_hand = staff;
    const cost = EconomySystem.upgradeCost(staff);
    assert.ok(cost > 0);
    assert.equal(EconomySystem.spendGold(p, cost), false, 'cannot afford with 0 gold');
    EconomySystem.addGold(p, cost);
    assert.equal(EconomySystem.spendGold(p, cost), true);
    const result = applyItemRankUp(p, staff, { source: 'shop' });
    assert.ok(result);
    assert.equal(p.paperdoll.main_hand.itemLevel, 2);
  });
});

describe('LIV-22 #7 healing springs', () => {
  it('places one spring in each floor stair room beside the exit', () => {
    for (const level of LEVELS) {
      const floor = generateFloor(level);
      assert.equal(floor.springs.length, 1, `L${level} must place one spring`);
      const spring = floor.springs[0];
      const spec = getLevelSpec(level);
      assert.equal(spring.room, spec.stairRoom, `L${level} spring sits in the stair room`);
      assert.equal(floor.tiles[spring.y][spring.x], TILE_TYPES.SPRING);
      const exit = floor.stairs_down_coords;
      assert.ok(Math.abs(spring.x - exit.x) + Math.abs(spring.y - exit.y) === 1, `L${level} spring adjacent to exit`);
    }
  });

  it('restores at most +10 HP/MP per use and gates to 1 charge / 60s', () => {
    const p = createPlayer('fighter');
    p.hp = 10;
    p.mana = 5;
    const now = 1_000_000;
    const first = EconomySystem.useSpring(p, 'spring_a', now);
    assert.equal(first.success, true);
    assert.equal(first.hp, 10);
    assert.equal(first.mp, 10);

    const blocked = EconomySystem.useSpring(p, 'spring_a', now + 1000);
    assert.equal(blocked.success, false, 'second use within 60s is blocked');

    const ready = EconomySystem.useSpring(p, 'spring_a', now + 60_000);
    assert.equal(ready.success, true, 'usable again after 60s');
  });

  it('caps spring healing at the missing HP/MP', () => {
    const p = createPlayer('magician');
    p.hp = p.max_hp - 3;
    p.mana = p.max_mana - 2;
    const res = EconomySystem.useSpring(p, 'spring_b', 60_000);
    assert.equal(res.hp, 3);
    assert.equal(res.mp, 2);
    assert.equal(p.hp, p.max_hp);
    assert.equal(p.mana, p.max_mana);
  });
});

describe('LIV-22 #2 HP/MP bars', () => {
  it('exposes allocation-free bar tokens in ui.json', () => {
    assert.ok(UI_CATALOG.hud.barWidthPx > 0);
    assert.ok(UI_CATALOG.hud.barHeightPx > 0);
    assert.ok(UI_CATALOG.hud.hpColor);
    assert.ok(UI_CATALOG.hud.mpColor);
  });
});
