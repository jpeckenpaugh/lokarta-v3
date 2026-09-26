/**
 * Lokarta: Come Into The Light - Sprite & Tile Canvas Renderer
 *
 * All artwork is procedural Canvas 2D whose constants were tuned at the
 * original 32px tile size. Every renderer scales by `u = size / 32` so the
 * same art keeps identical proportions on the current CONFIG.GRID_SIZE
 * (now 64px), ready for richer art in future passes.
 */

import { CONFIG, TILE_TYPES } from '../engine/index.js';
import { TILE_THEMES_CATALOG, VOCATIONS_CATALOG } from '../data/index.js';

// Minimal hairline guard so 1px strokes stay visible even if GRID_SIZE shrinks.
const HAIRLINE = (u) => Math.max(1, u);

const TILE_RENDERERS = {
  [TILE_TYPES.WALL]: (ctx, screenX, screenY, size, theme) => {
    const u = size / 32;

    ctx.fillStyle = theme.wall.fill;
    ctx.fillRect(screenX, screenY, size, size);

    ctx.fillStyle = theme.wall.topHighlight;
    ctx.fillRect(screenX, screenY, size, 4 * u);

    ctx.strokeStyle = theme.wall.gridLine;
    ctx.lineWidth = HAIRLINE(u);
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
    ctx.lineWidth = HAIRLINE(u);
    ctx.strokeRect(screenX + 0.5, screenY + 0.5, size - 1, size - 1);
  },
  [TILE_TYPES.STAIRS]: (ctx, screenX, screenY, size, theme) => {
    const u = size / 32;

    ctx.fillStyle = theme.stairs.bg;
    ctx.fillRect(screenX, screenY, size, size);

    for (let i = 0; i < 4; i++) {
      const inset = i * 3 * u;
      ctx.fillStyle = i % 2 === 0 ? theme.stairs.stepEven : theme.stairs.stepOdd;
      ctx.fillRect(screenX + inset, screenY + inset, size - inset * 2, size - inset * 2);
    }

    ctx.fillStyle = theme.stairs.orb;
    ctx.beginPath();
    ctx.arc(screenX + size / 2, screenY + size / 2, 5 * u, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme.stairs.border;
    ctx.lineWidth = 2 * u;
    ctx.strokeRect(screenX + 2 * u, screenY + 2 * u, size - 4 * u, size - 4 * u);
  },
  [TILE_TYPES.DOOR]: (ctx, screenX, screenY, size, theme) => {
    const u = size / 32;

    ctx.fillStyle = theme.door.fill;
    ctx.fillRect(screenX, screenY, size, size);
    ctx.strokeStyle = theme.door.border;
    ctx.lineWidth = 2 * u;
    ctx.strokeRect(screenX + 2 * u, screenY + 2 * u, size - 4 * u, size - 4 * u);
  },
  default: (ctx, screenX, screenY, size, theme) => {
    const u = size / 32;

    ctx.fillStyle = theme.floor.fill;
    ctx.fillRect(screenX, screenY, size, size);

    ctx.strokeStyle = theme.floor.gridLine;
    ctx.lineWidth = HAIRLINE(u);
    ctx.strokeRect(screenX, screenY, size, size);

    ctx.fillStyle = theme.floor.accentSquare;
    ctx.fillRect(screenX + 4 * u, screenY + 4 * u, 6 * u, 6 * u);
    ctx.fillRect(screenX + size - 10 * u, screenY + size - 10 * u, 6 * u, 6 * u);
  },
};

const WEAPON_RENDERERS = {
  archer: (ctx, cx, cy, u) => {
    ctx.strokeStyle = '#c68b59';
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 * u, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * u;
    ctx.beginPath();
    ctx.moveTo(cx + 5 * u, cy - 8 * u);
    ctx.lineTo(cx + 5 * u, cy + 8 * u);
    ctx.stroke();
  },
  paladin: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 6 * u, cy - 8 * u, 12 * u, 6 * u);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 2 * u, cy - 2 * u, 4 * u, 12 * u);
  },
  default: (ctx, cx, cy, u) => {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.moveTo(cx - 6 * u, cy + 6 * u);
    ctx.lineTo(cx + 6 * u, cy - 6 * u);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 8 * u, cy + 4 * u, 4 * u, 4 * u);
  },
};

const ITEM_RENDERERS = {
  health_potion: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(cx, cy + 2 * u, 7 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1faee';
    ctx.fillRect(cx - 3 * u, cy - 8 * u, 6 * u, 4 * u);
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(cx - 4 * u, cy - 10 * u, 8 * u, 3 * u);
  },
  mana_potion: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#3a86ff';
    ctx.beginPath();
    ctx.arc(cx, cy + 2 * u, 7 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1faee';
    ctx.fillRect(cx - 3 * u, cy - 8 * u, 6 * u, 4 * u);
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(cx - 4 * u, cy - 10 * u, 8 * u, 3 * u);
  },
  torch: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(cx - 3 * u, cy - 4 * u, 6 * u, 14 * u);
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(cx, cy - 6 * u, 5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(cx, cy - 5 * u, 3 * u, 0, Math.PI * 2);
    ctx.fill();
  },
  arrows: (ctx, cx, cy, u) => {
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(cx - 6 * u, cy + 6 * u);
    ctx.lineTo(cx + 6 * u, cy - 6 * u);
    ctx.moveTo(cx - 4 * u, cy + 8 * u);
    ctx.lineTo(cx + 8 * u, cy - 4 * u);
    ctx.stroke();
    ctx.fillStyle = '#e9d8a6';
    ctx.fillRect(cx - 8 * u, cy + 5 * u, 4 * u, 4 * u);
  },
  weapon: (ctx, cx, cy, u, item) => {
    const affinity = item?.vocationAffinity;
    const renderer = WEAPON_RENDERERS[affinity] || (item?.item_id?.includes('bow') ? WEAPON_RENDERERS.archer : item?.item_id?.includes('hammer') ? WEAPON_RENDERERS.paladin : WEAPON_RENDERERS.default);
    renderer(ctx, cx, cy, u);
  },
  spell: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 6 * u, 0, Math.PI * 2);
    ctx.fill();
  },
  default: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#e0a96d';
    ctx.fillRect(cx - 5 * u, cy - 5 * u, 10 * u, 10 * u);
  },
};

const MONSTER_RENDERERS = {
  giant_rat: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#5a3d28';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * u, 8 * u, 5 * u, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(cx + 4 * u, cy, 1.5 * u, 0, Math.PI * 2);
    ctx.fill();
  },
  crypt_skeleton: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#dcdde1';
    ctx.beginPath();
    ctx.arc(cx, cy - 4 * u, 5 * u, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#dcdde1';
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 1 * u);
    ctx.lineTo(cx, cy + 10 * u);
    ctx.stroke();

    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(cx - 2 * u, cy - 4 * u, 1 * u, 0, Math.PI * 2);
    ctx.arc(cx + 2 * u, cy - 4 * u, 1 * u, 0, Math.PI * 2);
    ctx.fill();
  },
  shadow_cultist: (ctx, cx, cy, u, monster) => {
    const isElite = monster.type === 'elite_cultist';
    ctx.fillStyle = isElite ? '#3b0764' : '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(cx - 7 * u, cy + 12 * u);
    ctx.lineTo(cx + 7 * u, cy + 12 * u);
    ctx.lineTo(cx + 4 * u, cy - 4 * u);
    ctx.lineTo(cx - 4 * u, cy - 4 * u);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isElite ? '#6b21a8' : '#312e81';
    ctx.beginPath();
    ctx.arc(cx, cy - 6 * u, 6 * u, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(cx - 2 * u, cy - 6 * u, 1.5 * u, 0, Math.PI * 2);
    ctx.arc(cx + 2 * u, cy - 6 * u, 1.5 * u, 0, Math.PI * 2);
    ctx.fill();
  },
  elite_cultist: (ctx, cx, cy, u, monster) => {
    MONSTER_RENDERERS.shadow_cultist(ctx, cx, cy, u, monster);
  },
  abyssal_overlord: (ctx, cx, cy, u) => {
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(cx, cy - 4 * u, 12 * u, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * u, cy - 12 * u);
    ctx.lineTo(cx - 12 * u, cy - 18 * u);
    ctx.moveTo(cx + 8 * u, cy - 12 * u);
    ctx.lineTo(cx + 12 * u, cy - 18 * u);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx - 4 * u, cy - 4 * u, 2.5 * u, 0, Math.PI * 2);
    ctx.arc(cx + 4 * u, cy - 4 * u, 2.5 * u, 0, Math.PI * 2);
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
    const u = size / 32;
    const cx = screenX + size / 2;
    const cy = screenY + size / 2;

    const renderer = ITEM_RENDERERS[item.item_id] || ITEM_RENDERERS[item.type] || ITEM_RENDERERS.default;
    renderer(ctx, cx, cy, u, item);

    if (item.quantity > 1) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(screenX + size - 14 * u, screenY + size - 12 * u, 14 * u, 12 * u);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(9, 9 * u)}px monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(`${item.quantity}`, screenX + size - 2 * u, screenY + size - 3 * u);
    }
  }

  static drawPlayer(ctx, player, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const u = size / 32;
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
    ctx.moveTo(cx - 8 * u, cy + 12 * u);
    ctx.lineTo(cx + 8 * u, cy + 12 * u);
    ctx.lineTo(cx + 6 * u, cy - 4 * u);
    ctx.lineTo(cx - 6 * u, cy - 4 * u);
    ctx.closePath();
    ctx.fill();

    // Accent Trim / Halo
    if (vocKey === 'paladin') {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 14 * u, 6 * u, 2 * u, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1 * u;
      ctx.stroke();
    }

    // Head / Hood / Helmet
    ctx.fillStyle = theme.secondary;
    ctx.beginPath();
    ctx.arc(cx, cy - 6 * u, 6 * u, 0, Math.PI * 2);
    ctx.fill();

    const eyeColor = vocData.eyeColor || '#ffffff';
    SpriteRenderer.drawFacingEyes(ctx, cx, cy - 6 * u, player.facing, eyeColor, u);
  }

  static drawMonster(ctx, monster, screenX, screenY, size = CONFIG.GRID_SIZE) {
    const u = size / 32;
    const cx = screenX + size / 2;
    const cy = screenY + size / 2;

    const renderer = MONSTER_RENDERERS[monster.type] || (monster.isBoss ? MONSTER_RENDERERS.abyssal_overlord : MONSTER_RENDERERS.giant_rat);
    renderer(ctx, cx, cy, u, monster);

    // Health Bar
    if (monster.hp < monster.max_hp) {
      const barW = 24 * u;
      const barH = 3 * u;
      const barX = cx - barW / 2;
      const barY = cy - 16 * u;
      const pct = Math.max(0, monster.hp / monster.max_hp);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barW * pct, barH);
    }
  }

  static drawFacingEyes(ctx, headX, headY, facing, eyeColor = '#44ccff', u = 1) {
    ctx.fillStyle = eyeColor;
    const { ox, oy } = FACING_EYE_OFFSETS[facing] || { ox: 0, oy: 0 };

    ctx.beginPath();
    ctx.arc(headX + ox * u - 2 * u, headY + oy * u, 1.2 * u, 0, Math.PI * 2);
    ctx.arc(headX + ox * u + 2 * u, headY + oy * u, 1.2 * u, 0, Math.PI * 2);
    ctx.fill();
  }
}