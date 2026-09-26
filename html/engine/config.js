/**
 * Lokarta: Come Into The Light - Engine Configuration & Constants
 */

import { VOCATIONS_CATALOG, MONSTERS_CATALOG, ABILITIES_CATALOG } from '../data/index.js';

export const TILE_TYPES = {
  FLOOR: 0,
  WALL: 1,
  STAIRS: 2,
  DOOR: 3,
};

export const CONFIG = {
  GRID_SIZE: 64, // pixels per tile
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
  TORCH_LIGHT_RADIUS: 12,
  LIGHT_SPELL_RADIUS: ABILITIES_CATALOG.magician_light.lightRadius || 13,
  LIGHT_SPELL_DURATION_SEC: ABILITIES_CATALOG.magician_light.durationSec || 30,
  AMBIENT_LIGHT_RADIUS: 4,

  // Abilities & Combat Base Values (Driven by ABILITIES_CATALOG)
  MAGICIAN_SPARK_DAMAGE_MIN: ABILITIES_CATALOG.magician_spark.damageMin,
  MAGICIAN_SPARK_DAMAGE_MAX: ABILITIES_CATALOG.magician_spark.damageMax,
  MAGICIAN_SPARK_RANGE: ABILITIES_CATALOG.magician_spark.range,
  MAGICIAN_SPARK_MANA_COST: ABILITIES_CATALOG.magician_spark.manaCost,
  MAGICIAN_SPARK_COOLDOWN_SEC: ABILITIES_CATALOG.magician_spark.cooldownSec,

  MAGICIAN_LIGHT_MANA_COST: ABILITIES_CATALOG.magician_light.manaCost,
  MAGICIAN_LIGHT_COOLDOWN_SEC: ABILITIES_CATALOG.magician_light.cooldownSec,

  MAGICIAN_BEAM_MANA_COST: ABILITIES_CATALOG.magician_beam.manaCost,
  MAGICIAN_BEAM_DAMAGE_MIN: ABILITIES_CATALOG.magician_beam.damageMin,
  MAGICIAN_BEAM_DAMAGE_MAX: ABILITIES_CATALOG.magician_beam.damageMax,
  MAGICIAN_BEAM_RANGE: ABILITIES_CATALOG.magician_beam.range,
  MAGICIAN_BEAM_COOLDOWN_SEC: ABILITIES_CATALOG.magician_beam.cooldownSec,

  ARCHER_BOW_DAMAGE_MIN: ABILITIES_CATALOG.archer_bow_shot.damageMin,
  ARCHER_BOW_DAMAGE_MAX: ABILITIES_CATALOG.archer_bow_shot.damageMax,
  ARCHER_BOW_RANGE: ABILITIES_CATALOG.archer_bow_shot.range,
  ARCHER_BOW_COOLDOWN_SEC: ABILITIES_CATALOG.archer_bow_shot.cooldownSec,

  ARCHER_POWER_SHOT_DAMAGE_MIN: ABILITIES_CATALOG.archer_power_shot.damageMin,
  ARCHER_POWER_SHOT_DAMAGE_MAX: ABILITIES_CATALOG.archer_power_shot.damageMax,
  ARCHER_POWER_SHOT_RANGE: ABILITIES_CATALOG.archer_power_shot.range,
  ARCHER_POWER_SHOT_COOLDOWN_SEC: ABILITIES_CATALOG.archer_power_shot.cooldownSec,

  FIGHTER_SLASH_DAMAGE_MIN: ABILITIES_CATALOG.fighter_slash.damageMin,
  FIGHTER_SLASH_DAMAGE_MAX: ABILITIES_CATALOG.fighter_slash.damageMax,
  FIGHTER_SLASH_COOLDOWN_SEC: ABILITIES_CATALOG.fighter_slash.cooldownSec,

  FIGHTER_CLEAVE_MANA_COST: ABILITIES_CATALOG.fighter_cleave.manaCost,
  FIGHTER_CLEAVE_DAMAGE_MIN: ABILITIES_CATALOG.fighter_cleave.damageMin,
  FIGHTER_CLEAVE_DAMAGE_MAX: ABILITIES_CATALOG.fighter_cleave.damageMax,
  FIGHTER_CLEAVE_COOLDOWN_SEC: ABILITIES_CATALOG.fighter_cleave.cooldownSec,

  PALADIN_HOLY_STRIKE_MANA_COST: ABILITIES_CATALOG.paladin_holy_strike.manaCost,
  PALADIN_HOLY_STRIKE_DAMAGE_MIN: ABILITIES_CATALOG.paladin_holy_strike.damageMin,
  PALADIN_HOLY_STRIKE_DAMAGE_MAX: ABILITIES_CATALOG.paladin_holy_strike.damageMax,
  PALADIN_HOLY_STRIKE_COOLDOWN_SEC: ABILITIES_CATALOG.paladin_holy_strike.cooldownSec,

  PALADIN_HEAL_MANA_COST: ABILITIES_CATALOG.paladin_heal.manaCost,
  PALADIN_HEAL_MIN: ABILITIES_CATALOG.paladin_heal.healMin,
  PALADIN_HEAL_MAX: ABILITIES_CATALOG.paladin_heal.healMax,
  PALADIN_HEAL_COOLDOWN_SEC: ABILITIES_CATALOG.paladin_heal.cooldownSec,

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
    // LOK-12 gear-stat tracking: applied hpBonus/manaBonus totals across the
    // paperdoll. Fresh characters start at 0 so the first equip applies the
    // full bonus; legacy saves without these keys are treated as already baked.
    _gearBonusMaxHp: 0,
    _gearBonusMaxMana: 0,
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
