# Lokarta: Come Into The Light

*A zero-backend, client-side 2D roguelike RPG running natively in modern web browsers.*

---

## 🏰 Project Overview

**Lokarta: Come Into The Light** is a retro-inspired, real-time 2D roguelike RPG with a fixed 10 Hz simulation tick and 60 FPS HTML5 Canvas rendering. Built entirely with native web standards (ES Modules, Web Workers, Canvas 2D, Web Audio API, and IndexedDB), Lokarta delivers a complete, offline-capable dungeon crawler experience without requiring backend servers, API endpoints, or external database infrastructure.

### Key Highlights

- **Zero-Backend Architecture:** Self-contained static client application. Runs directly in any modern browser via standard HTTP static file servers.
- **Dual-Loop & Worker RPC:** 60 FPS Canvas rendering and 10 Hz simulation tick (`game-loop.js`) run on the Main UI Thread; procedural floor generation and IndexedDB storage persistence run in a background Web Worker (`game-worker.js`) over a Promise-wrapped RPC client (`game-client.js`).
- **Procedural Tower Ascent & 5 Tiers:** Deterministic Mulberry32 PRNG tower generation on a $40 \times 40$ tile matrix with Breadth-First Search (BFS) connectivity verification. Ascends five tiers (The Gatehouse, The Hall of Banners, The Bell Keep, The Solar Gallery, The Crown Spire) with key-gated door progression, culminating in the Spire Warden boss fight.
- **Havenreach Town Hub:** Visit the town hub to access the Merchant's Stall (Shop), Temple of the Dawn (Temple healing and defeat revival), or embark into the tower with floor progress preserved.
- **Dynamic Line-of-Sight (LOS) Lighting:** Circular radius field-of-view algorithm driven by JSON catalog specs (Base FOV: 10 tiles, degrading `lightSpellTimer` +3/+2/+1 engine seam, dynamic brazier ambient emitters).
- **4 Playable Vocations & Vocation-Locked Equipment:** Play as Magician, Archer, Fighter, or Paladin with unique stat growth curves. The class advantage comes from **exclusive access to vocation-locked gear** — weapons, armor, and relics can only be equipped by their appropriate vocation.
- **Fate Grant Leveling System:** 5-card draft reward selection at Level 1 and on every level up (requiring exactly 2 card picks, up to Level 20 cap), offering vocation-aligned skills, stat boosts, and gear rank scaling (Ranks 1–5).
- **Data-Driven JSON Catalogs:** Clean JSON data structures under `html/data/` defining 16 decoupled catalogs: `cards.json`, `monsters.json`, `items.json`, `vocations.json`, `sounds.json`, `abilities.json`, `biomes.json`, `encounters.json`, `dungeons.json`, `tower_levels.json`, `doors.json`, `chests.json`, `tile_themes.json`, `keybindings.json`, `ui.json`, and `economy.json`.
- **Real-Time Web Audio Synthesizer:** 23 procedural sound definitions (footsteps, spell sparks, bow snaps, holy chimes, coins, key jangles, fanfares, victory/defeat) driven by `html/data/sounds.json` without external audio asset files.
- **Multi-Slot Persistence & Cache Invalidation:** Multi-slot save management (5 save slots in `lokarta_browser_db` via IndexedDB) and per-deployment build ID cache flushing (`tools/write-build-id.mjs`, `boot.js`, `sw.js`).

---

## 🚀 Quickstart & Server Setup

Because Lokarta uses ES Modules and dedicated Web Workers, files must be served over HTTP/HTTPS rather than opened directly via `file://`.

### Launching the Game

Use the provided root launcher script:

```bash
./run.sh
```

`run.sh` stamps a unique build ID for client cache invalidation and auto-detects available static HTTP servers:
1. `python3 -m http.server -d html 3000`
2. `npx serve html -l 3000`
3. `python -m SimpleHTTPServer 3000` (subshell in `html/`)

Once launched, open your web browser and navigate to:
**`http://localhost:3000`**

### Customizing the Server Port

Override the default port (`3000`) using the `PORT` environment variable:

```bash
PORT=8080 ./run.sh
```

---

## 🧪 Automated Testing

Lokarta includes a comprehensive, zero-dependency automated unit test suite built for the native Node.js test runner (`node:test`).

### Prerequisites
- Node.js v18.0.0 or higher (CI runs on Node 22).

### Executing Tests

Run all test suites from the repository root:

```bash
node --test html/tests/*.test.mjs
```

The glob covers all evaluation suites under `html/tests/` (31 test files / 80 suites / 507 tests). CI (`.github/workflows/test.yml`) runs the same command on every push.

### Test Suite Coverage Highlights

- **Tower Progression & Generation:** Validates Mulberry32 determinism, $40 \times 40$ matrix bounds, Level 1 entrance spawn `[19, 2]`, two-way stair shaft connectivity, tier keyholder mapping, and Spire Warden boss stats (600 HP, 20 ATK, 6 DEF).
- **GridMap & Tile Bounds:** Tests matrix initialization, tile opacity/walkability checks, and item placement/removal.
- **LightingSystem & 10-Tile FOV:** Verifies FOV radius calculations (Base 10, degrading `lightSpellTimer` +3/+2/+1 engine seam) and brazier ambient lighting.
- **ProgressionSystem & 4 Vocations:** Verifies initial archetype vitals, XP level curves (`level * 100`), and stat growth from `vocations.json`.
- **CombatSystem & Vocation-Locked Equipment:** Verifies damage/healing scaling (`skillBoosts.damageMultiplier`), arrow consumption, Golden Sets (Grey Stalker, Vanguard, Sanctuary), and vocation affinity locks.
- **Loadout, Backpack & Stacking:** Tests item pickup priorities (Active slots 1–4 before the 36-slot backpack), equipment hotkeys (`Q,W,E,R`), and item stack limits.
- **FateGrantSystem:** Verifies 5-card draft generation and 2-card selection rules from `cards.json`.
- **GameClient & Worker Protocol:** Tests client initialization, error propagation, and 17 RPC command handlers.
- **JSON Data Catalogs:** Validates schema structure and completeness across all 16 JSON catalogs under `html/data/`.

---

## 🏗️ Architecture & Module Structure

The client application is structured into clean, modular vanilla ES JavaScript submodules residing under `html/`:

| Module / Directory | Layer | Thread Context | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| [`html/index.html`](html/index.html) | View / DOM | Main UI Thread | HTML5 layout container, Canvas element, Loadout / Backpack HUD overlays, and modal views. |
| [`html/boot.js`](html/boot.js) | Bootstrap | Main UI Thread | Version checking, cache-flush guard, service worker registration, and dynamic bundle loading. |
| [`html/app.js`](html/app.js) | App Entry | Main UI Thread | Central loading entry point for application controllers and renderers. |
| [`html/app/`](html/app/) | UI Controllers | Main UI Thread | `app-controller.js`, `game-loop.js` (10 Hz ticker), `save-controller.js`, `combat-controller.js`, `inventory-controller.js`, `floor-controller.js`, `shop-controller.js`, `canvas-renderer.js`, `sprite-renderer.js`, `hud-manager.js`, `modal-manager.js`, `input-controller.js`, `ability-bar.js`, `autofire.js`, `animation-state.js`, `hud-fx.js`, `splash-screen.js`, `title-ambient.js`, `transition-controller.js`. |
| [`html/audio/`](html/audio/) | Audio Subsystem | Main UI Thread | Web Audio API procedural synthesizer (`audio-system.js`) driven by `sounds.json`. |
| [`html/data/`](html/data/) | Data Catalogs | Shared | 16 JSON data catalogs (`cards`, `monsters`, `items`, `vocations`, `sounds`, `abilities`, `biomes`, `encounters`, `dungeons`, `tower_levels`, `doors`, `chests`, `tile_themes`, `keybindings`, `ui`, `economy`) plus `index.js`. |
| [`html/engine/`](html/engine/) | Core Simulation | Main UI Thread | `config.js`, `grid-map.js`, `lighting-system.js`, `progression-system.js`, `combat-system.js`, `inventory-system.js`, `entity-ai.js`, `fate-grant-system.js`, `economy-system.js`, `item-progression.js`, `item-stats.js`, `gesture-engine.js`, `projectile-collision.js`, `chest-system.js`, `door-system.js`, `stair-system.js`. |
| [`html/services/`](html/services/) | Services | Shared / Worker | Tower floor generator (`floor-generator.js`), IndexedDB persistence (`storage.js`), save slots (`save-slots.js`), build version (`build-version.js`). |
| [`html/worker/`](html/worker/) | Worker RPC | Client / Worker | `game-client.js` (Main UI Thread Promise bridge) and `game-worker.js` (Dedicated Web Worker thread). |
| [`html/styles/`](html/styles/) | Presentation | Main UI Thread | Root `styles.css` bundle and modular CSS (`base.css`, `hud.css`, `modals.css`). |
| [`html/assets/`](html/assets/) | Static Assets | Shared | JSON sprite frames (`sprites/`), OpenMoji HUD icons, and brand graphics. |
| [`html/tests/`](html/tests/) | Test Suite | CLI / Node.js | Native `node:test` suites (`*.test.mjs`). |

---

## 🎮 Controls & Gameplay Summary

### Keyboard Controls
- **Movement:** `W`, `A`, `S`, `D` or Arrow Keys $\uparrow, \leftarrow, \downarrow, \rightarrow$.
- **Active Consumable Slots:** Keys `1`, `2`, `3`, `4` activate potions and torches.
- **Equipment Hotkeys:** Keys `Q`, `W`, `E`, `R` map to `main_hand`, `off_hand`, `armor`, and `relic`.
- **Interact / Stairs:** Step directly onto stairs connecting the two-way tower shafts to traverse floors.

### Touch & Mobile Gestures
- **Swipe:** Directional swipe movements for player navigation.
- **Tap:** Tap HUD elements, loadout slots, or floor items for interaction and item usage.

### Character Inventory Layout
- **4-Slot Active Action Bar:** Hotbar for immediate consumable item usage (`1`–`4`).
- **4-Slot Equipment Loadout:** Equippable slots for `main_hand` (`Q`), `off_hand` (`W`), `armor` (`E`), and `relic` (`R`).
- **36-Slot Backpack:** $6 \times 6$ grid storage for inventory items.

---

## 📖 Documentation Index

All documentation lives under `docs/`:

- **Design canon (`docs/design/`)**
  - [`game-design.md`](docs/design/game-design.md) — Core game loop, 4 vocations, 5-tier tower ascent, Havenreach town hub, and inventory rules.
- **Art direction (`docs/art/`)**
  - [`art-direction.md`](docs/art/art-direction.md) — 16-bit SNES-inspired pixel art specifications, frame sets, and contrast rules.
  - [`preview/`](docs/art/preview/) — Committed sprite preview PNGs (verified by tests).
- **Engineering (`docs/engineering/`)**
  - [`architecture.md`](docs/engineering/architecture.md) — Modular UI controllers, Web Worker RPC protocol, and IndexedDB schema.
  - [`agents.md`](docs/engineering/agents.md) — Mandatory architecture rules, data-driven constraints, hot-path budgets, and testing standards.
  - [`build-versioning.md`](docs/engineering/build-versioning.md) — Build ID cache-busting mechanism.
  - [`environment.md`](docs/engineering/environment.md) — Browser API prerequisites, local server, and test procedures.
