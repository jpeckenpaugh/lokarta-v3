# Lokarta: Come Into The Light

*A zero-backend, client-side 2D roguelike RPG running natively in modern web browsers.*

---

## 🏰 Project Overview

**Lokarta: Come Into The Light** is a retro-inspired, turn-based grid simulation and real-time canvas rendering 2D roguelike RPG. Built entirely with native web standards (ES Modules, Web Workers, HTML5 Canvas 2D, Web Audio API, and IndexedDB), Lokarta delivers a complete, offline-capable dungeon crawler experience without requiring backend servers, API endpoints, or external database infrastructure.

### Key Highlights

- **Zero-Backend Architecture:** Self-contained static client application. Runs directly in any modern browser via standard HTTP static file servers.
- **Off-Thread Simulation & Worker RPC:** Procedural floor generation and state persistence run off the UI thread in a dedicated Web Worker (`game-worker.js`), communicated via a Promise-wrapped RPC client bridge (`game-client.js`).
- **Procedural Tower Ascent & 5 Tiers:** Deterministic Mulberry32 PRNG tower generation on a $40 \times 40$ tile matrix with Breadth-First Search (BFS) connectivity verification. Ascends five tiers (The Gatehouse, The Hall of Banners, The Bell Keep, The Solar Gallery, The Crown Spire) culminating in the final Spire Warden boss fight.
- **Dynamic Line-of-Sight (LOS) Lighting:** Circular radius field-of-view algorithm driven by JSON catalog specs (Base FOV: 10 tiles, degrading `lightSpellTimer` +3/+2/+1 engine seam).
- **4 Playable Vocations & Vocation-Locked Equipment:** Play as Magician, Archer, Fighter, or Paladin with unique stat growth curves. The class advantage comes from **exclusive access to vocation-locked gear** — weapons, armor, and relics can only be equipped by their appropriate vocation.
- **Fate Grant Leveling System:** 5-card draft reward selection upon leveling up (up to Level 20 cap), offering vocation-aligned skills, stat boosts, and gear.
- **Data-Driven JSON Catalogs:** Clean JSON data structures under `html/data/` defining 16 decoupled catalogs: `cards.json`, `monsters.json`, `items.json`, `vocations.json`, `sounds.json`, `abilities.json`, `biomes.json`, `encounters.json`, `dungeons.json`, `tower_levels.json`, `doors.json`, `chests.json`, `tile_themes.json`, `keybindings.json`, `ui.json`, and `economy.json`.
- **Real-Time Web Audio Synthesizer:** 19 procedural sound definitions (footsteps, spell sparks, bow snaps, holy chimes, level-up fanfares, victory/defeat) driven by `html/data/sounds.json` without external audio asset files.
- **Offline Save Persistence:** Local database persistence (`lokarta_browser_db`) via IndexedDB storing characters, action bars, equipment paperdolls, backpacks, profile settings, and generated floor states.

---

## 🚀 Quickstart & Server Setup

Because Lokarta uses ES Modules and dedicated Web Workers, files must be served over HTTP/HTTPS rather than opened directly via `file://`.

### Launching the Game

Use the provided root launcher script:

```bash
./run.sh
```

`run.sh` automatically detects available HTTP static servers in priority order:
1. `python3 -m http.server -d html 3000`
2. `npx serve html -l 3000`
3. `python -m SimpleHTTPServer 3000`

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
- Node.js v18.0.0 or higher.

### Executing Tests

Run all test suites from the repository root:

```bash
node --test html/tests/*.test.mjs
```

The glob covers all evaluation suites under `html/tests/` (31 test files / 80 suites / 507 tests). CI (`.github/workflows/test.yml`) runs the same command on every push.

### Test Suite Coverage (31 Test Files, 507 Tests / 80 Suites / 0 Fail)

- **Floor Generator:** Validates Mulberry32 determinism, $40 \times 40$ matrix boundaries, spawn $(2,2)$ and exit stairs $(35,35)$ placement, BFS path connectivity, tier mapping, and final guardian (The Spire Warden) stats (600 HP, 20 ATK, 6 DEF).
- **GridMap & Tile Bounds:** Tests matrix initialization, tile opacity/walkability checks, and item placement/removal.
- **LightingSystem & 10-Tile FOV:** Verifies FOV radius calculations (Base 10, degrading `lightSpellTimer` +3/+2/+1 engine seam), spatial circle lighting without wall occlusion.
- **ProgressionSystem & 4 Vocations:** Verifies initial archetype vitals, XP level curves (`level * 100`), and stat growth from `vocations.json`.
- **CombatSystem (No Class Multiplier) & Vocation-Locked Equipment:** Verifies damage/healing uses only `skillBoosts.damageMultiplier` (no legacy class multiplier), Archer arrow consumption, Paladin prayers/strikes, and that vocation-locked gear (including shared `["fighter","paladin"]` arrays) is rejected for the wrong class and accepted for the right one.
- **InventorySystem & Stacking:** Tests item pickup priorities (Action Slots 0–9 before Backpack), paperdoll equipment slots, unequip logic, and stack limits from `items.json`.
- **FateGrantSystem:** Verifies 5-card draft reward generation from `cards.json` and inventory placement.
- **LOK-15 Golden Equipment Sets:** Verifies the four Golden sets (Magician untouched; Archer Grey Stalker quiver regen/consume/fill; Fighter Vanguard shield bash push+stun+cooldown, wide cleave, fortify; Paladin Radiant Crusader mana-gated holy bubble with absorb intercept) plus rank-to-5 upgrade paths, draft offers, and the Slice-3 monster damage re-tune.
- **GestureEngine:** Validates key mapping for hotkeys `1`–`9` and `0` to slots 0–9.
- **GameClient & Worker Protocol:** Tests client initialization and worker RPC lifecycle communication.
- **JSON Data Catalogs:** Validates schema structure and completeness across all 16 JSON catalogs under `html/data/`.

---

## 🏗️ Architecture & Module Structure

The client application is structured into clean, modular vanilla ES JavaScript submodules residing under `html/`:

| Module / Directory | Layer | Thread Context | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| [`html/index.html`](html/index.html) | View / DOM | Main UI Thread | HTML5 layout container, Canvas element, HUD overlays, and modal views. |
| [`html/styles.css`](html/styles.css) + [`html/styles/`](html/styles/) | Presentation | Main UI Thread | Aggregator plus modular CSS (`base.css`, `hud.css`, `modals.css`). |
| [`html/app.js`](html/app.js) | Bootstrap | Main UI Thread | Central loading entry point for application controllers and renderers. |
| [`html/app/`](html/app/) | UI Controller | Main UI Thread | `app-controller.js`, `canvas-renderer.js`, `sprite-renderer.js`, `hud-manager.js`, `modal-manager.js`, `input-controller.js`, `ability-bar.js`, `autofire.js`, `animation-state.js`, and related controllers. |
| [`html/audio/`](html/audio/) | Audio Subsystem | Main UI Thread | Web Audio API procedural synthesizer (`audio-system.js`) driven by `sounds.json`. |
| [`html/data/`](html/data/) | Data Catalogs | Shared | 16 JSON data catalogs (`cards`, `monsters`, `items`, `vocations`, `sounds`, `abilities`, `biomes`, `encounters`, `dungeons`, `tower_levels`, `doors`, `chests`, `tile_themes`, `keybindings`, `ui`, `economy`) plus the `index.js` barrel. |
| [`html/engine/`](html/engine/) | Core Engine | Shared | `config.js`, `grid-map.js`, `lighting-system.js`, `progression-system.js`, `combat-system.js`, `entity-ai.js`, `inventory-system.js`, `economy-system.js`, `item-progression.js`, `item-stats.js`, `fate-grant-system.js`, `gesture-engine.js`, and related systems. |
| [`html/services/`](html/services/) | Services | Shared / Worker | Tower floor generator (`floor-generator.js`), IndexedDB persistence (`storage.js`), save slots (`save-slots.js`), build version (`build-version.js`). |
| [`html/worker/`](html/worker/) | Worker RPC | Web Worker Thread | RPC client (`game-client.js`) and background worker dispatcher (`game-worker.js`). |
| [`html/assets/`](html/assets/) | Static Assets | Shared | Sprite atlases (`sprites/`), OpenMoji HUD icons, and brand SVGs. |
| [`html/tests/`](html/tests/) | Test Suite | CLI / Node.js | Native `node:test` suites (`*.test.mjs`). |

---

## 🎮 Controls & Gameplay Summary

### Keyboard Controls
- **Movement:** `W`, `A`, `S`, `D` or Arrow Keys $\uparrow, \leftarrow, \downarrow, \rightarrow$.
- **Action Bar Shortcuts:** Keys `1` through `9` map to Action Bar slots 0–8; Key `0` maps to slot 9.
- **Interact / Stairs:** Step directly onto stairs at tile position $(35,35)$ to advance to the next floor.

### Touch & Mobile Gestures
- **Swipe:** Directional swipe movements for player navigation.
- **Tap:** Tap HUD elements, action bar slots, or floor items for interaction and item usage.

### Character Inventory Layout
- **10-Slot Action Bar (Slots 0–9):** Hotbar for immediate skill activation or consumable item usage (potions, torches).
- **6-Slot Backpack:** General storage for non-hotbar inventory items.
- **4-Slot Paperdoll Equipment:** Equippable slots: `main_hand`, `off_hand`, `armor`, and `relic`.

---

## 📖 Documentation Index

All docs live under `docs/`:

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
