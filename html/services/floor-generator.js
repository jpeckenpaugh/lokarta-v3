/**
 * Lokarta: Come Into The Light - Deterministic Floor Generator
 * Generates 40x40 procedural dungeon floors for Floors 1 to 20.
 */

import { MONSTERS_CATALOG, ITEMS_CATALOG, BIOMES_CATALOG, ENCOUNTERS_CATALOG, DUNGEONS_CATALOG } from '../data/index.js';

export const TILE_TYPES = {
  FLOOR: 0,
  WALL: 1,
  STAIRS: 2,
  DOOR: 3,
};

/**
 * Version of the current dungeon floor-generation template.
 * Bumped whenever the template/layout logic changes so cached floors from
 * older templates can be detected and regenerated (see game-worker.js).
 * v1 = legacy thick-walled layout; v2 = 1-tile-thick walls + 64px overhaul.
 */
export const FLOOR_TEMPLATE_VERSION = DUNGEONS_CATALOG.standard_40x40?.templateVersion || 1;

export const BIOMES = {
  CRYPT: {
    name: BIOMES_CATALOG.crypt.name,
    minFloor: BIOMES_CATALOG.crypt.minFloor,
    maxFloor: BIOMES_CATALOG.crypt.maxFloor,
    lightColor: BIOMES_CATALOG.crypt.lightColor,
  },
  CATACOMBS: {
    name: BIOMES_CATALOG.catacombs.name,
    minFloor: BIOMES_CATALOG.catacombs.minFloor,
    maxFloor: BIOMES_CATALOG.catacombs.maxFloor,
    lightColor: BIOMES_CATALOG.catacombs.lightColor,
  },
  SHADOW_VAULTS: {
    name: BIOMES_CATALOG.shadow_vaults.name,
    minFloor: BIOMES_CATALOG.shadow_vaults.minFloor,
    maxFloor: BIOMES_CATALOG.shadow_vaults.maxFloor,
    lightColor: BIOMES_CATALOG.shadow_vaults.lightColor,
  },
  ABYSSAL_SANCTUM: {
    name: BIOMES_CATALOG.abyssal_sanctum.name,
    minFloor: BIOMES_CATALOG.abyssal_sanctum.minFloor,
    maxFloor: BIOMES_CATALOG.abyssal_sanctum.maxFloor,
    lightColor: BIOMES_CATALOG.abyssal_sanctum.lightColor,
  },
};

/**
 * Creates a deterministic Mulberry32 PRNG from an integer seed.
 * @param {number|string} [seed] - Optional seed
 * @returns {Function & { random: Function, randomInt: Function, randomFloat: Function, choice: Function }}
 */
export function createPRNG(seed) {
  let s = 0;
  if (typeof seed === 'number') {
    s = seed >>> 0;
  } else if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    }
  } else {
    s = 1337;
  }

  function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const prng = function () {
    return next();
  };

  prng.random = function () {
    return next();
  };

  prng.randomInt = function (min, max) {
    return Math.floor(next() * (max - min + 1)) + min;
  };

  prng.randomFloat = function (min, max) {
    return next() * (max - min) + min;
  };

  prng.choice = function (array) {
    if (!array || array.length === 0) return null;
    const idx = Math.floor(next() * array.length);
    return array[idx];
  };

  return prng;
}

/**
 * Returns biome info for a given floor number.
 * @param {number} floorNumber
 * @returns {{ name: string, lightColor: string }}
 */
export function getBiomeForFloor(floorNumber) {
  const biome = Object.values(BIOMES_CATALOG).find(
    b => floorNumber >= b.minFloor && floorNumber <= b.maxFloor
  ) || BIOMES_CATALOG.abyssal_sanctum;
  return { name: biome.name, lightColor: biome.lightColor };
}

/**
 * Generates a complete 40x40 dungeon floor for floors 1 to 20.
 * 
 * @param {number} floorNumber - Floor index (1-20)
 * @param {number|string} [seed] - Optional custom PRNG seed
 * @returns {{
 *   floor_number: number,
 *   id: number,
 *   name: string,
 *   biome: string,
 *   width: number,
 *   height: number,
 *   tiles: number[][],
 *   tile_matrix: number[][],
 *   spawn_coords: { x: number, y: number },
 *   entrance: { x: number, y: number },
 *   stairs_down_coords: { x: number, y: number },
 *   exit: { x: number, y: number },
 *   monsters: Array<any>,
 *   spawns: Array<any>,
 *   items: Array<any>,
 *   initial_loot: Array<any>,
 *   ambient_lights: Array<any>
 * }}
 */
export function generateFloor(floorNumber = 1, seed = null) {
  const floorId = Math.max(1, Math.min(20, Math.floor(floorNumber)));
  const prngSeed = seed !== null && seed !== undefined ? seed : (1337 + floorId * 42);
  const rng = createPRNG(prngSeed);

  const width = 40;
  const height = 40;
  const { name: biomeName, lightColor } = getBiomeForFloor(floorId);

  const dungeonSpec = DUNGEONS_CATALOG.standard_40x40;
  const floorName = dungeonSpec.floorNameOverrides?.[floorId] || `${biomeName} - Floor ${floorId}`;

  // 1. Initialize all walls (1)
  const matrix = Array.from({ length: height }, () => Array(width).fill(TILE_TYPES.WALL));

  // 2. Define structured rooms across a 3x3 macro grid to guarantee rich connectivity
  const rooms = dungeonSpec.rooms;

  // Carve rooms into floor tiles (0)
  for (const [x1, y1, x2, y2] of rooms) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        matrix[y][x] = TILE_TYPES.FLOOR;
      }
    }
  }

  // Add decorative internal pillars in center rooms on select floors
  if (floorId % 2 === 1) {
    // Center Hall pillars (room 5 [13,13,25,26])
    if (matrix[18] && matrix[18][18] !== undefined) matrix[18][18] = TILE_TYPES.WALL;
    if (matrix[18] && matrix[18][23] !== undefined) matrix[18][23] = TILE_TYPES.WALL;
    if (matrix[23] && matrix[23][18] !== undefined) matrix[23][18] = TILE_TYPES.WALL;
    if (matrix[23] && matrix[23][23] !== undefined) matrix[23][23] = TILE_TYPES.WALL;
  }

  // 3. Carve connecting corridors (width of 2 tiles for comfortable navigation)
  function carveH(xStart, xEnd, y) {
    const minX = Math.min(xStart, xEnd);
    const maxX = Math.max(xStart, xEnd);
    for (let x = minX; x <= maxX; x++) {
      matrix[y][x] = TILE_TYPES.FLOOR;
      if (y + 1 < height - 1) {
        matrix[y + 1][x] = TILE_TYPES.FLOOR;
      }
    }
  }

  function carveV(yStart, yEnd, x) {
    const minY = Math.min(yStart, yEnd);
    const maxY = Math.max(yStart, yEnd);
    for (let y = minY; y <= maxY; y++) {
      matrix[y][x] = TILE_TYPES.FLOOR;
      if (x + 1 < width - 1) {
        matrix[y][x + 1] = TILE_TYPES.FLOOR;
      }
    }
  }

  for (const [xStart, xEnd, y] of dungeonSpec.corridorsH) {
    carveH(xStart, xEnd, y);
  }

  for (const [yStart, yEnd, x] of dungeonSpec.corridorsV) {
    carveV(yStart, yEnd, x);
  }

  // 4. Place Door tiles at key room-to-corridor entry thresholds
  const doorwayThresholds = dungeonSpec.doorways;

  for (const [dx, dy] of doorwayThresholds) {
    if (matrix[dy] && matrix[dy][dx] === TILE_TYPES.FLOOR) {
      matrix[dy][dx] = TILE_TYPES.DOOR;
    }
  }

  // Entrance at top-left
  const spawnCoords = dungeonSpec.spawnCoords;
  matrix[spawnCoords.y][spawnCoords.x] = TILE_TYPES.FLOOR;

  // Exit stairs at bottom-right
  const exitCoords = dungeonSpec.exitCoords;
  matrix[exitCoords.y][exitCoords.x] = TILE_TYPES.STAIRS;

  // 5. Ambient Lights (Torches on walls & room centers)
  const ambientLights = dungeonSpec.ambientLightNodes.map(node => ({
    x: node.x,
    y: node.y,
    radius: node.radius,
    color: lightColor,
  }));
  ambientLights.push({
    x: exitCoords.x,
    y: exitCoords.y,
    radius: 5,
    color: floorId < 20 ? '#38bdf8' : '#ffd700',
  });

  // 6. Monster Spawning based on ENCOUNTERS_CATALOG depth tiers
  const monsters = [];
  let spawnId = 1;

  const encounterTierKey = floorId <= 5 ? 'tier_1_5' : floorId <= 10 ? 'tier_6_10' : floorId <= 19 ? 'tier_11_19' : 'tier_20_boss';
  const encounterData = ENCOUNTERS_CATALOG[encounterTierKey];

  // Populate monsters across non-entrance rooms (rooms 1 through 8)
  const monsterRooms = rooms.slice(1);
  for (let idx = 0; idx < monsterRooms.length; idx++) {
    const [rx1, ry1, rx2, ry2] = monsterRooms[idx];
    const cx = Math.floor((rx1 + rx2) / 2);
    const cy = Math.floor((ry1 + ry2) / 2);

    let count = encounterData.baseMonstersPerRoom || 1;
    if (encounterData.extraMonsterFloorThreshold && floorId >= encounterData.extraMonsterFloorThreshold) count += 1;
    if (encounterData.bonusMonsterChanceFloor && floorId >= encounterData.bonusMonsterChanceFloor && rng.random() < (encounterData.bonusMonsterChance || 0.6)) count += 1;

    for (let mi = 0; mi < count; mi++) {
      let mType, mName, mHp, mAtk, mDef, moveCadence, attackCadence;

      if (floorId <= 19) {
        const spawnSpec = encounterData.spawns[(idx + mi) % encounterData.spawns.length];
        mType = spawnSpec.type;
        mName = spawnSpec.name;
        mHp = spawnSpec.baseHp + (floorId - 1) * spawnSpec.hpPerFloor;
        mAtk = Math.floor(spawnSpec.baseAtk + floorId * (spawnSpec.atkStep || 1.0));
        mDef = spawnSpec.defense;
        moveCadence = spawnSpec.moveCadence;
        attackCadence = spawnSpec.attackCadence;
      } else {
        const guardSpec = encounterData.guardSpawns[(idx + mi) % encounterData.guardSpawns.length];
        mType = guardSpec.type;
        mName = guardSpec.name;
        mHp = guardSpec.hp;
        mAtk = guardSpec.attack;
        mDef = guardSpec.defense;
        moveCadence = guardSpec.moveCadence;
        attackCadence = guardSpec.attackCadence;
      }

      const offsetX = (mi - 1) * 2;
      const offsetY = (mi % 2) * 2;
      let targetX = cx + offsetX;
      let targetY = cy + offsetY;

      if (targetX < rx1 + 1 || targetX > rx2 - 1) targetX = cx;
      if (targetY < ry1 + 1 || targetY > ry2 - 1) targetY = cy;

      monsters.push({
        id: `f${floorId}_m_${spawnId}`,
        type: mType,
        name: mName,
        x: targetX,
        y: targetY,
        hp: mHp,
        max_hp: mHp,
        attack: mAtk,
        defense: mDef,
        facing: 'down',
        isAggroed: false,
        attackCooldown: 0,
        moveCooldown: 0,
        attackCadence,
        moveCadence,
        visible: false,
      });
      spawnId++;
    }
  }

  // Floor 20 Final Boss: The Spire Warden (600 HP, 20 ATK, 6 DEF)
  if (floorId === 20 && ENCOUNTERS_CATALOG.tier_20_boss?.boss) {
    const bossSpec = ENCOUNTERS_CATALOG.tier_20_boss.boss;
    monsters.push({
      id: bossSpec.id,
      type: bossSpec.type,
      name: bossSpec.name,
      x: bossSpec.x,
      y: bossSpec.y,
      hp: bossSpec.hp,
      max_hp: bossSpec.max_hp,
      attack: bossSpec.attack,
      defense: bossSpec.defense,
      facing: 'down',
      isAggroed: true,
      attackCooldown: 0,
      moveCooldown: 0,
      attackCadence: bossSpec.attackCadence,
      moveCadence: bossSpec.moveCadence,
      visible: true,
      isBoss: true,
    });
  }

  // 7. Item Loot Spawns
  const items = [
    {
      // Spawn-room slot (adjacent to spawn (2,2), visible at game start).
      // On the very first level the board wants arrows x22 here so the Archer
      // vocation can collect ammunition immediately; higher floors keep the torch.
      x: 6,
      y: 6,
      item_id: floorId === 1 ? 'arrows' : 'torch',
      name: floorId === 1 ? 'Arrows' : 'Wooden Torch',
      type: floorId === 1 ? 'ammo' : 'offhand',
      quantity: floorId === 1 ? 22 : 1 + Math.floor(floorId / 5),
      stat_bonus: floorId === 1 ? 0 : 6,
    },
    {
      x: 17,
      y: 7,
      item_id: 'health_potion',
      name: 'Health Potion',
      type: 'consumable',
      quantity: 2,
      stat_bonus: 30,
    },
    {
      x: 20,
      y: 21,
      item_id: 'mana_potion',
      name: 'Mana Potion',
      type: 'consumable',
      quantity: 2,
      stat_bonus: 40,
    },
    {
      x: 33,
      y: 20,
      item_id: 'arrows',
      name: 'Arrows',
      type: 'ammo',
      quantity: 20 + floorId * 2,
      stat_bonus: 0,
    },
    {
      x: 8,
      y: 33,
      item_id: 'health_potion',
      name: 'Health Potion',
      type: 'consumable',
      quantity: 2,
      stat_bonus: 30,
    },
  ];

  // Milestone bonus drops catalog
  if (dungeonSpec.milestoneInterval && floorId % dungeonSpec.milestoneInterval === 0 && dungeonSpec.milestoneBonusItems) {
    items.push(...dungeonSpec.milestoneBonusItems);
  }

  return {
    floor_number: floorId,
    id: floorId,
    template_version: FLOOR_TEMPLATE_VERSION,
    name: floorName,
    biome: biomeName,
    width,
    height,
    tiles: matrix,
    tile_matrix: matrix,
    spawn_coords: spawnCoords,
    entrance: spawnCoords,
    stairs_down_coords: exitCoords,
    exit: exitCoords,
    monsters,
    spawns: monsters,
    items,
    initial_loot: items,
    ambient_lights: ambientLights,
  };
}
