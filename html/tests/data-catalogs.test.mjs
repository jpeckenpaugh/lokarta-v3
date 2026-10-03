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
  TOWER_LEVELS_CATALOG,
  DOORS_CATALOG,
  CHESTS_CATALOG,
  TILE_THEMES_CATALOG,
  KEYBINDINGS_CATALOG,
  UI_CATALOG,
} from '../data/index.js';

test('JSON Data Catalogs', async (t) => {
  await t.test('loads and validates cards.json catalog', () => {
    assert.ok(Array.isArray(CARDS_CATALOG), 'CARDS_CATALOG must be an array');
    assert.equal(CARDS_CATALOG.length, 30, 'CARDS_CATALOG must contain 30 draft cards');

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

  await t.test('loads the 5 new vocation-locked items with required fields', () => {
    const requiredFields = ['name', 'type', 'slot', 'stat_bonus', 'icon', 'svgCode', 'vocationAffinity', 'maxStack'];
    const newItems = {
      hunter_quiver: { slot: 'off_hand', type: 'offhand', affinity: 'archer' },
      hunter_leathers: { slot: 'armor', type: 'armor', affinity: 'archer' },
      archer_hood: { slot: 'relic', type: 'relic', affinity: 'archer' },
      iron_helm: { slot: 'relic', type: 'relic', affinity: 'fighter' },
      holy_crown: { slot: 'relic', type: 'relic', affinity: 'paladin' },
    };

    for (const [itemId, spec] of Object.entries(newItems)) {
      const item = ITEMS_CATALOG[itemId];
      assert.ok(item, `Missing new item definition for ${itemId}`);
      for (const field of requiredFields) {
        assert.ok(item[field] !== undefined, `Item ${itemId} must specify ${field}`);
      }
      assert.equal(item.slot, spec.slot, `Item ${itemId} must occupy slot ${spec.slot}`);
      assert.equal(item.type, spec.type, `Item ${itemId} must be type ${spec.type}`);
      assert.equal(item.maxStack, 1, `Item ${itemId} must have maxStack 1`);
      const matchesAffinity = item.vocationAffinity === spec.affinity
        || (Array.isArray(item.vocationAffinity) && item.vocationAffinity.includes(spec.affinity));
      assert.ok(matchesAffinity, `Item ${itemId} must carry vocationAffinity including ${spec.affinity}`);
    }

    // New items each have a grantable draft card
    const cardByItem = new Map(CARDS_CATALOG.map(c => [c.item?.item_id, c]));
    for (const itemId of Object.keys(newItems)) {
      const card = cardByItem.get(itemId);
      assert.ok(card, `Missing draft card for new item ${itemId}`);
    }
  });

  await t.test('ensures every equippable item carries vocationAffinity (or neutral)', () => {
    for (const [itemId, item] of Object.entries(ITEMS_CATALOG)) {
      if (!item.slot) continue; // non-equippable (consumables, ammo, spell-only items)
      assert.ok(
        item.vocationAffinity,
        `Equippable item ${itemId} must carry vocationAffinity (use "neutral" for all-class gear)`
      );
      assert.ok(
        item.vocationAffinity === 'neutral'
          || typeof item.vocationAffinity === 'string'
          || (Array.isArray(item.vocationAffinity) && item.vocationAffinity.length > 0),
        `Item ${itemId} has an invalid vocationAffinity value`
      );
    }
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
      assert.ok(Array.isArray(voc.nativeEquipment) && voc.nativeEquipment.length > 0, `Vocation ${key} must list nativeEquipment`);
    }
  });

  await t.test('loads and validates sounds.json catalog', () => {
    assert.equal(Object.keys(SOUNDS_CATALOG).length, 21);
    assert.ok(SOUNDS_CATALOG.footstep);
    assert.ok(SOUNDS_CATALOG.wandSpark);
    assert.ok(SOUNDS_CATALOG.victory);
    assert.ok(SOUNDS_CATALOG.uiMove);
    assert.ok(SOUNDS_CATALOG.uiBack);
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

  await t.test('loads and validates biomes.json catalog (5 tower tiers)', () => {
    assert.equal(Object.keys(BIOMES_CATALOG).length, 5);
    assert.ok(BIOMES_CATALOG.crypt);
    assert.equal(BIOMES_CATALOG.crypt.minLevel, 1);
    assert.equal(BIOMES_CATALOG.crypt.maxLevel, 1);
    assert.ok(BIOMES_CATALOG.crown_spire);
    assert.equal(BIOMES_CATALOG.crown_spire.minLevel, 5);
    assert.equal(BIOMES_CATALOG.crown_spire.maxLevel, 5);
    // Every level 1..5 is covered by exactly one tier.
    for (let level = 1; level <= 5; level++) {
      const matches = Object.values(BIOMES_CATALOG).filter(
        (b) => level >= b.minLevel && level <= b.maxLevel
      );
      assert.equal(matches.length, 1, `level ${level} must map to exactly one tower tier`);
    }
  });

  await t.test('loads and validates encounters.json catalog (monster groups + boss)', () => {
    assert.ok(ENCOUNTERS_CATALOG.groups, 'encounters must expose monster group data');
    assert.equal(ENCOUNTERS_CATALOG.boss.hp, 600);
    assert.equal(ENCOUNTERS_CATALOG.boss.type, 'abyssal_overlord');
    assert.equal(ENCOUNTERS_CATALOG.boss.level, 5);
    assert.ok(!ENCOUNTERS_CATALOG.tier_1_5, 'cave-era tier keys must be gone');
    assert.ok(!ENCOUNTERS_CATALOG.tier_20_boss, 'cave-era boss tier key must be gone');
  });

  await t.test('loads and validates tower_levels.json catalog', () => {
    assert.equal(TOWER_LEVELS_CATALOG.levelCount, 5);
    assert.equal(TOWER_LEVELS_CATALOG.levels.length, 5);
    assert.equal(TOWER_LEVELS_CATALOG.entry.room, 2);
    assert.deepEqual(TOWER_LEVELS_CATALOG.entry.doorTile, [19, 1]);
    assert.deepEqual(TOWER_LEVELS_CATALOG.entry.spawnTile, [19, 2]);
    assert.deepEqual(TOWER_LEVELS_CATALOG.stairShaft, { 1: 9, 2: 6, 3: 3, 4: 8, 5: 5 });

    for (const level of TOWER_LEVELS_CATALOG.levels) {
      assert.ok(level.openEdges.length === 8, `level ${level.level} must open 8 edges`);
      assert.ok(level.sealedEdges.length === 4, `level ${level.level} must seal 4 edges`);
      assert.deepEqual(Object.keys(level.gates).sort(), ['copper', 'gold', 'silver']);
      assert.deepEqual(Object.keys(level.keyRooms).sort(), ['copper', 'gold', 'silver']);
      assert.equal(Object.keys(level.roomTiers).length, 9);
    }
  });

  await t.test('tower_levels.json progression is soft-lock-free on every level', () => {
    const edges = DUNGEONS_CATALOG.standard_40x40.edges;
    const neighbors = (level, room) => {
      const gateByEdge = new Map(Object.entries(level.gates).map(([tier, edge]) => [edge, tier]));
      const out = [];
      for (const edgeId of level.openEdges) {
        const edge = edges[edgeId];
        if (!edge) continue;
        const [a, b] = edge.rooms;
        if (a === room) out.push({ room: b, gate: gateByEdge.get(edgeId) || null });
        if (b === room) out.push({ room: a, gate: gateByEdge.get(edgeId) || null });
      }
      return out;
    };
    const bfs = (level, keys) => {
      const seen = new Set([level.entryRoom]);
      const queue = [level.entryRoom];
      while (queue.length) {
        const room = queue.shift();
        for (const { room: next, gate } of neighbors(level, room)) {
          const locked = gate && !keys[gate];
          if (locked || seen.has(next)) continue;
          seen.add(next);
          queue.push(next);
        }
      }
      return seen;
    };

    // Every level is a connected tree of 9 rooms: 8 carved (open) edges, and
    // all three gate edges are among those carved edges (locked until keyed).
    for (const level of TOWER_LEVELS_CATALOG.levels) {
      assert.equal(new Set(level.openEdges).size, 8, `L${level.level}: exactly 8 open edges`);
      for (const [tier, edge] of Object.entries(level.gates)) {
        assert.ok(level.openEdges.includes(edge), `L${level.level}: ${tier} gate ${edge} must be carved`);
      }
      // Reachability with all keys held must span all 9 rooms (connected tree).
      const allKeys = { copper: true, silver: true, gold: true };
      const allReach = bfs(level, allKeys);
      assert.equal(allReach.size, 9, `L${level.level}: carved graph must connect all 9 rooms`);
    }

    for (const level of TOWER_LEVELS_CATALOG.levels) {
      const keys = { copper: false, silver: false, gold: false };
      const R0 = bfs(level, keys);
      assert.ok(R0.has(level.keyRooms.copper), `L${level.level}: copper holder reachable`);
      assert.ok(!R0.has(level.keyRooms.silver), `L${level.level}: silver gated`);
      assert.ok(!R0.has(level.keyRooms.gold), `L${level.level}: gold gated`);
      assert.ok(!R0.has(level.stairRoom), `L${level.level}: stair gated`);
      keys.copper = true;
      const R1 = bfs(level, keys);
      assert.ok(R1.has(level.keyRooms.silver), `L${level.level}: silver reachable after copper`);
      assert.ok(!R1.has(level.keyRooms.gold), `L${level.level}: gold still gated`);
      assert.ok(!R1.has(level.stairRoom), `L${level.level}: stair still gated`);
      keys.silver = true;
      const R2 = bfs(level, keys);
      assert.ok(R2.has(level.keyRooms.gold), `L${level.level}: gold reachable after silver`);
      assert.ok(!R2.has(level.stairRoom), `L${level.level}: stair still gated`);
      keys.gold = true;
      const R3 = bfs(level, keys);
      assert.ok(R3.has(level.stairRoom), `L${level.level}: stair reachable after gold`);
    }
  });

  await t.test('loads and validates chests.json loot catalog (tiered tables)', () => {
    assert.ok(CHESTS_CATALOG.chests, 'chests.json must expose a chests map');
    assert.deepEqual(Object.keys(CHESTS_CATALOG.chests).sort(), ['copper', 'gold', 'silver']);
    // Better color = more rolls (D2 §7.3).
    assert.ok(CHESTS_CATALOG.chests.gold.rolls >= CHESTS_CATALOG.chests.silver.rolls);
    assert.ok(CHESTS_CATALOG.chests.silver.rolls >= CHESTS_CATALOG.chests.copper.rolls);
    for (const [tier, table] of Object.entries(CHESTS_CATALOG.chests)) {
      assert.ok(Number.isInteger(table.rolls) && table.rolls > 0, `${tier} must specify rolls`);
      for (const entry of table.entries) {
        assert.ok(entry.weight > 0, `${tier} entry needs a positive weight`);
        assert.equal(entry.quantity.length, 2, `${tier} entry needs [min,max]`);
        if (!entry.vocationGear) {
          assert.ok(entry.itemId, `${tier} entry needs itemId`);
        }
      }
    }
    // Every explicit loot item references a real items.json entry.
    for (const table of Object.values(CHESTS_CATALOG.chests)) {
      for (const entry of table.entries) {
        if (entry.itemId) {
          assert.ok(ITEMS_CATALOG[entry.itemId], `unknown chest loot item ${entry.itemId}`);
        }
      }
    }
  });

  await t.test('loads and validates doors.json catalog (tier → key + shape cue)', () => {    for (const tier of ['copper', 'silver', 'gold']) {
      const door = DOORS_CATALOG[tier];
      assert.ok(door, `missing door definition for ${tier}`);
      assert.equal(door.keyItemId, `key_${tier}`);
      assert.ok(['circle', 'square', 'crown'].includes(door.shape));
      assert.ok(door.accent);
    }
  });

  await t.test('items.json exposes three gated keys and lootTier metadata', () => {
    for (const tier of ['copper', 'silver', 'gold']) {
      const key = ITEMS_CATALOG[`key_${tier}`];
      assert.ok(key, `missing key_${tier}`);
      assert.equal(key.type, 'key');
      assert.equal(key.keyTier, tier);
      assert.equal(key.maxStack, 1);
      assert.equal(key.droppable, false);
    }
    // Every lootTier in §7.4 maps to a real item tagged with that tier.
    const tiered = Object.values(ITEMS_CATALOG).filter((i) => typeof i.lootTier === 'number');
    assert.ok(tiered.length >= 15, 'expected vocation gear to carry lootTier metadata');
    for (const item of tiered) {
      assert.ok([1, 2, 3].includes(item.lootTier), `item ${item.item_id} has invalid lootTier`);
    }
  });

  await t.test('loads and validates dungeons.json catalog (v4 edges layout)', () => {
    const spec = DUNGEONS_CATALOG.standard_40x40;
    assert.ok(spec);
    assert.equal(spec.templateVersion, 4);
    assert.equal(spec.width, 40);
    assert.equal(spec.height, 40);
    assert.equal(spec.rooms.length, 9);
    assert.equal(Object.keys(spec.edges).length, 12);
    for (const edge of Object.values(spec.edges)) {
      assert.equal(edge.tiles.length, 2, 'each edge must expose two threshold tiles');
      assert.equal(edge.rooms.length, 2, 'each edge must connect exactly two rooms');
    }
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

  await t.test('loads and validates ui.json presentation catalog', () => {
    assert.ok(UI_CATALOG.splash);
    assert.ok(UI_CATALOG.transitions);
    assert.ok(UI_CATALOG.titleAmbient);
    assert.equal(UI_CATALOG.saveSlots.count, 5);
    assert.equal(UI_CATALOG.options.defaults.sfxVolume, 70);
    assert.equal(UI_CATALOG.options.ranges.pixelScale['3x'], 96);
  });
});


