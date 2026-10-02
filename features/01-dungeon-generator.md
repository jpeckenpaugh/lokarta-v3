# Feature Specification: 01 — Procedural Dungeon Generator

## 1. Overview & Purpose

The **Procedural Tower Floor Generator** produces deterministic, $40 \times 40$ tile-grid tower floors for *Lokarta: Come Into The Light*. It is responsible for generating floor maps, carving room layouts and connecting corridors, placing ascent stairs and doors, populating monsters and loot chests, and mathematically verifying player-to-stairs path connectivity using Breadth-First Search (BFS).

---

## 2. Mapped Codebase Modules

- [html/services/floor-generator.js](file:///Users/jarad/git/lokarta-v3/html/services/floor-generator.js) — Core floor generation module (`generateFloor`, `createPRNG`, `getBiomeForFloor`, `verifyPathBFS`, `BIOMES`, `TILE_TYPES`).
- [html/data/dungeons.json](file:///Users/jarad/git/lokarta-v3/html/data/dungeons.json) — Tower tier definitions, floor ranges, light colors, and floor name overrides.
- [html/data/encounters.json](file:///Users/jarad/git/lokarta-v3/html/data/encounters.json) — Catalog-driven monster encounter density scaling parameters (`baseMonstersPerRoom`, `extraMonsterFloorThreshold`, `bonusMonsterChanceFloor`, `bonusMonsterChance`).
- [html/worker/game-worker.js](file:///Users/jarad/git/lokarta-v3/html/worker/game-worker.js) — Off-thread generation & floor caching integration.

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 Tower Tier Progression System
- **Tower Tiers across the climb:**
  1. *The Gatehouse* (Floors 1–5): Light color tint `#ff8800`.
  2. *The Hall of Banners* (Floors 6–10): Light color tint `#00d4ff`.
  3. *The Bell Keep* (Floors 11–15): Light color tint `#a855f7`.
  4. *The Solar Gallery* (Floors 16–20): Light color tint `#ef4444`.
- The final floor is titled *The Crown Spire (Final Floor)*.

### 3.2 PRNG & Grid Layout Generation
- **Mulberry32 PRNG:** Seeded pseudo-random number generator ensuring deterministic and reproducible floor layouts based on floor seed strings/numbers.
- **Fixed $40 \times 40$ Grid Matrix:** Boundary tiles strictly forced to solid Wall (`1`).
- **Room Carving & Corridor Connections:** Carves rectangular rooms connected by L-shaped corridors.
- **Spawn & Ascent Guarantees:** Fixed player spawn at coordinates $(2, 2)$ and ascent stairs at $(35, 35)$. Doors placed at room thresholds.

### 3.3 BFS Path Connectivity Verification
- **Reachability Guarantee:** Runs a Breadth-First Search (BFS) pathfinding algorithm from spawn $(2, 2)$ to exit $(35, 35)$ over traversable tiles (Floor, Door, Stairs).
- **Regeneration Fallback:** Re-seeds and regenerates the floor if no valid path exists between spawn and exit.

### 3.4 Entity & Loot Placement
- **Monster Population:** Tier-specific monster scaling based on floor depth (Giant Rats and Bone Sentries $\rightarrow$ Shadow Cultists $\rightarrow$ Elite Cultists, and the final Spire Warden guardian).
- **Chest & Item Spawns:** Places chests, health/mana potions, torches, and arrows in carved rooms with floor-scaled drop tables.

---

## 4. Inputs, Outputs & State Data

- **Inputs:** `floorNumber` (integer $1..20$), optional `seed` string/number.
- **Outputs:** Floor state object containing:
  - `floor_number`: Current floor depth.
  - `biome`: tower-tier metadata (`name`, `lightColor`).
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
