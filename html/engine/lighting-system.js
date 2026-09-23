/**
 * Lokarta: Come Into The Light - Lighting & Dynamic FOV Subsystem
 */

import { CONFIG } from './config.js';

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
   * @param {import('./grid-map.js').GridMap} gridMap
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
   * @param {import('./grid-map.js').GridMap} gridMap
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
   * @param {import('./grid-map.js').GridMap} gridMap
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
