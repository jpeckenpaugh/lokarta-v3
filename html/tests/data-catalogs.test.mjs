import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CARDS_CATALOG,
  MONSTERS_CATALOG,
  ITEMS_CATALOG,
  VOCATIONS_CATALOG,
  SOUNDS_CATALOG,
  ABILITIES_CATALOG,
  BIOMES_CATALOG,
  ENCOUNTERS_CATALOG,
  DUNGEONS_CATALOG,
  TILE_THEMES_CATALOG,
  KEYBINDINGS_CATALOG,
} from '../data/index.js';

test('JSON Data Catalogs', async (t) => {
  await t.test('loads and validates cards.json catalog', () => {
    assert.ok(Array.isArray(CARDS_CATALOG), 'CARDS_CATALOG must be an array');
    assert.equal(CARDS_CATALOG.length, 24, 'CARDS_CATALOG must contain 24 draft cards');

    for (const card of CARDS_CATALOG) {
      assert.ok(card.id, 'Card must have id');
      assert.ok(card.name, 'Card must have name');
      assert.ok(card.rarity, 'Card must have rarity');
      assert.ok(card.icon, 'Card must have icon');
      assert.ok(card.item && card.item.item_id, 'Card must specify an item payload');
    }
  });

  await t.test('loads and validates monsters.json catalog', () => {
    const expectedMonsters = ['giant_rat', 'crypt_skeleton', 'shadow_cultist', 'elite_cultist', 'abyssal_overlord'];
    assert.equal(Object.keys(MONSTERS_CATALOG).length, 5);

    for (const key of expectedMonsters) {
      const monster = MONSTERS_CATALOG[key];
      assert.ok(monster, `Missing monster definition for ${key}`);
      assert.ok(monster.baseHp > 0, `Monster ${key} must have baseHp > 0`);
      assert.ok(monster.baseAttack > 0, `Monster ${key} must have baseAttack > 0`);
      assert.ok(typeof monster.moveCadence === 'number', `Monster ${key} must specify moveCadence`);
      assert.ok(typeof monster.attackCadence === 'number', `Monster ${key} must specify attackCadence`);
      assert.ok(['chase', 'standoff'].includes(monster.aiType), `Invalid aiType for ${key}`);
      assert.ok(Array.isArray(monster.lootTable), `Monster ${key} must specify lootTable array`);
    }
  });

  await t.test('loads and validates items.json catalog', () => {
    assert.ok(Object.keys(ITEMS_CATALOG).length >= 24, 'ITEMS_CATALOG must contain at least 24 items');

    const essentialItems = ['torch', 'health_potion', 'mana_potion', 'arrows', 'apprentice_wand', 'tempered_broadsword'];
    for (const key of essentialItems) {
      const item = ITEMS_CATALOG[key];
      assert.ok(item, `Missing item definition for ${key}`);
      assert.ok(item.name, `Item ${key} must have a name`);
      assert.ok(item.icon, `Item ${key} must have an icon`);
      assert.ok(typeof item.maxStack === 'number', `Item ${key} must specify maxStack`);
    }

    assert.equal(ITEMS_CATALOG['arrows'].maxStack, 99);
    assert.equal(ITEMS_CATALOG['health_potion'].maxStack, 9);
    assert.equal(ITEMS_CATALOG['apprentice_wand'].maxStack, 1);
  });

  await t.test('loads and validates vocations.json catalog', () => {
    const vocations = ['magician', 'archer', 'fighter', 'paladin'];
    assert.equal(Object.keys(VOCATIONS_CATALOG).length, 4);

    for (const key of vocations) {
      const voc = VOCATIONS_CATALOG[key];
      assert.ok(voc, `Missing vocation definition for ${key}`);
      assert.ok(voc.hp > 0, `Vocation ${key} must have hp > 0`);
      assert.ok(voc.mana > 0, `Vocation ${key} must have mana > 0`);
      assert.ok(voc.hpPerLevel > 0, `Vocation ${key} must have hpPerLevel > 0`);
      assert.ok(voc.damageStep > 0, `Vocation ${key} must have damageStep > 0`);
    }
  });

  await t.test('loads and validates sounds.json catalog', () => {
    assert.equal(Object.keys(SOUNDS_CATALOG).length, 19);
    assert.ok(SOUNDS_CATALOG.footstep);
    assert.ok(SOUNDS_CATALOG.wandSpark);
    assert.ok(SOUNDS_CATALOG.victory);
  });

  await t.test('loads and validates abilities.json catalog', () => {
    assert.equal(Object.keys(ABILITIES_CATALOG).length, 9);
    assert.ok(ABILITIES_CATALOG.magician_spark);
    assert.equal(ABILITIES_CATALOG.magician_spark.vocation, 'magician');
    assert.ok(ABILITIES_CATALOG.magician_spark.visual, 'magician_spark must specify visual config');
    assert.equal(ABILITIES_CATALOG.magician_spark.visual.trailType, 'electric');
    assert.ok(ABILITIES_CATALOG.magician_spark.visual.burstParticleCount > 0);
    assert.ok(ABILITIES_CATALOG.paladin_heal);
    assert.equal(ABILITIES_CATALOG.paladin_heal.vocation, 'paladin');
  });

  await t.test('loads and validates biomes.json catalog', () => {
    assert.equal(Object.keys(BIOMES_CATALOG).length, 4);
    assert.ok(BIOMES_CATALOG.crypt);
    assert.equal(BIOMES_CATALOG.crypt.minFloor, 1);
    assert.equal(BIOMES_CATALOG.crypt.maxFloor, 5);
    assert.ok(BIOMES_CATALOG.abyssal_sanctum);
    assert.equal(BIOMES_CATALOG.abyssal_sanctum.maxFloor, 20);
  });

  await t.test('loads and validates encounters.json catalog', () => {
    assert.ok(ENCOUNTERS_CATALOG.tier_1_5);
    assert.ok(ENCOUNTERS_CATALOG.tier_20_boss);
    assert.equal(ENCOUNTERS_CATALOG.tier_20_boss.boss.hp, 600);
  });

  await t.test('loads and validates dungeons.json catalog', () => {
    assert.ok(DUNGEONS_CATALOG.standard_40x40);
    assert.equal(DUNGEONS_CATALOG.standard_40x40.width, 40);
    assert.equal(DUNGEONS_CATALOG.standard_40x40.height, 40);
    assert.equal(DUNGEONS_CATALOG.standard_40x40.rooms.length, 9);
  });

  await t.test('loads and validates tile_themes.json catalog', () => {
    assert.ok(TILE_THEMES_CATALOG.wall);
    assert.ok(TILE_THEMES_CATALOG.floor);
    assert.ok(TILE_THEMES_CATALOG.stairs);
    assert.ok(TILE_THEMES_CATALOG.door);
  });

  await t.test('loads and validates keybindings.json catalog', () => {
    assert.ok(KEYBINDINGS_CATALOG.movement);
    assert.ok(Array.isArray(KEYBINDINGS_CATALOG.movement.up));
    assert.equal(KEYBINDINGS_CATALOG.actionBar.length, 10);
    assert.ok(KEYBINDINGS_CATALOG.gestureTimings.tapMaxMs > 0);
  });
});


