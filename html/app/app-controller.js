/**
 * Lokarta: Come Into The Light - Main Application Controller
 */

import { GameClient } from '../worker/game-client.js';
import {
  GridMap,
  ChestSystem,
  GestureEngine,
  EconomySystem,
  createPlayer,
} from '../engine/index.js';
import { soundFX } from '../audio/index.js';
import { ABILITIES_CATALOG, VOCATIONS_CATALOG, UI_CATALOG } from '../data/index.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { gameLoopMethods } from './game-loop.js';
import { hudFxMethods } from './hud-fx.js';
import { combatControllerMethods } from './combat-controller.js';
import { inventoryControllerMethods } from './inventory-controller.js';
import { shopControllerMethods } from './shop-controller.js';
import { floorControllerMethods } from './floor-controller.js';
import { ModalManager } from './modal-manager.js';
import { InputController } from './input-controller.js';
import { AbilityBar } from './ability-bar.js';
import { TransitionController } from './transition-controller.js';
import { normalizeOptions, resolveReducedMotion, slotSummary } from '../services/save-slots.js';
import {
  createAnimState,
  ensureAnim,
  ANIM_DURATION_MS,
} from './animation-state.js';


export class LokartaApp {
  constructor() {
    this.gameClient = new GameClient();
    this.player = createPlayer('magician');
    this.gridMap = new GridMap();
    this.monsters = [];
    this.chests = [];
    this.props = [];
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
    this.currentFloorName = 'The Gatehouse';
    // LIV-22 item 5: the player begins in the Town outside the tower.
    this.location = 'town';
    this.townConfig = EconomySystem.townConfig();
    this.passiveRecoveryAccumulator = 0;
    // LIV-29 item 9: adjacency spring regen accumulator (1 Hz).
    this.springRegenAccumulator = 0;

    // E8: active-floor stair traversal state (dir/targetLevel + §9.3 arming).
    this.stairs = [];
    this.isFinalFloor = false;
    this.stairSystem = null;
    this.stairHint = null;

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
    this.sidebarEl = document.getElementById('sidebar-hud');
    this.loadoutEl = document.getElementById('loadout-container');
    this.backpackEl = document.getElementById('backpack-container');
    this.abilityBarEl = document.getElementById('ability-bar');
    this.combatLogScrollEl = document.getElementById('log-entries-container');
    this.modalOverlayEl = document.getElementById('modal-overlay');
    this.townEl = document.getElementById('town-screen');
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
    this.abilityBar = new AbilityBar(this);

    this.init();
  }

  async init() {
    window.addEventListener('resize', () => this.renderer.resize());
    this.renderer.resize();
    this.inputController.bindInputs();
    this.abilityBar.mount({ abilityBarEl: this.abilityBarEl });
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





  showTitleScreen() {
    this.stopGameLoop();
    this.isInGameplay = false;
    this.isPaused = false;
    this.transition.forceRelease();
    ModalManager.hideTownScreen(this.townEl);

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
      onReturnToTown: () => this.leaveTower(),
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
    if (this.optionsReturnTo === 'town') {
      this.showTown();
      return;
    }
    this.showTitleScreen();
  }

  confirmResetOptions() {
    ModalManager.showConfirmModal(this.modalOverlayEl, {
      title: 'RESET OPTIONS?',
      body: 'All options return to their default values. Save slots are not affected.',
      confirmLabel: 'RESET',
      // Destructive to the user's saved preferences; the spec (§3.2) requires a
      // safe default focus on CANCEL.
      danger: true,
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
      body: `This permanently deletes ${slotSummary(slot)}. This cannot be undone.`,
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
      body: `This permanently deletes ${slotSummary(slot)}. This cannot be undone.`,
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
    // Route through ModalManager so the modal-scoped keydown handler is always
    // removed with the modal (no stale Escape handler left on `window`).
    ModalManager._close(this.modalOverlayEl);
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
        this.player.location = 'town';
        this.startGameLoop();
      });

      this.showTown();
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
        this.logCombat(`Resumed the ascent on Floor ${this.player.current_floor || 1} (${this.currentFloorName}).`, 'system');
        this.player.location = this.player.location || 'tower';
        this.startGameLoop();
      });

      const isActionBarEmpty = this.player.action_bar?.every(s => s === null);
      if (isActionBarEmpty && this.player.level === 1) {
        this.showTown();
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


  /** Monotonic-ish clock for animation locks. */
  nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }



  showFateGrantModal(level = 1) {
    ModalManager.showFateGrantModal(this.modalOverlayEl, this, level);
  }




















  /** Persists only the durable chest opened-state for the current floor. */
  async persistChests() {
    if (!this.player) return;
    try {
      await this.gameClient.saveFloorState(
        this.player,
        ChestSystem.serializeChestState(this.chests)
      );
    } catch (err) {
      console.warn('Chest state save error:', err);
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







  async onPlayerDeath() {
    // LIV-22 item 5: on defeat the hero is revived in the Town Temple at full
    // HP/MP (never persisted at 0). The descent-on-death model is retired.
    const fromFloor = this.player?.current_floor || 1;
    this.isPaused = true;

    this.player.hp = this.player.max_hp;
    this.player.mana = this.player.max_mana;
    this.player.location = 'town';
    this.player.current_floor = this.player.current_floor || 1;
    this.location = 'town';

    try {
      await this.persistSave(true);
    } catch (err) {
      console.warn('Death save error:', err);
    }

    this.logCombat(`You fell on Floor ${fromFloor}. The Temple of the Dawn draws you back and restores you.`, 'warning');
    this.showGameOverModal(fromFloor, fromFloor);
  }

  /** Resumes play in the Town after a defeat (LIV-22 item 5). */
  resumeAfterDeath() {
    this.isGameOver = false;
    this.isFloorCleared = false;
    this.closeModal();
    this.showTown();
  }

  showVictoryModal() {
    ModalManager.showVictoryModal(this.modalOverlayEl, this.player, {
      onNewGame: () => this.openSlotSelect('create'),
      onReturnToTitle: () => this.returnToTitle(),
    });
  }

  showGameOverModal(fromFloor = this.player?.current_floor || 1, toFloor = fromFloor) {
    ModalManager.showGameOverModal(this.modalOverlayEl, this.player, {
      fromFloor,
      toFloor,
      onRetry: () => this.resumeAfterDeath(),
      onContinue: () => this.returnToTitle(),
    });
  }
}

Object.assign(LokartaApp.prototype, floorControllerMethods);

Object.assign(LokartaApp.prototype, shopControllerMethods);

Object.assign(LokartaApp.prototype, inventoryControllerMethods);

Object.assign(LokartaApp.prototype, combatControllerMethods);

Object.assign(LokartaApp.prototype, hudFxMethods);

Object.assign(LokartaApp.prototype, gameLoopMethods);
