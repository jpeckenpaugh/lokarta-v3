# Feature Brief: 01 — Procedural Dungeon Generator

## 1. Purpose

The **Procedural Dungeon Generator** produces 20 deterministic, $40 \times 40$ tile-grid dungeon floors for *Lokarta: Come Into The Light*. It is responsible for carving room layouts, connecting corridors, placing doors and stairs down, populating monster entities and interactive loot chests, and mathematically guaranteeing traversable pathing from player spawn to exit stairs via Breadth-First Search (BFS) verification.

---

## 2. Implemented Behavior

### 2.1 Biome Progression System
Floor depth ($1..20$) maps strictly to 4 biomes defined in `BIOMES` (`floor-generator.js`):
- **Floors 1–5 (Subterranean Crypt):** Light color `#ff8800` (Warm Amber/Orange).
- **Floors 6–10 (Catacombs of Whispers):** Light color `#00d4ff` (Ethereal Cyan).
- **Floors 11–15 (Shadow Vaults):** Light color `#a855f7` (Arcane Purple).
- **Floors 16–20 (Abyssal Sanctum):** Light color `#ef4444` (Infernal Crimson). Floor 20 is titled `'Abyssal Sanctum - The Void Core (Final Floor)'`.

### 2.2 PRNG Engine & Seed Rules
- **Algorithm:** 32-bit Mulberry32 PRNG initialized in `createPRNG(seed)`.
- **Seed Derivation:** If explicit `seed` parameter is not supplied, `prngSeed` defaults to `1337 + floorId * 42`.
- **String Seed Hashing:** String seeds hash via bitwise operations: `s = (s * 31 + seed.charCodeAt(i)) >>> 0`.

### 2.3 Grid Layout & Room Carving Logic
- **Grid Matrix:** Fixed $40 \times 40$ array of tile types (`FLOOR=0`, `WALL=1`, `STAIRS=2`, `DOOR=3`). Outer perimeter ($x=0, x=39, y=0, y=39$) is strictly Wall (`1`).
- **Macro Room Grid:** Carves rooms across a 3x3 macro layout:
  - Top-Left: `[2, 2, 8, 8]` (contains spawn at `(2, 2)`).
  - Top-Center: `[13, 2, 22, 9]`.
  - Top-Right: `[28, 2, 37, 9]`.
  - Mid-Left: `[2, 14, 10, 24]`.
  - Center Hall: `[15, 14, 26, 25]`.
  - Mid-Right: `[29, 14, 37, 24]`.
  - Bottom-Left: `[2, 28, 10, 37]`.
  - Bottom-Center: `[14, 29, 25, 37]`.
  - Bottom-Right: `[28, 28, 37, 37]` (contains exit stairs at `(35, 35)`).
- **Corridor Connections:** Connects room centers using L-shaped orthogonal corridors and places Door tiles (`3`) at room thresholds.

### 2.4 BFS Connectivity Verification
- **Reachability Validation:** Executes `verifyPathBFS(matrix, spawn, stairs)` using a queue-based search over walkable tiles (`FLOOR=0`, `DOOR=3`, `STAIRS=2`).
- **Retry Loop:** If BFS fails to find a path from `(2, 2)` to `(35, 35)`, the generator increments the seed (`prngSeed + attempt * 1000`) and regenerates up to 10 attempts.

### 2.5 Entity & Loot Population
- **Monsters:** Populates 5 to 10 monsters per floor based on biome tier:
  - Crypt: `rat`, `bat`, `skeleton_crawler`.
  - Catacombs: `skeleton_archer`, `goblin`, `cultist`.
  - Vaults: `orc_warrior`, `dark_mage`, `gargoyle`.
  - Sanctum: `abyssal_knight`, `demon`.
  - Floor 20 Boss: Spawns `abyssal_overlord` (`id: 'f20_boss_overlord'`, `hp: 600`, `max_hp: 600`, `attack: 20`, `defense: 6`, `isBoss: true`).
- **Loot & Chests:** Spawns 2 to 4 chests and loose ground items (`health_potion`, `mana_potion`, `torch`, `arrow`, weapons, armor, relics).

---

## 3. Inputs & Outputs

- **Inputs:** `floorNumber` (number $1..20$), optional `seed` (number | string).
- **Outputs:** Floor State Object (`generateFloor` return value):
  - `floor_number`: number ($1..20$)
  - `id`: number ($1..20$)
  - `name`: string (e.g. `'Subterranean Crypt - Floor 1'`)
  - `biome`: string (biome name)
  - `width`: 40, `height`: 40
  - `tiles`: `number[40][40]`
  - `spawn_coords`: `{ x: 2, y: 2 }`
  - `stairs_down_coords`: `{ x: 35, y: 35 }`
  - `monsters`: `Array<MonsterEntity>`
  - `items`: `Array<GroundItem>`
  - `chests`: `Array<ChestObject>`

---

## 4. User-Visible Experience

- **Visual Rendering:** Player spawns at top-left room `(2, 2)`. Biome light glow overlays color the illuminated tiles (Amber for Crypt, Cyan for Catacombs, Purple for Vaults, Crimson for Sanctum).
- **Navigation Goal:** Player locates the blue stairs icon down at `(35, 35)` to proceed to the next floor depth.
- **Boss Encounter:** Floor 20 features the Abyssal Overlord in a distinct void core environment.

---

## 5. Constraints

- Grid boundaries ($40 \times 40$) are fixed; outer frame is uncarved solid Wall.
- Exterior walls are exactly 1 tile thick (rows $0/39$, cols $0/39$); internal room walls are 1 tile thick, reclaiming interior spacing for gameplay.
- Player spawn is strictly forced to `(2, 2)`; exit stairs strictly forced to `(35, 35)`.
- Maximum generator retry count on BFS failure is 10 attempts.

---

## 6. Acceptance Criteria

1. **Determinism:** `generateFloor(f, seed)` called twice with identical parameters returns identical `tiles`, `spawn_coords`, `stairs_down_coords`, and `monsters` arrays (Verified in `html/tests/engine.test.mjs#L46-L55`).
2. **Grid Matrix Bounds:** All generated floors 1 to 20 maintain exact $40 \times 40$ dimensions with outer perimeter wall enforcement (Verified in `html/tests/engine.test.mjs#L57-L67`).
3. **Fixed Spawn & Stairs:** All generated floors place spawn at `(2, 2)` (`FLOOR`) and exit stairs at `(35, 35)` (`STAIRS`) (Verified in `html/tests/engine.test.mjs#L69-L77`).
4. **BFS Connectivity:** Every generated floor from depth 1 to 20 contains a valid walkable path between `(2, 2)` and `(35, 35)` (Verified in `html/tests/engine.test.mjs#L79-L115`).
5. **Biome Association:** Floor depths 1–5 return Crypt, 6–10 return Catacombs, 11–15 return Shadow Vaults, 16–20 return Abyssal Sanctum (Verified in `html/tests/engine.test.mjs#L117-L122`).
6. **Floor 20 Boss Specs:** Floor 20 spawns `abyssal_overlord` with 600 HP, 20 ATK, 6 DEF, `isBoss: true` (Verified in `html/tests/engine.test.mjs#L124-L135`).
