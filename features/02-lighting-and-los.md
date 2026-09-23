# Feature Specification: 02 — Dynamic Lighting and Line of Sight

## 1. Overview & Purpose

The **Dynamic Lighting and Line-of-Sight (LOS)** system calculates player vision, raycasted wall occlusion, dynamic light propagation, and fog-of-war memory masks in real time. It ensures tactical exploration by hiding unvisited areas in dark fog, rendering previously visited tiles in a dimmed memory state, and illuminating currently visible tiles with biome-specific color glows.

---

## 2. Mapped Codebase Modules

- [html/engine.js](file:///Users/jarad/git/lokarta-v3/html/engine.js) — `LightingSystem` class, Bresenham line-of-sight algorithms (`computeFOV`, `isTileVisible`, `castRay`).
- [html/app.js](file:///Users/jarad/git/lokarta-v3/html/app.js) — Render-loop integration (`drawLightingOverlay`, shadow masks, biome light tinting).

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 Three-State Fog of War
- **Unexplored (State 0):** Completely opaque black fog over unvisited tiles.
- **Explored / Memory Fog (State 1):** Semi-transparent gray overlay over tiles previously seen but currently out of direct line of sight. Entities inside memory fog are hidden.
- **Currently Visible (State 2):** Fully illuminated tiles within line of sight, revealing terrain, items, chests, and active monsters.

### 3.2 Dynamic Vision Radii Calculation
- **Base Sight Radius:** 10 tiles default field-of-view (FOV).
- **Torch Boost:** Increases FOV radius to 14 tiles when a Torch consumable is active.
- **Light Spell Boost:** Magician *Light Spell* skill expands FOV radius to 12 tiles and applies bright illumination.

### 3.3 Bresenham Raycasting & Wall Occlusion
- Uses integer-based Bresenham line-casting from player grid coordinates $(x_p, y_p)$ to boundary targets within current FOV radius.
- Wall tiles (`WALL=1`) block light rays, preventing visibility of tiles behind them.
- Doors block line of sight when closed; open doors transmit light rays.

### 3.4 Biome Light Color Tinting
- Applies custom ambient color tint overlays over visible tiles based on the active biome:
  - Crypt: Warm Amber/Orange (`#ff8800`).
  - Catacombs: Ethereal Cyan (`#00d4ff`).
  - Shadow Vaults: Arcane Purple (`#a855f7`).
  - Abyssal Sanctum: Infernal Crimson (`#ef4444`).

---

## 4. Inputs, Outputs & State Data

- **Inputs:** Player position $(x, y)$, current active vision radius (10/12/14), grid map walls state, biome light color.
- **Outputs:**
  - `visibleTiles`: 2D boolean grid or Set of visible coordinate strings `x,y`.
  - `exploredTiles`: 2D boolean grid of persistently discovered tiles.
  - Canvas overlay rendering parameters (opacity gradients, radial light falloff, memory shroud).

---

## 5. Operational Constraints & Boundaries

- Line-of-sight recalculations execute synchronously whenever player position changes or light source status updates.
- Monsters outside the `visibleTiles` set must be excluded from rendering to enforce fog-of-war tactical surprise.
