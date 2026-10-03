# Lokarta: Room Props & Themed Artwork Spec (D4)

**Issue:** [LIV-19](/LIV/issues/LIV-19) (D4) · **Parent:** [LIV-17](/LIV/issues/LIV-17) · **Owner:** Designer · **Audience:** Tech Lead / E10 ([LIV-20](/LIV/issues/LIV-20)), board (browser verification)

**Wave 3 spec.** Extends [docs/art-direction-tower.md](art-direction-tower.md) §3.3 (castle motifs) and closes its §9 residual risk #1 ("No per-level *furniture* set"). `art-direction-tower.md` remains authoritative for tile themes, keys/chests/gated doors, stair material, and the castle wall motifs (sconce/banner/window); [docs/art-direction.md](art-direction.md) remains authoritative for actors + vocations. This document is authoritative for **room furniture props, floor-decal decor, prop placement, and chest-against-wall placement (LIV-17 item 3)**.

This converts LIV-17 item 2 ("add additional artwork / different tile types in the various rooms, e.g. tables, candelabras, other themed artwork") into buildable, data-driven art plus an extension to the deterministic floor generator. It commits the design-system artifacts E10 integrates directly, and names them by catalog entry, token, component, and sprite path.

---

## 0. Decisions at a glance (the spec, compressed)

| # | Item | Decision |
| :-- | :-- | :-- |
| 1 | Art pipeline | Same authored-indexed-pixel JSON pipeline as `art-direction-tower.md` §2/§4. **32×32 native**, integer scale `SCALE = GRID_SIZE/32`, nearest-neighbour. No bundler, no runtime fetch, no new npm package. |
| 2 | Two new prop classes | `kind: "prop"` (furniture: freestanding or wall-hugging) and `kind: "decor"` (floor decals drawn under items). Both live in `manifest.json.props` and `props.js`. |
| 3 | Roster | **9 furniture props + 1 decal**: `prop_table`, `prop_crate`, `prop_barrel`, `prop_brazier`, `prop_candelabra`, `prop_bookshelf`, `prop_sarcophagus`, `prop_altar`, `prop_throne`, `decor_rug`. |
| 4 | Per-level sets | New `props` block on every `tile_themes.json` `levels[n]` entry: `{ set, decor, focal, density, maxPerRoom, wallBias }`. Variation is data only; no per-level code branches. |
| 5 | Placement roles | New `tower_levels.json` `propPolicy` block keyed by room role/tier: counts, arrival-room cap, key-room focal, boss-room fixed set, chest spacing. |
| 6 | Placement safety | Props are placed **last**, after chests/monsters/items/jitter, scanning the generator's existing `occupied` set — they can never take a chest/key/monster/stair/spawn/entry/pillar/item tile. |
| 7 | Non-blocking | Props are **render-only**. No change to `GridMap`, `isWalkable`, monster AI, or `validateFloorConnectivity` ⇒ the D2 §10 no-soft-lock / reachability guarantee is untouched. |
| 8 | Wall vs free | `class: "wall"` props require ≥1 orthogonal `WALL` neighbour (walls and pillars count); `class: "free"` props may sit anywhere eligible. Theme `wallBias` controls the mix. |
| 9 | Bounded light | `prop_brazier` emits one ambient light node (`radius 2.5`, `color = theme.features.flame`), **max 2 per floor**. Candles/flames are static art, no per-frame light. |
| 10 | Chest against wall (item 3) | Chest role scans the **full room bounds** (not the interior inset) with wall-adjacency ordered first, preferring a `WALL` tile directly above (north). One chest per room is unchanged; chest tiles stay walkable. |
| 11 | Assets | Authored JSON under `html/assets/sprites/props/*.json` and `…/decor/*.json`; registered in `manifest.json.props`, exported via `props.js`. OpenMoji stays DOM-only (never loaded on canvas); optional `svgCode` must reference a committed SVG. |
| 12 | Validator / preview / tests | `tools/validate-prop-assets.mjs`, `tools/render-sprite-preview.mjs` (`props.png`), `html/tests/sprite-assets.test.mjs`, and a new `html/tests/room-props.test.mjs` enforce this contract. |
| 13 | Determinism | Props consume the generator's **existing seeded `rng` after monster jitter**; structure (tiles/gates/keys/stairs) stays seed-independent and byte-identical to pre-D4 output. Same `(level, seed)` ⇒ identical props. |

---

## 1. Design lenses applied

| Lens | Where it shapes this brief |
| :-- | :-- |
| **Core-loop clarity / player agency** | Furniture is decoration, never a gate. No prop can alter the copper→silver→gold→stair route, so the loop reads exactly as before; the rooms merely *read* as occupied space. |
| **Peak-End Rule** | Key rooms and the stair room get a deliberate **focal** prop (altar, brazier, sarcophagus, throne) so the reward/exit moment has a visual beat, not a uniform scatter. |
| **Von Restorff (isolation)** | The L5 boss room is the only room with a throne flanked by braziers; the gold-key room focal prop sits beside the gold chest. Unique objects pop from the field. |
| **Chunking / Hick's Law** | Exactly 4 prop ids per level, 1 focal per level. Small, learnable vocabulary; no choice or combat-parity difference from props. |
| **Jakob's Law / mental model** | Table = furniture, candelabra/brazier = light, bookshelf/sarcophagus/throne = wall furniture, rug = floor. Shapes map to universal room archetypes. |
| **Recognition over recall / Information scent** | Per-level prop sets reinforce the tier story already begun by wall palette + sconce/banner/window (Gatehouse = bare crypt furniture, Hall = banquet/books, Bell Keep = works/crates, Solar Gallery = gallery/altars, Crown Spire = throne). |
| **Color-independence (WCAG 1.4.1)** | Props use shape silhouette + position, not hue, to distinguish; every prop carries ≥1 highlight entry with ≥3:1 contrast vs the floor(s) it appears on (validated). |
| **Readability on a dark game** | Same rim rule as keys/chests: a bright edge keeps each prop legible against the ≤0.02-luminance tier floors and the light perimeter. |
| **Accessibility / reduced motion** | All props are single static frames. No tweens, no cloth motion, no flicker (honors `prefers-reduced-motion`). Props are decoration, so they add no timers, no hit targets, no focus traps. |
| **Information architecture / scanning** | Wall props line the room perimeter (F-pattern edge scan); free props break the empty middle; rugs anchor the room floor. Rooms read as places, not boxes. |
| **Ethics** | No dark patterns. Props are cosmetic only; no fake scarcity, no loot bait, no cross-sell, no hidden tolls. |

---

## 2. Prop catalog (normative)

All props are 32×32 native. Palette chars are per-file (≤16); the shared ramp below is the vocabulary. `anchor` is the blit origin convention used by the renderer.

**Shared furniture ramp** (each prop declares only its own subset):

| role | char | hex | source |
| :-- | :-- | :-- | :-- |
| outline | `0` | `#0b0d12` | `art-direction-tower.md` App. A (auto-outline) |
| wood shadow | `d` | `#3f2817` | chest palette |
| wood base | `e` | `#6b4423` | chest palette |
| wood light | `f` | `#8a5a2b` | chest palette |
| wood bright | `g` | `#c98a4a` | `tile_themes` stairs/features |
| stone shadow | `j` | `#33333a` | door frame |
| stone base | `k` | `#55555f` | door frame |
| stone light | `l` | `#6e6e7a` | door frame |
| stone bright | `m` | `#aab2bf` | silver base |
| iron base | `n` | `#4a4f57` | new |
| iron light | `o` | `#8a9099` | new |
| brass base | `b` | `#b87333` | copper base |
| brass highlight | `c` | `#e8a86a` | copper highlight |
| gold trim | `p` | `#e0a82e` | gold base |
| gold bright | `q` | `#ffe08a` | gold highlight |
| cloth accent | `r` | `#c0392b` | banner red (default; per-def may re-point) |
| flame outer | `s` | `#ffb347` | L1 features.flame |
| flame inner | `u` | `#ff6a00` | L5 features.flame |
| flame core | `t` | `#fff2d6` | copper glint |
| candle wax | `v` | `#e9e2cf` | new |

Furniture files live under `html/assets/sprites/props/`; the decal under `html/assets/sprites/decor/`. Each file: `{ id, kind, class, native:{w:32,h:32}, anchor:{x,y}, palette, frames:{ "idle": [ …32 rows of 32 chars… ] } }`.

| id | kind | class | anchor | appears on | silhouette (native extents) | bright rim (≥3:1) |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `prop_table` | prop | free | `{x:16,y:28}` | L2, L3, L4 | Rectangular top `x5..26, y8..14` (`f` top edge `g`); apron `y14..19` (`e`); legs `x7..9` & `x22..24, y19..28` (`d`); optional brass stud corners (`b`). | `g #c98a4a` |
| `prop_crate` | prop | free | `{x:16,y:28}` | L1, L2, L3 | Cube `x7..24, y8..27` (`f`), X-brace diagonals (`e`), metal corner brackets (`o`), plank seams (`d`). | `o #8a9099` |
| `prop_barrel` | prop | free | `{x:16,y:29}` | L1, L3 | Rounded body `x8..23, y6..28` (`e`), stave lines (`d`), two iron hoops `y12..13` & `y21..22` (`o`), top rim (`f`). | `o #8a9099` |
| `prop_brazier` | prop | free | `{x:16,y:28}` | L3, L5 | Bowl `x7..24, y16..23` (`n`), rim (`o`), 3 legs (`n`), flame `s/u/t` rising to `y4`. Emits light (§6). | `t #fff2d6` |
| `prop_candelabra` | prop | wall | `{x:16,y:29}` | L1, L2, L4, L5 | Foot `x12..19, y25..28` (`b`), shaft `x15..16, y12..25` (`b`), 3 arms to candles at `y6..12`, wax `v`, flames `s/u/t`. | `t #fff2d6` |
| `prop_bookshelf` | prop | wall | `{x:16,y:29}` | L2, L4 | Frame `x4..27, y4..28` (`e`), 3 shelf planks (`f`), spines in `r/g/m/b` (mixed 3–4 books per shelf), side rails (`d`). | `g #c98a4a` |
| `prop_sarcophagus` | prop | wall | `{x:16,y:29}` | L1 | Stone box `x4..27, y10..28` (`k`), lid bevel (`l`), carved band `y15..17` (`m`), corner chips (`j`). | `m #aab2bf` |
| `prop_altar` | prop | free | `{x:16,y:29}` | L4, L5 | Stepped base `x6..25, y20..28` (`k`), plinth `x9..22, y13..20` (`l`), gold trim (`p`), 2 candle flames `s/t` at `y8..13`, offering bowl (`b`). | `q #ffe08a` |
| `prop_throne` | prop | wall | `{x:16,y:29}` | L5 | High back `x8..23, y3..20` (`d`), seat `x9..22, y20..26` (`e`), arm rests (`f`), gold filigree (`p/q`), jeweled crest at `y5..8` (`r`, `t`). | `q #ffe08a` |
| `decor_rug` | decor | — | `{x:0,y:0}` | L2, L4, L5 | Full-tile mat inset `x2..29, y2..29`: field (`r` re-pointed to the level banner color), border 2 px (`p`/`b`), 4 corner diamonds (`g`). Low-luminance, low-contrast: it is a floor, not a prop. | excluded from rim gate (§8) |

**Notes**

- **Single frame** (`idle`) for every prop. No open/closed, no animation — this is the reduced-motion-safe choice and keeps the catalog flat like `props.js` expects.
- **`decor_rug` uses one def but re-points `r` per level** at draw time is **not** required; instead commit a neutral rug (`r = #6b4423` field, `p`/`b` border) that is level-agnostic. If a level wants a colored rug, that is a future per-theme variant, not v1. (Keeps the catalog small; noted in §10.)
- Wall props are authored to read correctly with their **back edge at the top** of the tile; the generator only places them on tiles with a `WALL` above or beside, so the read is always "against something".

---

## 3. `tile_themes.json` prop schema (normative)

`tile_themes.json` bumps `version` to `3` and every `levels[n]` entry gains a `props` block. The legacy root object and all existing keys are untouched.

```jsonc
"props": {
  "set": ["candelabra", "table", "crate", "bookshelf"],  // prop ids without the "prop_" prefix
  "decor": ["rug"],                                       // ids without the "decor_" prefix; [] = none
  "focal": "table",                                       // focal prop for key/stair/boss rooms
  "density": 3,                                           // target props per room before role caps
  "maxPerRoom": 4,                                        // hard cap after all adjustments
  "wallBias": 0.4                                         // 0..1 share of placements that prefer class:"wall"
}
```

Per-level values (normative):

| Lv | `set` | `decor` | `focal` | `density` | `maxPerRoom` | `wallBias` |
| --: | :-- | :-- | :-- | --: | --: | --: |
| 1 | `candelabra, crate, barrel, sarcophagus` | `[]` | `sarcophagus` | 2 | 3 | 0.5 |
| 2 | `candelabra, table, crate, bookshelf` | `["rug"]` | `table` | 3 | 4 | 0.4 |
| 3 | `crate, barrel, brazier, table` | `[]` | `brazier` | 3 | 4 | 0.25 |
| 4 | `bookshelf, table, candelabra, altar` | `["rug"]` | `altar` | 3 | 4 | 0.4 |
| 5 | `throne, altar, brazier, candelabra` | `["rug"]` | `altar` | 3 | 4 | 0.5 |

**Schema rules**

- `set`/`decor` ids must resolve through `PROP_CATALOG` (validator-enforced). `decor` entries must have `kind: "decor"`; `set` entries must have `kind: "prop"`.
- `focal` must be a member of `set` (or `decor` for decal-only themes; all five lists include it).
- `wallBias` is a soft target: the generator prefers wall-class props for that share of placements, then falls back to `free` if not enough wall candidates exist. It never reduces the count.
- The resolver `themeForFloor(n)` in `sprite-renderer.js` already merges `levels[n]` over the root, so `theme.props` is available with no resolver change.

---

## 4. `tower_levels.json` prop policy (normative)

Add a top-level `propPolicy` block (additive; `data-catalogs.test.mjs` only asserts existing fields):

```jsonc
"propPolicy": {
  "countByRoomTier": { "0": 2, "1": 3, "2": 3, "3": 2 },
  "arrivalRoomMax": 1,
  "clearCenter": true,
  "minSpacingFromChest": 1,
  "brazierLightRadius": 2.5,
  "maxBrazierLights": 2,
  "bossRoomFixed": { "room": 5, "props": ["throne", "brazier", "brazier"] }
}
```

**Role rules (resolved per room, in order):**

1. **Count** = `countByRoomTier[roomTier]`, then `min(…, theme.props.maxPerRoom)`.
2. **Arrival rooms** (`entryRoom`, `stairRoom`) are capped at `arrivalRoomMax` (1) so neither landing spot is cluttered.
3. **Key rooms** (`keyRooms.*`) and the **stair room** place one **focal** prop from `theme.props.focal` if the count budget allows.
4. **Boss room** (level 5, room 5) uses `bossRoomFixed.props` verbatim (throne flanked by two braziers), and skips the random pass for that room.
5. `clearCenter` removes the room center tile from candidates (keeps the combat focal point open; monster slot 0 anchors there).

---

## 5. Placement algorithm (normative, floor-generator extension)

Props are appended **after** the existing §9.2 order and **after** the seeded monster jitter, immediately before `generateFloor` returns. The generator's `occupied` set already contains pillars, stairs, spawn, entry, arrival landings, chests, key holders, all monsters (post-jitter), and the starter-cache item tile. Props reuse it as the hard exclusion set.

```
props = [];
for room in 1..9:
  if room === bossRoom: place bossRoomFixed.props at fixed anchor tiles (below); continue
  theme   = themeForFloor(levelId)
  tier    = levelSpec.roomTiers[room]
  target  = min(propPolicy.countByRoomTier[tier], theme.props.maxPerRoom)
  if room is entryRoom or stairRoom: target = min(target, propPolicy.arrivalRoomMax)
  candidates = roomBoundsCandidates(rooms[room-1], occupied)   // FULL bounds [x1..x2]×[y1..y2]
  candidates = candidates.filter(not within minSpacingFromChest of any chest)
  if propPolicy.clearCenter: candidates = candidates.filter(not the room center tile)
  candidates = seededShuffle(candidates, rng)
  placed = 0
  for tile of candidates:
    if placed >= target: break
    cls = hasWallNeighbour(tile) ? 'wall' : 'free'
    wantWall = rng.random() < theme.props.wallBias
    propId = pickFromSet(theme.props.set, cls, wantWall, rng)   // class-matching, de-duplicated by preference
    if !propId: continue
    occupied.add(tile); props.push({ id, room, x, y, propId: `prop_${propId}`, class: cls, layer: 'prop' }); placed++
  // focal guarantee for key rooms / stair room
  if room is keyRoom or stairRoom and no focal prop present and budget: place theme.props.focal on the first free wall/free candidate
// decor pass (runs first at render time, placed after furniture for generation)
for room in 1..9:
  if theme.props.decor.length and room is not arrival room and rng.random() < 0.5:
    place `decor_${theme.props.decor[0]}` on a free center-adjacent tile not in occupied
// bounded brazier light
for each prop_brazier (first propPolicy.maxBrazierLights only):
  ambientLights.push({ x, y, radius: propPolicy.brazierLightRadius, color: theme.features.flame })
```

**Helper contracts (E10 implements in `floor-generator.js`)**

- `roomBoundsCandidates(room, occupied)` — all `[x1..x2]×[y1..y2]`, skipping any tile in `occupied` and any non-`FLOOR` matrix tile. This is the chest/prop variant of `orderedCandidates` (which insets by 1 and is retained for monsters/key holders).
- `hasWallNeighbour({x,y})` — true when any 4-neighbour is `TILE_TYPES.WALL` (pillars are `WALL` in the matrix and therefore count).
- `seededShuffle(list, rng)` — in-place Fisher–Yates using `rng.random()`; deterministic for a fixed seed.
- `pickFromSet(set, cls, wantWall, rng)` — filters to class-matching members, prefers the requested class, then falls back to the other class; returns a member or `null`.
- Boss-room fixed anchors (relative to room 5 center `(19,19)`): throne at `(19,20)` (against the north pillar line) or nearest free wall tile; braziers at `(17,20)` and `(21,20)` or nearest free tiles. Skip any anchor that is not free; never overwrite an occupied tile.

**Determinism.** The only new randomness source is the existing `rng` object, consumed **after** monster jitter; no earlier draw order changes, so tiles/monsters/items/stairs remain byte-identical to the pre-D4 generator. `props` is identical for the same `(level, seed)` and is excluded from the structure-only no-soft-lock guarantee (it is cosmetic).

**Safety invariant.** Every prop write happens through `occupied`; the algorithm cannot place a prop on a chest, key holder, monster, stair, spawn, entry, arrival, pillar, or item tile. Combined with §6 (non-blocking), reachability and the D2 §10 no-soft-lock proof are unaffected.

---

## 6. Rendering integration

### 6.1 Layer order (target)

Tiles → **decor (rugs)** → ground items → chests → **furniture props** → light mask → death effects → monsters → player → projectiles/particles → floating text.

This is consistent with `art-direction.md` §6.3 (actors draw after the mask so silhouettes survive the fog) and keeps:
- rugs under items/chests (a rug never hides loot),
- furniture behind actors (a non-blocking table the player steps onto is honestly drawn under the player).

### 6.2 API

- `CanvasRenderer.render(gridMap, player, monsters, ambientLights, projectiles, floatingTexts, selectedMonsterId, particles, deathEffects, chests, props = [])` — new trailing `props` param (default keeps existing callers/tests working).
- Draw pass 2a (decor): for each `prop` with `layer === 'decor'`, if the tile is in-bounds and `isLit`, call `SpriteRenderer.drawProp`.
- Draw pass 2c (furniture): same, after chests.
- `SpriteRenderer.drawProp(ctx, prop, screenX, screenY, size = CONFIG.GRID_SIZE, theme)`:
  - resolve `PROP_CATALOG[prop.propId]`; if absent **fall back to a procedural flat block** (back-compat, so E10 can land prop-by-prop);
  - decor: blit frame `idle` at the tile origin (`anchor {0,0}`);
  - furniture: blit at `screenX/screenY` (the authored anchor handles the bottom alignment), exactly like `drawItem`/`drawChest` reuse `drawPropFrame`.
- `app-controller`: `this.props = (floorData.props || []).map(p => ({ ...p }))` beside the existing `this.chests` copy; pass `this.props` to `render(…)`.

### 6.3 Lighting

- Props only draw on **lit** tiles (same gate as chests), so the fog/shroud contract is preserved.
- Braziers add their light node during generation (§5). The light mask then reveals the brazier's own tile and immediate neighbours, making fire read as a real light source. Cap 2/floor keeps the lighting pass bounded.
- Candelabras, fires on altars/thrones, and candlelit tables are **static** and add no light nodes in v1.

### 6.4 Failure / fallback

If `PROP_CATALOG[prop.propId]` is missing or its `idle` frame is absent, the renderer must not throw: draw the procedural block and continue. This is the same back-compat rule as `art-direction-tower.md` §5.2.

---

## 7. Chest-against-wall placement (LIV-17 item 3)

Current chest placement uses `orderedCandidates` on the **interior** inset (`x1+1..x2-1`), so chests land in the middle of rooms. Item 3 changes the chest role only:

1. **Full-bounds candidates.** Chest uses `roomBoundsCandidates(rooms[room-1], occupied)` (the outer ring that touches the walls is now eligible).
2. **Wall-first ordering.** New `orderedCandidatesWallFirst(room, occupied, anchor)` sorts candidates so that:
   - first, tiles with a `WALL` directly **above** (north) — the chest backs up to the room's top wall (bottom-anchored sprite reads correctly),
   - then any other tile with any orthogonal `WALL` neighbour,
   - then the remaining tiles in the existing anchor-rotated row-major order.
   The first free tile from that order is taken. The `(-3,+2)` anchor is preserved as the tie-break inside each tier.
3. **Unchanged guarantees.** Exactly one chest per room; `tier` derivation unchanged; chest tile remains walkable (walk-on open, `chest-system.js`); no soft-lock or connectivity impact.
4. **Prop coordination.** `propPolicy.minSpacingFromChest = 1` makes props skip the chest tile and its 4-neighbours, so the wall the chest backs onto stays visually clear and the chest reads as the room's single reward object.

**Visual acceptance:** in every room, the closed chest touches at least one orthogonal `WALL` (north preferred) and has no prop in the tile directly above/beside it.

---

## 8. Sprite assets, manifest wiring, and OpenMoji

### 8.1 Committed files

```
html/assets/sprites/
  manifest.json                      # + "props" entries (kind prop/decor, class, file, native, anchor, frames:["idle"])
  props.js                           # + PROP_CATALOG entries; export PROP_IDS_BY_KIND
  props/
    prop_table.json prop_crate.json prop_barrel.json prop_brazier.json prop_candelabra.json
    prop_bookshelf.json prop_sarcophagus.json prop_altar.json prop_throne.json
  decor/
    decor_rug.json
html/data/tile_themes.json           # version 3 + levels[n].props (§3)
html/data/tower_levels.json          # + propPolicy (§4)
html/services/floor-generator.js     # + prop placement + chest wall-first (§5, §7)
html/app/sprite-renderer.js          # + drawProp + PROP_CATALOG use
html/app/canvas-renderer.js          # + props layer (§6)
html/app/app-controller.js           # + this.props wiring (§6.2)
tools/validate-prop-assets.mjs       # + prop-class + per-level rim gate
tools/render-sprite-preview.mjs      # props.png now includes furniture + decor
docs/art-preview/props.png           # committed contact sheet (regenerated)
html/tests/room-props.test.mjs       # new (§9)
html/tests/sprite-assets.test.mjs    # preview drift + manifest coverage unchanged
```

### 8.2 Manifest entry shape

```jsonc
"props": {
  "prop_table": { "kind": "prop", "class": "free", "file": "./props/prop_table.json", "native": { "w": 32, "h": 32 }, "anchor": { "x": 16, "y": 28 }, "frames": ["idle"] },
  "decor_rug":  { "kind": "decor", "class": "decor", "file": "./decor/decor_rug.json", "native": { "w": 32, "h": 32 }, "anchor": { "x": 0, "y": 0 }, "frames": ["idle"] }
  // …one entry per id
}
```

- `kind` gates the validator rule set: `prop` enforces the rim gate; `decor` is exempt from the rim gate but must still be 32×32, palette ≤16, valid hex.
- `class` ∈ `wall | free | decor` (new, validated). Placement (§5) uses it; the renderer does not.

### 8.3 OpenMoji

Canvas props are **authored pixel JSON, never OpenMoji** — the canvas renderer never loads OpenMoji (per `art-direction.md` §1.1/§8). OpenMoji remains the DOM HUD/menu asset set. Optional `svgCode` on a prop def (for a future DOM legend or docs surface) must reference an **existing committed SVG** under `html/assets/openmoji/`; do **not** add `svgCode` for a code that has no file (`packaging.test.mjs` check at line ~424 is extended/kept green).

Available reference codes (existing files only): `1F4E6` (crate/package), `1F56F` (candelabra/candle), `1F525` (brazier/fire), `1F4D6` (bookshelf/book), `1F4FF` (altar/beads). `table`, `barrel`, `sarcophagus`, `throne`, `rug` have **no** matching committed OpenMoji; omit `svgCode` for them (or add SVGs deliberately in a DOM-only follow-up). This means **no new assets are required outside `html/assets/sprites/`**.

---

## 9. Acceptance criteria

### 9.1 Automated (committed, green)

`node tools/validate-prop-assets.mjs` → `Prop assets OK` with the new entries. Extend the validator so that:
- `kind`, `class`, `frames:["idle"]`, native/anchor are present and well-formed;
- geometry (rows=32, width=32), palette ≤16, declared chars only;
- **`prop` class only**: best palette contrast ≥3:1 against **every** level `floor.fill` on which the prop appears (derived from `tile_themes.levels[*].props.set`); `decor` exempt.

New `html/tests/room-props.test.mjs` (node:test):
1. **Manifest completeness** — every id in every `levels[n].props.set`/`decor` resolves in `PROP_MANIFEST` + `PROP_CATALOG`, file exists, `kind` matches the list, `class` present.
2. **Placement invariants** — for all 5 levels × seeds `[1,7,42,1337,90210]`: every prop sits on a `TILE_TYPES.FLOOR` tile; no prop shares `(x,y)` with a chest, monster (incl. key holder/boss/guards), stair, spawn, entry, arrival, pillar, or item tile; prop tiles are unique; per-room count ≤ `maxPerRoom` and ≤ `density` (plus arrival/focal rules).
3. **Wall-class invariant** — every `class:"wall"` prop has ≥1 orthogonal `WALL` neighbour.
4. **Chest spacing** — no prop is orthogonally adjacent to a chest.
5. **Non-blocking** — `grid.isWalkable(p.x, p.y) === true` for every prop, and `validateFloorConnectivity(generateFloor(...)).ok === true`.
6. **Determinism** — `generateFloor(level, seed)` twice ⇒ `deepEqual(a.props, b.props)`; `validateFloorSoftlock` ok across all seeds.
7. **Chest-against-wall** — for all levels × seeds, every generated chest has ≥1 orthogonal `WALL` neighbour; exactly one chest per room.
8. **Per-level identity** — each level's props are a subset of its `props.set`; L1 and L4 prop-id sets are not identical (theme variation is real).
9. **Brazier light bound** — at most `maxBrazierLights` brazier ambient lights per floor, and each corresponds to a placed brazier.

Also run the existing suite: `node --test html/tests/*.test.mjs` (must stay green; preview drift check regenerates `docs/art-preview/props.png`).

### 9.2 Manual / browser checklist (board, via Tech Lead)

- Walk floors 1→5: each level's rooms show its declared prop set (L1 bare crypt furniture, L2 banquet/books, L3 works/crates/brazier, L4 gallery/altars/rug, L5 throne + braziers + rug).
- Candelabra, bookshelf, sarcophagus, throne sit **against walls**; tables/crates/barrels/braziers sit in the room body.
- Every chest sits **against a wall** (not floating mid-room), with no prop directly above/beside it.
- No prop overlaps a chest, key, door, stairs, or item; the player is **never blocked** by a prop (props are walk-over).
- Props are invisible on unlit tiles and legible at the fog edge; rugs never obscure loot.
- Braziers glow (their light node reveals nearby tiles); performance holds 60 FPS on a full 40×40 floor.
- Greyscale screenshot: props remain distinguishable from the floor and from chests.
- Reduced motion: no prop animation, no flicker.

### 9.3 Acceptance (from the D4 issue)

> An implementation-ready spec … TechLead can implement in the follow-on issue … – Prop/tile list with stable codes per level theme; sprite requirements; placement rules; chest-against-wall guidance; explicit acceptance criteria.

Met by: exact catalog + per-level `props` schema (§2–§3), exact generator + `propPolicy` contract (§4–§5, §7), render layer + wiring (§6), asset/manifest/OpenMoji contract (§8), and the automated + manual gates that lock it (§9).

---

## 10. Residual risks and follow-ups

1. **Art volume.** 10 authored 32×32 sprites is the main cost. Mitigation: the renderer's procedural fallback means E10 can land the set incrementally (L1 furniture first) without breaking the game or the suite. No mid-sprint art hire is required for scope; a dedicated furniture pass is bounded.
2. **Props are non-blocking.** A player can walk through a table. This is deliberate: it guarantees the D2 §10 no-soft-lock / reachability proof, avoids new AI pathing (monsters use wall-only `isWalkable`), and matches the existing walk-on-chest convention. Solid props would require `GridMap` occupancy + monster pathing and are out of scope (future ticket).
3. **Fixed warm flame palette.** Flames are `#ffb347/#ff6a00/#fff2d6` on all levels; on cool/violet floors they still read intentionally. A theme accent remap (designate palette char `s` → `theme.features.flame` at draw time) is an optional polish follow-up.
4. **Rug under loot.** `decor_rug` is kept low-luminance and low-contrast by design; ground items and chests draw above it. If a rug ever reduces item readability in play, drop `decor` from that level (data-only change).
5. **Brazier light nodes.** Capped at 2/floor to bound the lighting pass. If a floor places more braziers than the cap, only the first two emit; the rest are static art.
6. **Seed-dependent props.** Props are cosmetic and seed-varied; they are intentionally excluded from structure-only golden snapshots. The determinism test (§9.1 #6) locks reproducibility for a fixed `(level, seed)`.

---

## Appendix A — Shared furniture palette

| role | hex | use |
| :-- | :-- | :-- |
| outline | `#0b0d12` | all props (auto-outline) |
| wood shadow/base/light/bright | `#3f2817` / `#6b4423` / `#8a5a2b` / `#c98a4a` | table, crate, barrel, bookshelf, throne |
| stone shadow/base/light/bright | `#33333a` / `#55555f` / `#6e6e7a` / `#aab2bf` | sarcophagus, altar |
| iron base/light | `#4a4f57` / `#8a9099` | crate brackets, barrel hoops, brazier bowl |
| brass base/highlight | `#b87333` / `#e8a86a` | candelabra, table studs, offerings |
| gold trim/bright | `#e0a82e` / `#ffe08a` | altar + throne filigree |
| cloth accent | `#c0392b` | rug field, throne crest (default) |
| flame outer/inner/core | `#ffb347` / `#ff6a00` / `#fff2d6` | candles, brazier |
| candle wax | `#e9e2cf` | candles |

## Appendix B — Commands

```bash
node tools/validate-prop-assets.mjs          # prop/decor + per-level rim gate
node tools/render-sprite-preview.mjs         # regenerate docs/art-preview/*.png (props.png grows)
node --test html/tests/room-props.test.mjs   # D4 placement contract
node --test html/tests/*.test.mjs            # full native suite
```
