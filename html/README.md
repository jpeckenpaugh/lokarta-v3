# Lokarta: Come Into The Light

**Lokarta: Come Into The Light** is a zero-backend, client-side, offline-capable 2D roguelike RPG. It runs entirely inside standard modern web browsers using native Web standards: **Web Workers**, **IndexedDB**, **vanilla ES Modules**, HTML5 Canvas rendering, and **procedural Web Audio API**.

---

## 🌟 Key Highlights

- **Web-Native & Zero-Backend:** Fully self-contained static application with no server runtime or external database dependencies required. Can be hosted on GitHub Pages, Cloudflare Pages, S3, or any static web server.
- **Dedicated Web Worker:** Runs procedural floor generation and state synchronization in a background worker thread (`game-worker.js`) communicating over a typed RPC protocol (`game-client.js`).
- **IndexedDB Persistence:** Complete character progression, equipped gear (4 paperdoll slots), 10 action slots, 6-slot backpack state, settings, and tower floors persist locally across browser reloads.
- **Procedural Tower Ascent:** Deterministic Mulberry32 PRNG generator (`floor-generator.js`) climbs five tower tiers (The Gatehouse, The Hall of Banners, The Bell Keep, The Solar Gallery) culminating in The Crown Spire and the final Spire Warden boss fight.
- **Procedural Web Audio:** Real-time synthesis of sound effects (footsteps, wand sparks, energy beams, bow shots, power shots, monster hits, level-up fanfares, potions) using the Web Audio API.

---

## 🚀 Quick Start & Launching

Because Lokarta uses native ES Modules and Web Workers (`type: "module"`), files must be served over HTTP/HTTPS rather than opened directly as `file://` URLs.

### Option 1: Root Launcher Script (Recommended)
From the project root:
```bash
./run.sh
```
This automatically detects available tools (`python3`, `npx serve`, or `python`) and launches the game on **`http://localhost:3000`**.

### Option 2: Python 3 Built-in HTTP Server
```bash
python3 -m http.server -d html 3000
```
Open [http://localhost:3000](http://localhost:3000) in any modern browser.

### Option 3: Node.js `serve` / `npx`
```bash
npx serve html -l 3000
```

> **If you serve `html/` directly without `run.sh`**, first run
> `node tools/write-build-id.mjs` so the per-deployment cache flush has a build
> id to compare against.

---

## ♻️ Cache & Build Versioning

Every rebuild gets a generated `build-id.json` (see `tools/write-build-id.mjs`).
On load, `boot.js` compares the deployed id with the id the browser last ran; on
a mismatch it flushes `localStorage`, `sessionStorage`, IndexedDB, CacheStorage,
and stale service workers, then clean-reloads once into the new build. A
network-first service worker keeps nested ES module imports from being pinned to
a stale HTTP cache. Full details: [`docs/build-versioning.md`](../docs/build-versioning.md).

---

## 🧪 Running Automated Tests

Lokarta features a comprehensive test suite using Node.js's native test runner (`node:test` and `node:assert/strict`).

Run all test suites with:
```bash
node --test html/tests/engine.test.mjs html/tests/audio.test.mjs html/tests/submodules.test.mjs html/tests/app-modules.test.mjs html/tests/data-catalogs.test.mjs html/tests/golden-sets.test.mjs
```

### Verified Test Suites (104 Tests / 14 Suites / 0 Fail):
1. **Floor Generator (ascent levels):** Deterministic Mulberry32 seed generation, 40×40 boundary constraints, spawn at `(2,2)`, exit stairs at `(35,35)`, full BFS room/corridor connectivity, tier-based monster scaling, catalog-driven encounter density parameters (`dungeons.json`, `encounters.json`), and final guardian (The Spire Warden) boss stats (600 HP, 20 ATK, 6 DEF).
2. **GridMap & Tile Bounds:** Walkability, walls, stairs, doors, coordinate boundaries, ground item stack management, and $O(1)$ `CODE_TO_TILE_TYPE` lookup.
3. **LightingSystem & FOV:** Dynamic light radii (Base 10, Torch +2, degrading Light Spell +3/+2/+1), spatial circle lighting without wall occlusion, and light-triggered monster aggro.
4. **ProgressionSystem & Leveling:** XP formulas (`level * 100`), monster kill XP, 4-vocation stat growth (Magician, Archer, Fighter, Paladin with `eyeColor` and `regenResource` from `vocations.json`), skill boosts, and Level 20 cap.
5. **CombatSystem & Abilities:** Catalog-driven ability attributes (`abilities.json`), Wand Spark, Light Spell, piercing Energy Beam, Bow Shot (with arrow depletion), Power Shot, Holy Strike, Healing Prayer, vocation affinity checks (`vocationAffinity`), and monster loot tables (`monsters.json`).
6. **InventorySystem & Stacking:** 10-slot Action Bar, 6-slot Backpack limit, 4-slot Paperdoll equipment mechanics (main_hand, off_hand, armor, relic), 9-item stack limit for Potions/Torches, and 99-item limit for Arrows (`items.json`).
7. **GameClient & Worker Protocol:** Asynchronous command serialization, request/response lifecycle, timeout protection, and error propagation.
8. **JSON Data Catalogs:** Schema validation and completeness tests across all 11 JSON catalogs (`abilities.json`, `biomes.json`, `cards.json`, `dungeons.json`, `encounters.json`, `items.json`, `keybindings.json`, `monsters.json`, `sounds.json`, `tile_themes.json`, `vocations.json`).

---

## 🏛️ Architecture Overview

| Module / Directory | Location | Purpose |
| :--- | :--- | :--- |
| **App / Renderers** | `html/app/` | UI Controllers (`app-controller.js`, `hud-manager.js`, `input-controller.js`, `modal-manager.js`), Canvas tile/sprite rendering pipeline (`sprite-renderer.js` with $O(1)$ lookup maps), 10 Hz fixed tick simulation loop, 60 FPS interpolated animation. |
| **Audio Subsystem** | `html/audio/` & `html/data/sounds.json` | Web Audio API procedural synthesizer (`audio-system.js`) generating dynamic retro sound effects on the fly driven by `sounds.json`. |
| **Data Catalogs** | `html/data/` | Data-driven JSON catalogs (11 catalogs: `abilities`, `biomes`, `cards`, `dungeons`, `encounters`, `items`, `keybindings`, `monsters`, `sounds`, `tile_themes`, `vocations`) and barrel export (`catalog.js`). |
| **Core Engine** | `html/engine/` | Subsystems (`grid-map.js`, `lighting-system.js`, `combat-system.js`, `entity-ai.js`, `inventory-system.js`, `progression-system.js`, `fate-grant-system.js`, `gesture-engine.js`). |
| **Services** | `html/services/` | Procedural 40×40 tower floor generator (`floor-generator.js`) and IndexedDB persistence layer (`storage.js`). |
| **Styles** | `html/styles/` | Modular stylesheets (`base.css`, `hud.css`, `modals.css`, `index.css`). |
| **Worker RPC** | `html/worker/` | Typed Web Worker dispatcher (`game-worker.js`) and Promise-wrapped RPC client bridge (`game-client.js`). |
| **UI Container** | `html/index.html` | RPG layout container, 4-slot paperdoll UI, 6-slot backpack, 10-slot action bar, vitals meters, and scrolling combat log. |

---

## 🎮 Controls & Gameplay

- **Movement:** `W` / `A` / `S` / `D` or `Arrow Keys` (or on-screen D-Pad)
- **Select Vocation:** Magician (ranged magic & illumination), Archer (high single-target damage & ammo management), Fighter (melee powerhouse & high HP), or Paladin (holy melee/magic hybrid & healing)
- **Abilities:**
  - **Key `1`:** Primary Skill (*Wand Spark* / *Bow Shot*)
  - **Key `2`:** Utility Skill (*Light Spell* / *Power Shot*)
  - **Key `3`:** Ultimate Skill (*Energy Beam* - piercing line damage)
- **Items & Interaction:**
  - **Key `E` or `Space`:** Pick up item from ground tile into backpack
  - **Backpack Clicks:** Click any backpack slot to use consumable or equip gear
  - **Paperdoll Clicks:** Click equipped item to unequip back into backpack
  - **Stairs:** Step onto the radiant stairs portal at `(35,35)` to advance to the next floor
