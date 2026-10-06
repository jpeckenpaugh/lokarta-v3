# Lokarta — Lore Premise & Naming Canon

**Owner:** Designer · **Source:** [LIV-5](/LIV/issues/LIV-5) (D1, Wave 1) · **Parent:** [LIV-4](/LIV/issues/LIV-4)
**Status:** Adopted — single source of truth for user-facing tower vocabulary.

## 1. Premise shift

The player no longer *descends deeper into a cave*. The player **ascends the levels of a
tower**. The old framing inverted the goal (sinking away from the game's own tagline,
"Come Into The Light"); the new framing makes the tagline literal — every floor climbed
brings the hero closer to the light at the tower's crown.

| | Before (cave-descent) | After (tower-ascent) |
| :-- | :-- | :-- |
| Motion | down / deeper / descend | up / higher / ascend |
| Container | cave, crypt, catacombs, vaults, sanctum | tower, tiers, floors |
| Goal | reach the bottom | reach the **Crown Spire** summit |
| Final level | "Floor 20" | **Level 5**, the Crown Spire |
| Final guardian | Abyssal Overlord | **The Spire Warden** |

**Design rationale.** A single, consistent direction of travel gives players a clear mental
model (Norman) and information scent: "ascend" signals progress-toward-goal, while
"descend/deeper" signals grinding away from it. Aligning lore with the existing tagline
("Come Into The Light") and the game's light/LOS mechanic removes a standing cognitive
dissonance between copy and mechanics.

## 2. Canonical tower tiers (5 levels, bottom → top)

The tower has **five levels**. Each level is a *tier* with its own visual theme (see
`docs/art/art-direction.md` and D3). Level 5 is the final level and holds the final guardian.

| Level | Tier name | Role | Legacy biome id (internal, unchanged) |
| --: | :-- | :-- | :-- |
| 1 | **The Gatehouse** | Ground floor; entry doorway in room 2 (middle-top) | `crypt` |
| 2 | **The Hall of Banners** | Great hall; first gated keys | `catacombs` |
| 3 | **The Bell Keep** | Mid tower; groups tighten | `shadow_vaults` |
| 4 | **The Solar Gallery** | High chambers; richest chests | `abyssal_sanctum` |
| 5 | **The Crown Spire** | Summit; **final level**, the Spire Warden | (final-floor override) |

> **Rollout boundary.** Structural work — collapsing 20 floors to 5, remapping biome ranges,
> and the stair-shaft sequence — is owned by **E1/E2**. D1 fixes the *vocabulary* above so
> engineering has stable names to target. Internally the legacy biome ids
> (`crypt`, `catacombs`, `shadow_vaults`, `abyssal_sanctum`) stay unchanged so cached
> floors, save data, and string keys do not migrate on a copy pass alone.

## 3. Naming table (old term → new term)

### Lore & motion

| Old (retired) | New | Notes |
| :-- | :-- | :-- |
| cave / caves | tower | |
| descend / descending / descended | ascend / ascending / ascended | |
| descent | ascent | |
| deeper (into the cave) | higher / up the tower | |
| "descending deeper into the cave" | "ascending the levels of the tower" | canonical premise sentence |
| Subterranean (as a place) | Tower | e.g. "Subterranean Mechanics" → "Tower Mechanics" |
| the abyss / abyssal (as a place) | the spire / the heights | |

### Biomes → tiers

| Old (retired) | New |
| :-- | :-- |
| Subterranean Crypt | The Gatehouse |
| Catacombs of Whispers | The Hall of Banners |
| Shadow Vaults | The Bell Keep |
| Abyssal Sanctum | The Solar Gallery |
| *(fifth tier)* | The Crown Spire |

### Actors

| Internal id (unchanged) | Old display name | New display name |
| :-- | :-- | :-- |
| `abyssal_overlord` | Abyssal Overlord | **The Spire Warden** |
| `crypt_skeleton` | Crypt Skeleton | **Bone Sentry** |
| `giant_rat` | Giant Rat | Giant Rat |
| `shadow_cultist` | Shadow Cultist | Shadow Cultist |
| `elite_cultist` | Elite Cultist | Elite Cultist |
| *(guard)* | Void Zealot | **Spire Sentinel** |
| *(guard)* | Abyssal Guardian | **Tower Keeper** |

### UI copy

| Old | New |
| :-- | :-- |
| A Gothic Roguelike Dungeon Crawl | A Gothic Roguelike Tower Ascent |
| Descend into the 20 Subterranean Vaults of Lokarta | Ascend the Five Tiers of the Tower of Lokarta |
| Subterranean Mechanics of Lokarta | Tower Mechanics of Lokarta |
| Back to Dungeon | Back to the Tower |
| The dungeon waits. | The tower waits. |
| "Descended to Floor N/20" | "Climbed to Floor N" |
| "DESCENDING TO FLOOR N" | "ASCENDING TO FLOOR N" |
| "ALL 20 FLOORS CLEARED" | "THE TOWER IS LIT" |
| "fallen in the crypt" | "fallen in the tower" |

## 4. String-key stability rule

Only **display values** change in this pass. The following stay byte-stable so engineering
and persistence are untouched:

- JSON keys and `id`/`type` fields (e.g. `crypt`, `abyssal_overlord`, `crypt_skeleton`).
- IndexedDB object-store names (`dungeon_floors`, `slot_floors`) and field names
  (`floor_number`, `biome`, `biome_name`, `current_floor`).
- File names (`dungeons.json`, `biomes.json`, `floor-generator.js`,
  `01-dungeon-generator.md`), barrel exports (`BIOMES_CATALOG`, `DUNGEONS_CATALOG`), and
  `FLOOR_TEMPLATE_VERSION`.
- Sprite paths (`docs/art/preview/abyssal_overlord.png`, `html/assets/sprites/**`).

Renaming any of the above is an engineering migration (E1/E6), not a copy edit.

## 5. Acceptance for D1

- No user-facing doc or in-game string still says **cave**, **descend/descent**, or
  **deeper** in the cave sense.
- All five tier names, the renamed guardian, and the ascending motion are used
  consistently across docs and UI copy.
- `node --test html/tests/*.test.mjs` remains green (display-name and internal-key
  parity preserved).
