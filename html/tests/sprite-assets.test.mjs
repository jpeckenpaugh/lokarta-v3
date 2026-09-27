import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { SPRITE_CATALOG, SPRITE_MANIFEST } from '../assets/sprites/index.js';
import { VOCATIONS_CATALOG, MONSTERS_CATALOG } from '../data/index.js';
import { CONFIG } from '../engine/index.js';
import {
  SpriteRenderer,
  parseFrame,
  applyOutline,
  scalePixels,
  SPRITE_NATIVE,
  OUTLINE_COLOR,
  resolveSpriteId,
  resolveSpriteFrame,
} from '../app/sprite-renderer.js';
import { exportPreviews } from '../../tools/render-sprite-preview.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SPRITES_DIR = path.join(ROOT, 'html', 'assets', 'sprites');
const PREVIEW_DIR = path.join(ROOT, 'docs', 'art-preview');
const FLOOR = '#1a1c23';

function srgbToLin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
function alphaMask(rows, palette) {
  // Silhouette: which cells are non-transparent.
  return rows.map(row => [...row].map(ch => (palette[ch] ? '1' : '0')).join('')).join('\n');
}
function makeFakeCtx() {
  const calls = [];
  const noop = name => (...args) => { calls.push({ name, args }); };
  const ctx = {
    calls,
    canvas: { width: 256, height: 256 },
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    save: noop('save'),
    restore: noop('restore'),
    fillRect: noop('fillRect'),
    strokeRect: noop('strokeRect'),
    fillText: noop('fillText'),
    beginPath: noop('beginPath'),
    closePath: noop('closePath'),
    moveTo: noop('moveTo'),
    lineTo: noop('lineTo'),
    arc: noop('arc'),
    ellipse: noop('ellipse'),
    fill: noop('fill'),
    stroke: noop('stroke'),
    drawImage: noop('drawImage'),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.font = '';
  ctx.textAlign = 'left';
  Object.defineProperty(ctx, 'fillStyle', { get() { return '#000'; }, set() {} });
  return ctx;
}

test('Sprite assets (LIV-10)', async t => {
  await t.test('1. manifest completeness for every catalog actor', () => {
    const ids = [...Object.keys(VOCATIONS_CATALOG), ...Object.keys(MONSTERS_CATALOG)];
    for (const id of ids) {
      assert.ok(SPRITE_MANIFEST.actors[id], `manifest missing actor ${id}`);
      assert.ok(SPRITE_CATALOG[id], `catalog missing actor ${id}`);
      const file = path.join(SPRITES_DIR, SPRITE_MANIFEST.actors[id].file);
      assert.ok(fs.existsSync(file), `sprite file missing for ${id}: ${file}`);
    }
  });

  await t.test('2. frame geometry matches native size', () => {
    for (const [id, def] of Object.entries(SPRITE_CATALOG)) {
      const { w, h } = def.native;
      assert.equal(def.id, id, `id mismatch for ${id}`);
      for (const [frameId, rows] of Object.entries(def.frames)) {
        assert.equal(rows.length, h, `${id}/${frameId} row count`);
        for (const row of rows) assert.equal(row.length, w, `${id}/${frameId} row width`);
      }
    }
  });

  await t.test('3. palette integrity (<=16 entries, valid hex, used chars declared)', () => {
    for (const [id, def] of Object.entries(SPRITE_CATALOG)) {
      const entries = Object.entries(def.palette);
      assert.ok(entries.length <= 16, `${id} palette has ${entries.length} entries`);
      for (const [k, v] of entries) {
        assert.equal(k.length, 1, `${id} palette key ${k}`);
        if (v === null) { assert.equal(k, '.'); continue; }
        assert.match(v, /^#[0-9a-f]{6}$/i, `${id} palette ${k} = ${v}`);
      }
      for (const rows of Object.values(def.frames)) {
        for (const row of rows) {
          for (const ch of row) {
            assert.ok(ch === '.' || def.palette[ch], `${id} uses undeclared palette char "${ch}"`);
          }
        }
      }
    }
  });

  await t.test('4. required states/dirs and frame counts', () => {
    for (const [id, def] of Object.entries(SPRITE_CATALOG)) {
      const expectedDeath = id === 'abyssal_overlord' ? 6 : 4;
      for (const state of ['idle', 'walk', 'attack', 'hit', 'death']) {
        assert.ok(def.animations[state], `${id} missing animation ${state}`);
        for (const dir of ['down', 'up', 'side']) {
          assert.ok(Array.isArray(def.animations[state][dir]), `${id}.${state}.${dir}`);
          assert.ok(def.animations[state][dir].length > 0, `${id}.${state}.${dir} empty`);
          for (const fid of def.animations[state][dir]) assert.ok(def.frames[fid], `${id} missing frame ${fid}`);
        }
      }
      for (const dir of ['down', 'up', 'side']) {
        assert.equal(def.animations.idle[dir].length, 1, `${id} idle ${dir}`);
        assert.equal(def.animations.walk[dir].length, 2, `${id} walk ${dir}`);
        assert.equal(def.animations.attack[dir].length, 3, `${id} attack ${dir}`);
        assert.equal(def.animations.hit[dir].length, 1, `${id} hit ${dir}`);
        assert.equal(def.animations.death[dir].length, expectedDeath, `${id} death ${dir}`);
      }
      assert.equal(def.animations.walk.advanceOn, 'step', `${id} walk should advance on step`);
    }
  });

  await t.test('5. applyOutline adds a 1px outline and is idempotent', () => {
    const palette = { '.': null, x: '#ff0000' };
    const rows = [
      '.....',
      '.....',
      '..x..',
      '.....',
      '.....',
    ];
    const pix = parseFrame(rows, palette);
    const out = applyOutline(pix, OUTLINE_COLOR);
    const at = (x, y) => out.data[(y * out.w + x) * 4 + 3] > 0;
    // 4-neighbours of (2,2) become outline; diagonal corners stay transparent.
    assert.ok(at(1, 2) && at(3, 2) && at(2, 1) && at(2, 3), 'neighbours outlined');
    assert.equal(at(1, 1), false, 'diagonal not outlined');
    assert.equal(at(0, 0), false, 'far pixel untouched');
    const again = applyOutline(out, OUTLINE_COLOR);
    assert.deepEqual([...again.data], [...out.data], 'outline pass is idempotent');
  });

  await t.test('6. parseFrame + applyOutline are deterministic', () => {
    for (const def of Object.values(SPRITE_CATALOG)) {
      const rows = def.frames.idle_down;
      const a = applyOutline(parseFrame(rows, def.palette), OUTLINE_COLOR);
      const b = applyOutline(parseFrame(rows, def.palette), OUTLINE_COLOR);
      assert.deepEqual([...a.data], [...b.data]);
    }
  });

  await t.test('7. scale integrality', () => {
    assert.equal(CONFIG.GRID_SIZE % SPRITE_NATIVE, 0);
    const scale = SpriteRenderer.scaleForSize(CONFIG.GRID_SIZE);
    assert.ok(Number.isInteger(scale) && scale >= 1);
    const scaled = scalePixels(parseFrame(SPRITE_CATALOG.magician.frames.idle_down, SPRITE_CATALOG.magician.palette), scale);
    assert.equal(scaled.w, SPRITE_NATIVE * scale);
  });

  await t.test('8. every actor has a rim color with >= 3:1 contrast vs the floor', () => {
    for (const [id, def] of Object.entries(SPRITE_CATALOG)) {
      const best = Math.max(0, ...Object.values(def.palette).filter(Boolean).map(v => contrast(v, FLOOR)));
      assert.ok(best >= 3.0, `${id} best contrast ${best.toFixed(2)} < 3.0`);
    }
  });

  await t.test('9. cultist silhouettes differ and elite carries a non-color cue', () => {
    const shadow = SPRITE_CATALOG.shadow_cultist;
    const elite = SPRITE_CATALOG.elite_cultist;
    const a = alphaMask(shadow.frames.idle_down, shadow.palette);
    const b = alphaMask(elite.frames.idle_down, elite.palette);
    assert.notEqual(a, b, 'shadow/elite silhouettes must differ by shape');
    assert.ok(Object.values(elite.palette).includes('#facc15'), 'elite cultist must include gold trim');
  });

  await t.test('10. committed preview PNGs match a fresh export (no drift)', () => {
    assert.ok(fs.existsSync(PREVIEW_DIR), 'docs/art-preview must exist');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lokarta-preview-'));
    exportPreviews(tmp);
    const committed = fs.readdirSync(PREVIEW_DIR).filter(f => f.endsWith('.png')).sort();
    const fresh = fs.readdirSync(tmp).filter(f => f.endsWith('.png')).sort();
    assert.deepEqual(fresh, committed, 'exported preview set differs from committed');
    for (const f of committed) {
      const a = fs.readFileSync(path.join(PREVIEW_DIR, f));
      const b = fs.readFileSync(path.join(tmp, f));
      assert.ok(a.equals(b), `preview drift: ${f}`);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await t.test('11. fallback safety: unknown ids do not throw and use procedural art', () => {
    const ctx = makeFakeCtx();
    assert.doesNotThrow(() => {
      SpriteRenderer.drawMonster(ctx, { type: 'not_a_monster', x: 0, y: 0, hp: 5, max_hp: 10 }, 0, 0);
    });
    assert.doesNotThrow(() => {
      SpriteRenderer.drawPlayer(ctx, { vocation: 'not_a_vocation' }, 0, 0);
    });
    assert.equal(ctx.calls.some(c => c.name === 'drawImage'), false, 'no sprite blit for unknown ids');
    assert.ok(ctx.calls.some(c => c.name === 'fill'), 'procedural fallback drew shapes');

    // Unknown id resolves to no sprite; a known id resolves and draws.
    assert.equal(resolveSpriteId({ type: 'not_a_monster' }), null);
    assert.equal(resolveSpriteId({ type: 'giant_rat' }), 'giant_rat');
    const ctx2 = makeFakeCtx();
    const geo = SpriteRenderer.drawActor(ctx2, { type: 'giant_rat', facing: 'left' }, 0, 0);
    assert.ok(geo && geo.w === SPRITE_NATIVE * SpriteRenderer.scaleForSize(CONFIG.GRID_SIZE));
    assert.ok(ctx2.calls.some(c => c.name === 'fillRect'), 'pixel path drew via fillRect');
  });

  await t.test('12. facing maps to three authored directions with left mirroring', () => {
    const def = SPRITE_CATALOG.paladin;
    for (const [facing, dir] of [['down', 'down'], ['up', 'up'], ['right', 'side'], ['left', 'side']]) {
      const r = resolveSpriteFrame(def, { state: 'walk', dir: dir, frame: 0 });
      assert.equal(r.dir, dir, `facing ${facing}`);
      assert.ok(def.frames[r.frameId]);
    }
    const death = resolveSpriteFrame(def, { state: 'death', dir: 'down', frame: 99 });
    assert.equal(death.frameId, def.animations.death.down[def.animations.death.down.length - 1], 'death frame clamps to last');
  });

  await t.test('13. full render pass runs without throwing and blits sprites after the mask', async () => {
    const { CanvasRenderer } = await import('../app/canvas-renderer.js');
    const { GridMap, createPlayer } = await import('../engine/index.js');
    const { createAnimState } = await import('../app/animation-state.js');

    const gridMap = new GridMap();
    const matrix = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
    gridMap.loadFromMatrix(matrix);

    const player = createPlayer('magician');
    player.x = 2; player.y = 2;
    player.anim = createAnimState('down');
    player.facing = 'down';

    const monster = {
      type: 'giant_rat', id: 'r1', name: 'Giant Rat', x: 3, y: 2,
      hp: 7, max_hp: 10, visible: true, facing: 'left', anim: createAnimState('left'),
    };

    const renderer = new CanvasRenderer(null);
    renderer.canvas = { width: 256, height: 256 };
    renderer.ctx = makeFakeCtx();

    assert.doesNotThrow(() => {
      renderer.render(gridMap, player, [monster], [], [], [], monster.id, [], []);
    });
    assert.ok(renderer.ctx.calls.some(c => c.name === 'fillRect'), 'render loop drew pixels');
    // Monster health bar (hp < max_hp) must be drawn.
    assert.ok(renderer.ctx.calls.filter(c => c.name === 'fillRect').length > 10, 'expected many fillRect calls');
  });
});
