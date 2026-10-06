# Lokarta: Come Into The Light — Art Direction & 16-bit Sprite Upgrade Spec

| Field | Value |
| :-- | :-- |
| Issue | LIV-9 (blocks LIV-10 implementation, LIV-8 analysis) |
| Status | Design deliverable — **no `html/` code changed by this document** |
| Scope | 4 vocations (Magician, Archer, Fighter, Paladin) + 5 monsters (`giant_rat`, `crypt_skeleton`, `shadow_cultist`, `elite_cultist`, `abyssal_overlord`) |
| Board-mandated style | "Top down classic RPG", **16-bit SNES-inspired top-down pixel art** |
| Baseline | `main` @ `5381afc`, native suite green: **507 tests / 80 suites / 0 fail** |
| Canon refs | `concept.md`, `docs/engineering/architecture.md`, `docs/engineering/agents.md`, `docs/design/analysis/equipment-analysis.md` |

This document is the contract for LIV-10. Every in-scope asset has a concrete schema, size, palette, frame set, integration point, and verification check so the implementation needs no further design input.

---

## 0. Decisions at a glance (the spec, compressed)

1. **Production approach:** authored sprite definitions **as data** — indexed-pixel matrices in JSON under `html/assets/sprites/`, pre-rendered once into offscreen canvases and blitted with nearest-neighbour integer scaling. No bundler, no runtime image fetch, no network, tests stay native.
2. **Native resolution:** **32×32 px** per actor/tile (`SPRITE_NATIVE = 32`), blitted at **integer scale `SCALE = GRID_SIZE / 32`** (currently **×2** at 64 px). Boss native canvas **48×48**.
3. **Facing model:** art is authored for **three directions** (`down`, `up`, `side`); **left = `side` mirrored horizontally**. Standard SNES economy, halves the art budget and fixes the renderer contract.
4. **Palette rule:** ≤ 16 colors per actor, every value a named hex in a project master palette; **no ad-hoc hex** in sprite files. Auto **1 px outline** `#0b0d12` on every silhouette edge. No anti-aliasing, no half-pixels, no sub-native coordinates.
5. **Readability rule (the one that matters on this dark game):** every actor must have a **top/outer rim** color with **≥ 3:1 contrast** against `tile_themes.floor.fill` (`#1a1c23`). Several placeholder palettes measurably fail (Shadow Cultist **1.05:1**, Elite Cultist **1.11:1**, The Spire Warden **1.04:1**); this is the single biggest reason the current art "reads as placeholder."
6. **Layering fix:** the darkness shroud (`renderLightMask`) is currently drawn **over** entities. Actors, health bars, selection ring and projectiles move **after** the mask (with a distance-based dim), so silhouettes stay legible at the light perimeter.
7. **Frame set per actor:** idle ×3 dirs, walk ×3 dirs ×2 frames, attack ×3 dirs ×3 frames, hit ×3 dirs ×1, death ×4 non-directional. **25 unique frames** per actor; walk advances **on step** (event-driven), not on a timer.
8. **Back-compat:** if a sprite definition is missing, the renderer falls back to today's procedural primitives. Tiles, items and HUD are **not** part of this pass (see §8).

---

## 1. Current-state audit

### 1.1 What renders the placeholder art today

All in-world actor and tile art is **procedural Canvas 2D primitives**, not pixel art:

| Surface | File / symbol | Lines | What it draws |
| :-- | :-- | :-- | :-- |
| Tiles | `html/app/sprite-renderer.js` → `TILE_RENDERERS` | 16–87 | Wall = `fillRect` + hairline brick strokes; Floor = `#1a1c23` + 6 px accent squares; Stairs = 4 nested `fillRect` rings + orb `arc`; Door = `fillRect` + `strokeRect` |
| Player | `SpriteRenderer.drawPlayer` | 294–340 | ellipse shadow → triangle robe polygon → `arc` head → 2-dot eyes via `drawFacingEyes` |
| Facing | `FACING_EYE_OFFSETS` + `drawFacingEyes` | 262–373 | facing is expressed **only** by translating two eye dots by ±2 px |
| Monsters | `MONSTER_RENDERERS` | 183–260 | Rat = `ellipse` + eye `arc`; Skeleton = head `arc` + spine `stroke` + two eye dots; Cultist(s) = trapezoid `fill` + `arc` hood; Boss = large `arc` + two horn strokes + eye dots |
| Items | `ITEM_RENDERERS` / `WEAPON_RENDERERS` | 89–181 | `arc`/`fillRect`/`stroke` potions, torches, arrows, swords, bows, hammers |
| Compositing | `html/app/canvas-renderer.js` → `render` | 32–116 | layer order: bg → tiles → items → monsters → player → projectiles/particles → **`renderLightMask`** → floating texts |
| Light/dark | `renderLightMask` | 348–435 | radial `createRadialGradient` of `rgba(5,6,8, α)` centered on the player, `α` 0 → 0.18 → 0.55 → 0.90 → 1.0 to the light edge, drawn **on top of entities** |
| Sprite scale hook | `SpriteRenderer.*` | 14, 18, 44, 65, 74 | every renderer computes `u = size / 32`; `CONFIG.GRID_SIZE = 64`, so `u = 2` |
| Canvas CSS | `html/styles/base.css` | 180–185 | `#game-canvas { image-rendering: pixelated; crisp-edges }` — this only affects CSS scaling of the **canvas element**, not `drawImage` scaling inside the canvas |

Colors come from `html/data/vocations.json` (`renderTheme.primary/secondary/accent`, `eyeColor`) and `html/data/tile_themes.json`. `html/data/monsters.json` carries `svgCode` emoji codes (e.g. `1F407`), and matching OpenMoji SVGs live under `html/assets/openmoji/`, but the canvas renderer **never loads them** — they are used only by DOM surfaces (`html/app/hud-manager.js`, `html/app/modal-manager.js`).

### 1.2 Why it reads as placeholder

1. **Vector shapes at 64 px, not pixels.** Every edge is anti-aliased (`arc`, `ellipse`, `stroke` with fractional `u` multiples such as `1.2 * u`, `4 * u`, `0.5`). There is no pixel grid, no outline, no dither, no ramp. At a 64 px tile this reads as "programmer art."
2. **No animation at all.** The player/monsters are redrawn in a single static pose per frame. `updateAnimations` (`app-controller.js:483+`) only advances projectiles, particles and floating text. There is **no walk cycle, no attack pose, no hit reaction, no death animation**. Facing is two moving dots.
3. **Docs drift masks it.** `docs/engineering/architecture.md §6.1` describes `prevX/prevY` lerp interpolation, but the codebase has **no `prevX`/`prevY` fields** (verified: zero matches in `html/`). Entities snap tile-to-tile; the only smoothing is camera rounding.
4. **Palettes are near-invisible on the floor.** Using WCAG relative luminance (`L`) and contrast ratio `CR = (L_a + 0.05) / (L_b + 0.05)` against `tile_themes.floor.fill = #1a1c23` (`L ≈ 0.0128`):

   | Actor | Dominant fill | `L` (approx) | `CR` vs floor | Verdict |
   | :-- | :-- | --: | --: | :-- |
   | Magician robe (`renderTheme.primary`) | `#5c2d91` | 0.068 | **1.88** | fails 3:1 |
   | Archer leathers | `#15803d` | 0.160 | 3.34 | passes |
   | Fighter plate | `#475569` | 0.089 | **2.21** | fails 3:1 |
   | Paladin azure | `#0284c7` | 0.206 | 4.08 | passes |
   | Giant Rat fur | `#5a3d28` | 0.057 | **1.70** | fails 3:1 |
   | Bone Sentry bone | `#dcdde1` | 0.724 | 12.3 | passes |
   | Shadow Cultist robe | `#1e1b4b` | 0.016 | **1.05** | invisible |
   | Elite Cultist robe | `#3b0764` | 0.020 | **1.11** | invisible |
   | The Spire Warden hide | `#450a0a` | 0.015 | **1.04** | invisible |

   Cultists and the boss sit at ~1.05:1 — their silhouettes collapse into the dark floor even before the darkness shroud dims them further.
5. **No color-independence between cultists.** `elite_cultist` simply delegates to `shadow_cultist` (`sprite-renderer.js:236–238`) and differs only by a darker fill. Same silhouette + hue-only difference = unreadable for color-vision-deficient players and unreadable at small scale.
6. **Palette duplication.** `tile_themes.items.*` defines potion/torch/arrow colors, but `ITEM_RENDERERS`/`WEAPON_RENDERERS` hardcode their own hexes (`#e63946`, `#3a86ff`, `#8b5a2b`, `#d4a373`, …). Two sources of truth that can drift.
7. **No ground contact for monsters.** Only `drawPlayer` draws a shadow (`sprite-renderer.js:299–303`); monsters float with no contact shadow.
8. **Broken asset references.** `monsters.json` `svgCode` `1F407` (Giant Rat) and `1F480` (Bone Sentry) have **no matching file** under `html/assets/openmoji/` (only 31 of the referenced codes exist; those two are missing). Harmless today because the canvas never draws them, but it is a latent gap if any surface starts rendering `svgCode` for monsters.
9. **Facing is not art-driven.** `player.facing`/`monster.facing` already exist (`entity-ai.js:152,163,197,210`, `config.js:125`, `floor-generator.js:293`), so the engine is ready for directional art — the renderer just ignores it beyond the eye offset.

### 1.3 What already works and must be preserved

- `image-rendering: pixelated` is already on the canvas element (`base.css:184`).
- `CONFIG.GRID_SIZE = 64` and the `u = size / 32` convention are a clean integer-scale seam.
- The DOM HUD/menus already use real illustrated assets (OpenMoji SVGs); `HUDManager.renderItemIcon` is unit-tested to an exact `<img>` string (`html/tests/app-modules.test.mjs:31`) — **do not touch HUD icons in the sprite pass**.
- `MONSTER_RENDERERS`, `TILE_RENDERERS`, `ITEM_RENDERERS`, `WEAPON_RENDERERS` are already polymorphic dispatch tables, consistent with the data-driven rule in `docs/engineering/agents.md §2.3`.

---

## 2. Production approach — recommendation

### 2.1 Recommendation: **authored sprite definitions as data (option b)**, pre-rendered and blitted

Ship upgraded art as **indexed-pixel matrices in JSON** under `html/assets/sprites/`, with a named palette per actor. At boot (or lazily), the renderer rasterises each frame once into an offscreen canvas; the 60 FPS loop only blits. Commit a deterministic **PNG preview export** alongside the JSON so reviewers see the actual image in git.

Why this is the right call for Lokarta specifically:

- **Preserves the zero-backend / no-bundler invariant.** Pure ES Modules + `<canvas>`. Nothing is fetched at runtime; the matrices are static JSON imported with `with { type: 'json' }`, exactly like `html/data/index.js` already does. Works from `file://` today (no image decode/CORS race) and from any static host.
- **Reviewable in git.** The art is text; `git diff` shows the exact pixel change. The committed PNG preview under `docs/art/preview/` gives the visual review that a binary-only pipeline loses.
- **Native-testable.** The matrices, palettes, frame names, outline pass and contrast rule are all pure functions over arrays — no canvas required in `node --test`. This keeps the 104/104 baseline meaningful.
- **Fits the golden rule.** `docs/engineering/agents.md §2` mandates data-driven dispatch with graceful fallbacks. Sprite definitions extend that pattern; a new monster is "catalog entry + sprite file," never new hardcoded logic.
- **Palette-first, so variants are free.** `elite_cultist` becomes a documented palette + silhouette variant (gold trim + horns) rather than a copy with a different fill; per-tier tinting and hit-flash tinting become palette operations, not code.
- **Integer scaling is enforced by construction.** `SCALE = GRID_SIZE / 32` is a positive integer today (×2); a `drawImage` blit with `imageSmoothingEnabled = false` yields crisp pixels.

### 2.2 Options considered

| Option | Pros | Cons | Verdict |
| :-- | :-- | :-- | :-- |
| **(a) Authored PNG spritesheets** under `html/assets/sprites/`, `drawImage` + nearest-neighbour | Industry-standard pixel art; smallest runtime code; best hand-craft feel | Binary, not diffable; `node --test` cannot validate content (only existence); needs a separate asset-load race/`file://` strategy; palette variants duplicated per entity; no in-repo provenance for the outline/contrast gates | **Rejected as the primary path.** Acceptable later as an *export*, not the source of truth |
| **(b) Authored sprite definitions as data** (pixel matrices / indexed palette), rendered procedurally | Diffable, testable, offline-safe, data-driven, palette variants free, integer scaling built in | Verbose matrices; needs a one-time pre-render cache for 60 FPS; canvas API needed at runtime (not in tests) | **Recommended** |
| **(c) Deterministic in-repo generator emits assets** | Reproducible; great for large volumes; single source for tiles+actors | Adds a build/generation step and a second source of truth; generated PNGs reintroduce (a)'s review/test problems; overkill for 9 actors | **Rejected for now.** Can be layered on later *without changing the runtime contract*: the generator can emit the same JSON schema |

### 2.3 The one concession to (c): a deterministic PNG preview export

To satisfy "reviewers must be able to see the art files in git" without trusting a build step, add an **optional, dependency-free** exporter:

- `tools/render-sprite-preview.mjs` — Node-only, uses built-in `zlib` to encode PNG, reads the JSON matrices, applies the same outline pass and palette, writes one PNG per actor (and one combined sheet) to `docs/art/preview/`.
- The export is **committed**. A native test re-runs the exporter into a temp dir and byte-compares against the committed PNGs; a mismatch fails the suite. This makes drift impossible and keeps the invariant: the app itself never runs the exporter.

This gives us both worlds — text source of truth in `html/`, and inspectable images in `docs/` — with no npm dependency and no runtime fetch.

### 2.4 File layout (exact)

```
html/assets/sprites/
  manifest.json                 # actor id -> file, native size, required frames
  index.js                      # ES-module barrel: SPRITE_CATALOG, SPRITE_MANIFEST
  vocations/
    magician.json
    archer.json
    fighter.json
    paladin.json
  monsters/
    giant_rat.json
    crypt_skeleton.json
    shadow_cultist.json
    elite_cultist.json
    abyssal_overlord.json
docs/art/preview/
  magician.png … abyssal_overlord.png
  sheet.png                     # optional contact sheet for QA
tools/render-sprite-preview.mjs # optional exporter (Node-only, zero deps)
```

`html/data/*.json` remains the home of **game rules**; `html/assets/sprites/` is **art data**. Optionally add `"spriteId"` to `vocations.json` / `monsters.json` entries (defaulting to the catalog key) so the link is explicit and catalog-driven.

### 2.5 Sprite file schema (normative)

```jsonc
{
  "id": "magician",
  "kind": "vocation",                  // "vocation" | "monster"
  "native": { "w": 32, "h": 32 },      // native pixel canvas
  "anchor": { "x": 16, "y": 30 },      // native point that touches the ground (feet)
  "palette": {                         // single-char keys; "." is always transparent
    ".": null,
    "0": "#0b0d12",                    // outline (auto-applied; see §3.4)
    "a": "#3a1c5e", "b": "#5c2d91", "c": "#7a3cb8", "d": "#a06fd6",
    "e": "#a67c00", "f": "#ffd700", "g": "#fff2a8",
    "h": "#e8b98a", "i": "#c98f5c",
    "j": "#6b4423", "k": "#a06a3a",
    "l": "#44ccff", "m": "#ffffff",
    "n": "#241033"
  },
  "frames": {                          // each frame = "h" strings of "w" palette chars
    "idle_down":    [ "................", "....", "..." ],
    "idle_up":      [ "..." ],
    "idle_side":    [ "..." ],
    "walk_down_0":  [ "..." ], "walk_down_1": [ "..." ],
    "walk_up_0":    [ "..." ], "walk_up_1":   [ "..." ],
    "walk_side_0":  [ "..." ], "walk_side_1": [ "..." ],
    "attack_down_0":[ "..." ], "attack_down_1":[ "..." ], "attack_down_2":[ "..." ],
    "attack_up_0":  [ "..." ], "attack_up_1":  [ "..." ], "attack_up_2":  [ "..." ],
    "attack_side_0":[ "..." ], "attack_side_1":[ "..." ], "attack_side_2":[ "..." ],
    "hit_down":     [ "..." ], "hit_up": [ "..." ], "hit_side": [ "..." ],
    "death_0":      [ "..." ], "death_1": [ "..." ], "death_2": [ "..." ], "death_3": [ "..." ]
  },
  "animations": {
    "idle":   { "down": ["idle_down"], "up": ["idle_up"], "side": ["idle_side"], "frameMs": null, "advanceOn": "timer" },
    "walk":   { "down": ["walk_down_0","walk_down_1"], "up": ["walk_up_0","walk_up_1"], "side": ["walk_side_0","walk_side_1"], "frameMs": null, "advanceOn": "step" },
    "attack": { "down": ["attack_down_0","attack_down_1","attack_down_2"], "up": ["attack_up_0","attack_up_1","attack_up_2"], "side": ["attack_side_0","attack_side_1","attack_side_2"], "frameMs": 90, "advanceOn": "timer" },
    "hit":    { "down": ["hit_down"], "up": ["hit_up"], "side": ["hit_side"], "frameMs": 120, "advanceOn": "timer" },
    "death":  { "down": ["death_0","death_1","death_2","death_3"], "up": ["death_0","death_1","death_2","death_3"], "side": ["death_0","death_1","death_2","death_3"], "frameMs": 120, "advanceOn": "timer" }
  }
}
```

Rules:

- `frames` row count **must equal** `native.h`; every row length **must equal** `native.w`.
- Palette keys are single characters; `"."` is transparent; `palette` has **≤ 16 entries** (including outline). Every non-`.` char used in a frame must exist in `palette`.
- `anchor` is where the sprite meets the ground; the renderer bottom-anchors on it, it is not necessarily `h-1`.
- `animations.death` reuses the `down` frames for `up`/`side` (collapse is non-directional).
- `advanceOn: "step"` means the walk frame index is incremented by the movement system when the actor actually changes tile, so footfalls sync with movement regardless of `moveCadence`.

### 2.6 Renderer pre-render & blit (normative shape)

```
SCALE = CONFIG.GRID_SIZE / SPRITE_NATIVE        // 64 / 32 = 2 (must be a positive integer)

renderFrame(spriteDef, state, dir, frameIndex, flipX):
  a) resolve frame id from spriteDef.animations[state][dir][frameIndex % len]
  b) rows = spriteDef.frames[frameId]
  c) pixels = parseFrame(rows, spriteDef.palette)          // w*h RGBA array, pure fn
  d) pixels = applyOutline(pixels, palette.outline)        // 4-neighbour dilate, pure fn
  e) cacheKey = `${spriteDef.id}|${state}|${dir}|${frameIndex}|${flipX}|${SCALE}`
  f) if cache miss: rasterise pixels at 1:1 into an offscreen canvas, then drawImage
     to a SCALE-sized canvas with imageSmoothingEnabled = false (or bake the ×SCALE
     nearest-neighbour expansion into the cached canvas)
  g) return the cached canvas
```

`parseFrame` / `applyOutline` / palette lookups are pure functions and are the unit-test seam. The cache is a `Map`; caches are built lazily per (id,state,dir,frame,flip,scale). At the current content volume (9 actors × 25 frames) the whole cache is < 4 MB.

Blit placement in the tile:

```
const nw = spriteDef.native.w * SCALE;
const nh = spriteDef.native.h * SCALE;
const dx = screenX + (CONFIG.GRID_SIZE - nw) / 2;                 // centred
const dy = screenY + CONFIG.GRID_SIZE - nh;                       // bottom-anchored
// ground shadow ellipse centre = (screenX + GRID/2, screenY + GRID * 0.82)
```

---

## 3. Style bible

### 3.1 Native resolution & scaling

| Surface | Native px | On-screen at 64 px grid (×2) | Notes |
| :-- | --: | --: | :-- |
| Tiles | 32×32 | 64×64 | Tiles stay procedural this pass; target the same 32 px native grid when upgraded |
| Actors (vocations + monsters except boss) | 32×32 | 64×64 | Body target 18–24 px wide × 26–30 px tall; feet at native `y = 30` |
| Boss (`abyssal_overlord`) | 48×48 | 96×96 | Body 36–46 px wide, feet at native `y = 46`; may overhang neighbours by design |
| UI/HUD | DOM/OpenMoji | — | Out of scope; keep as-is |

- **Scale is integer only.** `SCALE = GRID_SIZE / 32`; assert `Number.isInteger(SCALE) && SCALE >= 1`. If `GRID_SIZE` ever changes to a non-multiple of 32, snap to `Math.max(1, Math.floor(GRID_SIZE / 32))` and centre with an integer offset.
- **No fractional coordinates.** All drawing math is integer in native space, then scaled by the integer `SCALE`.
- **Nearest-neighbour only.** `ctx.imageSmoothingEnabled = false` before any scaled blit. Do not rely on the CSS `image-rendering` property for in-canvas scaling.
- **1 native px = 1 art pixel.** Never draw a "half pixel" to fake a curve; use a stair-step.

### 3.2 View & silhouette

- **View:** top-down 3/4 oblique. Bodies are foreshortened (feet at the bottom edge, head slightly forward/enlarged). This matches the board style and the existing top-down tile read.
- **Silhouette first.** Every actor must be identifiable from the black shape alone at 32×32, then at 16×16. Run the silhouette test in §7 before adding interior detail.
- **Silhouette budget:**
  - Rat: low, long, horizontal (quadruped + tail).
  - Skeleton: thin, tall, narrow shoulders, visible ribcage negative space.
  - Shadow Cultist: robed bell/cone, deep hood, one hand casting.
  - Elite Cultist: robed cone **plus** two horns and broad pauldrons (taller, wider top than base) — must differ from Shadow Cultist by shape, not only hue.
  - The Spire Warden: massive horned guardian, wide shoulders, claws, crown silhouette.
  - Magician: tall pointed hat + tapered robe (cone-on-cone).
  - Archer: lean, hood + back quiver, bow arc held forward.
  - Fighter: broad shoulders, crest helm, shield + broadsword.
  - Paladin: helm with cross/crown, tabard, warhammer + shield.
- **Ground contact:** a shared, flattened ellipse shadow under every actor (`rgba(0,0,0,0.4)`, `size/3 × size/6`), drawn before the sprite. No per-actor baked shadow.

### 3.3 Palette rules (SNES-limited)

- **≤ 16 colors per actor**, including outline.
- **Every value is a project master-palette hex.** No ad-hoc hex in a sprite file. When a refined hex is adopted it is written back to `vocations.json.renderTheme` / the master palette so there is one source of truth.
- **Ramps of 3 (shadow → base → highlight)** per material, plus at most one rim. Example: robe `#3a1c5e` / `#5c2d91` / `#7a3cb8` + rim `#a06fd6`.
- **≤ 5 hues per actor** (skin/metal/leather/cloth/eye glow).
- **No gradients, no partial alpha** inside actor art. Alpha is reserved for effects (projectiles, particles, the light shroud).
- **Dither:** allowed only as a 2×2 checker between **adjacent ramp colors** for one transition per material (cloth fold, ambient occlusion). Never dither against the outline, never use a random dot pattern.

### 3.4 Outline rule

- A **1 native px outline** is applied automatically as a post-step: any transparent pixel with a non-transparent 4-neighbour becomes the outline color.
- Outline color: `#0b0d12` (matches `tile_themes.wall.border`, near-black).
- The outline defines detail interiors (arms vs torso, ribs, horn edges). Because the floor is also dark, the outline does **not** provide floor separation on its own — the **rim** (§3.5) does.
- Anti-aliasing is forbidden: no `globalAlpha` fade at silhouette edges, no `shadowBlur` on actor sprites.

### 3.5 Readability, contrast & color-independence

The dungeon floor is `#1a1c23` (L ≈ 0.0128). The darkness shroud (`renderLightMask`) then multiplies up to 0.90 alpha of `#050608` toward the light edge. Both effects crush dark art. Therefore:

1. **Rim rule (required):** every actor includes at least one rim/highlight color with **`CR ≥ 3:1`** against `#1a1c23`. Recommended rims: Magician `#a06fd6` (4.57), Archer `#46c96e` (7.84), Fighter `#94a3b8` (6.52), Paladin `#f59e0b` (7.79), Skeleton `#dcdde1` (12.3), Rat belly `#8a6a4a` (3.38), Cultist eye/rim `#a5b4fc`/`#8b5cf6`, Boss `#dc2626` (3.46) + light-gray horns.
2. **Dominant fill rule:** dominant fill **`CR ≥ 2:1`** (the placeholder Magician at 1.88 and Fighter at 2.21 are the boundary cases; lift Magician robe base toward `#6a37a8` and keep Fighter's `#94a3b8` rim to clear the bar). Where a fill must stay dark for mood (Cultists, Boss), a **bright rim + glow** carries the silhouette.
3. **Color-independence:** no two actors may share a silhouette, and no required gameplay distinction may be encoded by hue alone. Specifically `shadow_cultist` vs `elite_cultist` must differ in **shape** (horns, pauldrons, height) and carry a non-color cue (gold `#facc15` trim and a heavier stance). The `elite_cultist` must be identifiable in greyscale.
4. **Reduced motion:** idle animation is static (no breathing loop) by default; walk/attack/hit/death are short. Honor a `prefers-reduced-motion` check in the renderer: if set, idle stays frame 0 and hit-flash is a single static tint rather than a shake.

### 3.6 Tier palettes & contrast against `tile_themes.json`

`biomes.json` defines the light color per tower tier; `tile_themes.json` defines the base tile palette. Actors must read against **every** tower-tier tint, not just the Gatehouse.

| Tier | Floors | Light tint (`biomes.lightColor`) | Actor guidance |
| :-- | :-- | :-- | :-- |
| The Gatehouse | 1–5 | `#ff8800` amber | Warm light; keep gold/yellow accents distinct from the amber tint (use cooler rims on gold-heavy actors) |
| The Hall of Banners | 6–10 | `#00d4ff` cyan | Magician `#44ccff` eyes/orb can blend with cyan light — add a white/pale core |
| The Bell Keep | 11–15 | `#a855f7` violet | Cultist violet robe can blend — the `elite_cultist` gets `#facc15` gold to separate |
| The Solar Gallery | 16–20 | `#ef4444` crimson | Boss red can blend — boss uses near-black + light-gray horns + bright `#fca5a5` eyes |

Tile base values the actors must sit against: wall `#2a2f3b` (top highlight `#444d61`), floor `#1a1c23` (grid `#12141a`, accent `#222530`), stairs `#152b3c` with orb `#88eeff`, door `#4a2f1b`. Every rim must retain ≥ 3:1 against the **lightest** of these it will overlap (floor `#1a1c23`) and remain visually distinct from the wall top highlight `#444d61`.

### 3.7 Animation cadence

| State | Frame count | Duration / cadence | Trigger |
| :-- | --: | :-- | :-- |
| idle | 1 (3 dirs) | static | default when not moving/acting |
| walk | 2 (3 dirs) | 1 frame **per tile step** (event-driven) | a successful move (`processMovementInput` / AI step) |
| attack | 3 (3 dirs) | 90 ms/frame (270 ms) | combat action executes |
| hit | 1 (3 dirs) | 120 ms, tint `#ff4d4d` at 0.35 alpha | damage taken |
| death | 4 (non-dir) | 120 ms/frame (480 ms), last frame holds 200 ms then fades | hp reaches 0 |

The render loop already runs at 60 FPS via `updateAnimations(dtMs)`; state transitions are set by the 10 Hz tick and combat events. Attacking takes priority over walk for its duration; walking resumes immediately after.

---

## 4. Per-vocation spec

Shared defaults: native 32×32; palette ≤ 16; outline `#0b0d12`; ramps map to `vocations.json.renderTheme` (`primary` → garment base, `secondary` → garment shade/hood, `accent` → trim/weapon/eyes glow); feet at native `y = 30`; frames exactly per §2.5.

### 4.1 Magician

- **Silhouette:** tall pointed hat + tapered robe (cone-on-cone); off-hand staff with a glowing orb; no shield.
- **Gear:** pointed wizard hat, long robe, sash, staff (main/off hand per equipment), small shoulder cape (`apprentice_cape` read).
- **Eye glow:** `eyeColor #44ccff`, add a `#ffffff` core so it survives cyan tier light.
- **Palette (extends `renderTheme`):**

| Role | Hex | Source |
| :-- | :-- | :-- |
| outline | `#0b0d12` | global |
| robe shadow | `#3a1c5e` | derived |
| robe base | `#5c2d91` | `renderTheme.primary` |
| robe light | `#7a3cb8` | `renderTheme.secondary` |
| robe rim | `#a06fd6` | **new** (CR 4.57) |
| trim shadow | `#a67c00` | derived |
| trim base | `#ffd700` | `renderTheme.accent` |
| trim highlight | `#fff2a8` | **new** |
| skin / skin shadow | `#e8b98a` / `#c98f5c` | global |
| staff wood / rim | `#6b4423` / `#a06a3a` | derived |
| orb / orb core | `#44ccff` / `#ffffff` | eyeColor + new |
| boots | `#241033` | derived |

- **Frames:** idle (3), walk (6), attack (9), hit (3), death (4). Attack = staff thrust; frame 1 plants the orb forward, frame 2 recoils.

### 4.2 Archer

- **Silhouette:** lean, hooded, back quiver breaking the shoulder line, bow arc held forward (the arc must read as a curve, not a blob).
- **Gear:** talisman (`ranger_talisman`), vampiric cloak (`hunter_leathers`), quiver (`hunter_quiver`), bow.
- **Eye glow:** `eyeColor #e9d8a6`.
- **Palette (extends `renderTheme`):**

| Role | Hex | Source |
| :-- | :-- | :-- |
| outline | `#0b0d12` | global |
| leather shadow | `#0b4a24` | derived |
| leather base | `#15803d` | `renderTheme.primary` |
| leather light | `#1fa34f` | **new** |
| leather rim | `#46c96e` | **new** (CR 7.84) |
| secondary shade | `#166534` | `renderTheme.secondary` |
| wood shadow / base / light | `#5c3609` / `#854d0e` / `#b06a1e` | `renderTheme.accent` + derived |
| arrow fletching | `#e9d8a6` | eyeColor |
| skin / skin shadow | `#e8b98a` / `#c98f5c` | global |
| bowstring | `#ffffff` | new |

- **Frames:** idle (3), walk (6), attack (9), hit (3), death (4). Attack = draw → release → follow-through (the draw frame is the readable one).

### 4.3 Fighter

- **Silhouette:** broad shoulders, crested helm, shield on off-hand, broadsword raised.
- **Gear:** plate (`plate_armor`), iron helm (`iron_helm`), broadsword (`tempered_broadsword`), shield (`vanguard_shield`).
- **Eye glow:** `eyeColor #f87171` (a hot glare inside the helm).
- **Palette (extends `renderTheme`):**

| Role | Hex | Source |
| :-- | :-- | :-- |
| outline | `#0b0d12` | global |
| steel shadow | `#2b3648` | derived |
| steel base | `#475569` | `renderTheme.primary` |
| steel light | `#64748b` | **new** |
| steel rim | `#94a3b8` | `renderTheme.accent` (CR 6.52) |
| dark plate | `#334155` | `renderTheme.secondary` |
| leather straps | `#5b4636` | new |
| blade / blade edge | `#cbd5e1` / `#ffffff` | new |
| shield boss | `#b45309` | new |

- **Frames:** idle (3), walk (6), attack (9), hit (3), death (4). Attack = overhead swing (use the existing `swoosh` in `canvas-renderer.js:285` for the arc VFX; the sprite supplies the pose).

### 4.4 Paladin

- **Silhouette:** helm with cross/crown, tabard over plate, warhammer + shield; a small halo accent (`drawPlayer` currently draws an ellipse halo for paladin — keep the halo as an **effect**, not baked into sprite pixels).
- **Gear:** `consecrated_warhammer`, `aegis_shield`, `plate_armor`, `holy_crown`.
- **Eye glow:** `eyeColor #38bdf8`.
- **Palette (extends `renderTheme`):**

| Role | Hex | Source |
| :-- | :-- | :-- |
| outline | `#0b0d12` | global |
| azure shadow | `#015a8a` | derived |
| azure base | `#0284c7` | `renderTheme.primary` |
| azure light | `#38a8e0` | **new** |
| azure rim | `#7cc9ee` | **new** |
| secondary shade | `#0369a1` | `renderTheme.secondary` |
| gold shadow / base / light | `#a65e00` / `#f59e0b` / `#ffd66b` | `renderTheme.accent` + derived (CR 7.79 base) |
| tabard cream | `#f1faee` | new |
| halo effect | `#ffd700` (alpha) | effect layer, not palette |

- **Frames:** idle (3), walk (6), attack (9), hit (3), death (4). Attack = hammer raise → smite → recover; the halo pulses on attack.

---

## 5. Per-monster spec

Shared defaults as §4. Monster scales/spawns come from `monsters.json` and `floor-generator.js`; art must not change stats. Frames: idle (3), walk (6), attack (9), hit (3), death (4) unless noted. Monster `facing` already exists (`entity-ai.js`), so directional frames are immediately usable.

### 5.1 `giant_rat` — Giant Rat (Gatehouse, chase)

- **Silhouette:** low horizontal quadruped, long curved tail, large ears, snout.
- **Palette:** outline `#0b0d12`; fur shadow `#2e1f14`; fur base `#5a3d28`; fur light `#8a6a4a` (belly, CR 3.38); nose/tail `#d98a8a`; teeth `#f1faee`; eye `#ff2222` + `#ffffff` pupil glint.
- **Frames:** walk = 2-frame scurry (legs alternate); attack = lunge (windup → snap forward → recover); death = 4-frame flatten+skid. Rat has no long attack reach, keep attack frames compact.
- **Readability lift:** base fur is 1.70:1; the light belly rim carries the silhouette. Draw the rat **after** the light mask so it reads at the light edge.

### 5.2 `crypt_skeleton` — Bone Sentry (Gatehouse/Hall of Banners, chase)

- **Silhouette:** thin biped, narrow shoulders, visible ribcage negative space, skull with dark sockets.
- **Palette:** outline `#0b0d12`; bone shadow `#8f949c`; bone base `#dcdde1`; bone highlight `#ffffff`; socket `#1b1e24`; eye glow `#00ffff`; tattered belt `#5b4636`; rusty blade `#b45309`/`#78350f`.
- **Frames:** walk = 2-frame shamble; attack = 3-frame downward slash; death = 4-frame collapse (bones settle, one frame with the skull detached).
- **Readability:** already 12.3:1; keep bone base bright and sockets dark for the "hollow" read.

### 5.3 `shadow_cultist` — Shadow Cultist (Hall of Banners+, standoff)

- **Silhouette:** robed bell/cone, deep hood with no visible face, one hand raised (caster), short dagger at the belt.
- **Palette:** outline `#0b0d12`; robe shadow `#312e81`; robe base `#6366f1` (**lifted from `#1e1b4b`**, CR 3.75); robe highlight `#a5b4fc`; hood interior `#0b0d26`; eye glow `#c084fc` + `#ffffff` core; belt `#5b4636`; dagger `#94a3b8`.
- **Frames:** walk = 2-frame glide (hem sway); attack = 3-frame cast (charge orb → release → recover); death = 4-frame collapse into a pooling shadow.
- **Readability lift (critical):** the placeholder `#1e1b4b` is 1.05:1. The lifted base + violet eye glow + pale rim is mandatory.

### 5.4 `elite_cultist` — Elite Cultist (Bell Keep+, standoff)

- **Silhouette (must differ by shape from Shadow Cultist):** taller, wider at the shoulders than the base, **two-curved-horn hood**, broad pauldrons, gold trim; holds a censer/orb.
- **Palette:** outline `#0b0d12`; robe shadow `#6d28d9`; robe base `#8b5cf6` (CR 3.85); robe highlight `#c4b5fd`; hood interior `#1e1b4b`; **elite gold** `#facc15` trim + `#a16207` shadow (the non-color cue); horns `#1c1917`/`#57534e`; eye glow `#e9d5ff`.
- **Frames:** walk = 2-frame glide (heavier, 3 px taller silhouette); attack = 3-frame ritual cast (both hands, larger projectile VFX); death = 4-frame collapse with horns dropping.
- **Readability:** distinguishable from `shadow_cultist` in greyscale by horns + pauldrons + height; never color-only.

### 5.5 `abyssal_overlord` — The Spire Warden (Floor 20 boss, chase)

- **Native canvas:** **48×48** (blit ×2 → 96×96); anchor `{ x: 24, y: 46 }`.
- **Silhouette:** massive horned demon, wide shoulders, clawed arms, a crown silhouette (matches `svgCode 1F451`); body should overflow the tile slightly to feel huge.
- **Palette:** outline `#0b0d12`; hide shadow `#450a0a`; hide base `#7f1d1d`; hide light `#b91c1c`; **scarlet highlight `#dc2626`** (CR 3.46); horn/claw shadow `#0c0a09`; horn base `#292524`; horn light `#57534e`; crown gold `#a16207`/`#facc15`; eye `#ef4444` + `#fca5a5` core.
- **Frames:** idle (3, slow menacing rise), walk (6, heavy stride), attack (9, two-hand slam + roar frame), hit (3, no flinch on big frames but a glow pulse), **death = 6 frames** (480–720 ms: stagger → kneel → collapse → dissolve). Boss death plays under the existing Floor-20 clear (`app-controller.js` boss branch) before the victory modal.
- **Readability:** placeholder `#450a0a` is 1.04:1. The near-black hide + light-gray horns + `#dc2626`/`#fca5a5` glow is mandatory; boss is drawn after the light mask so it stays legible at the light edge.

---

## 6. Integration plan

### 6.1 New/changed modules

| Module | Change | Must not change |
| :-- | :-- | :-- |
| `html/assets/sprites/` (new) | JSON sprite definitions + `manifest.json` + `index.js` barrel exporting `SPRITE_CATALOG` / `SPRITE_MANIFEST` | — |
| `html/app/sprite-renderer.js` | Add `SpriteRenderer.drawActor(ctx, actor, sx, sy, opts)`; rewrite `drawPlayer`/`drawMonster` as thin resolvers that call `drawActor` when a sprite exists, else the **existing** procedural fallback (keep `MONSTER_RENDERERS`, `TILE_RENDERERS`, `ITEM_RENDERERS`, `WEAPON_RENDERERS` intact) | `drawTile`, `drawItem`, `drawFacingEyes` public signatures (tests at `app-modules.test.mjs:14–19`) |
| `html/app/canvas-renderer.js` | Reorder layers; pass animation state through; draw selection ring + health bar relative to the sprite box; draw projectiles after the mask | `screenToGrid`, camera math, tile/item culling (`if (!tile.isLit) continue`) |
| `html/app/app-controller.js` | Add per-actor `anim` state; update it in `updateAnimations(dtMs)`; trigger attack/hit/death from combat and AI results; spawn transient death effects instead of splicing immediate removal | 10 Hz tick order, `handleCombatResult` loot/XP/boss logic, `processMovementInput` collision |
| `html/data/vocations.json`, `html/data/monsters.json` | Optional additive `"spriteId"` field; refined `renderTheme` hexes if adopted | All stats, `nativeEquipment`, `lootTable`, `svgCode`, `eyeColor` semantics; `data-catalogs.test.mjs` assertions |
| `html/tests/sprite-assets.test.mjs` (new) | Data validation + pure-function tests (§7) | Existing tests must stay green |
| `tools/render-sprite-preview.mjs` + `docs/art/preview/*.png` (new, optional) | Deterministic PNG export committed for review | Not part of the app runtime/bundle |

### 6.2 Animation state contract

Add a presentation-only field (safe to omit from worker RPC; the renderer tolerates a missing `anim` by reading `facing` + a static idle frame):

```js
actor.anim = {
  state: 'idle' | 'walk' | 'attack' | 'hit' | 'death',
  dir:   'down' | 'up' | 'side',   // derived from `actor.facing`
  frame: 0,
  elapsedMs: 0,
  flipX: false,                     // true when facing === 'left'
  lockedUntilMs: 0,                 // attack/hit interrupt guard
};
```

Facing → dir mapping (one place, deterministic):

```
up    -> dir 'up',   flipX false
down  -> dir 'down', flipX false
right -> dir 'side', flipX false
left  -> dir 'side', flipX true
```

Update cadence:

- `updateAnimations(dtMs)` (60 FPS) advances `elapsedMs`, increments timer-driven frames (`attack`, `hit`, `death`), and clears `state` back to `idle`/`walk` when finished.
- The 10 Hz tick sets transitions: movement success → `walk` (and bumps `frame` by 1 per step); combat execute → `attack`; damage → `hit`; `hp <= 0` → `death`.
- `attack`/`hit`/`death` set `lockedUntilMs = now + duration` and take priority over `walk`.

### 6.3 Layer order (target)

Current order (`canvas-renderer.js:56–115`) is tiles → items → monsters → player → projectiles/particles → **light mask** → floating texts. Because the mask darkens entities, change to:

```
1. background fill
2. tiles (lit only)
3. ground items
4. world light: base darkness gradient + torch/spell aura + projectile illumination
5. transient death effects (actor layer)
6. ground shadows (all actors)
7. monsters (after mask; distance dim §6.4)
8. player
9. selection ring, monster health bar
10. projectiles + impact particles
11. floating combat text
```

Rationale: actors and projectiles should never be swallowed by the fog that is meant to hide *unexplored* space, not visible enemies. Tiles/items keep the fog so the world still reads as dark.

### 6.4 Legibility dim (keep the fog feel)

Actors are only rendered when `visible` (tile lit), but the mask falls off hard. In the new order, apply a distance dim to actors instead of the mask:

```
d       = distance(player, actor) / computePlayerRadius(player)   // 0..1+
dim     = clamp(1.0 - 0.35 * d, 0.65, 1.0)
ctx.globalAlpha = dim   // reset after
```

This guarantees the silhouette (and its rim) stays ≥ 0.65 alpha while distant actors still feel further away. Boss and boss health bar are exempt at `dim = 1.0`.

### 6.5 Layering vs shadow / health bar / LOS mask vs sprite box

- **Shadow:** procedural ellipse at `(sx + GRID/2, sy + GRID*0.82)` before the sprite; same for all actors (adds the missing monster contact shadow).
- **Health bar:** anchor to the sprite box top: `barY = dy - 6 * SCALE` (falls back to the current `cy - 16u` when using procedural art). Width can grow to `32 * SCALE` for the boss. Keep `#1e293b` track + `#ef4444` fill.
- **Selection ring:** centred on the sprite's **lower body/feet** (`(sx + GRID/2, dy - 8*SCALE)`), not the tile centre, so it rings the character. Keep `#ef4444` 2 px.
- **LOS mask:** never draw actors into the "unexplored" black (they are gated by `visible`/`isLit`); only apply the §6.4 dim.
- **Hit flash:** tint by drawing the cached frame, then `globalCompositeOperation = 'source-atop'` fill `rgba(255,77,77,0.35)` clipped to the sprite, or pre-render a red-shifted palette variant. Keep it 1 frame, 120 ms.

### 6.6 Avoiding regressions to tiles / items / HUD / lighting

- **Tiles/items:** untouched — `drawTile`/`drawItem` and their culling stay. No new asset load path.
- **HUD:** DOM/OpenMoji untouched; `HUDManager.renderItemIcon` exact-string test (`app-modules.test.mjs:31`) must keep passing.
- **Lighting:** `LightingSystem.updateLighting` and `computePlayerRadius` unchanged; only the **draw order** of the mask shifts, and the aura moves from inside `renderLightMask` ordering to the world-light step.
- **Worker/RPC:** `anim` is presentation-only and not persisted; no schema/RPC change. `persistSave` payloads unchanged.
- **Graceful fallback:** if `SPRITE_CATALOG[id]` is missing or a frame is absent, call the existing procedural renderer. This means the sprite pass can land incrementally, actor by actor, without breaking the game or tests.
- **Hot path:** no per-frame allocation in the render loop beyond the existing patterns; sprite frames are resolved from a `Map` cache and blitted with `drawImage`.

---

## 7. Verification criteria

### 7.1 Native tests (new `html/tests/sprite-assets.test.mjs`, plus existing suite)

1. **Manifest completeness.** For every key in `VOCATIONS_CATALOG` and `MONSTERS_CATALOG`, `SPRITE_MANIFEST.actors[id]` exists and resolves to a file that parses.
2. **Frame geometry.** For every frame: `rows.length === native.h` and every `row.length === native.w`.
3. **Palette integrity.** Palette has ≤ 16 entries; each value is `#rrggbb` (or `null` for `.`); every char used in every frame is a palette key (or `.`).
4. **Required states/dirs.** Each actor defines `idle`, `walk`, `attack`, `hit`, `death` with dirs `down`/`up`/`side` (death may alias `down`), and the frame counts of §4/§5.
5. **Outline pass (pure fn).** `applyOutline(pixels, outline)` produces a 1 px outline on every non-transparent/transparent 4-neighbour boundary; idempotent when re-applied.
6. **Determinism.** `parseFrame` + `applyOutline` called twice on the same input produce byte-identical arrays.
7. **Scale integrality.** `CONFIG.GRID_SIZE % SPRITE_NATIVE === 0` (asserts the ×2 blit is exact).
8. **Rim contrast.** For each actor, at least one palette entry has `CR >= 3.0` against `#1a1c23` (implements §3.5 numerically).
9. **Distinct silhouettes / non-color cue.** The alpha masks of `shadow_cultist` and `elite_cultist` idle frames are **not identical**, and `elite_cultist` includes its gold trim color — a code-level guard for color-independence.
10. **Preview drift (if the preview export ships).** Re-run `tools/render-sprite-preview.mjs` into a temp dir; byte-compare to `docs/art/preview/`; mismatch = fail.
11. **Fallback safety.** `SpriteRenderer.drawPlayer`/`drawMonster` with a fake 2D-context spy and an unknown id do not throw and call the procedural fallback.
12. **Regression baseline.** The full suite still reports **104+ tests / 0 fail** (`node --test html/tests/*.test.mjs`).

Run: `node --test html/tests/*.test.mjs` from repo root.

### 7.2 QA / manual play checklist (browser)

- Serve `html/` (`./run.sh`, port 3000) and start a run per vocation; walk all four directions.
- **Silhouette:** at 100% zoom each actor is identifiable from its black silhouette at 64 px and still at ~32 px.
- **Facing:** walk left mirrors right correctly; walk up/down use the correct frames; no reversed weapon hand.
- **Animation:** walk advances one frame per step; attack plays 3 frames on skill use and on Q/W melee; hit flashes once; death plays 4 frames then the entity is removed (no ghost health bar, no targeting).
- **Legibility:** actors are readable at the light perimeter in every tower tier; no actor is lost against `#1a1c23`; cultists and boss read against their tier tint.
- **Color-independence:** a greyscale screenshot still distinguishes `shadow_cultist` from `elite_cultist`.
- **No z-fighting:** health bar and selection ring sit above the sprite and below floating text; boss health bar scales with the boss.
- **Effects intact:** energy beam, swoosh, particles, and floating damage text still render and are not clipped by the mask.
- **Tiles/items/HUD:** unchanged from baseline; HUD icons still render.
- **Performance:** 60 FPS steady on a floor with a large monster count; no visible hitching on first sprite of each type (pre-render cache warm) and no GC sawtooth.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, idle is static and hit feedback is a static tint.

### 7.3 Catalog-diff acceptance

- Allowed: new `html/assets/sprites/**`, new `html/assets/sprites/index.js`, additive `spriteId` fields, refined `renderTheme` hexes in `vocations.json` **with the sprite palette updated in the same PR**, new tests, optional `tools/` + `docs/art/preview/`.
- Forbidden in this workstream: any change to monster/vocation **stats**, `lootTable`, `nativeEquipment`, abilities, encounter/dungeon numbers, or `CONFIG.GRID_SIZE`.

### 7.4 Definition of Done for LIV-10

1. All 9 actors have committed sprite definitions matching §4/§5, with palette, frames, anchors and native sizes.
2. `drawActor` + fallback wired; layer reorder applied; no regression in the 104-test baseline (extended suite green).
3. `node --test html/tests/*.test.mjs` passes, including `sprite-assets.test.mjs`.
4. No `html/` tile/item/HUD/lighting regression; HUD icon test unchanged.
5. Preview PNGs committed (if the exporter ships) and drift test green.
6. A short evidence comment on LIV-10 with the test output and a before/after screenshot.

---

## 8. Recommended follow-ups (out of scope here)

These are deliberately excluded to keep this spec to "4 vocations + monsters," but they will be visible inconsistencies once actors become pixel art:

1. **Tile & item pixel pass.** The flat procedural floor/wall/door/stairs and the vector item glyphs will clash with pixel-art actors. Recommended next: a second spec covering `tile_themes.json`-driven 32×32 native tiles and item icons using the same JSON matrix pipeline, per tier.
2. **OpenMoji `svgCode` cleanup.** Either add the missing `1F407` (rat) and `1F480` (skeleton) SVGs or stop treating `svgCode` as renderer-ready for monsters.
3. **Fix docs drift.** `docs/engineering/architecture.md §6.1` claims `prevX/prevY` interpolation that does not exist; either implement it (recommended, for smoother 10 Hz movement) or correct the docs.
4. **HUD sprite parity.** Replace OpenMoji item icons in the HUD with the same pixel-art style once actors ship, updating `app-modules.test.mjs:31` deliberately.

Recommended owner: Tech Lead (route 1 and 4 as engineering issues; 2 and 3 are small doc/asset fixes). This document does not create those issues — the CEO/board can decide sequencing after LIV-10 lands.

---

## Appendix A — Master palette seed

Named entries the sprite files reference. Extend only by adding here first.

| Name | Hex | Use |
| :-- | :-- | :-- |
| outline | `#0b0d12` | all outlines |
| ink | `#050608` | darkest shadow (matches bg) |
| steel-shadow / base / light / rim | `#2b3648` / `#475569` / `#64748b` / `#94a3b8` | Fighter plate |
| arcane-shadow / base / light / rim | `#3a1c5e` / `#5c2d91` / `#7a3cb8` / `#a06fd6` | Magician robe |
| forest-shadow / base / light / rim | `#0b4a24` / `#15803d` / `#1fa34f` / `#46c96e` | Archer leather |
| azure-shadow / base / light / rim | `#015a8a` / `#0284c7` / `#38a8e0` / `#7cc9ee` | Paladin plate |
| gold-shadow / base / light | `#a65e00` / `#f59e0b` / `#ffd66b` | Paladin/Herald gold |
| bone-shadow / base / highlight | `#8f949c` / `#dcdde1` / `#ffffff` | Skeleton |
| cult-shadow / base / light | `#312e81` / `#6366f1` / `#a5b4fc` | Shadow Cultist |
| elite-shadow / base / light | `#6d28d9` / `#8b5cf6` / `#c4b5fd` | Elite Cultist |
| abyss-hide-shadow / base / light / scarlet | `#450a0a` / `#7f1d1d` / `#b91c1c` / `#dc2626` | Spire Warden |
| horn-shadow / base / light | `#0c0a09` / `#292524` / `#57534e` | Horns/claws |
| skin / skin-shadow | `#e8b98a` / `#c98f5c` | Faces/hands |
| bone-light / steel-blade | `#f1faee` / `#cbd5e1` | Teeth/edges |
| eye-cyan / eye-amber / eye-blue / eye-red | `#44ccff` / `#e9d8a6` / `#38bdf8` / `#f87171` | Vocation eyes |
| glow-violet / glow-gold / glow-crimson | `#c084fc` / `#facc15` / `#ef4444` | Monster/effect glow |

## Appendix B — Worked frame example (schema shape)

A 24-wide × 12-tall excerpt is shown only to pin the row/char format; the real frames are full `native.h × native.w`.

```jsonc
{
  "id": "giant_rat",
  "kind": "monster",
  "native": { "w": 32, "h": 32 },
  "anchor": { "x": 16, "y": 30 },
  "palette": {
    ".": null,
    "0": "#0b0d12",
    "a": "#2e1f14", "b": "#5a3d28", "c": "#8a6a4a",
    "d": "#d98a8a", "e": "#f1faee", "f": "#ff2222", "g": "#ffffff"
  },
  "frames": {
    "idle_side": [
      "........ggggg...........",
      ".......gfffffg..........",
      "......gffbbbbff.........",
      ".....gbbbbbbbbbg........",
      "....abbbbbbbbbbba.......",
      "....abbbbbbbbbbba.......",
      "....aabbbbbbbbbaa.......",
      ".....aaaaaaaaaad........",
      "..........ddd..dd.......",
      "...........dd...dd......",
      "........................",
      "........................"
    ]
  }
}
```

(Indicative only — the implementer authorises the final pixels; schema, sizes, palette roles and frame names are binding.)

---

## Appendix C — Contrast math (method)

Relative luminance per WCAG 2.x:

```
c = channel / 255
c' = c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
L  = 0.2126 * R' + 0.7152 * G' + 0.0722 * B'
CR = (L_lighter + 0.05) / (L_darker + 0.05)
```

Worked example — Magician rim `#a06fd6` vs floor `#1a1c23`:

```
#1a1c23: R'=0.0103, G'=0.0132, B'=0.0168  -> L = 0.0128
#a06fd6: R'=0.3518, G'=0.1590, B'=0.6725  -> L = 0.2371
CR = (0.2371 + 0.05) / (0.0128 + 0.05) = 4.57:1   ✅ (>= 3:1)
```

The §1.2 table and §3.5 thresholds use this same method. Values are approximate to ±0.05 and are used as design gates, not as a certification.
