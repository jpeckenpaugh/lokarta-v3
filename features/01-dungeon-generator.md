# Feature Specification: 01 — Procedural Dungeon Generator

## 1. Overview & Purpose

The **Procedural Dungeon Generator** produces 20 deterministic, $40 \times 40$ tile-grid dungeon floors for *Lokarta: Come Into The Light*. It is responsible for generating floor maps, carving room layouts and connecting corridors, placing stairs and doors, populating monsters and loot chests, and mathematically verifying player-to-exit path connectivity using Breadth-First Search (BFS).

---

## 2. Mapped Codebase Modules

- [html/services/floor-generator.js](file:///Users/jarad/git/lokarta-v3/html/services/floor-generator.js) — Core floor generation module (`generateFloor`, `createPRNG`, `getBiomeForFloor`, `verifyPathBFS`, `BIOMES`, `TILE_TYPES`).
- [html/data/dungeons.json](file:///Users/jarad/git/lokarta-v3/html/data/dungeons.json) — Dungeon biome definitions, floor ranges, light colors, and floor name overrides.
- [html/data/encounters.json](file:///Users/jarad/git/lokarta-v3/html/data/encounters.json) — Catalog-driven monster encounter density scaling parameters (`baseMonstersPerRoom`, `extraMonsterFloorThreshold`, `bonusMonsterChanceFloor`, `bonusMonsterChance`).
- [html/worker/game-worker.js](file:///Users/jarad/git/lokarta-v3/html/worker/game-worker.js) — Off-thread generation & floor caching integration.

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 Biome Progression System
- **4 Biome Domains across 20 Floors:**
  1. *Subterranean Crypt* (Floors 1–5): Light color tint `#ff8800`.
  2. *Catacombs of Whispers* (Floors 6–10): Light color tint `#00d4ff`.
  3. *Shadow Vaults* (Floors 11–15): Light color tint `#a855f7`.
  4. *Abyssal Sanctum* (Floors 16–20): Light color tint `#ef4444`.

### 3.2 PRNG & Grid Layout Generation
- **Mulberry32 PRNG:** Seeded pseudo-random number generator ensuring deterministic and reproducible floor layouts based on floor seed strings/numbers.
- **Fixed $40 \times 40$ Grid Matrix:** Boundary tiles strictly forced to solid Wall (`1`).
- **Room Carving & Corridor Connections:** Carves rectangular rooms connected by L-shaped corridors.
- **Spawn & Exit Guarantees:** Fixed player spawn at coordinates $(2, 2)$ and stairs down at $(35, 35)$. Doors placed at room thresholds.

### 3.3 BFS Path Connectivity Verification
- **Reachability Guarantee:** Runs a Breadth-First Search (BFS) pathfinding algorithm from spawn $(2, 2)$ to exit $(35, 35)$ over traversable tiles (Floor, Door, Stairs).
- **Regeneration Fallback:** Re-seeds and regenerates the floor if no valid path exists between spawn and exit.

### 3.4 Entity & Loot Placement
- **Monster Population:** Biome-specific monster scaling based on floor depth (Rats, Bats, Skeleton Crawlers $\rightarrow$ Skeleton Archers, Goblins $\rightarrow$ Orcs, Dark Mages $\rightarrow$ Abyssal Knights, Demons, and Floor 20 Abyssal Overlord Boss).
- **Chest & Item Spawns:** Places chests, health/mana potions, torches, and arrows in carved rooms with floor-scaled drop tables.

---

## 4. Inputs, Outputs & State Data

- **Inputs:** `floorNumber` (integer $1..20$), optional `seed` string/number.
- **Outputs:** Floor state object containing:
  - `floor_number`: Current floor depth.
  - `biome`: Biome metadata (`name`, `lightColor`).
  - `grid`: 2D array ($40 \times 40$) of tile types (`FLOOR=0`, `WALL=1`, `STAIRS=2`, `DOOR=3`).
  - `spawn_coords`: `{ x: 2, y: 2 }`.
  - `stairs_coords`: `{ x: 35, y: 35 }`.
  - `monsters`: Array of monster entity instances with initial stats and grid positions.
  - `chests` / `items`: Array of interactive chest objects and ground items.

---

## 5. Operational Constraints & Boundaries

- Zero dependency on main-thread UI components; pure functional generator safe for execution inside Web Workers.
- Grid boundaries ($x=0, x=39, y=0, y=39$) must remain uncarved wall tiles to prevent out-of-bounds entity movement. Exterior walls are exactly 1 tile thick (the first interior row/col is open floor).
- Internal room walls are exactly 1 tile thick: template rooms are laid out so adjacent rooms share a single wall band (see `dungeons.json`), maximizing walkable interior space.
