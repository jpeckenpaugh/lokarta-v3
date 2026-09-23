/**
 * Lokarta: Come Into The Light - Combat & Ability Subsystem
 */

import { CONFIG } from './config.js';
import { LightingSystem } from './lighting-system.js';
import { ABILITIES_CATALOG, ITEMS_CATALOG, MONSTERS_CATALOG } from '../data/index.js';

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
    const affinity = item.vocationAffinity || ITEMS_CATALOG[item.item_id]?.vocationAffinity;
    if (affinity) return affinity === vocation;

    const itemId = item.item_id || '';
    if (vocation === 'magician') return itemId.includes('wand') || itemId.includes('spark') || itemId.includes('beam') || itemId.includes('scepter') || item.type === 'spell';
    if (vocation === 'archer') return itemId.includes('bow') || itemId.includes('arrow') || itemId.includes('shot');
    if (vocation === 'fighter') return itemId.includes('sword') || itemId.includes('slash') || itemId.includes('cleave') || itemId.includes('broadsword') || itemId.includes('fortify');
    if (vocation === 'paladin') return itemId.includes('warhammer') || itemId.includes('holy') || itemId.includes('prayer') || itemId.includes('radiance') || itemId.includes('hammer');
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

    const abilitySpec = ABILITIES_CATALOG.magician_spark;
    const projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      abilityId: 'magician_spark',
      type: 'wand_spark',
      sourceX: player.x,
      sourceY: player.y,
      targetX: target.x,
      targetY: target.y,
      currentX: player.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      currentY: player.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      durationMs: 250,
      elapsedMs: 0,
      color: abilitySpec?.visual?.color || '#44ccff',
      visual: abilitySpec?.visual || null,
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
