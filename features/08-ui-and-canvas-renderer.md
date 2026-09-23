# Feature Specification: 08 — UI Controller and Canvas Renderer

## 1. Overview & Purpose

The **UI Controller and Canvas Renderer** delivers the visual presentation layer, 60 FPS HTML5 Canvas tile/sprite rendering pipeline, smooth position interpolation, camera centering, HUD overlays, action bar hotbar controls, character creation workflow, combat message logging, and responsive CSS styling for *Lokarta: Come Into The Light*.

---

## 2. Mapped Codebase Modules

- [html/app/sprite-renderer.js](file:///Users/jarad/git/lokarta-v3/html/app/sprite-renderer.js) — Canvas tile/sprite rendering pipeline (`SpriteRenderer`), $O(1)$ dispatch tables (`MONSTER_RENDERERS`, `ITEM_RENDERERS`, `WEAPON_RENDERERS`, `TILE_RENDERERS`, `FACING_EYE_OFFSETS`).
- [html/app/hud-manager.js](file:///Users/jarad/git/lokarta-v3/html/app/hud-manager.js) — HUD updates and $O(1)$ `EMOJI_TO_SVG_MAP`.
- [html/app/app-controller.js](file:///Users/jarad/git/lokarta-v3/html/app/app-controller.js) — Main UI controller, $O(1)$ `DIRECTION_VECTORS`.
- [html/data/tile_themes.json](file:///Users/jarad/git/lokarta-v3/html/data/tile_themes.json) — Biome canvas color themes catalog.
- [html/data/keybindings.json](file:///Users/jarad/git/lokarta-v3/html/data/keybindings.json) — Action bar hotkey bindings configuration catalog.
- [html/index.html](file:///Users/jarad/git/lokarta-v3/html/index.html) — DOM layout structure (Canvas container, HUD headers, Action bar slots, Modal dialogs, Log panel).
- [html/styles/index.css](file:///Users/jarad/git/lokarta-v3/html/styles/index.css) — Modular stylesheets container (`base.css`, `hud.css`, `modals.css`).

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 60 FPS HTML5 Canvas Rendering Pipeline
- **Smooth Coordinate Interpolation:** Interpolates grid movement positions ($x, y$) over time for smooth entity sliding animations.
- **Camera Centering:** Dynamically centers the canvas camera viewport on current player coordinates $(x_p, y_p)$.
- **Procedural Canvas Tile & Sprite Renderer ($O(1)$ Dispatch Tables):**
  - Uses $O(1)$ object literal map lookup dispatchers in `sprite-renderer.js` (`MONSTER_RENDERERS`, `ITEM_RENDERERS`, `WEAPON_RENDERERS`, `TILE_RENDERERS`, `FACING_EYE_OFFSETS`) to eliminate `switch`/`if-else` chains.
  - Carved walls with brick detail lines and highlight borders (biome colors driven by `tile_themes.json`).
  - Floor tiles with subtle grid borders and corner accents.
  - Stairs down with layered blue step rings and glowing center orb.
  - Doors with wood grain borders.
  - Procedural monster icons (Rats, Bats, Skeletons, Orcs, Mages, Abyssal Overlord).
  - Procedural item sprites (Health Potion, Mana Potion, Torch, Arrow, Weapons, Armor, Relics).

### 3.2 Visual FX & Lighting Overlays
- **Particle & FX System:** Floating damage/heal text indicators, wand spark particles, energy beam line renders, level-up celebration flashes.
- **Shadow Mask & Light Glows:** Renders memory fog shrouds, dynamic torch light falloff gradients, and biome-specific ambient glow overlays.

### 3.3 Interactive HUD & Action Bar UI
- **Real-Time Vitals Display:** Health bar (red), Mana bar (blue), XP bar (green), Level display, Floor depth indicator.
- **10-Slot Action Bar Controls:** Clickable item/ability slots mapped to hotkeys `1`–`9` and `0` with cooldown overlays and stack counters.
- **Paperdoll Inventory Modal:** Interactive equipment paperdoll interface (`main_hand`, `off_hand`, `armor`, `relic`) and 6-slot backpack view.
- **Scrollable Combat Log:** Multi-line scrolling message log detailing player actions, damage dealt/taken, items acquired, and status changes.

---

## 4. Inputs, Outputs & State Data

- **Inputs:** Player entity state, floor grid matrix, visible tile sets, mouse click / keyboard keydown events, window resize events.
- **Outputs:**
  - Rendered 60 FPS Canvas frame output.
  - Updated DOM HTML elements (HUD text, vital bar width CSS %, active hotbar slots).
  - Dispatched input gesture events to simulation engine.

---

## 5. Operational Constraints & Boundaries

- Canvas scale and aspect ratio dynamically adjust on window resize while maintaining crisp pixel art styling (`image-rendering: pixelated`).
- Render pipeline skips drawing entities located outside the currently visible FOV tile set.
