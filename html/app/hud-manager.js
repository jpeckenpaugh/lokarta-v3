/**
 * Lokarta: Come Into The Light - HUD & Interface Manager
 */

import { GestureEngine, InventorySystem, LightingSystem, DoorSystem } from '../engine/index.js';
import { soundFX } from '../audio/index.js';
import { ITEMS_CATALOG, DOORS_CATALOG } from '../data/index.js';

const EMOJI_TO_SVG_MAP = {
  '🧪': '1F9EA',
  '⚗️': '2697',
  '🔷': '1F539',
  '🔥': '1F525',
  '🏹': '1F3F9',
  '🪄': '1FA84',
  '🦯': '1F9AF',
  '🔮': '1F52E',
  '🗡️': '1F5E1',
  '⚔️': '2694',
  '⚒️': '2692',
  '🔨': '1F528',
  '🛡️': '1F6E1',
  '🦺': '1F9BA',
  '🧥': '1F9E5',
  '📿': '1F4FF',
  '👑': '1F451',
  '🧢': '1F9E2',
  '🪖': '1FA96',
  '✨': '2728',
  '💡': '1F4A1',
  '⚡': '26A1',
  '🎯': '1F3AF',
  '🌪️': '1F32A',
  '💖': '1F496',
  '☀️': '2600',
  '📦': '1F4E6',
  '🕯️': '1F56F',
  '🧙‍♂️': '1F9D9',
  '📖': '1F4D6',
  '⭐': '2B50',
};

export class HUDManager {
  static bindHUDEvents(elements, app) {
    if (!elements) return;
    const { paperdollEl, backpackEl } = elements;

    // Keyed slots (8): click to select/swap with a previously selected slot.
    if (paperdollEl && !paperdollEl._boundKeyed) {
      paperdollEl._boundKeyed = true;
      paperdollEl.addEventListener('click', e => {
        const slot = e.target.closest('.keyed-slot');
        if (!slot) return;
        const keyed = slot.getAttribute('data-keyed');
        HUDManager.handleSlotSelect(app, { source: 'keyed', keyed });
      });
    }

    // Backpack (36 slots): click to select/swap; double-click to use/equip.
    if (backpackEl && !backpackEl._boundBackpack) {
      backpackEl._boundBackpack = true;
      backpackEl.addEventListener('click', e => {
        const slot = e.target.closest('.backpack-slot');
        if (!slot) return;
        const index = parseInt(slot.getAttribute('data-index') || '-1', 10);
        if (index < 0) return;
        HUDManager.handleSlotSelect(app, { source: 'backpack', index });
      });
      backpackEl.addEventListener('dblclick', e => {
        const slot = e.target.closest('.backpack-slot');
        if (!slot) return;
        const index = parseInt(slot.getAttribute('data-index') || '-1', 10);
        if (index < 0) return;
        const res = InventorySystem.useBackpackItem(app.player, index);
        if (res.success) {
          soundFX.play('equip');
          app.logCombat(res.message, 'loot');
          app.updateHUD();
          app.persistSave();
        } else {
          app.logCombat(res.message, 'warning');
        }
      });
    }
  }

  /**
   * Click-to-swap selection flow. A first click selects a source slot and
   * highlights it; a second click on a different slot requests a swap (banked
   * item -> any of the 8 keyed slots, or a keyed item -> backpack).
   */
  static handleSlotSelect(app, target) {
    if (!app) return;
    const current = app._selectedSlot || null;

    if (!current) {
      app._selectedSlot = target;
      HUDManager._highlightSelection(app, target);
      return;
    }

    // Clicking the same slot again clears the selection.
    const same = current.source === target.source
      && (current.source === 'keyed' ? current.keyed === target.keyed : current.index === target.index);
    if (same) {
      app._selectedSlot = null;
      HUDManager._highlightSelection(app, null);
      return;
    }

    // Only a banked (backpack) <-> keyed swap is supported by the bank rule.
    const from = current.source === 'backpack' ? `backpack:${current.index}` : current.keyed;
    const to = target.source === 'backpack' ? `backpack:${target.index}` : target.keyed;
    const res = InventorySystem.swapKeyedItem(app.player, from, to);

    app._selectedSlot = null;
    HUDManager._highlightSelection(app, null);

    if (res.success) {
      soundFX.play('equip');
      app.logCombat(res.message, 'loot');
      app.updateHUD();
      app.persistSave();
    } else {
      app.logCombat(res.message, 'warning');
    }
  }

  static _highlightSelection(app, target) {
    const root = app.modalOverlayEl ? document : document;
    root.querySelectorAll('.keyed-slot.selected, .backpack-slot.selected').forEach(el => el.classList.remove('selected'));
    if (!target) return;
    const selector = target.source === 'backpack'
      ? `.backpack-slot[data-index="${target.index}"]`
      : `.keyed-slot[data-keyed="${target.keyed}"]`;
    document.querySelector(selector)?.classList.add('selected');
  }

  static updateHUD(elements, app) {
    HUDManager.bindHUDEvents(elements, app);
    const { statusBarsEl, paperdollEl, backpackEl } = elements;
    HUDManager.renderStatusBars(statusBarsEl, app.player, app.currentFloorName);
    HUDManager.renderKeyedSlots(paperdollEl, app);
    HUDManager.renderBackpack(backpackEl, app);
  }

  static renderStatusBars(statusBarsEl, player, currentFloorName) {
    if (!statusBarsEl) return;
    const hpPercent = Math.max(0, Math.min(100, (player.hp / player.max_hp) * 100));
    const mpPercent = Math.max(0, Math.min(100, (player.mana / player.max_mana) * 100));
    const xpPercent = player.level >= 20 ? 100 : Math.max(0, Math.min(100, (player.xp / (player.xpToNextLevel || 100)) * 100));
    const vocationDisplay = (player.vocation || 'magician').charAt(0).toUpperCase() + (player.vocation || 'magician').slice(1);
    const dmgBonusPct = Math.round(((player.skillBoosts?.damageMultiplier || 1.0) - 1.0) * 100);

    statusBarsEl.innerHTML = `
      <div class="panel-header">HERO STATUS & TOWER ASCENT</div>
      <div class="status-panel-inner">
        <div class="status-header">
          <div class="vocation-tag"><span class="level-badge">Lv. ${player.level || 1}</span> <strong class="val">${vocationDisplay}</strong></div>
          <div class="floor-tag"><span class="label">Floor:</span> <strong class="val">${player.current_floor || 1} · ${currentFloorName}</strong></div>
        </div>

        <div class="gold-tag"><span class="gold-icon">🪙</span> <span class="gold-label">GOLD</span> <strong class="gold-val">${Number(player.gold) || 0}</strong></div>

        ${HUDManager.renderKeyIndicators(player)}

        <div class="meter-container hp-meter">
          <div class="meter-info">
            <span class="meter-label">HEALTH (HP)</span>
            <span class="meter-values">${player.hp} / ${player.max_hp}</span>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill hp-fill" style="width: ${hpPercent}%;"></div>
          </div>
        </div>

        <div class="meter-container mp-meter">
          <div class="meter-info">
            <span class="meter-label">MANA (MP)</span>
            <span class="meter-values">${player.mana} / ${player.max_mana}</span>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill mp-fill" style="width: ${mpPercent}%;"></div>
          </div>
        </div>

        <div class="meter-container xp-meter">
          <div class="meter-info">
            <span class="meter-label">EXP (XP)</span>
            <span class="meter-values">${player.level >= 20 ? 'MAX LEVEL' : `${player.xp || 0} / ${player.xpToNextLevel || 100}`}</span>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill xp-fill" style="width: ${xpPercent}%;"></div>
          </div>
        </div>

        ${
          dmgBonusPct > 0 || player.skillBoosts?.bonusRange || player.skillBoosts?.bonusRegen
            ? `<div class="skill-boosts-summary">
                <span>⚡ +${dmgBonusPct}% Damage</span>
                ${player.skillBoosts?.bonusRange ? `<span>🏹 +${player.skillBoosts.bonusRange} Range</span>` : ''}
                ${player.skillBoosts?.bonusRegen ? `<span>❤️ +${player.skillBoosts.bonusRegen} Regen</span>` : ''}
              </div>`
            : ''
        }

        ${
          player.lightSpellTimer > 0
            ? `<div class="active-buff-badge">
                <span class="buff-icon">✨</span>
                <span class="buff-text">Light Aura: <strong>${Math.ceil(player.lightSpellTimer)}s</strong> (${LightingSystem.computePlayerRadius(player)} tiles)</span>
              </div>`
            : ''
        }
      </div>
    `;
  }

  /**
   * Renders the three per-level key indicators for the current floor: one icon
   * per authored gate tier, greyed-out until the player earns that level's key
   * (then colored-in). Keys are per-level and come from `player.levelKeys`, not
   * the inventory (LIV-16).
   * @param {object} player
   * @returns {string} HTML for the key row
   */
  static renderKeyIndicators(player) {
    const floor = player?.current_floor || 1;
    const tiers = DoorSystem.tiers();
    if (tiers.length === 0) return '';

    const icons = tiers.map(tier => {
      const earned = DoorSystem.hasKey(player, tier, floor);
      // Prefer an authored key item icon; fall back to the door accent glyph.
      const keyItemId = DoorSystem.keyItemForTier(tier);
      const catalogItem = keyItemId ? ITEMS_CATALOG[keyItemId] : null;
      const accent = DOORS_CATALOG?.[tier]?.accent || '#94a3b8';
      const label = catalogItem?.name || `${tier} key`;
      const icon = HUDManager.renderItemIcon({
        item_id: keyItemId,
        name: label,
        svgCode: earned && catalogItem?.svgCodeActive ? catalogItem.svgCodeActive : catalogItem?.svgCode,
      });
      const state = earned ? 'active' : 'locked';
      const tip = earned ? `${label} earned on Floor ${floor}` : `${label} — not yet earned on Floor ${floor}`;
      return `<span class="level-key ${state}" data-tier="${tier}" style="--key-accent: ${accent};" title="${tip}">${icon}</span>`;
    }).join('');

    return `
      <div class="level-keys-row" aria-label="Keys earned on this floor">
        <span class="level-keys-label">KEYS</span>
        <span class="level-keys-icons">${icons}</span>
      </div>
    `;
  }

  /**
   * The 8 keyed slots (LIV-22 item 1): `q w e r` equipment row with the four
   * active items (`1 2 3 4`) drawn directly above it. Slots are mouse
   * drop/swap targets; rendering is skeleton-once + selective diff.
   */
  static renderKeyedSlots(paperdollEl, app) {
    if (!paperdollEl) return;
    HUDManager.bindHUDEvents({ paperdollEl }, app);
    const paperdoll = app.player.paperdoll || {};
    const actionBar = app.player.action_bar || [];

    const equipmentSlots = [
      { key: 'main_hand', hotkey: 'q', label: 'Main Hand', placeholder: '2694' },
      { key: 'off_hand', hotkey: 'w', label: 'Off Hand', placeholder: '1F6E1' },
      { key: 'armor', hotkey: 'e', label: 'Armor', placeholder: '1F9BA' },
      { key: 'relic', hotkey: 'r', label: 'Relic', placeholder: '1F4FF' },
    ];

    let grid = paperdollEl.querySelector('.keyed-slots-grid');
    if (!grid) {
      let html = `
        <div class="panel-header">KEYED SLOTS (EQUIPMENT &amp; ACTIVE)</div>
        <div class="keyed-slots-grid">
          <div class="keyed-row keyed-active-row">
      `;
      for (let i = 0; i < 4; i++) {
        html += `
            <div class="keyed-slot active-slot" data-keyed="active_${i}" data-kind="active" data-index="${i}" title="Active Slot ${i + 1}">
              <div class="keyed-slot-key">${i + 1}</div>
              <div class="keyed-slot-content"></div>
              <div class="keyed-slot-name">Empty</div>
            </div>`;
      }
      html += `
          </div>
          <div class="keyed-row keyed-equip-row">
      `;
      for (const slot of equipmentSlots) {
        html += `
            <div class="keyed-slot equip-slot" data-keyed="${slot.key}" data-kind="equipment" data-slot="${slot.key}" title="${slot.label}">
              <div class="keyed-slot-key">${slot.hotkey}</div>
              <div class="keyed-slot-content"><span class="empty-icon"><img class="openmoji-icon placeholder" src="./assets/openmoji/${slot.placeholder}.svg" alt="${slot.label}" /></span></div>
              <div class="keyed-slot-name">Empty</div>
            </div>`;
      }
      html += `
          </div>
        </div>
      `;
      paperdollEl.innerHTML = html;
      grid = paperdollEl.querySelector('.keyed-slots-grid');
    }

    const paint = (el, item, hotkey) => {
      const isOccupied = Boolean(item);
      el.classList.toggle('occupied', isOccupied);
      const nameEl = el.querySelector('.keyed-slot-name');
      const newName = isOccupied ? item.name : 'Empty';
      if (nameEl && nameEl.textContent !== newName) nameEl.textContent = newName;

      const contentEl = el.querySelector('.keyed-slot-content');
      const newIcon = isOccupied ? HUDManager.renderItemIcon(item) : '';
      if (contentEl && contentEl.dataset.iconItem !== (item?.item_id || '')) {
        contentEl.innerHTML = newIcon;
        contentEl.dataset.iconItem = item?.item_id || '';
      }

      const qty = isOccupied && item.quantity > 1 ? `x${item.quantity}` : '';
      let qtyEl = el.querySelector('.keyed-slot-qty');
      if (qty) {
        if (!qtyEl) {
          qtyEl = document.createElement('div');
          qtyEl.className = 'keyed-slot-qty';
          el.appendChild(qtyEl);
        }
        if (qtyEl.textContent !== qty) qtyEl.textContent = qty;
      } else if (qtyEl) {
        qtyEl.remove();
      }

      const cost = isOccupied && item.manaCost ? `${item.manaCost} MP` : '';
      let costEl = el.querySelector('.keyed-slot-cost');
      if (cost) {
        if (!costEl) {
          costEl = document.createElement('div');
          costEl.className = 'keyed-slot-cost';
          el.appendChild(costEl);
        }
        if (costEl.textContent !== cost) costEl.textContent = cost;
      } else if (costEl) {
        costEl.remove();
      }
      el.title = isOccupied ? `${item.name} [${hotkey}]` : `${hotkey} (Empty)`;
    };

    grid.querySelectorAll('.keyed-slot[data-kind="active"]').forEach(el => {
      const idx = parseInt(el.getAttribute('data-index') || '-1', 10);
      paint(el, actionBar[idx] || null, String(idx + 1));
    });
    grid.querySelectorAll('.keyed-slot[data-kind="equipment"]').forEach(el => {
      const slot = el.getAttribute('data-slot');
      const hotkey = el.querySelector('.keyed-slot-key')?.textContent || '';
      paint(el, paperdoll[slot] || null, hotkey);
    });
  }

  static renderBackpack(backpackEl, app) {
    if (!backpackEl) return;
    HUDManager.bindHUDEvents({ backpackEl }, app);
    const layout = UI_CATALOG?.inventory || {};
    const columns = Number(layout.backpackColumns) || 6;
    const total = Number(layout.backpackSlots) || 36;
    const backpack = app.player.backpack || new Array(total).fill(null);
    const occupiedCount = backpack.filter(Boolean).length;

    let grid = backpackEl.querySelector('.backpack-slots-grid');
    if (!grid) {
      let html = `
        <div class="panel-header">
          <span>BACKPACK (${total} SLOTS)</span>
          <span class="slot-count" id="backpack-slot-count">${occupiedCount}/${total}</span>
        </div>
        <div class="backpack-slots-grid" style="grid-template-columns: repeat(${columns}, 1fr);">
      `;
      for (let i = 0; i < total; i++) {
        html += `
          <div class="backpack-slot" data-index="${i}" data-container="backpack" title="Backpack Slot ${i + 1} (Empty)">
            <div class="slot-num">#${i + 1}</div>
            <div class="slot-content"></div>
          </div>`;
      }
      html += `</div>`;
      backpackEl.innerHTML = html;
      grid = backpackEl.querySelector('.backpack-slots-grid');
    }

    const countEl = backpackEl.querySelector('#backpack-slot-count');
    if (countEl) {
      const label = `${occupiedCount}/${total}`;
      if (countEl.textContent !== label) countEl.textContent = label;
    }

    grid.querySelectorAll('.backpack-slot').forEach(el => {
      const i = parseInt(el.getAttribute('data-index') || '-1', 10);
      const item = backpack[i] || null;
      const isOccupied = item !== null;
      el.classList.toggle('occupied', isOccupied);
      el.classList.toggle('empty', !isOccupied);

      const contentEl = el.querySelector('.slot-content');
      const newIcon = isOccupied ? HUDManager.renderItemIcon(item) : '';
      if (contentEl && contentEl.dataset.iconItem !== (item?.item_id || '')) {
        contentEl.innerHTML = newIcon;
        contentEl.dataset.iconItem = item?.item_id || '';
      }

      let qtyEl = el.querySelector('.item-qty');
      const qty = isOccupied && item.quantity > 1 ? `x${item.quantity}` : '';
      if (qty) {
        if (!qtyEl) {
          qtyEl = document.createElement('div');
          qtyEl.className = 'item-qty';
          el.appendChild(qtyEl);
        }
        if (qtyEl.textContent !== qty) qtyEl.textContent = qty;
      } else if (qtyEl) {
        qtyEl.remove();
      }

      el.title = isOccupied
        ? `${item.name} (${item.type})${item.quantity > 1 ? ` x${item.quantity}` : ''}`
        : `Backpack Slot ${i + 1} (Empty)`;
    });
  }

  static renderHotbar(hotbarEl, app) {
    if (!hotbarEl) return;
    HUDManager.bindHUDEvents({ hotbarEl }, app);
    const actionBar = app.player.action_bar || Array(10).fill(null);

    let grid = hotbarEl.querySelector('.action-slots-grid');
    if (!grid) {
      let html = `
        <div class="panel-header">ACTIONS & ABILITIES (KEYS 1-9, 0)</div>
        <div class="action-slots-container">
          <div class="action-slots-grid">
      `;

      for (let i = 0; i < 10; i++) {
        const hotkey = GestureEngine.slotIndexToHotkey(i);
        html += `
          <button class="action-slot-btn" data-slot-index="${i}">
            <div class="hotkey-badge">[${hotkey}]</div>
            <div class="btn-icon">•</div>
            <div class="btn-name">Empty</div>
            <div class="btn-cost"></div>
            <div class="cooldown-overlay" style="display:none;"></div>
            <div class="charge-bar-track"><div class="charge-fill"></div></div>
          </button>
        `;
      }

      html += `
          </div>
        </div>
      `;

      hotbarEl.innerHTML = html;
      grid = hotbarEl.querySelector('.action-slots-grid');
    }

    const actionSlotButtons = grid.querySelectorAll('.action-slot-btn');
    actionSlotButtons.forEach((btn, i) => {
      const item = actionBar[i] || null;
      const hotkey = GestureEngine.slotIndexToHotkey(i);
      const isOccupied = item !== null;
      const cdKey = item?.item_id?.replace('spell_', '') || '';
      const cd = app.player.cooldowns?.[cdKey] || 0;
      const isOnCooldown = cd > 0;

      const title = isOccupied
        ? `${item.name} [${hotkey}] (${item.type}) - Tap / Hold / Double-Tap`
        : `Slot [${hotkey}] (Empty)`;

      btn.title = title;
      btn.classList.toggle('on-cooldown', isOnCooldown);

      const iconEl = btn.querySelector('.btn-icon');
      if (iconEl) {
        const newIconHtml = isOccupied ? HUDManager.renderItemIcon(item) : '•';
        if (iconEl.innerHTML !== newIconHtml) iconEl.innerHTML = newIconHtml;
      }

      const nameEl = btn.querySelector('.btn-name');
      if (nameEl) {
        const newName = isOccupied ? item.name : 'Empty';
        if (nameEl.textContent !== newName) nameEl.textContent = newName;
      }

      const costEl = btn.querySelector('.btn-cost');
      if (costEl) {
        const newCost = isOccupied ? (item.quantity > 1 ? `x${item.quantity}` : (item.manaCost ? `${item.manaCost} MP` : 'Ready')) : '';
        if (costEl.textContent !== newCost) costEl.textContent = newCost;
      }

      const cdEl = btn.querySelector('.cooldown-overlay');
      if (cdEl) {
        if (isOnCooldown) {
          cdEl.style.display = '';
          const newCd = `${cd.toFixed(1)}s`;
          if (cdEl.textContent !== newCd) cdEl.textContent = newCd;
        } else {
          cdEl.style.display = 'none';
        }
      }
    });
  }

  static emojiToOpenMojiCode(emoji) {
    if (!emoji) return '1F4E6';
    return EMOJI_TO_SVG_MAP[emoji] || '1F4E6';
  }

  static renderItemIcon(item) {
    if (!item) return '•';
    const catalogItem = ITEMS_CATALOG[item.item_id];
    const code = item.svgCode || catalogItem?.svgCode || (item.icon ? HUDManager.emojiToOpenMojiCode(item.icon) : '1F4E6');
    return `<img class="openmoji-icon" src="./assets/openmoji/${code}.svg" alt="${item.name || 'item'}" />`;
  }

  static logCombat(combatLogScrollEl, message, category = 'system') {
    if (!combatLogScrollEl) return;
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];

    const line = document.createElement('div');
    line.className = `log-line log-${category}`;
    line.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-msg">${HUDManager.escapeHtml(message)}</span>`;

    combatLogScrollEl.appendChild(line);

    const MAX_LOG_LINES = 100;
    while (combatLogScrollEl.childElementCount > MAX_LOG_LINES) {
      combatLogScrollEl.removeChild(combatLogScrollEl.firstElementChild);
    }

    combatLogScrollEl.scrollTop = combatLogScrollEl.scrollHeight;
  }

  static clearCombatLog(combatLogScrollEl) {
    if (combatLogScrollEl) {
      combatLogScrollEl.innerHTML = '';
    }
  }

  static escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
