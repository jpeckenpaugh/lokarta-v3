# Feature Specification: 02 — Dynamic Lighting and Line of Sight

## 1. Overview & Purpose

The **Dynamic Lighting and Line-of-Sight (LOS)** system calculates player vision, circular radius light propagation, and fog-of-war memory masks in real time. It ensures tactical exploration by hiding unvisited areas in dark fog, rendering previously visited tiles in a dimmed memory state, and illuminating currently visible tiles with biome-specific color glows.

---

## 2. Mapped Codebase Modules

- [html/engine/lighting-system.js](file:///Users/jarad/git/lokarta-v3/html/engine/lighting-system.js) — `LightingSystem` class (`computePlayerRadius`, `updateLighting`, `castLightCircle`).
- [html/app/canvas-renderer.js](file:///Users/jarad/git/lokarta-v3/html/app/canvas-renderer.js) — Render-loop integration (`renderLightMask`, shadow masks, biome light tinting).

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 Three-State Fog of War
- **Unexplored (State 0):** Completely opaque black fog over unvisited tiles.
- **Explored / Memory Fog (State 1):** Semi-transparent gray overlay over tiles previously seen but currently out of direct line of sight. Entities inside memory fog are hidden.
- **Currently Visible (State 2):** Fully illuminated tiles within line of sight, revealing terrain, items, chests, and active monsters.

### 3.2 Dynamic Vision Radii Calculation
- **Base Sight Radius:** 10 tiles default field-of-view (FOV).
- **Torch Boost:** Adds +2 radius (12 tiles total) when a Torch item is equipped or on the action bar.
- **Light Spell Boost:** Magician *Light Spell* skill expands FOV radius dynamically by +3 (30–20s -> 13 tiles), +2 (19–10s -> 12 tiles), and +1 (<10s -> 11 tiles).

### 3.3 Circular Radius Illumination Engine
- Evaluates spatial distance $d = \sqrt{\Delta x^2 + \Delta y^2}$ from player grid coordinates $(x_p, y_p)$ to boundary targets within current FOV radius.
- Light spreads in a uniform circular radius around the player with linear distance intensity falloff.

### 3.4 Tower Tier Light Color Tinting
- Applies custom ambient color tint overlays over visible tiles based on the active tower tier:
  - The Gatehouse: Warm Amber/Orange (`#ff8800`).
  - The Hall of Banners: Ethereal Cyan (`#00d4ff`).
  - The Bell Keep: Arcane Purple (`#a855f7`).
  - The Solar Gallery: Infernal Crimson (`#ef4444`).

---

## 4. Inputs, Outputs & State Data

- **Inputs:** Player position $(x, y)$, current active vision radius (10/11/12/13), grid map state, biome light color.
- **Outputs:**
  - `tile.isLit`: boolean flag on each matrix tile.
  - `exploredTiles`: 2D boolean grid of persistently discovered tiles.
  - Canvas overlay rendering parameters (opacity gradients, radial light falloff, memory shroud).

---

## 5. Operational Constraints & Boundaries

- Line-of-sight recalculations execute synchronously whenever player position changes or light source status updates.
- Monsters outside the `visibleTiles` set must be excluded from rendering to enforce fog-of-war tactical surprise.
