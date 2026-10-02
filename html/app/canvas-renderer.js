/**
 * Lokarta: Come Into The Light - Viewport Canvas Renderer
 */

import { CONFIG, LightingSystem, TILE_TYPES } from '../engine/index.js';
import { SpriteRenderer, themeForFloor } from './sprite-renderer.js';

/** True when a DOOR or GATED_DOOR tile sits within `radius` of (x, y). */
function isNearDoor(gridMap, x, y, radius) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (!gridMap.isInBounds(tx, ty)) continue;
      const type = gridMap.tiles[ty][tx].type;
      if (type === TILE_TYPES.DOOR || type === TILE_TYPES.GATED_DOOR) return true;
    }
  }
  return false;
}

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.cameraX = 0;
    this.cameraY = 0;
    this.tileSize = CONFIG.GRID_SIZE;
  }

  /**
   * Sets the tile size used for draw and camera math (pixel-zoom option).
   * `auto` maps to the canonical 64 px tile.
   * @param {number} px
   * @returns {number} the applied tile size
   */
  setZoom(px) {
    const size = Number(px);
    if (!Number.isFinite(size) || size <= 0) return this.tileSize;
    this.tileSize = size;
    // Keep camera, projectile, and sprite math consistent with the chosen zoom.
    CONFIG.GRID_SIZE = size;
    return size;
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
    particles = [],
    deathEffects = [],
    chests = []
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

    // Resolve the tower floor theme once; per-level variation is data-driven.
    const theme = themeForFloor(player.current_floor || 1);
    const featureScan = !!(theme.decor && theme.decor.banner > 0);
    // Reused per-tile options object: no per-frame allocation in the tile loop.
    const tileOpts = {
      theme,
      x: 0,
      y: 0,
      tier: null,
      open: false,
      hasFloorBelow: false,
      adjacentFloor: false,
      nearDoor: false,
    };

    // 1. Tiles Layer
    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        const tile = gridMap.tiles[y][x];
        if (!tile.isLit) continue;
        const screenX = x * CONFIG.GRID_SIZE - this.cameraX;
        const screenY = y * CONFIG.GRID_SIZE - this.cameraY;

        tileOpts.x = x;
        tileOpts.y = y;
        tileOpts.tier = tile.gateTier || null;
        tileOpts.open = !!tile.gateOpen;
        if (tile.type === TILE_TYPES.WALL) {
          tileOpts.hasFloorBelow = gridMap.isInBounds(x, y + 1) && gridMap.tiles[y + 1][x].type !== TILE_TYPES.WALL;
          tileOpts.adjacentFloor =
            tileOpts.hasFloorBelow ||
            (gridMap.isInBounds(x, y - 1) && gridMap.tiles[y - 1][x].type !== TILE_TYPES.WALL) ||
            (gridMap.isInBounds(x - 1, y) && gridMap.tiles[y][x - 1].type !== TILE_TYPES.WALL) ||
            (gridMap.isInBounds(x + 1, y) && gridMap.tiles[y][x + 1].type !== TILE_TYPES.WALL);
          tileOpts.nearDoor = featureScan ? isNearDoor(gridMap, x, y, 2) : false;
        }
        SpriteRenderer.drawTile(ctx, tile.type, screenX, screenY, CONFIG.GRID_SIZE, tileOpts);
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

    // 2b. Chests Layer: one per room, visible on first lighting, culled when
    //     unlit (chests are world entities, not tile items).
    for (const chest of chests) {
      if (!chest) continue;
      if (chest.x < startTileX || chest.x > endTileX || chest.y < startTileY || chest.y > endTileY) continue;
      const tile = gridMap.tiles[chest.y]?.[chest.x];
      if (!tile || !tile.isLit) continue;
      SpriteRenderer.drawChest(
        ctx,
        chest,
        chest.x * CONFIG.GRID_SIZE - this.cameraX,
        chest.y * CONFIG.GRID_SIZE - this.cameraY
      );
    }

    // 3. World light: fog hides unexplored space, not visible enemies. Actors    // and projectiles therefore draw after the mask (docs/art-direction.md §6.3).
    this.renderLightMask(ctx, gridMap, player, ambientLights, width, height, projectiles);

    // 4. Transient death effects (actors playing their collapse animation)
    for (const fx of deathEffects) {
      if (!fx) continue;
      SpriteRenderer.drawActor(
        ctx,
        { spriteId: fx.spriteId, vocation: fx.vocation, type: fx.type, facing: fx.facing || 'down', anim: fx.anim },
        fx.x * CONFIG.GRID_SIZE - this.cameraX,
        fx.y * CONFIG.GRID_SIZE - this.cameraY,
        { size: CONFIG.GRID_SIZE }
      );
    }

    // 5. Monsters Layer (distance-dimmed so silhouettes survive the fog edge)
    const playerRadius = Math.max(1, LightingSystem.computePlayerRadius(player));
    for (const monster of monsters) {
      if (monster.visible && monster.hp > 0) {
        const screenX = monster.x * CONFIG.GRID_SIZE - this.cameraX;
        const screenY = monster.y * CONFIG.GRID_SIZE - this.cameraY;
        const isBoss = monster.isBoss || monster.type === 'abyssal_overlord';
        const d = Math.hypot(monster.x - player.x, monster.y - player.y) / playerRadius;
        monster._dim = isBoss ? 1 : Math.max(0.65, Math.min(1, 1 - 0.35 * d));
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

    // 6. Player Layer
    const playerScreenX = player.x * CONFIG.GRID_SIZE - this.cameraX;
    const playerScreenY = player.y * CONFIG.GRID_SIZE - this.cameraY;
    SpriteRenderer.drawPlayer(ctx, player, playerScreenX, playerScreenY);

    // 7. Projectiles & Impact Particles (after the mask, so they read at range)
    this.renderProjectiles(ctx, projectiles);
    this.renderParticles(ctx, particles);

    // 8. Floating Combat Damage & XP Numbers
    this.renderFloatingTexts(ctx, floatingTexts);
  }

  renderProjectiles(ctx, projectiles) {
    for (const p of projectiles) {
      if (p.type === 'energy_beam' && p.waves) {
        ctx.save();
        const stepColors = p.visual?.stepColors || ['#ff00aa', '#ff66dd', '#d946ef', '#a855f7'];

        // Render all wave steps that have started expanding
        for (let idx = 0; idx < p.waves.length; idx++) {
          const wave = p.waves[idx];
          if (p.elapsedMs < wave.delayMs) continue; // Not yet reached

          const ageMs = p.elapsedMs - wave.delayMs;
          const stepAlpha = Math.max(0.2, 1.0 - (idx * 0.15));
          const fadeAlpha = Math.max(0, 1.0 - ageMs / 400); // 400ms visible duration
          const alpha = stepAlpha * fadeAlpha;

          const stepColor = stepColors[idx] || stepColors[stepColors.length - 1];

          ctx.globalAlpha = alpha;
          for (const tile of wave.tiles) {
            const sx = tile.x * CONFIG.GRID_SIZE - this.cameraX;
            const sy = tile.y * CONFIG.GRID_SIZE - this.cameraY;

            if (tile.isWall) {
              ctx.fillStyle = 'rgba(255, 0, 170, 0.4)';
              ctx.fillRect(sx + 4, sy + 4, CONFIG.GRID_SIZE - 8, CONFIG.GRID_SIZE - 8);
            } else {
              // Radial Energy Wave Aura
              const cx = sx + CONFIG.GRID_SIZE / 2;
              const cy = sy + CONFIG.GRID_SIZE / 2;
              const auraGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, CONFIG.GRID_SIZE * 0.75);
              auraGrad.addColorStop(0, '#ffffff');
              auraGrad.addColorStop(0.4, stepColor);
              auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

              ctx.fillStyle = auraGrad;
              ctx.beginPath();
              ctx.arc(cx, cy, CONFIG.GRID_SIZE * 0.75, 0, Math.PI * 2);
              ctx.fill();

              // Glowing Square Border
              ctx.strokeStyle = stepColor;
              ctx.lineWidth = Math.max(1, 3 - idx * 0.5);
              ctx.strokeRect(sx + 3, sy + 3, CONFIG.GRID_SIZE - 6, CONFIG.GRID_SIZE - 6);
            }
          }
        }
        ctx.restore();
      } else if (p.type === 'swoosh') {
        this.renderSwoosh(ctx, p);
      } else {
        const startPixelX = p.sourceX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
        const startPixelY = p.sourceY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;

        let curX, curY;
        if (typeof p.currentPxX === 'number' && typeof p.currentPxY === 'number') {
          curX = p.currentPxX - this.cameraX;
          curY = p.currentPxY - this.cameraY;
        } else {
          const progress = Math.min(1.0, p.elapsedMs / p.durationMs);
          const targetPixelX = p.targetX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
          const targetPixelY = p.targetY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;

          curX = startPixelX + (targetPixelX - startPixelX) * progress;
          curY = startPixelY + (targetPixelY - startPixelY) * progress;
        }

        const v = p.visual || {};
        const trailType = v.trailType || 'solid';
        const mainColor = p.color || '#44ccff';
        const glowColor = v.glowColor || '#00eeff';
        const headRadius = v.headRadius || 5;

        // Capped Trail Tail Calculation (Max 5 tiles solid, fading over 2 tiles)
        const maxSolidPx = (v.maxTrailLengthTiles || 5.0) * CONFIG.GRID_SIZE;
        const fadePx = (v.trailFadeTiles || 2.0) * CONFIG.GRID_SIZE;
        const maxTotalTrailPx = maxSolidPx + fadePx;

        const totalDistPx = Math.hypot(curX - startPixelX, curY - startPixelY);
        const effectiveTrailPx = Math.min(totalDistPx, maxTotalTrailPx);

        let tailX = startPixelX;
        let tailY = startPixelY;
        if (totalDistPx > maxTotalTrailPx && totalDistPx > 0) {
          const ratio = (totalDistPx - maxTotalTrailPx) / totalDistPx;
          tailX = startPixelX + (curX - startPixelX) * ratio;
          tailY = startPixelY + (curY - startPixelY) * ratio;
        }

        ctx.save();

        if (trailType === 'electric') {
          const segments = v.trailSegments || 6;
          const jitter = v.trailJitterPx || 4;
          const trailWidth = v.trailWidth || 3;

          for (let i = 0; i < segments; i++) {
            const ratio1 = i / segments;
            const ratio2 = (i + 1) / segments;

            const p1x = tailX + (curX - tailX) * ratio1;
            const p1y = tailY + (curY - tailY) * ratio1;
            const p2x = tailX + (curX - tailX) * ratio2;
            const p2y = tailY + (curY - tailY) * ratio2;

            const distFromHead1 = (1 - ratio1) * effectiveTrailPx;
            const alpha1 = distFromHead1 <= maxSolidPx ? 1.0 : Math.max(0, 1.0 - (distFromHead1 - maxSolidPx) / fadePx);

            const offsetX = i < segments - 1 ? (Math.random() - 0.5) * jitter * 2 : 0;
            const offsetY = i < segments - 1 ? (Math.random() - 0.5) * jitter * 2 : 0;

            // Outer Glow Segment
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = trailWidth + 2;
            ctx.globalAlpha = 0.4 * alpha1;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x + offsetX, p2y + offsetY);
            ctx.stroke();

            // White Core Segment
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, trailWidth - 1);
            ctx.globalAlpha = 0.95 * alpha1;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x + offsetX, p2y + offsetY);
            ctx.stroke();
          }
        } else {
          // Fallback solid trail
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
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

  /**
   * Draws a basic melee "swoosh": an arc/swipe in front of the player oriented
   * toward the target, fading over the swing duration. Uses only existing
   * rendering primitives (no new art assets).
   */
  renderSwoosh(ctx, p) {
    const sw = CONFIG.GRID_SIZE;
    const cx = p.sourceX * sw + sw / 2 - this.cameraX;
    const cy = p.sourceY * sw + sw / 2 - this.cameraY;
    const tx = p.targetX * sw + sw / 2 - this.cameraX;
    const ty = p.targetY * sw + sw / 2 - this.cameraY;

    const progress = Math.min(1, p.elapsedMs / (p.durationMs || 280));
    const angle = Math.atan2(ty - cy, tx - cx);
    const v = p.visual || {};
    const sweep = ((v.arcSweepDeg ?? 90) * Math.PI) / 180;
    const radius = sw * (v.arcRadiusTiles ?? 0.9);
    const color = p.color || '#e2e8f0';
    const glowColor = v.glowColor || '#ffffff';
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    // Leading edge sweeps from the far side of the arc toward the target.
    const leadEnd = angle - sweep / 2 + sweep * Math.min(1, progress * 2.2);

    // Outer glow arc
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = sw * 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle - sweep / 2, angle + sweep / 2);
    ctx.stroke();

    // White core arc (grows along the swing)
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = sw * 0.09;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle - sweep / 2, Math.max(angle - sweep / 2, leadEnd));
    ctx.stroke();

    // Colored tip accent at the leading edge
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = sw * 0.14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.max(angle - sweep / 2, leadEnd - sweep * 0.18), leadEnd);
    ctx.stroke();
    ctx.restore();
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
        let curX, curY;
        if (typeof p.currentPxX === 'number' && typeof p.currentPxY === 'number') {
          curX = p.currentPxX - this.cameraX;
          curY = p.currentPxY - this.cameraY;
        } else {
          const progress = Math.min(1.0, p.elapsedMs / p.durationMs);
          const startPixelX = p.sourceX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
          const startPixelY = p.sourceY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;
          const targetPixelX = p.targetX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraX;
          const targetPixelY = p.targetY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 - this.cameraY;

          curX = startPixelX + (targetPixelX - startPixelX) * progress;
          curY = startPixelY + (targetPixelY - startPixelY) * progress;
        }

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
