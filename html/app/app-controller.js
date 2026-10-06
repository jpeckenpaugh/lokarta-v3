/**
 * Lokarta: Come Into The Light - Main Application Controller
 */

import { GameClient } from '../worker/game-client.js';
import {
  TILE_TYPES,
  GridMap,
  LightingSystem,
  InventorySystem,
  ChestSystem,
  DoorSystem,
  StairSystem,
  GestureEngine,
  EconomySystem,
  createPlayer,
} from '../engine/index.js';
import { soundFX } from '../audio/index.js';
import { ABILITIES_CATALOG, VOCATIONS_CATALOG, UI_CATALOG } from '../data/index.js';
import { applyItemRankUp } from '../engine/item-progression.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { gameLoopMethods } from './game-loop.js';
import { hudFxMethods } from './hud-fx.js';
import { combatControllerMethods } from './combat-controller.js';
import { inventoryControllerMethods } from './inventory-controller.js';
import { ModalManager } from './modal-manager.js';
import { InputController } from './input-controller.js';
import { AbilityBar } from './ability-bar.js';
import { TransitionController } from './transition-controller.js';
import { normalizeOptions, resolveReducedMotion, slotSummary } from '../services/save-slots.js';
import { TOWER_LEVEL_COUNT } from '../services/floor-generator.js';
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



  showFateGrantModal(level = 1) {
    ModalManager.showFateGrantModal(this.modalOverlayEl, this, level);
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

Object.assign(LokartaApp.prototype, inventoryControllerMethods);

Object.assign(LokartaApp.prototype, combatControllerMethods);

Object.assign(LokartaApp.prototype, hudFxMethods);

Object.assign(LokartaApp.prototype, gameLoopMethods);
