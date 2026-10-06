/**
 * Lokarta: Come Into The Light - Main Application Controller
 */

import { GameClient } from '../worker/game-client.js';
import {
  CONFIG,
  TILE_TYPES,
  GridMap,
  LightingSystem,
  ProgressionSystem,
  CombatSystem,
  InventorySystem,
  ChestSystem,
  DoorSystem,
  StairSystem,
  GestureEngine,
  EconomySystem,
  createPlayer,
} from '../engine/index.js';
import { soundFX } from '../audio/index.js';
import { ITEMS_CATALOG, ABILITIES_CATALOG, VOCATIONS_CATALOG, UI_CATALOG } from '../data/index.js';
import { applyItemRankUp } from '../engine/item-progression.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { gameLoopMethods } from './game-loop.js';
import { HUDManager } from './hud-manager.js';
import { ModalManager } from './modal-manager.js';
import { InputController } from './input-controller.js';
import { AbilityBar } from './ability-bar.js';
import { TransitionController } from './transition-controller.js';
import { TitleAmbient } from './title-ambient.js';
import { normalizeOptions, resolveReducedMotion, slotSummary } from '../services/save-slots.js';
import { TOWER_LEVEL_COUNT } from '../services/floor-generator.js';
import {
  createAnimState,
  ensureAnim,
  setAnimState,
  dirFromFacing,
  ANIM_DURATION_MS,
} from './animation-state.js';

/** Rotating sub-tile offsets that stagger floating pickup/combat text. */
const GROUND_DROP_OFFSETS = [
  [0, 0], [0, -1], [1, 0], [0, 1], [-1, 0],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
];

/** Presentation tunables for floating text (LIV-29 item 6). */
const FLOATING_TEXT = UI_CATALOG?.floatingText || {};
const FLOATING_DEFAULT_MS = Number(FLOATING_TEXT.defaultDurationMs) || 1200;
const FLOATING_LOOT_MS = Number(FLOATING_TEXT.lootDurationMs) || 2400;
const FLOATING_STAGGER_PX = Number(FLOATING_TEXT.staggerPx) || 0;
const FLOATING_MAX_ACTIVE = Number(FLOATING_TEXT.maxActive) || 48;

/**
 * Lifetime (seconds) of the Luminous Prayer orb VFX after each heal pulse
 * (LIV-35), resolved from `ui.json.playerVfx.luminousPrayer`.
 */
const LUMINOUS_PRAYER_VFX_SEC = Number(UI_CATALOG?.playerVfx?.luminousPrayer?.durationSec) || 1.6;

/**
 * Special ground-pickup dispatch keyed by an item's catalog `pickupType`.
 * Normal inventory items fall through to `InventorySystem.pickUpItem`. Keeps
 * currency and keys out of the backpack so gold credits the purse and a key
 * unlocks its per-level gate (LIV-29 items 4/5).
 */
const GROUND_PICKUP_HANDLERS = {
  currency: (app, item) => {
    const gained = EconomySystem.addGold(app.player, item.quantity || 0);
    app.gridMap.popTopItem(app.player.x, app.player.y);
    if (gained > 0) {
      soundFX.play('coins');
      app.logCombat(`Picked up ${gained} gold.`, 'loot');
      app.addFloatingText(`+${gained}g`, app.player.x, app.player.y, '#fbbf24', { durationMs: FLOATING_LOOT_MS });
      app.updateHUD();
    }
    return gained > 0;
  },
  key: (app, item) => {
    const level = app.player?.current_floor || 1;
    const newlyEarned = DoorSystem.grantKey(app.player, level, item.keyTier);
    app.gridMap.popTopItem(app.player.x, app.player.y);
    soundFX.play('keyJangle');
    app.logCombat(
      newlyEarned
        ? `Picked up the ${item.name}. Walk onto the ${item.keyTier} door to open it.`
        : `The ${item.name} was already earned on this floor.`,
      'loot'
    );
    app.addFloatingText(`+${item.name}`, app.player.x, app.player.y, '#facc15', { durationMs: FLOATING_LOOT_MS });
    app.updateHUD();
    return newlyEarned;
  },
};

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

  /**
   * Shows the Town hub (LIV-22 item 5). The game loop keeps rendering the
   * current floor behind the modal; gameplay input is paused.
   */
  showTown() {
    this.location = 'town';
    this.isPaused = true;
    // Clear any modal (pause/defeat) so the persistent Town screen is the only
    // surface; the canvas keeps rendering the current floor behind it.
    this.closeModal();
    ModalManager.renderTownHub(this.townEl, this, {
      onEnterTower: () => this.enterTower(),
      onShop: () => this.openShop(),
      onTemple: () => this.openTemple(),
      onOptions: () => this.showOptionsModal('town'),
    });
  }

  /** Enter the tower from the Town: resume gameplay on the current floor. */
  enterTower() {
    this.location = 'tower';
    this.player.location = 'tower';
    ModalManager.hideTownScreen(this.townEl);
    this.closeModal();
    this.isPaused = false;
    this.logCombat('You step through the tower gate. The ascent begins.', 'system');
    if (this.player.level === 1 && this.player.action_bar?.every(s => s === null)) {
      this.showFateGrantModal(1);
    }
    this.updateHUD();
    this.persistSave();
  }

  /** Leave the tower and return to the Town hub. */
  leaveTower() {
    if (!this.isInGameplay) return;
    this.player.location = 'town';
    this.transition.run('townVisit', () => this.showTown());
  }

  /** The shop stock + upgrade/pawn lists for the current player. */
  buildShopState() {
    return {
      shopStock: EconomySystem.shopStock(this.player.vocation),
      ownedUpgradableItems: this.collectUpgradableItems(),
      pawnItems: this.collectPawnableItems(),
      templeCost: EconomySystem.templeHealCost(this.player),
    };
  }

  /** Banked/equipped items the shop can rank up (all four equipment slots). */
  collectUpgradableItems() {
    const out = [];
    const push = (item, source, index) => {
      if (!item || !EconomySystem.canUpgrade(item)) return;
      out.push({ item, source, index, rank: item.itemLevel || 1, cost: EconomySystem.upgradeCost(item) });
    };
    // Paperdoll first so the four wearable slots are always offered.
    Object.entries(this.player.paperdoll || {}).forEach(([slot, item]) => {
      if (item && EconomySystem.canUpgrade(item)) {
        out.push({ item, source: 'equipment', index: slot, rank: item.itemLevel || 1, cost: EconomySystem.upgradeCost(item) });
      }
    });
    (this.player.backpack || []).forEach((item, i) => push(item, 'backpack', i));
    (this.player.action_bar || []).forEach((item, i) => push(item, 'action_bar', i));
    return out;
  }

  /** Backpack items the merchant will buy (LIV-29 item 1 — Pawn section). */
  collectPawnableItems() {
    const out = [];
    (this.player.backpack || []).forEach((item, index) => {
      if (!item || item.droppable === false) return;
      const value = EconomySystem.pawnValue(item);
      if (value > 0) out.push({ item, source: 'backpack', index, value });
    });
    return out;
  }

  openShop() {
    const state = this.buildShopState();
    ModalManager.renderTownShop(this.townEl, { ...this, ...state }, {
      onBuy: itemId => this.buyShopItem(itemId),
      onUpgrade: (source, index) => this.upgradeShopItem(source, index),
      onPawn: (source, index) => this.pawnShopItem(source, index),
      onBack: () => this.showTown(),
    });
  }

  buyShopItem(itemId) {
    const purchased = this.purchasedCounts || (this.purchasedCounts = {});
    const res = EconomySystem.buyItem(this.player, itemId, { purchasedCount: purchased[itemId] || 0 });
    if (!res.success) {
      soundFX.play('uiBack');
      this.logCombat(res.message, 'warning');
      this.openShop();
      return;
    }
    // LIV-29 item 1: a purchase banks a second copy; it never ranks up an
    // already-owned item (that is the Upgrade Gear section's job).
    const addRes = InventorySystem.addItem(this.player, { ...res.item, quantity: res.item.quantity || 1 }, { allowRankUp: false });
    if (!addRes.success) {
      // No room: refund and tell the player.
      EconomySystem.addGold(this.player, res.cost);
      soundFX.play('uiBack');
      this.logCombat('Your pack is full — the purchase was refunded.', 'warning');
      this.openShop();
      return;
    }
    purchased[itemId] = (purchased[itemId] || 0) + 1;
    soundFX.play('coins');
    this.logCombat(res.message, 'loot');
    this.updateHUD();
    this.persistSave();
    this.openShop();
  }

  /**
   * Pawns a backpack item to the merchant for 50% of its purchase price
   * (LIV-29 item 1). Removes the item and credits gold.
   */
  pawnShopItem(source, index) {
    const item = (this.player.backpack || [])[Number(index)];
    if (!item) {
      this.openShop();
      return;
    }
    const res = EconomySystem.pawnItem(this.player, item);
    if (!res.success) {
      soundFX.play('uiBack');
      this.logCombat(res.message, 'warning');
      this.openShop();
      return;
    }
    this.player.backpack[Number(index)] = null;
    soundFX.play('coins');
    this.logCombat(res.message, 'loot');
    this.updateHUD();
    this.persistSave(true);
    this.openShop();
  }

  upgradeShopItem(source, index) {
    const entry = this.collectUpgradableItems().find(e => e.source === source && String(e.index) === String(index));
    if (!entry) {
      soundFX.play('uiBack');
      this.logCombat('That gear cannot be upgraded further.', 'warning');
      this.openShop();
      return;
    }
    if (!EconomySystem.spendGold(this.player, entry.cost)) {
      soundFX.play('uiBack');
      this.logCombat(`You need ${entry.cost} gold to upgrade ${entry.item.name}.`, 'warning');
      this.openShop();
      return;
    }
    const result = applyItemRankUp(this.player, entry.item, { source: 'shop' });
    if (!result) {
      EconomySystem.addGold(this.player, entry.cost);
      this.logCombat(`${entry.item.name} cannot be upgraded further.`, 'warning');
    } else {
      soundFX.play('levelUp');
      this.logCombat(`Upgraded ${entry.item.name} for ${entry.cost} gold!`, 'loot');
    }
    InventorySystem.recomputeGearBonuses(this.player);
    this.updateHUD();
    this.persistSave(true);
    this.openShop();
  }

  openTemple() {
    ModalManager.renderTownTemple(this.townEl, { ...this, templeCost: EconomySystem.templeHealCost(this.player) }, {
      onHeal: () => this.templeHeal(),
      onBack: () => this.showTown(),
    });
  }

  templeHeal() {
    const res = EconomySystem.templeHeal(this.player);
    if (res.success) {
      soundFX.play('holyChime');
      this.logCombat(res.message, 'spell');
      this.updateHUD();
      this.persistSave(true);
    } else {
      soundFX.play('uiBack');
      this.logCombat(res.message, 'warning');
    }
    this.openTemple();
  }

  returnToTitle() {
    this.transition.run('toTitle', async () => {
      this.stopTitleAmbient();
      this.showTitleScreen();
    });
  }

  applyDungeonData(floorData) {
    this.currentFloorName = floorData.biome_name || 'The Gatehouse';
    this.gridMap.loadFromMatrix(floorData.tiles);

    // E8: retain the active floor's authored stair metadata + final-floor flag so
    // runtime traversal honors each stair's `dir`/`targetLevel` (D2 §3/§9.3)
    // instead of blindly advancing. The arrival tile is disarmed so stepping onto
    // it can never immediately re-trigger a transition.
    this.stairs = (floorData.stairs || []).map(stair => ({ ...stair }));
    this.isFinalFloor =
      floorData.is_final === true || (floorData.floor_number || 0) >= TOWER_LEVEL_COUNT;
    this.stairSystem = new StairSystem(
      this.stairs,
      this.player?.current_floor || floorData.floor_number || 1,
      this.player ? { x: this.player.x, y: this.player.y } : null
    );
    this.stairHint = null;

    // Tag gated-door tiles with their tier so the renderer can resolve the
    // copper/silver/gold prop (data-driven; no per-level renderer branches).
    for (const [tier, gate] of Object.entries(floorData.gates || {})) {
      for (const t of gate.tiles || []) {
        const tile = this.gridMap.getTile(t.x, t.y);
        if (tile) {
          tile.gateTier = tier;
          tile.gateOpen = false;
        }
      }
    }

    // E3: reopen any gate whose key the player already earned on this level, so
    // re-entering a cleared level can never soft-lock behind an earned key.
    DoorSystem.syncPlayerGates(this.gridMap, this.player, this.player?.current_floor);

    for (const item of floorData.items || []) {
      this.gridMap.addItem(item.x, item.y, item);
    }

    // Chests are world entities, not tile items. Restore persisted opened-state
    // so a save/load keeps opened chests empty (E4 persistence).
    this.chests = (floorData.chests || []).map(chest => ({ ...chest }));

    // D4 room props/decor (LIV-20). LIV-29 item 3: placed furniture props block
    // movement, while floor decor (rugs) stays walk-over. Dropped items and
    // chests are never marked blocked, so they remain walkable.
    this.props = (floorData.props || []).map(p => ({ ...p }));
    for (const prop of this.props) {
      if (prop.layer === 'prop') this.gridMap.blockTile(prop.x, prop.y, true);
    }

    // Healing springs (LIV-29 item 9) are impassable fountains in each floor's
    // stair room; standing on an adjacent square regenerates +5 HP/+5 MP per
    // second (applied in the fixed tick below).
    this.springs = (floorData.springs || []).map(s => ({ ...s }));

    this.ambientLights = [];
    this.monsters = (floorData.monsters || []).map(s => ({
      ...s,
      isAggroed: false,
      moveCooldown: 0,
      attackCooldown: 0,
      attackCadence: s.attackCadence ?? 1.5,
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





  handleChargeUpdate(slotIndex, ratio) {
    const slotEl = document.querySelector(`.loadout-slot.active-slot[data-index="${slotIndex}"] .charge-fill`);
    if (slotEl) {
      slotEl.style.width = `${Math.round(ratio * 100)}%`;
    }
  }

  handleGestureEvent(event) {
    const { slotIndex, gesture } = event;
    const item = this.player.action_bar?.[slotIndex];
    if (!item) {
      this.logCombat(`Active Slot ${slotIndex + 1} is empty.`, 'warning');
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
    const handLabel = {
      main_hand: 'Main Hand (Q)',
      off_hand: 'Off Hand (W)',
      armor: 'Armor (E)',
      relic: 'Relic (R)',
    }[hand] || String(hand || '').replace('_', ' ');
    if (!item) {
      this.logCombat(`No item equipped in ${handLabel}.`, 'warning');
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

    // Dispatch strictly on the catalog `actionKey` (declared in items.json).
    // No string heuristics: an item without an actionKey has no active ability.
    const actionKey = item.actionKey || catalogItem?.actionKey || null;

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
        const maxRange = CombatSystem.itemRange(bow) || CONFIG.ARCHER_POWER_SHOT_RANGE;
        const target = this.getTargetMonster(maxRange);
        if (!target) return this.logCombat('No enemy in range for Power Shot.', 'warning');
        soundFX.play('powerShot');
        const res = CombatSystem.executePowerShot(this.player, target, this.gridMap, bow);
        this.handleCombatResult(res, target.x, target.y);
      },
      bow_shot: () => {
        const bow = this.player.paperdoll?.main_hand;
        const maxRange = CombatSystem.itemRange(bow) || CONFIG.ARCHER_BOW_RANGE;
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
      sanctuary: () => {
        soundFX.play('lightSpell');
        const res = CombatSystem.executeSanctuary(this.player, item);
        if (res.success) {
          this.logCombat(res.message, 'spell');
          this.addFloatingText('Sanctuary!', this.player.x, this.player.y, '#f8fafc');
        } else {
          this.logCombat(res.message, 'warning');
        }
      },
      benediction: () => {
        const res = CombatSystem.executeBenediction(this.player, item);
        if (res.success) {
          soundFX.play('holyChime');
          this.logCombat(res.message, 'spell');
          if (res.hpRestored > 0) this.addFloatingText(`+${res.hpRestored} HP`, this.player.x, this.player.y, '#22c55e');
          if (res.mpRestored > 0) this.addFloatingText(`+${res.mpRestored} MP`, this.player.x, this.player.y, '#3b82f6');
        } else {
          this.logCombat(res.message, 'warning');
        }
      },
      shock_shield: () => {
        soundFX.play('lightSpell');
        const res = CombatSystem.executeShockShield(this.player, item);
        if (res.success) {
          this.logCombat(res.message, 'spell');
          this.addFloatingText('Shock Shield!', this.player.x, this.player.y, '#38bdf8');
        } else {
          this.logCombat(res.message, 'warning');
        }
      },
      luminous_prayer: () => {
        const res = CombatSystem.executeLuminousPrayer(this.player, item);
        if (res.success) {
          soundFX.play('holyChime');
          this.player.luminousPrayerVfxSec = LUMINOUS_PRAYER_VFX_SEC;
          this.logCombat(res.message, 'spell');
          if (res.hpRestored > 0) this.addFloatingText(`+${res.hpRestored} HP`, this.player.x, this.player.y, '#22c55e');
          if (res.mpRestored > 0) this.addFloatingText(`+${res.mpRestored} MP`, this.player.x, this.player.y, '#3b82f6');
        } else {
          this.logCombat(res.message, 'warning');
        }
      },
      poison_tip: () => {
        const res = CombatSystem.executePoisonTip(this.player, item);
        if (res.success) {
          soundFX.play('hit');
          this.logCombat(res.message, 'spell');
          this.addFloatingText('Poison Tip!', this.player.x, this.player.y, '#84cc16');
        } else {
          this.logCombat(res.message, 'warning');
        }
      },
      life_siphon: () => {
        const res = CombatSystem.executeLifeSiphon(this.player, this.gridMap, this.monsters, item);
        if (!res.success) {
          this.logCombat(res.message, 'warning');
          return;
        }
        soundFX.play('holyChime');
        this.logCombat(res.message, 'spell');
        if (res.healed > 0) this.addFloatingText(`+${res.healed} HP`, this.player.x, this.player.y, '#22c55e');
        for (const hit of res.affected || []) {
          this.addFloatingText(`-${hit.drained}`, hit.monster.x, hit.monster.y, '#a855f7');
          if (hit.defeated && hit.monster.id) {
            this.handleCombatResult({
              success: true,
              defeatedMonsterId: hit.monster.id,
              droppedLoot: CombatSystem.generateMonsterLoot(hit.monster),
            }, hit.monster.x, hit.monster.y);
          }
        }
      },
      hunters_mark: () => {
        const res = CombatSystem.executeHuntersMark(this.player, this.gridMap, this.monsters, item);
        if (res.success) {
          soundFX.play('uiMove');
          this.logCombat(res.message, 'spell');
          for (const m of res.marked) this.addFloatingText('MARKED', m.x, m.y, '#f59e0b');
        } else {
          this.logCombat(res.message, 'warning');
        }
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
        const isBoss = deadMonster.isBoss || deadMonster.id.includes('boss') || deadMonster.max_hp >= 200;

        // LIV-29 items 4/5: every drop (equipment, potions, gold, keys) lands on
        // the ground and must be walked over to collect. Multi-item drops spread
        // across distinct adjacent squares instead of stacking one tile.
        const drops = [...(res.droppedLoot || [])];
        const goldDrop = EconomySystem.goldFromMonster(deadMonster);
        if (goldDrop > 0) {
          drops.push({ item_id: 'gold', name: 'Gold', type: 'currency', pickupType: 'currency', quantity: goldDrop });
        }
        if (deadMonster.holdsKey) {
          const keyDrop = DoorSystem.keyDropForMonster(deadMonster);
          if (keyDrop) drops.push(keyDrop);
        }
        if (drops.length > 0) {
          // LIV-30 item 2: every drop lands on the nearest empty tile (adjacent
          // first, then expanding) so it never covers pre-existing loot. Only
          // stack in place when no free tile remains in the search radius.
          const reserved = new Set();
          for (const item of drops) {
            const free = InventorySystem.findFreeGroundTile(this.gridMap, deadMonster.x, deadMonster.y, reserved);
            const spot = free || { x: deadMonster.x, y: deadMonster.y };
            if (free) reserved.add(free.key);
            this.gridMap.addItem(spot.x, spot.y, { ...item, x: spot.x, y: spot.y });
            this.logCombat(`${deadMonster.name} dropped ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}.`, 'loot');
          }
          if (drops.some(d => d.pickupType === 'key')) soundFX.play('keyJangle');
        }

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

        // E3 / LIV-29 item 4: the key holder's key now drops on the ground (see
        // the drops block above); walking over it grants the per-level key. The
        // grant does NOT open the gate — the player walks into the closed door.

        // E8: the catalog-driven final floor (not the retired 20-floor cave)
        // resolves the boss kill into the campaign ending.
        if (isBoss && (this.isFinalFloor || (this.player.current_floor || 1) >= TOWER_LEVEL_COUNT)) {
          setTimeout(
            () => this.handleFloorClear({ kind: 'summit', dir: 'summit', targetLevel: null }),
            600
          );
        }
      }
    }
  }

  async handlePickUp() {
    soundFX.init();
    // LIV-29 items 4/5: currency and keys resolve through a typed dispatch so
    // they credit the purse / unlock the level rather than banking as items.
    const tileItems = this.gridMap.getItems(this.player.x, this.player.y);
    const topItem = tileItems[tileItems.length - 1];
    const specialHandler = topItem && GROUND_PICKUP_HANDLERS[topItem.pickupType];
    if (specialHandler) {
      if (specialHandler(this, topItem)) await this.persistSave();
      return;
    }

    const res = InventorySystem.pickUpItem(this.player, this.gridMap);
    if (res.success) {
      soundFX.play('itemPickup');
      this.logCombat(res.message, 'loot');
      this.addFloatingText(`+${res.item?.name}`, this.player.x, this.player.y, '#22c55e', { durationMs: FLOATING_LOOT_MS });
      this.updateHUD();
      await this.persistSave();
    }
  }

  /**
   * Opens the chest under the player (walk-on) or at an explicit tile and picks
   * up its contents in the same turn (LIV-16): the chest is opened, its loot
   * goes straight into the inventory, and nothing is left on the ground to
   * require a second walk-over. Persists the opened state.
   * @returns {Promise<boolean>} true when a chest was opened
   */
  async handleOpenChest(gridX = this.player?.x, gridY = this.player?.y) {
    const chest = ChestSystem.findChestAt(this.chests, gridX, gridY);
    if (!ChestSystem.isChestOpenable(chest)) return false;

    soundFX.init();
    const res = ChestSystem.openChest(chest, { vocation: this.player?.vocation });
    if (!res.success) {
      this.logCombat(res.message, 'warning');
      return false;
    }

    this.logCombat(res.message, 'loot');
    this.addFloatingText(`OPENED ${chest.tier.toUpperCase()} CHEST`, chest.x, chest.y, '#ffd700', { durationMs: FLOATING_LOOT_MS });

    // Gold from chests (LIV-22 item 6), in addition to the rolled item loot.
    const goldDrop = EconomySystem.goldFromChest(chest.tier);
    if (goldDrop > 0) {
      EconomySystem.addGold(this.player, goldDrop);
      this.logCombat(`Found ${goldDrop} gold in the chest.`, 'loot');
      this.addFloatingText(`+${goldDrop}g`, chest.x, chest.y, '#fbbf24');
    }

    // Single-turn open + collect: grant the rolled loot directly to the player.
    let picked = 0;
    const pickedNames = [];
    for (const stack of res.loot) {
      const addRes = InventorySystem.addItem(this.player, { ...stack });
      if (addRes.success) {
        picked += 1;
        pickedNames.push(stack.name);
      } else {
        // No room: leave the item on the tile so it is not lost.
        this.gridMap.addItem(chest.x, chest.y, { ...stack, x: chest.x, y: chest.y });
        this.logCombat(`${stack.name} does not fit — left on the ground.`, 'warning');
      }
    }

    if (picked > 0) {
      soundFX.play('itemPickup');
      this.addFloatingText(`+${pickedNames.join(', ')}`, this.player.x, this.player.y, '#22c55e', { durationMs: FLOATING_LOOT_MS });
    }
    this.updateHUD();
    await this.persistChests();
    return true;
  }

  /**
   * Returns the healing fountain on one of the four squares adjacent to the
   * player, or null (LIV-29 item 9). Springs are impassable, so adjacency is
   * the only trigger surface.
   */
  findAdjacentSpring() {
    if (!this.player || !this.gridMap) return null;
    const x = this.player.x;
    const y = this.player.y;
    if (this.gridMap.isSpring(x + 1, y) || this.gridMap.isSpring(x - 1, y)
      || this.gridMap.isSpring(x, y + 1) || this.gridMap.isSpring(x, y - 1)) {
      return (this.springs || []).find(s => Math.abs(s.x - x) + Math.abs(s.y - y) === 1) || { id: 'spring' };
    }
    return null;
  }

  /**
   * Walk-on Tower Gate (LIV-25 / D1 §0.4): returns the player to the Town hub
   * from the floor's arrival room. `current_floor`, gold, and inventory persist.
   */
  handleTownGate(gridX, gridY) {
    if (this.location === 'town') return;
    soundFX.init();
    soundFX.play('uiBack');
    this.logCombat('The Tower Gate hums — you return to the Town of Lokarta.', 'system');
    this.addFloatingText('TOWN', gridX, gridY, '#e5b95c');
    this.leaveTower();
  }

  /**
   * Opens a shut gated door by spending the per-level key earned for its tier
   * (LIV-16). The trigger is walking *into* the closed door (collision), which
   * is the only way to reach a gate — a closed gate is not walkable, so the
   * player can never stand on it before it opens.
   *
   * @param {number} [targetX=this.player?.x] - the tile the player is walking into
   * @param {number} [targetY=this.player?.y]
   * @returns {boolean} true when a door was opened
   */
  openDoorUnderPlayer(targetX = this.player?.x, targetY = this.player?.y) {
    const x = targetX;
    const y = targetY;
    const tile = this.gridMap?.getTile?.(x, y);
    if (!tile || tile.type !== TILE_TYPES.GATED_DOOR || tile.gateOpen) return false;

    const tier = tile.gateTier;
    if (!tier) return false;
    if (!DoorSystem.hasKey(this.player, tier, this.player?.current_floor)) {
      // Only nag once per attempt while blocked at the door.
      const hint = `door:${x},${y}`;
      if (this.stairHint !== hint) {
        this.stairHint = hint;
        this.logCombat(`The ${tier} door is shut — its key is still missing.`, 'warning');
        this.addFloatingText(`${tier.toUpperCase()} LOCKED`, x, y, '#ef4444');
      }
      return false;
    }

    const opened = DoorSystem.openTierGates(this.gridMap, tier);
    if (opened > 0) {
      soundFX.init();
      soundFX.play('keyJangle');
      this.logCombat(`You turn the ${tier} key — the door swings open!`, 'system');
      this.addFloatingText(`${tier.toUpperCase()} DOOR OPEN`, x, y, '#facc15');
      this.stairHint = null;
      this.updateHUD();
      this.persistSave(true);
      return true;
    }
    return false;
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

  /** True while the final floor's boss guardian is still alive (D2 §9.3). */
  isGuardianAlive() {
    return Boolean(this.monsters) && this.monsters.some(m => m.isBoss && m.hp > 0);
  }

  /**
   * Resolves a floor-clear event. `resolution` comes from `StairSystem.resolve`
   * and carries the authored stair `dir`/`targetLevel`, so traversal honors the
   * two-way shaft (up -> previous level, down -> next level) instead of always
   * advancing. A `summit` resolves to victory, but only after the final floor's
   * guardian falls (D2 §9.3). Called with no arguments by the boss-death path,
   * which resolves through the catalog-driven final-floor check.
   */
  async handleFloorClear(resolution = null) {
    if (this.isFloorCleared) return;

    const dir = resolution?.dir || null;
    const kind = resolution?.kind || null;
    const currentFloor = this.player?.current_floor || 1;
    const finalFloor = this.isFinalFloor || currentFloor >= TOWER_LEVEL_COUNT;
    const isSummit = kind === 'summit' || dir === 'summit';
    const targetLevel = resolution?.targetLevel ?? null;

    // D2 §9.3: the Summit stays sealed until the level-5 guardian is dead.
    if (isSummit && this.isGuardianAlive()) {
      const hint = `summit:${this.player.x},${this.player.y}`;
      if (this.stairHint !== hint) {
        this.stairHint = hint;
        this.logCombat('The Summit is sealed until the Spire Warden falls.', 'warning');
        this.addFloatingText('SEALED', this.player.x, this.player.y, '#ef4444');
      }
      return;
    }

    const isVictory = isSummit || (targetLevel === null && finalFloor);

    if (isVictory) {
      this.isFloorCleared = true;
      this.isPaused = true;
      soundFX.play('victory');
      this.logCombat('🎉 YOU CONQUERED THE CROWN SPIRE! THE TOWER IS LIT!', 'victory');
      this.addFloatingText('CAMPAIGN COMPLETED!', this.player.x, this.player.y, '#ffd700');
      await this.persistSave(true);
      this.showVictoryModal();
      return;
    }

    if (targetLevel === null) {
      // Missing/unknown direction: no-op with a one-shot feedback cue (§9.3).
      const hint = `noop:${this.player.x},${this.player.y}`;
      if (this.stairHint !== hint) {
        this.stairHint = hint;
        this.logCombat('These stairs lead nowhere yet.', 'warning');
      }
      return;
    }

    this.isFloorCleared = true;
    this.isPaused = true;

    try {
      const nextFloor = targetLevel;
      const descending = dir === 'up';

      // LIV-29 item 7: traversing stairs grants no XP (the old 50*floor bonus
      // was exploitable). XP comes only from defeating monsters.
      soundFX.play('stairs');
      this.logCombat(
        `Stepped on stairway! ${descending ? 'Descended' : 'Climbed'} to Floor ${nextFloor}.`,
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
      }, { skippable: false, label: `${descending ? 'DESCENDING TO' : 'ASCENDING TO'} FLOOR ${nextFloor}` });
    } catch (err) {
      console.error('Floor transition error:', err);
    } finally {
      this.isFloorCleared = false;
      if (this.modalOverlayEl.classList.contains('hidden')) {
        this.isPaused = false;
      }
    }
  }

  /**
   * Spawns a floating combat/pickup number. LIV-29 item 6: each spawn gets a
   * rotating sub-tile offset and (for loot) a longer life so pickup and chest
   * messages spread around the player instead of piling on one pixel. The list
   * is ring-buffer capped so it can never grow unbounded.
   * @param {object} [opts] - `{ durationMs }` override
   */
  addFloatingText(text, gridX, gridY, color, opts = {}) {
    if (this.options && this.options.damageNumbers === false && /^-\d/.test(String(text))) return;
    const durationMs = Number(opts.durationMs) || FLOATING_DEFAULT_MS;
    this._floatingTextSeq = (this._floatingTextSeq || 0) + 1;
    const idx = (this._floatingTextSeq - 1) % GROUND_DROP_OFFSETS.length;
    const [ox, oy] = GROUND_DROP_OFFSETS[idx];
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x: gridX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 + ox * FLOATING_STAGGER_PX,
      y: gridY * CONFIG.GRID_SIZE - 6 + oy * FLOATING_STAGGER_PX,
      color,
      durationMs,
      elapsedMs: 0,
    });
    if (this.floatingTexts.length > FLOATING_MAX_ACTIVE) {
      this.floatingTexts.splice(0, this.floatingTexts.length - FLOATING_MAX_ACTIVE);
    }
  }

  updateHUD() {
    HUDManager.updateHUD(
      {
        statusBarsEl: this.statusBarsEl,
        sidebarEl: this.sidebarEl,
        loadoutEl: this.loadoutEl,
        backpackEl: this.backpackEl,
      },
      this
    );
    this.abilityBar.paint();
  }

  logCombat(message, category = 'system') {
    HUDManager.logCombat(this.combatLogScrollEl, message, category);
  }

  clearCombatLog() {
    HUDManager.clearCombatLog(this.combatLogScrollEl);
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

Object.assign(LokartaApp.prototype, gameLoopMethods);
