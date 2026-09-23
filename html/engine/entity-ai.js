/**
 * Lokarta: Come Into The Light - Entity AI & Pathfinding Subsystem
 */

import { CONFIG } from './config.js';
import { LightingSystem } from './lighting-system.js';

export class EntityAI {
  /**
   * Updates all active monsters in the dungeon on a game simulation tick.
   * @param {Array<object>} monsters
   * @param {object} player
   * @param {import('./grid-map.js').GridMap} gridMap
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
