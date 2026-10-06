# Lokarta: Tower Art Direction Brief — Tile Themes, Keys, Chests, Gated Doors

**Issue:** LIV-7 (D3) · **Parent:** LIV-4 · **Owner:** Designer · **Audience:** Tech Lead / E5 ([LIV-12](/LIV/issues/LIV-12)), board (browser verification)

**Wave 2 spec. Supersedes the tile/item portion of [docs/art/art-direction.md](art-direction.md) (that doc remains authoritative for the 4 vocations + 5 monster actors).**

This brief converts the LIV-4 product decisions (ascend a 5-level tower, copper→silver→gold keys, gated doors, per-room chests, castle/tower variation) into buildable, data-driven art and tile themes. It commits the design-system artifacts E5 integrates directly, and it names them by catalog entry, token, component, and sprite path.

---

## 0. Decisions at a glance (the spec, compressed)

| # | Item | Decision |
| :-- | :-- | :-- |
| 1 | Tile art approach | Same authored-indexed-pixel pipeline as actors (`docs/art/art-direction.md` §2). **New tile/feature art ships as data + procedural draw against `tile_themes.json`; gated doors port the 32×32 prop matrix.** No bundler, no runtime fetch. |
| 2 | Native size | **32×32 px** per tile/feature; blit at `SCALE = GRID_SIZE/32` (×2 at 64 px). Integer only, nearest-neighbour. |
| 3 | Tile themes | 5 tower tiers in `html/data/tile_themes.json` under a new **`levels`** map (keys `"1"`–`"5"`), each with full `wall` / `floor` / `stairs` / `door` / `features` / `decor`. Existing root `wall`/`floor`/`stairs`/`door`/`items` stay as the **legacy fallback**. |
| 4 | Per-level variation | Structural (banner / sconce / window / stair material) **and** palette. Every level's `wall.fill` is distinct; `stairs` material and `features` set change so variation survives greyscale. |
| 5 | Visibility gate | Every tier `floor.fill` has WCAG relative luminance **≤ 0.02** (matches the actor rim gate in art-direction.md §3.5). Measured values: 0.0076–0.0111. |
| 6 | Tier colorways | copper `#b87333` / silver `#aab2bf` / gold `#e0a82e`, each a 3-ramp (`shadow/base/highlight`) plus a glint. |
| 7 | Tier progression is **structural, not hue-only** | Keys: 2→3→4 teeth (+ gold gem). Chests: 1→3→5 lid studs (bands constant). Doors: 0→2→3 side studs + gold crown emblem. Passes WCAG 1.4.1 / greyscale. |
| 8 | Sprite specs committed | `html/assets/sprites/items/{key,chest}_*.json` and `html/assets/sprites/tiles/gated_door_*.json`, registered in `manifest.json.props`, exported via `props.js` (`PROP_CATALOG`, `PROP_MANIFEST`, `PROP_IDS_BY_TIER`). |
| 9 | Preview | `tools/render-sprite-preview.mjs` emits `docs/art/preview/props.png`; drift is test-enforced. |
| 10 | Validator | `tools/validate-prop-assets.mjs` + `html/tests/sprite-assets.test.mjs` (checks 14–18) enforce geometry, palette ≤16, rim ≥3:1, structural tier progression, 5 distinct level themes. |
| 11 | Volume / capacity | 9 prop matrices + 5 tile themes produced in this issue. **No mid-sprint art hire required** for D3 scope; the actor pass already landed (LIV-10). See §9 residual risk (optional per-level furniture). |

---

## 1. Design lenses applied

| Lens | Where it shapes this brief |
| :-- | :-- |
| **Recognition over recall / Information scent** | Tier is readable at a glance from one structural cue (teeth/studs/side-studs) and one color family, consistent across key↔chest↔door. A player who learned "copper = 2 teeth" reads the door instantly. |
| **Color-independence (WCAG 1.4.1 / POUR)** | No tier distinction is encoded by hue alone (§5). Verified in greyscale by test. |
| **Von Restorff (isolation)** | The gold stair-room door is the only door with a crown emblem + maximum studs, making the goal object pop from the door field. |
| **Chunking / Miller's Law** | Exactly three tiers, three object types, one progression story (copper→silver→gold). No fourth color, no partial tiers. |
| **Jakob's Law / mental model** | Key→lock→door and closed→open chest are universal RPG affordances; door arch reads as "passage", chest lid opening reads as "reward". |
| **Readability on a dark game** | Same rim rule as actors: every prop carries a ≥3:1 highlight against its floor. Verified numerically. |
| **Reduced motion / accessibility** | Doors/chests are static frames; the only transition is a single closed→open swap (no tween). No color-only state. |
| **Ethics** | No dark patterns. Keys/doors/chests are legible, reversible-by-undo-of-knowledge (locked state is clearly shown), no fake scarcity timers in the art. |

---

## 2. Tile theme schema (normative)

`html/data/tile_themes.json` gains a **`levels`** map while keeping the existing root keys as the fallback for any code path that has not yet resolved a level. `version` bumps to `2`.

```jsonc
{
  "version": 2,
  "wall": { ... }, "floor": { ... }, "stairs": { ... }, "door": { ... }, "items": { ... },   // legacy fallback (unchanged)

  "levels": {
    "1": {
      "id": "tier_1",
      "name": "The Gatehouse",
      "wall":     { "fill": "#38332b", "topHighlight": "#524a3d", "gridLine": "#131210", "border": "#0b0a08" },
      "floor":    { "fill": "#1c1a17", "gridLine": "#131210", "accentSquare": "#2a2620" },
      "stairs":   { "bg": "#2b2418", "stepEven": "#b07a2e", "stepOdd": "#7a5320", "orb": "#ffcf7a", "border": "#e0a82e" },
      "door":     { "fill": "#4a3320", "border": "#2a1c10" },
      "features": { "banner": "#b23a2e", "bannerTrim": "#e0a82e", "sconce": "#8b5a2b", "flame": "#ffb347", "window": "#c98a4a" },
      "decor":    { "banner": 0.0, "sconce": 0.12, "window": 0.0 }
    },
    "2": { "id": "tier_2", "name": "The Hall of Banners",  ... },
    "3": { "id": "tier_3", "name": "The Bell Keep",    ... },
    "4": { "id": "tier_4", "name": "The Solar Gallery",... },
    "5": { "id": "tier_5", "name": "The Crown Spire",  ... }
  }
}
```

**Schema rules**

- Keys `"1"`–`"5"` are **stringified floor numbers**, not array indices; the level number is the run's current floor.
- Each level block is **complete** (all five groups). A resolver must merge `levels[n]` over the legacy root as a fallback, never replace the root object.
- `features` are the castle/tower motifs; `decor` is a **deterministic 0..1 density** per feature (see §3.3). Densities are tuned so `banner`=0 on floor 1 makes The Hall of Banners reveal on floor 2 read as progression.
- `wall.fill` must be unique per level (test-enforced). `floor.fill` luminance ≤ 0.02 (test-enforced).
- **No new token type is introduced**: every value is a hex token following the existing `tile_themes` shape, so `SpriteRenderer.drawTile` keeps its `(ctx, screenX, screenY, size, theme)` signature.

**Resolver contract (E5)**

```
themeForFloor(n) = { ...TILE_THEMES_CATALOG, ...TILE_THEMES_CATALOG.levels[String(n)] }
```

Where `n` is the run's floor (1..5). Out-of-range floors fall back to the legacy root (defensive; E6 migration should clamp to 1..5).

---

## 3. Per-level tower themes

Five tiers, ascending. The progression reads as: **guard post → occupied hall → clocktower/works → forbidden vault → crown**. Palette moves warm-brown → brown → cool-steel/cyan → violet → warm gold. Structural motif moves sconce-only → banners → windows → banners+violet sconce → all three.

| Lv | id | Name | Wall fill | Floor fill | Stair material | Motif emphasis | Floor L |
| --: | :-- | :-- | :-- | :-- | :-- | :-- | --: |
| 1 | `tier_1` | The Gatehouse | `#38332b` | `#1c1a17` | `#b07a2e` bronze | Sconces only (a bare watch-post) | 0.0105 |
| 2 | `tier_2` | The Hall of Banners | `#43342b` | `#201a17` | `#c98a4a` bronze | Banners appear (occupied floor) | 0.0111 |
| 3 | `tier_3` | The Bell Keep | `#333d4a` | `#171a20` | `#4a90c0` cold iron/steel | Tower windows + cool light | 0.0103 |
| 4 | `tier_4` | The Solar Gallery | `#3d2f4a` | `#1b1620` | `#8a5cc0` polished dark stone | Violet banners + violet flame | 0.0091 |
| 5 | `tier_5` | The Crown Spire | `#3a2f22` | `#1a1410` | `#d4af37` gold | All motifs; gold + scarlet | 0.0076 |

### 3.1 Per-level theme values (normative)

Already committed in `html/data/tile_themes.json`; reproduced here for review. `features` values are also used in §3.3.

| Lv | wall.fill / topHighlight / gridLine / border | floor.fill / gridLine / accentSquare | stairs bg / even / odd / orb / border | features banner / trim / sconce / flame / window |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `#38332b` `#524a3d` `#131210` `#0b0a08` | `#1c1a17` `#131210` `#2a2620` | `#2b2418` `#b07a2e` `#7a5320` `#ffcf7a` `#e0a82e` | `#b23a2e` `#e0a82e` `#8b5a2b` `#ffb347` `#c98a4a` |
| 2 | `#43342b` `#5e493b` `#17110e` `#0d0906` | `#201a17` `#17110e` `#2e2420` | `#33241a` `#c98a4a` `#8a5a2e` `#ffd9a0` `#e0a82e` | `#c0392b` `#e0a82e` `#8b5a2b` `#ffb347` `#d9a15a` |
| 3 | `#333d4a` `#4c5a6b` `#0f1216` `#080a0d` | `#171a20` `#0f1216` `#232a34` | `#14283a` `#4a90c0` `#2e5f88` `#9be8ff` `#66ccff` | `#2e86c1` `#a9d6f5` `#5a6b7a` `#8fe3ff` `#7fd4ff` |
| 4 | `#3d2f4a` `#57436b` `#120e16` `#0a070d` | `#1b1620` `#120e16` `#28202f` | `#2a183a` `#8a5cc0` `#5a3a88` `#d9b3ff` `#a855f7` | `#8e44ad` `#e0c3fc` `#4a3a5a` `#c084fc` `#c9a0ff` |
| 5 | `#3a2f22` `#5a4a34` `#100c08` `#080604` | `#1a1410` `#100c08` `#2a2018` | `#2e1a12` `#d4af37` `#8a6a1e` `#ffe9a8` `#ffd700` | `#c0392b` `#d4af37` `#6a4a1e` `#ff6a00` `#ff9a6a` |

### 3.2 Biome mapping (E1 supersedes `biomes.json`)

The 4 cave biomes map cleanly onto the 5 tiers. Recommended (E1 owns the final catalog):

| Floor | Biome id | Name | Light tint (`lightColor`) |
| --: | :-- | :-- | :-- |
| 1 | `tier_1` | The Gatehouse | `#b07a2e` warm bronze |
| 2 | `tier_2` | The Hall of Banners | `#c0392b` banner red |
| 3 | `tier_3` | The Bell Keep | `#00d4ff` cold daylight (keep the existing cyan read) |
| 4 | `tier_4` | The Solar Gallery | `#a855f7` violet |
| 5 | `tier_5` | The Crown Spire | `#ffd700` gold |

Rationale: keeps a warm→cool→violet→gold arc so the player feels they are climbing into light, while preserving the existing cyan for tier 3 (its palette is already cyan-family, satisfying "color-independence" against the light too).

### 3.3 Castle/tower feature motifs (new procedural layers)

Drawn on lit **WALL** tiles in `SpriteRenderer.drawTile` after the base wall fill. Each is 32×32 native. All use only `features`/`wall` theme tokens; no new asset fetch.

| Feature | Trigger | Draw (native coords) | Purpose |
| :-- | :-- | :-- | :-- |
| **Sconce** | `decor.sconce` deterministic hash; only on a wall tile with a floor neighbour below | Bracket `4×10` at `x 24..27, y 10..19` (`sconce`), flame teardrop at `(25.5, 8)` (`flame` + white core) | Ambient castle light; the staple motif |
| **Banner** | `decor.banner`; wall tiles 2+ away from any door tile | `12×18` cloth at `x 10..21, y 4..21` (`banner`), 2 px trim bars top/bottom (`bannerTrim`), pole `1×20` | Occupied-floor signal; strong Von Restorff at distance |
| **Tower window** | `decor.window`; wall tiles with **no** floor neighbour | `10×16` arrow-slit at `x 11..20, y 5..20`, 3 px frame (`wall.topHighlight`), pane (`window`) + `wall.gridLine` mullion | Daylight/height signal unique to The Bell Keep; reads in greyscale by shape |
| **Stair material** | Always on STAIRS | Existing 4-ring + orb; ring colors from `levels[n].stairs` | Level-appropriate stair (bronze → steel → gold) reinforces ascent |

**Determinism (required):** feature placement uses a pure hash of tile coordinates, e.g. `hash = ((x*73856093) ^ (y*19349663)) >>> 0; on = (hash % 1000) / 1000 < density`. Same grid → same decoration every run (preserves seeded determinism and the soft-lock validator's reproducibility). **Never** `Math.random()` in tile decoration.

**Performance:** features are capped to a small number per visible wall tile (≤1 feature/tile) and drawn with integer `fillRect` only. No gradients, no per-frame allocation. The E5 acceptance run must stay 60 FPS with a full 40×40 grid.

---

## 4. Key / chest / gated-door sprite specs

All three object types share one native convention: **32×32**, extents `x 0..31`, `y 0..31`, palette ≤16 including outline `#0b0d12`. Files live under `html/assets/sprites/` and are registered in `manifest.json.props`.

### 4.1 Key — `key_copper` / `key_silver` / `key_gold`

| Property | Value |
| :-- | :-- |
| Path | `html/assets/sprites/items/key_{copper,silver,gold}.json` |
| Frames | `icon` (1) |
| Anchor | `{ x: 16, y: 26 }` |
| Native | `{ w: 32, h: 32 }` |
| Silhouette | Bow ring (outer r≈7.6, inner r≈4.4) centred `(16,10)`; shaft `x 15..16, y 16..28`; collar `x 13..18, y 15..16`; teeth extending right from `x 17` |
| Tier cue | **Teeth: copper 2 · silver 3 · gold 4.** Gold additionally fills the bow with a `#e0a82e`/white **gem** |
| Ramp | shadow→base→highlight per tier; glint pixel `i` |
| Contrast | best palette entry ≥3:1 vs floor (e.g. silver `#ffffff` 16.8:1, copper `#fff2d6` 14.4:1, gold `#fffbe6` 17.4:1) |

Palettes:

| char | role | copper | silver | gold |
| :-- | :-- | :-- | :-- | :-- |
| `a` | shadow | `#7a4a1e` | `#6b7280` | `#8a5a00` |
| `b` | base | `#b87333` | `#aab2bf` | `#e0a82e` |
| `c` | highlight | `#e8a86a` | `#eef1f5` | `#ffe08a` |
| `i` | glint/gem | `#fff2d6` | `#ffffff` | `#fffbe6` |

### 4.2 Chest — `chest_copper` / `chest_silver` / `chest_gold`

| Property | Value |
| :-- | :-- |
| Path | `html/assets/sprites/items/chest_{copper,silver,gold}.json` |
| Frames | `closed`, `open` |
| Anchor | `{ x: 16, y: 30 }` |
| Native | `{ w: 32, h: 32 }` |
| Silhouette | Rounded-lid chest, body `x 4..27, y 9..28`, feet `y 29..30`; two side metal bands constant across tiers; central lock plate `x 13..18` with keyhole; brass inlay studs on the lid |
| Tier cue | **Lid interior inlay studs at columns 13/18/11/20: copper 1 · silver 3 · gold 5** (never color-only) |
| Wood | shared `d #3f2817` / `e #6b4423` / `f #8a5a2b`; interior `h #17100a` |
| `open` state | lid tilted back at `y 6..10`, interior `h` with `a` sparkle row at `y 12`; **same palette**, no new colors |

Metal columns same as key (`a/b/c`), wood letters `d/e/f/h` shared. A single `open`→`closed` swap is the only animation (no tween).

### 4.3 Gated door — `gated_door_copper` / `gated_door_silver` / `gated_door_gold`

| Property | Value |
| :-- | :-- |
| Path | `html/assets/sprites/tiles/gated_door_*.json` |
| Frames | `closed`, `open` |
| Anchor | `{ x: 0, y: 0 }` (tile-aligned; fills the 32×32 tile) |
| Native | `{ w: 32, h: 32 }` |
| Silhouette | Stone arch frame (grey stone `j/k/l`) filling the tile; arched opening; wooden leaf with vertical planks; two horizontal metal bands; central lock with tier emblem; `open` shows a dark passage `m #0a0a0d` + leaf swung to the left edge |
| Tier cue | **Side studs (x=2 and x=29): copper 0 · silver 2 · gold 3** and a **gold-only crown emblem** at the arch (`x 13..18, y 6..9`) |
| Stone | `j #33333a`, `k #55555f`, `l #6e6e7a`; passage `m #0a0a0d` |
| Contrast | gold bands `#e0a82e`, gold highlight `#ffe08a`; all ≥3:1 vs floor |

### 4.4 Tier progression guarantee (non-color)

| Object | copper | silver | gold | Monotonic cue |
| :-- | :-- | :-- | :-- | :-- |
| Key | 2 teeth | 3 teeth | 4 teeth + gem | tooth count |
| Chest | 1 lid stud | 3 lid studs | 5 lid studs | stud count |
| Door | 0 side studs | 2 side studs | 3 side studs + crown | stud count / emblem |

The `validate-prop-assets` tool counts these and the test fails if the sequence is not strictly increasing. This is the mechanical implementation of the color-independence requirement (WCAG 1.4.1).

---

## 5. Asset paths, catalog wiring, and integration points

### 5.1 Committed files

```
html/assets/sprites/
  manifest.json                     # + "props" map (keys/chests/doors)
  props.js                          # PROP_CATALOG, PROP_MANIFEST, PROP_IDS_BY_TIER
  index.js                          # re-exports props
  items/
    key_copper.json key_silver.json key_gold.json
    chest_copper.json chest_silver.json chest_gold.json
  tiles/
    gated_door_copper.json gated_door_silver.json gated_door_gold.json
html/data/tile_themes.json          # + "levels" 1..5 (theme source of truth)
tools/render-sprite-preview.mjs     # + props.png export
tools/validate-prop-assets.mjs      # prop/tile + level-theme gate
html/tests/sprite-assets.test.mjs   # + checks 14–18
docs/art/preview/props.png          # committed contact sheet
```

### 5.2 Integration contract for E5

| E5 must | Named reference |
| :-- | :-- |
| Resolve tier art | `PROP_IDS_BY_TIER[tier].{key,chest,door}` → `PROP_CATALOG[id]` |
| Resolve level theme | `themeForFloor(n)` merge over `TILE_THEMES_CATALOG` (§2) |
| Draw a gated door tile | Extend `TILE_RENDERERS[TILE_TYPES.DOOR]` to take the tier and blit `PROP_CATALOG.gated_door_{tier}.frames[open?'open':'closed']` via the existing `parseFrame`/`applyOutline`/`scalePixels` helpers, falling back to the current procedural `theme.door` when no prop is found |
| Draw a key/chest item | Extend `ITEM_RENDERERS` (or add `drawProp`) keyed on `item.tier`; keys use frame `icon`, chests use `closed`/`open`. Keep the `defense-in-depth` fallback to the existing procedural items |
| Draw features | Add the §3.3 draws inside `SpriteRenderer.drawTile` behind a `theme.features`/`theme.decor` presence check |
| Chest interaction | `closed` until opened; on open, swap to `open` and hold until loot is taken; persist opened state (E4 owns the model) |
| Door state | `closed` blocks movement; `open` is passable and stays open for the run; the gold stair-room door is the only crown door |
| Keep tests green | `node --test html/tests/*.test.mjs` (currently **507 tests / 80 suites / 0 fail**) |

**Back-compat is mandatory.** If `PROP_CATALOG[id]` is missing or a frame is absent, the renderer must fall back to today's procedural `TILE_RENDERERS`/`ITEM_RENDERERS` output. This lets E5 land object-by-object without breaking the game or the suite (same rule as art-direction.md §6.6).

### 5.3 Do / don't

- **Do** name the tier in data (`item.tier` / `door.tier`), not in renderer branches.
- **Do** keep the `(ctx, screenX, screenY, size)` signatures of `drawTile`/`drawItem`.
- **Do** clamp floor to 1..5 when resolving a theme; fall back to root.
- **Don't** add per-level code branches; variation comes from `tile_themes.levels`.
- **Don't** add new npm packages, bundler steps, or network fetches.
- **Don't** encode tier only by color; the structural cue is required.

---

## 6. Readability, contrast, and accessibility

- **Actor rim gate preserved:** every tier `floor.fill` luminance ≤ 0.02 (measured 0.0076–0.0111) so the actor rim rule from art-direction.md §3.5 keeps holding on all 5 floors.
- **Prop rim gate:** every key/chest/door palette contains ≥1 entry with contrast ≥3:1 vs its floor (test-checked).
- **Color-independence:** tier differences are structural (§4.4). A greyscale screenshot must still distinguish copper/silver/gold key/chest/door. This is a manual QA item and a test item.
- **Reduced motion:** no tweening on doors/chests; state swaps are instant. Feature banners are static (no cloth motion). Honors the existing `prefers-reduced-motion` handling.
- **Target size / interaction:** door tiles are full 32×32 (≥44 px on-screen at ×2); chest interaction tile likewise. No sub-44 px hit targets introduced.
- **Don't rely on color for locked/open:** closed door = opaque leaf, open door = dark passage; both are legible without color.

---

## 7. Verification criteria

### 7.1 Automated (committed, green)

`node --test html/tests/*.test.mjs` — additions in `sprite-assets.test.mjs`:

14. **Prop manifest completeness** — all 9 prop ids present, resolve to existing files, and `PROP_IDS_BY_TIER` maps into the catalog.
15. **Prop geometry/palette/contrast** — `validatePropAssets()` returns zero errors (rows=32, width=32, palette ≤16, valid hex, ≥3:1 rim vs floor).
16. **Structural tier cue** — gold door adds metal over copper; gold key carries its gem frame pixel.
17. **5 distinct tower levels** — `tile_themes.levels` has 5 complete themes, unique `wall.fill`, floor luminance ≤ 0.02.
18. **Preview drift** — `props.png` byte-matches a fresh export.

Also run: `node tools/validate-prop-assets.mjs` (expects: *Prop assets OK*).

### 7.2 Manual/browser checklist (board, via Tech Lead)

- Advance from floor 1 to 5: **wall and floor palette visibly change every level**; sconces appear, banners appear on 2/4/5, windows appear on 3/5; stairs change material (bronze→steel→violet→gold).
- Keys: find the copper key, open a copper door; repeat silver/gold. **At a glance, in color and in a greyscale screenshot, the three tiers are distinguishable.**
- Chest: closed chest → opens on interaction → loot reveals; copper/silver/gold chests read as different tiers by stud count.
- Gated doors: locked door blocks movement; the matching key opens it; the **gold stair-room door has the crown emblem and is the only one**.
- Light/shroud: props and features stay readable at the light perimeter on all 5 floors (no motif lost against `#1a1c23` or the tier floor).
- Reduced motion: no motion on banners/doors/chests.
- Performance: 60 FPS on a full floor with all features enabled.

### 7.3 Acceptance (from the D3 issue)

> E5 can implement per-level tower variation and key/chest/door visuals directly from this brief.

Met by: exact `tile_themes.levels` schema + values (§2–3), exact prop files + manifest wiring (§4–5), integration table (§5.2), and the automated gates that lock the contract.

---

## 8. Compliance

- **Zero-backend / no bundler / no npm:** all new art is JSON data + pure pixel helpers + procedural `fillRect`. No dependency added.
- **Data-driven:** variation lives in `tile_themes.json`; object identity lives in `manifest.json.props`/`PROP_IDS_BY_TIER`.
- **Deterministic:** feature placement is a pure coordinate hash; no `Math.random()` in decoration; seeded generation and soft-lock validation are unaffected.
- **Cache:** bumping `tile_themes.json` changes a data file already loaded via the existing catalog barrel; E6 owns `FLOOR_TEMPLATE_VERSION`/cache-bust for the 20→5 cut.
- **Out of scope (do not touch here):** actor sprites (LIV-10), stats/loot tables (E1/E4), generator logic (E2), save migration (E6). HUD icons remain OpenMoji (art-direction.md §8).

---

## 9. Residual risks and follow-ups

1. **Per-level *furniture* set deferred to D4.** For the D3 scope the castle read came from wall palette + sconce/banner/window + stair material. Richer interiors are now specified in [docs/art/art-direction-room-props.md](art-direction-room-props.md) (LIV-19 / D4): 9 furniture props + 1 floor decal, a per-level `tile_themes.levels[n].props` block, a `tower_levels.propPolicy` placement contract, non-blocking placement that preserves the no-soft-lock proof, and chest-against-wall placement. Implemented by E10 ([LIV-20](/LIV/issues/LIV-20)).
2. **`biomes.json` name reuse:** §3.2 recommends tier ids/floors; E1 must update `biomes.json` and any string tests together (data-catalogs.test.mjs asserts current cave names; that test is E1/E7 scope and will need updating with the tower rewrite).
3. **Feature overlap with walls near doors:** banners are suppressed within 2 tiles of a door to protect the door read. If E2 places many doors, banner density may look sparse on a floor — tune `decor.banner` per level without code changes.
4. **Contrast is a design gate, not certification:** values are approximate to ±0.05 (same method as art-direction.md Appendix C).

---

## Appendix A — Prop colorways

| Name | Hex | Use |
| :-- | :-- | :-- |
| copper-shadow / base / highlight / glint | `#7a4a1e` / `#b87333` / `#e8a86a` / `#fff2d6` | Copper keys, chests, doors |
| silver-shadow / base / highlight / glint | `#6b7280` / `#aab2bf` / `#eef1f5` / `#ffffff` | Silver keys, chests, doors |
| gold-shadow / base / highlight / glint | `#8a5a00` / `#e0a82e` / `#ffe08a` / `#fffbe6` | Gold keys, chests, doors |
| wood-shadow / base / light / interior | `#3f2817` / `#6b4423` / `#8a5a2b` / `#17100a` | All chests/doors |
| stone-shadow / base / light / passage | `#33333a` / `#55555f` / `#6e6e7a` / `#0a0a0d` | Door frame |
| outline | `#0b0d12` | All props (auto-applied, art-direction.md §3.4) |

## Appendix B — Commands

```bash
node tools/validate-prop-assets.mjs          # prop/tile/level-theme gate
node tools/render-sprite-preview.mjs         # regenerate docs/art/preview/*.png
node --test html/tests/*.test.mjs            # full native suite (507 tests)
```
