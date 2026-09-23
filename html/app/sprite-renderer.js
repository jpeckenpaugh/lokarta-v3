/**
 * Lokarta: Come Into The Light - Sprite & Tile Canvas Renderer
 */

import { CONFIG, TILE_TYPES } from '../engine/index.js';
import { TILE_THEMES_CATALOG, VOCATIONS_CATALOG } from '../data/index.js';

const TILE_RENDERERS = {
  [TILE_TYPES.WALL]: (ctx, screenX, screenY, size, theme) => {
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
  },
  [TILE_TYPES.STAIRS]: (ctx, screenX, screenY, size, theme) => {
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
  },
  [TILE_TYPES.DOOR]: (ctx, screenX, screenY, size, theme) => {
    ctx.fillStyle = theme.door.fill;
    ctx.fillRect(screenX, screenY, size, size);
    ctx.strokeStyle = theme.door.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
  },
  default: (ctx, screenX, screenY, size, theme) => {
    ctx.fillStyle = theme.floor.fill;
    ctx.fillRect(screenX, screenY, size, size);

    ctx.strokeStyle = theme.floor.gridLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, screenY, size, size);

    ctx.fillStyle = theme.floor.accentSquare;
    ctx.fillRect(screenX + 4, screenY + 4, 6, 6);
    ctx.fillRect(screenX + size - 10, screenY + size - 10, 6, 6);
  },
};

const ITEM_RENDERERS = {
  health_potion: (ctx, cx, cy) => {
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1faee';
    ctx.fillRect(cx - 3, cy - 8, 6, 4);
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(cx - 4, cy - 10, 8, 3);
  },
  mana_potion: (ctx, cx, cy) => {
    ctx.fillStyle = '#3a86ff';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1faee';
    ctx.fillRect(cx - 3, cy - 8, 6, 4);
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(cx - 4, cy - 10, 8, 3);
  },
  torch: (ctx, cx, cy) => {
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
  },
  arrows: (ctx, cx, cy) => {
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
  },
  weapon: (ctx, cx, cy, item) => {
    if (item.item_id?.includes('bow')) {
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
    } else if (item.item_id?.includes('warhammer') || item.item_id?.includes('hammer')) {
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
  },
  spell: (ctx, cx, cy) => {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  },
  default: (ctx, cx, cy) => {
    ctx.fillStyle = '#e0a96d';
    ctx.fillRect(cx - 5, cy - 5, 10, 10);
  },
};

const MONSTER_RENDERERS = {
  giant_rat: (ctx, cx, cy) => {
    ctx.fillStyle = '#5a3d28';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(cx + 4, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  },
  crypt_skeleton: (ctx, cx, cy) => {
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
  },
  shadow_cultist: (ctx, cx, cy, monster) => {
    const isElite = monster.type === 'elite_cultist';
    ctx.fillStyle = isElite ? '#3b0764' : '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 12);
    ctx.lineTo(cx + 7, cy + 12);
    ctx.lineTo(cx + 4, cy - 4);
    ctx.lineTo(cx - 4, cy - 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isElite ? '#6b21a8' : '#312e81';
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 6, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
  },
  elite_cultist: (ctx, cx, cy, monster) => {
    MONSTER_RENDERERS.shadow_cultist(ctx, cx, cy, monster);
  },
  abyssal_overlord: (ctx, cx, cy) => {
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
  },
};

const FACING_EYE_OFFSETS = {
  up: { ox: 0, oy: -2 },
  down: { ox: 0, oy: 2 },
  left: { ox: -2, oy: 0 },
  right: { ox: 2, oy: 0 },
};

export class SpriteRenderer {
  static drawTile(ctx, type, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const theme = TILE_THEMES_CATALOG;
    const renderer = TILE_RENDERERS[type] || TILE_RENDERERS.default;
    renderer(ctx, screenX, screenY, size, theme);
  }

  static drawItem(ctx, item, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const cx = screenX + size / 2;
    const cy = screenY + size / 2;

    const renderer = ITEM_RENDERERS[item.item_id] || ITEM_RENDERERS[item.type] || ITEM_RENDERERS.default;
    renderer(ctx, cx, cy, item);

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

    const eyeColor = vocData.eyeColor || '#ffffff';
    SpriteRenderer.drawFacingEyes(ctx, cx, cy - 6, player.facing, eyeColor);
  }

  static drawMonster(ctx, monster, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const cx = screenX + size / 2;
    const cy = screenY + size / 2;

    const renderer = MONSTER_RENDERERS[monster.type] || (monster.isBoss ? MONSTER_RENDERERS.abyssal_overlord : MONSTER_RENDERERS.giant_rat);
    renderer(ctx, cx, cy, monster);

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
    const { ox, oy } = FACING_EYE_OFFSETS[facing] || { ox: 0, oy: 0 };

    ctx.beginPath();
    ctx.arc(headX + ox - 2, headY + oy, 1.2, 0, Math.PI * 2);
    ctx.arc(headX + ox + 2, headY + oy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
