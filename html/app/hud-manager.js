/**
 * Lokarta: Come Into The Light - HUD & Interface Manager
 */

import { CombatSystem, GestureEngine, InventorySystem, LightingSystem } from '../engine/index.js';
import { soundFX } from '../audio/index.js';
import { ITEMS_CATALOG } from '../data/index.js';

const EMOJI_TO_SVG_MAP = {
  '🧪': '1F9EA',
  '⚗️': '2697',
  '🔷': '1F539',
  '🔥': '1F525',
  '🏹': '1F3F9',
  '🪄': '1FA84',
  '🔮': '1F52E',
  '🗡️': '1F5E1',
  '⚔️': '2694',
  '⚒️': '2692',
  '🔨': '1F528',
  '🛡️': '1F6E1',
  '🦺': '1F9BA',
  '📿': '1F4FF',
  '👑': '1F451',
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
    const { paperdollEl, backpackEl, hotbarEl } = elements;

    if (hotbarEl && !hotbarEl._bound) {
      hotbarEl._bound = true;

      hotbarEl.addEventListener('pointerdown', e => {
        const btn = e.target.closest('.action-slot-btn');
        if (!btn) return;
        e.preventDefault();
        const slotIndex = parseInt(btn.getAttribute('data-slot-index') || '0', 10);
        app.gestureEngine.handleInputDown(slotIndex);
      });

      hotbarEl.addEventListener('pointerup', e => {
        const btn = e.target.closest('.action-slot-btn');
        if (!btn) return;
        e.preventDefault();
        const slotIndex = parseInt(btn.getAttribute('data-slot-index') || '0', 10);
        app.gestureEngine.handleInputUp(slotIndex);
      });

      hotbarEl.addEventListener('pointerleave', e => {
        const btn = e.target.closest('.action-slot-btn');
        if (!btn) return;
        const slotIndex = parseInt(btn.getAttribute('data-slot-index') || '0', 10);
        app.gestureEngine.handleInputUp(slotIndex);
      });
    }

    if (backpackEl && !backpackEl._bound) {
      backpackEl._bound = true;

      backpackEl.addEventListener('click', e => {
        const useBtn = e.target.closest('.use-btn');
        if (useBtn) {
          e.stopPropagation();
          const idx = parseInt(useBtn.getAttribute('data-index') || '-1', 10);
          if (idx >= 0) {
            const res = InventorySystem.useBackpackItem(app.player, idx);
            if (res.success) {
              soundFX.play('equip');
              app.logCombat(res.message, 'loot');
              app.updateHUD();
              app.persistSave();
            } else {
              app.logCombat(res.message, 'warning');
            }
          }
          return;
        }

        const dropBtn = e.target.closest('.drop-btn');
        if (dropBtn) {
          e.stopPropagation();
          const idx = parseInt(dropBtn.getAttribute('data-index') || '-1', 10);
          if (idx >= 0) app.handleDropItem('backpack', idx);
          return;
        }
      });
    }

    if (paperdollEl && !paperdollEl._bound) {
      paperdollEl._bound = true;

      paperdollEl.addEventListener('click', e => {
        const unequipBtn = e.target.closest('.unequip-btn');
        if (unequipBtn) {
          e.stopPropagation();
          const slotKey = unequipBtn.getAttribute('data-slot');
          if (slotKey) app.handleUnequip(slotKey);
        }
      });
    }
  }

  static updateHUD(elements, app) {
    HUDManager.bindHUDEvents(elements, app);
    const { statusBarsEl, paperdollEl, backpackEl, hotbarEl } = elements;
    HUDManager.renderStatusBars(statusBarsEl, app.player, app.currentFloorName);
    HUDManager.renderPaperdoll(paperdollEl, app);
    HUDManager.renderBackpack(backpackEl, app);
    HUDManager.renderHotbar(hotbarEl, app);
  }

  static renderStatusBars(statusBarsEl, player, currentFloorName) {
    if (!statusBarsEl) return;
    const hpPercent = Math.max(0, Math.min(100, (player.hp / player.max_hp) * 100));
    const mpPercent = Math.max(0, Math.min(100, (player.mana / player.max_mana) * 100));
    const xpPercent = player.level >= 20 ? 100 : Math.max(0, Math.min(100, (player.xp / (player.xpToNextLevel || 100)) * 100));
    const vocationDisplay = (player.vocation || 'magician').charAt(0).toUpperCase() + (player.vocation || 'magician').slice(1);
    const dmgBonusPct = Math.round(((player.skillBoosts?.damageMultiplier || 1.0) - 1.0) * 100);

    statusBarsEl.innerHTML = `
      <div class="panel-header">HERO STATUS & DUNGEON PROGRESS</div>
      <div class="status-panel-inner">
        <div class="status-header">
          <div class="vocation-tag"><span class="level-badge">Lv. ${player.level || 1}</span> <strong class="val">${vocationDisplay}</strong></div>
          <div class="floor-tag"><span class="label">Floor:</span> <strong class="val">${player.current_floor || 1}/20 (${currentFloorName})</strong></div>
        </div>

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
                <span>✨ 2.5x Class Mastery</span>
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

  static renderPaperdoll(paperdollEl, app) {
    if (!paperdollEl) return;
    HUDManager.bindHUDEvents({ paperdollEl }, app);
    const paperdoll = app.player.paperdoll || {};
    const slots = [
      { key: 'main_hand', label: 'Main Hand', iconPlaceholder: '<img class="openmoji-icon placeholder" src="./assets/openmoji/2694.svg" alt="Main Hand" />' },
      { key: 'off_hand', label: 'Off Hand', iconPlaceholder: '<img class="openmoji-icon placeholder" src="./assets/openmoji/1F6E1.svg" alt="Off Hand" />' },
      { key: 'armor', label: 'Armor', iconPlaceholder: '<img class="openmoji-icon placeholder" src="./assets/openmoji/1F9BA.svg" alt="Armor" />' },
      { key: 'relic', label: 'Relic', iconPlaceholder: '<img class="openmoji-icon placeholder" src="./assets/openmoji/1F4FF.svg" alt="Relic" />' },
    ];

    let html = `
      <div class="panel-header">EQUIPMENT (4 SLOTS)</div>
      <div class="paperdoll-slots-grid">
    `;

    for (const slot of slots) {
      const item = paperdoll[slot.key];
      const hasItem = Boolean(item);
      const itemName = hasItem ? item.name : 'Empty';
      const statBonus = hasItem && item.stat_bonus > 0 ? ` (+${item.stat_bonus})` : '';

      html += `
        <div class="paperdoll-slot ${hasItem ? 'occupied' : 'empty'}" data-slot="${slot.key}" title="${slot.label}: ${itemName}${statBonus}">
          <div class="slot-label">${slot.key.replace('_', ' ').toUpperCase()}</div>
          <div class="slot-content">
            ${hasItem ? HUDManager.renderItemIcon(item) : `<span class="empty-icon">${slot.iconPlaceholder}</span>`}
          </div>
          <div class="slot-item-name">${itemName}</div>
          ${hasItem ? `<button class="unequip-btn" data-slot="${slot.key}" title="Unequip">✕</button>` : ''}
        </div>
      `;
    }

    html += `</div>`;
    paperdollEl.innerHTML = html;
  }

  static renderBackpack(backpackEl, app) {
    if (!backpackEl) return;
    HUDManager.bindHUDEvents({ backpackEl }, app);
    const backpack = app.player.backpack || [null, null, null, null, null, null];
    const occupiedCount = backpack.filter(Boolean).length;

    let html = `
      <div class="panel-header">
        <span>BACKPACK (6 SLOTS)</span>
        <span class="slot-count">${occupiedCount}/6</span>
      </div>
      <div class="backpack-slots-grid">
    `;

    for (let i = 0; i < 6; i++) {
      const item = backpack[i] || null;
      const isOccupied = item !== null;
      const tooltip = isOccupied
        ? `${item.name} (${item.type})${item.quantity > 1 ? ` x${item.quantity}` : ''}${item.stat_bonus > 0 ? ` [Stat: +${item.stat_bonus}]` : ''}`
        : `Backpack Slot ${i + 1} (Empty)`;

      html += `
        <div class="backpack-slot ${isOccupied ? 'occupied' : 'empty'}" data-index="${i}" title="${tooltip}">
          <div class="slot-num">#${i + 1}</div>
          <div class="slot-content">
            ${isOccupied ? HUDManager.renderItemIcon(item) : ''}
          </div>
          ${isOccupied && item.quantity > 1 ? `<div class="item-qty">x${item.quantity}</div>` : ''}
          <div class="slot-item-name">${isOccupied ? item.name : 'Empty'}</div>
          ${
            isOccupied
              ? `<div class="slot-actions">
                  <button class="use-btn" data-index="${i}" title="Use / Equip">Use</button>
                  <button class="drop-btn" data-index="${i}" title="Drop to ground">Drop</button>
                </div>`
              : ''
          }
        </div>
      `;
    }

    html += `</div>`;
    backpackEl.innerHTML = html;
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
      const isNative = isOccupied && CombatSystem.isNativeItem(item, app.player.vocation);

      const title = isOccupied
        ? `${item.name} [${hotkey}] (${item.type}) - Tap / Hold / Double-Tap${isNative ? ' [★ 2.5x Mastery]' : ''}`
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
