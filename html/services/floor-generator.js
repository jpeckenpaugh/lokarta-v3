/**
 * Lokarta: Come Into The Light - Deterministic Floor Generator
 * Generates 40x40 procedural dungeon floors for Floors 1 to 20.
 */

import { MONSTERS_CATALOG, ITEMS_CATALOG } from '../data/index.js';

export const TILE_TYPES = {
  FLOOR: 0,
  WALL: 1,
  STAIRS: 2,
  DOOR: 3,
};

export const BIOMES = {
  CRYPT: {
    name: 'Subterranean Crypt',
    minFloor: 1,
    maxFloor: 5,
    lightColor: '#ff8800',
  },
  CATACOMBS: {
    name: 'Catacombs of Whispers',
    minFloor: 6,
    maxFloor: 10,
    lightColor: '#00d4ff',
  },
  SHADOW_VAULTS: {
    name: 'Shadow Vaults',
    minFloor: 11,
    maxFloor: 15,
    lightColor: '#a855f7',
  },
  ABYSSAL_SANCTUM: {
    name: 'Abyssal Sanctum',
    minFloor: 16,
    maxFloor: 20,
    lightColor: '#ef4444',
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
  if (floorNumber <= 5) return { name: BIOMES.CRYPT.name, lightColor: BIOMES.CRYPT.lightColor };
  if (floorNumber <= 10) return { name: BIOMES.CATACOMBS.name, lightColor: BIOMES.CATACOMBS.lightColor };
  if (floorNumber <= 15) return { name: BIOMES.SHADOW_VAULTS.name, lightColor: BIOMES.SHADOW_VAULTS.lightColor };
  return { name: BIOMES.ABYSSAL_SANCTUM.name, lightColor: BIOMES.ABYSSAL_SANCTUM.lightColor };
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

  let floorName = `${biomeName} - Floor ${floorId}`;
  if (floorId === 20) {
    floorName = 'Abyssal Sanctum - The Void Core (Final Floor)';
  }

  // 1. Initialize all walls (1)
  const matrix = Array.from({ length: height }, () => Array(width).fill(TILE_TYPES.WALL));

  // 2. Define structured rooms across a 3x3 macro grid to guarantee rich connectivity
  const rooms = [
    // [x1, y1, x2, y2]
    [2, 2, 8, 8],      // Top-Left (Entrance)
    [13, 2, 22, 9],    // Top-Center
    [28, 2, 37, 9],    // Top-Right
    [2, 14, 10, 24],   // Mid-Left
    [15, 14, 26, 25],  // Center Hall
    [30, 14, 37, 24],  // Mid-Right
    [2, 29, 11, 37],   // Bot-Left
    [16, 29, 26, 37],  // Bot-Center
    [30, 29, 37, 37],  // Bot-Right (Exit Sanctum)
  ];

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
    // Center Hall pillars
    if (matrix[17] && matrix[17][18] !== undefined) matrix[17][18] = TILE_TYPES.WALL;
    if (matrix[17] && matrix[17][23] !== undefined) matrix[17][23] = TILE_TYPES.WALL;
    if (matrix[22] && matrix[22][18] !== undefined) matrix[22][18] = TILE_TYPES.WALL;
    if (matrix[22] && matrix[22][23] !== undefined) matrix[22][23] = TILE_TYPES.WALL;
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

  // Row horizontal connections
  carveH(8, 13, 5);
  carveH(22, 28, 5);
  carveH(10, 15, 19);
  carveH(26, 30, 19);
  carveH(11, 16, 33);
  carveH(26, 30, 33);

  // Column vertical connections
  carveV(8, 14, 5);
  carveV(24, 29, 5);
  carveV(9, 14, 20);
  carveV(25, 29, 20);
  carveV(9, 14, 34);
  carveV(24, 29, 34);

  // 4. Place Door tiles at key room-to-corridor entry thresholds
  const doorwayThresholds = [
    [8, 5], [13, 5], [22, 5], [28, 5],
    [10, 19], [15, 19], [26, 19], [30, 19],
    [11, 33], [16, 33], [26, 33], [30, 33],
    [5, 8], [5, 14], [20, 9], [20, 14],
    [34, 9], [34, 14], [5, 24], [5, 29],
    [20, 25], [20, 29], [34, 24], [34, 29]
  ];

  for (const [dx, dy] of doorwayThresholds) {
    if (matrix[dy] && matrix[dy][dx] === TILE_TYPES.FLOOR) {
      matrix[dy][dx] = TILE_TYPES.DOOR;
    }
  }

  // Entrance at top-left
  const spawnCoords = { x: 2, y: 2 };
  matrix[spawnCoords.y][spawnCoords.x] = TILE_TYPES.FLOOR;

  // Exit stairs at bottom-right
  const exitCoords = { x: 35, y: 35 };
  matrix[exitCoords.y][exitCoords.x] = TILE_TYPES.STAIRS;

  // 5. Ambient Lights (Torches on walls & room centers)
  const ambientLights = [
    { x: 2, y: 2, radius: 4, color: lightColor },
    { x: 17, y: 5, radius: 4, color: lightColor },
    { x: 33, y: 5, radius: 4, color: lightColor },
    { x: 6, y: 19, radius: 4, color: lightColor },
    { x: 20, y: 19, radius: 6, color: lightColor },
    { x: 34, y: 19, radius: 4, color: lightColor },
    { x: 6, y: 33, radius: 4, color: lightColor },
    { x: 21, y: 33, radius: 4, color: lightColor },
    { x: exitCoords.x, y: exitCoords.y, radius: 5, color: floorId < 20 ? '#38bdf8' : '#ffd700' },
  ];

  // 6. Monster Spawning based on floor depth
  // Floors 1-5: Giant Rats, Crypt Skeletons
  // Floors 6-10: Skeletons, Shadow Cultists
  // Floors 11-19: Elite Cultists, Skeletons
  // Floor 20: Abyssal Overlord Boss + elite guards
  const monsters = [];
  let spawnId = 1;

  // Populate monsters across non-entrance rooms (rooms 1 through 8)
  const monsterRooms = rooms.slice(1);
  for (let idx = 0; idx < monsterRooms.length; idx++) {
    const [rx1, ry1, rx2, ry2] = monsterRooms[idx];
    const cx = Math.floor((rx1 + rx2) / 2);
    const cy = Math.floor((ry1 + ry2) / 2);

    // Number of monsters scales with depth
    let count = 1;
    if (floorId >= 4) count += 1;
    if (floorId >= 10 && rng.random() > 0.4) count += 1;

    for (let mi = 0; mi < count; mi++) {
      let mType = 'crypt_skeleton';
      let mName = 'Crypt Skeleton';
      let mHp = 40 + (floorId - 1) * 6;
      let mAtk = 8 + Math.floor(floorId * 0.8);
      let mDef = 2;
      let moveCadence = 0.8;
      let attackCadence = 1.5;

      if (floorId <= 5) {
        // Floors 1-5: Giant Rats (fast melee, lower HP) or Crypt Skeletons
        if ((idx + mi) % 2 === 0) {
          mType = 'giant_rat';
          mName = 'Giant Rat';
          mHp = 22 + (floorId - 1) * 4;
          mAtk = 6 + floorId;
          mDef = 1;
          moveCadence = 0.6;
          attackCadence = 1.2;
        } else {
          mType = 'crypt_skeleton';
          mName = 'Crypt Skeleton';
          mHp = 40 + (floorId - 1) * 6;
          mAtk = 8 + floorId;
          mDef = 2;
          moveCadence = 0.8;
          attackCadence = 1.5;
        }
      } else if (floorId <= 10) {
        // Floors 6-10: Skeletons or Shadow Cultists
        if ((idx + mi) % 2 === 0) {
          mType = 'crypt_skeleton';
          mName = 'Crypt Skeleton';
          mHp = 40 + (floorId - 1) * 6;
          mAtk = 10 + floorId;
          mDef = 2;
          moveCadence = 0.8;
          attackCadence = 1.5;
        } else {
          mType = 'shadow_cultist';
          mName = 'Shadow Cultist';
          mHp = 30 + (floorId - 1) * 5;
          mAtk = 10 + floorId;
          mDef = 1;
          moveCadence = 1.0;
          attackCadence = 2.0;
        }
      } else if (floorId <= 19) {
        // Floors 11-19: Elite Cultists or Armored Skeletons
        if ((idx + mi) % 2 === 0) {
          mType = 'elite_cultist';
          mName = 'Elite Shadow Cultist';
          mHp = 60 + (floorId - 1) * 6;
          mAtk = 14 + floorId;
          mDef = 3;
          moveCadence = 0.9;
          attackCadence = 1.8;
        } else {
          mType = 'crypt_skeleton';
          mName = 'Crypt Skeleton';
          mHp = 50 + (floorId - 1) * 7;
          mAtk = 12 + floorId;
          mDef = 3;
          moveCadence = 0.8;
          attackCadence = 1.5;
        }
      } else {
        // Floor 20: Elite Void Guards
        mType = (idx + mi) % 2 === 0 ? 'elite_cultist' : 'crypt_skeleton';
        mName = (idx + mi) % 2 === 0 ? 'Void Zealot' : 'Abyssal Guardian';
        mHp = 80;
        mAtk = 18;
        mDef = 4;
        moveCadence = 0.75;
        attackCadence = 1.5;
      }

      const offsetX = (mi - 1) * 2;
      const offsetY = (mi % 2) * 2;
      let targetX = cx + offsetX;
      let targetY = cy + offsetY;

      // Keep within room bounds
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

  // Floor 20 Final Boss: Abyssal Overlord (600 HP, 20 ATK, 6 DEF)
  if (floorId === 20) {
    monsters.push({
      id: 'f20_boss_overlord',
      type: 'abyssal_overlord',
      name: 'Abyssal Overlord',
      x: 33,
      y: 33,
      hp: 600,
      max_hp: 600,
      attack: 20,
      defense: 6,
      facing: 'down',
      isAggroed: true,
      attackCooldown: 0,
      moveCooldown: 0,
      attackCadence: 1.4,
      moveCadence: 0.7,
      visible: true,
      isBoss: true,
    });
  }

  // 7. Item Loot Spawns
  const items = [
    {
      x: 6,
      y: 6,
      item_id: 'torch',
      name: 'Wooden Torch',
      type: 'offhand',
      quantity: 1 + Math.floor(floorId / 5),
      stat_bonus: 6,
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

  // Bonus Greater Potions every 5th floor
  if (floorId % 5 === 0) {
    items.push({
      x: 22,
      y: 22,
      item_id: 'mana_potion',
      name: 'Greater Mana Potion',
      type: 'consumable',
      quantity: 3,
      stat_bonus: 60,
    });
    items.push({
      x: 24,
      y: 22,
      item_id: 'health_potion',
      name: 'Greater Health Potion',
      type: 'consumable',
      quantity: 3,
      stat_bonus: 50,
    });
  }

  return {
    floor_number: floorId,
    id: floorId,
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
