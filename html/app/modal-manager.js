/**
 * Lokarta: Come Into The Light - Modals & Screen Overlays Manager
 */

import { FateGrantSystem } from '../engine/index.js';
import { soundFX } from '../audio/index.js';
import { HUDManager } from './hud-manager.js';
import { UI_CATALOG } from '../data/index.js';
import {
  SAVE_SLOT_COUNT,
  formatPlaytime,
  classifySlot,
  firstNewGameSlotIndex,
  newGameActionLabel,
} from '../services/save-slots.js';

const VOCATION_ICONS = {
  magician: '1F9D9',
  archer: '1F3F9',
  fighter: '2694',
  paladin: '1F6E1',
};

const REDUCE_MOTION_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

const UI_SCALE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'X-Large' },
];

const PIXEL_SCALE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '1x', label: '1×' },
  { value: '2x', label: '2×' },
  { value: '3x', label: '3×' },
];

export class ModalManager {
  /**
   * Removes the single modal-scoped keydown handler registered on `window`,
   * if any. Every modal render and close funnels through here so that no
   * navigation path (mouse click, back button, programmatic close) can leave a
   * stale handler behind that would fire on a later key press.
   */
  static _clearKeyHandler(overlay) {
    if (!overlay || typeof overlay._keyHandler !== 'function') return;
    overlay._keyHandler();
    overlay._keyHandler = null;
  }

  /**
   * Registers the single modal-scoped keydown handler for this overlay,
   * replacing any handler left by a previous render. The handler is removed by
   * `_clearKeyHandler` on the next render/close, or by the handler itself.
   */
  static _setKeyHandler(overlay, handler) {
    this._clearKeyHandler(overlay);
    window.addEventListener('keydown', handler);
    overlay._keyHandler = () => {
      window.removeEventListener('keydown', handler);
      overlay._keyHandler = null;
    };
  }

  static _reset(overlay) {
    this._clearKeyHandler(overlay);
    overlay.classList.remove('hidden');
    overlay.innerHTML = '';
  }

  static _close(overlay) {
    this._clearKeyHandler(overlay);
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.classList.remove('title-active');
  }

  /**
   * Title screen with ambient subject and four menu actions.
   * @param {HTMLElement} modalOverlayEl
   * @param {{ slots?: object[], hasSaves?: boolean, lastPlayedSlotIndex?: number|null }} state
   * @param {object} callbacks
   */
  static showTitleScreen(modalOverlayEl, state = {}, callbacks = {}) {
    const slots = state.slots || [];
    const hasSaves = state.hasSaves !== undefined
      ? state.hasSaves
      : slots.some(s => s && s.status === 'occupied');

    this._reset(modalOverlayEl);
    modalOverlayEl.classList.add('title-active');

    modalOverlayEl.innerHTML = `
      <div class="title-screen-modal">
        <div class="torch-flicker-container">
          <span class="title-torch left-torch"><img class="openmoji-icon torch-icon" src="./assets/openmoji/1F525.svg" alt="Torch" /></span>
          <span class="title-torch right-torch"><img class="openmoji-icon torch-icon" src="./assets/openmoji/1F525.svg" alt="Torch" /></span>
        </div>
        <div class="title-emblem"><img class="openmoji-icon emblem-icon" src="./assets/livive-studios-mark.svg" alt="Lokarta" /></div>
        <h1 class="title-main">LOKARTA</h1>
        <div class="title-subtitle">COME INTO THE LIGHT</div>
        <div class="title-tagline">A Gothic Roguelike Dungeon Crawl</div>
        <div class="title-menu-actions" role="menu">
          <button class="title-btn new-game-btn" id="title-btn-new-game" data-row="0" role="menuitem"><img class="openmoji-icon btn-emoji" src="./assets/openmoji/1F56F.svg" alt="Candle" /> NEW GAME</button>
          <button class="title-btn continue-btn" id="title-btn-continue" data-row="1" role="menuitem"${hasSaves ? '' : ' aria-disabled="true" disabled'}><img class="openmoji-icon btn-emoji" src="./assets/openmoji/2694.svg" alt="Swords" /> CONTINUE</button>
          <button class="title-btn" id="title-btn-options" data-row="2" role="menuitem"><img class="openmoji-icon btn-emoji" src="./assets/openmoji/2699.svg" alt="Gear" /> OPTIONS</button>
          <button class="title-btn" id="title-btn-guide" data-row="3" role="menuitem"><img class="openmoji-icon btn-emoji" src="./assets/openmoji/1F4D6.svg" alt="Guide" /> GUIDE &amp; CONTROLS</button>
        </div>
        <div class="title-footer">v2.4 • ${SAVE_SLOT_COUNT} Save Slots • Fate Grant Draft</div>
      </div>
    `;

    const rows = Array.from(modalOverlayEl.querySelectorAll('.title-btn'));
    let selected = rows.findIndex(r => !r.disabled);
    const applySelection = () => {
      rows.forEach((row, i) => row.classList.toggle('selected', i === selected));
    };
    const move = delta => {
      if (!rows.length) return;
      for (let i = 0; i < rows.length; i += 1) {
        selected = (selected + delta + rows.length) % rows.length;
        if (!rows[selected].disabled) break;
      }
      applySelection();
      soundFX.play('uiMove', 0.5);
    };
    const activate = row => {
      if (!row || row.disabled) return;
      soundFX.play('click');
      if (row.id === 'title-btn-new-game') callbacks.onNewGame?.();
      else if (row.id === 'title-btn-continue') callbacks.onContinue?.();
      else if (row.id === 'title-btn-options') callbacks.onOptions?.();
      else if (row.id === 'title-btn-guide') callbacks.onGuide?.();
    };

    rows.forEach(row => {
      row.addEventListener('mouseenter', () => {
        selected = Number(row.dataset.row);
        applySelection();
      });
      row.addEventListener('click', () => activate(row));
    });
    applySelection();

    const keyHandler = e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'KeyS' || e.key === 'KeyW') {
        e.preventDefault();
        move(e.key === 'ArrowDown' || e.key === 'KeyS' ? 1 : -1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(rows[selected]);
      }
    };
    this._setKeyHandler(modalOverlayEl, keyHandler);
  }

  /**
   * Options modal. Changes apply immediately via callbacks.onChange.
   */
  static showOptionsModal(modalOverlayEl, options, callbacks = {}) {
    const opts = options || {};
    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');

    const toggle = (key, label) => `
      <div class="option-row" data-option="${key}">
        <span class="option-label">${label}</span>
        <button class="option-toggle" data-toggle="${key}" aria-pressed="${opts[key] ? 'true' : 'false'}">${opts[key] ? 'ON' : 'OFF'}</button>
      </div>`;

    const segmented = (key, label, choices) => `
      <div class="option-row" data-option="${key}">
        <span class="option-label">${label}</span>
        <div class="option-segmented">
          ${choices.map(c => `<button class="option-seg${opts[key] === c.value ? ' active' : ''}" data-seg="${key}" data-value="${c.value}">${c.label}</button>`).join('')}
        </div>
      </div>`;

    modalOverlayEl.innerHTML = `
      <div class="options-modal">
        <div class="modal-header">
          <h2>OPTIONS</h2>
          <div class="subtitle">Changes apply immediately and are saved automatically.</div>
        </div>
        <div class="options-list">
          ${toggle('soundEffects', 'Sound Effects')}
          <div class="option-row" data-option="sfxVolume">
            <span class="option-label">Sound Volume</span>
            <input class="option-slider" id="option-sfx-volume" type="range" min="0" max="100" step="5" value="${Number(opts.sfxVolume) || 0}" />
            <span class="option-value" id="option-sfx-volume-value">${Number(opts.sfxVolume) || 0}</span>
          </div>
          ${segmented('reduceMotion', 'Reduce Motion', REDUCE_MOTION_OPTIONS)}
          ${segmented('uiScale', 'UI Scale', UI_SCALE_OPTIONS)}
          ${segmented('pixelScale', 'Pixel Zoom', PIXEL_SCALE_OPTIONS)}
          ${toggle('fullscreen', 'Fullscreen')}
          ${toggle('damageNumbers', 'Damage Numbers')}
          ${toggle('showFps', 'Frame Rate Counter')}
        </div>
        <div class="modal-back-action options-actions">
          <button class="action-btn" id="options-save-data">SAVE DATA</button>
          <button class="action-btn danger" id="options-reset">RESET TO DEFAULTS</button>
          <button class="action-btn" id="options-back">BACK</button>
        </div>
      </div>
    `;

    modalOverlayEl.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        const next = !(btn.getAttribute('aria-pressed') === 'true');
        btn.setAttribute('aria-pressed', next ? 'true' : 'false');
        btn.textContent = next ? 'ON' : 'OFF';
        soundFX.play('click');
        callbacks.onChange?.({ [key]: next });
      });
    });

    modalOverlayEl.querySelectorAll('[data-seg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.seg;
        modalOverlayEl.querySelectorAll(`[data-seg="${key}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        soundFX.play('click');
        callbacks.onChange?.({ [key]: btn.dataset.value });
      });
    });

    const slider = modalOverlayEl.querySelector('#option-sfx-volume');
    const sliderValue = modalOverlayEl.querySelector('#option-sfx-volume-value');
    slider?.addEventListener('input', () => {
      sliderValue.textContent = slider.value;
    });
    slider?.addEventListener('change', () => {
      callbacks.onChange?.({ sfxVolume: Number(slider.value) });
    });

    modalOverlayEl.querySelector('#options-save-data')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onSaveData?.();
    });
    modalOverlayEl.querySelector('#options-reset')?.addEventListener('click', () => {
      soundFX.play('uiBack');
      callbacks.onReset?.();
    });
    modalOverlayEl.querySelector('#options-back')?.addEventListener('click', () => {
      soundFX.play('uiBack');
      callbacks.onBack?.();
    });
  }

  /**
   * Save-slot selection. mode: 'create' | 'load' | 'manage'.
   */
  static showSlotSelectModal(modalOverlayEl, state = {}, callbacks = {}) {
    const slots = state.slots || [];
    const mode = state.mode || 'create';
    const lastPlayed = state.lastPlayedSlotIndex;
    const header = mode === 'manage' ? 'SAVE DATA' : 'SELECT A SAVE SLOT';
    const subtitle = mode === 'load'
      ? 'Choose an expedition to continue.'
      : mode === 'manage'
        ? 'Load, overwrite, or delete a save.'
        : 'Choose a slot for your new expedition.';

    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');

    // New Game must reach character creation in one step (LIV-23). The first
    // loadable empty slot is the default target and gets a single obvious
    // primary action, so a fresh profile never dead-ends on this screen.
    const defaultNewGameIndex = mode === 'create' ? firstNewGameSlotIndex(slots) : null;

    const cards = slots.map(slot => {
      const index = slot.slotIndex;
      const kind = classifySlot(slot);
      if (kind !== 'occupied') {
        // A record that is neither a valid empty slot nor a loadable save is
        // corrupt/unknown: render DATA UNAVAILABLE with DELETE only (spec §4.2).
        if (kind === 'unavailable') {
          // Composition matches an occupied row (spec §4.2): mono slot badge,
          // then the DATA UNAVAILABLE title + subcopy, DELETE only. The words
          // carry the corrupt state, not the red border (WCAG 1.4.1).
          return `
          <div class="slot-card corrupt" data-slot="${index}" data-status="unavailable">
            <div class="slot-badge">SLOT ${index}</div>
            <div class="slot-info">
              <div class="slot-title"><strong>DATA UNAVAILABLE</strong></div>
              <div class="slot-sub">This save record is unreadable. Delete it to reuse the slot.</div>
            </div>
            <div class="slot-actions">
              <button class="action-btn danger" data-action="delete" data-slot="${index}">DELETE</button>
            </div>
          </div>`;
        }
        const disabled = mode === 'load' || mode === 'manage';
        const isDefault = index === defaultNewGameIndex;
        const newLabel = isDefault ? newGameActionLabel(index) : 'EMPTY — NEW GAME';
        return `
          <div class="slot-card empty${isDefault ? ' selected' : ''}" data-slot="${index}"${isDefault ? ' data-default-new="true"' : ''}>
            <div class="slot-badge">SLOT ${index}</div>
            <div class="slot-empty-body">
              <button class="action-btn slot-new-btn${isDefault ? ' primary' : ''}" data-action="new" data-slot="${index}"${isDefault ? ' data-default-new="true" autofocus' : ''}${disabled ? ' disabled' : ''}>${mode === 'create' ? newLabel : 'EMPTY'}</button>
            </div>
          </div>`;
      }

      const icon = VOCATION_ICONS[slot.vocation] || '1F56F';
      const ribbon = lastPlayed === index ? '<span class="slot-ribbon">LAST PLAYED</span>' : '';
      const primaryAction = mode === 'load'
        ? `<button class="action-btn" data-action="load" data-slot="${index}">LOAD</button>`
        : `<button class="action-btn" data-action="overwrite" data-slot="${index}">OVERWRITE</button>`;
      return `
        <div class="slot-card occupied" data-slot="${index}">
          ${ribbon}
          <div class="slot-badge">SLOT ${index}</div>
          <img class="openmoji-icon slot-thumb" src="./assets/openmoji/${icon}.svg" alt="${slot.vocation || ''}" />
          <div class="slot-info">
            <div class="slot-title"><strong>${String(slot.vocation || 'unknown').toUpperCase()}</strong> — Level ${slot.level || 1}</div>
            <div class="slot-sub">Floor ${slot.currentFloor || 1}/20${slot.biome ? ` · ${slot.biome}` : ''}</div>
            <div class="slot-meta">Played ${formatPlaytime(slot.playtimeMs)} · Last played ${formatLastPlayed(slot.lastPlayedAt)}</div>
          </div>
          <div class="slot-actions">
            ${primaryAction}
            <button class="action-btn danger" data-action="delete" data-slot="${index}">DELETE</button>
          </div>
        </div>`;
    }).join('');

    modalOverlayEl.innerHTML = `
      <div class="slot-select-modal">
        <div class="modal-header">
          <h2>${header}</h2>
          <div class="subtitle">${subtitle}</div>
        </div>
        <div class="slot-list">${cards}</div>
        <div class="modal-back-action">
          <button class="action-btn" id="slots-back">BACK</button>
        </div>
      </div>
    `;

    const activate = btn => {
      if (!btn || btn.disabled) return;
      const index = Number(btn.dataset.slot);
      soundFX.play('click');
      if (btn.dataset.action === 'new') callbacks.onNew?.(index);
      else if (btn.dataset.action === 'load') callbacks.onLoad?.(index);
      else if (btn.dataset.action === 'overwrite') callbacks.onOverwrite?.(index);
      else if (btn.dataset.action === 'delete') callbacks.onDelete?.(index);
    };

    modalOverlayEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => activate(btn));
    });
    modalOverlayEl.querySelector('#slots-back')?.addEventListener('click', () => {
      soundFX.play('uiBack');
      callbacks.onBack?.();
    });

    // Landing focus on the default New Game action makes the whole flow one
    // step: New Game → Enter → character creation. Arrow keys move between the
    // New Game actions when there is more than one selectable empty slot.
    const defaultBtn = modalOverlayEl.querySelector('[data-default-new="true"]');
    const promoTargets = Array.from(modalOverlayEl.querySelectorAll('.slot-card.empty:not(.corrupt) [data-action="new"]'))
      .filter(btn => !btn.disabled);
    let focusIndex = Math.max(0, promoTargets.indexOf(defaultBtn));
    const focusTarget = () => {
      const btn = promoTargets[focusIndex];
      if (btn && typeof btn.focus === 'function') btn.focus();
    };
    focusTarget();

    const keyHandler = e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (promoTargets.length < 2) return;
        e.preventDefault();
        focusIndex = (focusIndex + (e.key === 'ArrowDown' ? 1 : -1) + promoTargets.length) % promoTargets.length;
        focusTarget();
      } else if (e.key === 'Enter') {
        const active = modalOverlayEl.ownerDocument?.activeElement;
        if (active && active.dataset && active.dataset.defaultNew === 'true') {
          e.preventDefault();
          activate(active);
        }
      }
    };
    this._setKeyHandler(modalOverlayEl, keyHandler);
  }

  /**
   * Generic destructive/confirm dialog.
   * @param {{ title: string, body: string, confirmLabel: string, cancelLabel?: string, danger?: boolean, onConfirm: Function, onCancel: Function }} opts
   */
  static showConfirmModal(modalOverlayEl, opts = {}) {
    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');
    modalOverlayEl.innerHTML = `
      <div class="result-modal confirm-modal">
        <h2>${opts.title || 'ARE YOU SURE?'}</h2>
        <p class="result-subtitle">${opts.body || ''}</p>
        <div class="confirm-actions">
          <button class="action-btn" id="confirm-cancel">${opts.cancelLabel || 'CANCEL'}</button>
          <button class="action-btn ${opts.danger ? 'danger' : ''}" id="confirm-ok">${opts.confirmLabel || 'CONFIRM'}</button>
        </div>
      </div>
    `;

    const cancel = () => {
      soundFX.play('uiBack');
      this._close(modalOverlayEl);
      opts.onCancel?.();
    };
    const confirm = () => {
      soundFX.play('click');
      this._close(modalOverlayEl);
      opts.onConfirm?.();
    };
    modalOverlayEl.querySelector('#confirm-cancel')?.addEventListener('click', cancel);
    modalOverlayEl.querySelector('#confirm-ok')?.addEventListener('click', confirm);

    // Error prevention (packaging-design.md §4.4, §3.2): a destructive confirm
    // lands focus on CANCEL so a reflexive `Enter` cancels instead of deleting
    // or overwriting data. Non-destructive dialogs (e.g. the load-error OK/BACK
    // dialog) keep focus on their primary OK button.
    const safeFocusTarget = opts.danger
      ? modalOverlayEl.querySelector('#confirm-cancel')
      : modalOverlayEl.querySelector('#confirm-ok');
    safeFocusTarget?.focus?.();

    const keyHandler = e => {
      if (e.key === 'Escape') {
        this._clearKeyHandler(modalOverlayEl);
        cancel();
      }
    };
    this._setKeyHandler(modalOverlayEl, keyHandler);
  }

  static showCharacterSelectModal(modalOverlayEl, onSelectVocation) {
    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');
    modalOverlayEl.innerHTML = `
      <div class="character-select-modal">
        <div class="modal-header">
          <h2>CHOOSE YOUR VOCATION</h2>
          <div class="subtitle">Descend into the 20 Subterranean Vaults of Lokarta</div>
        </div>
        <p class="prompt">Select your champion. Each vocation wields unique combat mechanics & exclusive access to vocation-locked gear:</p>
        <div class="vocation-cards">
          <!-- Magician -->
          <div class="vocation-card" data-vocation="magician">
            <div class="card-icon"><img class="openmoji-icon card-emoji" src="./assets/openmoji/1F9D9.svg" alt="Magician" /></div>
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
            <div class="card-icon"><img class="openmoji-icon card-emoji" src="./assets/openmoji/1F3F9.svg" alt="Archer" /></div>
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
            <div class="card-icon"><img class="openmoji-icon card-emoji" src="./assets/openmoji/2694.svg" alt="Fighter" /></div>
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
            <div class="card-icon"><img class="openmoji-icon card-emoji" src="./assets/openmoji/1F6E1.svg" alt="Paladin" /></div>
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

    const selectBtns = modalOverlayEl.querySelectorAll('.select-btn, .vocation-card');
    selectBtns.forEach(btn => {
      btn.addEventListener('click', async e => {
        const vocation = e.currentTarget.getAttribute('data-vocation');
        if (vocation) {
          soundFX.play('click');
          this._close(modalOverlayEl);
          if (onSelectVocation) await onSelectVocation(vocation);
        }
      });
    });
  }

  static showGuideModal(modalOverlayEl, callbacks = {}) {
    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');
    modalOverlayEl.innerHTML = `
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
              <li><strong>Weapons in Action Slots:</strong> Pressing a weapon hotkey (Q/W or 1-9,0) always swings — Swords, Cleaves, and Holy Strikes animate toward your facing and hit every enemy inside the reach.</li>
              <li><strong>Vocation-Locked Equipment:</strong> Weapons, armor, and relics can only be equipped by their appropriate vocation — the class advantage is exclusive access to your class's gear!</li>
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
      if (typeof callbacks.onClose === 'function') {
        callbacks.onClose();
      } else {
        this._close(modalOverlayEl);
      }
    });
  }

  /** In-game pause menu. */
  static showPauseModal(modalOverlayEl, callbacks = {}) {
    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');
    modalOverlayEl.innerHTML = `
      <div class="result-modal pause-modal">
        <h2>PAUSED</h2>
        <p class="result-subtitle">The dungeon waits.</p>
        <div class="pause-actions">
          <button class="title-btn" id="pause-resume">RESUME</button>
          <button class="title-btn" id="pause-options">OPTIONS</button>
          <button class="title-btn" id="pause-guide">GUIDE &amp; CONTROLS</button>
          <button class="title-btn" id="pause-title">RETURN TO TITLE</button>
        </div>
      </div>
    `;

    modalOverlayEl.querySelector('#pause-resume')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onResume?.();
    });
    modalOverlayEl.querySelector('#pause-options')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onOptions?.();
    });
    modalOverlayEl.querySelector('#pause-guide')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onGuide?.();
    });
    modalOverlayEl.querySelector('#pause-title')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onReturnToTitle?.();
    });

    const keyHandler = e => {
      if (e.key === 'Escape') {
        this._clearKeyHandler(modalOverlayEl);
        callbacks.onResume?.();
      }
    };
    this._setKeyHandler(modalOverlayEl, keyHandler);
  }

  static showFateGrantModal(modalOverlayEl, app, level = 1) {
    if (app) app.isPaused = true;

    const offer = FateGrantSystem.generateDraftOffer(app.player, level);
    const selectedCards = new Set();

    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');
    modalOverlayEl.innerHTML = `
      <div class="fate-grant-modal">
        <div class="modal-header">
          <h2><img class="openmoji-icon title-icon" src="./assets/openmoji/1F56F.svg" alt="Candle" /> FATE GRANT (Level ${level})</h2>
          <div class="subtitle">Select 1 or 2 cards to fortify your Action Slots and Backpack</div>
        </div>
        <div class="fate-cards-grid" id="fate-cards-grid">
          ${offer.cards
            .map(
              (card, idx) => {
                const iconCode = HUDManager.emojiToOpenMojiCode(card.icon);
                return `
            <div class="fate-card rarity-${card.rarity}" data-card-id="${card.id}" data-idx="${idx}">
              <div class="card-select-badge">✓</div>
              <div class="card-icon"><img class="openmoji-icon card-emoji" src="./assets/openmoji/${iconCode}.svg" alt="${card.name}" /></div>
              <div class="card-title">${card.name}</div>
              <div class="card-stat-bonus">${card.statBonusText || ''}</div>
              <div class="card-desc">${card.description}</div>
            </div>
          `;
              }
            )
            .join('')}
        </div>
        <div class="fate-modal-actions">
          <button class="confirm-draft-btn" id="btn-confirm-draft" disabled>Confirm Selections (0/2)</button>
        </div>
      </div>
    `;

    const cardEls = modalOverlayEl.querySelectorAll('.fate-card');
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
      const applyResult = FateGrantSystem.applyDraftedCards(app.player, chosen, app.gridMap);

      for (const hotbarItem of applyResult.addedToHotbar) {
        app.logCombat(`Fate granted: ${hotbarItem}`, 'loot');
      }
      for (const bpItem of applyResult.addedToBackpack) {
        app.logCombat(`Fate granted: ${bpItem}`, 'loot');
      }
      for (const floorItem of applyResult.droppedOnFloor) {
        app.logCombat(`Inventory full: ${floorItem} placed on floor.`, 'warning');
      }

      this._close(modalOverlayEl);
      if (app) app.isPaused = false;
      app.updateHUD();
      await app.persistSave();
    });
  }

  static showVictoryModal(modalOverlayEl, player, callbacks = {}) {
    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');
    const p = player || {};
    modalOverlayEl.innerHTML = `
      <div class="result-modal victory-modal">
        <h2>ULTIMATE VICTORY</h2>
        <p class="result-subtitle">All 20 floors cleared. Lokarta is lit.</p>
        <div class="character-summary">
          <p><strong>Vocation:</strong> ${String(p.vocation || 'magician').toUpperCase()}</p>
          <p><strong>Final Level:</strong> Level ${p.level || 1}</p>
          <p><strong>Damage Boost:</strong> +${Math.round(((p.skillBoosts?.damageMultiplier || 1) - 1) * 100)}%</p>
          <p><strong>Remaining HP:</strong> ${p.hp} / ${p.max_hp}</p>
          <p><strong>Remaining MP:</strong> ${p.mana} / ${p.max_mana}</p>
        </div>
        <div class="confirm-actions">
          <button class="action-btn" id="victory-new-game">NEW GAME</button>
          <button class="action-btn" id="victory-title">RETURN TO TITLE</button>
        </div>
      </div>
    `;

    modalOverlayEl.querySelector('#victory-new-game')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onNewGame?.();
    });
    modalOverlayEl.querySelector('#victory-title')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onReturnToTitle?.();
    });
  }

  static showGameOverModal(modalOverlayEl, player, callbacks = {}) {
    this._reset(modalOverlayEl);
    modalOverlayEl.classList.remove('title-active');
    const floor = player?.current_floor || 1;
    modalOverlayEl.innerHTML = `
      <div class="result-modal defeat-modal">
        <h2>YOU HAVE PERISHED</h2>
        <p class="result-subtitle">Floor ${floor}/20 claims another soul.</p>
        <div class="confirm-actions">
          <button class="action-btn" id="btn-retry">RETRY FLOOR ${floor}</button>
          <button class="action-btn" id="btn-continue">CONTINUE</button>
        </div>
        <p class="result-hint">Both options restart Floor ${floor} from your arrival.<br />Retry stays in the dungeon; Continue returns to the title screen.</p>
      </div>
    `;

    modalOverlayEl.querySelector('#btn-retry')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onRetry?.();
    });
    modalOverlayEl.querySelector('#btn-continue')?.addEventListener('click', () => {
      soundFX.play('click');
      callbacks.onContinue?.();
    });
  }
}

function formatLastPlayed(iso) {
  if (!iso) return 'unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
