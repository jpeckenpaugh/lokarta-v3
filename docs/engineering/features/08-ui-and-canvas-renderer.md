# Feature Brief: 08 — UI Controller and Canvas Renderer

## 1. Purpose

The **UI Controller and Canvas Renderer** delivers the visual presentation layer, 60 FPS HTML5 Canvas rendering pipeline, smooth position interpolation, dynamic camera centering, interactive HUD overlays, paperdoll modal views, gesture input dispatching, and responsive CSS styling for *Lokarta: Come Into The Light*.

---

## 2. Implemented Behavior

### 2.1 60 FPS HTML5 Canvas Renderer (`SpriteRenderer` & Render Loop)
- **Viewport & Camera Centering:** `render()` dynamically calculates screen offset to center camera on player grid coordinates $(x_p, y_p)$:
  $$\text{offsetX} = \frac{\text{canvas.width}}{2} - x_p \times \text{GRID\_SIZE} - \frac{\text{GRID\_SIZE}}{2}$$
- **Procedural Canvas Tile Sprites (`SpriteRenderer.drawTile`):**
  - `WALL`: Brick detail lines with `#2a2f3b` fill, `#444d61` cap, mortar detail strokes.
  - `FLOOR`: `#1a1c23` base with subtle grid accent squares.
  - `STAIRS`: Multi-layered blue step rings (`#3878a8` / `#254e70`) with glowing center orb (`#88eeff`).
  - `DOOR`: Wood grain border (`#4a2f1b`).
- **Entity Sprites:** Procedural monster icons (Giant Rats, Bone Sentries, Cultists, The Spire Warden boss) and item sprites (Health/Mana Potions, Torches, Arrows, Weapons, Armor, Relics).

### 2.2 Particle FX & Lighting Shroud Overlays
- **Particle Animations:** Floating damage text (red numbers for damage, green for heal), wand spark arc particles, energy beam ray renders, level-up celebration flashes.
- **Lighting & Memory Shroud:**
  - Unexplored tiles: Pitch black `#000000`.
  - Memory tiles: Gray shroud overlay (`rgba(0, 0, 0, 0.6)`).
  - Visible tiles: Biome color ambient glow overlays (Amber `#ff8800` Crypt, Cyan `#00d4ff` Catacombs, Purple `#a855f7` Vaults, Crimson `#ef4444` Sanctum) with dynamic radial falloff.

### 2.3 Gesture Engine & Input Mapping (`GestureEngine`)
Calculates gesture type based on press duration (`CONFIG` in `html/engine/config.js`):
- **Tap Gesture:** Press duration $\le 250\text{ ms}$ (`CONFIG.TAP_MAX_MS = 250`).
- **Hold Gesture:** Press duration between $250\text{ ms}$ and $1200\text{ ms}$ (`CONFIG.HOLD_MIN_MS = 250`, `CONFIG.HOLD_MAX_MS = 1200`).
- **Double-Tap Gesture:** Second tap within $300\text{ ms}$ of first release (`CONFIG.DOUBLE_TAP_MAX_MS = 300`).
- **Hotkey Controls:** Mapped to keyboard keys `1`–`9` and `0` for hotbar activation, directional arrow/WASD keys for movement, `I` key for inventory paperdoll toggle.

---

## 3. Inputs & Outputs

- **Inputs:** Keyboard Events (`keydown`, `keyup`), Pointer Events (`mousedown`, `mouseup`, `touchstart`, `touchend`), Window `resize` events.
- **Outputs:**
  - 60 FPS HTML5 Canvas frame render.
  - DOM UI updates (Health %, Mana %, XP %, Floor name, combat log append).
  - Dispatched simulation action events.

---

## 4. User-Visible Experience

- **Crisp Pixel Art Presentation:** Scaled canvas rendering maintains sharp pixel borders (`image-rendering: pixelated`).
- **Responsive Layout:** Central viewport flanked by HUD header, scrollable combat log, action bar, and modal overlays adapt smoothly across desktop and mobile screens.

---

## 5. Constraints

- Render loop skips entity rendering for tiles outside visible FOV.
- Canvas maintains $64 \text{ px}$ grid tile units (`CONFIG.GRID_SIZE = 64`) so tile art can be enriched in future passes.

---

## 6. Acceptance Criteria

1. **Tap Gesture Threshold (<=250ms):** Touch/click press held for 150ms resolves as `'tap'` gesture (Verified in `html/tests/engine.test.mjs#L448-L458`).
2. **Hold Gesture Threshold (250-1200ms):** Touch/click press held for 500ms resolves as `'hold'` gesture (Verified in `html/tests/engine.test.mjs#L448-L458`).
3. **Double-Tap Threshold (<=300ms):** Two consecutive taps within 200ms resolve as `'double_tap'` gesture (Verified in `html/tests/engine.test.mjs#L448-L458`).
4. **Hotbar Slot Mapping (Keys 1-9, 0):** Digit key press events dispatch action bar slot triggers 0 through 9 corresponding to hotbar item or skill (Verified in `html/tests/engine.test.mjs#L448-L458`).
