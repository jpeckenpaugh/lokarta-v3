/**
 * Lokarta: Come Into The Light - Progression & Leveling Subsystem
 */

import { CONFIG } from './config.js';

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
