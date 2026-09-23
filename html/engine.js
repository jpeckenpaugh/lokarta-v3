/**
 * Lokarta: Come Into The Light - Core Engine
 * Standalone vanilla ES Module containing:
 * - GridMap
 * - LightingSystem
 * - ProgressionSystem
 * - CombatSystem
 * - EntityAI
 * - InventorySystem
 * - FateGrantSystem
 * - GestureEngine
 */

export const TILE_TYPES = {
  FLOOR: 0,
  WALL: 1,
  STAIRS: 2,
  DOOR: 3,
};

export const CONFIG = {
  GRID_SIZE: 32, // pixels per tile
  MAP_WIDTH: 40,
  MAP_HEIGHT: 40,
  TICK_INTERVAL_MS: 100, // 10 Hz fixed simulation tick

  // Inventory & Slots
  ACTION_BAR_SLOTS: 10,
  BACKPACK_SLOTS: 6,

  // Gesture Timings (ms)
  TAP_MAX_MS: 250,
  HOLD_MIN_MS: 250,
  HOLD_MAX_MS: 1200,
  DOUBLE_TAP_MAX_MS: 300,

  // Lighting
  BASE_LIGHT_RADIUS: 10,
  TORCH_LIGHT_RADIUS: 14,
  LIGHT_SPELL_RADIUS: 12,
  LIGHT_SPELL_DURATION_SEC: 30,
  AMBIENT_LIGHT_RADIUS: 4,

  // Class Mastery
  NATIVE_CLASS_MULTIPLIER: 2.5,

  // Abilities & Combat Base Values
  MAGICIAN_SPARK_DAMAGE_MIN: 12,
  MAGICIAN_SPARK_DAMAGE_MAX: 16,
  MAGICIAN_SPARK_RANGE: 5,
  MAGICIAN_SPARK_COOLDOWN_SEC: 1.0,

  MAGICIAN_LIGHT_MANA_COST: 15,
  MAGICIAN_LIGHT_COOLDOWN_SEC: 5.0,

  MAGICIAN_BEAM_MANA_COST: 30,
  MAGICIAN_BEAM_DAMAGE_MIN: 30,
  MAGICIAN_BEAM_DAMAGE_MAX: 40,
  MAGICIAN_BEAM_RANGE: 4,
  MAGICIAN_BEAM_COOLDOWN_SEC: 3.0,

  ARCHER_BOW_DAMAGE_MIN: 14,
  ARCHER_BOW_DAMAGE_MAX: 18,
  ARCHER_BOW_RANGE: 6,
  ARCHER_BOW_COOLDOWN_SEC: 1.0,

  ARCHER_POWER_SHOT_DAMAGE_MIN: 32,
  ARCHER_POWER_SHOT_DAMAGE_MAX: 42,
  ARCHER_POWER_SHOT_RANGE: 6,
  ARCHER_POWER_SHOT_COOLDOWN_SEC: 4.0,

  FIGHTER_SLASH_DAMAGE_MIN: 16,
  FIGHTER_SLASH_DAMAGE_MAX: 22,
  FIGHTER_SLASH_COOLDOWN_SEC: 0.8,

  FIGHTER_CLEAVE_MANA_COST: 10,
  FIGHTER_CLEAVE_DAMAGE_MIN: 24,
  FIGHTER_CLEAVE_DAMAGE_MAX: 34,
  FIGHTER_CLEAVE_COOLDOWN_SEC: 2.5,

  PALADIN_HOLY_STRIKE_MANA_COST: 10,
  PALADIN_HOLY_STRIKE_DAMAGE_MIN: 18,
  PALADIN_HOLY_STRIKE_DAMAGE_MAX: 26,
  PALADIN_HOLY_STRIKE_COOLDOWN_SEC: 1.2,

  PALADIN_HEAL_MANA_COST: 25,
  PALADIN_HEAL_MIN: 35,
  PALADIN_HEAL_MAX: 50,
  PALADIN_HEAL_COOLDOWN_SEC: 6.0,

  // Monster Balance & Cadence
  RAT_MOVE_CADENCE_SEC: 0.6,
  RAT_ATTACK_CADENCE_SEC: 1.2,
  RAT_DAMAGE_MIN: 4,
  RAT_DAMAGE_MAX: 8,

  SKELETON_MOVE_CADENCE_SEC: 0.8,
  SKELETON_ATTACK_CADENCE_SEC: 1.5,
  SKELETON_DAMAGE_MIN: 8,
  SKELETON_DAMAGE_MAX: 14,

  CULTIST_MOVE_CADENCE_SEC: 1.0,
  CULTIST_ATTACK_CADENCE_SEC: 2.0,
  CULTIST_DAMAGE_MIN: 10,
  CULTIST_DAMAGE_MAX: 16,
  CULTIST_STANDOFF_MIN: 3,
  CULTIST_STANDOFF_MAX: 4,

  BOSS_MOVE_CADENCE_SEC: 0.7,
  BOSS_ATTACK_CADENCE_SEC: 1.4,
  BOSS_DAMAGE_MIN: 16,
  BOSS_DAMAGE_MAX: 24,

  // Consumables
  HEALTH_POTION_HEAL: 30,
  MANA_POTION_RESTORE: 40,
};

export const DEFAULT_ARCHETYPES = {
  magician: {
    id: 'magician',
    vocation: 'magician',
    hp: 60,
    max_hp: 60,
    mana: 150,
    max_mana: 150,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    current_floor: 1,
    x: 2,
    y: 2,
    facing: 'right',
    lightSpellTimer: 0,
    cooldowns: {},
    skillBoosts: {
      damageMultiplier: 1.0,
      bonusRange: 0,
      bonusRegen: 0,
    },
    action_bar: [null, null, null, null, null, null, null, null, null, null],
    paperdoll: {
      main_hand: null,
      off_hand: null,
      armor: null,
      relic: null,
    },
    backpack: [null, null, null, null, null, null],
  },
  archer: {
    id: 'archer',
    vocation: 'archer',
    hp: 90,
    max_hp: 90,
    mana: 80,
    max_mana: 80,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    current_floor: 1,
    x: 2,
    y: 2,
    facing: 'right',
    lightSpellTimer: 0,
    cooldowns: {},
    skillBoosts: {
      damageMultiplier: 1.0,
      bonusRange: 0,
      bonusRegen: 0,
    },
    action_bar: [null, null, null, null, null, null, null, null, null, null],
    paperdoll: {
      main_hand: null,
      off_hand: null,
      armor: null,
      relic: null,
    },
    backpack: [null, null, null, null, null, null],
  },
  fighter: {
    id: 'fighter',
    vocation: 'fighter',
    hp: 140,
    max_hp: 140,
    mana: 30,
    max_mana: 30,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    current_floor: 1,
    x: 2,
    y: 2,
    facing: 'right',
    lightSpellTimer: 0,
    cooldowns: {},
    skillBoosts: {
      damageMultiplier: 1.0,
      bonusRange: 0,
      bonusRegen: 0,
    },
    action_bar: [null, null, null, null, null, null, null, null, null, null],
    paperdoll: {
      main_hand: null,
      off_hand: null,
      armor: null,
      relic: null,
    },
    backpack: [null, null, null, null, null, null],
  },
  paladin: {
    id: 'paladin',
    vocation: 'paladin',
    hp: 120,
    max_hp: 120,
    mana: 90,
    max_mana: 90,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    current_floor: 1,
    x: 2,
    y: 2,
    facing: 'right',
    lightSpellTimer: 0,
    cooldowns: {},
    skillBoosts: {
      damageMultiplier: 1.0,
      bonusRange: 0,
      bonusRegen: 0,
    },
    action_bar: [null, null, null, null, null, null, null, null, null, null],
    paperdoll: {
      main_hand: null,
      off_hand: null,
      armor: null,
      relic: null,
    },
    backpack: [null, null, null, null, null, null],
  },
};

/**
 * Creates a cloned player instance from archetype.
 * @param {'magician'|'archer'|'fighter'|'paladin'} [vocation='magician']
 * @param {string} [id]
 * @returns {object}
 */
export function createPlayer(vocation = 'magician', id = null) {
  const normVoc = (vocation || 'magician').toLowerCase();
  const archetype = DEFAULT_ARCHETYPES[normVoc] || DEFAULT_ARCHETYPES.magician;
  const clone = JSON.parse(JSON.stringify(archetype));
  if (id) {
    clone.id = id;
  }
  return clone;
}

// ============================================================================
// 1. GridMap
// ============================================================================

export class GridMap {
  /**
   * @param {number} [width=40]
   * @param {number} [height=40]
   */
  constructor(width = CONFIG.MAP_WIDTH, height = CONFIG.MAP_HEIGHT) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.initEmptyGrid();
  }

  initEmptyGrid() {
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          x,
          y,
          type: TILE_TYPES.WALL,
          items: [],
          isLit: false,
          lightIntensity: 0,
        });
      }
      this.tiles.push(row);
    }
  }

  /**
   * Loads the grid tile types from a 2D matrix of numbers.
   * @param {number[][]} matrix
   */
  loadFromMatrix(matrix) {
    if (!matrix || !matrix.length) return;
    this.height = matrix.length;
    this.width = matrix[0]?.length || CONFIG.MAP_WIDTH;
    this.tiles = [];

    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        const typeCode = matrix[y][x];
        let tileType = TILE_TYPES.FLOOR;
        if (typeCode === 1) tileType = TILE_TYPES.WALL;
        else if (typeCode === 2) tileType = TILE_TYPES.STAIRS;
        else if (typeCode === 3) tileType = TILE_TYPES.DOOR;

        row.push({
          x,
          y,
          type: tileType,
          items: [],
          isLit: false,
          lightIntensity: 0,
        });
      }
      this.tiles.push(row);
    }
  }

  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isWalkable(x, y) {
    if (!this.isInBounds(x, y)) return false;
    return this.tiles[y][x].type !== TILE_TYPES.WALL;
  }

  isWall(x, y) {
    if (!this.isInBounds(x, y)) return true;
    return this.tiles[y][x].type === TILE_TYPES.WALL;
  }

  isStairs(x, y) {
    if (!this.isInBounds(x, y)) return false;
    return this.tiles[y][x].type === TILE_TYPES.STAIRS;
  }

  isDoor(x, y) {
    if (!this.isInBounds(x, y)) return false;
    return this.tiles[y][x].type === TILE_TYPES.DOOR;
  }

  getTile(x, y) {
    if (!this.isInBounds(x, y)) return null;
    return this.tiles[y][x];
  }

  addItem(x, y, item) {
    const tile = this.getTile(x, y);
    if (tile && item) {
      tile.items.push(item);
    }
  }

  popTopItem(x, y) {
    const tile = this.getTile(x, y);
    if (tile && tile.items.length > 0) {
      return tile.items.pop() || null;
    }
    return null;
  }

  removeItem(x, y, itemIndex) {
    const tile = this.getTile(x, y);
    if (tile && itemIndex >= 0 && itemIndex < tile.items.length) {
      const removed = tile.items.splice(itemIndex, 1);
      return removed[0] || null;
    }
    return null;
  }

  getItems(x, y) {
    const tile = this.getTile(x, y);
    return tile ? tile.items : [];
  }
}

// ============================================================================
// 2. LightingSystem
// ============================================================================

export class LightingSystem {
  /**
   * Computes the player's active field of view radius.
   * Base vision: 10 tiles, Torch: 14 tiles, Light Spell: 12 tiles.
   * @param {object} player
   * @returns {number}
   */
  static computePlayerRadius(player) {
    if (player.lightSpellTimer > 0) {
      return CONFIG.LIGHT_SPELL_RADIUS;
    }
    const offHand = player.paperdoll?.off_hand || player.paperdoll?.left_hand;
    const mainHand = player.paperdoll?.main_hand || player.paperdoll?.right_hand;
    const hasTorchInAction = player.action_bar?.some(item => item?.item_id === 'torch');
    if ((offHand && offHand.item_id === 'torch') || (mainHand && mainHand.item_id === 'torch') || hasTorchInAction) {
      return CONFIG.TORCH_LIGHT_RADIUS;
    }
    return CONFIG.BASE_LIGHT_RADIUS;
  }

  /**
   * Recalculates lighting map and entity visibility across the dungeon.
   * @param {GridMap} gridMap
   * @param {object} player
   * @param {Array<object>} ambientLights
   * @param {Array<object>} monsters
   */
  static updateLighting(gridMap, player, ambientLights = [], monsters = []) {
    // 1. Reset all tiles
    for (let y = 0; y < gridMap.height; y++) {
      for (let x = 0; x < gridMap.width; x++) {
        const tile = gridMap.tiles[y][x];
        tile.isLit = false;
        tile.lightIntensity = 0;
      }
    }

    // 2. Ambient room emitters disabled for player-only lighting test

    // 3. Cast light from player
    const playerRadius = LightingSystem.computePlayerRadius(player);
    LightingSystem.castLightCircle(gridMap, player.x, player.y, playerRadius);

    // 4. Update monster visibility & light-triggered aggro
    for (const monster of monsters) {
      const tile = gridMap.getTile(monster.x, monster.y);
      if (tile && tile.isLit) {
        monster.visible = true;
        if (!monster.isAggroed) {
          if (LightingSystem.hasLineOfSight(gridMap, monster.x, monster.y, player.x, player.y)) {
            monster.isAggroed = true;
          }
        }
      } else {
        monster.visible = false;
      }
    }
  }

  /**
   * Casts FOV rays in a circle from origin (originX, originY).
   * @param {GridMap} gridMap
   * @param {number} originX
   * @param {number} originY
   * @param {number} radius
   */
  static castLightCircle(gridMap, originX, originY, radius) {
    const minX = Math.max(0, originX - radius);
    const maxX = Math.min(gridMap.width - 1, originX + radius);
    const minY = Math.max(0, originY - radius);
    const maxY = Math.min(gridMap.height - 1, originY + radius);

    // Light origin tile
    const originTile = gridMap.getTile(originX, originY);
    if (originTile) {
      originTile.isLit = true;
      originTile.lightIntensity = Math.max(originTile.lightIntensity, 1.0);
    }

    // Cast rays to the bounding box perimeter
    for (let x = minX; x <= maxX; x++) {
      LightingSystem.castRay(gridMap, originX, originY, x, minY, radius);
      LightingSystem.castRay(gridMap, originX, originY, x, maxY, radius);
    }
    for (let y = minY; y <= maxY; y++) {
      LightingSystem.castRay(gridMap, originX, originY, minX, y, radius);
      LightingSystem.castRay(gridMap, originX, originY, maxX, y, radius);
    }
  }

  /**
   * Casts a single ray using Bresenham line algorithm with wall occlusion.
   */
  static castRay(gridMap, x0, y0, x1, y1, maxRadius) {
    const points = LightingSystem.getBresenhamLine(x0, y0, x1, y1);

    for (const pt of points) {
      const dist = Math.hypot(pt.x - x0, pt.y - y0);
      if (dist > maxRadius + 0.5) break;

      const tile = gridMap.getTile(pt.x, pt.y);
      if (!tile) break;

      tile.isLit = true;
      const intensity = Math.max(0, 1 - dist / (maxRadius + 1));
      tile.lightIntensity = Math.max(tile.lightIntensity, intensity);

      // Wall occlusion: illuminates the wall tile, but blocks further ray penetration
      if (gridMap.isWall(pt.x, pt.y) && (pt.x !== x0 || pt.y !== y0)) {
        break;
      }
    }
  }

  /**
   * Checks if an unblocked line of sight exists between two coordinates.
   * @param {GridMap} gridMap
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @returns {boolean}
   */
  static hasLineOfSight(gridMap, x0, y0, x1, y1) {
    const points = LightingSystem.getBresenhamLine(x0, y0, x1, y1);
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (i > 0 && i < points.length - 1) {
        if (gridMap.isWall(pt.x, pt.y)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Returns list of integer coordinates connecting (x0, y0) to (x1, y1).
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @returns {Array<{ x: number, y: number }>}
   */
  static getBresenhamLine(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let currX = x0;
    let currY = y0;

    while (true) {
      points.push({ x: currX, y: currY });
      if (currX === x1 && currY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currY += sy;
      }
    }

    return points;
  }
}

// ============================================================================
// 3. ProgressionSystem
// ============================================================================

export class ProgressionSystem {
  static MAX_LEVEL = 20;

  /**
   * Calculates XP required to advance from current level to next (Level 1-20: level * 100).
   * @param {number} level
   * @returns {number}
   */
  static getXpForLevel(level) {
    return Math.max(1, level) * 100;
  }

  /**
   * Determine XP rewarded for defeating an enemy at given floor depth.
   * @param {string} monsterType
   * @param {number} floor
   * @param {boolean} [isBoss=false]
   * @returns {number}
   */
  static getMonsterXp(monsterType, floor = 1, isBoss = false) {
    if (isBoss || monsterType === 'abyssal_overlord' || monsterType === 'boss_overlord') {
      return 500;
    }
    if (monsterType === 'giant_rat') {
      return 20 + floor * 4;
    }
    if (monsterType === 'crypt_skeleton') {
      return 35 + (floor - 1) * 8;
    }
    if (monsterType === 'shadow_cultist') {
      return 45 + (floor - 1) * 10;
    }
    if (monsterType === 'elite_cultist') {
      return 65 + (floor - 1) * 12;
    }
    return 30 + floor * 5;
  }

  /**
   * Computes active skill boosts and stat modifiers for a given vocation and level.
   * @param {'magician'|'archer'|'fighter'|'paladin'} vocation
   * @param {number} level
   * @returns {{ damageMultiplier: number, bonusRange: number, bonusRegen: number }}
   */
  static computeSkillBoosts(vocation, level) {
    const levelDelta = Math.max(0, level - 1);
    const damageStep = vocation === 'magician' ? 0.10 : vocation === 'archer' ? 0.12 : vocation === 'fighter' ? 0.15 : 0.11;

    return {
      damageMultiplier: Number((1.0 + levelDelta * damageStep).toFixed(2)),
      bonusRange: Math.floor(levelDelta / 4), // +1 tile range every 4 levels
      bonusRegen: Math.floor(levelDelta / 3), // +1 passive regen bonus every 3 levels
    };
  }

  /**
   * Returns default skill boosts for level 1 character.
   */
  static getDefaultSkillBoosts() {
    return {
      damageMultiplier: 1.0,
      bonusRange: 0,
      bonusRegen: 0,
    };
  }

  /**
   * Awards XP to the player, handling multiple level-ups and stat enhancements.
   * @param {object} player
   * @param {number} amount
   * @returns {{
   *   leveledUp: boolean,
   *   oldLevel: number,
   *   newLevel: number,
   *   hpGained: number,
   *   manaGained: number,
   *   damagePercentGained: number
   * }}
   */
  static awardXP(player, amount) {
    const oldLevel = player.level;
    let hpGained = 0;
    let manaGained = 0;

    if (player.level >= ProgressionSystem.MAX_LEVEL) {
      player.xp = player.xpToNextLevel || ProgressionSystem.getXpForLevel(player.level);
      return {
        leveledUp: false,
        oldLevel,
        newLevel: oldLevel,
        hpGained: 0,
        manaGained: 0,
        damagePercentGained: 0,
      };
    }

    let remainingXp = amount;

    while (player.level < ProgressionSystem.MAX_LEVEL && (player.xp + remainingXp) >= player.xpToNextLevel) {
      const neededForNext = player.xpToNextLevel - player.xp;
      remainingXp -= neededForNext;
      player.level += 1;
      player.xp = 0;
      player.xpToNextLevel = ProgressionSystem.getXpForLevel(player.level);

      // Stat growth per level for 4 vocations
      let hpInc = 8;
      let manaInc = 16;
      if (player.vocation === 'archer') {
        hpInc = 14;
        manaInc = 8;
      } else if (player.vocation === 'fighter') {
        hpInc = 18;
        manaInc = 4;
      } else if (player.vocation === 'paladin') {
        hpInc = 15;
        manaInc = 10;
      }

      player.max_hp += hpInc;
      player.max_mana += manaInc;
      hpGained += hpInc;
      manaGained += manaInc;

      // Full restorative surge on level up
      player.hp = player.max_hp;
      player.mana = player.max_mana;
    }

    if (player.level < ProgressionSystem.MAX_LEVEL) {
      player.xp += remainingXp;
    } else {
      player.xp = player.xpToNextLevel;
    }

    // Refresh skill boosts
    player.skillBoosts = ProgressionSystem.computeSkillBoosts(player.vocation, player.level);

    const leveledUp = player.level > oldLevel;
    const damagePercentGained = Math.round((player.skillBoosts.damageMultiplier - 1.0) * 100);

    return {
      leveledUp,
      oldLevel,
      newLevel: player.level,
      hpGained,
      manaGained,
      damagePercentGained,
    };
  }
}

// ============================================================================
// 4. CombatSystem
// ============================================================================

export class CombatSystem {
  static decrementCooldowns(player, deltaSec) {
    if (!player.cooldowns) return;
    for (const key of Object.keys(player.cooldowns)) {
      if (player.cooldowns[key] > 0) {
        player.cooldowns[key] = Math.max(0, player.cooldowns[key] - deltaSec);
      }
    }
  }

  static decrementSpellTimers(player, deltaSec) {
    if (player.lightSpellTimer > 0) {
      player.lightSpellTimer = Math.max(0, player.lightSpellTimer - deltaSec);
    }
  }

  static randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static isNativeItem(item, vocation) {
    if (!item) return false;
    const itemId = item.item_id || '';
    if (vocation === 'magician') {
      return itemId.includes('wand') || itemId.includes('spark') || itemId.includes('beam') || itemId.includes('scepter') || itemId.includes('robe') || item.type === 'spell';
    }
    if (vocation === 'archer') {
      return itemId.includes('bow') || itemId.includes('arrow') || itemId.includes('shot');
    }
    if (vocation === 'fighter') {
      return itemId.includes('sword') || itemId.includes('slash') || itemId.includes('cleave') || itemId.includes('broadsword') || itemId.includes('fortify');
    }
    if (vocation === 'paladin') {
      return itemId.includes('warhammer') || itemId.includes('holy') || itemId.includes('prayer') || itemId.includes('radiance') || itemId.includes('hammer');
    }
    return false;
  }

  static getVocationMultiplier(item, vocation) {
    return CombatSystem.isNativeItem(item, vocation) ? CONFIG.NATIVE_CLASS_MULTIPLIER : 1.0;
  }

  static findArrowItem(player) {
    // Check Action Bar first
    if (player.action_bar) {
      for (let i = 0; i < player.action_bar.length; i++) {
        const item = player.action_bar[i];
        if (item && item.item_id === 'arrows' && item.quantity > 0) {
          return { inActionBar: true, index: i, item };
        }
      }
    }
    // Check Backpack
    if (player.backpack) {
      for (let i = 0; i < player.backpack.length; i++) {
        const item = player.backpack[i];
        if (item && item.item_id === 'arrows' && item.quantity > 0) {
          return { inBackpack: true, index: i, item };
        }
      }
    }
    return null;
  }

  static consumeArrow(player) {
    const arrowSlot = CombatSystem.findArrowItem(player);
    if (!arrowSlot) return false;

    arrowSlot.item.quantity -= 1;
    if (arrowSlot.item.quantity <= 0) {
      if (arrowSlot.inActionBar) {
        player.action_bar[arrowSlot.index] = null;
      } else {
        player.backpack[arrowSlot.index] = null;
      }
    }
    return true;
  }

  /**
   * Executes Magician Wand Spark ability.
   */
  static executeWandSpark(player, target, gridMap) {
    if (player.cooldowns?.wand_spark > 0) {
      return { success: false, message: 'Wand Spark is on cooldown.' };
    }

    const mult = (player.skillBoosts?.damageMultiplier || 1.0) * (player.vocation === 'magician' ? CONFIG.NATIVE_CLASS_MULTIPLIER : 1.0);
    const bonusRng = player.skillBoosts?.bonusRange || 0;

    const dist = Math.hypot(target.x - player.x, target.y - player.y);
    if (dist > (CONFIG.MAGICIAN_SPARK_RANGE + bonusRng) + 0.5) {
      return { success: false, message: 'Target is out of range for Wand Spark.' };
    }

    if (!LightingSystem.hasLineOfSight(gridMap, player.x, player.y, target.x, target.y)) {
      return { success: false, message: 'Line of sight to target is blocked.' };
    }

    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.wand_spark = CONFIG.MAGICIAN_SPARK_COOLDOWN_SEC;

    const baseDmg = CombatSystem.randomBetween(CONFIG.MAGICIAN_SPARK_DAMAGE_MIN, CONFIG.MAGICIAN_SPARK_DAMAGE_MAX);
    const damage = Math.round(baseDmg * mult);
    target.hp -= damage;

    const projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      type: 'wand_spark',
      sourceX: player.x,
      sourceY: player.y,
      targetX: target.x,
      targetY: target.y,
      currentX: player.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      currentY: player.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      durationMs: 250,
      elapsedMs: 0,
      color: '#44ccff',
    };

    let defeatedMonsterId;
    let droppedLoot;
    let message = `You hit ${target.name} with Wand Spark for ${damage} magic damage${player.vocation === 'magician' ? ' (2.5x Class Mastery!)' : ''}.`;

    if (target.hp <= 0) {
      defeatedMonsterId = target.id;
      droppedLoot = CombatSystem.generateMonsterLoot(target);
      message += ` ${target.name} was slain!`;
    }

    return {
      success: true,
      message,
      damageDealt: damage,
      projectiles: [projectile],
      defeatedMonsterId,
      droppedLoot,
    };
  }

  /**
   * Executes Magician Light Spell ability.
   */
  static executeLightSpell(player) {
    if (player.cooldowns?.light > 0) {
      return { success: false, message: 'Light spell is on cooldown.' };
    }

    if (player.mana < CONFIG.MAGICIAN_LIGHT_MANA_COST) {
      return { success: false, message: 'Not enough Mana to cast Light.' };
    }

    player.mana -= CONFIG.MAGICIAN_LIGHT_MANA_COST;
    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.light = CONFIG.MAGICIAN_LIGHT_COOLDOWN_SEC;
    player.lightSpellTimer = CONFIG.LIGHT_SPELL_DURATION_SEC;

    return {
      success: true,
      message: 'You cast Light! Darkness recedes for 30 seconds.',
    };
  }

  /**
   * Executes Magician Energy Beam piercing ability.
   */
  static executeEnergyBeam(player, facing = 'right', gridMap, monsters = []) {
    if (player.cooldowns?.energy_beam > 0) {
      return { success: false, message: 'Energy Beam is on cooldown.' };
    }

    if (player.mana < CONFIG.MAGICIAN_BEAM_MANA_COST) {
      return { success: false, message: 'Not enough Mana to cast Energy Beam.' };
    }

    player.mana -= CONFIG.MAGICIAN_BEAM_MANA_COST;
    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.energy_beam = CONFIG.MAGICIAN_BEAM_COOLDOWN_SEC;

    const mult = (player.skillBoosts?.damageMultiplier || 1.0) * (player.vocation === 'magician' ? CONFIG.NATIVE_CLASS_MULTIPLIER : 1.0);
    const bonusRng = player.skillBoosts?.bonusRange || 0;
    const beamRange = CONFIG.MAGICIAN_BEAM_RANGE + bonusRng;

    const dx = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
    const dy = facing === 'up' ? -1 : facing === 'down' ? 1 : 0;

    const beamTiles = [];
    let currX = player.x;
    let currY = player.y;

    for (let i = 1; i <= beamRange; i++) {
      currX += dx;
      currY += dy;
      if (!gridMap.isInBounds(currX, currY)) break;
      beamTiles.push({ x: currX, y: currY });
      if (gridMap.isWall(currX, currY)) {
        break; // Beam stops at wall
      }
    }

    let totalDamage = 0;
    let hits = 0;
    const defeatedIds = [];
    const allLoot = [];

    for (const monster of monsters) {
      const hit = beamTiles.some(t => t.x === monster.x && t.y === monster.y);
      if (hit && monster.hp > 0) {
        const baseDmg = CombatSystem.randomBetween(CONFIG.MAGICIAN_BEAM_DAMAGE_MIN, CONFIG.MAGICIAN_BEAM_DAMAGE_MAX);
        const damage = Math.round(baseDmg * mult);
        monster.hp -= damage;
        totalDamage += damage;
        hits++;

        if (monster.hp <= 0) {
          defeatedIds.push(monster.id);
          const loot = CombatSystem.generateMonsterLoot(monster);
          allLoot.push(...loot);
        }
      }
    }

    const projectile = {
      id: `proj_beam_${Date.now()}`,
      type: 'energy_beam',
      sourceX: player.x,
      sourceY: player.y,
      targetX: currX,
      targetY: currY,
      currentX: player.x * CONFIG.GRID_SIZE,
      currentY: player.y * CONFIG.GRID_SIZE,
      durationMs: 400,
      elapsedMs: 0,
      color: '#ff00aa',
      direction: facing,
      piercingTiles: beamTiles,
    };

    let msg = 'You unleashed Energy Beam!';
    if (hits > 0) {
      msg += ` Pierced ${hits} enemy(s) for ${totalDamage} total damage${player.vocation === 'magician' ? ' (2.5x Mastery)' : ''}.`;
    }

    return {
      success: true,
      message: msg,
      damageDealt: totalDamage,
      projectiles: [projectile],
      defeatedMonsterId: defeatedIds[0],
      droppedLoot: allLoot,
    };
  }

  /**
   * Executes Archer Bow Shot ability.
   */
  static executeBowShot(player, target, gridMap) {
    if (player.cooldowns?.bow_shot > 0) {
      return { success: false, message: 'Bow Shot is on cooldown.' };
    }

    const mult = (player.skillBoosts?.damageMultiplier || 1.0) * (player.vocation === 'archer' ? CONFIG.NATIVE_CLASS_MULTIPLIER : 1.0);
    const bonusRng = player.skillBoosts?.bonusRange || 0;

    const dist = Math.hypot(target.x - player.x, target.y - player.y);
    if (dist > (CONFIG.ARCHER_BOW_RANGE + bonusRng) + 0.5) {
      return { success: false, message: 'Target is out of range for Bow Shot.' };
    }

    if (!LightingSystem.hasLineOfSight(gridMap, player.x, player.y, target.x, target.y)) {
      return { success: false, message: 'Line of sight to target is blocked.' };
    }

    if (!CombatSystem.consumeArrow(player)) {
      return { success: false, message: 'Out of arrows! Cannot fire bow.' };
    }

    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.bow_shot = CONFIG.ARCHER_BOW_COOLDOWN_SEC;

    const baseDmg = CombatSystem.randomBetween(CONFIG.ARCHER_BOW_DAMAGE_MIN, CONFIG.ARCHER_BOW_DAMAGE_MAX);
    const damage = Math.round(baseDmg * mult);
    target.hp -= damage;

    const projectile = {
      id: `proj_arrow_${Date.now()}_${Math.random()}`,
      type: 'bow_shot',
      sourceX: player.x,
      sourceY: player.y,
      targetX: target.x,
      targetY: target.y,
      currentX: player.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      currentY: player.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      durationMs: 200,
      elapsedMs: 0,
      color: '#ddaa44',
    };

    let defeatedMonsterId;
    let droppedLoot;
    let message = `You fired an arrow at ${target.name} for ${damage} damage${player.vocation === 'archer' ? ' (2.5x Class Mastery!)' : ''}.`;

    if (target.hp <= 0) {
      defeatedMonsterId = target.id;
      droppedLoot = CombatSystem.generateMonsterLoot(target);
      message += ` ${target.name} was slain!`;
    }

    return {
      success: true,
      message,
      damageDealt: damage,
      projectiles: [projectile],
      defeatedMonsterId,
      droppedLoot,
    };
  }

  /**
   * Executes Archer Power Shot ability.
   */
  static executePowerShot(player, target, gridMap) {
    if (player.cooldowns?.power_shot > 0) {
      return { success: false, message: 'Power Shot is on cooldown.' };
    }

    const mult = (player.skillBoosts?.damageMultiplier || 1.0) * (player.vocation === 'archer' ? CONFIG.NATIVE_CLASS_MULTIPLIER : 1.0);
    const bonusRng = player.skillBoosts?.bonusRange || 0;

    const dist = Math.hypot(target.x - player.x, target.y - player.y);
    if (dist > (CONFIG.ARCHER_POWER_SHOT_RANGE + bonusRng) + 0.5) {
      return { success: false, message: 'Target is out of range for Power Shot.' };
    }

    if (!LightingSystem.hasLineOfSight(gridMap, player.x, player.y, target.x, target.y)) {
      return { success: false, message: 'Line of sight to target is blocked.' };
    }

    if (!CombatSystem.consumeArrow(player)) {
      return { success: false, message: 'Out of arrows! Cannot fire Power Shot.' };
    }

    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.power_shot = CONFIG.ARCHER_POWER_SHOT_COOLDOWN_SEC;

    const baseDmg = CombatSystem.randomBetween(CONFIG.ARCHER_POWER_SHOT_DAMAGE_MIN, CONFIG.ARCHER_POWER_SHOT_DAMAGE_MAX);
    const damage = Math.round(baseDmg * mult);
    target.hp -= damage;

    const projectile = {
      id: `proj_power_${Date.now()}_${Math.random()}`,
      type: 'power_shot',
      sourceX: player.x,
      sourceY: player.y,
      targetX: target.x,
      targetY: target.y,
      currentX: player.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      currentY: player.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      durationMs: 250,
      elapsedMs: 0,
      color: '#ff8800',
    };

    let defeatedMonsterId;
    let droppedLoot;
    let message = `Power Shot strikes ${target.name} for ${damage} heavy damage${player.vocation === 'archer' ? ' (2.5x Class Mastery!)' : ''}!`;

    if (target.hp <= 0) {
      defeatedMonsterId = target.id;
      droppedLoot = CombatSystem.generateMonsterLoot(target);
      message += ` ${target.name} was slain!`;
    }

    return {
      success: true,
      message,
      damageDealt: damage,
      projectiles: [projectile],
      defeatedMonsterId,
      droppedLoot,
    };
  }

  /**
   * Executes Melee Slash for Fighter / Weapons.
   */
  static executeSlash(player, target, gridMap) {
    if (player.cooldowns?.slash > 0) {
      return { success: false, message: 'Slash is on cooldown.' };
    }

    const dist = Math.hypot(target.x - player.x, target.y - player.y);
    if (dist > 1.5) {
      return { success: false, message: 'Target is too far for melee strike (adjacent only).' };
    }

    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.slash = CONFIG.FIGHTER_SLASH_COOLDOWN_SEC;

    const mult = (player.skillBoosts?.damageMultiplier || 1.0) * (player.vocation === 'fighter' ? CONFIG.NATIVE_CLASS_MULTIPLIER : 1.0);
    const baseDmg = CombatSystem.randomBetween(CONFIG.FIGHTER_SLASH_DAMAGE_MIN, CONFIG.FIGHTER_SLASH_DAMAGE_MAX);
    const damage = Math.round(baseDmg * mult);
    target.hp -= damage;

    let defeatedMonsterId;
    let droppedLoot;
    let message = `You slashed ${target.name} for ${damage} physical damage${player.vocation === 'fighter' ? ' (2.5x Class Mastery!)' : ''}.`;

    if (target.hp <= 0) {
      defeatedMonsterId = target.id;
      droppedLoot = CombatSystem.generateMonsterLoot(target);
      message += ` ${target.name} was slain!`;
    }

    return {
      success: true,
      message,
      damageDealt: damage,
      defeatedMonsterId,
      droppedLoot,
    };
  }

  /**
   * Executes Holy Strike for Paladin.
   */
  static executeHolyStrike(player, target, gridMap) {
    if (player.cooldowns?.holy_strike > 0) {
      return { success: false, message: 'Holy Strike is on cooldown.' };
    }

    if (player.mana < CONFIG.PALADIN_HOLY_STRIKE_MANA_COST) {
      return { success: false, message: 'Not enough Mana for Holy Strike.' };
    }

    const dist = Math.hypot(target.x - player.x, target.y - player.y);
    if (dist > 1.5) {
      return { success: false, message: 'Target is too far for Holy Strike.' };
    }

    player.mana -= CONFIG.PALADIN_HOLY_STRIKE_MANA_COST;
    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.holy_strike = CONFIG.PALADIN_HOLY_STRIKE_COOLDOWN_SEC;

    const mult = (player.skillBoosts?.damageMultiplier || 1.0) * (player.vocation === 'paladin' ? CONFIG.NATIVE_CLASS_MULTIPLIER : 1.0);
    const baseDmg = CombatSystem.randomBetween(CONFIG.PALADIN_HOLY_STRIKE_DAMAGE_MIN, CONFIG.PALADIN_HOLY_STRIKE_DAMAGE_MAX);
    const damage = Math.round(baseDmg * mult);
    target.hp -= damage;

    let defeatedMonsterId;
    let droppedLoot;
    let message = `Holy Strike smites ${target.name} for ${damage} holy damage${player.vocation === 'paladin' ? ' (2.5x Class Mastery!)' : ''}.`;

    if (target.hp <= 0) {
      defeatedMonsterId = target.id;
      droppedLoot = CombatSystem.generateMonsterLoot(target);
      message += ` ${target.name} was slain!`;
    }

    return {
      success: true,
      message,
      damageDealt: damage,
      defeatedMonsterId,
      droppedLoot,
    };
  }

  /**
   * Executes Healing Prayer for Paladin.
   */
  static executeHealingPrayer(player) {
    if (player.cooldowns?.healing_prayer > 0) {
      return { success: false, message: 'Healing Prayer is on cooldown.' };
    }

    if (player.mana < CONFIG.PALADIN_HEAL_MANA_COST) {
      return { success: false, message: 'Not enough Mana for Healing Prayer.' };
    }

    if (player.hp >= player.max_hp) {
      return { success: false, message: 'Health is already full!' };
    }

    player.mana -= CONFIG.PALADIN_HEAL_MANA_COST;
    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.healing_prayer = CONFIG.PALADIN_HEAL_COOLDOWN_SEC;

    const mult = player.vocation === 'paladin' ? CONFIG.NATIVE_CLASS_MULTIPLIER : 1.0;
    const baseHeal = CombatSystem.randomBetween(CONFIG.PALADIN_HEAL_MIN, CONFIG.PALADIN_HEAL_MAX);
    const healAmount = Math.round(baseHeal * mult);
    const restored = Math.min(healAmount, player.max_hp - player.hp);
    player.hp = Math.min(player.max_hp, player.hp + healAmount);

    return {
      success: true,
      message: `Healing Prayer channeled! Restored +${restored} HP (${player.hp}/${player.max_hp})${player.vocation === 'paladin' ? ' (2.5x Mastery!)' : ''}.`,
      healAmount: restored,
    };
  }

  /**
   * Generates loot dropped upon monster defeat.
   */
  static generateMonsterLoot(monster) {
    const loot = [];
    const roll = Math.random();

    if (monster.type === 'giant_rat') {
      if (roll < 0.4) {
        loot.push({
          item_id: 'health_potion',
          name: 'Health Potion',
          type: 'consumable',
          quantity: 1,
          stat_bonus: CONFIG.HEALTH_POTION_HEAL,
        });
      }
    } else if (monster.type === 'crypt_skeleton') {
      if (roll < 0.5) {
        loot.push({
          item_id: 'health_potion',
          name: 'Health Potion',
          type: 'consumable',
          quantity: 1,
          stat_bonus: CONFIG.HEALTH_POTION_HEAL,
        });
      } else {
        loot.push({
          item_id: 'arrows',
          name: 'Arrows',
          type: 'ammo',
          quantity: 10,
          stat_bonus: 0,
        });
      }
    } else if (monster.type === 'shadow_cultist' || monster.type === 'elite_cultist') {
      if (roll < 0.6) {
        loot.push({
          item_id: 'mana_potion',
          name: 'Mana Potion',
          type: 'consumable',
          quantity: 1,
          stat_bonus: CONFIG.MANA_POTION_RESTORE,
        });
      } else {
        loot.push({
          item_id: 'torch',
          name: 'Wooden Torch',
          type: 'offhand',
          quantity: 1,
          stat_bonus: CONFIG.TORCH_LIGHT_RADIUS,
        });
      }
    } else if (monster.type === 'abyssal_overlord') {
      loot.push({
        item_id: 'mana_potion',
        name: 'Greater Mana Potion',
        type: 'consumable',
        quantity: 3,
        stat_bonus: 60,
      });
      loot.push({
        item_id: 'health_potion',
        name: 'Greater Health Potion',
        type: 'consumable',
        quantity: 3,
        stat_bonus: 50,
      });
    }

    return loot;
  }
}

// ============================================================================
// 5. EntityAI
// ============================================================================

export class EntityAI {
  /**
   * Updates all active monsters in the dungeon on a game simulation tick.
   * @param {Array<object>} monsters
   * @param {object} player
   * @param {GridMap} gridMap
   * @param {number} deltaSec
   * @returns {Array<object>}
   */
  static updateMonsters(monsters, player, gridMap, deltaSec) {
    const results = [];

    for (const monster of monsters) {
      if (monster.hp <= 0) continue;

      if (monster.attackCooldown > 0) {
        monster.attackCooldown = Math.max(0, monster.attackCooldown - deltaSec);
      }
      monster.moveCooldown = Math.max(0, (monster.moveCooldown || 0) - deltaSec);

      // If not yet aggroed, wander idly in darkness
      if (!monster.isAggroed) {
        if ((monster.moveCooldown || 0) <= 0) {
          monster.moveCooldown = 3.0 + Math.random() * 2.5;
          EntityAI.idleWander(monster, gridMap, monsters);
        }
        continue;
      }

      // Melee monsters: Giant Rat, Crypt Skeleton, Abyssal Overlord Boss
      if (monster.type === 'giant_rat') {
        const action = EntityAI.updateMeleeMonster(monster, player, gridMap, monsters, CONFIG.RAT_DAMAGE_MIN, CONFIG.RAT_DAMAGE_MAX, CONFIG.RAT_MOVE_CADENCE_SEC);
        if (action) results.push(action);
      } else if (monster.type === 'crypt_skeleton') {
        const action = EntityAI.updateMeleeMonster(monster, player, gridMap, monsters, CONFIG.SKELETON_DAMAGE_MIN, CONFIG.SKELETON_DAMAGE_MAX, CONFIG.SKELETON_MOVE_CADENCE_SEC);
        if (action) results.push(action);
      } else if (monster.type === 'abyssal_overlord' || monster.isBoss) {
        const action = EntityAI.updateMeleeMonster(monster, player, gridMap, monsters, CONFIG.BOSS_DAMAGE_MIN, CONFIG.BOSS_DAMAGE_MAX, CONFIG.BOSS_MOVE_CADENCE_SEC);
        if (action) results.push(action);
      }
      // Ranged monsters: Shadow Cultist, Elite Cultist
      else if (monster.type === 'shadow_cultist' || monster.type === 'elite_cultist') {
        const action = EntityAI.updateCultist(monster, player, gridMap, monsters);
        if (action) results.push(action);
      }
    }

    return results;
  }

  static idleWander(monster, gridMap, allMonsters) {
    if (Math.random() < 0.4) return;
    const directions = [
      { x: 0, y: -1, dir: 'up' },
      { x: 0, y: 1, dir: 'down' },
      { x: -1, y: 0, dir: 'left' },
      { x: 1, y: 0, dir: 'right' },
    ];
    const choice = directions[Math.floor(Math.random() * directions.length)];
    const nx = monster.x + choice.x;
    const ny = monster.y + choice.y;

    if (gridMap.isWalkable(nx, ny) && !allMonsters.some(m => m.id !== monster.id && m.hp > 0 && m.x === nx && m.y === ny)) {
      monster.facing = choice.dir;
      monster.x = nx;
      monster.y = ny;
    }
  }

  static updateMeleeMonster(monster, player, gridMap, allMonsters, minDmg, maxDmg, defaultMoveCadence) {
    const distManhattan = Math.abs(monster.x - player.x) + Math.abs(monster.y - player.y);

    // Adjacent -> Attack
    if (distManhattan === 1) {
      monster.facing = EntityAI.getFacing(monster.x, monster.y, player.x, player.y);
      if (monster.attackCooldown <= 0) {
        monster.attackCooldown = monster.attackCadence || 1.5;
        const damage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
        player.hp = Math.max(0, player.hp - damage);
        return {
          damageToPlayer: damage,
          message: `${monster.name} attacks you for ${damage} physical damage!`,
        };
      }
      return null;
    }

    // Move towards player via A*
    if ((monster.moveCooldown || 0) <= 0) {
      monster.moveCooldown = (monster.moveCadence || defaultMoveCadence) + (Math.random() * 0.2 - 0.1);

      const nextStep = EntityAI.findNextStepAStar(
        { x: monster.x, y: monster.y },
        { x: player.x, y: player.y },
        gridMap,
        allMonsters.filter(m => m.id !== monster.id && m.hp > 0)
      );

      if (nextStep && (nextStep.x !== player.x || nextStep.y !== player.y)) {
        monster.facing = EntityAI.getFacing(monster.x, monster.y, nextStep.x, nextStep.y);
        monster.x = nextStep.x;
        monster.y = nextStep.y;
      }
    }

    return null;
  }

  static updateCultist(cultist, player, gridMap, allMonsters) {
    const dist = Math.hypot(cultist.x - player.x, cultist.y - player.y);
    const hasLOS = LightingSystem.hasLineOfSight(gridMap, cultist.x, cultist.y, player.x, player.y);

    cultist.facing = EntityAI.getFacing(cultist.x, cultist.y, player.x, player.y);

    // 1. Attack if in range (<= 5) with LOS
    if (dist <= 5 && hasLOS && cultist.attackCooldown <= 0) {
      cultist.attackCooldown = cultist.attackCadence || 2.0;
      const minDmg = cultist.type === 'elite_cultist' ? 14 : CONFIG.CULTIST_DAMAGE_MIN;
      const maxDmg = cultist.type === 'elite_cultist' ? 22 : CONFIG.CULTIST_DAMAGE_MAX;
      const damage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
      player.hp = Math.max(0, player.hp - damage);

      const projectile = {
        id: `proj_shadow_${Date.now()}_${Math.random()}`,
        type: 'shadow_bolt',
        sourceX: cultist.x,
        sourceY: cultist.y,
        targetX: player.x,
        targetY: player.y,
        currentX: cultist.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
        currentY: cultist.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
        durationMs: 300,
        elapsedMs: 0,
        color: '#9933ff',
      };

      return {
        damageToPlayer: damage,
        message: `${cultist.name} casts Shadow Bolt at you for ${damage} dark damage!`,
        projectiles: [projectile],
      };
    }

    // 2. Reposition / Standoff management
    if ((cultist.moveCooldown || 0) <= 0) {
      cultist.moveCooldown = (cultist.moveCadence || CONFIG.CULTIST_MOVE_CADENCE_SEC) + (Math.random() * 0.3 - 0.1);

      if (dist < CONFIG.CULTIST_STANDOFF_MIN) {
        const retreatStep = EntityAI.findRetreatStep(cultist, player, gridMap, allMonsters);
        if (retreatStep) {
          cultist.facing = EntityAI.getFacing(cultist.x, cultist.y, retreatStep.x, retreatStep.y);
          cultist.x = retreatStep.x;
          cultist.y = retreatStep.y;
        }
      } else if (dist > CONFIG.CULTIST_STANDOFF_MAX) {
        const nextStep = EntityAI.findNextStepAStar(
          { x: cultist.x, y: cultist.y },
          { x: player.x, y: player.y },
          gridMap,
          allMonsters.filter(m => m.id !== cultist.id && m.hp > 0)
        );
        if (nextStep && (nextStep.x !== player.x || nextStep.y !== player.y)) {
          cultist.facing = EntityAI.getFacing(cultist.x, cultist.y, nextStep.x, nextStep.y);
          cultist.x = nextStep.x;
          cultist.y = nextStep.y;
        }
      }
    }

    return null;
  }

  static findRetreatStep(monster, player, gridMap, allMonsters) {
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    let bestStep = null;
    let maxDist = Math.hypot(monster.x - player.x, monster.y - player.y);

    for (const dir of directions) {
      const nx = monster.x + dir.x;
      const ny = monster.y + dir.y;

      if (!gridMap.isWalkable(nx, ny)) continue;
      if (nx === player.x && ny === player.y) continue;
      if (allMonsters.some(m => m.id !== monster.id && m.hp > 0 && m.x === nx && m.y === ny)) continue;

      const d = Math.hypot(nx - player.x, ny - player.y);
      if (d > maxDist) {
        maxDist = d;
        bestStep = { x: nx, y: ny };
      }
    }

    return bestStep;
  }

  static findNextStepAStar(start, goal, gridMap, otherMonsters = []) {
    const openSet = [];
    const closedSet = new Set();

    const startNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y),
      f: Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y),
      parent: null,
    };
    openSet.push(startNode);

    const isBlocked = (x, y) => {
      if (!gridMap.isWalkable(x, y)) return true;
      if (otherMonsters.some(m => m.x === x && m.y === y)) return true;
      return false;
    };

    while (openSet.length > 0) {
      let lowestIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }
      const current = openSet.splice(lowestIndex, 1)[0];
      const key = `${current.x},${current.y}`;
      closedSet.add(key);

      if (current.x === goal.x && current.y === goal.y) {
        return EntityAI.reconstructFirstStep(current);
      }

      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
      ];

      for (const neighbor of neighbors) {
        if (!gridMap.isInBounds(neighbor.x, neighbor.y)) continue;
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) continue;

        if (neighbor.x !== goal.x || neighbor.y !== goal.y) {
          if (isBlocked(neighbor.x, neighbor.y)) continue;
        }

        const gScore = current.g + 1;
        let neighborNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (!neighborNode) {
          const hScore = Math.abs(neighbor.x - goal.x) + Math.abs(neighbor.y - goal.y);
          neighborNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: gScore,
            h: hScore,
            f: gScore + hScore,
            parent: current,
          };
          openSet.push(neighborNode);
        } else if (gScore < neighborNode.g) {
          neighborNode.g = gScore;
          neighborNode.f = gScore + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    return null;
  }

  static reconstructFirstStep(node) {
    let curr = node;
    while (curr.parent && curr.parent.parent) {
      curr = curr.parent;
    }
    return { x: curr.x, y: curr.y };
  }

  static getFacing(fromX, fromY, toX, toY) {
    if (toX > fromX) return 'right';
    if (toX < fromX) return 'left';
    if (toY > fromY) return 'down';
    return 'up';
  }
}

// ============================================================================
// 6. InventorySystem
// ============================================================================

export class InventorySystem {
  static getMaxStack(itemId) {
    if (itemId === 'health_potion' || itemId === 'mana_potion' || itemId === 'torch') {
      return 9;
    }
    if (itemId === 'arrows') {
      return 99;
    }
    return 1;
  }

  /**
   * Automatically picks up top item into lowest empty Action Slot, then Backpack.
   */
  static pickUpItem(player, gridMap) {
    const tileItems = gridMap.getItems(player.x, player.y);
    if (tileItems.length === 0) {
      return { success: false, message: 'There is nothing here to pick up.' };
    }

    const groundItem = tileItems[tileItems.length - 1];
    const maxStack = InventorySystem.getMaxStack(groundItem.item_id);
    let totalPickedUp = 0;

    // 1. Stack into Action Bar if stackable
    if (maxStack > 1 && player.action_bar) {
      for (let i = 0; i < player.action_bar.length; i++) {
        const slotItem = player.action_bar[i];
        if (slotItem && slotItem.item_id === groundItem.item_id && slotItem.quantity < maxStack) {
          const space = maxStack - slotItem.quantity;
          const toAdd = Math.min(space, groundItem.quantity);
          slotItem.quantity += toAdd;
          groundItem.quantity -= toAdd;
          totalPickedUp += toAdd;
          if (groundItem.quantity <= 0) break;
        }
      }
    }

    // 2. Stack into Backpack if stackable
    if (maxStack > 1 && groundItem.quantity > 0 && player.backpack) {
      for (let i = 0; i < player.backpack.length; i++) {
        const slotItem = player.backpack[i];
        if (slotItem && slotItem.item_id === groundItem.item_id && slotItem.quantity < maxStack) {
          const space = maxStack - slotItem.quantity;
          const toAdd = Math.min(space, groundItem.quantity);
          slotItem.quantity += toAdd;
          groundItem.quantity -= toAdd;
          totalPickedUp += toAdd;
          if (groundItem.quantity <= 0) break;
        }
      }
    }

    // 3. Place into lowest empty Action Slot (0..9)
    if (player.action_bar) {
      while (groundItem.quantity > 0) {
        const emptyIndex = player.action_bar.findIndex(slot => slot === null);
        if (emptyIndex === -1) break;

        const toMove = Math.min(maxStack, groundItem.quantity);
        groundItem.quantity -= toMove;
        totalPickedUp += toMove;

        player.action_bar[emptyIndex] = {
          ...groundItem,
          quantity: toMove,
        };
      }
    }

    // 4. Place into lowest empty Backpack Slot (0..5)
    if (player.backpack) {
      while (groundItem.quantity > 0) {
        const emptyIndex = player.backpack.findIndex(slot => slot === null);
        if (emptyIndex === -1) break;

        const toMove = Math.min(maxStack, groundItem.quantity);
        groundItem.quantity -= toMove;
        totalPickedUp += toMove;

        player.backpack[emptyIndex] = {
          ...groundItem,
          quantity: toMove,
        };
      }
    }

    if (groundItem.quantity <= 0) {
      gridMap.popTopItem(player.x, player.y);
    }

    if (totalPickedUp === 0) {
      return { success: false, message: 'Action Slots & Backpack are full!' };
    }

    return {
      success: true,
      message: `Picked up ${groundItem.name}${totalPickedUp > 1 ? ` (x${totalPickedUp})` : ''}.`,
      item: groundItem,
    };
  }

  static dropItem(player, source, slotIndex, gridMap) {
    const list = source === 'action_bar' ? player.action_bar : player.backpack;
    if (!list || slotIndex < 0 || slotIndex >= list.length) {
      return { success: false, message: 'Invalid slot index.' };
    }

    const item = list[slotIndex];
    if (!item) {
      return { success: false, message: 'Slot is empty.' };
    }

    list[slotIndex] = null;
    gridMap.addItem(player.x, player.y, item);

    return {
      success: true,
      message: `Dropped ${item.name} on the floor.`,
      item,
    };
  }

  static equipItem(player, source, slotIndex) {
    const list = source === 'action_bar' ? player.action_bar : player.backpack;
    if (!list || slotIndex < 0 || slotIndex >= list.length) {
      return { success: false, message: 'Invalid slot.' };
    }

    const item = list[slotIndex];
    if (!item) {
      return { success: false, message: 'No item in selected slot.' };
    }

    let targetSlot = null;
    if (item.type === 'weapon') {
      targetSlot = 'main_hand';
    } else if (item.type === 'offhand' || item.item_id === 'torch' || item.item_id === 'buckler') {
      targetSlot = 'off_hand';
    } else if (item.type === 'armor') {
      targetSlot = 'armor';
    } else if (item.type === 'relic') {
      targetSlot = 'relic';
    } else {
      return { success: false, message: `${item.name} cannot be equipped.` };
    }

    if (!player.paperdoll) {
      player.paperdoll = { main_hand: null, off_hand: null, armor: null, relic: null };
    }

    const currentlyEquipped = player.paperdoll[targetSlot];

    if (item.quantity > 1) {
      item.quantity -= 1;
      player.paperdoll[targetSlot] = { ...item, quantity: 1 };
      if (currentlyEquipped) {
        const emptyIdx = list.findIndex(s => s === null);
        if (emptyIdx !== -1) {
          list[emptyIdx] = currentlyEquipped;
        } else {
          item.quantity += 1;
          player.paperdoll[targetSlot] = currentlyEquipped;
          return { success: false, message: 'Cannot swap: Inventory is full!' };
        }
      }
    } else {
      player.paperdoll[targetSlot] = item;
      list[slotIndex] = currentlyEquipped;
    }

    return {
      success: true,
      message: `Equipped ${item.name} in ${targetSlot.replace('_', ' ')}.`,
      item: player.paperdoll[targetSlot],
    };
  }

  static unequipItem(player, slotName) {
    if (!player.paperdoll || !player.paperdoll[slotName]) {
      return { success: false, message: `No item equipped in ${slotName.replace('_', ' ')}.` };
    }

    const item = player.paperdoll[slotName];

    // Try placing into Action Bar first
    if (player.action_bar) {
      const emptyActionIdx = player.action_bar.findIndex(s => s === null);
      if (emptyActionIdx !== -1) {
        player.paperdoll[slotName] = null;
        player.action_bar[emptyActionIdx] = item;
        return { success: true, message: `Unequipped ${item.name} to Action Slot ${emptyActionIdx + 1}.`, item };
      }
    }

    // Try placing into Backpack
    if (player.backpack) {
      const emptyBpIdx = player.backpack.findIndex(s => s === null);
      if (emptyBpIdx !== -1) {
        player.paperdoll[slotName] = null;
        player.backpack[emptyBpIdx] = item;
        return { success: true, message: `Unequipped ${item.name} to Backpack Slot ${emptyBpIdx + 1}.`, item };
      }
    }

    return { success: false, message: 'Cannot unequip: Inventory is full!' };
  }

  static useBackpackItem(player, slotIndex) {
    if (slotIndex < 0 || slotIndex >= player.backpack.length) {
      return { success: false, message: 'Invalid backpack slot.' };
    }

    const item = player.backpack[slotIndex];
    if (!item) {
      return { success: false, message: 'Slot is empty.' };
    }

    if (item.type === 'consumable') {
      return InventorySystem.consumeItem(player, item, () => {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          player.backpack[slotIndex] = null;
        }
      });
    }

    if (item.type === 'weapon' || item.type === 'offhand' || item.type === 'armor' || item.type === 'relic' || item.item_id === 'torch') {
      return InventorySystem.equipItem(player, 'backpack', slotIndex);
    }

    return { success: false, message: `Cannot use ${item.name}.` };
  }

  static consumeItem(player, item, removeCallback) {
    if (item.item_id === 'health_potion') {
      if (player.hp >= player.max_hp) {
        return { success: false, message: 'Health is already full!' };
      }
      const healAmount = item.stat_bonus || CONFIG.HEALTH_POTION_HEAL;
      const restored = Math.min(healAmount, player.max_hp - player.hp);
      player.hp = Math.min(player.max_hp, player.hp + healAmount);
      removeCallback();
      return {
        success: true,
        message: `Drank Health Potion. Restored +${restored} HP (${player.hp}/${player.max_hp}).`,
        item,
      };
    }

    if (item.item_id === 'mana_potion') {
      if (player.mana >= player.max_mana) {
        return { success: false, message: 'Mana is already full!' };
      }
      const restoreAmount = item.stat_bonus || CONFIG.MANA_POTION_RESTORE;
      const restored = Math.min(restoreAmount, player.max_mana - player.mana);
      player.mana = Math.min(player.max_mana, player.mana + restoreAmount);
      removeCallback();
      return {
        success: true,
        message: `Drank Mana Potion. Restored +${restored} MP (${player.mana}/${player.max_mana}).`,
        item,
      };
    }

    return { success: false, message: `Unknown consumable item: ${item.name}` };
  }
}

// ============================================================================
// 7. FateGrantSystem
// ============================================================================

export class FateGrantSystem {
  static CARD_DATABASE = [
    // Magician Cards
    {
      id: 'card_wand_spark',
      name: 'Wand Spark',
      rarity: 'common',
      icon: '✨',
      description: 'Cast instant radiant bolt for 12–16 magic damage.',
      statBonusText: '12–16 Dmg (0 MP)',
      vocationAffinity: 'magician',
      item: {
        item_id: 'spell_wand_spark',
        name: 'Wand Spark',
        type: 'spell',
        quantity: 1,
        stat_bonus: 14,
        manaCost: 0,
        cooldown: 1.0,
        icon: '✨',
      },
    },
    {
      id: 'card_light_spell',
      name: 'Radiant Light Spell',
      rarity: 'common',
      icon: '💡',
      description: 'Expand illuminated line-of-sight to 12 tiles for 30 seconds.',
      statBonusText: '12-Tile Vision (15 MP)',
      vocationAffinity: 'magician',
      item: {
        item_id: 'spell_light',
        name: 'Light Spell',
        type: 'spell',
        quantity: 1,
        stat_bonus: 12,
        manaCost: 15,
        cooldown: 5.0,
        icon: '💡',
      },
    },
    {
      id: 'card_energy_beam',
      name: 'Arcane Energy Beam',
      rarity: 'rare',
      icon: '⚡',
      description: 'Unleash a piercing linear ray striking all enemies across 4 tiles for 30–40 damage.',
      statBonusText: '30–40 Linear Dmg (30 MP)',
      vocationAffinity: 'magician',
      item: {
        item_id: 'spell_energy_beam',
        name: 'Energy Beam',
        type: 'spell',
        quantity: 1,
        stat_bonus: 35,
        manaCost: 30,
        cooldown: 3.0,
        icon: '⚡',
      },
    },
    {
      id: 'card_apprentice_wand',
      name: 'Apprentice Wand',
      rarity: 'common',
      icon: '🪄',
      description: 'Carved hazel wand boosting magic projectile accuracy and spell focus.',
      statBonusText: '+3 Spell Power',
      vocationAffinity: 'magician',
      item: {
        item_id: 'apprentice_wand',
        name: 'Apprentice Wand',
        type: 'weapon',
        quantity: 1,
        stat_bonus: 3,
        icon: '🪄',
      },
    },
    {
      id: 'card_astral_scepter',
      name: 'Astral Scepter',
      rarity: 'epic',
      icon: '🔮',
      description: 'Ancient scepter pulsating with cosmic resonance, enhancing all elemental spell damage.',
      statBonusText: '+8 Spell Power',
      vocationAffinity: 'magician',
      item: {
        item_id: 'astral_scepter',
        name: 'Astral Scepter',
        type: 'weapon',
        quantity: 1,
        stat_bonus: 8,
        icon: '🔮',
      },
    },

    // Archer Cards
    {
      id: 'card_bow_shot',
      name: 'Hunting Bow & Shot',
      rarity: 'common',
      icon: '🏹',
      description: 'Fire a precision physical arrow at distant monsters within line-of-sight (14–18 damage).',
      statBonusText: '14–18 Dmg (1 Arrow)',
      vocationAffinity: 'archer',
      item: {
        item_id: 'spell_bow_shot',
        name: 'Bow Shot',
        type: 'spell',
        quantity: 1,
        stat_bonus: 16,
        cooldown: 1.0,
        icon: '🏹',
      },
    },
    {
      id: 'card_power_shot',
      name: 'Power Shot',
      rarity: 'rare',
      icon: '🎯',
      description: 'Draw bow to full tension for a devastating burst strike dealing 32–42 damage.',
      statBonusText: '32–42 Dmg (4s CD)',
      vocationAffinity: 'archer',
      item: {
        item_id: 'spell_power_shot',
        name: 'Power Shot',
        type: 'spell',
        quantity: 1,
        stat_bonus: 37,
        cooldown: 4.0,
        icon: '🎯',
      },
    },
    {
      id: 'card_quiver_arrows',
      name: 'Quiver of Arrows',
      rarity: 'common',
      icon: '📦',
      description: 'Bundle of 15 fletched iron-tipped dungeon arrows.',
      statBonusText: '15 Arrows',
      vocationAffinity: 'archer',
      item: {
        item_id: 'arrows',
        name: 'Arrows',
        type: 'ammo',
        quantity: 15,
        stat_bonus: 0,
        icon: '🏹',
      },
    },
    {
      id: 'card_composite_bow',
      name: 'Composite Longbow',
      rarity: 'epic',
      icon: '🏹',
      description: 'High-draw recurve bow extending attack range and piercing through armor.',
      statBonusText: '+6 Ranged Power',
      vocationAffinity: 'archer',
      item: {
        item_id: 'composite_bow',
        name: 'Composite Longbow',
        type: 'weapon',
        quantity: 1,
        stat_bonus: 6,
        icon: '🏹',
      },
    },

    // Fighter Cards
    {
      id: 'card_iron_shortsword',
      name: 'Iron Shortsword & Slash',
      rarity: 'common',
      icon: '⚔️',
      description: 'Swift melee blade strike dealing 16–22 physical damage to adjacent foes.',
      statBonusText: '16–22 Melee Dmg',
      vocationAffinity: 'fighter',
      item: {
        item_id: 'spell_slash',
        name: 'Sword Slash',
        type: 'spell',
        quantity: 1,
        stat_bonus: 18,
        cooldown: 0.8,
        icon: '⚔️',
      },
    },
    {
      id: 'card_fighter_cleave',
      name: 'Whirlwind Cleave',
      rarity: 'rare',
      icon: '🌪️',
      description: 'Sweeping wide arc slashing all adjacent monsters for 24–34 physical damage.',
      statBonusText: '24–34 Multi Dmg (10 MP)',
      vocationAffinity: 'fighter',
      item: {
        item_id: 'spell_cleave',
        name: 'Sweeping Cleave',
        type: 'spell',
        quantity: 1,
        stat_bonus: 28,
        manaCost: 10,
        cooldown: 2.5,
        icon: '🌪️',
      },
    },
    {
      id: 'card_fighter_fortify',
      name: 'Shield Wall / Fortify',
      rarity: 'common',
      icon: '🛡️',
      description: 'Assume an unyielding defensive stance reducing incoming damage by 50% for 10 seconds.',
      statBonusText: '-50% Dmg Taken (15 MP)',
      vocationAffinity: 'fighter',
      item: {
        item_id: 'spell_fortify',
        name: 'Fortify Stance',
        type: 'spell',
        quantity: 1,
        stat_bonus: 50,
        manaCost: 15,
        cooldown: 12.0,
        icon: '🛡️',
      },
    },
    {
      id: 'card_broadsword',
      name: 'Tempered Broadsword',
      rarity: 'epic',
      icon: '🗡️',
      description: 'Heavy double-edged steel broadsword delivering bone-crushing melee swings.',
      statBonusText: '+7 Melee Power',
      vocationAffinity: 'fighter',
      item: {
        item_id: 'tempered_broadsword',
        name: 'Tempered Broadsword',
        type: 'weapon',
        quantity: 1,
        stat_bonus: 7,
        icon: '🗡️',
      },
    },

    // Paladin Cards
    {
      id: 'card_holy_strike',
      name: 'Holy Warhammer Strike',
      rarity: 'common',
      icon: '🔨',
      description: 'Smite an adjacent monster with consecrated golden power for 18–26 holy damage.',
      statBonusText: '18–26 Holy Dmg (10 MP)',
      vocationAffinity: 'paladin',
      item: {
        item_id: 'spell_holy_strike',
        name: 'Holy Strike',
        type: 'spell',
        quantity: 1,
        stat_bonus: 22,
        manaCost: 10,
        cooldown: 1.2,
        icon: '🔨',
      },
    },
    {
      id: 'card_healing_prayer',
      name: 'Healing Prayer',
      rarity: 'common',
      icon: '✨',
      description: 'Channel sacred light to restore 35–50 Health points immediately.',
      statBonusText: 'Heal 35–50 HP (25 MP)',
      vocationAffinity: 'paladin',
      item: {
        item_id: 'spell_healing_prayer',
        name: 'Healing Prayer',
        type: 'spell',
        quantity: 1,
        stat_bonus: 42,
        manaCost: 25,
        cooldown: 6.0,
        icon: '💖',
      },
    },
    {
      id: 'card_holy_radiance',
      name: 'Holy Radiance',
      rarity: 'rare',
      icon: '☀️',
      description: 'Unleash a burst of sanctified radiance, damaging all surrounding undead monsters for 20–30 damage.',
      statBonusText: '20–30 Area Dmg (30 MP)',
      vocationAffinity: 'paladin',
      item: {
        item_id: 'spell_holy_radiance',
        name: 'Holy Radiance',
        type: 'spell',
        quantity: 1,
        stat_bonus: 25,
        manaCost: 30,
        cooldown: 8.0,
        icon: '☀️',
      },
    },
    {
      id: 'card_radiant_warhammer',
      name: 'Consecrated Warhammer',
      rarity: 'epic',
      icon: '⚒️',
      description: 'Heavy gilded maul blessed by the High Templars.',
      statBonusText: '+6 Holy Power, +3 Armor',
      vocationAffinity: 'paladin',
      item: {
        item_id: 'consecrated_warhammer',
        name: 'Consecrated Warhammer',
        type: 'weapon',
        quantity: 1,
        stat_bonus: 6,
        icon: '⚒️',
      },
    },

    // Universal Consumables, Armor, Relics & Tools
    {
      id: 'card_health_potion_x3',
      name: 'Health Potion Stash',
      rarity: 'common',
      icon: '🧪',
      description: 'A set of 3 crimson restorative draughts (restores +30 HP each).',
      statBonusText: '+30 HP x 3',
      item: {
        item_id: 'health_potion',
        name: 'Health Potion',
        type: 'consumable',
        quantity: 3,
        stat_bonus: 30,
        icon: '🧪',
      },
    },
    {
      id: 'card_mana_potion_x3',
      name: 'Mana Potion Stash',
      rarity: 'common',
      icon: '🔷',
      description: 'A set of 3 cobalt ether draughts (restores +40 Mana each).',
      statBonusText: '+40 MP x 3',
      item: {
        item_id: 'mana_potion',
        name: 'Mana Potion',
        type: 'consumable',
        quantity: 3,
        stat_bonus: 40,
        icon: '🔷',
      },
    },
    {
      id: 'card_wooden_torch_x3',
      name: 'Ever-Burning Torches',
      rarity: 'common',
      icon: '🔥',
      description: 'A bundle of 3 pitch-soaked dungeon torches illuminating 14 tiles when held.',
      statBonusText: '+14 Light Radius x 3',
      item: {
        item_id: 'torch',
        name: 'Wooden Torch',
        type: 'offhand',
        quantity: 3,
        stat_bonus: 14,
        icon: '🔥',
      },
    },
    {
      id: 'card_iron_buckler',
      name: 'Reinforced Buckler',
      rarity: 'common',
      icon: '🛡️',
      description: 'A sturdy iron-rimmed off-hand buckler absorbing blows.',
      statBonusText: '+4 Armor',
      item: {
        item_id: 'buckler',
        name: 'Reinforced Buckler',
        type: 'offhand',
        quantity: 1,
        stat_bonus: 4,
        icon: '🛡️',
      },
    },
    {
      id: 'card_plate_armor',
      name: 'Knight Plate Body',
      rarity: 'rare',
      icon: '🦺',
      description: 'Heavy interlocking steel cuirass protecting vital organs from lethal damage.',
      statBonusText: '+8 Armor',
      item: {
        item_id: 'plate_armor',
        name: 'Knight Plate Armor',
        type: 'armor',
        quantity: 1,
        stat_bonus: 8,
        icon: '🦺',
      },
    },
    {
      id: 'card_relic_luminous_amulet',
      name: 'Luminous Relic Amulet',
      rarity: 'epic',
      icon: '📿',
      description: 'Sacred luminescent charm boosting max health, mana, and ambient glow.',
      statBonusText: '+20 Max HP/MP',
      item: {
        item_id: 'relic_luminous_amulet',
        name: 'Luminous Amulet',
        type: 'relic',
        quantity: 1,
        stat_bonus: 20,
        icon: '📿',
      },
    },
    {
      id: 'card_relic_champions_crest',
      name: "Champion's Crest",
      rarity: 'legendary',
      icon: '👑',
      description: 'Ancient artifact of legend that enhances all combat damage by +20%.',
      statBonusText: '+20% Damage, +15 Max HP',
      item: {
        item_id: 'relic_champions_crest',
        name: "Champion's Crest",
        type: 'relic',
        quantity: 1,
        stat_bonus: 15,
        icon: '👑',
      },
    },
  ];

  static generateDraftOffer(vocation, level = 1) {
    const pool = [...FateGrantSystem.CARD_DATABASE];
    const alignedCards = pool.filter(c => c.vocationAffinity === vocation);
    const otherCards = pool.filter(c => !c.vocationAffinity || c.vocationAffinity !== vocation);

    FateGrantSystem.shuffle(alignedCards);
    FateGrantSystem.shuffle(otherCards);

    const chosenCards = [];

    if (level === 1) {
      const alignedCount = Math.min(2, alignedCards.length);
      for (let i = 0; i < alignedCount; i++) {
        chosenCards.push(alignedCards[i]);
      }
      const remainingPool = [...alignedCards.slice(alignedCount), ...otherCards];
      FateGrantSystem.shuffle(remainingPool);
      for (const card of remainingPool) {
        if (chosenCards.length >= 5) break;
        if (!chosenCards.some(c => c.id === card.id)) {
          chosenCards.push(card);
        }
      }
    } else {
      const allShuffled = [...pool];
      FateGrantSystem.shuffle(allShuffled);
      for (const card of allShuffled) {
        if (chosenCards.length >= 5) break;
        if (!chosenCards.some(c => c.id === card.id)) {
          chosenCards.push(card);
        }
      }
    }

    return {
      cards: chosenCards.slice(0, 5),
      requiredSelections: { min: 1, max: 2 },
    };
  }

  static applyDraftedCards(player, cards, gridMap) {
    const result = {
      addedToHotbar: [],
      addedToBackpack: [],
      droppedOnFloor: [],
    };

    for (const card of cards) {
      const itemToPlace = { ...card.item };

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

      // If drafting a bow weapon/spell, grant starter arrows if none exist
      if (itemToPlace.item_id.includes('bow')) {
        const hasArrows = player.action_bar?.some(s => s?.item_id === 'arrows') || player.backpack?.some(s => s?.item_id === 'arrows');
        if (!hasArrows && player.backpack) {
          const arrowItem = {
            item_id: 'arrows',
            name: 'Arrows',
            type: 'ammo',
            quantity: 20,
            stat_bonus: 0,
            icon: '🏹',
          };
          const emptyBp = player.backpack.findIndex(s => s === null);
          if (emptyBp !== -1) {
            player.backpack[emptyBp] = arrowItem;
            result.addedToBackpack.push('Starter Arrows (x20)');
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

// ============================================================================
// 8. GestureEngine
// ============================================================================

export class GestureEngine {
  constructor(onGesture, onChargeUpdate) {
    this.onGestureCallback = onGesture || (() => {});
    this.onChargeUpdateCallback = onChargeUpdate || (() => {});
    this.trackers = new Map();
    this.animationFrameId = null;

    for (let i = 0; i < CONFIG.ACTION_BAR_SLOTS; i++) {
      this.trackers.set(i, {
        isDown: false,
        pressTimestamp: 0,
        lastReleaseTimestamp: 0,
        chargeRatio: 0,
      });
    }

    this.startChargeLoop();
  }

  static keyToSlotIndex(key) {
    if (key >= '1' && key <= '9') {
      return parseInt(key, 10) - 1; // '1' -> 0, ..., '9' -> 8
    }
    if (key === '0') {
      return 9; // '0' -> 9
    }
    return null;
  }

  static slotIndexToHotkey(slotIndex) {
    if (slotIndex >= 0 && slotIndex <= 8) {
      return `${slotIndex + 1}`;
    }
    if (slotIndex === 9) {
      return '0';
    }
    return '';
  }

  handleInputDown(slotIndex) {
    const tracker = this.trackers.get(slotIndex);
    if (!tracker) return;

    if (tracker.isDown) return; // Prevent key repeat oscillation

    const now = performance.now();
    tracker.isDown = true;
    tracker.pressTimestamp = now;
    tracker.chargeRatio = 0;
  }

  handleInputUp(slotIndex) {
    const tracker = this.trackers.get(slotIndex);
    if (!tracker || !tracker.isDown) return;

    const now = performance.now();
    const duration = now - tracker.pressTimestamp;
    tracker.isDown = false;
    const previousRelease = tracker.lastReleaseTimestamp;
    tracker.lastReleaseTimestamp = now;

    // Reset charge visual
    tracker.chargeRatio = 0;
    this.onChargeUpdateCallback(slotIndex, 0);

    // Double-tap check: if tap duration < TAP_MAX_MS and previousRelease was within DOUBLE_TAP_MAX_MS
    if (duration < CONFIG.TAP_MAX_MS && previousRelease > 0 && (now - previousRelease) <= CONFIG.DOUBLE_TAP_MAX_MS) {
      this.onGestureCallback({
        slotIndex,
        gesture: 'double_tap',
        chargeDurationMs: duration,
        chargeRatio: 1.0,
      });
      tracker.lastReleaseTimestamp = 0;
      return;
    }

    // Hold / Charge check: held >= HOLD_MIN_MS
    if (duration >= CONFIG.HOLD_MIN_MS) {
      const chargeRatio = Math.min(
        1.0,
        Math.max(0.1, (duration - CONFIG.HOLD_MIN_MS) / (CONFIG.HOLD_MAX_MS - CONFIG.HOLD_MIN_MS))
      );
      this.onGestureCallback({
        slotIndex,
        gesture: 'hold',
        chargeDurationMs: duration,
        chargeRatio,
      });
      return;
    }

    // Standard Tap
    this.onGestureCallback({
      slotIndex,
      gesture: 'tap',
      chargeDurationMs: duration,
      chargeRatio: 0,
    });
  }

  startChargeLoop() {
    if (typeof requestAnimationFrame === 'undefined') return;

    const update = () => {
      const now = performance.now();
      for (const [slotIndex, tracker] of this.trackers.entries()) {
        if (tracker.isDown) {
          const duration = now - tracker.pressTimestamp;
          if (duration >= CONFIG.HOLD_MIN_MS) {
            const ratio = Math.min(
              1.0,
              (duration - CONFIG.HOLD_MIN_MS) / (CONFIG.HOLD_MAX_MS - CONFIG.HOLD_MIN_MS)
            );
            if (Math.abs(tracker.chargeRatio - ratio) > 0.01) {
              tracker.chargeRatio = ratio;
              this.onChargeUpdateCallback(slotIndex, ratio);
            }
          }
        }
      }
      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  destroy() {
    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
