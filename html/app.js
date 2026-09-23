/**
 * Lokarta: Come Into The Light - Main Application & Game Controller
 * Connects GameClient, GridMap, LightingSystem, CombatSystem, EntityAI,
 * InventorySystem, ProgressionSystem, FateGrantSystem, GestureEngine, and AudioSystem.
 */

import { GameClient } from './game-client.js';
import {
  CONFIG,
  TILE_TYPES,
  GridMap,
  LightingSystem,
  ProgressionSystem,
  CombatSystem,
  EntityAI,
  InventorySystem,
  FateGrantSystem,
  GestureEngine,
  createPlayer,
} from './engine.js';
import { AudioSystem, soundFX } from './audio.js';

// ============================================================================
// Sprite & Canvas Rendering System
// ============================================================================

class SpriteRenderer {
  static drawTile(ctx, type, screenX, screenY, size = CONFIG.GRID_SIZE) {
    if (type === TILE_TYPES.WALL) {
      ctx.fillStyle = '#2a2f3b';
      ctx.fillRect(screenX, screenY, size, size);

      ctx.fillStyle = '#444d61';
      ctx.fillRect(screenX, screenY, size, 4);

      ctx.strokeStyle = '#1a1d24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + size / 2);
      ctx.lineTo(screenX + size, screenY + size / 2);
      ctx.moveTo(screenX + size / 2, screenY);
      ctx.lineTo(screenX + size / 2, screenY + size / 2);
      ctx.moveTo(screenX + size / 4, screenY + size / 2);
      ctx.lineTo(screenX + size / 4, screenY + size);
      ctx.moveTo(screenX + (3 * size) / 4, screenY + size / 2);
      ctx.lineTo(screenX + (3 * size) / 4, screenY + size);
      ctx.stroke();

      ctx.strokeStyle = '#0d0f14';
      ctx.strokeRect(screenX + 0.5, screenY + 0.5, size - 1, size - 1);
    } else if (type === TILE_TYPES.STAIRS) {
      ctx.fillStyle = '#152b3c';
      ctx.fillRect(screenX, screenY, size, size);

      for (let i = 0; i < 4; i++) {
        const inset = i * 3;
        ctx.fillStyle = i % 2 === 0 ? '#3878a8' : '#254e70';
        ctx.fillRect(screenX + inset, screenY + inset, size - inset * 2, size - inset * 2);
      }

      ctx.fillStyle = '#88eeff';
      ctx.beginPath();
      ctx.arc(screenX + size / 2, screenY + size / 2, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#66ccff';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
    } else if (type === TILE_TYPES.DOOR) {
      ctx.fillStyle = '#4a2f1b';
      ctx.fillRect(screenX, screenY, size, size);
      ctx.strokeStyle = '#2d1c10';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
    } else {
      ctx.fillStyle = '#1a1c23';
      ctx.fillRect(screenX, screenY, size, size);

      ctx.strokeStyle = '#12141a';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, size, size);

      ctx.fillStyle = '#222530';
      ctx.fillRect(screenX + 4, screenY + 4, 6, 6);
      ctx.fillRect(screenX + size - 10, screenY + size - 10, 6, 6);
    }
  }

  static drawItem(ctx, item, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const cx = screenX + size / 2;
    const cy = screenY + size / 2;

    if (item.item_id === 'health_potion') {
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1faee';
      ctx.fillRect(cx - 3, cy - 8, 6, 4);
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(cx - 4, cy - 10, 8, 3);
    } else if (item.item_id === 'mana_potion') {
      ctx.fillStyle = '#3a86ff';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1faee';
      ctx.fillRect(cx - 3, cy - 8, 6, 4);
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(cx - 4, cy - 10, 8, 3);
    } else if (item.item_id === 'torch') {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(cx - 3, cy - 4, 6, 14);
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4400';
      ctx.beginPath();
      ctx.arc(cx, cy - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.item_id === 'arrows') {
      ctx.strokeStyle = '#d4a373';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 6);
      ctx.lineTo(cx + 6, cy - 6);
      ctx.moveTo(cx - 4, cy + 8);
      ctx.lineTo(cx + 8, cy - 4);
      ctx.stroke();
      ctx.fillStyle = '#e9d8a6';
      ctx.fillRect(cx - 8, cy + 5, 4, 4);
    } else if (item.type === 'weapon') {
      if (item.item_id.includes('bow')) {
        ctx.strokeStyle = '#c68b59';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 8);
        ctx.lineTo(cx + 5, cy + 8);
        ctx.stroke();
      } else if (item.item_id.includes('warhammer') || item.item_id.includes('hammer')) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cx - 6, cy - 8, 12, 6);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cx - 2, cy - 2, 4, 12);
      } else {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy + 6);
        ctx.lineTo(cx + 6, cy - 6);
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cx - 8, cy + 4, 4, 4);
      }
    } else if (item.type === 'spell') {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#e0a96d';
      ctx.fillRect(cx - 5, cy - 5, 10, 10);
    }

    if (item.quantity > 1) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(screenX + size - 14, screenY + size - 12, 14, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.quantity}`, screenX + size - 2, screenY + size - 3);
    }
  }

  static drawPlayer(ctx, player, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const cx = screenX + size / 2;
    const cy = screenY + size / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size / 3, size / 3, size / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const voc = player.vocation || 'magician';

    if (voc === 'magician') {
      // Magician Robe
      ctx.fillStyle = '#5c2d91';
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 12);
      ctx.lineTo(cx + 8, cy + 12);
      ctx.lineTo(cx + 5, cy - 4);
      ctx.lineTo(cx - 5, cy - 4);
      ctx.closePath();
      ctx.fill();

      // Trim & Hood
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#7a3cb8';
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2);
      ctx.fill();

      SpriteRenderer.drawFacingEyes(ctx, cx, cy - 6, player.facing, '#44ccff');
    } else if (voc === 'archer') {
      // Archer Tunic
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy + 12);
      ctx.lineTo(cx + 7, cy + 12);
      ctx.lineTo(cx + 6, cy - 4);
      ctx.lineTo(cx - 6, cy - 4);
      ctx.closePath();
      ctx.fill();

      // Cap
      ctx.fillStyle = '#1b4332';
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2);
      ctx.fill();

      SpriteRenderer.drawFacingEyes(ctx, cx, cy - 6, player.facing, '#e9d8a6');
    } else if (voc === 'fighter') {
      // Fighter Steel Armor
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 12);
      ctx.lineTo(cx + 8, cy + 12);
      ctx.lineTo(cx + 7, cy - 4);
      ctx.lineTo(cx - 7, cy - 4);
      ctx.closePath();
      ctx.fill();

      // Helmet
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 7, 0, Math.PI * 2);
      ctx.fill();

      SpriteRenderer.drawFacingEyes(ctx, cx, cy - 6, player.facing, '#f87171');
    } else if (voc === 'paladin') {
      // Paladin Golden Plate
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 12);
      ctx.lineTo(cx + 8, cy + 12);
      ctx.lineTo(cx + 7, cy - 4);
      ctx.lineTo(cx - 7, cy - 4);
      ctx.closePath();
      ctx.fill();

      // Sacred Halo & Greathelm
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 14, 6, 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 7, 0, Math.PI * 2);
      ctx.fill();

      SpriteRenderer.drawFacingEyes(ctx, cx, cy - 6, player.facing, '#38bdf8');
    }
  }

  static drawMonster(ctx, monster, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const cx = screenX + size / 2;
    const cy = screenY + size / 2;

    if (monster.type === 'giant_rat') {
      ctx.fillStyle = '#5a3d28';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.arc(cx + 4, cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (monster.type === 'crypt_skeleton') {
      ctx.fillStyle = '#dcdde1';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#dcdde1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 1);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 4, 1, 0, Math.PI * 2);
      ctx.arc(cx + 2, cy - 4, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (monster.type === 'shadow_cultist' || monster.type === 'elite_cultist') {
      ctx.fillStyle = monster.type === 'elite_cultist' ? '#3b0764' : '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy + 12);
      ctx.lineTo(cx + 7, cy + 12);
      ctx.lineTo(cx + 4, cy - 4);
      ctx.lineTo(cx - 4, cy - 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = monster.type === 'elite_cultist' ? '#6b21a8' : '#312e81';
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 6, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 2, cy - 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (monster.type === 'abyssal_overlord' || monster.isBoss) {
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 12);
      ctx.lineTo(cx - 12, cy - 18);
      ctx.moveTo(cx + 8, cy - 12);
      ctx.lineTo(cx + 12, cy - 18);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 4, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 4, cy - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health Bar
    if (monster.hp < monster.max_hp) {
      const barW = 24;
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy - 16;
      const pct = Math.max(0, monster.hp / monster.max_hp);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barW * pct, barH);
    }
  }

  static drawFacingEyes(ctx, headX, headY, facing, eyeColor = '#44ccff') {
    ctx.fillStyle = eyeColor;
    let ox = 0;
    let oy = 0;
    if (facing === 'up') oy = -2;
    if (facing === 'down') oy = 2;
    if (facing === 'left') ox = -2;
    if (facing === 'right') ox = 2;

    ctx.beginPath();
    ctx.arc(headX + ox - 2, headY + oy, 1.2, 0, Math.PI * 2);
    ctx.arc(headX + ox + 2, headY + oy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// Canvas Viewport Renderer
// ============================================================================

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cameraX = 0;
    this.cameraY = 0;
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
  }

  updateCamera(player, width, height) {
    const targetX = player.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - width / 2;
    const targetY = player.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - height / 2;
    this.cameraX = Math.round(targetX);
    this.cameraY = Math.round(targetY);
  }

  render(gridMap, player, monsters, ambientLights, projectiles, floatingTexts, selectedMonsterId) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    this.updateCamera(player, width, height);

    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, width, height);

    const startTileX = Math.max(0, Math.floor(this.cameraX / CONFIG.GRID_SIZE));
    const endTileX = Math.min(gridMap.width - 1, Math.ceil((this.cameraX + width) / CONFIG.GRID_SIZE));
    const startTileY = Math.max(0, Math.floor(this.cameraY / CONFIG.GRID_SIZE));
    const endTileY = Math.min(gridMap.height - 1, Math.ceil((this.cameraY + height) / CONFIG.GRID_SIZE));

    // 1. Tiles Layer
    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        const tile = gridMap.tiles[y][x];
        const screenX = x * CONFIG.GRID_SIZE - this.cameraX;
        const screenY = y * CONFIG.GRID_SIZE - this.cameraY;
        SpriteRenderer.drawTile(ctx, tile.type, screenX, screenY);
      }
    }

    // 2. Ground Items Layer
    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        const tile = gridMap.tiles[y][x];
        if (tile.items.length > 0) {
          const screenX = x * CONFIG.GRID_SIZE - this.cameraX;
          const screenY = y * CONFIG.GRID_SIZE - this.cameraY;
          const topItem = tile.items[tile.items.length - 1];
          SpriteRenderer.drawItem(ctx, topItem, screenX, screenY);
        }
      }
    }

    // 3. Monsters Layer
    for (const monster of monsters) {
      if (monster.visible && monster.hp > 0) {
        const screenX = monster.x * CONFIG.GRID_SIZE - this.cameraX;
        const screenY = monster.y * CONFIG.GRID_SIZE - this.cameraY;
        SpriteRenderer.drawMonster(ctx, monster, screenX, screenY);

        if (selectedMonsterId === monster.id) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            screenX + CONFIG.GRID_SIZE / 2,
            screenY + CONFIG.GRID_SIZE / 2,
            CONFIG.GRID_SIZE / 2 + 3,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      }
    }

    // 4. Player Layer
    const playerScreenX = player.x * CONFIG.GRID_SIZE - this.cameraX;
    const playerScreenY = player.y * CONFIG.GRID_SIZE - this.cameraY;
    SpriteRenderer.drawPlayer(ctx, player, playerScreenX, playerScreenY);

    // 5. Projectiles
    this.renderProjectiles(ctx, projectiles);

    // 6. Dynamic Continuous Radial Darkness & Lighting
    this.renderLightMask(ctx, gridMap, player, ambientLights, width, height);

    // 7. Floating Combat Damage & XP Numbers
    this.renderFloatingTexts(ctx, floatingTexts);
  }

  renderProjectiles(ctx, projectiles) {
    for (const p of projectiles) {
      if (p.type === 'energy_beam' && p.piercingTiles) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 170, 0.4)';
        ctx.strokeStyle = '#ff66dd';
        ctx.lineWidth = 3;

        for (const tile of p.piercingTiles) {
          const sx = tile.x * CONFIG.GRID_SIZE - this.cameraX;
          const sy = tile.y * CONFIG.GRID_SIZE - this.cameraY;
          ctx.fillRect(sx, sy, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
          ctx.strokeRect(sx + 2, sy + 2, CONFIG.GRID_SIZE - 4, CONFIG.GRID_SIZE - 4);
        }
        ctx.restore();
      } else {
        const progress = Math.min(1.0, p.elapsedMs / p.durationMs);
        const startPixelX = p.sourceX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
        const startPixelY = p.sourceY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;
        const targetPixelX = p.targetX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
        const targetPixelY = p.targetY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;

        const curX = startPixelX + (targetPixelX - startPixelX) * progress;
        const curY = startPixelY + (targetPixelY - startPixelY) * progress;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(curX, curY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPixelX, startPixelY);
        ctx.lineTo(curX, curY);
        ctx.stroke();
      }
    }
  }

  renderLightMask(ctx, gridMap, player, ambientLights, viewportWidth, viewportHeight) {
    ctx.save();

    // 1. Render black darkness over unlit tiles
    const startTileX = Math.max(0, Math.floor(this.cameraX / CONFIG.GRID_SIZE));
    const endTileX = Math.min(gridMap.width - 1, Math.ceil((this.cameraX + viewportWidth) / CONFIG.GRID_SIZE));
    const startTileY = Math.max(0, Math.floor(this.cameraY / CONFIG.GRID_SIZE));
    const endTileY = Math.min(gridMap.height - 1, Math.ceil((this.cameraY + viewportHeight) / CONFIG.GRID_SIZE));

    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        const tile = gridMap.tiles[y][x];
        const screenX = x * CONFIG.GRID_SIZE - this.cameraX;
        const screenY = y * CONFIG.GRID_SIZE - this.cameraY;

        if (!tile.isLit) {
          ctx.fillStyle = '#050608';
          ctx.fillRect(screenX, screenY, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
        }
      }
    }

    // 2. Smooth continuous radial darkness dissolve over player FOV
    const playerRadius = LightingSystem.computePlayerRadius(player);
    const playerScreenX = player.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
    const playerScreenY = player.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;
    const maxRadiusPx = (playerRadius + 0.5) * CONFIG.GRID_SIZE;
    const innerClearRadiusPx = (playerRadius * 0.58) * CONFIG.GRID_SIZE;

    const darkGrad = ctx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      innerClearRadiusPx,
      playerScreenX,
      playerScreenY,
      maxRadiusPx
    );
    darkGrad.addColorStop(0, 'rgba(5, 6, 8, 0.0)');
    darkGrad.addColorStop(0.35, 'rgba(5, 6, 8, 0.18)');
    darkGrad.addColorStop(0.70, 'rgba(5, 6, 8, 0.55)');
    darkGrad.addColorStop(0.95, 'rgba(5, 6, 8, 0.90)');
    darkGrad.addColorStop(1.0, 'rgba(5, 6, 8, 1.0)');

    ctx.fillStyle = darkGrad;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, maxRadiusPx, 0, Math.PI * 2);
    ctx.fill();

    // 3. Subtle aura for active spells / torches
    const hasActiveSpell = player.lightSpellTimer > 0;
    const hasTorch = player.paperdoll?.main_hand?.item_id === 'torch' ||
                     player.paperdoll?.off_hand?.item_id === 'torch' ||
                     player.action_bar?.some(i => i?.item_id === 'torch');

    if (hasActiveSpell || hasTorch) {
      const auraRadius = hasActiveSpell ? 2.5 * CONFIG.GRID_SIZE : 1.5 * CONFIG.GRID_SIZE;
      const auraColor = hasActiveSpell ? 'rgba(56, 189, 248, 0.22)' : 'rgba(251, 191, 36, 0.18)';

      const grad = ctx.createRadialGradient(
        playerScreenX,
        playerScreenY,
        4,
        playerScreenX,
        playerScreenY,
        auraRadius
      );
      grad.addColorStop(0, auraColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(playerScreenX, playerScreenY, auraRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderFloatingTexts(ctx, floatingTexts) {
    for (const t of floatingTexts) {
      const screenX = t.x - this.cameraX;
      const screenY = t.y - this.cameraY;
      const alpha = Math.max(0, 1.0 - t.elapsedMs / t.durationMs);

      ctx.save();
      ctx.fillStyle = t.color;
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, screenX, screenY);
      ctx.restore();
    }
  }

  screenToGrid(screenX, screenY) {
    const worldX = screenX + this.cameraX;
    const worldY = screenY + this.cameraY;
    return {
      x: Math.floor(worldX / CONFIG.GRID_SIZE),
      y: Math.floor(worldY / CONFIG.GRID_SIZE),
    };
  }
}

// ============================================================================
// Lokarta App Class
// ============================================================================

export class LokartaApp {
  constructor() {
    this.gameClient = new GameClient(new Worker('./game-worker.js', { type: 'module' }));
    this.player = createPlayer('magician');
    this.gridMap = new GridMap();
    this.monsters = [];
    this.ambientLights = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.selectedMonsterId = null;

    this.isRunning = false;
    this.isGameOver = false;
    this.isFloorCleared = false;
    this.currentFloorName = 'Crypt';

    this.tickTimer = null;
    this.animFrameId = null;
    this.lastAnimTime = 0;
    this.keysDown = new Set();
    this.regenAccumulator = 0;

    this.canvas = document.getElementById('game-canvas');
    this.renderer = new CanvasRenderer(this.canvas);

    this.statusBarsEl = document.getElementById('status-bars-container');
    this.paperdollEl = document.getElementById('paperdoll-container');
    this.backpackEl = document.getElementById('backpack-container');
    this.hotbarEl = document.getElementById('hotbar-container');
    this.combatLogScrollEl = document.getElementById('log-entries-container');
    this.modalOverlayEl = document.getElementById('modal-overlay');

    this.gestureEngine = new GestureEngine(
      event => this.handleGestureEvent(event),
      (slotIndex, ratio) => this.handleChargeUpdate(slotIndex, ratio)
    );

    this.init();
  }

  async init() {
    window.addEventListener('resize', () => this.renderer.resize());
    this.renderer.resize();
    this.bindInputs();

    document.getElementById('header-guide-btn')?.addEventListener('click', () => {
      soundFX.play('click');
      this.showGuideModal();
    });

    const audioBtn = document.getElementById('audio-toggle-btn');
    audioBtn?.addEventListener('click', async () => {
      soundFX.init();
      const nextState = !soundFX.enabled;
      soundFX.setEnabled(nextState);
      audioBtn.textContent = nextState ? '🔊 Sound: ON' : '🔈 Sound: OFF';
      audioBtn.classList.toggle('muted', !nextState);
      await this.gameClient.setSoundEnabled(nextState);
    });

    try {
      const bootstrapData = await this.gameClient.bootstrap();
      if (bootstrapData.profile) {
        soundFX.setEnabled(bootstrapData.profile.soundEnabled);
        if (audioBtn) {
          audioBtn.textContent = bootstrapData.profile.soundEnabled ? '🔊 Sound: ON' : '🔈 Sound: OFF';
          audioBtn.classList.toggle('muted', !bootstrapData.profile.soundEnabled);
        }
      }

      this.showTitleScreen(bootstrapData.player);
    } catch (err) {
      console.error('Failed to bootstrap Lokarta:', err);
      this.showTitleScreen(null);
    }
  }

  showTitleScreen(savedPlayer) {
    this.stopGameLoop();
    this.modalOverlayEl.classList.remove('hidden');

    let continueBtnHtml = '';
    if (savedPlayer) {
      const voc = (savedPlayer.vocation || 'magician').toUpperCase();
      continueBtnHtml = `
        <div class="continue-summary-card">
          <div class="save-tag">⭐ SAVED HERO AVAILABLE</div>
          <div class="save-details"><strong>${voc}</strong> (Level ${savedPlayer.level || 1})</div>
          <div class="save-stats">Floor ${savedPlayer.current_floor || 1}/20 • HP: ${savedPlayer.hp}/${savedPlayer.max_hp} • MP: ${savedPlayer.mana}/${savedPlayer.max_mana}</div>
        </div>
        <button class="title-btn continue-btn" id="title-btn-continue">⚔️ CONTINUE ADVENTURE</button>
      `;
    }

    this.modalOverlayEl.innerHTML = `
      <div class="title-screen-modal">
        <div class="torch-flicker-container">
          <span class="title-torch left-torch">🔥</span>
          <span class="title-torch right-torch">🔥</span>
        </div>
        <div class="title-emblem">🕯️</div>
        <h1 class="title-main">LOKARTA</h1>
        <div class="title-subtitle">COME INTO THE LIGHT</div>
        <div class="title-tagline">A Gothic Roguelike Dungeon Crawl</div>
        <div class="title-menu-actions">
          ${continueBtnHtml}
          <button class="title-btn new-game-btn" id="title-btn-new-game">🕯️ NEW EXPEDITION</button>
        </div>
        <div class="title-footer">v2.3 • 10 Action Slots • Fate Grant Draft • 10-Tile FOV</div>
      </div>
    `;

    document.getElementById('title-btn-continue')?.addEventListener('click', async () => {
      soundFX.play('click');
      this.modalOverlayEl.classList.add('hidden');
      this.modalOverlayEl.innerHTML = '';
      await this.loadSavedGame(savedPlayer);
    });

    document.getElementById('title-btn-new-game')?.addEventListener('click', () => {
      soundFX.play('click');
      this.showCharacterSelectModal();
    });
  }

  showCharacterSelectModal() {
    this.modalOverlayEl.classList.remove('hidden');
    this.modalOverlayEl.innerHTML = `
      <div class="character-select-modal">
        <div class="modal-header">
          <h2>CHOOSE YOUR VOCATION</h2>
          <div class="subtitle">Descend into the 20 Subterranean Vaults of Lokarta</div>
        </div>
        <p class="prompt">Select your champion. Each vocation wields unique combat mechanics & 2.5x Mastery bonuses:</p>
        <div class="vocation-cards">
          <!-- Magician -->
          <div class="vocation-card" data-vocation="magician">
            <div class="card-icon">🧙‍♂️</div>
            <h3>Magician</h3>
            <div class="stats-preview">
              <div class="stat-row"><span class="stat-label">Health (HP):</span><span class="stat-val hp">60</span></div>
              <div class="stat-row"><span class="stat-label">Mana (MP):</span><span class="stat-val mp">150</span></div>
            </div>
            <p class="desc">Master of elemental sorcery, radiant illumination, and linear piercing beam blasts.</p>
            <button class="select-btn" data-vocation="magician">Select Magician</button>
          </div>

          <!-- Archer -->
          <div class="vocation-card" data-vocation="archer">
            <div class="card-icon">🏹</div>
            <h3>Archer</h3>
            <div class="stats-preview">
              <div class="stat-row"><span class="stat-label">Health (HP):</span><span class="stat-val hp">90</span></div>
              <div class="stat-row"><span class="stat-label">Mana (MP):</span><span class="stat-val mp">80</span></div>
            </div>
            <p class="desc">Deadly ranged marksman firing precision arrows and high-tension Power Shots across darkness.</p>
            <button class="select-btn" data-vocation="archer">Select Archer</button>
          </div>

          <!-- Fighter -->
          <div class="vocation-card" data-vocation="fighter">
            <div class="card-icon">⚔️</div>
            <h3>Fighter</h3>
            <div class="stats-preview">
              <div class="stat-row"><span class="stat-label">Health (HP):</span><span class="stat-val hp">140</span></div>
              <div class="stat-row"><span class="stat-label">Mana (MP):</span><span class="stat-val mp">30</span></div>
            </div>
            <p class="desc">Unyielding melee berserker delivering lethal sword slashes and whirlwind cleaves.</p>
            <button class="select-btn" data-vocation="fighter">Select Fighter</button>
          </div>

          <!-- Paladin -->
          <div class="vocation-card" data-vocation="paladin">
            <div class="card-icon">🛡️</div>
            <h3>Paladin</h3>
            <div class="stats-preview">
              <div class="stat-row"><span class="stat-label">Health (HP):</span><span class="stat-val hp">120</span></div>
              <div class="stat-row"><span class="stat-label">Mana (MP):</span><span class="stat-val mp">90</span></div>
            </div>
            <p class="desc">Holy champion wielding consecrated warhammers, healing prayers, and sacred radiance.</p>
            <button class="select-btn" data-vocation="paladin">Select Paladin</button>
          </div>
        </div>
      </div>
    `;

    const selectBtns = this.modalOverlayEl.querySelectorAll('.select-btn, .vocation-card');
    selectBtns.forEach(btn => {
      btn.addEventListener('click', async e => {
        const vocation = e.currentTarget.getAttribute('data-vocation');
        if (vocation) {
          soundFX.play('click');
          this.modalOverlayEl.classList.add('hidden');
          this.modalOverlayEl.innerHTML = '';
          await this.startNewGame(vocation);
        }
      });
    });
  }

  showGuideModal() {
    this.modalOverlayEl.classList.remove('hidden');
    this.modalOverlayEl.innerHTML = `
      <div class="guide-modal">
        <div class="modal-header">
          <h2>SURVIVAL GUIDE & CONTROLS</h2>
          <div class="subtitle">Subterranean Mechanics of Lokarta</div>
        </div>
        <div class="guide-content">
          <div class="guide-section">
            <h3>Movement & Floor Interaction</h3>
            <ul class="guide-list">
              <li><code>W</code>, <code>A</code>, <code>S</code>, <code>D</code> / Arrow Keys: Move character in 4 directions.</li>
              <li><strong>Walkover Auto-Loot:</strong> Step on any item tile to immediately collect it into lowest empty Action Slot or Backpack.</li>
              <li><strong>Left-Click Floor Tile:</strong> Target enemies or inspect/loot items directly.</li>
            </ul>
          </div>
          <div class="guide-section">
            <h3>10 Modular Action Slots (Keys 1-9, 0)</h3>
            <ul class="guide-list">
              <li>Keys <code>1</code> to <code>9</code>, <code>0</code>: Execute items, spells, and weapons in the corresponding slot.</li>
              <li><strong>Multi-Modal Input:</strong> Tap (&lt;250ms), Hold/Charge (&ge;250ms), Double-Tap (&lt;300ms).</li>
              <li><strong>Weapons in Action Slots:</strong> Pressing weapon hotkey attacks targeted/in-range enemy.</li>
              <li><strong>2.5x Class Mastery:</strong> Using native vocation equipment/spells grants 2.5x damage/healing multiplier!</li>
            </ul>
          </div>
          <div class="guide-section">
            <h3>Fate Grant Roguelike Draft</h3>
            <p>At Level 1 and every Level-Up, draft 1–2 cards from 5 randomly offered spells, weapons, and relics to power up your hero.</p>
          </div>
        </div>
        <div class="modal-back-action">
          <button class="action-btn" id="btn-close-guide">Back to Dungeon</button>
        </div>
      </div>
    `;

    document.getElementById('btn-close-guide')?.addEventListener('click', () => {
      soundFX.play('click');
      this.modalOverlayEl.classList.add('hidden');
      this.modalOverlayEl.innerHTML = '';
    });
  }

  async startNewGame(vocation) {
    try {
      const data = await this.gameClient.newGame(vocation);
      this.player = data.player;
      this.applyDungeonData(data.floor);
      this.clearCombatLog();
      this.logCombat(`Welcome to Lokarta, brave ${(this.player.vocation || 'magician').toUpperCase()}!`, 'victory');
      this.logCombat('Fate calls upon you: Draft your starter cards.', 'spell');

      this.startGameLoop();
      this.showFateGrantModal(1);
    } catch (err) {
      console.error('Failed to start new game:', err);
    }
  }

  async loadSavedGame(savedPlayer) {
    try {
      this.player = savedPlayer;
      const floor = await this.gameClient.getFloor(this.player.current_floor || 1);
      this.applyDungeonData(floor);
      this.clearCombatLog();
      this.logCombat(`Resumed expedition on Floor ${this.player.current_floor || 1}/20 (${this.currentFloorName}).`, 'system');

      this.startGameLoop();

      // If fresh character with empty action bar, offer Level 1 draft
      const isActionBarEmpty = this.player.action_bar?.every(s => s === null);
      if (isActionBarEmpty && this.player.level === 1) {
        this.showFateGrantModal(1);
      }
    } catch (err) {
      console.error('Failed to load saved game:', err);
    }
  }

  applyDungeonData(floorData) {
    this.currentFloorName = floorData.biome_name || 'Crypt';
    this.gridMap.loadFromMatrix(floorData.tiles);

    for (const item of floorData.items || []) {
      this.gridMap.addItem(item.x, item.y, item);
    }

    this.ambientLights = [];
    this.monsters = (floorData.monsters || []).map(s => ({
      ...s,
      isAggroed: false,
      moveCooldown: 0,
      attackCooldown: 0,
      attackCadence: s.attackCadence || (s.type === 'giant_rat' ? CONFIG.RAT_ATTACK_CADENCE_SEC : s.type === 'crypt_skeleton' ? CONFIG.SKELETON_ATTACK_CADENCE_SEC : CONFIG.CULTIST_ATTACK_CADENCE_SEC),
      visible: false,
    }));
  }

  // ==========================================================================
  // Fate Grant Modal
  // ==========================================================================

  showFateGrantModal(level = 1) {
    const offer = FateGrantSystem.generateDraftOffer(this.player.vocation, level);
    const selectedCards = new Set();

    this.modalOverlayEl.classList.remove('hidden');
    this.modalOverlayEl.innerHTML = `
      <div class="fate-grant-modal">
        <div class="modal-header">
          <h2>🕯️ FATE GRANT DRAFT (Level ${level})</h2>
          <div class="subtitle">Select 1 or 2 cards to fortify your Action Slots and Backpack</div>
        </div>
        <div class="fate-cards-grid" id="fate-cards-grid">
          ${offer.cards
            .map(
              (card, idx) => `
            <div class="fate-card rarity-${card.rarity}" data-card-id="${card.id}" data-idx="${idx}">
              <div class="card-select-badge">✓</div>
              <div class="card-icon">${card.icon}</div>
              <div class="card-title">${card.name}</div>
              <div class="card-stat-bonus">${card.statBonusText || ''}</div>
              <div class="card-desc">${card.description}</div>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="fate-modal-actions">
          <button class="confirm-draft-btn" id="btn-confirm-draft" disabled>Confirm Selections (0/2)</button>
        </div>
      </div>
    `;

    const cardEls = this.modalOverlayEl.querySelectorAll('.fate-card');
    const confirmBtn = document.getElementById('btn-confirm-draft');

    cardEls.forEach(el => {
      el.addEventListener('click', () => {
        soundFX.play('click');
        const cardId = el.getAttribute('data-card-id');
        const cardObj = offer.cards.find(c => c.id === cardId);

        if (selectedCards.has(cardObj)) {
          selectedCards.delete(cardObj);
          el.classList.remove('selected');
        } else {
          if (selectedCards.size < 2) {
            selectedCards.add(cardObj);
            el.classList.add('selected');
          }
        }

        const count = selectedCards.size;
        confirmBtn.disabled = count === 0;
        confirmBtn.textContent = `Confirm Selections (${count}/2)`;
      });
    });

    confirmBtn.addEventListener('click', async () => {
      if (selectedCards.size === 0) return;
      soundFX.play('equip');

      const chosen = Array.from(selectedCards);
      const applyResult = FateGrantSystem.applyDraftedCards(this.player, chosen, this.gridMap);

      for (const hotbarItem of applyResult.addedToHotbar) {
        this.logCombat(`Fate granted: ${hotbarItem}`, 'loot');
      }
      for (const bpItem of applyResult.addedToBackpack) {
        this.logCombat(`Fate granted: ${bpItem}`, 'loot');
      }
      for (const floorItem of applyResult.droppedOnFloor) {
        this.logCombat(`Inventory full: ${floorItem} placed on floor.`, 'warning');
      }

      this.modalOverlayEl.classList.add('hidden');
      this.modalOverlayEl.innerHTML = '';
      this.updateHUD();
      await this.persistSave();
    });
  }

  // ==========================================================================
  // Game Loop (10Hz Tick + 60 FPS Render)
  // ==========================================================================

  startGameLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isGameOver = false;
    this.isFloorCleared = false;

    this.tickTimer = window.setInterval(() => this.tick(), CONFIG.TICK_INTERVAL_MS);

    this.lastAnimTime = performance.now();
    const renderFrame = time => {
      const dt = time - this.lastAnimTime;
      this.lastAnimTime = time;
      this.updateAnimations(dt);
      this.render();

      if (this.isRunning) {
        this.animFrameId = requestAnimationFrame(renderFrame);
      }
    };
    this.animFrameId = requestAnimationFrame(renderFrame);
    this.updateHUD();
  }

  stopGameLoop() {
    this.isRunning = false;
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  tick() {
    if (!this.isRunning || this.isGameOver) return;
    const deltaSec = CONFIG.TICK_INTERVAL_MS / 1000;

    // 1. Movement
    this.processMovementInput();

    // 2. Decrement cooldowns
    CombatSystem.decrementCooldowns(this.player, deltaSec);
    CombatSystem.decrementSpellTimers(this.player, deltaSec);

    // Passive regeneration (every 5 seconds)
    const bonusRegen = this.player.skillBoosts?.bonusRegen || 0;
    this.regenAccumulator += deltaSec;
    if (this.regenAccumulator >= 5.0) {
      this.regenAccumulator -= 5.0;
      if (this.player.vocation === 'magician' && this.player.mana < this.player.max_mana) {
        const amt = 2 + bonusRegen;
        this.player.mana = Math.min(this.player.max_mana, this.player.mana + amt);
        this.addFloatingText(`+${amt} MP`, this.player.x, this.player.y, '#3b82f6');
      } else if (this.player.hp < this.player.max_hp) {
        const amt = 2 + bonusRegen;
        this.player.hp = Math.min(this.player.max_hp, this.player.hp + amt);
        this.addFloatingText(`+${amt} HP`, this.player.x, this.player.y, '#22c55e');
      }
    }

    // 3. Update lighting
    LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);

    // 4. Update monster AI
    const aiResults = EntityAI.updateMonsters(this.monsters, this.player, this.gridMap, deltaSec);
    for (const res of aiResults) {
      if (res.message) this.logCombat(res.message, 'combat');
      if (res.projectiles) this.projectiles.push(...res.projectiles);
      if (res.damageToPlayer && res.damageToPlayer > 0) {
        soundFX.play('monsterAttack');
        soundFX.play('playerHurt');
        this.addFloatingText(`-${res.damageToPlayer}`, this.player.x, this.player.y, '#ef4444');
      }
    }

    // 5. Defeat check
    if (this.player.hp <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.logCombat('You have fallen in the crypt! Darkness consumes you...', 'warning');
      this.showGameOverModal();
    }

    // 6. Stairs check
    if (!this.isFloorCleared && this.gridMap.isStairs(this.player.x, this.player.y)) {
      this.handleFloorClear();
    }

    // 7. Update HUD
    this.updateHUD();
  }

  updateAnimations(dtMs) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.elapsedMs += dtMs;
      if (p.elapsedMs >= p.durationMs) {
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.elapsedMs += dtMs;
      t.y -= (dtMs / 1000) * 20;
      if (t.elapsedMs >= t.durationMs) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render() {
    this.renderer.render(
      this.gridMap,
      this.player,
      this.monsters,
      this.ambientLights,
      this.projectiles,
      this.floatingTexts,
      this.selectedMonsterId
    );
  }

  // ==========================================================================
  // Movement & Input Handling
  // ==========================================================================

  processMovementInput() {
    let dx = 0;
    let dy = 0;
    let newFacing = this.player.facing;

    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) {
      dy -= 1;
      newFacing = 'up';
    } else if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) {
      dy += 1;
      newFacing = 'down';
    } else if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) {
      dx -= 1;
      newFacing = 'left';
    } else if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) {
      dx += 1;
      newFacing = 'right';
    }

    if (dx !== 0 || dy !== 0) {
      this.player.facing = newFacing;
      const targetX = this.player.x + dx;
      const targetY = this.player.y + dy;

      if (this.gridMap.isWalkable(targetX, targetY)) {
        const monsterAtTarget = this.monsters.find(m => m.x === targetX && m.y === targetY && m.hp > 0);
        if (monsterAtTarget) {
          this.selectedMonsterId = monsterAtTarget.id;
          this.logCombat(`Target locked on ${monsterAtTarget.name} (${monsterAtTarget.hp}/${monsterAtTarget.max_hp} HP).`, 'system');
        } else {
          this.player.x = targetX;
          this.player.y = targetY;
          soundFX.play('footstep');

          // Frictionless walkover auto-pickup
          const items = this.gridMap.getItems(this.player.x, this.player.y);
          if (items.length > 0) {
            this.handlePickUp();
          }
        }
      }
    }
  }

  bindInputs() {
    window.addEventListener('keydown', e => {
      this.keysDown.add(e.code);

      const slotIdx = GestureEngine.keyToSlotIndex(e.key);
      if (slotIdx !== null) {
        e.preventDefault();
        this.gestureEngine.handleInputDown(slotIdx);
      }
    });

    window.addEventListener('keyup', e => {
      this.keysDown.delete(e.code);

      const slotIdx = GestureEngine.keyToSlotIndex(e.key);
      if (slotIdx !== null) {
        e.preventDefault();
        this.gestureEngine.handleInputUp(slotIdx);
      }
    });

    // Canvas click: targeting or looting
    this.canvas.addEventListener('click', e => {
      soundFX.init();
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const gridPos = this.renderer.screenToGrid(clickX, clickY);

      const clickedMonster = this.monsters.find(
        m => m.x === gridPos.x && m.y === gridPos.y && m.visible && m.hp > 0
      );
      if (clickedMonster) {
        this.selectedMonsterId = clickedMonster.id;
        this.logCombat(`Targeted ${clickedMonster.name} (${clickedMonster.hp}/${clickedMonster.max_hp} HP).`, 'system');
      } else {
        const clickedItems = this.gridMap.getItems(gridPos.x, gridPos.y);
        if (clickedItems.length > 0) {
          const topItem = clickedItems[clickedItems.length - 1];
          this.logCombat(`Ground inspection: ${topItem.name} (${topItem.type}) on tile (${gridPos.x}, ${gridPos.y}).`, 'system');
        } else {
          this.selectedMonsterId = null;
        }
      }
    });

    // Touch D-Pad buttons
    const touchBtns = document.querySelectorAll('.touch-btn');
    touchBtns.forEach(btn => {
      const key = btn.getAttribute('data-key');
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        soundFX.init();
        this.keysDown.add(key);
      });
      btn.addEventListener('touchend', e => {
        e.preventDefault();
        this.keysDown.delete(key);
      });
    });
  }

  handleChargeUpdate(slotIndex, ratio) {
    const slotEl = document.querySelector(`.action-slot-btn[data-slot-index="${slotIndex}"] .charge-fill`);
    if (slotEl) {
      slotEl.style.width = `${Math.round(ratio * 100)}%`;
    }
  }

  handleGestureEvent(event) {
    const { slotIndex, gesture } = event;
    const item = this.player.action_bar?.[slotIndex];
    if (!item) {
      this.logCombat(`Action Slot ${slotIndex + 1} is empty.`, 'warning');
      return;
    }

    soundFX.init();

    // 1. Spells & Weapons executed from slot
    if (item.type === 'spell' || item.type === 'weapon') {
      this.executeActionSlotCombat(item, gesture);
      return;
    }

    // 2. Consumable items (potions)
    if (item.type === 'consumable') {
      const res = InventorySystem.consumeItem(this.player, item, () => {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          this.player.action_bar[slotIndex] = null;
        }
      });
      if (res.success) {
        soundFX.play('potionDrink');
        this.logCombat(res.message, 'loot');
        this.addFloatingText(`Used ${item.name}!`, this.player.x, this.player.y, '#38bdf8');
        this.updateHUD();
        this.persistSave();
      } else {
        this.logCombat(res.message, 'warning');
      }
      return;
    }

    // 3. Equippable offhand / armor / relic
    if (item.type === 'offhand' || item.type === 'armor' || item.type === 'relic') {
      const eqRes = InventorySystem.equipItem(this.player, 'action_bar', slotIndex);
      if (eqRes.success) {
        soundFX.play('equip');
        this.logCombat(eqRes.message, 'loot');
        LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);
        this.updateHUD();
        this.persistSave();
      } else {
        this.logCombat(eqRes.message, 'warning');
      }
    }
  }

  executeActionSlotCombat(item, gesture) {
    const itemId = item.item_id || '';

    // Wand Spark / apprentice wand
    if (itemId.includes('spark') || itemId.includes('wand') || itemId.includes('scepter')) {
      const target = this.getTargetMonster(CONFIG.MAGICIAN_SPARK_RANGE);
      if (!target) {
        this.logCombat('No enemy in range for Wand Spark (click enemy to target).', 'warning');
        return;
      }
      soundFX.play('wandSpark');
      const res = CombatSystem.executeWandSpark(this.player, target, this.gridMap);
      this.handleCombatResult(res, target.x, target.y);
    }
    // Energy Beam
    else if (itemId.includes('beam')) {
      const res = CombatSystem.executeEnergyBeam(this.player, this.player.facing, this.gridMap, this.monsters);
      if (res.success) {
        soundFX.play('energyBeam');
        this.handleCombatResult(res, this.player.x, this.player.y);
      } else {
        this.logCombat(res.message, 'warning');
      }
    }
    // Light Spell
    else if (itemId.includes('light')) {
      const res = CombatSystem.executeLightSpell(this.player);
      if (res.success) {
        soundFX.play('lightSpell');
        this.logCombat(res.message, 'spell');
        this.addFloatingText('Light Aura!', this.player.x, this.player.y, '#ffd700');
        LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);
      } else {
        this.logCombat(res.message, 'warning');
      }
    }
    // Bow Shot / Power Shot / bow weapons
    else if (itemId.includes('power_shot')) {
      const target = this.getTargetMonster(CONFIG.ARCHER_POWER_SHOT_RANGE);
      if (!target) {
        this.logCombat('No enemy in range for Power Shot.', 'warning');
        return;
      }
      soundFX.play('powerShot');
      const res = CombatSystem.executePowerShot(this.player, target, this.gridMap);
      this.handleCombatResult(res, target.x, target.y);
    } else if (itemId.includes('bow') || itemId.includes('shot')) {
      const target = this.getTargetMonster(CONFIG.ARCHER_BOW_RANGE);
      if (!target) {
        this.logCombat('No enemy in range for Bow Shot.', 'warning');
        return;
      }
      soundFX.play('bowShot');
      const res = CombatSystem.executeBowShot(this.player, target, this.gridMap);
      this.handleCombatResult(res, target.x, target.y);
    }
    // Sword Slash / Broadsword / Cleave
    else if (itemId.includes('cleave')) {
      const target = this.getTargetMonster(1.5);
      if (!target) {
        this.logCombat('No adjacent enemy for Cleave.', 'warning');
        return;
      }
      soundFX.play('hit');
      const res = CombatSystem.executeSlash(this.player, target, this.gridMap);
      this.handleCombatResult(res, target.x, target.y);
    } else if (itemId.includes('sword') || itemId.includes('slash')) {
      const target = this.getTargetMonster(1.5);
      if (!target) {
        this.logCombat('No adjacent enemy for melee attack.', 'warning');
        return;
      }
      soundFX.play('hit');
      const res = CombatSystem.executeSlash(this.player, target, this.gridMap);
      this.handleCombatResult(res, target.x, target.y);
    }
    // Paladin Holy Strike / Healing Prayer / Warhammer
    else if (itemId.includes('prayer') || itemId.includes('heal')) {
      const res = CombatSystem.executeHealingPrayer(this.player);
      if (res.success) {
        soundFX.play('lightSpell');
        this.logCombat(res.message, 'spell');
        this.addFloatingText(`+${res.healAmount} HP`, this.player.x, this.player.y, '#22c55e');
      } else {
        this.logCombat(res.message, 'warning');
      }
    } else if (itemId.includes('holy') || itemId.includes('warhammer') || itemId.includes('radiance')) {
      const target = this.getTargetMonster(1.5);
      if (!target) {
        this.logCombat('No adjacent enemy for Holy Strike.', 'warning');
        return;
      }
      soundFX.play('hit');
      const res = CombatSystem.executeHolyStrike(this.player, target, this.gridMap);
      this.handleCombatResult(res, target.x, target.y);
    }

    this.updateHUD();
  }

  getTargetMonster(maxRange) {
    const bonusRng = this.player.skillBoosts?.bonusRange || 0;
    const effectiveRange = maxRange + bonusRng;

    if (this.selectedMonsterId) {
      const monster = this.monsters.find(m => m.id === this.selectedMonsterId && m.hp > 0);
      if (monster && monster.visible) {
        const d = Math.hypot(monster.x - this.player.x, monster.y - this.player.y);
        if (d <= effectiveRange + 0.5) return monster;
      }
    }

    let closest = null;
    let minDist = effectiveRange + 1;

    for (const m of this.monsters) {
      if (m.hp <= 0 || !m.visible) continue;
      const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
      if (d <= effectiveRange + 0.5 && d < minDist) {
        if (LightingSystem.hasLineOfSight(this.gridMap, this.player.x, this.player.y, m.x, m.y)) {
          minDist = d;
          closest = m;
        }
      }
    }

    if (closest) {
      this.selectedMonsterId = closest.id;
    }
    return closest;
  }

  handleCombatResult(res, targetX, targetY) {
    if (!res.success) {
      if (res.message) this.logCombat(res.message, 'warning');
      return;
    }

    if (res.message) this.logCombat(res.message, 'combat');
    if (res.damageDealt) {
      soundFX.play('hit');
      this.addFloatingText(`-${res.damageDealt}`, targetX, targetY, '#ffdd44');
    }

    if (res.projectiles) this.projectiles.push(...res.projectiles);

    if (res.defeatedMonsterId) {
      soundFX.play('monsterDeath');
      const index = this.monsters.findIndex(m => m.id === res.defeatedMonsterId);
      if (index !== -1) {
        const deadMonster = this.monsters[index];
        if (res.droppedLoot && res.droppedLoot.length > 0) {
          for (const item of res.droppedLoot) {
            this.gridMap.addItem(deadMonster.x, deadMonster.y, item);
            this.logCombat(`${deadMonster.name} dropped ${item.name}.`, 'loot');
          }
        }

        const isBoss = deadMonster.isBoss || deadMonster.id.includes('boss') || deadMonster.max_hp >= 200;
        const xpEarned = ProgressionSystem.getMonsterXp(deadMonster.type, this.player.current_floor || 1, isBoss);
        const lvlRes = ProgressionSystem.awardXP(this.player, xpEarned);

        this.logCombat(`Gained +${xpEarned} XP from defeating ${deadMonster.name}.`, 'loot');
        this.addFloatingText(`+${xpEarned} XP`, deadMonster.x, deadMonster.y, '#fbbf24');

        if (lvlRes.leveledUp) {
          soundFX.play('levelUp');
          this.logCombat(
            `⭐ LEVEL UP! You reached Level ${lvlRes.newLevel}! (+${lvlRes.hpGained} Max HP, +${lvlRes.manaGained} Max MP)`,
            'spell'
          );
          this.addFloatingText(`⭐ LEVEL UP! [Lv. ${lvlRes.newLevel}]`, this.player.x, this.player.y, '#ffd700');
          this.persistSave();
          this.showFateGrantModal(lvlRes.newLevel);
        }

        this.monsters.splice(index, 1);
        if (this.selectedMonsterId === res.defeatedMonsterId) {
          this.selectedMonsterId = null;
        }

        if (isBoss && this.player.current_floor >= 20) {
          setTimeout(() => this.handleFloorClear(), 600);
        }
      }
    }
  }

  // ==========================================================================
  // Inventory & Ground Actions
  // ==========================================================================

  async handlePickUp() {
    soundFX.init();
    const res = InventorySystem.pickUpItem(this.player, this.gridMap);
    if (res.success) {
      soundFX.play('itemPickup');
      this.logCombat(res.message, 'loot');
      this.addFloatingText(`+${res.item?.name}`, this.player.x, this.player.y, '#22c55e');
      this.updateHUD();
      await this.persistSave();
    }
  }

  async handleDropItem(source, slotIndex) {
    soundFX.init();
    const res = InventorySystem.dropItem(this.player, source, slotIndex, this.gridMap);
    if (res.success) {
      soundFX.play('unequip');
      this.logCombat(res.message, 'system');
      this.updateHUD();
      await this.persistSave();
    } else {
      this.logCombat(res.message, 'warning');
    }
  }

  async handleUnequip(slotName) {
    soundFX.init();
    const res = InventorySystem.unequipItem(this.player, slotName);
    if (res.success) {
      soundFX.play('unequip');
      this.logCombat(res.message, 'system');
      LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);
      this.updateHUD();
      await this.persistSave();
    } else {
      this.logCombat(res.message, 'warning');
    }
  }

  async persistSave() {
    try {
      await this.gameClient.saveCharacter(this.player);
    } catch (err) {
      console.warn('Auto-save error:', err);
    }
  }

  async handleFloorClear() {
    if (this.player.current_floor < 20) {
      const nextFloor = this.player.current_floor + 1;
      const floorBonusXp = 50 * this.player.current_floor;
      const lvlRes = ProgressionSystem.awardXP(this.player, floorBonusXp);

      soundFX.play('stairs');
      this.logCombat(
        `Stepped on stairway! Descended to Floor ${nextFloor}/20 (+${floorBonusXp} Floor Clear XP)!`,
        'victory'
      );
      this.addFloatingText(`FLOOR ${nextFloor}`, this.player.x, this.player.y, '#38bdf8');

      if (lvlRes.leveledUp) {
        soundFX.play('levelUp');
        this.logCombat(
          `⭐ LEVEL UP! You reached Level ${lvlRes.newLevel}! (+${lvlRes.hpGained} Max HP, +${lvlRes.manaGained} Max MP)`,
          'spell'
        );
        this.showFateGrantModal(lvlRes.newLevel);
      }

      try {
        const transition = await this.gameClient.advanceFloor(this.player, nextFloor);
        this.player = transition.player;
        this.applyDungeonData(transition.floor);
        this.isFloorCleared = false;
        LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);
        this.updateHUD();
        await this.persistSave();
      } catch (err) {
        console.error('Floor transition error:', err);
      }
    } else {
      this.isFloorCleared = true;
      soundFX.play('victory');
      this.logCombat('🎉 YOU CONQUERED THE ABYSSAL SANCTUM! ALL 20 FLOORS CLEARED!', 'victory');
      this.addFloatingText('CAMPAIGN COMPLETED!', this.player.x, this.player.y, '#ffd700');
      this.showVictoryModal();
    }
  }

  addFloatingText(text, gridX, gridY, color) {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x: gridX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      y: gridY * CONFIG.GRID_SIZE,
      color,
      durationMs: 1200,
      elapsedMs: 0,
    });
  }

  // ==========================================================================
  // HUD UI Rendering
  // ==========================================================================

  updateHUD() {
    this.renderStatusBars();
    this.renderPaperdoll();
    this.renderBackpack();
    this.renderHotbar();
  }

  renderStatusBars() {
    if (!this.statusBarsEl) return;
    const hpPercent = Math.max(0, Math.min(100, (this.player.hp / this.player.max_hp) * 100));
    const mpPercent = Math.max(0, Math.min(100, (this.player.mana / this.player.max_mana) * 100));
    const xpPercent = this.player.level >= 20 ? 100 : Math.max(0, Math.min(100, (this.player.xp / (this.player.xpToNextLevel || 100)) * 100));
    const vocationDisplay = (this.player.vocation || 'magician').charAt(0).toUpperCase() + (this.player.vocation || 'magician').slice(1);
    const dmgBonusPct = Math.round(((this.player.skillBoosts?.damageMultiplier || 1.0) - 1.0) * 100);

    this.statusBarsEl.innerHTML = `
      <div class="panel-header">HERO STATUS & DUNGEON PROGRESS</div>
      <div class="status-panel-inner">
        <div class="status-header">
          <div class="vocation-tag"><span class="level-badge">Lv. ${this.player.level || 1}</span> <strong class="val">${vocationDisplay}</strong></div>
          <div class="floor-tag"><span class="label">Floor:</span> <strong class="val">${this.player.current_floor || 1}/20 (${this.currentFloorName})</strong></div>
        </div>

        <div class="meter-container hp-meter">
          <div class="meter-info">
            <span class="meter-label">HEALTH (HP)</span>
            <span class="meter-values">${this.player.hp} / ${this.player.max_hp}</span>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill hp-fill" style="width: ${hpPercent}%;"></div>
          </div>
        </div>

        <div class="meter-container mp-meter">
          <div class="meter-info">
            <span class="meter-label">MANA (MP)</span>
            <span class="meter-values">${this.player.mana} / ${this.player.max_mana}</span>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill mp-fill" style="width: ${mpPercent}%;"></div>
          </div>
        </div>

        <div class="meter-container xp-meter">
          <div class="meter-info">
            <span class="meter-label">EXP (XP)</span>
            <span class="meter-values">${this.player.level >= 20 ? 'MAX LEVEL' : `${this.player.xp || 0} / ${this.player.xpToNextLevel || 100}`}</span>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill xp-fill" style="width: ${xpPercent}%;"></div>
          </div>
        </div>

        ${
          dmgBonusPct > 0 || this.player.skillBoosts?.bonusRange || this.player.skillBoosts?.bonusRegen
            ? `<div class="skill-boosts-summary">
                <span>⚡ +${dmgBonusPct}% Damage</span>
                <span>✨ 2.5x Class Mastery</span>
                ${this.player.skillBoosts?.bonusRange ? `<span>🏹 +${this.player.skillBoosts.bonusRange} Range</span>` : ''}
                ${this.player.skillBoosts?.bonusRegen ? `<span>❤️ +${this.player.skillBoosts.bonusRegen} Regen</span>` : ''}
              </div>`
            : ''
        }

        ${
          this.player.lightSpellTimer > 0
            ? `<div class="active-buff-badge">
                <span class="buff-icon">✨</span>
                <span class="buff-text">Light Aura: <strong>${Math.ceil(this.player.lightSpellTimer)}s</strong> (12 tiles)</span>
              </div>`
            : ''
        }
      </div>
    `;
  }

  renderPaperdoll() {
    if (!this.paperdollEl) return;
    const paperdoll = this.player.paperdoll || {};
    const slots = [
      { key: 'main_hand', label: 'Main Hand', iconPlaceholder: '⚔️' },
      { key: 'off_hand', label: 'Off Hand', iconPlaceholder: '🛡️' },
      { key: 'armor', label: 'Armor', iconPlaceholder: '🦺' },
      { key: 'relic', label: 'Relic', iconPlaceholder: '📿' },
    ];

    let html = `
      <div class="panel-header">EQUIPMENT (4 SLOTS)</div>
      <div class="paperdoll-slots-grid">
    `;

    for (const slot of slots) {
      const item = paperdoll[slot.key];
      const hasItem = Boolean(item);
      const itemName = hasItem ? item.name : 'Empty';
      const statBonus = hasItem && item.stat_bonus > 0 ? ` (+${item.stat_bonus})` : '';

      html += `
        <div class="paperdoll-slot ${hasItem ? 'occupied' : 'empty'}" data-slot="${slot.key}" title="${slot.label}: ${itemName}${statBonus}">
          <div class="slot-label">${slot.key.replace('_', ' ').toUpperCase()}</div>
          <div class="slot-content">
            ${hasItem ? this.renderItemIcon(item) : `<span class="empty-icon">${slot.iconPlaceholder}</span>`}
          </div>
          <div class="slot-item-name">${itemName}</div>
          ${hasItem ? `<button class="unequip-btn" data-slot="${slot.key}" title="Unequip">✕</button>` : ''}
        </div>
      `;
    }

    html += `</div>`;
    this.paperdollEl.innerHTML = html;

    const unequipButtons = this.paperdollEl.querySelectorAll('.unequip-btn');
    unequipButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const slotKey = e.currentTarget.getAttribute('data-slot');
        if (slotKey) this.handleUnequip(slotKey);
      });
    });
  }

  renderBackpack() {
    if (!this.backpackEl) return;
    const backpack = this.player.backpack || [null, null, null, null, null, null];
    const occupiedCount = backpack.filter(Boolean).length;

    let html = `
      <div class="panel-header">
        <span>BACKPACK (6 SLOTS)</span>
        <span class="slot-count">${occupiedCount}/6</span>
      </div>
      <div class="backpack-slots-grid">
    `;

    for (let i = 0; i < 6; i++) {
      const item = backpack[i] || null;
      const isOccupied = item !== null;
      const tooltip = isOccupied
        ? `${item.name} (${item.type})${item.quantity > 1 ? ` x${item.quantity}` : ''}${item.stat_bonus > 0 ? ` [Stat: +${item.stat_bonus}]` : ''}`
        : `Backpack Slot ${i + 1} (Empty)`;

      html += `
        <div class="backpack-slot ${isOccupied ? 'occupied' : 'empty'}" data-index="${i}" title="${tooltip}">
          <div class="slot-num">#${i + 1}</div>
          <div class="slot-content">
            ${isOccupied ? this.renderItemIcon(item) : ''}
          </div>
          ${isOccupied && item.quantity > 1 ? `<div class="item-qty">x${item.quantity}</div>` : ''}
          <div class="slot-item-name">${isOccupied ? item.name : 'Empty'}</div>
          ${
            isOccupied
              ? `<div class="slot-actions">
                  <button class="use-btn" data-index="${i}" title="Use / Equip">Use</button>
                  <button class="drop-btn" data-index="${i}" title="Drop to ground">Drop</button>
                </div>`
              : ''
          }
        </div>
      `;
    }

    html += `</div>`;
    this.backpackEl.innerHTML = html;

    const useBtns = this.backpackEl.querySelectorAll('.use-btn');
    useBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.getAttribute('data-index') || '-1', 10);
        if (idx >= 0) {
          const res = InventorySystem.useBackpackItem(this.player, idx);
          if (res.success) {
            soundFX.play('equip');
            this.logCombat(res.message, 'loot');
            this.updateHUD();
            this.persistSave();
          } else {
            this.logCombat(res.message, 'warning');
          }
        }
      });
    });

    const dropBtns = this.backpackEl.querySelectorAll('.drop-btn');
    dropBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.getAttribute('data-index') || '-1', 10);
        if (idx >= 0) this.handleDropItem('backpack', idx);
      });
    });
  }

  renderHotbar() {
    if (!this.hotbarEl) return;
    const actionBar = this.player.action_bar || Array(10).fill(null);

    let html = `
      <div class="panel-header">ACTIONS & ABILITIES (KEYS 1-9, 0)</div>
      <div class="action-slots-container">
        <div class="action-slots-grid">
    `;

    for (let i = 0; i < 10; i++) {
      const item = actionBar[i] || null;
      const hotkey = GestureEngine.slotIndexToHotkey(i);
      const isOccupied = item !== null;
      const cdKey = item?.item_id?.replace('spell_', '') || '';
      const cd = this.player.cooldowns?.[cdKey] || 0;
      const isOnCooldown = cd > 0;
      const isNative = isOccupied && CombatSystem.isNativeItem(item, this.player.vocation);

      const title = isOccupied
        ? `${item.name} [${hotkey}] (${item.type}) - Tap / Hold / Double-Tap${isNative ? ' [★ 2.5x Mastery]' : ''}`
        : `Slot [${hotkey}] (Empty)`;

      html += `
        <button class="action-slot-btn ${isOnCooldown ? 'on-cooldown' : ''}" data-slot-index="${i}" title="${title}">
          <div class="hotkey-badge">[${hotkey}]</div>
          <div class="btn-icon">${isOccupied ? this.renderItemIcon(item) : '•'}</div>
          <div class="btn-name">${isOccupied ? item.name : 'Empty'}</div>
          <div class="btn-cost">${isOccupied ? (item.quantity > 1 ? `x${item.quantity}` : (item.manaCost ? `${item.manaCost} MP` : 'Ready')) : ''}</div>
          ${isOnCooldown ? `<div class="cooldown-overlay">${cd.toFixed(1)}s</div>` : ''}
          <div class="charge-bar-track"><div class="charge-fill"></div></div>
        </button>
      `;
    }

    html += `
        </div>
      </div>
    `;

    this.hotbarEl.innerHTML = html;

    const actionSlotButtons = this.hotbarEl.querySelectorAll('.action-slot-btn');
    actionSlotButtons.forEach(btn => {
      const slotIndex = parseInt(btn.getAttribute('data-slot-index') || '0', 10);

      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        this.gestureEngine.handleInputDown(slotIndex);
      });

      btn.addEventListener('pointerup', e => {
        e.preventDefault();
        this.gestureEngine.handleInputUp(slotIndex);
      });

      btn.addEventListener('pointerleave', () => {
        this.gestureEngine.handleInputUp(slotIndex);
      });
    });
  }

  renderItemIcon(item) {
    if (!item) return '•';
    if (item.icon) return item.icon;
    if (item.item_id === 'health_potion') return '🧪';
    if (item.item_id === 'mana_potion') return '⚗️';
    if (item.item_id === 'torch') return '🔥';
    if (item.item_id === 'arrows') return '🏹';
    if (item.item_id.includes('wand') || item.item_id.includes('scepter')) return '🪄';
    if (item.item_id.includes('spark')) return '✨';
    if (item.item_id.includes('beam')) return '⚡';
    if (item.item_id.includes('light')) return '💡';
    if (item.item_id.includes('bow')) return '🏹';
    if (item.item_id.includes('sword') || item.item_id.includes('slash')) return '⚔️';
    if (item.item_id.includes('warhammer') || item.item_id.includes('hammer')) return '🔨';
    if (item.item_id.includes('prayer') || item.item_id.includes('heal')) return '💖';
    if (item.item_id.includes('armor') || item.item_id.includes('plate')) return '🦺';
    if (item.item_id.includes('buckler') || item.item_id.includes('shield')) return '🛡️';
    if (item.item_id.includes('relic') || item.item_id.includes('amulet') || item.item_id.includes('crest')) return '👑';
    return '📦';
  }

  // ==========================================================================
  // Combat & Event Log UI
  // ==========================================================================

  logCombat(message, category = 'system') {
    if (!this.combatLogScrollEl) return;
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];

    const line = document.createElement('div');
    line.className = `log-line log-${category}`;
    line.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-msg">${this.escapeHtml(message)}</span>`;

    this.combatLogScrollEl.appendChild(line);
    this.combatLogScrollEl.scrollTop = this.combatLogScrollEl.scrollHeight;
  }

  clearCombatLog() {
    if (this.combatLogScrollEl) {
      this.combatLogScrollEl.innerHTML = '';
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ==========================================================================
  // Victory & Defeat Modals
  // ==========================================================================

  showVictoryModal() {
    this.modalOverlayEl.classList.remove('hidden');
    this.modalOverlayEl.innerHTML = `
      <div class="result-modal victory-modal">
        <h2>🏆 ULTIMATE VICTORY!</h2>
        <p class="result-subtitle">Lokarta Subterranean Campaign - All 20 Floors Cleared</p>
        <p>You have illuminated the darkest depths of the subterranean abyss and vanquished the Void Core!</p>
        <div class="character-summary">
          <p><strong>Vocation:</strong> ${(this.player.vocation || 'magician').toUpperCase()}</p>
          <p><strong>Final Level:</strong> Level ${this.player.level || 1}</p>
          <p><strong>Damage Boost:</strong> +${Math.round(((this.player.skillBoosts?.damageMultiplier || 1) - 1) * 100)}% (2.5x Mastery)</p>
          <p><strong>Remaining HP:</strong> ${this.player.hp} / ${this.player.max_hp}</p>
          <p><strong>Remaining MP:</strong> ${this.player.mana} / ${this.player.max_mana}</p>
        </div>
        <button class="action-btn" id="btn-restart">Play Again</button>
      </div>
    `;

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      soundFX.play('click');
      this.modalOverlayEl.classList.add('hidden');
      this.modalOverlayEl.innerHTML = '';
      window.location.reload();
    });
  }

  showGameOverModal() {
    soundFX.play('defeat');
    this.modalOverlayEl.classList.remove('hidden');
    this.modalOverlayEl.innerHTML = `
      <div class="result-modal defeat-modal">
        <h2>💀 YOU HAVE PERISHED</h2>
        <p class="result-subtitle">Floor ${this.player.current_floor || 1}/20 Claims Another Soul</p>
        <p>Your light has been extinguished in the subterranean shadows.</p>
        <button class="action-btn" id="btn-retry">Try Again</button>
      </div>
    `;

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      soundFX.play('click');
      this.modalOverlayEl.classList.add('hidden');
      this.modalOverlayEl.innerHTML = '';
      window.location.reload();
    });
  }
}

// Auto-bootstrap app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.lokarta = new LokartaApp();
});
