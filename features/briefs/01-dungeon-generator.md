# Feature Brief: 01 — Procedural Tower Floor Generator

## 1. Purpose

The **Procedural Tower Floor Generator** produces deterministic, $40 \times 40$ tile-grid tower floors for *Lokarta: Come Into The Light*. It is responsible for carving room layouts, connecting corridors, placing doors and ascent stairs, populating monster entities and interactive loot chests, and mathematically guaranteeing traversable pathing from player spawn to the stairs via Breadth-First Search (BFS) verification.

---

## 2. Implemented Behavior

### 2.1 Tower Tier Progression System
Floor number maps strictly to the tower tiers defined in `BIOMES` (`floor-generator.js`):
- **Floors 1–5 (The Gatehouse):** Light color `#ff8800` (Warm Amber/Orange).
- **Floors 6–10 (The Hall of Banners):** Light color `#00d4ff` (Ethereal Cyan).
- **Floors 11–15 (The Bell Keep):** Light color `#a855f7` (Arcane Purple).
- **Floors 16–20 (The Solar Gallery):** Light color `#ef4444` (Infernal Crimson). The final floor is titled `'The Crown Spire (Final Floor)'`.

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
  - Bottom-Right: `[28, 28, 37, 37]` (contains the ascent stairs at `(35, 35)`).
- **Corridor Connections:** Connects room centers using L-shaped orthogonal corridors and places Door tiles (`3`) at room thresholds.

### 2.4 BFS Connectivity Verification
- **Reachability Validation:** Executes `verifyPathBFS(matrix, spawn, stairs)` using a queue-based search over walkable tiles (`FLOOR=0`, `DOOR=3`, `STAIRS=2`).
- **Retry Loop:** If BFS fails to find a path from `(2, 2)` to `(35, 35)`, the generator increments the seed (`prngSeed + attempt * 1000`) and regenerates up to 10 attempts.

### 2.5 Entity & Loot Population
- **Monsters:** Populates monsters per floor based on tower tier:
  - Gatehouse: `giant_rat`, `crypt_skeleton`.
  - Hall of Banners: `crypt_skeleton`, `shadow_cultist`.
  - Bell Keep / Solar Gallery: `elite_cultist`, `crypt_skeleton`.
  - Final Level Boss: Spawns `abyssal_overlord` — display name **The Spire Warden** (`id: 'f20_boss_overlord'`, `hp: 600`, `max_hp: 600`, `attack: 20`, `defense: 6`, `isBoss: true`).
- **Loot & Chests:** Spawns 2 to 4 chests and loose ground items (`health_potion`, `mana_potion`, `torch`, `arrow`, weapons, armor, relics).

---

## 3. Inputs & Outputs

- **Inputs:** `floorNumber` (number $1..20$), optional `seed` (number | string).
- **Outputs:** Floor State Object (`generateFloor` return value):
  - `floor_number`: number ($1..20$)
  - `id`: number ($1..20$)
  - `name`: string (e.g. `'The Gatehouse - Floor 1'`)
  - `biome`: string (tower-tier name)
  - `width`: 40, `height`: 40
  - `tiles`: `number[40][40]`
  - `spawn_coords`: `{ x: 2, y: 2 }`
  - `stairs_down_coords`: `{ x: 35, y: 35 }`
  - `monsters`: `Array<MonsterEntity>`
  - `items`: `Array<GroundItem>`
  - `chests`: `Array<ChestObject>`

---

## 4. User-Visible Experience

- **Visual Rendering:** Player spawns at top-left room `(2, 2)`. Tier light glow overlays color the illuminated tiles (Amber for the Gatehouse, Cyan for the Hall of Banners, Purple for the Bell Keep, Crimson for the Solar Gallery).
- **Navigation Goal:** Player locates the blue ascent-stairs icon at `(35, 35)` to climb to the next floor.
- **Boss Encounter:** The final level features The Spire Warden at the tower's crown.

---

## 5. Constraints

- Grid boundaries ($40 \times 40$) are fixed; outer frame is uncarved solid Wall.
- Exterior walls are exactly 1 tile thick (rows $0/39$, cols $0/39$); internal room walls are 1 tile thick, reclaiming interior spacing for gameplay.
- Player spawn is strictly forced to `(2, 2)`; ascent stairs strictly forced to `(35, 35)`.
- Maximum generator retry count on BFS failure is 10 attempts.

---

## 6. Acceptance Criteria

1. **Determinism:** `generateFloor(f, seed)` called twice with identical parameters returns identical `tiles`, `spawn_coords`, `stairs_down_coords`, and `monsters` arrays (Verified in `html/tests/engine.test.mjs#L46-L55`).
2. **Grid Matrix Bounds:** All generated floors 1 to 20 maintain exact $40 \times 40$ dimensions with outer perimeter wall enforcement (Verified in `html/tests/engine.test.mjs#L57-L67`).
3. **Fixed Spawn & Stairs:** All generated floors place spawn at `(2, 2)` (`FLOOR`) and ascent stairs at `(35, 35)` (`STAIRS`) (Verified in `html/tests/engine.test.mjs#L69-L77`).
4. **BFS Connectivity:** Every generated floor from depth 1 to 20 contains a valid walkable path between `(2, 2)` and `(35, 35)` (Verified in `html/tests/engine.test.mjs#L79-L115`).
5. **Tier Association:** Floor depths 1–5 return The Gatehouse, 6–10 return The Hall of Banners, 11–15 return The Bell Keep, 16–20 return The Solar Gallery (Verified in `html/tests/engine.test.mjs#L117-L122`).
6. **Final Boss Specs:** The final level spawns `abyssal_overlord` (The Spire Warden) with 600 HP, 20 ATK, 6 DEF, `isBoss: true` (Verified in `html/tests/engine.test.mjs#L124-L135`).
