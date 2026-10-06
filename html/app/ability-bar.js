/**
 * Lokarta: Come Into The Light - Mobile Ability Bar (LIV-45)
 *
 * The on-screen mirror of the `q/w/e/r` + `1/2/3/4` keyboard slots, rendered
 * bottom-right on touch layouts. It reuses the existing dispatch paths so touch
 * and keyboard can never diverge:
 *
 *   - Equipment `q/w/e/r` -> `app.executeHandCombat(slot)`
 *   - Active `1/2/3/4`   -> `app.gestureEngine.handleInputDown/Up` (single tap)
 *                           and `app.handleGestureEvent(...)` (held once)
 *
 * Pressing and holding an equipment ability for `autofireHoldMs` casts once at
 * the threshold and then repeats on `autofireRepeatMs` while `canAutoFire`
 * passes (see `autofire.js`). Active slots 1-4 fire exactly once per hold.
 *
 * DOM is built once and diffed; state is repainted from the 10 Hz HUD refresh.
 */

import { UI_CATALOG, ITEMS_CATALOG } from '../data/index.js';
import { EQUIPMENT_KEY_MAP, ACTIVE_SLOT_KEYS } from '../engine/config.js';
import { HUDManager } from './hud-manager.js';
import {
  autofireTimings,
  resolveAbilityRef,
  isRepeatable,
  canAutoFire,
  evaluateGuard,
} from './autofire.js';

const CLASS_TINTS = ['voc-fighter', 'voc-paladin', 'voc-magician', 'voc-archer', 'voc-neutral'];
const STATE_CLASSES = [
  'slot-empty', 'slot-occupied', 'on-cooldown',
  'ability-btn--depleted', 'ability-btn--no-target',
];

/** Reasons whose button reads as "suppressed" (dimmed, non-firing). */
const SUPPRESSED_REASONS = new Set(['mana', 'ammo', 'no-target', 'active', 'dead', 'inactive']);

export class AbilityBar {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.buttons = [];
    this.sessions = new Map(); // pointerId -> session
    this._built = false;
    this._bound = false;
  }

  // ---- Lifecycle ----------------------------------------------------------

  mount(elements = {}) {
    const container = elements.abilityBarEl
      || (typeof document !== 'undefined' ? document.getElementById('ability-bar') : null);
    if (!container) return;
    this.container = container;
    container.style.setProperty('--autofire-feedback-ms', `${autofireTimings().feedbackMs}ms`);
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this.buttons = Array.from(container.querySelectorAll('.ability-btn'));
    this._bind();
  }

  destroy() {
    for (const session of this.sessions.values()) {
      clearTimeout(session.thresholdTimer);
      clearInterval(session.repeatTimer);
    }
    this.sessions.clear();
  }

  // ---- Build (once) -------------------------------------------------------

  _build() {
    const loadout = UI_CATALOG?.hud?.loadout || {};
    const activeKeys = Array.isArray(loadout.activeKeys) && loadout.activeKeys.length
      ? loadout.activeKeys.map(String)
      : ACTIVE_SLOT_KEYS;
    const equipmentKeys = Array.isArray(loadout.equipmentKeys) && loadout.equipmentKeys.length
      ? loadout.equipmentKeys.map(String)
      : Object.keys(EQUIPMENT_KEY_MAP);

    const activeHtml = activeKeys.map((key, i) => {
      const baseLabel = `Active slot ${key}, key ${key}`;
      return `
        <button type="button" class="ability-btn slot-empty" data-slot-kind="active" data-index="${i}" data-key="${key}"
                data-base-label="${baseLabel}" aria-label="${baseLabel}, empty">
          <span class="key-badge">${key}</span>
          <span class="slot-class-badge" aria-hidden="true"></span>
          <span class="ability-icon"></span>
          <span class="ability-qty"></span>
          <span class="cooldown-overlay" style="display:none;"></span>
          <span class="ability-flag" aria-hidden="true"></span>
        </button>`;
    }).join('');

    const equipmentHtml = equipmentKeys.map(key => {
      const slot = EQUIPMENT_KEY_MAP[key] || key;
      const label = HUDManager.slotLabel(slot);
      const upper = String(key).toUpperCase();
      const baseLabel = `${label}, key ${upper}`;
      return `
        <button type="button" class="ability-btn equip-btn slot-empty" data-slot-kind="equipment" data-slot="${slot}" data-key="${upper}"
                data-base-label="${baseLabel}" aria-label="${baseLabel}, empty">
          <span class="key-badge">${upper}</span>
          <span class="slot-class-badge" aria-hidden="true"></span>
          <span class="ability-icon"></span>
          <span class="ability-qty"></span>
          <span class="cooldown-overlay" style="display:none;"></span>
          <span class="ability-flag" aria-hidden="true"></span>
        </button>`;
    }).join('');

    this.container.innerHTML = activeHtml + equipmentHtml;
  }

  // ---- Input binding ------------------------------------------------------

  _bind() {
    if (this._bound) return;
    this._bound = true;
    const c = this.container;
    const hasPointer = typeof window !== 'undefined' && 'PointerEvent' in window;
    if (hasPointer) {
      c.addEventListener('pointerdown', e => this._onDown(e));
      c.addEventListener('pointerup', e => this._onUp(e));
      c.addEventListener('pointercancel', e => this._onCancel(e.pointerId));
      c.addEventListener('lostpointercapture', e => this._onCancel(e.pointerId));
    } else {
      c.addEventListener('touchstart', e => this._onTouch('down', e), { passive: false });
      c.addEventListener('touchend', e => this._onTouch('up', e), { passive: false });
      c.addEventListener('touchcancel', e => this._onTouch('cancel', e), { passive: false });
    }
  }

  _buttonFromEvent(e) {
    const target = e.target;
    if (!target || typeof target.closest !== 'function') return null;
    return target.closest('.ability-btn');
  }

  _refFor(btn) {
    return {
      kind: btn.dataset.slotKind,
      slot: btn.dataset.slot,
      index: Number(btn.dataset.index),
    };
  }

  _onDown(e) {
    const btn = this._buttonFromEvent(e);
    if (!btn) return;
    e.preventDefault();
    this._startSession(btn, e.pointerId, e);
  }

  _onUp(e) {
    const session = this.sessions.get(e.pointerId);
    if (!session) return;
    e.preventDefault();
    this._endSession(session, true);
  }

  _onTouch(kind, e) {
    e.preventDefault();
    const touch = (kind === 'down' ? e.changedTouches : e.changedTouches)?.[0];
    if (!touch) return;
    const pointerId = touch.identifier ?? touch.fingerId ?? 0;
    if (kind === 'down') {
      const btn = document.elementFromPoint?.(touch.clientX, touch.clientY)?.closest?.('.ability-btn');
      if (!btn) return;
      this._startSession(btn, pointerId, { target: btn });
      return;
    }
    const session = this.sessions.get(pointerId);
    if (session) this._endSession(session, kind === 'up');
  }

  _onCancel(pointerId) {
    const session = this.sessions.get(pointerId);
    if (session) this._endSession(session, false);
  }

  // ---- Press / autofire state machine ------------------------------------

  _startSession(btn, pointerId, e) {
    if (pointerId === undefined || this.sessions.has(pointerId)) return;
    const ref = this._refFor(btn);
    const ctx = resolveAbilityRef(this.app, ref);
    const { holdMs } = autofireTimings();

    const session = {
      pointerId,
      btn,
      ref,
      itemRef: ctx.item,
      firedAtThreshold: false,
      thresholdTimer: null,
      repeatTimer: null,
    };
    this.sessions.set(pointerId, session);
    btn.classList.add('ability-btn--charging');
    if (typeof btn.setPointerCapture === 'function' && e?.pointerId !== undefined) {
      try { btn.setPointerCapture(pointerId); } catch { /* capture is best-effort */ }
    }
    session.thresholdTimer = setTimeout(() => this._onThreshold(session), holdMs);
  }

  _onThreshold(session) {
    if (!this.sessions.has(session.pointerId)) return;
    session.firedAtThreshold = true;
    session.btn.classList.remove('ability-btn--charging');
    const ctx = resolveAbilityRef(this.app, session.ref);
    if (!ctx.item) {
      session.btn.classList.add('ability-btn--single-locked');
      this._dispatchSingle(session.ref);
      return;
    }
    this._dispatch(session.ref);
    if (isRepeatable(session.ref, ctx)) {
      this._startRepeat(session);
    } else {
      session.btn.classList.add('ability-btn--single-locked');
    }
  }

  _startRepeat(session) {
    const { repeatMs } = autofireTimings();
    session.btn.classList.add('ability-btn--active-fire');
    session.repeatTimer = setInterval(() => this._repeatTick(session), repeatMs);
  }

  _repeatTick(session) {
    if (this._forcedStop()) {
      this._endSession(session, false);
      return;
    }
    const ctx = resolveAbilityRef(this.app, session.ref);
    if (!ctx.item || !isRepeatable(session.ref, ctx) || ctx.item !== session.itemRef) {
      this._endSession(session, false);
      return;
    }
    if (canAutoFire(this.app, session.ref)) {
      session.btn.classList.remove('ability-btn--waiting');
      this._dispatch(session.ref);
    } else {
      session.btn.classList.add('ability-btn--waiting');
    }
  }

  _forcedStop() {
    const app = this.app;
    if (!app) return true;
    if (!app.isInGameplay || app.isPaused || app.isGameOver || app.isFloorCleared) return true;
    if (app.transition && typeof app.transition.isLocked === 'function' && app.transition.isLocked()) return true;
    if (!(app.player && app.player.hp > 0)) return true;
    return false;
  }

  _endSession(session, dispatchIfBeforeThreshold) {
    if (!this.sessions.has(session.pointerId)) return;
    clearTimeout(session.thresholdTimer);
    clearInterval(session.repeatTimer);
    this.sessions.delete(session.pointerId);
    session.btn.classList.remove(
      'ability-btn--charging', 'ability-btn--active-fire',
      'ability-btn--waiting', 'ability-btn--single-locked',
    );
    if (!session.firedAtThreshold && dispatchIfBeforeThreshold) {
      this._dispatchSingle(session.ref);
    }
  }

  // ---- Dispatch (reuses keyboard paths) ----------------------------------

  _dispatch(ref) {
    if (ref.kind === 'equipment') {
      this.app.executeHandCombat?.(ref.slot);
      return;
    }
    if (ref.kind === 'active') {
      this.app.handleGestureEvent?.({ slotIndex: ref.index, gesture: 'tap' });
    }
  }

  /** Sub-threshold release: an ordinary tap. Active slots keep the GestureEngine path. */
  _dispatchSingle(ref) {
    if (ref.kind === 'active' && this.app.gestureEngine) {
      this.app.gestureEngine.handleInputDown(ref.index);
      this.app.gestureEngine.handleInputUp(ref.index);
      return;
    }
    this._dispatch(ref);
  }

  // ---- Paint (from the 10 Hz HUD refresh) --------------------------------

  paint() {
    if (!this.buttons.length) return;
    for (const btn of this.buttons) this._paintButton(btn);
  }

  _paintButton(btn) {
    const ref = this._refFor(btn);
    const ctx = resolveAbilityRef(this.app, ref);
    const occupied = Boolean(ctx.item);
    const baseLabel = btn.dataset.baseLabel || btn.getAttribute('aria-label') || '';

    btn.classList.remove(...STATE_CLASSES, ...CLASS_TINTS);

    const classBadge = btn.querySelector('.slot-class-badge');
    const iconEl = btn.querySelector('.ability-icon');
    const qtyEl = btn.querySelector('.ability-qty');

    if (!occupied) {
      btn.classList.add('slot-empty');
      if (iconEl && iconEl.dataset.iconItem !== '') {
        iconEl.innerHTML = '';
        iconEl.dataset.iconItem = '';
      }
      if (qtyEl && qtyEl.textContent) qtyEl.textContent = '';
      if (classBadge) {
        classBadge.textContent = '';
        classBadge.classList.remove('visible');
      }
      this._setCooldown(btn, false, null);
      btn.classList.remove('ability-btn--depleted', 'ability-btn--no-target');
      this._setAria(btn, baseLabel, 'empty');
      return;
    }

    btn.classList.add('slot-occupied');
    const classInfo = HUDManager._classInfo(ctx.item);
    btn.classList.add(`voc-${classInfo.key}`);
    if (classBadge) {
      const next = classInfo.label || '';
      if (classBadge.textContent !== next) classBadge.textContent = next;
      classBadge.classList.toggle('visible', Boolean(next));
    }
    if (iconEl && iconEl.dataset.iconItem !== (ctx.item.item_id || '')) {
      iconEl.innerHTML = HUDManager.renderItemIcon(ctx.item);
      iconEl.dataset.iconItem = ctx.item.item_id || '';
    }
    if (qtyEl) {
      const qty = ctx.item.quantity > 1 ? `x${ctx.item.quantity}` : '';
      if (qtyEl.textContent !== qty) qtyEl.textContent = qty;
    }

    if (ref.kind === 'active') {
      this._setCooldown(btn, false, null);
      this._setAria(btn, baseLabel, 'ready');
      return;
    }

    const { reason } = evaluateGuard(this.app, ref);
    const remaining = this._cooldownRemaining(ctx.actionKey);
    const onCooldown = reason === 'cooldown' || remaining > 0;
    const effectiveCooldown = this._effectiveCooldown(ctx.item);
    this._setCooldown(btn, onCooldown, onCooldown ? { remaining, effectiveCooldown } : null);

    btn.classList.toggle('ability-btn--depleted', reason === 'mana' || reason === 'ammo');
    btn.classList.toggle('ability-btn--no-target', SUPPRESSED_REASONS.has(reason) && reason !== 'mana' && reason !== 'ammo');

    this._setAria(btn, baseLabel, this._stateSuffix(reason, ctx));
  }

  _cooldownRemaining(actionKey) {
    if (!actionKey) return 0;
    const key = actionKey === 'light_spell' ? 'light' : actionKey;
    const value = this.app.player?.cooldowns?.[key];
    return Number(value) > 0 ? Number(value) : 0;
  }

  _effectiveCooldown(item) {
    const catalog = ITEMS_CATALOG[item.item_id];
    const base = typeof item.cooldown === 'number' ? item.cooldown : (catalog?.cooldown ?? null);
    if (typeof base !== 'number') return null;
    const rank = item.itemLevel || 1;
    const spec = catalog?.upgradeSpec || item.upgradeSpec || {};
    const perRank = spec.cooldownReductionSec || 0;
    return Math.max(1, base - perRank * (rank - 1));
  }

  _setCooldown(btn, active, info) {
    const overlay = btn.querySelector('.cooldown-overlay');
    if (!overlay) return;
    if (!active || !info) {
      btn.classList.remove('on-cooldown');
      if (overlay.style.display !== 'none') overlay.style.display = 'none';
      btn.style.removeProperty('--cd-inset');
      return;
    }
    const { remaining, effectiveCooldown } = info;
    const total = typeof effectiveCooldown === 'number' && effectiveCooldown > 0 ? effectiveCooldown : null;
    const progress = total ? Math.max(0, Math.min(1, 1 - remaining / total)) : 1;
    btn.style.setProperty('--cd-inset', `${(progress * 100).toFixed(1)}%`);
    if (overlay.style.display !== 'block') overlay.style.display = 'block';
    btn.classList.add('on-cooldown');
  }

  _setAria(btn, baseLabel, suffix) {
    const next = suffix ? `${baseLabel}, ${suffix}` : baseLabel;
    if (btn.getAttribute('aria-label') !== next) btn.setAttribute('aria-label', next);
  }

  _stateSuffix(reason, ctx) {
    switch (reason) {
      case 'cooldown': return 'recharging';
      case 'mana': return 'out of mana';
      case 'ammo': return 'out of ammo';
      case 'no-target': return 'no target';
      case 'active': return 'already active';
      case 'ok': return 'ready';
      default: return ctx.actionKey ? 'ready' : 'no ability';
    }
  }
}
