/**
 * Lokarta: Come Into The Light - Engine Configuration & Constants
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
