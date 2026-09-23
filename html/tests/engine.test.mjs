/**
 * Lokarta: Come Into The Light - Comprehensive Test Suite
 * Native Node.js test runner suite covering:
 * 1. Floor Generator (1-20)
 * 2. GridMap & Tile Bounds
 * 3. LightingSystem & LOS (10-Tile FOV)
 * 4. ProgressionSystem & 4 Vocations Leveling
 * 5. CombatSystem & 2.5x Native Class Mastery
 * 6. InventorySystem (10 Action Slots, 6-Slot Backpack, 4-Slot Paperdoll)
 * 7. FateGrantSystem (5-Card Draft Offer & Placement)
 * 8. GestureEngine (Keys 1-9, 0 & Tap/Hold/Double-Tap)
 * 9. GameClient & Worker Protocol
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateFloor,
  getBiomeForFloor,
  BIOMES,
} from '../floor-generator.js';

import {
  CONFIG,
  TILE_TYPES,
  DEFAULT_ARCHETYPES,
  createPlayer,
  GridMap,
  LightingSystem,
  ProgressionSystem,
  CombatSystem,
  EntityAI,
  InventorySystem,
  FateGrantSystem,
  GestureEngine,
} from '../engine.js';

import { GameClient } from '../game-client.js';

// ============================================================================
// 1. Floor Generator (1-20)
// ============================================================================

describe('Floor Generator (1-20)', () => {
  it('generates deterministic floors given the same seed', () => {
    const floorA = generateFloor(1, 4242);
    const floorB = generateFloor(1, 4242);

    assert.deepEqual(floorA.tiles, floorB.tiles);
    assert.deepEqual(floorA.spawn_coords, floorB.spawn_coords);
    assert.deepEqual(floorA.stairs_down_coords, floorB.stairs_down_coords);
    assert.equal(floorA.monsters.length, floorB.monsters.length);
    assert.deepEqual(floorA.items, floorB.items);
  });

  it('enforces 40x40 matrix boundaries on all floors 1 to 20', () => {
    for (let f = 1; f <= 20; f++) {
      const floor = generateFloor(f);
      assert.equal(floor.width, 40);
      assert.equal(floor.height, 40);
      assert.equal(floor.tiles.length, 40);
      for (let y = 0; y < 40; y++) {
        assert.equal(floor.tiles[y].length, 40);
      }
    }
  });

  it('places player spawn at (2,2) and exit stairs at (35,35)', () => {
    for (let f = 1; f <= 20; f++) {
      const floor = generateFloor(f);
      assert.deepEqual(floor.spawn_coords, { x: 2, y: 2 });
      assert.deepEqual(floor.stairs_down_coords, { x: 35, y: 35 });
      assert.equal(floor.tiles[2][2], TILE_TYPES.FLOOR);
      assert.equal(floor.tiles[35][35], TILE_TYPES.STAIRS);
    }
  });

  it('guarantees connectivity between spawn (2,2) and stairs (35,35) on all floors', () => {
    for (let f = 1; f <= 20; f++) {
      const floor = generateFloor(f);
      const grid = new GridMap(40, 40);
      grid.loadFromMatrix(floor.tiles);

      const visited = new Set();
      const queue = [{ x: 2, y: 2 }];
      visited.add('2,2');
      let reachedStairs = false;

      while (queue.length > 0) {
        const { x, y } = queue.shift();
        if (x === 35 && y === 35) {
          reachedStairs = true;
          break;
        }

        const neighbors = [
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 },
        ];

        for (const n of neighbors) {
          const key = `${n.x},${n.y}`;
          if (!visited.has(key) && grid.isWalkable(n.x, n.y)) {
            visited.add(key);
            queue.push(n);
          }
        }
      }

      assert.ok(reachedStairs, `Floor ${f} must have a walkable path from spawn (2,2) to stairs (35,35)`);
    }
  });

  it('assigns correct biomes for floors 1 to 20', () => {
    for (let f = 1; f <= 5; f++) assert.equal(getBiomeForFloor(f).name, BIOMES.CRYPT.name);
    for (let f = 6; f <= 10; f++) assert.equal(getBiomeForFloor(f).name, BIOMES.CATACOMBS.name);
    for (let f = 11; f <= 15; f++) assert.equal(getBiomeForFloor(f).name, BIOMES.SHADOW_VAULTS.name);
    for (let f = 16; f <= 20; f++) assert.equal(getBiomeForFloor(f).name, BIOMES.ABYSSAL_SANCTUM.name);
  });

  it('spawns the Abyssal Overlord boss on Floor 20 with exact stats (600 HP, 20 ATK, 6 DEF)', () => {
    const floor20 = generateFloor(20);
    const boss = floor20.monsters.find(m => m.type === 'abyssal_overlord');

    assert.ok(boss);
    assert.equal(boss.id, 'f20_boss_overlord');
    assert.equal(boss.hp, 600);
    assert.equal(boss.max_hp, 600);
    assert.equal(boss.attack, 20);
    assert.equal(boss.defense, 6);
    assert.equal(boss.isBoss, true);
  });
});

// ============================================================================
// 2. GridMap & Tile Bounds
// ============================================================================

describe('GridMap & Tile Bounds', () => {
  it('initializes an empty grid with specified dimensions filled with WALL tiles', () => {
    const grid = new GridMap(10, 15);
    assert.equal(grid.width, 10);
    assert.equal(grid.height, 15);
    assert.equal(grid.tiles.length, 15);
    assert.equal(grid.tiles[0].length, 10);
    assert.equal(grid.tiles[0][0].type, TILE_TYPES.WALL);
  });

  it('loads matrix data and correctly identifies tile types and bounds', () => {
    const matrix = [
      [1, 0, 2, 3],
    ];
    const grid = new GridMap(4, 1);
    grid.loadFromMatrix(matrix);

    assert.equal(grid.isWall(0, 0), true);
    assert.equal(grid.isWalkable(1, 0), true);
    assert.equal(grid.isStairs(2, 0), true);
    assert.equal(grid.isDoor(3, 0), true);
    assert.equal(grid.isInBounds(0, 0), true);
    assert.equal(grid.isInBounds(-1, 0), false);
  });

  it('manages tile items (add, get, pop, remove)', () => {
    const grid = new GridMap(10, 10);
    const item1 = { item_id: 'torch', name: 'Torch', quantity: 1 };
    const item2 = { item_id: 'potion', name: 'Potion', quantity: 2 };

    grid.addItem(3, 3, item1);
    grid.addItem(3, 3, item2);

    assert.equal(grid.getItems(3, 3).length, 2);
    assert.deepEqual(grid.popTopItem(3, 3), item2);
    assert.equal(grid.getItems(3, 3).length, 1);
    assert.deepEqual(grid.removeItem(3, 3, 0), item1);
    assert.equal(grid.getItems(3, 3).length, 0);
  });
});

// ============================================================================
// 3. LightingSystem & 10-Tile FOV
// ============================================================================

describe('LightingSystem & 10-Tile FOV', () => {
  it('computes player vision radius correctly (base: 10, torch: 14, light spell: 12)', () => {
    const player = createPlayer('magician');

    // 1. Base vision: 10 tiles
    assert.equal(LightingSystem.computePlayerRadius(player), CONFIG.BASE_LIGHT_RADIUS); // 10

    // 2. Torch in off_hand -> 14 tiles
    player.paperdoll.off_hand = { item_id: 'torch' };
    assert.equal(LightingSystem.computePlayerRadius(player), CONFIG.TORCH_LIGHT_RADIUS); // 14

    // 3. Torch in action_bar -> 14 tiles
    player.paperdoll.off_hand = null;
    player.action_bar[0] = { item_id: 'torch' };
    assert.equal(LightingSystem.computePlayerRadius(player), CONFIG.TORCH_LIGHT_RADIUS); // 14

    // 4. Light spell active -> 12 tiles
    player.action_bar[0] = null;
    player.lightSpellTimer = 20;
    assert.equal(LightingSystem.computePlayerRadius(player), CONFIG.LIGHT_SPELL_RADIUS); // 12
  });

  it('casts light circle and detects wall occlusion', () => {
    const matrix = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0], // Wall at (3,2)
      [0, 0, 0, 0, 0, 0, 0],
    ];
    const grid = new GridMap(7, 4);
    grid.loadFromMatrix(matrix);

    LightingSystem.castLightCircle(grid, 1, 2, 5);

    assert.equal(grid.getTile(1, 2).isLit, true);
    assert.equal(grid.getTile(2, 2).isLit, true);
    assert.equal(grid.getTile(3, 2).isLit, true); // Wall illuminated
    assert.equal(grid.getTile(4, 2).isLit, false); // Occluded behind wall
  });

  it('checks line of sight with Bresenham line', () => {
    const matrix = [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0], // Wall at (2,1)
      [0, 0, 0, 0, 0],
    ];
    const grid = new GridMap(5, 3);
    grid.loadFromMatrix(matrix);

    assert.equal(LightingSystem.hasLineOfSight(grid, 0, 0, 4, 0), true);
    assert.equal(LightingSystem.hasLineOfSight(grid, 0, 1, 4, 1), false);
  });
});

// ============================================================================
// 4. ProgressionSystem & 4 Vocations Leveling
// ============================================================================

describe('ProgressionSystem & 4 Vocations Leveling', () => {
  it('supports 4 playable vocations with correct starting stats and empty inventories', () => {
    const vocations = ['magician', 'archer', 'fighter', 'paladin'];
    for (const v of vocations) {
      const p = createPlayer(v);
      assert.equal(p.vocation, v);
      assert.equal(p.level, 1);
      assert.equal(p.xp, 0);
      assert.equal(p.action_bar.length, 10);
      assert.ok(p.action_bar.every(s => s === null));
      assert.equal(p.backpack.length, 6);
      assert.ok(p.backpack.every(s => s === null));
      assert.ok(p.paperdoll.main_hand === null);
      assert.ok(p.paperdoll.off_hand === null);
      assert.ok(p.paperdoll.armor === null);
      assert.ok(p.paperdoll.relic === null);
    }

    assert.equal(DEFAULT_ARCHETYPES.magician.hp, 60);
    assert.equal(DEFAULT_ARCHETYPES.magician.mana, 150);
    assert.equal(DEFAULT_ARCHETYPES.archer.hp, 90);
    assert.equal(DEFAULT_ARCHETYPES.archer.mana, 80);
    assert.equal(DEFAULT_ARCHETYPES.fighter.hp, 140);
    assert.equal(DEFAULT_ARCHETYPES.fighter.mana, 30);
    assert.equal(DEFAULT_ARCHETYPES.paladin.hp, 120);
    assert.equal(DEFAULT_ARCHETYPES.paladin.mana, 90);
  });

  it('awards XP and scales stats per level for all 4 vocations', () => {
    // Magician (+8 HP, +16 MP)
    const mag = createPlayer('magician');
    ProgressionSystem.awardXP(mag, 100);
    assert.equal(mag.level, 2);
    assert.equal(mag.max_hp, 68);
    assert.equal(mag.max_mana, 166);

    // Archer (+14 HP, +8 MP)
    const arch = createPlayer('archer');
    ProgressionSystem.awardXP(arch, 100);
    assert.equal(arch.level, 2);
    assert.equal(arch.max_hp, 104);
    assert.equal(arch.max_mana, 88);

    // Fighter (+18 HP, +4 MP)
    const fgt = createPlayer('fighter');
    ProgressionSystem.awardXP(fgt, 100);
    assert.equal(fgt.level, 2);
    assert.equal(fgt.max_hp, 158);
    assert.equal(fgt.max_mana, 34);

    // Paladin (+15 HP, +10 MP)
    const pal = createPlayer('paladin');
    ProgressionSystem.awardXP(pal, 100);
    assert.equal(pal.level, 2);
    assert.equal(pal.max_hp, 135);
    assert.equal(pal.max_mana, 100);
  });
});

// ============================================================================
// 5. CombatSystem & 2.5x Native Class Mastery
// ============================================================================

describe('CombatSystem & 2.5x Native Class Mastery', () => {
  let grid;

  beforeEach(() => {
    grid = new GridMap(20, 20);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        grid.tiles[y][x].type = TILE_TYPES.FLOOR;
      }
    }
  });

  it('correctly identifies native items for 4 vocations', () => {
    assert.equal(CombatSystem.isNativeItem({ item_id: 'apprentice_wand', type: 'weapon' }, 'magician'), true);
    assert.equal(CombatSystem.isNativeItem({ item_id: 'spell_wand_spark', type: 'spell' }, 'magician'), true);
    assert.equal(CombatSystem.isNativeItem({ item_id: 'wooden_bow', type: 'weapon' }, 'archer'), true);
    assert.equal(CombatSystem.isNativeItem({ item_id: 'tempered_broadsword', type: 'weapon' }, 'fighter'), true);
    assert.equal(CombatSystem.isNativeItem({ item_id: 'consecrated_warhammer', type: 'weapon' }, 'paladin'), true);
    assert.equal(CombatSystem.isNativeItem({ item_id: 'wooden_bow', type: 'weapon' }, 'fighter'), false);
  });

  it('applies 2.5x native class mastery multiplier on spells and weapons', () => {
    // Magician Wand Spark: Native (2.5x)
    const mag = createPlayer('magician');
    mag.x = 2;
    mag.y = 2;
    const monster = { id: 'm1', name: 'Skeleton', type: 'crypt_skeleton', x: 4, y: 2, hp: 100, max_hp: 100 };

    const magRes = CombatSystem.executeWandSpark(mag, monster, grid);
    assert.equal(magRes.success, true);
    assert.ok(magRes.damageDealt >= Math.round(CONFIG.MAGICIAN_SPARK_DAMAGE_MIN * 2.5));

    // Fighter Sword Slash: Native (2.5x)
    const fgt = createPlayer('fighter');
    fgt.x = 2;
    fgt.y = 2;
    const adjMonster = { id: 'm2', name: 'Skeleton', type: 'crypt_skeleton', x: 3, y: 2, hp: 100, max_hp: 100 };

    const fgtRes = CombatSystem.executeSlash(fgt, adjMonster, grid);
    assert.equal(fgtRes.success, true);
    assert.ok(fgtRes.damageDealt >= Math.round(CONFIG.FIGHTER_SLASH_DAMAGE_MIN * 2.5));
  });

  it('executes Archer Bow Shot and consumes arrows from Action Bar or Backpack', () => {
    const arch = createPlayer('archer');
    arch.action_bar[0] = { item_id: 'arrows', name: 'Arrows', type: 'ammo', quantity: 10 };
    arch.x = 2;
    arch.y = 2;
    const target = { id: 'm1', name: 'Rat', type: 'giant_rat', x: 5, y: 2, hp: 50, max_hp: 50 };

    const res = CombatSystem.executeBowShot(arch, target, grid);
    assert.equal(res.success, true);
    assert.equal(arch.action_bar[0].quantity, 9);
  });

  it('executes Paladin Healing Prayer and Holy Strike', () => {
    const pal = createPlayer('paladin');
    pal.hp = 50; // Damaged
    pal.mana = 90;

    const healRes = CombatSystem.executeHealingPrayer(pal);
    assert.equal(healRes.success, true);
    assert.ok(pal.hp > 50);
    assert.equal(pal.mana, 90 - CONFIG.PALADIN_HEAL_MANA_COST);

    pal.x = 2;
    pal.y = 2;
    const target = { id: 'm1', name: 'Skeleton', type: 'crypt_skeleton', x: 3, y: 2, hp: 100, max_hp: 100 };
    const strikeRes = CombatSystem.executeHolyStrike(pal, target, grid);
    assert.equal(strikeRes.success, true);
    assert.ok(strikeRes.damageDealt >= Math.round(CONFIG.PALADIN_HOLY_STRIKE_DAMAGE_MIN * 2.5));
  });
});

// ============================================================================
// 6. InventorySystem & Stacking
// ============================================================================

describe('InventorySystem & Stacking', () => {
  let grid;

  beforeEach(() => {
    grid = new GridMap(10, 10);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        grid.tiles[y][x].type = TILE_TYPES.FLOOR;
      }
    }
  });

  it('automatically picks up floor items into lowest empty Action Slot (0..9) first', () => {
    const player = createPlayer('magician');
    player.x = 2;
    player.y = 2;

    const pot = { item_id: 'health_potion', name: 'Health Potion', type: 'consumable', quantity: 2, stat_bonus: 30 };
    grid.addItem(2, 2, pot);

    const res = InventorySystem.pickUpItem(player, grid);
    assert.equal(res.success, true);
    assert.equal(player.action_bar[0].item_id, 'health_potion');
    assert.equal(player.action_bar[0].quantity, 2);
  });

  it('equips items to 4 paperdoll slots (main_hand, off_hand, armor, relic)', () => {
    const player = createPlayer('fighter');
    player.action_bar[0] = { item_id: 'tempered_broadsword', name: 'Broadsword', type: 'weapon', quantity: 1 };
    player.action_bar[1] = { item_id: 'buckler', name: 'Buckler', type: 'offhand', quantity: 1 };
    player.action_bar[2] = { item_id: 'plate_armor', name: 'Plate Armor', type: 'armor', quantity: 1 };
    player.action_bar[3] = { item_id: 'relic_champions_crest', name: "Champion's Crest", type: 'relic', quantity: 1 };

    InventorySystem.equipItem(player, 'action_bar', 0);
    InventorySystem.equipItem(player, 'action_bar', 1);
    InventorySystem.equipItem(player, 'action_bar', 2);
    InventorySystem.equipItem(player, 'action_bar', 3);

    assert.equal(player.paperdoll.main_hand.item_id, 'tempered_broadsword');
    assert.equal(player.paperdoll.off_hand.item_id, 'buckler');
    assert.equal(player.paperdoll.armor.item_id, 'plate_armor');
    assert.equal(player.paperdoll.relic.item_id, 'relic_champions_crest');
  });

  it('unequips items from paperdoll back to action bar or backpack', () => {
    const player = createPlayer('magician');
    player.paperdoll.main_hand = { item_id: 'apprentice_wand', name: 'Apprentice Wand', type: 'weapon', quantity: 1 };

    const res = InventorySystem.unequipItem(player, 'main_hand');
    assert.equal(res.success, true);
    assert.equal(player.paperdoll.main_hand, null);
    assert.equal(player.action_bar[0].item_id, 'apprentice_wand');
  });
});

// ============================================================================
// 7. FateGrantSystem
// ============================================================================

describe('FateGrantSystem', () => {
  it('generates a 5-card draft offer containing vocation-aligned cards at Level 1', () => {
    const vocations = ['magician', 'archer', 'fighter', 'paladin'];
    for (const v of vocations) {
      const offer = FateGrantSystem.generateDraftOffer(v, 1);
      assert.equal(offer.cards.length, 5);
      assert.equal(offer.requiredSelections.min, 1);
      assert.equal(offer.requiredSelections.max, 2);

      const hasAligned = offer.cards.some(c => c.vocationAffinity === v);
      assert.ok(hasAligned, `Level 1 draft offer for ${v} must contain vocation-aligned cards`);
    }
  });

  it('applies drafted cards into empty action slots then backpack', () => {
    const player = createPlayer('archer');
    const grid = new GridMap(10, 10);
    const offer = FateGrantSystem.generateDraftOffer('archer', 1);

    const chosenCards = offer.cards.slice(0, 2);
    const result = FateGrantSystem.applyDraftedCards(player, chosenCards, grid);

    assert.equal(result.addedToHotbar.length, 2);
    assert.ok(player.action_bar[0] !== null);
    assert.ok(player.action_bar[1] !== null);
  });
});

// ============================================================================
// 8. GestureEngine
// ============================================================================

describe('GestureEngine', () => {
  it('maps number keys 1-9 and 0 to slot indices 0-9 accurately', () => {
    assert.equal(GestureEngine.keyToSlotIndex('1'), 0);
    assert.equal(GestureEngine.keyToSlotIndex('2'), 1);
    assert.equal(GestureEngine.keyToSlotIndex('9'), 8);
    assert.equal(GestureEngine.keyToSlotIndex('0'), 9);
    assert.equal(GestureEngine.keyToSlotIndex('w'), null);

    assert.equal(GestureEngine.slotIndexToHotkey(0), '1');
    assert.equal(GestureEngine.slotIndexToHotkey(8), '9');
    assert.equal(GestureEngine.slotIndexToHotkey(9), '0');
  });
});

// ============================================================================
// 9. GameClient & Worker Protocol
// ============================================================================

describe('GameClient & Worker Protocol', () => {
  class MockWorker {
    constructor() {
      this.onmessage = null;
      this.onerror = null;
      this.isTerminated = false;
    }

    postMessage(msg) {
      const { id, command, payload } = msg;
      queueMicrotask(() => {
        if (this.isTerminated) return;
        if (command === 'bootstrap') {
          this.onmessage?.({
            data: {
              id,
              ok: true,
              data: {
                player: createPlayer('fighter'),
                profile: { id: 'default_profile', soundEnabled: true },
                activeFloor: generateFloor(1),
              },
            },
          });
        } else if (command === 'newGame') {
          this.onmessage?.({
            data: {
              id,
              ok: true,
              data: {
                player: createPlayer(payload.vocation || 'magician'),
                floor: generateFloor(1),
              },
            },
          });
        }
      });
    }

    terminate() {
      this.isTerminated = true;
    }
  }

  it('bootstraps and initializes new game via client', async () => {
    const mockWorker = new MockWorker();
    const client = new GameClient(mockWorker);

    const bData = await client.bootstrap();
    assert.ok(bData.player);
    assert.equal(bData.player.vocation, 'fighter');

    const nData = await client.newGame('paladin');
    assert.equal(nData.player.vocation, 'paladin');

    client.terminate();
  });
});
