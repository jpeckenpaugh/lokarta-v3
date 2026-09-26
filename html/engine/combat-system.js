/**
 * Lokarta: Come Into The Light - Combat & Ability Subsystem
 */

import { CONFIG } from './config.js';
import { LightingSystem } from './lighting-system.js';
import { ABILITIES_CATALOG, MONSTERS_CATALOG } from '../data/index.js';

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
  static executeWandSpark(player, target, gridMap, item = null) {
    if (player.cooldowns?.wand_spark > 0) {
      return { success: false, message: 'Spark Wand is on cooldown.' };
    }

    const manaCost = (item && typeof item.manaCost === 'number') ? item.manaCost : CONFIG.MAGICIAN_SPARK_MANA_COST;

    if (player.mana < manaCost) {
      return { success: false, message: 'Not enough Mana to use Spark Wand.' };
    }

    let dirX = 0;
    let dirY = 0;

    if (target) {
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dirX = dx / len;
        dirY = dy / len;
      }
    }

    if (dirX === 0 && dirY === 0) {
      const facingVectors = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };
      const vec = facingVectors[player.facing] || facingVectors.right;
      dirX = vec.x;
      dirY = vec.y;
    }

    player.mana -= manaCost;
    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.wand_spark = CONFIG.MAGICIAN_SPARK_COOLDOWN_SEC;

    const mult = player.skillBoosts?.damageMultiplier || 1.0;
    const baseDmg = (item && typeof item.damage === 'number') ? item.damage : CombatSystem.randomBetween(CONFIG.MAGICIAN_SPARK_DAMAGE_MIN, CONFIG.MAGICIAN_SPARK_DAMAGE_MAX);
    const damage = Math.round(baseDmg * mult);

    const abilitySpec = ABILITIES_CATALOG.magician_spark;
    const speedTilesPerSec = abilitySpec?.visual?.speedTilesPerSec || 10.0;
    const speedPxPerSec = speedTilesPerSec * CONFIG.GRID_SIZE;

    const startPxX = player.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
    const startPxY = player.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;

    const projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      abilityId: 'magician_spark',
      type: 'wand_spark',
      sourceX: player.x,
      sourceY: player.y,
      currentPxX: startPxX,
      currentPxY: startPxY,
      dirX,
      dirY,
      speedPxPerSec,
      damagePayload: {
        damage,
        vocation: player.vocation,
        casterId: player.id || 'player',
      },
      color: abilitySpec?.visual?.color || '#44ccff',
      visual: abilitySpec?.visual || null,
      active: true,
    };

    return {
      success: true,
      message: 'You cast Spark Wand!',
      damageDealt: damage,
      projectiles: [projectile],
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
  static executeEnergyBeam(player, facing = 'right', gridMap, monsters = [], item = null) {
    if (player.cooldowns?.energy_beam > 0) {
      return { success: false, message: 'Beam Staff is on cooldown.' };
    }

    const manaCost = (item && typeof item.manaCost === 'number') ? item.manaCost : CONFIG.MAGICIAN_BEAM_MANA_COST;
    const maxSteps = (item && typeof item.range === 'number') ? item.range : 4;

    if (player.mana < manaCost) {
      return { success: false, message: 'Not enough Mana to cast Beam Staff.' };
    }

    player.mana -= manaCost;
    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns.energy_beam = CONFIG.MAGICIAN_BEAM_COOLDOWN_SEC;

    const mult = player.skillBoosts?.damageMultiplier || 1.0;

    const fVecs = {
      up: { fX: 0, fY: -1, pX: 1, pY: 0 },
      down: { fX: 0, fY: 1, pX: -1, pY: 0 },
      left: { fX: -1, fY: 0, pX: 0, pY: -1 },
      right: { fX: 1, fY: 0, pX: 0, pY: 1 },
    };
    const { fX, fY, pX, pY } = fVecs[facing] || fVecs.right;

    // Step offsets relative to facing direction vector:
    // Solid wave front generation for step 0..maxSteps-1 (all offsets from -s to +s)
    const stepOffsets = [];
    for (let s = 0; s < maxSteps; s++) {
      const offs = [];
      for (let o = -s; o <= s; o++) {
        offs.push(o);
      }
      stepOffsets.push(offs);
    }

    const waves = [];
    const blockedOffsets = new Set();

    for (let s = 0; s < maxSteps; s++) {
      const dist = s + 1;
      const offsets = stepOffsets[s];
      const waveTiles = [];

      for (const off of offsets) {
        if (blockedOffsets.has(off)) continue;

        const tx = player.x + (fX * dist) + (pX * off);
        const ty = player.y + (fY * dist) + (pY * off);

        if (!gridMap.isInBounds(tx, ty)) {
          blockedOffsets.add(off);
          continue;
        }

        if (gridMap.isWall(tx, ty)) {
          blockedOffsets.add(off);
          waveTiles.push({ x: tx, y: ty, isWall: true });
          continue;
        }

        waveTiles.push({ x: tx, y: ty, isWall: false });
      }

      waves.push({
        step: s,
        delayMs: s * 100, // 0.1s step interval
        tiles: waveTiles,
      });
    }

    const abilitySpec = ABILITIES_CATALOG.magician_beam;
    const rawStepDamage = abilitySpec?.visual?.stepDamage || [20, 15, 10, 5];
    const bonusDmg = item?.stepDamageBonus || 0;

    // Build step damage array for maxSteps
    const baseStepDamage = [];
    for (let s = 0; s < maxSteps; s++) {
      const raw = (s < rawStepDamage.length ? rawStepDamage[s] : Math.max(5, rawStepDamage[rawStepDamage.length - 1])) + bonusDmg;
      baseStepDamage.push(raw);
    }

    const stepVolumes = [];
    for (let s = 0; s < maxSteps; s++) {
      const vol = Math.max(0.1, 1.0 - s * 0.2);
      stepVolumes.push(vol);
    }

    // Compute step damage list scaled by vocation mastery
    const stepDamage = baseStepDamage.map(base => Math.round(base * mult));

    const projectile = {
      id: `proj_beam_${Date.now()}_${Math.random()}`,
      abilityId: 'magician_beam',
      type: 'energy_beam',
      sourceX: player.x,
      sourceY: player.y,
      facing,
      fX,
      fY,
      waves,
      currentWaveIndex: -1,
      elapsedMs: 0,
      stepIntervalMs: 100,
      hitMonsterIds: [],
      stepDamage,
      stepVolumes,
      damagePayload: {
        damage: stepDamage[0],
        vocation: player.vocation,
        casterId: player.id || 'player',
      },
      visual: abilitySpec?.visual || null,
      color: abilitySpec?.visual?.color || '#ff66dd',
      active: true,
    };

    return {
      success: true,
      message: 'You unleashed Arcane Beam!',
      damageDealt: stepDamage[0],
      projectiles: [projectile],
    };
  }

  /**
   * Executes Archer Bow Shot ability.
   */
  static executeBowShot(player, target, gridMap) {
    if (player.cooldowns?.bow_shot > 0) {
      return { success: false, message: 'Bow Shot is on cooldown.' };
    }

    const mult = player.skillBoosts?.damageMultiplier || 1.0;

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
    let message = `You fired an arrow at ${target.name} for ${damage} damage.`;

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

    const mult = player.skillBoosts?.damageMultiplier || 1.0;

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
    let message = `Power Shot strikes ${target.name} for ${damage} heavy damage!`;

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

    const mult = player.skillBoosts?.damageMultiplier || 1.0;
    const baseDmg = CombatSystem.randomBetween(CONFIG.FIGHTER_SLASH_DAMAGE_MIN, CONFIG.FIGHTER_SLASH_DAMAGE_MAX);
    const damage = Math.round(baseDmg * mult);
    target.hp -= damage;

    let defeatedMonsterId;
    let droppedLoot;
    let message = `You slashed ${target.name} for ${damage} physical damage.`;

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

    const mult = player.skillBoosts?.damageMultiplier || 1.0;
    const baseDmg = CombatSystem.randomBetween(CONFIG.PALADIN_HOLY_STRIKE_DAMAGE_MIN, CONFIG.PALADIN_HOLY_STRIKE_DAMAGE_MAX);
    const damage = Math.round(baseDmg * mult);
    target.hp -= damage;

    let defeatedMonsterId;
    let droppedLoot;
    let message = `Holy Strike smites ${target.name} for ${damage} holy damage.`;

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

    const mult = player.skillBoosts?.damageMultiplier || 1.0;
    const baseHeal = CombatSystem.randomBetween(CONFIG.PALADIN_HEAL_MIN, CONFIG.PALADIN_HEAL_MAX);
    const healAmount = Math.round(baseHeal * mult);
    const restored = Math.min(healAmount, player.max_hp - player.hp);
    player.hp = Math.min(player.max_hp, player.hp + healAmount);

    return {
      success: true,
      message: `Healing Prayer channeled! Restored +${restored} HP (${player.hp}/${player.max_hp}).`,
      healAmount: restored,
    };
  }

  /**
   * Generates loot dropped upon monster defeat based on MONSTERS_CATALOG lootTable rules.
   */
  static generateMonsterLoot(monster) {
    const loot = [];
    const monsterDef = MONSTERS_CATALOG[monster.type];
    if (!monsterDef || !monsterDef.lootTable) {
      return loot;
    }

    const roll = Math.random();
    for (const dropEntry of monsterDef.lootTable) {
      if (dropEntry.always || (roll >= dropEntry.minRoll && roll < dropEntry.maxRoll)) {
        loot.push({
          item_id: dropEntry.item_id,
          name: dropEntry.name,
          type: dropEntry.type,
          quantity: dropEntry.quantity,
          stat_bonus: dropEntry.stat_bonus,
        });
      }
    }

    return loot;
  }
}
