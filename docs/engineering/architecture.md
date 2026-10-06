# Lokarta: Technical Architecture Specification

Authoritative system architecture and module boundaries for *Lokarta: Come Into The Light*.

---

## 1. Threading & Dual-Loop Architecture

Lokarta operates as a zero-backend, multi-threaded client application running natively in modern web browsers:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Main UI Thread                                     │
│                                                                                 │
│   ┌──────────────────┐    ┌───────────────────────────┐   ┌─────────────────┐   │
│   │   DOM & HUD UI   │    │  HTML5 Canvas 2D Renderer │   │ Web Audio API   │   │
│   │   (HTML/CSS/JS)  │    │      (60 FPS Loop)        │   │  (Synthesizer)  │   │
│   └────────┬─────────┘    └─────────────┬─────────────┘   └────────┬────────┘   │
│            │                            │                          │            │
│            └─────────────────────┐      │      ┌───────────────────┘            │
│                                  ▼      ▼      ▼                                │
│                            ┌──────────────────────────┐                         │
│                            │   Modular UI Controllers │                         │
│                            │    (10 Hz Engine Ticker) │                         │
│                            └────────────┬─────────────┘                         │
│                                         │ (GameClient RPC)                      │
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
│  │ (engine/)     │              │ (services/)   │           │ (storage.js)  │   │
│  └───────────────┘              └───────────────┘           └───────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

* **Main UI Thread:** Owns user input capture, 60 FPS Canvas rendering, DOM HUD/modals, procedural Web Audio SFX synthesis, and the 10 Hz simulation ticker.
* **Worker Thread (`game-worker.js`):** Runs off-thread procedural floor generation (Mulberry32 PRNG with BFS validation), game state mutations, and IndexedDB I/O via a Promise-based RPC client (`game-client.js`).

---

## 2. Directory Structure & Subsystems

All application code is located in `html/` and structured as vanilla ES Modules:

| Directory | Layer | Key Submodules & Responsibilities |
| :--- | :--- | :--- |
| [`html/app/`](../html/app/) | UI Controllers | `app-controller.js` (orchestrator), `save-controller.js` (slots/flow), `combat-controller.js`, `inventory-controller.js`, `floor-controller.js`, `shop-controller.js`, `canvas-renderer.js`, `sprite-renderer.js`, `hud-manager.js`, `modal-manager.js`, `input-controller.js`, `ability-bar.js`. |
| [`html/engine/`](../html/engine/) | Core Simulation | `config.js`, `grid-map.js`, `lighting-system.js`, `progression-system.js`, `combat-system.js`, `inventory-system.js`, `entity-ai.js`, `fate-grant-system.js`, `economy-system.js`, `item-progression.js`, `item-stats.js`, `gesture-engine.js`. |
| [`html/services/`](../html/services/) | Services | `floor-generator.js` (procedural tower gen), `storage.js` (IndexedDB layer), `save-slots.js` (multi-slot manager & migration), `build-version.js` (cache-flush guard). |
| [`html/worker/`](../html/worker/) | Worker RPC | `game-worker.js` (background dispatcher) and `game-client.js` (main-thread Promise wrapper). |
| [`html/audio/`](../html/audio/) | Audio Engine | `audio-system.js` (Web Audio procedural synthesizer driven by `sounds.json`). |
| [`html/data/`](../html/data/) | Data Catalogs | 16 decoupled JSON catalogs (`cards`, `monsters`, `items`, `vocations`, `sounds`, `abilities`, `biomes`, `encounters`, `dungeons`, `tower_levels`, `doors`, `chests`, `tile_themes`, `keybindings`, `ui`, `economy`). |
| [`html/styles/`](../html/styles/) | Presentation | Modular CSS sheets (`base.css`, `hud.css`, `modals.css`). |
| [`html/assets/`](../html/assets/) | Assets | Authored JSON sprite frames (`sprites/`), OpenMoji SVGs, and brand icons. |

---

## 3. Storage & Save Slots (IndexedDB)

The local persistence layer uses IndexedDB (`lokarta_browser_db`) managed by `storage.js` and `save-slots.js`:

* **Stores:**
  * `save_slots`: Slot metadata records (up to 5 save slots).
  * `characters`: Full character records (vocation, vitals, stats, gold, inventory, equipment paperdoll, location).
  * `slot_floors`: Cached floor matrix and entity states keyed by `[slotIndex, floorNumber]`.
  * `game_settings`: Persisted user options and schema migration guard flags (`migration_slot_v2`, `migration_tower_v3`).
* **Migration & Sanitization:** Automatically upgrades legacy single-saves into Slot 1 and clamps floor numbers to the 5-tier tower.
