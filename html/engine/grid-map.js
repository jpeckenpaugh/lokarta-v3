/**
 * Lokarta: Come Into The Light - Dungeon Grid Map Subsystem
 */

import { CONFIG, TILE_TYPES } from './config.js';

const CODE_TO_TILE_TYPE = {
  1: TILE_TYPES.WALL,
  2: TILE_TYPES.STAIRS,
  3: TILE_TYPES.DOOR,
  4: TILE_TYPES.GATED_DOOR,
};

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
        const tileType = CODE_TO_TILE_TYPE[typeCode] || TILE_TYPES.FLOOR;

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

  isGatedDoor(x, y) {
    if (!this.isInBounds(x, y)) return false;
    return this.tiles[y][x].type === TILE_TYPES.GATED_DOOR;
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
