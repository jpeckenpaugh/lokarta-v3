/**
 * Lokarta: Come Into The Light - Modals & Screen Overlays Manager
 */

import { FateGrantSystem } from '../engine/index.js';
import { soundFX } from '../audio/index.js';
import { HUDManager } from './hud-manager.js';

export class ModalManager {
  static showTitleScreen(modalOverlayEl, savedPlayer, callbacks) {
    modalOverlayEl.classList.remove('hidden');

    let continueBtnHtml = '';
    if (savedPlayer) {
      const voc = (savedPlayer.vocation || 'magician').toUpperCase();
      continueBtnHtml = `
        <div class="continue-summary-card">
          <div class="save-tag"><img class="openmoji-icon badge-icon" src="./assets/openmoji/2B50.svg" alt="Star" /> SAVED HERO AVAILABLE</div>
          <div class="save-details"><strong>${voc}</strong> (Level ${savedPlayer.level || 1})</div>
          <div class="save-stats">Floor ${savedPlayer.current_floor || 1}/20 • HP: ${savedPlayer.hp}/${savedPlayer.max_hp} • MP: ${savedPlayer.mana}/${savedPlayer.max_mana}</div>
        </div>
        <button class="title-btn continue-btn" id="title-btn-continue"><img class="openmoji-icon btn-emoji" src="./assets/openmoji/2694.svg" alt="Swords" /> CONTINUE ADVENTURE</button>
      `;
    }

    modalOverlayEl.innerHTML = `
      <div class="title-screen-modal">
        <div class="torch-flicker-container">
          <span class="title-torch left-torch"><img class="openmoji-icon torch-icon" src="./assets/openmoji/1F525.svg" alt="Torch" /></span>
          <span class="title-torch right-torch"><img class="openmoji-icon torch-icon" src="./assets/openmoji/1F525.svg" alt="Torch" /></span>
        </div>
        <div class="title-emblem"><img class="openmoji-icon emblem-icon" src="./assets/openmoji/1F56F.svg" alt="Candle" /></div>
        <h1 class="title-main">LOKARTA</h1>
        <div class="title-subtitle">COME INTO THE LIGHT</div>
        <div class="title-tagline">A Gothic Roguelike Dungeon Crawl</div>
        <div class="title-menu-actions">
          ${continueBtnHtml}
          <button class="title-btn new-game-btn" id="title-btn-new-game"><img class="openmoji-icon btn-emoji" src="./assets/openmoji/1F56F.svg" alt="Candle" /> NEW EXPEDITION</button>
        </div>
        <div class="title-footer">v2.3 • 10 Action Slots • Fate Grant Draft • 10-Tile FOV</div>
      </div>
    `;

    document.getElementById('title-btn-continue')?.addEventListener('click', async () => {
      soundFX.play('click');
      modalOverlayEl.classList.add('hidden');
      modalOverlayEl.innerHTML = '';
      if (callbacks.onContinue) await callbacks.onContinue(savedPlayer);
    });

    document.getElementById('title-btn-new-game')?.addEventListener('click', () => {
      soundFX.play('click');
      if (callbacks.onNewGame) callbacks.onNewGame();
    });
  }

  static showCharacterSelectModal(modalOverlayEl, onSelectVocation) {
    modalOverlayEl.classList.remove('hidden');
    modalOverlayEl.innerHTML = `
      <div class="character-select-modal">
        <div class="modal-header">
          <h2>CHOOSE YOUR VOCATION</h2>
          <div class="subtitle">Descend into the 20 Subterranean Vaults of Lokarta</div>
        </div>
        <p class="prompt">Select your champion. Each vocation wields unique combat mechanics & 2.5x Mastery bonuses:</p>
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
          modalOverlayEl.classList.add('hidden');
          modalOverlayEl.innerHTML = '';
          if (onSelectVocation) await onSelectVocation(vocation);
        }
      });
    });
  }

  static showGuideModal(modalOverlayEl) {
    modalOverlayEl.classList.remove('hidden');
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
              <li><strong>Weapons in Action Slots:</strong> Pressing weapon hotkey attacks targeted/in-range enemy.</li>
              <li><strong>2.5x Class Mastery:</strong> Using native vocation equipment/spells grants 2.5x damage/healing multiplier!</li>
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
      modalOverlayEl.classList.add('hidden');
      modalOverlayEl.innerHTML = '';
    });
  }

  static showFateGrantModal(modalOverlayEl, app, level = 1) {
    if (app) app.isPaused = true;

    const offer = FateGrantSystem.generateDraftOffer(app.player, level);
    const selectedCards = new Set();

    modalOverlayEl.classList.remove('hidden');
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

      modalOverlayEl.classList.add('hidden');
      modalOverlayEl.innerHTML = '';
      if (app) app.isPaused = false;
      app.updateHUD();
      await app.persistSave();
    });
  }

  static showVictoryModal(modalOverlayEl, player) {
    modalOverlayEl.classList.remove('hidden');
    modalOverlayEl.innerHTML = `
      <div class="result-modal victory-modal">
        <h2>🏆 ULTIMATE VICTORY!</h2>
        <p class="result-subtitle">Lokarta Subterranean Campaign - All 20 Floors Cleared</p>
        <p>You have illuminated the darkest depths of the subterranean abyss and vanquished the Void Core!</p>
        <div class="character-summary">
          <p><strong>Vocation:</strong> ${(player.vocation || 'magician').toUpperCase()}</p>
          <p><strong>Final Level:</strong> Level ${player.level || 1}</p>
          <p><strong>Damage Boost:</strong> +${Math.round(((player.skillBoosts?.damageMultiplier || 1) - 1) * 100)}% (2.5x Mastery)</p>
          <p><strong>Remaining HP:</strong> ${player.hp} / ${player.max_hp}</p>
          <p><strong>Remaining MP:</strong> ${player.mana} / ${player.max_mana}</p>
        </div>
        <button class="action-btn" id="btn-restart">Play Again</button>
      </div>
    `;

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      soundFX.play('click');
      modalOverlayEl.classList.add('hidden');
      modalOverlayEl.innerHTML = '';
      window.location.reload();
    });
  }

  static showGameOverModal(modalOverlayEl, player) {
    soundFX.play('defeat');
    modalOverlayEl.classList.remove('hidden');
    modalOverlayEl.innerHTML = `
      <div class="result-modal defeat-modal">
        <h2>💀 YOU HAVE PERISHED</h2>
        <p class="result-subtitle">Floor ${player.current_floor || 1}/20 Claims Another Soul</p>
        <p>Your light has been extinguished in the subterranean shadows.</p>
        <button class="action-btn" id="btn-retry">Try Again</button>
      </div>
    `;

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      soundFX.play('click');
      modalOverlayEl.classList.add('hidden');
      modalOverlayEl.innerHTML = '';
      window.location.reload();
    });
  }
}
