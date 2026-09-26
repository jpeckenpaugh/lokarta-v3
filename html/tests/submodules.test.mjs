import test from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG, TILE_TYPES, createPlayer } from '../engine/config.js';
import { GridMap } from '../engine/grid-map.js';
import { LightingSystem } from '../engine/lighting-system.js';
import { ProgressionSystem } from '../engine/progression-system.js';
import { CombatSystem } from '../engine/combat-system.js';
import { EntityAI } from '../engine/entity-ai.js';
import { InventorySystem } from '../engine/inventory-system.js';
import { FateGrantSystem } from '../engine/fate-grant-system.js';
import { GestureEngine } from '../engine/gesture-engine.js';

test('Modular Engine Submodules', async (t) => {
  await t.test('verifies config.js exports', () => {
    assert.equal(CONFIG.MAP_WIDTH, 40);
    assert.equal(TILE_TYPES.WALL, 1);
    const p = createPlayer('magician');
    assert.equal(p.vocation, 'magician');
  });

  await t.test('verifies GridMap submodule', () => {
    const map = new GridMap();
    assert.equal(map.width, 40);
    assert.equal(map.isWalkable(0, 0), false);
  });

  await t.test('verifies LightingSystem submodule', () => {
    const p = createPlayer('magician');
    const radius = LightingSystem.computePlayerRadius(p);
    assert.equal(radius, CONFIG.BASE_LIGHT_RADIUS);
  });

  await t.test('verifies ProgressionSystem submodule', () => {
    assert.equal(ProgressionSystem.getXpForLevel(1), 100);
  });

  await t.test('verifies CombatSystem submodule', () => {
    assert.equal(CONFIG.NATIVE_CLASS_MULTIPLIER, undefined, 'NATIVE_CLASS_MULTIPLIER must be removed');
    const p = createPlayer('magician');
    p.x = 2;
    p.y = 2;
    const grid = new GridMap(10, 10);
    const target = { id: 'm1', name: 'Rat', type: 'giant_rat', x: 4, y: 2, hp: 100, max_hp: 100 };
    const res = CombatSystem.executeWandSpark(p, target, grid, { damage: 100, manaCost: 1 });
    assert.equal(res.success, true);
    assert.equal(res.damageDealt, 100); // Base 1.0x skillBoosts - no legacy class multiplier
  });

  await t.test('verifies EntityAI submodule', () => {
    const facing = EntityAI.getFacing(2, 2, 3, 2);
    assert.equal(facing, 'right');
  });

  await t.test('verifies InventorySystem submodule', () => {
    assert.equal(InventorySystem.getMaxStack('arrows'), 99);
  });

  await t.test('verifies FateGrantSystem submodule', () => {
    const offer = FateGrantSystem.generateDraftOffer('magician', 1);
    assert.equal(offer.cards.length, 5);
  });

  await t.test('verifies GestureEngine submodule', () => {
    assert.equal(GestureEngine.keyToSlotIndex('1'), 0);
    assert.equal(GestureEngine.keyToSlotIndex('0'), 9);
  });
});
