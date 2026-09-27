# Lokarta: Come Into The Light — Technical Architecture Specification

## 1. Architecture Overview & System Design

**Lokarta: Come Into The Light** is a zero-backend, client-side 2D roguelike RPG operating natively in standard modern web browsers. The system utilizes a multi-threaded architecture separating the user interface, rendering pipeline, and audio synthesis from background state management, floor generation, and persistence.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Main UI Thread                                     │
│                                                                                 │
│   ┌──────────────────┐    ┌───────────────────────────┐   ┌─────────────────┐   │
│   │   DOM & HUD UI   │    │  HTML5 Canvas 2D Renderer │   │ Web Audio API   │   │
│   │   (HTML/CSS/JS)  │    │   (60 FPS Interpolation)  │   │  (Synthesizer)  │   │
│   └────────┬─────────┘    └─────────────┬─────────────┘   └────────┬────────┘   │
│            │                            │                          │            │
│            └─────────────────────┐      │      ┌───────────────────┘            │
│                                  ▼      ▼      ▼                                │
│                            ┌──────────────────────────┐                         │
│                            │    App Controller &      │                         │
│                            │   10 Hz Engine Ticker    │                         │
│                            └────────────┬─────────────┘                         │
│                                         │                                       │
│                                  (GameClient RPC)                               │
└─────────────────────────────────────────┼───────────────────────────────────────┘
                                          │ Worker postMessage (Async Promises)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Dedicated Web Worker Thread                             │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         game-worker.js Dispatcher                       │   │
│   └──────┬──────────────────────────────┬───────────────────────────┬───────┘   │
│          │                              │                           │           │
│          ▼                              ▼                           ▼           │
│  ┌───────────────┐              ┌───────────────┐           ┌───────────────┐   │
│  │ Engine State  │              │ Procedural    │           │ IndexedDB     │   │
│  │ Simulation    │              │ Floor Gen     │           │ Persistence   │   │
│  │ (engine.js)   │              │ (floor-gen)   │           │ (storage.js)  │   │
│  └───────────────┘              └───────────────┘           └───────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles:
1. **Zero-Backend / Static Asset Hosting:** The application requires no remote application server or backend API. All client logic runs in the browser. Static assets are served over standard HTTP (`run.sh`).
2. **Native ES Modules (ESM):** All JavaScript components are structured as native ES modules using standard `import`/`export` syntax, avoiding bundlers or transpilation steps.
3. **Off-Thread State & Generation:** Heavy computational workloads (procedural dungeon generation, BFS connectivity checks, state mutations, and IndexedDB I/O) execute off the main thread in a dedicated Web Worker (`game-worker.js`).
4. **Decoupled Simulation & Rendering Loops:** Engine simulation logic operates on a fixed 10 Hz tick loop (100 ms intervals), while the visual Canvas renderer interpolates tile coordinates smoothly at 60 FPS.

---

## 2. Directory Structure & Module Boundaries

The project files reside under `html/` and follow strict module boundaries:

```
html/
├── index.html            # DOM layout container, HUD overlays, canvas element, and CSS links
├── app.js                # Central bootstrap & loading entry point
├── app/                  # UI & Rendering submodules (app-controller, canvas-renderer, sprite-renderer, etc.)
├── audio/                # Web Audio synthesizer subsystem (audio-system.js)
├── data/                 # 12 JSON data catalogs (cards, monsters, items, vocations, sounds, abilities, biomes, encounters, dungeons, tile_themes, keybindings, ui)
├── engine/               # Core game engine submodules (config, grid-map, lighting, combat, AI, inventory, etc.)
├── services/             # Floor generator & IndexedDB persistence layer
├── styles/               # Modular CSS stylesheets (base.css, hud.css, modals.css, index.css)
├── worker/               # Web Worker dispatcher (game-worker.js) & RPC client (game-client.js)
└── tests/                # Automated unit test suites (engine, audio, submodules, app-modules, data-catalogs)
```

### Module Boundary Dependency Graph

```
                   ┌───────────────┐
                   │  index.html   │
                   └───────┬───────┘
                           │ loads app.js (bootstrap)
                           ▼
                      ┌─────────┐
                      │ app.js  │
                      └──┬──┬───┘
         ┌───────────────┘  │  └───────────────────┐
         ▼                  ▼                      ▼
  ┌─────────────┐    ┌─────────────┐        ┌─────────────┐
  │ html/audio/ │    │ html/engine/│        │html/worker/ │
  └──────┬──────┘    └──────┬──────┘        │(game-client)│
         │                  │               └──────┬──────┘
         ▼                  ▼                      │ Worker RPC
  ┌─────────────┐    ┌─────────────┐               ▼
  │ html/data/  │◀───│html/services│        ┌──────────────┐
  │  catalogs   │    └─────────────┘        │html/worker/  │
  └─────────────┘                           │(game-worker) │
                                            └──────┬───────┘
                                                   │ imports
                                         ┌─────────┴─────────┐
                                         ▼                   ▼
                                  ┌─────────────┐     ┌─────────────┐
                                  │ html/engine/│     │html/services│
                                  └─────────────┘     └─────────────┘
```

---

## 3. Core Engine Subsystems (`html/engine.js`)

`engine.js` exports configuration constants, default archetypes, and eight decoupled core subsystems:

### 3.1 Subsystem Registry

| Subsystem Class | Responsibility | Key Methods & Data Contracts |
| :--- | :--- | :--- |
| `GridMap` | 2D tile map matrix management, walkability, opacity checks, entity placement. | `loadFromMatrix(matrix)`, `isWalkable(x, y)`, `isOpaque(x, y)`, `setTile(x, y, type)`, `addItem(x, y, item)`, `removeItem(x, y, itemId)` |
| `LightingSystem` | Spatial circular radius field-of-view (FOV) & fog of war calculation. | `computePlayerRadius(player)`, `updateLighting(gridMap, player, ambientLights, monsters)`, `castLightCircle(gridMap, originX, originY, radius)` |
| `ProgressionSystem` | Character level scaling, XP increments, vitals growth across 4 vocations. | `createPlayer(vocation)`, `addXp(player, amount)`, `getVitalsForLevel(vocation, level)`, `calculateNextXp(level)` |
| `CombatSystem` | Turn-based attack resolution, ability execution (no class multiplier), and vocation-locked equipment enforcement. | `executeAbility(player, abilityId, targetX, targetY, grid, monsters)`, `calculateDamage(attacker, weapon/ability)`, `updateCooldowns(entity, deltaSec)` |
| `EntityAI` | Monster turn cadence, aggro range checks, pathfinding toward player via `AI_HANDLERS` map. | `processMonsterTurns(monsters, player, grid, deltaSec)`, `findPath(monster, targetX, targetY, grid)` |
| `InventorySystem` | Action bar, backpack, paperdoll equipment management, item stacking. | `addItemToInventory(player, item)`, `equipItem(player, item, slot)`, `unequipItem(player, slot)`, `useItem(player, itemSlot)` |
| `FateGrantSystem` | 5-card draft reward generation on level up. | `generateDraftCards(player, floorNumber)`, `applyCardReward(player, card)` |
| `GestureEngine` | Touch gesture & keyboard input mapping via `KEYBINDINGS_CATALOG`. | `handleKeyDown(event)`, `handleTouchStart(e)`, `handleTouchEnd(e)`, `onGesture(callback)` |

### 3.2 Configuration Parameters (`CONFIG`)
- **Map Dimensions:** Grid size = 64px, Width = 40 tiles, Height = 40 tiles.
- **Simulation Timing:** Fixed tick interval = 100 ms (10 Hz).
- **Inventory Layout:** 10 Action Bar slots (0–9), 6 Backpack slots, 4 Paperdoll slots (`main_hand`, `off_hand`, `armor`, `relic`).
- **Lighting Radii:** Base FOV = 10 tiles, Torch = +2 radius (12 tiles), Light Spell = +3/+2/+1 degrading radius (30s duration), Ambient = 4 tiles.
- **Vocation-Locked Equipment:** Every equippable item carries a `vocationAffinity` (`"magician"`, `"archer"`, `"fighter"`, `"paladin"`, `"neutral"`, or an array like `["fighter","paladin"]`) in `items.json`; only the matching vocation can equip/use it. Damage/healing scales solely from `skillBoosts.damageMultiplier` — there is **no** class multiplier.

### 3.3 Character Archetypes & Stat Growth
- **Magician:** Base HP 60 (+8/level), Base MP 150 (+16/level). Native: Arcane Wands, Wand Spark, Light, Energy Beam.
- **Archer:** Base HP 90 (+14/level), Base MP 80 (+8/level). Native: Bows/Crossbows, Bow Shot, Power Shot, Arrows.
- **Fighter:** Base HP 140 (+18/level), Base MP 30 (+4/level). Native: Heavy Swords, Shields, Heavy Plate Armor, Slash, Cleave.
- **Paladin:** Base HP 120 (+15/level), Base MP 90 (+10/level). Native: Warhammers, Relics, Holy Strike, Healing Prayer.

### 3.4 Data-Driven JSON Catalogs (`html/data/`)
The game data systems are fully decoupled from codebase logic and driven by 12 JSON data files in `html/data/`:
- **`cards.json`**: 24 Fate Grant Draft cards with rarity, stat bonuses, vocation affinities, and item payloads.
- **`monsters.json`**: Bestiary catalog for monster types defining base HP/ATK/DEF, cadences, AI types (`chase`, `standoff`), `svgCode`, and `lootTable` drop rules.
- **`items.json`**: Attributes, icons, `svgCode`, `vocationAffinity`, `grantedAmmo`, and stack limits for all weapons, armor, relics, consumables, and spells.
- **`vocations.json`**: Starting HP/MP, per-level growth, damage scaling steps, `eyeColor`, and `regenResource` for all 4 playable vocations.
- **`sounds.json`**: 19 procedural sound definitions powering `AudioSystem`.
- **`abilities.json`**: Cooldowns, range, MP costs, and damage parameters for spell skills.
- **`biomes.json`**: Floor depth ranges and lighting colors for all 4 biomes.
- **`encounters.json`**: Floor tier spawn groups, boss specifications, and monster density parameters.
- **`dungeons.json`**: Macro 40x40 room layouts, doorway anchors, milestone bonuses, and floor name overrides.
- **`tile_themes.json`**: Wall fills, highlights, floor colors, door fills, and stairs colors.
- **`keybindings.json`**: Movement key maps and hotkey slot assignments.
- **`index.js`**: Export barrel exposing all 12 JSON catalogs.
- **Render & AI Dispatchers**: Uses $O(1)$ lookup tables (`MONSTER_RENDERERS`, `ITEM_RENDERERS`, `WEAPON_RENDERERS`, `TILE_RENDERERS`, `AI_HANDLERS`, `CODE_TO_TILE_TYPE`, `EMOJI_TO_SVG_MAP`).

---

## 4. Web Worker RPC Protocol (`html/game-client.js` & `html/game-worker.js`)

The application offloads storage operations and floor generation to a dedicated Web Worker using a typed asynchronous RPC protocol.

### 4.1 Message Transport Protocol

All messages passed between `GameClient` (main thread) and `game-worker.js` (worker thread) use structured JSON payloads over native `postMessage`.

#### Request Message Structure (Client -> Worker)
```typescript
interface WorkerRPCRequest {
  id: string;        // Unique request identifier e.g., "req_1_1695420000000_a1b2c3d"
  command: string;   // RPC command identifier
  payload: object;   // Command-specific parameters
}
```

#### Response Message Structure (Worker -> Client)
```typescript
interface WorkerRPCResponse {
  id: string;        // Matching request identifier
  ok: boolean;       // Success flag
  data?: any;        // Command result payload (present if ok === true)
  error?: string;    // Error message string (present if ok === false)
}
```

### 4.2 RPC Command Dispatch Table

| Command | Payload | Return Data | Purpose |
| :--- | :--- | :--- | :--- |
| `bootstrap` | `{}` | `{ player, profile, activeFloor }` | Initializes IndexedDB, fetches user profile settings, existing character, and active floor. |
| `newGame` | `{ vocation }` | `{ player, floor }` | Creates new Level 1 character entity, generates Floor 1, and persists both. |
| `saveCharacter` | `{ player }` | `{ success: true, savedAt }` | Commits current player character state object to IndexedDB `characters` store. |
| `getFloor` | `{ floorNumber, forceRegenerate }` | `FloorObject` | Fetches floor from `dungeon_floors` store or generates it using Mulberry32 PRNG. |
| `advanceFloor` | `{ player, nextFloorNumber }` | `{ player, floor }` | Updates player floor level & coordinates, loads/generates target floor, saves state. |
| `setSoundEnabled` | `{ soundEnabled }` | `{ soundEnabled }` | Updates user sound preference in `profile` store. |
| `resetProgress` | `{}` | `{ success: true }` | Clears `characters` and `dungeon_floors` stores for a fresh restart. |

### 4.3 Promise Management & Timeouts (`GameClient`)
`GameClient` maintains a `Map<string, PendingRequest>` tracking active requests:
- Request IDs are generated using a counter, Unix timestamp, and pseudo-random string.
- Each request registers a timeout timer (default: 10,000 ms).
- If the worker fails to respond within the timeout window, the promise rejects with a timeout error and the entry is removed from the map.
- If an uncaught error occurs in the worker, `_handleError()` rejects all active promises in `pending` and clears the map.

---

## 5. IndexedDB Persistence Schema (`html/storage.js`)

IndexedDB storage is managed by `storage.js` under the database name `lokarta_browser_db` (Version 1).

### 5.1 Object Store Specification

```
lokarta_browser_db (v1)
├── profile (keyPath: 'id')
├── characters (keyPath: 'id')
├── dungeon_floors (keyPath: 'floor_number')
└── game_settings (keyPath: 'key')
```

#### Stores Details:
1. **`profile` Store (keyPath: `'id'`)**
   - Record Key: `'default_profile'`
   - Schema: `{ id: string, soundEnabled: boolean, volume: number, createdAt: string, updatedAt: string }`
2. **`characters` Store (keyPath: `'id'`)**
   - Record Key: Character UUID string (e.g., `'player_magician_1695420000000'`)
   - Schema: Player entity object (vitals, stats, location, action_bar, paperdoll, backpack, skillBoosts, cooldowns).
3. **`dungeon_floors` Store (keyPath: `'floor_number'`)**
   - Record Key: Integer floor number (1–20)
   - Schema: `{ floor_number: number, tiles: number[][], spawn_coords: {x, y}, stairs_down_coords: {x, y}, monsters: Array, items: Array, ambient_lights: Array }`
4. **`game_settings` Store (keyPath: `'key'`)**
   - Key-value store for arbitrary application settings.

### 5.2 Transaction & Error Handling Mechanics
- `openStorage()` initializes the connection lazily and caches the `IDBDatabase` reference.
- `transaction(storeNames, mode, callback)` wraps IndexedDB transactions in Promises, ensuring automatic cleanup and proper commit/abort handling.
- Atomic helper methods: `read(store, key)`, `put(store, value, key?)`, `getAll(store)`, `deleteRecord(store, key)`, `clearStore(store)`.

---

## 6. Canvas Rendering & Simulation Loop (`html/app.js`)

The user interface uses a dual-rate architecture: a 10 Hz fixed simulation step for game state updates, and a 60 FPS requestAnimationFrame rendering loop for visual interpolation.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Fixed 10 Hz Simulation Loop                           │
│   (Every 100 ms)                                                                │
│   1. Read input gesture queue                                                   │
│   2. Process player action / movement                                           │
│   3. Execute CombatSystem & ability cooldown ticks                              │
│   4. Execute EntityAI (monster movements & attacks)                             │
│   5. Update LightingSystem LOS mask                                             │
│   6. Trigger auto-save via GameClient if state changed                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Smooth 60 FPS Canvas Render Loop                        │
│   (requestAnimationFrame)                                                       │
│   1. Calculate delta time & render interpolation fraction (alpha)               │
│   2. Lerp entity coordinates: renderX = prevX + (targetX - prevX) * alpha       │
│   3. Center camera offset on interpolated player position                       │
│   4. Draw tilemap layer (walls, floors, doors, stairs)                          │
│   5. Draw items and ambient light overlays                                      │
│   6. Draw monsters and player sprite with facing indicators                     │
│   7. Composite LOS shadow layer (unexplored fog vs dark shroud)                 │
│   8. Render combat floating text and particle effects                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Visual Interpolation (Lerp)
To prevent jerky tile jumps during 10 Hz ticks, `app.js` maintains previous (`prevX`, `prevY`) and current (`x`, `y`) tile coordinates for the player and monsters. The rendered position is computed per frame:

$$\text{renderX} = (\text{prevX} + (\text{x} - \text{prevX}) \cdot \alpha) \cdot \text{GRID\_SIZE}$$
$$\text{renderY} = (\text{prevY} + (\text{y} - \text{prevY}) \cdot \alpha) \cdot \text{GRID\_SIZE}$$

where $\alpha = \min(1.0, \frac{t - t_{\text{last\_tick}}}{\text{TICK\_INTERVAL\_MS}})$.

---

## 7. Web Audio Synthesis Architecture (`html/audio.js`)

Sound effects are synthesized procedurally in real-time using the Web Audio API without external audio files.

### 7.1 Web Audio Node Graph Topology

```
┌─────────────────┐      ┌────────────────────────┐
│ OscillatorNode  │───┐  │   BiquadFilterNode     │
│ (sine/saw/tri)  │   │  │ (lowpass/bandpass/etc) │
└─────────────────┘   │  └───────────┬────────────┘
                      ▼              │
               ┌──────────────┐      │
               │   GainNode   │◄─────┘
               │  (Envelope)  │
               └──────┬───────┘
                      │
                      ▼
               ┌──────────────┐
               │  masterGain  │ (Mute & volume control)
               └──────┬───────┘
                      │
                      ▼
               ┌──────────────┐
               │ AudioContext │
               │ .destination │
               └──────────────┘
```

### 7.2 Sound Effect Synthesis Catalog

| Sound Effect | Waveforms & Frequency Modulation | Envelope & Duration |
| :--- | :--- | :--- |
| `playFootstep()` | Triangle wave (90 Hz $\to$ 30 Hz) + Lowpass Filter (400 Hz). | Exponential decay over 0.05s. |
| `playWandSpark()` | Sawtooth wave (800 Hz $\to$ 150 Hz). | Exponential decay over 0.12s. |
| `playLightSpell()` | Arpeggiated Sine chord (C5, E5, G5, C6: 523–1046 Hz). | 4-tone stagger, 0.6s tail. |
| `playEnergyBeam()` | Dual Sawtooth waves + Bandpass sweep (300 Hz $\to$ 2400 Hz). | Sustain 0.3s, decay over 0.4s. |
| `playBowShot()` | White noise burst + Triangle pitch bend (600 Hz $\to$ 100 Hz). | Rapid decay over 0.08s. |
| `playPowerShot()` | Low sine thump (120 Hz) + High noise snap (1200 Hz). | Impact decay over 0.25s. |
| `playHolyStrike()` | Sine fundamental (440 Hz) + Square octave harmonic (880 Hz). | Bright chime over 0.35s. |
| `playHeal()` | Ascending Sine sweep (220 Hz $\to$ 880 Hz). | Smooth ramp over 0.5s. |
| `playMonsterHit()` | Square wave (180 Hz $\to$ 40 Hz) + Distortion filter. | Crunchy decay over 0.15s. |
| `playLevelUp()` | Major triad fanfare (C4, E4, G4, C5). | Celebratory chord over 0.8s. |
| `playPotion()` | Dual Sine bubble oscillators (350 Hz $\leftrightarrow$ 550 Hz). | Two quick pitch pops over 0.18s. |

---

## 8. Architectural Verification & Compliance

This architecture specification accurately documents the ground-truth codebase in `html/`. Compliance has been verified via the native Node.js test suite (`html/tests/engine.test.mjs`), validating:
1. Floor generator determinism, grid boundaries, spawn/stairs placement, and BFS connectivity across floors 1–20.
2. GridMap walkability and tile bounds.
3. Raycasted line-of-sight visibility and torch/spell radii adjustments.
4. Character progression, vocation stat scaling, and vocation-locked equipment enforcement (no class multiplier).
5. Action bar, backpack, and paperdoll inventory mechanics.
6. 5-card draft fate grants on level up.
7. Hotkey and gesture input processing.
8. GameClient worker RPC message lifecycle.

---

## 9. Actor Sprite Pipeline (LIV-10)

Actor art is authored **data**, not procedural primitives. The contract and
per-actor specs live in `docs/art-direction.md`; this section records where the
pieces live.

- **Art data:** `html/assets/sprites/manifest.json` plus one JSON file per actor
  under `vocations/` and `monsters/`. Each file carries `native`, `anchor`,
  a single-char `palette` (`"."` transparent, `"0"` reserved for the outline)
  and 25 frames (27 for the boss) across `idle`/`walk`/`attack`/`hit`/`death`.
- **Barrel:** `html/assets/sprites/index.js` exports `SPRITE_CATALOG` and
  `SPRITE_MANIFEST` via native JSON import attributes (no bundler).
- **Renderer:** `html/app/sprite-renderer.js` adds `SpriteRenderer.drawActor`
  plus the pure `parseFrame` / `applyOutline` / `scalePixels` helpers. A frame
  is rasterised once into a `(id, frame, scale, flip, tint)` canvas cache and
  blitted with `imageSmoothingEnabled = false` at `SCALE = GRID_SIZE / 32`.
  Missing sprite or frame falls back to the original procedural primitives.
- **Animation state:** `html/app/animation-state.js` owns the presentation-only
  `actor.anim` state machine (walk advances on tile step; attack/hit/death are
  timer-driven and priority-locked). It is never persisted or sent over RPC.
- **Layer order:** `html/app/canvas-renderer.js` draws tiles and items under the
  fog, then the light mask, then actors (distance-dimmed), then projectiles,
  particles and floating text — so visible enemies are not swallowed by the
  darkness shroud.
- **Verification:** `html/tests/sprite-assets.test.mjs` (geometry, palette,
  contrast gates, outline idempotency, determinism, distinct cultist
  silhouettes, preview-drift, fallback safety, full render smoke).
- **Preview export (review only):** `tools/render-sprite-preview.mjs` writes
  `docs/art-preview/*.png`; a test re-runs it and byte-compares so committed
  previews cannot drift.
