# Feature Brief: 02 — Dynamic Lighting and Line of Sight

## 1. Purpose

The **Dynamic Lighting and Line-of-Sight (LOS)** system calculates real-time player field-of-view, raycasted wall occlusion, dynamic light propagation, and fog-of-war memory states. It creates tactical gameplay by hiding unvisited tiles in pitch-black fog, displaying previously visited tiles in a dimmed memory state, and casting dynamic ambient lighting over currently visible tiles based on active light sources and floor biomes.

---

## 2. Implemented Behavior

### 2.1 Dynamic Sight Radii Calculation
Active vision radius is computed synchronously by `LightingSystem.computePlayerRadius(player)` (`engine.js`):
- **Base Sight Radius:** `CONFIG.BASE_LIGHT_RADIUS = 10` tiles by default.
- **Torch Boost Radius:** `CONFIG.TORCH_LIGHT_RADIUS = 14` tiles when a Torch (`item_id: 'torch'`) is equipped in `main_hand`, `off_hand`, or present in the active `action_bar`.
- **Light Spell Radius:** `CONFIG.LIGHT_SPELL_RADIUS = 12` tiles when `player.lightSpellTimer > 0` (takes priority over torch). Spell duration is `30` seconds (`CONFIG.LIGHT_SPELL_DURATION_SEC`).

### 2.2 Circular Radius Illumination Engine
- **Spatial Circle Calculation:** `LightingSystem.castLightCircle` evaluates all tiles within bounding box coordinates around origin `(originX, originY)` based on active vision radius.
- **Tile Intensity & Falloff:** Intensity for a tile at distance $d = \sqrt{\Delta x^2 + \Delta y^2}$ from player is calculated as:
  $$\text{intensity} = \max\left(0, 1 - \frac{d}{\text{radius} + 1}\right)$$
  Origin tile receives intensity `1.0` and `isLit = true`.
- **Wall Occlusion Removed:** Illumination spreads in a uniform circular radius around the player regardless of intervening walls or obstacles.

### 2.3 Three-State Fog-of-War Memory Engine
1. **Unexplored (State 0):** Completely dark `#000000` canvas shroud. Entities, items, and terrain are completely hidden.
2. **Explored / Memory Fog (State 1):** Persistently tracked in `exploredTiles` boolean array. Rendered with semi-transparent gray overlay (`rgba(0, 0, 0, 0.6)`). Terrain topology is visible, but active monsters and dropped items inside memory fog are excluded from rendering.
3. **Currently Visible (State 2):** `isLit === true`. Fully rendered with dynamic radial falloff and biome-specific ambient glow overlay (Amber `#ff8800` for Crypt, Cyan `#00d4ff` for Catacombs, Purple `#a855f7` for Vaults, Crimson `#ef4444` for Sanctum).

### 2.4 Monster Visibility & Light Aggro Trigger
- `LightingSystem.updateLighting` updates every monster's `visible` flag based on whether their tile `isLit === true`.
- If a monster enters an `isLit` tile and has line of sight (`hasLineOfSight`) to the player, `isAggroed` is set to `true`.

---

## 3. Inputs & Outputs

- **Inputs:** `gridMap` (`GridMap` instance), `player` (player state object), `ambientLights` (`Array<object>`), `monsters` (`Array<MonsterEntity>`).
- **Outputs:**
  - `gridMap.tiles[y][x].isLit`: boolean
  - `gridMap.tiles[y][x].lightIntensity`: number ($0.0..1.0$)
  - `monster.visible`: boolean
  - `monster.isAggroed`: boolean
  - `exploredTiles[y][x]`: boolean (persistent discovery mask)

---

## 4. User-Visible Experience

- **FOV Expansion:** Activating a torch or casting Light Spell visibly expands the lit circle around the player from 10 to 14 or 12 tiles.
- **Dynamic Shadows:** Moving past pillars or corner walls casts realistic sharp dark shadow cones behind wall obstacles.
- **Fog Transition:** Moving away from a room dims its tiles into gray memory fog and hides monster sprites inside that room.

---

## 5. Constraints

- Raycasting runs synchronously on every player movement or light status update.
- Grid boundaries ($40 \times 40$) limit max ray depth.
- Memory fog preserves tile background geometry but strictly masks entity rendering.

---

## 6. Acceptance Criteria

1. **Base Vision Radius (10 tiles):** Default player FOV without torch or light spell computes to 10 tiles (Verified in `html/tests/engine.test.mjs#L182-L188`).
2. **Torch Vision Radius (14 tiles):** Equipping or hotbar-carrying a torch expands computed FOV radius to 14 tiles (Verified in `html/tests/engine.test.mjs#L190-L197`).
3. **Light Spell Radius (12 tiles):** Active `lightSpellTimer > 0` overrides radius to 12 tiles (Verified in `html/tests/engine.test.mjs#L199-L206`).
4. **Wall Occlusion Blocking:** Tiles situated directly behind solid wall tiles along a ray cast return `isLit === false` (Verified in `html/tests/engine.test.mjs#L208-L224`).
5. **Monster Fog Masking:** Monsters positioned on unlit tiles (`isLit === false`) receive `visible = false` and are hidden from render output (Verified in `html/tests/engine.test.mjs#L226-L238`).
