# Lokarta: Art Direction Specification

Authoritative 16-bit SNES-inspired pixel art direction and rendering contract for *Lokarta: Come Into The Light*.

---

## 1. Resolution & Coordinate Space

* **Native Sprite Canvas:** $32 \times 32\text{ px}$ for actors, player vocations, regular monsters, props, and tiles.
* **Boss Canvas:** $48 \times 48\text{ px}$ for The Spire Warden (`abyssal_overlord`).
* **Display Tile Grid:** Scaled by integer scaling factor `SCALE = CONFIG.GRID_SIZE / 32` (e.g. $\times 2$ at $64\text{ px}$ tiles).
* **Rendering Style:** `image-rendering: pixelated; crisp-edges`. No anti-aliasing or sub-pixel coordinate offsets.

---

## 2. Facing & Animation Models

* **3-Direction Facing:** Sprites are authored for three directions (`down`, `up`, `side`). `left` is rendered by mirroring `side` horizontally.
* **Frame Sets per Actor:**
  * `idle`: 3 directions (1 frame each)
  * `walk`: 3 directions (2 frames each, step-driven)
  * `attack`: 3 directions (3 frames each)
  * `hit`: 3 directions (1 frame each)
  * `death`: 4 frames (non-directional)
* **Outline & Shading:** Standard $1\text{ px}$ silhouette outline (`#0b0d12`) with flat pixel ramps.

---

## 3. Contrast & Visibility Rule

To guarantee visibility in dark dungeon environments:
* Every actor and monster must maintain a **$\ge 3:1$ WCAG contrast ratio** rim color against the floor background (`tile_themes.floor.fill = #1a1c23`).
* Light mask shroud (`renderLightMask`) applies ambient radial falloff while keeping actors legible at light boundaries.

---

## 4. Tile Themes & Decor Props

* **Tile Themes:** Authored per tier in `html/data/tile_themes.json` (Crypt, Catacombs, Shadow Vaults, Abyssal Sanctum, Crown Spire).
* **Room Decor & Props:** Authored in `html/data/tower_levels.json` (`propPolicy`), including interactive chests, braziers (emitting ambient light radius), and decorative pillars/thrones.
* **Preview PNGs:** Committed export previews reside in `docs/art/preview/` and are drift-checked by `html/tests/sprite-assets.test.mjs`.
