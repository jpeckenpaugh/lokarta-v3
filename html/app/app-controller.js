/**
 * Lokarta: Come Into The Light - Main Application Controller
 */

import { GameClient } from '../worker/game-client.js';
import {
  CONFIG,
  GridMap,
  LightingSystem,
  ProgressionSystem,
  CombatSystem,
  EntityAI,
  InventorySystem,
  GestureEngine,
  createPlayer,
} from '../engine/index.js';
import { soundFX } from '../audio/index.js';
import { ITEMS_CATALOG, ABILITIES_CATALOG, KEYBINDINGS_CATALOG, VOCATIONS_CATALOG, UI_CATALOG } from '../data/index.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { HUDManager } from './hud-manager.js';
import { ModalManager } from './modal-manager.js';
import { InputController } from './input-controller.js';
import { TransitionController } from './transition-controller.js';
import { TitleAmbient } from './title-ambient.js';
import { normalizeOptions, resolveReducedMotion, summarizeSlot } from '../services/save-slots.js';
import {
  createAnimState,
  ensureAnim,
  setAnimState,
  advanceAnim,
  dirFromFacing,
  ANIM_DURATION_MS,
} from './animation-state.js';

const DIRECTION_VECTORS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export class LokartaApp {
  constructor() {
    this.gameClient = new GameClient();
    this.player = createPlayer('magician');
    this.gridMap = new GridMap();
    this.monsters = [];
    this.ambientLights = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.deathEffects = [];
    this.selectedMonsterId = null;
    this.player.anim = createAnimState(this.player.facing || 'down');

    this.isRunning = false;
    this.isGameOver = false;
    this.isFloorCleared = false;
    this.currentFloorName = 'Crypt';

    this.tickTimer = null;
    this.animFrameId = null;
    this.lastAnimTime = 0;
    this.keysDown = new Set();
    this.regenAccumulator = 0;
    this.ammoRegenAccumulator = 0; // Grey Stalker quiver arrow regen (5 s cadence)
    this._lastQuiverRef = null; // quiver swap detection resets the accumulator

    this.canvas = document.getElementById('game-canvas');
    this.renderer = new CanvasRenderer(this.canvas);

    this.statusBarsEl = document.getElementById('status-bars-container');
    this.paperdollEl = document.getElementById('paperdoll-container');
    this.backpackEl = document.getElementById('backpack-container');
    this.hotbarEl = document.getElementById('hotbar-container');
    this.combatLogScrollEl = document.getElementById('log-entries-container');
    this.modalOverlayEl = document.getElementById('modal-overlay');
    this.splashOverlayEl = document.getElementById('splash-overlay');
    this.titleAmbientCanvas = document.getElementById('title-ambient-canvas');
    this.transitionOverlayEl = document.getElementById('screen-transition');
    this.transition = new TransitionController(this.transitionOverlayEl);

    this.slots = [];
    this.options = normalizeOptions(null);
    this.lastPlayedSlotIndex = null;
    this.reduceMotionResolved = false;
    this.pendingSlotIndex = null;
    this.slotSelectMode = 'create';
    this.optionsReturnTo = 'title';
    this.isInGameplay = false;
    this.fpsEl = null;
    this.fpsFrames = 0;
    this.fpsAccumMs = 0;
    this.fpsValue = 0;
    this._mqlHandler = null;
    this.splashPromise = null;

    this.gestureEngine = new GestureEngine(
      event => this.handleGestureEvent(event),
      (slotIndex, ratio) => this.handleChargeUpdate(slotIndex, ratio)
    );

    this.inputController = new InputController(this);

    this.init();
  }

  async init() {
    window.addEventListener('resize', () => this.renderer.resize());
    this.renderer.resize();
    this.inputController.bindInputs();
    this.bindChromeControls();

    let bootstrapData = null;
    try {
      bootstrapData = await this.gameClient.bootstrap();
    } catch (err) {
      console.error('Failed to bootstrap Lokarta:', err);
    }

    if (bootstrapData) {
      this.profile = bootstrapData.profile || null;
      this.options = normalizeOptions(bootstrapData.options);
      this.slots = bootstrapData.slots || [];
      this.lastPlayedSlotIndex = bootstrapData.lastPlayedSlotIndex ?? null;
    }

    this.applyOptions(this.options);

    if (this.splashPromise) {
      try {
        await this.splashPromise;
      } catch {
        // Splash failure must never block the title screen.
      }
    }

    this.showTitleScreen();
  }

  bindChromeControls() {
    document.getElementById('header-guide-btn')?.addEventListener('click', () => {
      soundFX.play('click');
      if (this.isInGameplay && !this.isGameOver) this.openPauseMenu();
      else this.showGuideModal();
    });

    const audioBtn = document.getElementById('audio-toggle-btn');
    audioBtn?.addEventListener('click', async () => {
      soundFX.init();
      await this.setOption({ soundEffects: !this.options.soundEffects });
    });
    this.updateAudioButton();

    document.addEventListener('fullscreenchange', () => this.syncFullscreenState());
  }

  updateAudioButton() {
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (!audioBtn) return;
    const on = Boolean(this.options.soundEffects);
    audioBtn.textContent = on ? '🔊 Sound: ON' : '🔈 Sound: OFF';
    audioBtn.classList.toggle('muted', !on);
  }

  hasSaves() {
    return this.slots.some(s => s && s.status === 'occupied');
  }

  async refreshSlots() {
    try {
      const res = await this.gameClient.listSlots();
      this.slots = res.slots || [];
    } catch (err) {
      console.warn('Failed to refresh save slots:', err);
    }
  }

  /** Applies the persisted options to the live UI. */
  applyOptions(options) {
    this.options = normalizeOptions(options);
    const o = this.options;

    soundFX.setEnabled(Boolean(o.soundEffects));
    soundFX.setVolume(Number(o.sfxVolume));
    this.updateAudioButton();

    this.applyReducedMotion();

    const uiScaleMap = UI_CATALOG?.options?.ranges?.uiScale || {};
    const uiScale = typeof uiScaleMap[o.uiScale] === 'number' ? uiScaleMap[o.uiScale] : 1;
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--ui-scale', String(uiScale));
    }

    const pixelMap = UI_CATALOG?.options?.ranges?.pixelScale || {};
    const zoom = typeof pixelMap[o.pixelScale] === 'number' ? pixelMap[o.pixelScale] : 64;
    this.renderer.setZoom(zoom);

    this.updateFpsBadge();
  }

  /** Applies an options patch live and persists it through the worker. */
  async setOption(patch) {
    if (patch && patch.fullscreen !== undefined) {
      try {
        if (patch.fullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen?.();
        } else if (!patch.fullscreen && document.fullscreenElement) {
          await document.exitFullscreen?.();
        }
      } catch (err) {
        console.warn('Fullscreen request was rejected:', err);
      }
    }

    this.applyOptions({ ...this.options, ...patch });

    try {
      const res = await this.gameClient.setOptions(patch);
      if (res && res.options) this.applyOptions(res.options);
    } catch (err) {
      console.warn('Failed to persist options:', err);
    }
  }

  applyReducedMotion() {
    const setting = this.options.reduceMotion;
    const mql = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    this.reduceMotionResolved = resolveReducedMotion(setting, mql ? mql.matches : false);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('reduced-motion', this.reduceMotionResolved);
    }
    this.transition.setReducedMotion(this.reduceMotionResolved);

    if (mql) {
      if (this._mqlHandler) mql.removeEventListener('change', this._mqlHandler);
      this._mqlHandler = () => {
        if (this.options.reduceMotion !== 'system') return;
        this.applyReducedMotion();
        if (this.isInGameplay) return;
        if (this.modalOverlayEl.querySelector('.title-screen-modal')) this.startTitleAmbient();
      };
      mql.addEventListener('change', this._mqlHandler);
    }
  }

  syncFullscreenState() {
    const actual = typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
    if (actual === this.options.fullscreen) return;
    this.options = normalizeOptions({ ...this.options, fullscreen: actual });
    if (this.modalOverlayEl.querySelector('.options-modal')) {
      this.showOptionsModal(this.optionsReturnTo);
    }
  }

  updateFpsBadge() {
    if (typeof document === 'undefined') return;
    const show = Boolean(this.options.showFps);
    if (show && !this.fpsEl) {
      this.fpsEl = document.createElement('span');
      this.fpsEl.id = 'fps-counter';
      this.fpsEl.className = 'fps-counter';
      const host = document.querySelector('.system-controls') || document.body;
      host.appendChild(this.fpsEl);
    } else if (!show && this.fpsEl) {
      this.fpsEl.remove();
      this.fpsEl = null;
    }
  }

  updateFps(dtMs) {
    this.fpsFrames += 1;
    this.fpsAccumMs += dtMs;
    if (this.fpsAccumMs >= 500) {
      this.fpsValue = Math.round((this.fpsFrames * 1000) / this.fpsAccumMs);
      this.fpsFrames = 0;
      this.fpsAccumMs = 0;
      if (this.fpsEl) this.fpsEl.textContent = `${this.fpsValue} FPS`;
    }
  }

  startTitleAmbient() {
    if (!this.titleAmbientCanvas) return;
    TitleAmbient.start(this.titleAmbientCanvas, { reduceMotion: this.reduceMotionResolved });
  }

  stopTitleAmbient() {
    TitleAmbient.stop();
  }

  showTitleScreen() {
    this.stopGameLoop();
    this.isInGameplay = false;
    this.isPaused = false;
    this.transition.forceRelease();

    ModalManager.showTitleScreen(this.modalOverlayEl, {
      slots: this.slots,
      hasSaves: this.hasSaves(),
      lastPlayedSlotIndex: this.lastPlayedSlotIndex,
    }, {
      onNewGame: () => this.openSlotSelect('create'),
      onContinue: () => this.openSlotSelect('load'),
      onOptions: () => this.showOptionsModal('title'),
      onGuide: () => this.showGuideModal(),
    });

    this.startTitleAmbient();
  }

  showCharacterSelectModal() {
    this.stopTitleAmbient();
    this.transition.run('titleToSelect', () => {
      ModalManager.showCharacterSelectModal(this.modalOverlayEl, async vocation => {
        await this.startNewGame(vocation);
      });
    });
  }

  showGuideModal() {
    const returnTo = this.isInGameplay ? 'pause' : 'title';
    ModalManager.showGuideModal(this.modalOverlayEl, {
      onClose: () => {
        if (returnTo === 'pause') this.openPauseMenu();
        else this.showTitleScreen();
      },
    });
  }

  openPauseMenu() {
    this.isPaused = true;
    ModalManager.showPauseModal(this.modalOverlayEl, {
      onResume: () => this.resumeGameplay(),
      onOptions: () => this.showOptionsModal('pause'),
      onGuide: () => this.showGuideModal(),
      onReturnToTitle: () => this.returnToTitle(),
    });
  }

  resumeGameplay() {
    this.closeModal();
    this.isPaused = false;
  }

  showOptionsModal(returnTo = 'title') {
    this.optionsReturnTo = returnTo;
    this.stopTitleAmbient();
    ModalManager.showOptionsModal(this.modalOverlayEl, this.options, {
      onChange: patch => this.setOption(patch),
      onReset: () => this.confirmResetOptions(),
      onSaveData: () => this.openSlotSelect('manage'),
      onBack: () => this.returnFromOptions(),
    });
  }

  returnFromOptions() {
    if (this.optionsReturnTo === 'pause') {
      this.openPauseMenu();
      return;
    }
    this.showTitleScreen();
  }

  confirmResetOptions() {
    ModalManager.showConfirmModal(this.modalOverlayEl, {
      title: 'RESET OPTIONS?',
      body: 'All options return to their default values. Save slots are not affected.',
      confirmLabel: 'RESET',
      onConfirm: async () => {
        let options = normalizeOptions(null);
        try {
          const res = await this.gameClient.resetOptions();
          if (res && res.options) options = res.options;
        } catch (err) {
          console.warn('Failed to reset options:', err);
        }
        this.applyOptions(options);
        this.showOptionsModal(this.optionsReturnTo);
      },
      onCancel: () => this.showOptionsModal(this.optionsReturnTo),
    });
  }

  openSlotSelect(mode = 'create') {
    this.slotSelectMode = mode;
    this.stopTitleAmbient();
    ModalManager.showSlotSelectModal(this.modalOverlayEl, {
      slots: this.slots,
      mode,
      lastPlayedSlotIndex: this.lastPlayedSlotIndex,
    }, {
      onNew: index => this.beginNewGame(index),
      onLoad: index => this.loadGame(index),
      onOverwrite: index => this.confirmOverwrite(index),
      onDelete: index => this.confirmDelete(index),
      onBack: () => {
        if (mode === 'manage') this.showOptionsModal(this.optionsReturnTo);
        else this.showTitleScreen();
      },
    });
  }

  beginNewGame(slotIndex) {
    const slot = this.slots.find(s => s.slotIndex === slotIndex);
    if (slot && slot.status === 'occupied') {
      this.confirmOverwrite(slotIndex);
      return;
    }
    this.pendingSlotIndex = slotIndex;
    this.showCharacterSelectModal();
  }

  confirmOverwrite(slotIndex) {
    const slot = this.slots.find(s => s.slotIndex === slotIndex) || { slotIndex };
    ModalManager.showConfirmModal(this.modalOverlayEl, {
      title: `OVERWRITE SLOT ${slotIndex}?`,
      body: `This permanently deletes ${summarizeSlot(slot)}. This cannot be undone.`,
      confirmLabel: 'OVERWRITE',
      danger: true,
      onConfirm: () => {
        this.pendingSlotIndex = slotIndex;
        this.showCharacterSelectModal();
      },
      onCancel: () => this.openSlotSelect(this.slotSelectMode),
    });
  }

  confirmDelete(slotIndex) {
    const slot = this.slots.find(s => s.slotIndex === slotIndex) || { slotIndex };
    ModalManager.showConfirmModal(this.modalOverlayEl, {
      title: `DELETE SLOT ${slotIndex}?`,
      body: `This permanently deletes ${summarizeSlot(slot)}. This cannot be undone.`,
      confirmLabel: 'DELETE',
      danger: true,
      onConfirm: async () => {
        try {
          await this.gameClient.deleteSlot(slotIndex);
        } catch (err) {
          console.error('Failed to delete slot:', err);
        }
        await this.refreshSlots();
        this.openSlotSelect(this.slotSelectMode);
      },
      onCancel: () => this.openSlotSelect(this.slotSelectMode),
    });
  }

  showLoadError(slotIndex) {
    ModalManager.showConfirmModal(this.modalOverlayEl, {
      title: `COULD NOT LOAD SLOT ${slotIndex}`,
      body: `Could not load Slot ${slotIndex}. Try again.`,
      confirmLabel: 'OK',
      cancelLabel: 'BACK',
      onConfirm: () => this.openSlotSelect(this.slotSelectMode),
      onCancel: () => this.openSlotSelect(this.slotSelectMode),
    });
  }

  adoptPlayer(player, floor) {
    this.closeModal();
    this.player = player;
    this.isGameOver = false;
    this.isFloorCleared = false;
    this.isPaused = false;
    this.applyDungeonData(floor);
    this.isInGameplay = true;
  }

  closeModal() {
    this.modalOverlayEl.classList.add('hidden');
    this.modalOverlayEl.innerHTML = '';
    this.modalOverlayEl.classList.remove('title-active');
  }

  async startNewGame(vocation) {
    const slotIndex = this.pendingSlotIndex || 1;
    try {
      const data = await this.gameClient.createSlot(slotIndex, vocation);
      this.lastPlayedSlotIndex = slotIndex;
      await this.refreshSlots();

      await this.transition.run('selectToGame', async () => {
        this.adoptPlayer(data.player, data.floor);
        this.clearCombatLog();
        this.logCombat(`Welcome to Lokarta, brave ${(this.player.vocation || 'magician').toUpperCase()}!`, 'victory');
        this.logCombat('Fate calls upon you: Draft your starter cards.', 'spell');
        this.startGameLoop();
      });

      this.showFateGrantModal(1);
    } catch (err) {
      console.error('Failed to start new game:', err);
      this.showLoadError(slotIndex);
    }
  }

  async loadGame(slotIndex) {
    try {
      const data = await this.gameClient.loadSlot(slotIndex);
      this.lastPlayedSlotIndex = slotIndex;
      await this.refreshSlots();

      await this.transition.run('selectToGame', async () => {
        this.adoptPlayer(data.player, data.floor);
        this.clearCombatLog();
        this.logCombat(`Resumed expedition on Floor ${this.player.current_floor || 1}/20 (${this.currentFloorName}).`, 'system');
        this.startGameLoop();
      });

      const isActionBarEmpty = this.player.action_bar?.every(s => s === null);
      if (isActionBarEmpty && this.player.level === 1) {
        this.showFateGrantModal(1);
      }
    } catch (err) {
      console.error('Failed to load saved game:', err);
      this.showLoadError(slotIndex);
    }
  }

  returnToTitle() {
    this.transition.run('toTitle', async () => {
      this.stopTitleAmbient();
      this.showTitleScreen();
    });
  }

  applyDungeonData(floorData) {
    this.currentFloorName = floorData.biome_name || 'Crypt';
    this.gridMap.loadFromMatrix(floorData.tiles);

    for (const item of floorData.items || []) {
      this.gridMap.addItem(item.x, item.y, item);
    }

    this.ambientLights = [];
    this.monsters = (floorData.monsters || []).map(s => ({
      ...s,
      isAggroed: false,
      moveCooldown: 0,
      attackCooldown: 0,
      attackCadence: s.attackCadence || (s.type === 'giant_rat' ? CONFIG.RAT_ATTACK_CADENCE_SEC : s.type === 'crypt_skeleton' ? CONFIG.SKELETON_ATTACK_CADENCE_SEC : CONFIG.CULTIST_ATTACK_CADENCE_SEC),
      visible: false,
      anim: createAnimState(s.facing || 'down'),
    }));
    if (this.player) this.player.anim = createAnimState(this.player.facing || 'down');
  }

  /** Monotonic-ish clock for animation locks. */
  nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  /** Spawn a transient death effect for a defeated actor. */
  spawnDeathEffect(actor) {
    if (!actor) return;
    if (!this.deathEffects) this.deathEffects = [];
    const frames = (actor.type === 'abyssal_overlord' || actor.isBoss) ? 6 : 4;
    const facing = actor.facing || 'down';
    this.deathEffects.push({
      spriteId: actor.type || actor.vocation || actor.spriteId,
      type: actor.type,
      vocation: actor.vocation,
      facing,
      x: actor.x,
      y: actor.y,
      ageMs: 0,
      totalMs: frames * 120 + 200,
      anim: {
        state: 'death',
        dir: dirFromFacing(facing),
        frame: 0,
        elapsedMs: 0,
        flipX: false,
        lockedUntilMs: Number.POSITIVE_INFINITY,
      },
    });
  }

  /** Trigger a hit reaction on the monster occupying a tile (if any). */
  triggerMonsterHit(gridX, gridY) {
    if (!this.monsters) return;
    const m = this.monsters.find(mm => mm.hp > 0 && mm.x === gridX && mm.y === gridY);
    if (m) setAnimState(m, 'hit', this.nowMs());
  }

  showFateGrantModal(level = 1) {
    ModalManager.showFateGrantModal(this.modalOverlayEl, this, level);
  }

  startGameLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isGameOver = false;
    this.isFloorCleared = false;

    this.tickTimer = window.setInterval(() => this.tick(), CONFIG.TICK_INTERVAL_MS);

    this.lastAnimTime = performance.now();
    const renderFrame = time => {
      const dt = time - this.lastAnimTime;
      this.lastAnimTime = time;
      this.updateAnimations(dt);
      this.render();
      if (this.options.showFps) this.updateFps(dt);

      if (this.isRunning) {
        this.animFrameId = requestAnimationFrame(renderFrame);
      }
    };
    this.animFrameId = requestAnimationFrame(renderFrame);
    this.updateHUD();
  }

  stopGameLoop() {
    this.isRunning = false;
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  tick() {
    if (!this.isRunning || this.isGameOver || this.isPaused || this.isFloorCleared) return;
    const deltaSec = CONFIG.TICK_INTERVAL_MS / 1000;

    // 0. Accumulate playtime for the slot card
    this.player.playtimeMs = (this.player.playtimeMs || 0) + CONFIG.TICK_INTERVAL_MS;

    // 1. Movement
    this.processMovementInput();

    // 2. Decrement cooldowns
    CombatSystem.decrementCooldowns(this.player, deltaSec);
    CombatSystem.decrementSpellTimers(this.player, deltaSec);

    // Holy Shield bubble decay: bubble pops when its duration hits 0.
    if (this.player.shieldDurationSec > 0) {
      this.player.shieldDurationSec = Math.max(0, this.player.shieldDurationSec - deltaSec);
      if (this.player.shieldDurationSec <= 0) {
        this.player.shieldAbsorb = 0;
      }
    }

    // Fortify Stance decay: -50% incoming damage for 10 s.
    if (this.player.fortifyTimer > 0) {
      this.player.fortifyTimer = Math.max(0, this.player.fortifyTimer - deltaSec);
      if (this.player.fortifyTimer <= 0) {
        this.player.fortifyActive = false;
      }
    }

    // Grey Stalker quiver arrow regen: +1 arrow per ammoRegenSec (5 s base)
    // while below capacity. The accumulator resets on regen and on quiver swap.
    const quiver = this.player.paperdoll?.off_hand;
    if (quiver !== this._lastQuiverRef) {
      this._lastQuiverRef = quiver;
      this.ammoRegenAccumulator = 0;
    }
    if (quiver && typeof quiver.arrowCount === 'number' && typeof quiver.arrowCapacity === 'number') {
      if (quiver.arrowCount < quiver.arrowCapacity) {
        const regenSec = (quiver.ammoRegenSec || 5);
        this.ammoRegenAccumulator += deltaSec;
        if (this.ammoRegenAccumulator >= regenSec) {
          const gained = Math.min(
            quiver.arrowCapacity - quiver.arrowCount,
            Math.floor(this.ammoRegenAccumulator / regenSec)
          );
          quiver.arrowCount += gained;
          this.ammoRegenAccumulator %= regenSec;
          this.addFloatingText(`+${gained} Arrow`, this.player.x, this.player.y, '#ddaa44');
        }
      } else {
        this.ammoRegenAccumulator = 0;
      }
    }

    // Passive regeneration (every 5 seconds)
    const bonusRegen = this.player.skillBoosts?.bonusRegen || 0;
    this.regenAccumulator += deltaSec;
    if (this.regenAccumulator >= 5.0) {
      this.regenAccumulator -= 5.0;
      const vocDef = VOCATIONS_CATALOG[this.player.vocation];
      const regenType = vocDef?.regenResource || (this.player.vocation === 'magician' ? 'mana' : 'hp');
      const amt = 2 + bonusRegen;
      if (regenType === 'mana' && this.player.mana < this.player.max_mana) {
        this.player.mana = Math.min(this.player.max_mana, this.player.mana + amt);
        this.addFloatingText(`+${amt} MP`, this.player.x, this.player.y, '#3b82f6');
      } else if (regenType === 'hp' && this.player.hp < this.player.max_hp) {
        this.player.hp = Math.min(this.player.max_hp, this.player.hp + amt);
        this.addFloatingText(`+${amt} HP`, this.player.x, this.player.y, '#22c55e');
      }
    }

    // Auto-Prayer Pulse (Luminous Amulet every 10 seconds)
    const equippedRelic = this.player.paperdoll?.relic;
    if (equippedRelic && equippedRelic.item_id === 'relic_luminous_amulet') {
      if (!this.prayerAccumulator) this.prayerAccumulator = 0;
      this.prayerAccumulator += deltaSec;
      if (this.prayerAccumulator >= 10.0) {
        this.prayerAccumulator -= 10.0;
        const rank = equippedRelic.itemLevel || 1;
        const pointsPool = rank * 2; // Rank 1: 2, Rank 2: 4, Rank 3: 6, Rank 4: 8, Rank 5: 10

        let hpNeeded = Math.max(0, this.player.max_hp - this.player.hp);
        let manaNeeded = Math.max(0, this.player.max_mana - this.player.mana);

        let hpRestored = 0;
        let manaRestored = 0;
        let poolRemaining = pointsPool;

        if (hpNeeded > 0 && poolRemaining > 0) {
          hpRestored = Math.min(hpNeeded, poolRemaining);
          poolRemaining -= hpRestored;
          this.player.hp += hpRestored;
        }

        if (manaNeeded > 0 && poolRemaining > 0) {
          manaRestored = Math.min(manaNeeded, poolRemaining);
          poolRemaining -= manaRestored;
          this.player.mana += manaRestored;
        }

        if (hpRestored > 0 || manaRestored > 0) {
          soundFX.play('holyChime');
          let text = '';
          if (hpRestored > 0 && manaRestored > 0) text = `+${hpRestored} HP / +${manaRestored} MP`;
          else if (hpRestored > 0) text = `+${hpRestored} HP`;
          else text = `+${manaRestored} MP`;

          this.addFloatingText(text, this.player.x, this.player.y, '#f59e0b');
          this.logCombat(`Luminous Amulet Prayer restored ${text}.`, 'spell');
          this.updateHUD();
        }
      }
    }

    // Power Pulse (Apprentice's Cape armor)
    const equippedArmor = this.player.paperdoll?.armor;
    if (equippedArmor && equippedArmor.item_id === 'apprentice_cape') {
      if (!this.powerPulseAccumulator) this.powerPulseAccumulator = 0;
      this.powerPulseAccumulator += deltaSec;
      const rank = Math.min(5, Math.max(1, equippedArmor.itemLevel || 1));
      const intervalSec = Math.max(12, 22 - 2 * rank); // Rank 1: 20s, Rank 2: 18s, Rank 3: 16s, Rank 4: 14s, Rank 5: 12s

      if (this.powerPulseAccumulator >= intervalSec) {
        this.powerPulseAccumulator -= intervalSec;
        const mpRestored = rank; // +1 MP at Rank 1 up to +5 MP at Rank 5

        if (this.player.mana < this.player.max_mana) {
          const actualRestored = Math.min(mpRestored, this.player.max_mana - this.player.mana);
          this.player.mana += actualRestored;
          soundFX.play('manaRegen');
          this.addFloatingText(`+${actualRestored} MP Pulse`, this.player.x, this.player.y, '#38bdf8');
          this.logCombat(`Apprentice's Cape Power Pulse restored +${actualRestored} MP!`, 'spell');
          this.updateHUD();
        }
      }
    }

    // 3. Update lighting
    LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);

    // 4. Update monster AI
    const positionsBefore = this.monsters.map(m => ({ m, x: m.x, y: m.y }));
    const aiResults = EntityAI.updateMonsters(this.monsters, this.player, this.gridMap, deltaSec);
    for (const res of aiResults) {
      if (res.message) this.logCombat(res.message, 'combat');
      if (res.projectiles) this.projectiles.push(...res.projectiles);
      if (res.sourceMonster && (res.dodged || (res.damageToPlayer && res.damageToPlayer > 0) || (res.absorbed && res.absorbed > 0))) {
        setAnimState(res.sourceMonster, 'attack', this.nowMs());
      }
      if (res.dodged) {
        soundFX.play('monsterAttack');
        this.addFloatingText('DODGE!', this.player.x, this.player.y, '#22c55e');
      } else if (res.damageToPlayer && res.damageToPlayer > 0) {
        soundFX.play('monsterAttack');
        soundFX.play('playerHurt');
        setAnimState(this.player, 'hit', this.nowMs());
        this.addFloatingText(`-${res.damageToPlayer}`, this.player.x, this.player.y, '#ef4444');
        if (res.absorbed && res.absorbed > 0) {
          this.logCombat(`Your holy shield absorbed ${res.absorbed} of the blow.`, 'spell');
        }
      } else if (res.absorbed && res.absorbed > 0) {
        // Hit fully absorbed by the bubble — no HP lost.
        soundFX.play('monsterAttack');
        this.addFloatingText(`shield -${res.absorbed}`, this.player.x, this.player.y, '#38bdf8');
      }
    }
    // Walk cycles advance once per tile step (event-driven, not on a timer).
    for (const { m, x, y } of positionsBefore) {
      if (m.hp <= 0) continue;
      if (m.x !== x || m.y !== y) setAnimState(m, 'walk');
      else if (m.anim && m.anim.state === 'walk') setAnimState(m, 'idle');
    }

    // 5. Defeat check
    if (this.player.hp <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.logCombat('You have fallen in the crypt! Darkness consumes you...', 'warning');
      this.onPlayerDeath();
    }

    // 6. Stairs check
    if (!this.isFloorCleared && this.gridMap.isStairs(this.player.x, this.player.y)) {
      this.handleFloorClear();
    }

    // 7. Update HUD
    this.updateHUD();
  }

  triggerImpactBurst(pxX, pxY, visual, color) {
    const count = visual?.burstParticleCount || 14;
    const burstColor = visual?.burstColor || color || '#77e5ff';
    for (let k = 0; k < count; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 110;
      this.particles.push({
        x: pxX,
        y: pxY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 3,
        color: burstColor,
        elapsedMs: 0,
        durationMs: 300 + Math.random() * 200,
      });
    }
  }

  resolveWaveLandedMonsters(carriedMonsters, fX, fY) {
    if (!carriedMonsters || carriedMonsters.length === 0) return;

    // Filter surviving monsters
    const survivors = carriedMonsters.filter(c => c.monster && c.monster.hp > 0);
    if (survivors.length === 0) return;

    // Group survivors by target landing tile
    const occupiedTiles = new Set();
    // Track monsters that are already stationary on the map (not in the wave)
    for (const m of this.monsters) {
      if (m.hp > 0 && !survivors.some(s => s.monster.id === m.id)) {
        occupiedTiles.add(`${m.x},${m.y}`);
      }
    }

    for (const entry of survivors) {
      const m = entry.monster;
      const originalKey = `${m.x},${m.y}`;

      if (!occupiedTiles.has(originalKey)) {
        // Tile is free, keep monster here
        occupiedTiles.add(originalKey);
      } else {
        // Tile is occupied, find closest adjacent free walkable tile
        let placed = false;
        // Search directions: backwards along wave path first, then sides, then forwards
        const checkOffsets = [
          { dx: -fX, dy: -fY },
          { dx: -fY, dy: -fX },
          { dx: fY, dy: fX },
          { dx: fX, dy: fY },
          { dx: -fX * 2, dy: -fY * 2 },
        ];

        for (const off of checkOffsets) {
          const nx = m.x + off.dx;
          const ny = m.y + off.dy;
          const key = `${nx},${ny}`;
          if (this.gridMap.isWalkable(nx, ny) && !occupiedTiles.has(key)) {
            m.x = nx;
            m.y = ny;
            occupiedTiles.add(key);
            placed = true;
            break;
          }
        }

        if (!placed) {
          // Fallback: keep on original tile if no adjacent space exists
          occupiedTiles.add(originalKey);
        }
      }
    }

    // Extend stun effect for 0.5s after the wave ends for all carried monsters
    for (const entry of carriedMonsters) {
      if (entry.monster && entry.monster.hp > 0) {
        entry.monster.stunTimer = 0.5;
      }
    }
  }

  updateAnimations(dtMs) {
    const dtSec = dtMs / 1000;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Energy Beam Wave Animation
      if (p.type === 'energy_beam' && p.waves) {
        if (!p.carriedMonsters) {
          p.carriedMonsters = []; // Array of { monster, wallStopped: boolean }
        }

        p.elapsedMs += dtMs;
        const targetWaveIndex = Math.floor(p.elapsedMs / p.stepIntervalMs);

        if (targetWaveIndex > p.currentWaveIndex && targetWaveIndex < p.waves.length) {
          p.currentWaveIndex = targetWaveIndex;
          const stepIdx = targetWaveIndex;
          const wave = p.waves[stepIdx];
          const stepDmg = p.stepDamage?.[stepIdx] ?? 40;
          const stepVol = p.stepVolumes?.[stepIdx] ?? 1.0;

          // Play cast sound ONCE per wave step, diminishing per step
          soundFX.play('energyBeam', stepVol);

          const fX = p.fX || 0;
          const fY = p.fY || 0;

          // 1. Catch new monsters standing on current wave tiles FIRST
          for (const tile of wave.tiles) {
            const pxX = tile.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
            const pxY = tile.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;

            if (tile.isWall) {
              this.triggerImpactBurst(pxX, pxY, p.visual, p.color);
            } else {
              const hitMonsters = this.monsters.filter(m => m.hp > 0 && m.x === tile.x && m.y === tile.y);
              for (const hitMonster of hitMonsters) {
                if (!p.carriedMonsters.some(c => c.monster.id === hitMonster.id)) {
                  // Newly caught monster! Mark caughtStepIdx and stun monster while in wave
                  hitMonster.stunTimer = 10.0; // Stunned while riding wave
                  p.carriedMonsters.push({ monster: hitMonster, wallStopped: false, caughtStepIdx: stepIdx });
                }
              }
            }
          }

          // 2. Advance ALREADY CARRIED monsters (caught in prior steps) forward along the wave direction (if not wall-stopped)
          for (const entry of p.carriedMonsters) {
            if (entry.monster.hp <= 0 || entry.wallStopped) continue;
            if (entry.caughtStepIdx === stepIdx) continue; // Just caught in this step, riding this tile

            const nextX = entry.monster.x + fX;
            const nextY = entry.monster.y + fY;

            if (this.gridMap.isWall(nextX, nextY) || !this.gridMap.isInBounds(nextX, nextY)) {
              // Wall collision!
              entry.wallStopped = true;
              const wallDmg = 10;
              entry.monster.hp -= wallDmg;
              this.addFloatingText(`-${wallDmg} Wall Collide!`, entry.monster.x, entry.monster.y, '#ef4444');
              this.logCombat(`${entry.monster.name} crashed into a wall while riding the wave for ${wallDmg} collision damage!`, 'combat');

              if (entry.monster.hp <= 0) {
                const loot = CombatSystem.generateMonsterLoot(entry.monster);
                this.handleCombatResult({
                  success: true,
                  defeatedMonsterId: entry.monster.id,
                  droppedLoot: loot,
                }, entry.monster.x, entry.monster.y);
              }
            } else {
              entry.monster.x = nextX;
              entry.monster.y = nextY;
            }
          }

          // 3. Apply step damage & stack collision checks to all active carried monsters
          const activeCarried = p.carriedMonsters.filter(c => c.monster.hp > 0);

          for (const entry of activeCarried) {
            if (entry.wallStopped) continue; // Wall-stopped monsters only took wall collision damage on this step
            const m = entry.monster;
            m.hp -= stepDmg;
            setAnimState(m, 'hit', this.nowMs());
            const pxX = m.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
            const pxY = m.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
            this.triggerImpactBurst(pxX, pxY, p.visual, p.color);

            let combatMsg = `Arcane Beam (Wave ${stepIdx + 1}) swept up ${m.name} for ${stepDmg} magic damage!`;
            if (m.hp <= 0) {
              combatMsg += ` ${m.name} was slain!`;
              const loot = CombatSystem.generateMonsterLoot(m);
              this.handleCombatResult({
                success: true,
                defeatedMonsterId: m.id,
                droppedLoot: loot,
              }, m.x, m.y);
            }

            this.logCombat(combatMsg, 'combat');
            this.addFloatingText(`-${stepDmg}`, m.x, m.y, '#ff66dd');
          }

          // Check for co-located monsters riding the wave together (Stack Collision)
          const tileCounts = {};
          for (const entry of activeCarried) {
            if (entry.monster.hp <= 0) continue;
            const key = `${entry.monster.x},${entry.monster.y}`;
            tileCounts[key] = (tileCounts[key] || 0) + 1;
          }

          for (const entry of activeCarried) {
            if (entry.monster.hp <= 0) continue;
            const key = `${entry.monster.x},${entry.monster.y}`;
            if (tileCounts[key] > 1) {
              const stackDmg = 10;
              entry.monster.hp -= stackDmg;
              this.addFloatingText(`-${stackDmg} Stack Collide!`, entry.monster.x, entry.monster.y, '#f59e0b');
              this.logCombat(`${entry.monster.name} collided with another opponent in the wave for ${stackDmg} damage!`, 'combat');

              if (entry.monster.hp <= 0) {
                const loot = CombatSystem.generateMonsterLoot(entry.monster);
                this.handleCombatResult({
                  success: true,
                  defeatedMonsterId: entry.monster.id,
                  droppedLoot: loot,
                }, entry.monster.x, entry.monster.y);
              }
            }
          }
        }

        // Beam expires after final wave step completes; resolve landed positions
        if (p.elapsedMs >= (p.waves.length * p.stepIntervalMs + 100)) {
          if (p.carriedMonsters && p.carriedMonsters.length > 0) {
            this.resolveWaveLandedMonsters(p.carriedMonsters, p.fX || 0, p.fY || 0);
          }
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      // Handle legacy duration-based projectiles
      if (!p.dirX && !p.dirY) {
        p.elapsedMs += dtMs;
        if (p.elapsedMs >= p.durationMs) {
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      // Real-time continuous projectile physics (e.g. Wand Spark)
      p.currentPxX += p.dirX * p.speedPxPerSec * dtSec;
      p.currentPxY += p.dirY * p.speedPxPerSec * dtSec;

      const tileX = Math.floor(p.currentPxX / CONFIG.GRID_SIZE);
      const tileY = Math.floor(p.currentPxY / CONFIG.GRID_SIZE);

      // 1. Map Boundary check
      if (tileX < 0 || tileX >= this.gridMap.width || tileY < 0 || tileY >= this.gridMap.height) {
        this.triggerImpactBurst(p.currentPxX, p.currentPxY, p.visual, p.color);
        soundFX.playAt('wandSpark', tileX, tileY, this.player.x, this.player.y);
        this.projectiles.splice(i, 1);
        continue;
      }

      // 2. Wall Collision check
      if (this.gridMap.isWall(tileX, tileY)) {
        this.triggerImpactBurst(p.currentPxX, p.currentPxY, p.visual, p.color);
        soundFX.playAt('wandSpark', tileX, tileY, this.player.x, this.player.y);
        this.projectiles.splice(i, 1);
        continue;
      }

      // 3. Living Monster Collision check
      const hitMonster = this.monsters.find(m => m.hp > 0 && m.x === tileX && m.y === tileY);
      if (hitMonster) {
        const payload = p.damagePayload || {};
        const dmg = payload.damage || 10;
        hitMonster.hp -= dmg;
        setAnimState(hitMonster, 'hit', this.nowMs());

        soundFX.playAt('wandSpark', tileX, tileY, this.player.x, this.player.y);
        this.triggerImpactBurst(p.currentPxX, p.currentPxY, p.visual, p.color);

        let combatMsg = `Wand Spark struck ${hitMonster.name} for ${dmg} magic damage!`;
        if (hitMonster.hp <= 0) {
          combatMsg += ` ${hitMonster.name} was slain!`;
          const loot = CombatSystem.generateMonsterLoot(hitMonster);
          this.handleCombatResult({
            success: true,
            defeatedMonsterId: hitMonster.id,
            droppedLoot: loot,
          }, tileX, tileY);
        }

        this.logCombat(combatMsg, 'combat');
        this.addFloatingText(`-${dmg}`, tileX, tileY, '#38bdf8');
        this.projectiles.splice(i, 1);
      }
    }

    if (this.particles) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.elapsedMs += dtMs;
        pt.x += (pt.vx * dtMs) / 1000;
        pt.y += (pt.vy * dtMs) / 1000;
        pt.vx *= 0.92;
        pt.vy *= 0.92;
        if (pt.elapsedMs >= pt.durationMs) {
          this.particles.splice(i, 1);
        }
      }
    }

    if (this.floatingTexts) {
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const t = this.floatingTexts[i];
        t.elapsedMs += dtMs;
        t.y -= (dtMs / 1000) * 20;
        if (t.elapsedMs >= t.durationMs) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    // Presentation-only animation clocks (idle/walk are event-driven).
    if (this.player) advanceAnim(this.player, dtMs);
    if (this.monsters) {
      for (const m of this.monsters) advanceAnim(m, dtMs);
    }
    if (this.deathEffects) {
      for (let i = this.deathEffects.length - 1; i >= 0; i--) {
        const fx = this.deathEffects[i];
        advanceAnim(fx, dtMs);
        if (fx.anim.elapsedMs >= (fx.totalMs || 680)) this.deathEffects.splice(i, 1);
      }
    }
  }

  render() {
    this.renderer.render(
      this.gridMap,
      this.player,
      this.monsters,
      this.ambientLights,
      this.projectiles,
      this.floatingTexts,
      this.selectedMonsterId,
      this.particles,
      this.deathEffects
    );
  }

  processMovementInput() {
    let dx = 0;
    let dy = 0;
    let newFacing = this.player.facing;
    const moveBindings = KEYBINDINGS_CATALOG.movement;

    for (const [dir, keys] of Object.entries(moveBindings)) {
      if (keys.some(k => this.keysDown.has(k))) {
        const vec = DIRECTION_VECTORS[dir];
        if (vec) {
          dx = vec.dx;
          dy = vec.dy;
          newFacing = dir;
          break;
        }
      }
    }

    if (dx !== 0 || dy !== 0) {
      this.player.facing = newFacing;
      const targetX = this.player.x + dx;
      const targetY = this.player.y + dy;

      if (this.gridMap.isWalkable(targetX, targetY)) {
        const monsterAtTarget = this.monsters.find(m => m.x === targetX && m.y === targetY && m.hp > 0);
        if (monsterAtTarget) {
          this.selectedMonsterId = monsterAtTarget.id;
          this.logCombat(`Target locked on ${monsterAtTarget.name} (${monsterAtTarget.hp}/${monsterAtTarget.max_hp} HP).`, 'system');
        } else {
          this.player.x = targetX;
          this.player.y = targetY;
          soundFX.play('footstep');
          setAnimState(this.player, 'walk');

          // Frictionless walkover auto-pickup
          const items = this.gridMap.getItems(this.player.x, this.player.y);
          if (items.length > 0) {
            this.handlePickUp();
          }
        }
      }
    } else if (this.player) {
      setAnimState(this.player, 'idle');
    }
  }

  handleChargeUpdate(slotIndex, ratio) {
    const slotEl = document.querySelector(`.action-slot-btn[data-slot-index="${slotIndex}"] .charge-fill`);
    if (slotEl) {
      slotEl.style.width = `${Math.round(ratio * 100)}%`;
    }
  }

  handleGestureEvent(event) {
    const { slotIndex, gesture } = event;
    const item = this.player.action_bar?.[slotIndex];
    if (!item) {
      this.logCombat(`Action Slot ${slotIndex + 1} is empty.`, 'warning');
      return;
    }

    soundFX.init();

    // 1. Consumable items (potions)
    if (item.type === 'consumable') {
      const res = InventorySystem.consumeItem(this.player, item, () => {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          this.player.action_bar[slotIndex] = null;
        }
      });
      if (res.success) {
        soundFX.play('potionDrink');
        this.logCombat(res.message, 'loot');
        this.addFloatingText(`Used ${item.name}!`, this.player.x, this.player.y, '#38bdf8');
        this.updateHUD();
        this.persistSave();
      } else {
        this.logCombat(res.message, 'warning');
      }
      return;
    }

    // 2. Equippable items (spells, weapons, wands, staffs, offhand, armor, relic)
    // Pressing hotkeys 1..0 equips / swaps the item to its designated hand (Main Hand or Off Hand)
    const eqRes = InventorySystem.equipItem(this.player, 'action_bar', slotIndex);
    if (eqRes.success) {
      soundFX.play('equip');
      this.logCombat(eqRes.message, 'loot');
      LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);
      this.updateHUD();
      this.persistSave();
    } else {
      this.logCombat(eqRes.message, 'warning');
    }
  }

  executeHandCombat(hand = 'main_hand') {
    const item = this.player.paperdoll?.[hand];
    const handLabel = hand === 'main_hand' ? 'Main Hand (Q)' : 'Off Hand (W)';
    if (!item) {
      this.logCombat(`No weapon, staff, or wand equipped in ${handLabel}.`, 'warning');
      return;
    }

    this.executeActionSlotCombat(item, 'tap');
  }

  executeActionSlotCombat(item, gesture) {
    const catalogItem = ITEMS_CATALOG[item.item_id];

    const affinity = item.vocationAffinity || catalogItem?.vocationAffinity;
    if (affinity && affinity !== 'neutral' && this.player?.vocation) {
      const vocationMatches = Array.isArray(affinity) ? affinity.includes(this.player.vocation) : affinity === this.player.vocation;
      if (!vocationMatches) {
        const label = Array.isArray(affinity)
          ? affinity.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join('/')
          : (affinity.charAt(0).toUpperCase() + affinity.slice(1));
        this.logCombat(`Only a ${label} can use ${item.name}!`, 'warning');
        return;
      }
    }

    const actionKey = item.actionKey || catalogItem?.actionKey || (
      item.item_id?.includes('spark') ? 'wand_spark' :
      item.item_id?.includes('beam') ? 'energy_beam' :
      item.item_id?.includes('light') ? 'light_spell' :
      item.item_id?.includes('power_shot') ? 'power_shot' :
      (item.item_id?.includes('bow') || item.item_id?.includes('shot')) ? 'bow_shot' :
      item.item_id?.includes('cleave') ? 'cleave' :
      (item.item_id?.includes('sword') || item.item_id?.includes('slash')) ? 'slash' :
      (item.item_id?.includes('prayer') || item.item_id?.includes('heal')) ? 'healing_prayer' :
      (item.item_id?.includes('holy') || item.item_id?.includes('warhammer') || item.item_id?.includes('radiance')) ? 'holy_strike' : null
    );

    const handlers = {
      wand_spark: () => {
        const target = this.getTargetMonster(CONFIG.MAGICIAN_SPARK_RANGE);
        soundFX.play('wandSpark');
        const res = CombatSystem.executeWandSpark(this.player, target, this.gridMap, item);
        this.handleCombatResult(res, null, null);
      },
      energy_beam: () => {
        const res = CombatSystem.executeEnergyBeam(this.player, this.player.facing, this.gridMap, this.monsters, item);
        if (res.success) {
          soundFX.play('energyBeam');
          this.handleCombatResult(res, this.player.x, this.player.y);
        } else {
          this.logCombat(res.message, 'warning');
        }
      },
      light_spell: () => {
        const res = CombatSystem.executeLightSpell(this.player);
        if (res.success) {
          soundFX.play('lightSpell');
          this.logCombat(res.message, 'spell');
          this.addFloatingText('Light Aura!', this.player.x, this.player.y, '#ffd700');
          LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);
        } else {
          this.logCombat(res.message, 'warning');
        }
      },
      power_shot: () => {
        const bow = this.player.paperdoll?.main_hand;
        const maxRange = (bow && typeof bow.range === 'number') ? bow.range : CONFIG.ARCHER_POWER_SHOT_RANGE;
        const target = this.getTargetMonster(maxRange);
        if (!target) return this.logCombat('No enemy in range for Power Shot.', 'warning');
        soundFX.play('powerShot');
        const res = CombatSystem.executePowerShot(this.player, target, this.gridMap, bow);
        this.handleCombatResult(res, target.x, target.y);
      },
      bow_shot: () => {
        const bow = this.player.paperdoll?.main_hand;
        const maxRange = (bow && typeof bow.range === 'number') ? bow.range : CONFIG.ARCHER_BOW_RANGE;
        const target = this.getTargetMonster(maxRange);
        if (!target) return this.logCombat('No enemy in range for Bow Shot.', 'warning');
        soundFX.play('bowShot');
        const res = CombatSystem.executeBowShot(this.player, target, this.gridMap, bow);
        this.handleCombatResult(res, target.x, target.y);
      },
      cleave: () => {
        soundFX.play('hit');
        const res = CombatSystem.executeCleave(this.player, this.gridMap, this.monsters, item);
        if (!res.success) {
          this.logCombat(res.message, 'warning');
          return;
        }
        this.logCombat(res.message, 'combat');
        if (res.projectiles) this.projectiles.push(...res.projectiles);
        for (const hit of res.hits || []) {
          this.addFloatingText(`-${hit.damage}`, hit.monster.x, hit.monster.y, '#ffdd44');
          if (hit.defeated && hit.monster.id) {
            this.handleCombatResult({
              success: true,
              defeatedMonsterId: hit.monster.id,
              droppedLoot: CombatSystem.generateMonsterLoot(hit.monster),
            }, hit.monster.x, hit.monster.y);
          }
        }
      },
      slash: () => {
        soundFX.play('hit');
        const target = this.getTargetMonster(2.5);
        const res = CombatSystem.executeSlash(this.player, target, this.gridMap, { monsters: this.monsters, item: this.player.paperdoll?.main_hand });
        this.handleCombatResult(res, res.hitX ?? null, res.hitY ?? null);
      },
      shield_bash: () => {
        soundFX.play('hit');
        const res = CombatSystem.executeShieldBash(this.player, this.gridMap, this.monsters, item);
        this.handleCombatResult(res, null, null);
      },
      holy_shield: () => {
        soundFX.play('lightSpell');
        const res = CombatSystem.executeHolyShield(this.player, item);
        this.handleCombatResult(res, null, null);
      },
      fortify: () => {
        soundFX.play('lightSpell');
        const res = CombatSystem.executeFortify(this.player, item);
        this.handleCombatResult(res, null, null);
      },
      healing_prayer: () => {
        const res = CombatSystem.executeHealingPrayer(this.player);
        if (res.success) {
          soundFX.play('lightSpell');
          this.logCombat(res.message, 'spell');
          this.addFloatingText(`+${res.healAmount} HP`, this.player.x, this.player.y, '#22c55e');
        } else {
          this.logCombat(res.message, 'warning');
        }
      },
      holy_strike: () => {
        soundFX.play('hit');
        const target = this.getTargetMonster(2.5);
        const res = CombatSystem.executeHolyStrike(this.player, target, this.gridMap, { monsters: this.monsters, item: this.player.paperdoll?.main_hand });
        this.handleCombatResult(res, res.hitX ?? null, res.hitY ?? null);
      },
    };

    if (actionKey && handlers[actionKey]) {
      setAnimState(this.player, 'attack', this.nowMs());
      handlers[actionKey]();
    }

    this.updateHUD();
  }

  getTargetMonster(maxRange) {
    const bonusRng = this.player.skillBoosts?.bonusRange || 0;
    const effectiveRange = maxRange + bonusRng;

    if (this.selectedMonsterId) {
      const monster = this.monsters.find(m => m.id === this.selectedMonsterId && m.hp > 0);
      if (monster && monster.visible) {
        const d = Math.hypot(monster.x - this.player.x, monster.y - this.player.y);
        if (d <= effectiveRange + 0.5) return monster;
      }
    }

    let closest = null;
    let minDist = effectiveRange + 1;

    for (const m of this.monsters) {
      if (m.hp <= 0 || !m.visible) continue;
      const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
      if (d <= effectiveRange + 0.5 && d < minDist) {
        if (LightingSystem.hasLineOfSight(this.gridMap, this.player.x, this.player.y, m.x, m.y)) {
          minDist = d;
          closest = m;
        }
      }
    }

    if (closest) {
      this.selectedMonsterId = closest.id;
    }
    return closest;
  }

  handleCombatResult(res, targetX, targetY) {
    if (!res.success) {
      if (res.message) this.logCombat(res.message, 'warning');
      return;
    }

    if (res.message) this.logCombat(res.message, 'combat');
    if (res.damageDealt) {
      soundFX.play('hit');
      if (targetX !== null && targetX !== undefined && targetY !== null && targetY !== undefined) {
        this.addFloatingText(`-${res.damageDealt}`, targetX, targetY, '#ffdd44');
        if (!res.defeatedMonsterId) this.triggerMonsterHit(targetX, targetY);
      }
    }

    if (res.projectiles) this.projectiles.push(...res.projectiles);

    if (res.defeatedMonsterId) {
      soundFX.play('monsterDeath');
      const index = this.monsters.findIndex(m => m.id === res.defeatedMonsterId);
      if (index !== -1) {
        const deadMonster = this.monsters[index];
        if (res.droppedLoot && res.droppedLoot.length > 0) {
          for (const item of res.droppedLoot) {
            this.gridMap.addItem(deadMonster.x, deadMonster.y, item);
            this.logCombat(`${deadMonster.name} dropped ${item.name}.`, 'loot');
          }
        }

        const isBoss = deadMonster.isBoss || deadMonster.id.includes('boss') || deadMonster.max_hp >= 200;
        this.spawnDeathEffect(deadMonster);
        const xpEarned = ProgressionSystem.getMonsterXp(deadMonster.type, this.player.current_floor || 1, isBoss);
        const lvlRes = ProgressionSystem.awardXP(this.player, xpEarned);

        this.logCombat(`Gained +${xpEarned} XP from defeating ${deadMonster.name}.`, 'loot');
        this.addFloatingText(`+${xpEarned} XP`, deadMonster.x, deadMonster.y, '#fbbf24');

        if (lvlRes.leveledUp) {
          soundFX.play('levelUp');
          this.logCombat(
            `⭐ LEVEL UP! You reached Level ${lvlRes.newLevel}! (+${lvlRes.hpGained} Max HP, +${lvlRes.manaGained} Max MP)`,
            'spell'
          );
          this.addFloatingText(`⭐ LEVEL UP! [Lv. ${lvlRes.newLevel}]`, this.player.x, this.player.y, '#ffd700');
          this.persistSave();
          this.showFateGrantModal(lvlRes.newLevel);
        }

        this.monsters.splice(index, 1);
        if (this.selectedMonsterId === res.defeatedMonsterId) {
          this.selectedMonsterId = null;
        }

        if (isBoss && this.player.current_floor >= 20) {
          setTimeout(() => this.handleFloorClear(), 600);
        }
      }
    }
  }

  async handlePickUp() {
    soundFX.init();
    const res = InventorySystem.pickUpItem(this.player, this.gridMap);
    if (res.success) {
      soundFX.play('itemPickup');
      this.logCombat(res.message, 'loot');
      this.addFloatingText(`+${res.item?.name}`, this.player.x, this.player.y, '#22c55e');
      this.updateHUD();
      await this.persistSave();
    }
  }

  async handleDropItem(source, slotIndex) {
    soundFX.init();
    const res = InventorySystem.dropItem(this.player, source, slotIndex, this.gridMap);
    if (res.success) {
      soundFX.play('unequip');
      this.logCombat(res.message, 'system');
      this.updateHUD();
      await this.persistSave();
    } else {
      this.logCombat(res.message, 'warning');
    }
  }

  async handleUnequip(slotName) {
    soundFX.init();
    const res = InventorySystem.unequipItem(this.player, slotName);
    if (res.success) {
      soundFX.play('unequip');
      this.logCombat(res.message, 'system');
      LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);
      this.updateHUD();
      await this.persistSave();
    } else {
      this.logCombat(res.message, 'warning');
    }
  }

  persistSave(immediate = false) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    if (immediate) {
      return this._executeSave();
    }

    this.saveDebounceTimer = setTimeout(() => {
      this._executeSave();
    }, 500);
  }

  async _executeSave() {
    try {
      if (this.player) {
        await this.gameClient.saveCharacter(this.player);
      }
    } catch (err) {
      console.warn('Auto-save error:', err);
    }
  }

  async handleFloorClear() {
    if (this.isFloorCleared) return;
    this.isFloorCleared = true;
    this.isPaused = true;
    const onFinalFloor = this.player.current_floor >= 20;

    try {
      if (!onFinalFloor) {
        const nextFloor = this.player.current_floor + 1;
        const floorBonusXp = 50 * this.player.current_floor;
        const lvlRes = ProgressionSystem.awardXP(this.player, floorBonusXp);

        soundFX.play('stairs');
        this.logCombat(
          `Stepped on stairway! Descended to Floor ${nextFloor}/20 (+${floorBonusXp} Floor Clear XP)!`,
          'victory'
        );
        this.addFloatingText(`FLOOR ${nextFloor}`, this.player.x, this.player.y, '#38bdf8');

        await this.transition.run('floorAdvance', async () => {
          const transition = await this.gameClient.advanceFloor(this.player, nextFloor);
          this.player = transition.player;
          this.applyDungeonData(transition.floor);
          LightingSystem.updateLighting(this.gridMap, this.player, this.ambientLights, this.monsters);
          this.updateHUD();
          await this.persistSave(true);
        }, { skippable: false, label: `DESCENDING TO FLOOR ${nextFloor}` });

        if (lvlRes.leveledUp) {
          soundFX.play('levelUp');
          this.logCombat(
            `⭐ LEVEL UP! You reached Level ${lvlRes.newLevel}! (+${lvlRes.hpGained} Max HP, +${lvlRes.manaGained} Max MP)`,
            'spell'
          );
          this.showFateGrantModal(lvlRes.newLevel);
        }
      } else {
        soundFX.play('victory');
        this.logCombat('🎉 YOU CONQUERED THE ABYSSAL SANCTUM! ALL 20 FLOORS CLEARED!', 'victory');
        this.addFloatingText('CAMPAIGN COMPLETED!', this.player.x, this.player.y, '#ffd700');
        await this.persistSave(true);
        this.showVictoryModal();
      }
    } catch (err) {
      console.error('Floor transition error:', err);
    } finally {
      if (!onFinalFloor) {
        this.isFloorCleared = false;
        if (this.modalOverlayEl.classList.contains('hidden')) {
          this.isPaused = false;
        }
      }
    }
  }

  addFloatingText(text, gridX, gridY, color) {
    if (this.options && this.options.damageNumbers === false && /^-\d/.test(String(text))) return;
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x: gridX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
      y: gridY * CONFIG.GRID_SIZE,
      color,
      durationMs: 1200,
      elapsedMs: 0,
    });
  }

  updateHUD() {
    HUDManager.updateHUD(
      {
        statusBarsEl: this.statusBarsEl,
        paperdollEl: this.paperdollEl,
        backpackEl: this.backpackEl,
        hotbarEl: this.hotbarEl,
      },
      this
    );
  }

  logCombat(message, category = 'system') {
    HUDManager.logCombat(this.combatLogScrollEl, message, category);
  }

  clearCombatLog() {
    HUDManager.clearCombatLog(this.combatLogScrollEl);
  }

  async onPlayerDeath() {
    // Never persist HP 0: write the slot's floor-entry snapshot back instead.
    const slotIndex = this.player?.slotIndex;
    if (slotIndex) {
      try {
        await this.gameClient.restartFloor(slotIndex);
      } catch (err) {
        console.warn('Failed to restore floor-entry snapshot on death:', err);
      }
    }
    this.showGameOverModal();
  }

  async retryFloor() {
    const slotIndex = this.player?.slotIndex;
    if (!slotIndex) {
      this.returnToTitle();
      return;
    }
    try {
      const data = await this.gameClient.restartFloor(slotIndex);
      await this.transition.run('gameOverToRetry', async () => {
        this.adoptPlayer(data.player, data.floor);
        this.logCombat(`Retrying Floor ${this.player.current_floor || 1}/20 from arrival.`, 'system');
        this.startGameLoop();
      }, { skippable: false });
    } catch (err) {
      console.error('Retry failed:', err);
      this.returnToTitle();
    }
  }

  showVictoryModal() {
    ModalManager.showVictoryModal(this.modalOverlayEl, this.player, {
      onNewGame: () => this.openSlotSelect('create'),
      onReturnToTitle: () => this.returnToTitle(),
    });
  }

  showGameOverModal() {
    ModalManager.showGameOverModal(this.modalOverlayEl, this.player, {
      onRetry: () => this.retryFloor(),
      onContinue: () => this.returnToTitle(),
    });
  }
}
