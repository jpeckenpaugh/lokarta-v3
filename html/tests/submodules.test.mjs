import test from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG, TILE_TYPES, createPlayer } from '../config.js';
import { GridMap } from '../grid-map.js';
import { LightingSystem } from '../lighting-system.js';
import { ProgressionSystem } from '../progression-system.js';
import { CombatSystem } from '../combat-system.js';
import { EntityAI } from '../entity-ai.js';
import { InventorySystem } from '../inventory-system.js';
import { FateGrantSystem } from '../fate-grant-system.js';
import { GestureEngine } from '../gesture-engine.js';

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
    const isNative = CombatSystem.isNativeItem({ item_id: 'apprentice_wand', type: 'weapon' }, 'magician');
    assert.equal(isNative, true);
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
