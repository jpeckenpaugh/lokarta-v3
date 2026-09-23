/**
 * Lokarta: Come Into The Light - Engine Configuration & Constants
 */

import { VOCATIONS_CATALOG, MONSTERS_CATALOG } from '../data/index.js';

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
  RAT_MOVE_CADENCE_SEC: MONSTERS_CATALOG.giant_rat.moveCadence,
  RAT_ATTACK_CADENCE_SEC: MONSTERS_CATALOG.giant_rat.attackCadence,
  RAT_DAMAGE_MIN: MONSTERS_CATALOG.giant_rat.damageMin,
  RAT_DAMAGE_MAX: MONSTERS_CATALOG.giant_rat.damageMax,

  SKELETON_MOVE_CADENCE_SEC: MONSTERS_CATALOG.crypt_skeleton.moveCadence,
  SKELETON_ATTACK_CADENCE_SEC: MONSTERS_CATALOG.crypt_skeleton.attackCadence,
  SKELETON_DAMAGE_MIN: MONSTERS_CATALOG.crypt_skeleton.damageMin,
  SKELETON_DAMAGE_MAX: MONSTERS_CATALOG.crypt_skeleton.damageMax,

  CULTIST_MOVE_CADENCE_SEC: MONSTERS_CATALOG.shadow_cultist.moveCadence,
  CULTIST_ATTACK_CADENCE_SEC: MONSTERS_CATALOG.shadow_cultist.attackCadence,
  CULTIST_DAMAGE_MIN: MONSTERS_CATALOG.shadow_cultist.damageMin,
  CULTIST_DAMAGE_MAX: MONSTERS_CATALOG.shadow_cultist.damageMax,
  CULTIST_STANDOFF_MIN: MONSTERS_CATALOG.shadow_cultist.standoffMin,
  CULTIST_STANDOFF_MAX: MONSTERS_CATALOG.shadow_cultist.standoffMax,

  BOSS_MOVE_CADENCE_SEC: MONSTERS_CATALOG.abyssal_overlord.moveCadence,
  BOSS_ATTACK_CADENCE_SEC: MONSTERS_CATALOG.abyssal_overlord.attackCadence,
  BOSS_DAMAGE_MIN: MONSTERS_CATALOG.abyssal_overlord.damageMin,
  BOSS_DAMAGE_MAX: MONSTERS_CATALOG.abyssal_overlord.damageMax,

  // Consumables
  HEALTH_POTION_HEAL: 30,
  MANA_POTION_RESTORE: 40,
};

function buildArchetype(vocKey) {
  const data = VOCATIONS_CATALOG[vocKey] || VOCATIONS_CATALOG.magician;
  return {
    id: data.id,
    vocation: data.vocation,
    hp: data.hp,
    max_hp: data.hp,
    mana: data.mana,
    max_mana: data.mana,
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
  };
}

export const DEFAULT_ARCHETYPES = {
  magician: buildArchetype('magician'),
  archer: buildArchetype('archer'),
  fighter: buildArchetype('fighter'),
  paladin: buildArchetype('paladin'),
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
