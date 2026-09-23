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

  render(
    gridMap,
    player,
    monsters,
    ambientLights,
    projectiles,
    floatingTexts,
    selectedMonsterId,
    particles = []
  ) {
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
        if (!tile.isLit) continue;
        const screenX = x * CONFIG.GRID_SIZE - this.cameraX;
        const screenY = y * CONFIG.GRID_SIZE - this.cameraY;
        SpriteRenderer.drawTile(ctx, tile.type, screenX, screenY);
      }
    }

    // 2. Ground Items Layer
    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        const tile = gridMap.tiles[y][x];
        if (!tile.isLit || tile.items.length === 0) continue;
        const screenX = x * CONFIG.GRID_SIZE - this.cameraX;
        const screenY = y * CONFIG.GRID_SIZE - this.cameraY;
        const topItem = tile.items[tile.items.length - 1];
        SpriteRenderer.drawItem(ctx, topItem, screenX, screenY);
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

    // 5. Projectiles & Impact Particles
    this.renderProjectiles(ctx, projectiles);
    this.renderParticles(ctx, particles);

    // 6. Dynamic Continuous Radial Darkness & Lighting
    this.renderLightMask(ctx, gridMap, player, ambientLights, width, height, projectiles);

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

        const v = p.visual || {};
        const trailType = v.trailType || 'solid';
        const mainColor = p.color || '#44ccff';
        const glowColor = v.glowColor || '#00eeff';
        const headRadius = v.headRadius || 5;

        ctx.save();

        if (trailType === 'electric') {
          const segments = v.trailSegments || 5;
          const jitter = v.trailJitterPx || 4;
          const trailWidth = v.trailWidth || 3;

          // Outer Electric Glow Line
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = trailWidth + 2;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(startPixelX, startPixelY);

          for (let i = 1; i <= segments; i++) {
            const segRatio = i / segments;
            const px = startPixelX + (curX - startPixelX) * segRatio;
            const py = startPixelY + (curY - startPixelY) * segRatio;
            const offsetX = i < segments ? (Math.random() - 0.5) * jitter * 2 : 0;
            const offsetY = i < segments ? (Math.random() - 0.5) * jitter * 2 : 0;
            ctx.lineTo(px + offsetX, py + offsetY);
          }
          ctx.stroke();

          // Core Electric Spark Line
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, trailWidth - 1);
          ctx.globalAlpha = 0.95;
          ctx.beginPath();
          ctx.moveTo(startPixelX, startPixelY);

          for (let i = 1; i <= segments; i++) {
            const segRatio = i / segments;
            const px = startPixelX + (curX - startPixelX) * segRatio;
            const py = startPixelY + (curY - startPixelY) * segRatio;
            const offsetX = i < segments ? (Math.random() - 0.5) * jitter * 1.5 : 0;
            const offsetY = i < segments ? (Math.random() - 0.5) * jitter * 1.5 : 0;
            ctx.lineTo(px + offsetX, py + offsetY);
          }
          ctx.stroke();
        } else {
          // Fallback solid trail
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startPixelX, startPixelY);
          ctx.lineTo(curX, curY);
          ctx.stroke();
        }

        // Projectile Head Radial Glow
        const glowRadius = v.glowRadiusPx || 14;
        const headGrad = ctx.createRadialGradient(curX, curY, 1, curX, curY, glowRadius);
        headGrad.addColorStop(0, '#ffffff');
        headGrad.addColorStop(0.3, glowColor);
        headGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(curX, curY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Solid Core Head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(curX, curY, Math.max(2, headRadius - 2), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  renderParticles(ctx, particles) {
    if (!particles || particles.length === 0) return;
    ctx.save();
    for (const pt of particles) {
      const screenX = pt.x - this.cameraX;
      const screenY = pt.y - this.cameraY;
      const alpha = Math.max(0, 1.0 - pt.elapsedMs / pt.durationMs);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderLightMask(ctx, gridMap, player, ambientLights, viewportWidth, viewportHeight, projectiles = []) {
    ctx.save();

    // Smooth continuous radial darkness dissolve over player FOV
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
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

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

    // 4. Subtle tile lighting illumination around in-flight projectiles
    for (const p of projectiles) {
      if (p.visual?.illuminateTiles) {
        const progress = Math.min(1.0, p.elapsedMs / p.durationMs);
        const startPixelX = p.sourceX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
        const startPixelY = p.sourceY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;
        const targetPixelX = p.targetX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
        const targetPixelY = p.targetY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;

        const curX = startPixelX + (targetPixelX - startPixelX) * progress;
        const curY = startPixelY + (targetPixelY - startPixelY) * progress;
        const projRadiusPx = (p.visual.lightRadiusTiles || 1.5) * CONFIG.GRID_SIZE;

        const projGrad = ctx.createRadialGradient(curX, curY, 2, curX, curY, projRadiusPx);
        projGrad.addColorStop(0, 'rgba(100, 220, 255, 0.35)');
        projGrad.addColorStop(0.5, 'rgba(68, 204, 255, 0.15)');
        projGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = projGrad;
        ctx.beginPath();
        ctx.arc(curX, curY, projRadiusPx, 0, Math.PI * 2);
        ctx.fill();
      }
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
