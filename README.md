# Lokarta: Come Into The Light

*A zero-backend, client-side 2D roguelike RPG running natively in modern web browsers.*

---

## 🏰 Project Overview

**Lokarta: Come Into The Light** is a retro-inspired, turn-based grid simulation and real-time canvas rendering 2D roguelike RPG. Built entirely with native web standards (ES Modules, Web Workers, HTML5 Canvas 2D, Web Audio API, and IndexedDB), Lokarta delivers a complete, offline-capable dungeon crawler experience without requiring backend servers, API endpoints, or external database infrastructure.

### Key Highlights

- **Zero-Backend Architecture:** Self-contained static client application. Runs directly in any modern browser via standard HTTP static file servers.
- **Off-Thread Simulation & Worker RPC:** Procedural floor generation and state persistence run off the UI thread in a dedicated Web Worker (`game-worker.js`), communicated via a Promise-wrapped RPC client bridge (`game-client.js`).
- **20-Floor Procedural Dungeon & 4 Biomes:** Deterministic Mulberry32 PRNG dungeon generation on a $40 \times 40$ tile matrix with Breadth-First Search (BFS) connectivity verification. Progresses across 4 biomes (Subterranean Crypt, Catacombs of Whispers, Shadow Vaults, Abyssal Sanctum) culminating in the Floor 20 Abyssal Overlord boss fight.
- **Dynamic Line-of-Sight (LOS) Lighting:** Circular radius field-of-view algorithm driven by JSON catalog specs (Base FOV: 10 tiles, Torch: +2 radius, degrading Light Spell: +3/+2/+1 radius).
- **4 Playable Vocations & Vocation-Locked Equipment:** Play as Magician, Archer, Fighter, or Paladin with unique stat growth curves. The class advantage comes from **exclusive access to vocation-locked gear** — weapons, armor, and relics can only be equipped by their appropriate vocation.
- **Fate Grant Leveling System:** 5-card draft reward selection upon leveling up (up to Level 20 cap), offering vocation-aligned skills, stat boosts, and gear.
- **Data-Driven JSON Catalogs:** Clean JSON data structures under `html/data/` defining 11 decoupled catalogs: `cards.json`, `monsters.json`, `items.json`, `vocations.json`, `sounds.json`, `abilities.json`, `biomes.json`, `encounters.json`, `dungeons.json`, `tile_themes.json`, and `keybindings.json`.
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
node --test html/tests/engine.test.mjs html/tests/audio.test.mjs html/tests/submodules.test.mjs html/tests/app-modules.test.mjs html/tests/data-catalogs.test.mjs html/tests/golden-sets.test.mjs
```

### Test Suite Coverage (6 Test Suites, 98/98 Passing)

- **Floor Generator (1–20):** Validates Mulberry32 determinism, $40 \times 40$ matrix boundaries, spawn $(2,2)$ and exit stairs $(35,35)$ placement, BFS path connectivity, biome mapping, and Floor 20 Abyssal Overlord stats (600 HP, 20 ATK, 6 DEF).
- **GridMap & Tile Bounds:** Tests matrix initialization, tile opacity/walkability checks, and item placement/removal.
- **LightingSystem & 10-Tile FOV:** Verifies FOV radius calculations (Base 10, Torch +2, degrading Light Spell +3/+2/+1), spatial circle lighting without wall occlusion.
- **ProgressionSystem & 4 Vocations:** Verifies initial archetype vitals, XP level curves (`level * 100`), and stat growth from `vocations.json`.
- **CombatSystem (No Class Multiplier) & Vocation-Locked Equipment:** Verifies damage/healing uses only `skillBoosts.damageMultiplier` (no legacy class multiplier), Archer arrow consumption, Paladin prayers/strikes, and that vocation-locked gear (including shared `["fighter","paladin"]` arrays) is rejected for the wrong class and accepted for the right one.
- **InventorySystem & Stacking:** Tests item pickup priorities (Action Slots 0–9 before Backpack), paperdoll equipment slots, unequip logic, and stack limits from `items.json`.
- **FateGrantSystem:** Verifies 5-card draft reward generation from `cards.json` and inventory placement.
- **LOK-15 Golden Equipment Sets:** Verifies the four Golden sets (Magician untouched; Archer Grey Stalker quiver regen/consume/fill; Fighter Vanguard shield bash push+stun+cooldown, wide cleave, fortify; Paladin Radiant Crusader mana-gated holy bubble with absorb intercept) plus rank-to-5 upgrade paths, draft offers, and the Slice-3 monster damage re-tune.
- **GestureEngine:** Validates key mapping for hotkeys `1`–`9` and `0` to slots 0–9.
- **GameClient & Worker Protocol:** Tests client initialization and worker RPC lifecycle communication.
- **JSON Data Catalogs:** Validates schema structure and completeness across all 11 JSON catalogs under `html/data/`.

---

## 🏗️ Architecture & Module Structure

The client application is structured into clean, modular vanilla ES JavaScript submodules residing under `html/`:

| Module / Directory | Layer | Thread Context | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| [`html/index.html`](file:///Users/jarad/git/lokarta-v3/html/index.html) | View / DOM | Main UI Thread | HTML5 layout container, Canvas element, HUD overlays, and modal views. |
| [`html/styles/`](file:///Users/jarad/git/lokarta-v3/html/styles/) | Presentation | Main UI Thread | Modular CSS stylesheets (`base.css`, `hud.css`, `modals.css`, `index.css`). |
| [`html/app.js`](file:///Users/jarad/git/lokarta-v3/html/app.js) | Bootstrap | Main UI Thread | Central loading entry point for application controllers and renderers. |
| [`html/app/`](file:///Users/jarad/git/lokarta-v3/html/app/) | UI Controller | Main UI Thread | Submodules: `app-controller.js`, `canvas-renderer.js`, `hud-manager.js`, `input-controller.js`, `modal-manager.js`, `sprite-renderer.js`. |
| [`html/audio/`](file:///Users/jarad/git/lokarta-v3/html/audio/) | Audio Subsystem | Main UI Thread | Web Audio API procedural synthesizer (`audio-system.js`) driven by `sounds.json`. |
| [`html/data/`](file:///Users/jarad/git/lokarta-v3/html/data/) | Data Catalogs | Shared | 11 JSON data catalogs: `cards.json`, `monsters.json`, `items.json`, `vocations.json`, `sounds.json`, `abilities.json`, `biomes.json`, `encounters.json`, `dungeons.json`, `tile_themes.json`, `keybindings.json`. |
| [`html/engine/`](file:///Users/jarad/git/lokarta-v3/html/engine/) | Core Engine | Shared | Submodules: `config.js`, `grid-map.js`, `lighting-system.js`, `progression-system.js`, `combat-system.js`, `entity-ai.js`, `inventory-system.js`, `fate-grant-system.js`, `gesture-engine.js`. |
| [`html/services/`](file:///Users/jarad/git/lokarta-v3/html/services/) | Services | Shared / Worker | Floor generator (`floor-generator.js`) and IndexedDB persistence (`storage.js`). |
| [`html/worker/`](file:///Users/jarad/git/lokarta-v3/html/worker/) | Worker RPC | Web Worker Thread | RPC Client (`game-client.js`) and background worker dispatcher (`game-worker.js`). |
| [`html/tests/`](file:///Users/jarad/git/lokarta-v3/html/tests/) | Test Suite | CLI / Node.js | Automated unit test suites (`engine`, `audio`, `submodules`, `app-modules`, `data-catalogs`, `golden-sets`). |

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

## 📖 Reverse-Engineered Documentation Index

Complete technical documentation and specifications reverse-engineered from the ground-truth application codebase:

- **Concept Specification:** [`concept.md`](file:///Users/jarad/git/lokarta-v3/concept.md) — Product identity, target audience, stack summary, vocation specs, and biome catalog.
- **Technical Architecture:** [`docs/architecture.md`](file:///Users/jarad/git/lokarta-v3/docs/architecture.md) — Detailed subsystem architecture, RPC protocols, IndexedDB schemas, rendering lerp formulas, and audio graphs.
- **AI Agent Development Guidelines:** [`docs/agents.md`](file:///Users/jarad/git/lokarta-v3/docs/agents.md) — Mandatory architecture rules, data-driven constraints, hot-path performance budgets, and regression testing standards.
- **Optimization & Performance Report:** [`docs/optimizations.md`](file:///Users/jarad/git/lokarta-v3/docs/optimizations.md) — Detailed runtime bottlenecks, GC profiling, overdraw culling, and proposed optimization solutions.
- **Verification Report:** [`docs/verification-report.md`](file:///Users/jarad/git/lokarta-v3/docs/verification-report.md) — Stage 8 test execution evidence, verification matrix, and compliance audit.
- **Environment & System Notes:** [`environment-notes.md`](file:///Users/jarad/git/lokarta-v3/environment-notes.md) — Browser API specifications, server setups, and test runner guidelines.
- **Feature Briefs:** [`features/briefs/`](file:///Users/jarad/git/lokarta-v3/features/briefs/)
  - [`01-dungeon-generator.md`](file:///Users/jarad/git/lokarta-v3/features/briefs/01-dungeon-generator.md) — Procedural generation, PRNG, and BFS connectivity.
  - [`02-lighting-and-los.md`](file:///Users/jarad/git/lokarta-v3/features/briefs/02-lighting-and-los.md) — Circular radius lighting engine and dynamic fog of war.
  - [`03-combat-and-abilities.md`](file:///Users/jarad/git/lokarta-v3/features/briefs/03-combat-and-abilities.md) — Turn-based combat, ability execution, and vocation-locked equipment.
  - [`04-vocations-and-progression.md`](file:///Users/jarad/git/lokarta-v3/features/briefs/04-vocations-and-progression.md) — 4 playable vocations, stat scaling, and XP curves.
  - [`05-inventory-and-storage.md`](file:///Users/jarad/git/lokarta-v3/features/briefs/05-inventory-and-storage.md) — Action bar, backpack, paperdoll, item stacking, and IndexedDB persistence.
  - [`06-audio-synthesizer.md`](file:///Users/jarad/git/lokarta-v3/features/briefs/06-audio-synthesizer.md) — Procedural Web Audio API synthesizer catalog.
  - [`07-web-worker-rpc.md`](file:///Users/jarad/git/lokarta-v3/features/briefs/07-web-worker-rpc.md) — Web Worker thread offloading and asynchronous RPC bridge.
  - [`08-ui-and-canvas-renderer.md`](file:///Users/jarad/git/lokarta-v3/features/briefs/08-ui-and-canvas-renderer.md) — 10 Hz simulation loop, 60 FPS lerp Canvas rendering, and gesture engine.
- **Feature Specification Breakdown:** [`features/`](file:///Users/jarad/git/lokarta-v3/features/) — Full specification files (`01-dungeon-generator.md` through `08-ui-and-canvas-renderer.md`).
- **Stage Summaries:** [`summaries/`](file:///Users/jarad/git/lokarta-v3/summaries/) — Stage summaries (`01-write-concept.md` through `09-documentation.md`).
