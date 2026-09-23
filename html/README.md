# Lokarta: Come Into The Light

**Lokarta: Come Into The Light** is a zero-backend, client-side, offline-capable 2D roguelike RPG. It runs entirely inside standard modern web browsers using native Web standards: **Web Workers**, **IndexedDB**, **vanilla ES Modules**, HTML5 Canvas rendering, and **procedural Web Audio API**.

---

## 🌟 Key Highlights

- **Web-Native & Zero-Backend:** Fully self-contained static application with no server runtime or external database dependencies required. Can be hosted on GitHub Pages, Cloudflare Pages, S3, or any static web server.
- **Dedicated Web Worker:** Runs procedural floor generation and state synchronization in a background worker thread (`game-worker.js`) communicating over a typed RPC protocol (`game-client.js`).
- **IndexedDB Persistence:** Complete character progression, equipped gear (4 paperdoll slots), 10 action slots, 6-slot backpack state, settings, and dungeon floors 1–20 persist locally across browser reloads.
- **Procedural 20-Floor Dungeon:** Deterministic Mulberry32 PRNG generator (`floor-generator.js`) across 4 biomes (Subterranean Crypt, Catacombs of Whispers, Shadow Vaults, Abyssal Sanctum) culminating in the Floor 20 Abyssal Overlord boss fight.
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

---

## 🧪 Running Automated Tests

Lokarta features a comprehensive test suite using Node.js's native test runner (`node:test` and `node:assert/strict`).

Run the test suite with:
```bash
node --test html/tests/engine.test.mjs
```

### Verified Test Suites (46/46 Tests Passing):
1. **Floor Generator (1-20):** Deterministic Mulberry32 seed generation, 40×40 boundary constraints, spawn at `(2,2)`, exit stairs at `(35,35)`, full BFS room/corridor connectivity, depth-based monster scaling, and Floor 20 Abyssal Overlord boss stats (600 HP, 20 ATK, 6 DEF).
2. **GridMap & Tile Bounds:** Walkability, walls, stairs, doors, coordinate boundaries, and ground item stack management.
3. **LightingSystem & LOS:** Dynamic light radii (Base 3, Torch 7, Light Spell 6), Bresenham raycasting, wall occlusion, and light-triggered monster aggro.
4. **ProgressionSystem & Leveling:** XP formulas (`level * 100`), monster kill XP, 4-vocation stat growth (Magician, Archer, Fighter, Paladin), skill boosts, and Level 20 cap.
5. **CombatSystem & Abilities:** Wand Spark, Light Spell, piercing Energy Beam, Bow Shot (with arrow depletion), Power Shot, Holy Strike, Healing Prayer, and monster loot tables.
6. **InventorySystem & Stacking:** 10-slot Action Bar, 6-slot Backpack limit, 4-slot Paperdoll equipment mechanics (main_hand, off_hand, armor, relic), 9-item stack limit for Potions/Torches, and 99-item limit for Arrows.
7. **GameClient & Worker Protocol:** Asynchronous command serialization, request/response lifecycle, timeout protection, and error propagation.

---

## 🏛️ Architecture Overview

| Module | Location | Purpose |
| :--- | :--- | :--- |
| **Floor Generator** | `html/floor-generator.js` | Procedural 40×40 dungeon floor generation, room carving, corridors, door placement, monster & loot spawning. |
| **Storage Manager** | `html/storage.js` | Local persistence layer using IndexedDB Object Stores (`characters`, `dungeon_floors`, `profile`, `game_settings`). |
| **Game Worker** | `html/game-worker.js` | Dedicated background thread handling authoritative state persistence, floor caching, and asynchronous operations off the UI thread. |
| **Game Client** | `html/game-client.js` | Typed asynchronous RPC client bridging main thread dispatches to the Web Worker via Promise-wrapped `postMessage()`. |
| **Core Engine** | `html/engine.js` | Core game simulation modules (`GridMap`, `LightingSystem`, `CombatSystem`, `EntityAI`, `InventorySystem`, `ProgressionSystem`). |
| **Audio Synthesizer** | `html/audio.js` | Procedural Web Audio synthesizer generating dynamic retro sound effects on the fly with zero external audio assets. |
| **App / Renderer** | `html/app.js` | Canvas tile/sprite rendering pipeline, 10 Hz fixed tick simulation loop, 60 FPS interpolated animation, HUD panel controller, and keyboard input binding. |
| **UI Container** | `html/index.html` & `html/styles.css` | RPG layout container, 4-slot paperdoll UI, 6-slot backpack, 10-slot action bar, vitals meters, and scrolling combat log. |

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
