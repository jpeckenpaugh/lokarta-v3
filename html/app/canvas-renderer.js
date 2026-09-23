/**
 * Lokarta: Come Into The Light - Viewport Canvas Renderer
 */

import { CONFIG, LightingSystem } from '../engine/index.js';
import { SpriteRenderer } from './sprite-renderer.js';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.cameraX = 0;
    this.cameraY = 0;
  }

  resize() {
    if (!this.canvas) return;
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
    if (!this.canvas || !this.ctx) return;
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
