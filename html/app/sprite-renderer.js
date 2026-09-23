/**
 * Lokarta: Come Into The Light - Sprite & Tile Canvas Renderer
 */

import { CONFIG, TILE_TYPES } from '../engine/index.js';
import { TILE_THEMES_CATALOG, VOCATIONS_CATALOG } from '../data/index.js';

export class SpriteRenderer {
  static drawTile(ctx, type, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const theme = TILE_THEMES_CATALOG;
    if (type === TILE_TYPES.WALL) {
      ctx.fillStyle = theme.wall.fill;
      ctx.fillRect(screenX, screenY, size, size);

      ctx.fillStyle = theme.wall.topHighlight;
      ctx.fillRect(screenX, screenY, size, 4);

      ctx.strokeStyle = theme.wall.gridLine;
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

      ctx.strokeStyle = theme.wall.border;
      ctx.strokeRect(screenX + 0.5, screenY + 0.5, size - 1, size - 1);
    } else if (type === TILE_TYPES.STAIRS) {
      ctx.fillStyle = theme.stairs.bg;
      ctx.fillRect(screenX, screenY, size, size);

      for (let i = 0; i < 4; i++) {
        const inset = i * 3;
        ctx.fillStyle = i % 2 === 0 ? theme.stairs.stepEven : theme.stairs.stepOdd;
        ctx.fillRect(screenX + inset, screenY + inset, size - inset * 2, size - inset * 2);
      }

      ctx.fillStyle = theme.stairs.orb;
      ctx.beginPath();
      ctx.arc(screenX + size / 2, screenY + size / 2, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = theme.stairs.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
    } else if (type === TILE_TYPES.DOOR) {
      ctx.fillStyle = theme.door.fill;
      ctx.fillRect(screenX, screenY, size, size);
      ctx.strokeStyle = theme.door.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
    } else {
      ctx.fillStyle = theme.floor.fill;
      ctx.fillRect(screenX, screenY, size, size);

      ctx.strokeStyle = theme.floor.gridLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, size, size);

      ctx.fillStyle = theme.floor.accentSquare;
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

    const vocKey = player.vocation || 'magician';
    const vocData = VOCATIONS_CATALOG[vocKey] || VOCATIONS_CATALOG.magician;
    const theme = vocData.renderTheme || { primary: '#5c2d91', accent: '#ffd700', secondary: '#7a3cb8' };

    // Body Outfit
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 12);
    ctx.lineTo(cx + 8, cy + 12);
    ctx.lineTo(cx + 6, cy - 4);
    ctx.lineTo(cx - 6, cy - 4);
    ctx.closePath();
    ctx.fill();

    // Accent Trim / Halo
    if (vocKey === 'paladin') {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 14, 6, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Head / Hood / Helmet
    ctx.fillStyle = theme.secondary;
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    const eyeColors = { magician: '#44ccff', archer: '#e9d8a6', fighter: '#f87171', paladin: '#38bdf8' };
    SpriteRenderer.drawFacingEyes(ctx, cx, cy - 6, player.facing, eyeColors[vocKey] || '#ffffff');
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
