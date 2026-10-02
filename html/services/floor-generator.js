/**
 * Lokarta: Come Into The Light - Deterministic Tower Floor Generator
 *
 * Generates the 5-level tower defined by D2 (`docs/level-design.md`):
 * a 3x3 nine-room floor per level, a room-2 doorway on level 1, a deterministic
 * two-way stair shaft, and copper/silver/gold gated doors that can never
 * soft-lock the player.
 *
 * Layout is seed-independent; only seeded jitter/rolls vary. The output is
 * therefore deterministic for a fixed (level, seed) pair.
 */

import {
  MONSTERS_CATALOG,
  ITEMS_CATALOG,
  BIOMES_CATALOG,
  DUNGEONS_CATALOG,
  TOWER_LEVELS_CATALOG,
} from '../data/index.js';

export const TILE_TYPES = {
  FLOOR: 0,
  WALL: 1,
  STAIRS: 2,
  DOOR: 3,
  GATED_DOOR: 4,
};

export const TOWER_LEVEL_COUNT = 5;

const GATE_TIERS = ['copper', 'silver', 'gold'];

/**
 * Version of the current dungeon floor-generation template.
 * Bumped whenever the template/layout logic changes so cached floors from
 * older templates can be detected and regenerated (see game-worker.js).
 * v1 = legacy thick-walled layout; v2 = 1-tile-thick walls + 64px overhaul;
 * v3 = 5-level tower (gated rooms + two-way stair shaft).
 */
export const FLOOR_TEMPLATE_VERSION = DUNGEONS_CATALOG.standard_40x40?.templateVersion || 1;

function biomeEntry(id) {
  const b = BIOMES_CATALOG[id] || {};
  return {
    name: b.name,
    minLevel: b.minLevel,
    maxLevel: b.maxLevel,
    lightColor: b.lightColor,
  };
}

export const BIOMES = {
  CRYPT: biomeEntry('crypt'),
  CATACOMBS: biomeEntry('catacombs'),
  SHADOW_VAULTS: biomeEntry('shadow_vaults'),
  ABYSSAL_SANCTUM: biomeEntry('abyssal_sanctum'),
  CROWN_SPIRE: biomeEntry('crown_spire'),
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
 * Clamps an arbitrary floor number onto the 5-level tower.
 * @param {number} floorNumber
 * @returns {number} 1..5
 */
export function clampLevel(floorNumber) {
  const n = Math.floor(Number(floorNumber));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(TOWER_LEVEL_COUNT, n));
}

/**
 * Returns tier info (display name + light color) for a tower level.
 * @param {number} floorNumber
 * @returns {{ name: string, minLevel: number, maxLevel: number, lightColor: string }}
 */
export function getBiomeForFloor(floorNumber) {
  const level = clampLevel(floorNumber);
  const biome =
    Object.values(BIOMES_CATALOG).find(
      b => level >= b.minLevel && level <= b.maxLevel
    ) || BIOMES_CATALOG.crown_spire;
  return { name: biome.name, lightColor: biome.lightColor };
}

/** @returns {object} the E1 level definition from tower_levels.json. */
export function getLevelSpec(levelNumber) {
  return TOWER_LEVELS_CATALOG.levels[clampLevel(levelNumber) - 1];
}

/**
 * Builds the room adjacency graph for a level. Locked gate edges are omitted,
 * so the graph reflects the rooms reachable with the given keys.
 * @param {object} levelSpec - tower_levels level entry
 * @param {{ copper?: boolean, silver?: boolean, gold?: boolean }} [unlocked]
 * @returns {Record<number, Set<number>>}
 */
export function buildRoomGraph(levelSpec, unlocked = {}) {
  const edges = DUNGEONS_CATALOG.standard_40x40.edges;
  const adjacency = {};
  for (let room = 1; room <= 9; room++) adjacency[room] = new Set();

  const connect = edgeId => {
    const edge = edges[edgeId];
    if (!edge) return;
    const [a, b] = edge.rooms;
    adjacency[a].add(b);
    adjacency[b].add(a);
  };

  // `openEdges` in the D2 catalogs includes the gated edges; a gate edge only
  // connects when its tier is unlocked, so exclude them from the free edges.
  const gateEdgeIds = new Set(GATE_TIERS.map(t => levelSpec.gates[t]).filter(Boolean));
  for (const edgeId of levelSpec.openEdges || []) {
    if (!gateEdgeIds.has(edgeId)) connect(edgeId);
  }
  for (const tier of GATE_TIERS) {
    if (unlocked[tier] && levelSpec.gates[tier]) connect(levelSpec.gates[tier]);
  }

  return adjacency;
}

/** BFS room reachability from a start room. */
export function reachableRooms(adjacency, startRoom) {
  const seen = new Set([startRoom]);
  const queue = [startRoom];
  while (queue.length > 0) {
    const room = queue.shift();
    for (const next of adjacency[room] || []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/**
 * D2 §10 soft-lock oracle. Verifies the strict key order on a level:
 * entry -> copper -> [copper gate] -> silver -> [silver gate] -> gold ->
 * [gold gate] -> stair room, and that no later target is reachable early.
 *
 * @param {number|object} level - level number or a tower_levels level entry
 * @returns {{ ok: boolean, level: number, failures: string[], stages: object }}
 */
export function validateFloorSoftlock(level) {
  const levelSpec = typeof level === 'object' && level !== null ? level : getLevelSpec(level);
  const levelNumber = levelSpec.level;
  const { entryRoom, stairRoom, keyRooms } = levelSpec;
  const failures = [];
  const stage = name => {
    const graph = buildRoomGraph(levelSpec, {
      copper: name !== 'entry',
      silver: name === 'silver' || name === 'gold',
      gold: name === 'gold',
    });
    return reachableRooms(graph, entryRoom);
  };

  const r0 = stage('entry');
  if (!r0.has(keyRooms.copper)) failures.push('copper holder unreachable from entry');
  if (r0.has(keyRooms.silver)) failures.push('silver holder reachable before copper gate');
  if (r0.has(keyRooms.gold)) failures.push('gold holder reachable before copper gate');
  if (r0.has(stairRoom)) failures.push('stair room reachable before gold gate');

  const r1 = stage('copper');
  if (!r1.has(keyRooms.silver)) failures.push('silver holder unreachable after copper gate');
  if (r1.has(keyRooms.gold)) failures.push('gold holder reachable before silver gate');
  if (r1.has(stairRoom)) failures.push('stair room reachable before gold gate');

  const r2 = stage('silver');
  if (!r2.has(keyRooms.gold)) failures.push('gold holder unreachable after silver gate');
  if (r2.has(stairRoom)) failures.push('stair room reachable before gold gate');

  const r3 = stage('gold');
  if (!r3.has(stairRoom)) failures.push('stair room unreachable after gold gate');

  return {
    ok: failures.length === 0,
    level: levelNumber,
    failures,
    stages: {
      entry: [...r0].sort((a, b) => a - b),
      copper: [...r1].sort((a, b) => a - b),
      silver: [...r2].sort((a, b) => a - b),
      gold: [...r3].sort((a, b) => a - b),
    },
  };
}

/**
 * Throws when a level can soft-lock. Mirrors the D2 §10 reference oracle.
 * @param {number|object} level
 * @returns {true}
 */
export function assertNoSoftlock(level) {
  const result = validateFloorSoftlock(level);
  if (!result.ok) {
    throw new Error(`Level ${result.level} soft-lock: ${result.failures.join('; ')}`);
  }
  return true;
}

function neighbors(x, y) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
}

/**
 * Tile-level BFS from the spawn tile over every passable tile (walls blocked).
 * Gated doors count as passable here — the structural no-soft-lock guarantee
 * comes from `validateFloorSoftlock`; this proves the carved floor is connected.
 * @param {object} floor
 * @returns {{ ok: boolean, reached: number, unreachableStairs: object[] }}
 */
export function validateFloorConnectivity(floor) {
  const { width, height } = floor;
  const visited = new Set([`${floor.spawn_coords.x},${floor.spawn_coords.y}`]);
  const queue = [{ x: floor.spawn_coords.x, y: floor.spawn_coords.y }];

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const n of neighbors(x, y)) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;
      if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) continue;
      if (floor.tiles[n.y][n.x] === TILE_TYPES.WALL) continue;
      visited.add(key);
      queue.push(n);
    }
  }

  const unreachableStairs = (floor.stairs || []).filter(
    s => !visited.has(`${s.x},${s.y}`)
  );

  return { ok: unreachableStairs.length === 0, reached: visited.size, unreachableStairs };
}

/** Ordered free tiles in a room, rotated so `anchor` is scanned first. */
function orderedCandidates(room, blocked, anchor) {
  const [x1, y1, x2, y2] = room;
  const tiles = [];
  for (let y = y1 + 1; y <= y2 - 1; y++) {
    for (let x = x1 + 1; x <= x2 - 1; x++) {
      if (blocked.has(`${x},${y}`)) continue;
      tiles.push({ x, y });
    }
  }
  if (!anchor) return tiles;
  const idx = tiles.findIndex(t => t.x === anchor.x && t.y === anchor.y);
  if (idx > 0) return tiles.slice(idx).concat(tiles.slice(0, idx));
  return tiles;
}

/** Takes the first free tile from an anchor-rotated candidate list. */
function takeCandidate(room, blocked, anchor, occupied) {
  for (const tile of orderedCandidates(room, blocked, anchor)) {
    if (occupied.has(`${tile.x},${tile.y}`)) continue;
    occupied.add(`${tile.x},${tile.y}`);
    return tile;
  }
  return null;
}

function round(n) {
  return Math.round(n);
}

/**
 * Generates a complete 40x40 tower floor for levels 1 to 5.
 *
 * @param {number} floorNumber - Level index (clamped to 1..5)
 * @param {number|string} [seed] - Optional custom PRNG seed
 * @returns {object} floor payload (tiles + structural metadata + entities)
 */
export function generateFloor(floorNumber = 1, seed = null) {
  const levelId = clampLevel(floorNumber);
  const tower = TOWER_LEVELS_CATALOG;
  const levelSpec = getLevelSpec(levelId);
  const dungeonSpec = DUNGEONS_CATALOG.standard_40x40;
  const rooms = dungeonSpec.rooms;
  const roomCenters = dungeonSpec.roomCenters;
  const edges = dungeonSpec.edges;
  const width = dungeonSpec.width || 40;
  const height = dungeonSpec.height || 40;

  const prngSeed = seed !== null && seed !== undefined ? seed : 1337 + levelId * 42;
  const rng = createPRNG(prngSeed);

  const { name: biomeName, lightColor } = getBiomeForFloor(levelId);
  const levelName = `${biomeName}`;

  // 1. Initialize all walls.
  const matrix = Array.from({ length: height }, () => Array(width).fill(TILE_TYPES.WALL));

  // 2. Carve the nine rooms.
  for (const [x1, y1, x2, y2] of rooms) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        matrix[y][x] = TILE_TYPES.FLOOR;
      }
    }
  }

  // 3. Decorative pillars in the center room on odd levels (D2 §2.2).
  const pillars = levelId % 2 === 1 ? dungeonSpec.pillars || [] : [];
  for (const [px, py] of pillars) {
    if (matrix[py] && matrix[py][px] !== undefined) matrix[py][px] = TILE_TYPES.WALL;
  }

  // 4. Carve open edges (cosmetic DOOR) and gate edges (GATED_DOOR).
  const gates = {};
  for (const edgeId of levelSpec.openEdges || []) {
    for (const [tx, ty] of edges[edgeId].tiles) matrix[ty][tx] = TILE_TYPES.DOOR;
  }
  for (const tier of GATE_TIERS) {
    const edgeId = levelSpec.gates[tier];
    if (!edgeId) continue;
    const tiles = edges[edgeId].tiles;
    for (const [tx, ty] of tiles) matrix[ty][tx] = TILE_TYPES.GATED_DOOR;
    gates[tier] = { edge: edgeId, tiles: tiles.map(([x, y]) => ({ x, y })) };
  }

  // 5. Entry (level 1) or arrival spawn (levels 2-5).
  const stairShaft = tower.stairShaft;
  const stairTiles = tower.stairTiles;
  const upRoom = levelId > 1 ? stairShaft[String(levelId - 1)] : null;
  const upTile = upRoom ? { x: stairTiles[String(upRoom)][0], y: stairTiles[String(upRoom)][1] } : null;
  const downRoom = levelSpec.stairRoom;
  const downTile = levelSpec.isFinal
    ? { x: stairTiles[String(downRoom)][0], y: stairTiles[String(downRoom)][1] }
    : { x: stairTiles[String(downRoom)][0], y: stairTiles[String(downRoom)][1] };

  let spawnCoords;
  let entryCoords;
  if (levelId === 1) {
    const entry = tower.entry;
    entryCoords = { x: entry.doorTile[0], y: entry.doorTile[1] };
    spawnCoords = { x: entry.spawnTile[0], y: entry.spawnTile[1] };
    matrix[entryCoords.y][entryCoords.x] = TILE_TYPES.DOOR;
  } else {
    entryCoords = { ...upTile };
    const center = roomCenters[String(levelSpec.entryRoom)];
    // Spawn one tile away from the arrival stair so it never auto-retriggers.
    const candidates = neighbors(upTile.x, upTile.y)
      .map(n => ({ ...n, d: Math.abs(n.x - center[0]) + Math.abs(n.y - center[1]) }))
      .sort((a, b) => a.d - b.d);
    const free = candidates.find(
      n => matrix[n.y] && matrix[n.y][n.x] !== TILE_TYPES.WALL
    );
    spawnCoords = free ? { x: free.x, y: free.y } : { x: center[0], y: center[1] };
  }

  // 6. Stairs. Up-stair on levels 2-5; down-stair on levels 1-4; the level-5
  //    summit tile stands in for the final objective.
  const stairs = [];
  if (upTile) {
    matrix[upTile.y][upTile.x] = TILE_TYPES.STAIRS;
    stairs.push({ x: upTile.x, y: upTile.y, dir: 'up', targetLevel: levelId - 1 });
  }
  if (levelSpec.isFinal) {
    matrix[downTile.y][downTile.x] = TILE_TYPES.STAIRS;
    stairs.push({ x: downTile.x, y: downTile.y, dir: 'summit', targetLevel: null });
  } else {
    matrix[downTile.y][downTile.x] = TILE_TYPES.STAIRS;
    stairs.push({ x: downTile.x, y: downTile.y, dir: 'down', targetLevel: levelId + 1 });
  }

  const stairUp = stairs.find(s => s.dir === 'up') || null;
  const stairDown = stairs.find(s => s.dir === 'down') || null;
  const summit = stairs.find(s => s.dir === 'summit') || null;
  const exitCoords = stairDown ? { x: stairDown.x, y: stairDown.y } : { x: summit.x, y: summit.y };

  // 7. Ambient lights at room centers plus the exit/summit.
  const ambientLights = (dungeonSpec.ambientLightNodes || []).map(node => ({
    x: node.x,
    y: node.y,
    radius: node.radius,
    color: lightColor,
  }));
  ambientLights.push({
    x: exitCoords.x,
    y: exitCoords.y,
    radius: 5,
    color: levelSpec.isFinal ? '#ffd700' : '#38bdf8',
  });

  // 8. Deterministic entity placement (D2 §9.2).
  const occupied = new Set();
  for (const [px, py] of pillars) occupied.add(`${px},${py}`);
  for (const s of stairs) occupied.add(`${s.x},${s.y}`);
  occupied.add(`${spawnCoords.x},${spawnCoords.y}`);
  if (levelId === 1) occupied.add(`${entryCoords.x},${entryCoords.y}`);

  const blocked = new Set(occupied);
  const roles = tower.placement.roles;
  const absAnchor = (room, offset) => {
    const center = roomCenters[String(room)];
    return { x: center[0] + offset[0], y: center[1] + offset[1] };
  };

  const groupSize = tower.monsterGroups.groupSize[String(levelId)];
  const pool = tower.monsterGroups.pool[String(levelId)];
  const statScale = tower.monsterGroups.statScale[String(levelId)];
  const keyHolderType = tower.monsterGroups.keyHolderType[String(levelId)];
  const keyHolderMod = tower.monsterGroups.keyHolderModifier;
  const keyRoomTier = tier => {
    for (const t of GATE_TIERS) if (levelSpec.keyRooms[t] === tier) return t;
    return null;
  };

  const monsters = [];
  let monsterId = 1;
  const slotOffsets = [
    roles.monsterSlot0,
    roles.monsterSlot1,
    roles.monsterSlot2,
    roles.monsterSlot3,
  ];

  const buildMonster = (type, room, tier, isKeyHolder) => {
    const base = MONSTERS_CATALOG[type] || MONSTERS_CATALOG.giant_rat;
    const hpScale = statScale.hp * (isKeyHolder ? keyHolderMod.hp : 1);
    const atkScale = statScale.atk * (isKeyHolder ? keyHolderMod.atk : 1);
    const hp = round(base.baseHp * hpScale);
    return {
      id: `f${levelId}_m_${monsterId++}`,
      type,
      name: base.name,
      room,
      hp,
      max_hp: hp,
      attack: round(base.baseAttack * atkScale),
      defense: base.baseDefense,
      facing: 'down',
      isAggroed: false,
      attackCooldown: 0,
      moveCooldown: 0,
      attackCadence: base.attackCadence,
      moveCadence: base.moveCadence,
      visible: false,
      holdsKey: isKeyHolder ? tier : null,
    };
  };

  for (let room = 1; room <= 9; room++) {
    const bounds = rooms[room - 1];
    const isKeyRoom = GATE_TIERS.some(t => levelSpec.keyRooms[t] === room);
    const holderTier = isKeyRoom ? keyRoomTier(room) : null;
    const isEntryRoom = room === levelSpec.entryRoom;

    // A key room replaces its last group slot with the tier's key holder, so it
    // still spawns exactly `groupSize` monsters.
    let regularSlots = groupSize;
    if (isKeyRoom) {
      const anchor = absAnchor(room, roles.keyHolder);
      const tile = takeCandidate(bounds, blocked, anchor, occupied);
      if (tile) {
        monsters.push(Object.assign(buildMonster(keyHolderType[holderTier], room, holderTier, true), tile));
        regularSlots -= 1;
      }
    }

    for (let slot = 0; slot < regularSlots; slot++) {
      const anchor = absAnchor(room, slotOffsets[slot % slotOffsets.length]);
      const tile = takeCandidate(bounds, blocked, anchor, occupied);
      if (!tile) continue;
      const memberType = pool[(room - 1 + slot) % pool.length];
      const monster = Object.assign(buildMonster(memberType, room, null, false), tile);
      monsters.push(monster);
    }

    // Entry-room group is placed farthest from the spawn and never ambushes.
    if (isEntryRoom) {
      for (const monster of monsters.filter(m => m.room === room)) {
        monster.isAggroed = false;
      }
    }
  }

  // Level-5 final boss + flanking guards.
  if (levelSpec.isFinal && tower.boss) {
    const bossSpec = tower.boss;
    monsters.push({
      id: `f${levelId}_boss_${bossSpec.type}`,
      type: bossSpec.type,
      name: bossSpec.name,
      room: bossSpec.room,
      x: bossSpec.tile[0],
      y: bossSpec.tile[1],
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
      holdsKey: null,
    });

    const guardBase = MONSTERS_CATALOG[bossSpec.guardType] || MONSTERS_CATALOG.elite_cultist;
    const flank = [
      { x: bossSpec.tile[0] - 1, y: bossSpec.tile[1] },
      { x: bossSpec.tile[0] + 1, y: bossSpec.tile[1] },
    ];
    for (let g = 0; g < (bossSpec.guardCount || 0); g++) {
      const tile = flank[g] || flank[flank.length - 1];
      if (matrix[tile.y] && matrix[tile.y][tile.x] === TILE_TYPES.WALL) continue;
      const hp = round(guardBase.baseHp * statScale.hp);
      monsters.push({
        id: `f${levelId}_guard_${g + 1}`,
        type: bossSpec.guardType,
        name: bossSpec.guardName || guardBase.name,
        room: bossSpec.room,
        x: tile.x,
        y: tile.y,
        hp,
        max_hp: hp,
        attack: round(guardBase.baseAttack * statScale.atk),
        defense: guardBase.baseDefense,
        facing: 'down',
        isAggroed: true,
        attackCooldown: 0,
        moveCooldown: 0,
        attackCadence: guardBase.attackCadence,
        moveCadence: guardBase.moveCadence,
        visible: true,
        isGuard: true,
        holdsKey: null,
      });
    }
  }

  // 9. Starter cache near the entry/up-stair (D2 §7.5).
  const items = [];
  const cacheEntries = tower.starterCache[String(levelId)] || [];
  if (cacheEntries.length > 0) {
    const entryRoom = levelSpec.entryRoom;
    const anchor = absAnchor(entryRoom, roles.starterCache);
    const tile = takeCandidate(rooms[entryRoom - 1], blocked, anchor, occupied);
    if (tile) {
      for (const entry of cacheEntries) {
        const def = ITEMS_CATALOG[entry.item_id] || {};
        items.push({
          x: tile.x,
          y: tile.y,
          item_id: entry.item_id,
          name: def.name || entry.item_id,
          type: def.type || 'item',
          quantity: entry.quantity,
          stat_bonus: def.stat_bonus || 0,
        });
      }
    }
  }

  // Seeded jitter (±1 tile) on non-boss monsters; structure stays fixed.
  for (const monster of monsters) {
    if (monster.isBoss || monster.isGuard) continue;
    const jx = monster.x + rng.randomInt(-1, 1);
    const jy = monster.y + rng.randomInt(-1, 1);
    if (
      matrix[jy] &&
      matrix[jy][jx] !== TILE_TYPES.WALL &&
      !occupied.has(`${jx},${jy}`)
    ) {
      occupied.delete(`${monster.x},${monster.y}`);
      occupied.add(`${jx},${jy}`);
      monster.x = jx;
      monster.y = jy;
    }
  }

  const toCoords = tile => (tile ? { x: tile.x, y: tile.y } : null);

  return {
    floor_number: levelId,
    level: levelId,
    id: levelId,
    template_version: FLOOR_TEMPLATE_VERSION,
    name: levelName,
    biome: biomeName,
    biome_id: levelSpec.tierId,
    biome_name: biomeName,
    width,
    height,
    tiles: matrix,
    tile_matrix: matrix,
    spawn_coords: spawnCoords,
    entrance: spawnCoords,
    entry: entryCoords,
    entry_room: levelSpec.entryRoom,
    stair_room: levelSpec.stairRoom,
    is_final: Boolean(levelSpec.isFinal),
    stairs,
    stair_up_coords: toCoords(stairUp),
    stair_down_coords: toCoords(stairDown),
    stairs_down_coords: exitCoords,
    exit: exitCoords,
    open_edges: [...(levelSpec.openEdges || [])],
    sealed_edges: [...(levelSpec.sealedEdges || [])],
    gates,
    key_rooms: { ...levelSpec.keyRooms },
    room_tiers: { ...levelSpec.roomTiers },
    monsters,
    spawns: monsters,
    items,
    initial_loot: items,
    ambient_lights: ambientLights,
  };
}
