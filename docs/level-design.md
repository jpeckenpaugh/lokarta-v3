# Lokarta — Level Design Spec: "Ascend the Tower" (D2)

**Issue:** [LIV-6](/LIV/issues/LIV-6) · **Parent:** [LIV-4](/LIV/issues/LIV-4) · **Owner:** Designer
**Status:** Published — authoritative for E1–E7
**Supersedes:** the 20-floor cave-descent layout in `dungeons.json` / `encounters.json` / `floor-generator.js`

---

## 0. TL;DR (the contract)

- **5 levels**, each a **3×3 nine-room** floor. Room numbering is row-major: `1 2 3 / 4 5 6 / 7 8 9`.
- Player enters **Level 1 through a doorway on the top edge of room 2** (middle-top).
- Each level is a **spanning tree of the 9 rooms** (8 carved corridors, 4 sealed). That makes every gated door a **bridge** — the only way forward.
- Each level has **exactly 3 gated doors** (copper → silver → gold) and **3 key-holder monsters**, one per key room. **Gold gates the stair room**, which is a leaf.
- Key holders sit in strict progression components: copper is reachable from entry with no keys; silver is behind the copper gate; gold is behind the silver gate; the stairwell is behind the gold gate.
- **Layout is seed-independent**; only monster jitter and chest contents use the seeded PRNG.
- The progression graph is **provably soft-lock-free** on every level (§10).

---

## 1. Design pillars & lenses

| Pillar | Why | Lens |
| :-- | :-- | :-- |
| One forward path, real gates | Players must never wonder "where do I go?" nor soft-lock | Cognitive Load, Information Scent |
| Three visible tolls (copper/silver/gold) | Clear milestone cadence; each gate = a remembered beat | Peak-End Rule, Chunking (3±0) |
| Stair room is a leaf, gold-gated | The climax (stairs) is a distinct, earned destination | Von Restorff, Flow |
| Reuse the 9-room grid + catalog patterns | No new subsystems; deterministic + testable | Occam's Razor, Jakob's Law |
| Non-color tier cues on keys/doors/chests | Color-blind players can read tier from shape | WCAG 1.4.1, color-independence |
| Auto-open gates on key grant | Zero soft-lock surface; instant feedback | Norman feedback, Doherty <400ms |

Synergy with `docs/art-direction.md` §3.5/§3.6: the tower tiers keep warm/cool light tints distinct from copper/silver/**_gold_** accents; the gold key/chest/door carry a **crown** silhouette so "gold" reads in greyscale.

---

## 2. World model (normative)

Coordinates are `(x, y)`, `0..39`, matching the existing 40×40 matrix. Boundary tiles stay `WALL` (existing invariant).

### 2.1 Tile types (`TILE_TYPES`, extend the existing enum)

| Name | Value | Passable | Notes |
| :-- | --: | :--: | :-- |
| `FLOOR` | 0 | yes | |
| `WALL` | 1 | no | |
| `STAIRS` | 2 | yes | **Now carries `stairDir`: `"up"` \| `"down"`** |
| `DOOR` | 3 | yes | cosmetic (existing) |
| `GATED_DOOR` | 4 | **no until unlocked** | carries `gate: "copper"\|"silver"\|"gold"` |

`FLOOR_TEMPLATE_VERSION` → **3**.

### 2.2 Rooms (`dungeons.json.standard_40x40.rooms`, retained byte-for-byte)

| Room | Bounds `[x1,y1,x2,y2]` | Center `(cx,cy)` | Row |
| --: | :-- | :-- | :-- |
| 1 | `[1,1,11,11]` | (6, 6) | top |
| 2 | `[13,1,25,11]` | (19, 6) | top |
| 3 | `[27,1,38,11]` | (32, 6) | top |
| 4 | `[1,13,11,26]` | (6, 19) | middle |
| 5 | `[13,13,25,26]` | (19, 19) | middle |
| 6 | `[27,13,38,26]` | (32, 19) | middle |
| 7 | `[1,28,11,38]` | (6, 33) | bottom |
| 8 | `[13,28,25,38]` | (19, 33) | bottom |
| 9 | `[27,28,38,38]` | (32, 33) | bottom |

Room 5 keeps the 4 decorative pillar tiles on odd levels: `(18,18) (18,23) (23,18) (23,23)`. Placement code must skip them.

### 2.3 Edges (corridors) and gated-door tiles

Each of the 12 grid adjacencies has two threshold tiles. An **open** edge is carved as today and its tiles become `DOOR`. A **sealed** edge is not carved (stays `WALL`). A **gated** edge is carved, and **both** its tiles become `GATED_DOOR` of the named tier.

| Edge id | Rooms | Threshold tiles `(x,y)` |
| :-- | :-- | :-- |
| `h12` | 1 ↔ 2 | (12,5) (12,6) |
| `h23` | 2 ↔ 3 | (26,5) (26,6) |
| `h45` | 4 ↔ 5 | (12,19) (12,20) |
| `h56` | 5 ↔ 6 | (26,19) (26,20) |
| `h78` | 7 ↔ 8 | (12,33) (12,34) |
| `h89` | 8 ↔ 9 | (26,33) (26,34) |
| `v14` | 1 ↔ 4 | (5,12) (6,12) |
| `v25` | 2 ↔ 5 | (18,12) (19,12) |
| `v36` | 3 ↔ 6 | (32,12) (33,12) |
| `v47` | 4 ↔ 7 | (5,27) (6,27) |
| `v58` | 5 ↔ 8 | (18,27) (19,27) |
| `v69` | 6 ↔ 9 | (32,27) (33,27) |

> The tombstone: `corridorsH`/`corridorsV`/`doorways` in `dungeons.json` are **replaced by the per-level `openEdges` + `gates` tables in §5**. Do not emit door tiles for sealed edges.

### 2.4 Stair tiles (fixed per stair room)

| Stair room | Tile `(x,y)` | `stairDir` context |
| --: | :-- | :-- |
| 3 | (33, 6) | up on L4, down on L3 |
| 5 | (20, 20) | up on L5 (Summit); final objective |
| 6 | (33, 19) | up on L3, down on L2 |
| 8 | (20, 33) | up on L5, down on L4 |
| 9 | (33, 33) | up on L2, down on L1 |

---

## 3. Entry & the 2-way stair shaft

### 3.1 Entry

- Level 1 **entry door**: `(19,1)` — the top edge of room 2. Emit a `DOOR` tile (always open, cosmetic).
- Level 1 **spawn**: `(19,2)`, one tile below the door, facing `down`.
- Levels 2–5 **spawn**: one tile *away from* the arrival up-stair tile, so the arrival stair never auto-retriggers (see §9.3).

### 3.2 Shaft sequence (deterministic)

`S = [S1…S5] = [9, 6, 3, 8, 5]`

On level N: **up-stair** is at `stairTile[S(N-1)]` (levels 2–5), **down-stair** is at `stairTile[S(N)]`.
`S(0)` = room 2 (the L1 doorway). Because `S(N-1)` is the prior level's stair room, moving down from level N−1 lands exactly on level N's up-stair tile → a true vertical shaft.

| Level | Entrance | Level tier | Up-stair (room → tile) | Down-stair (room → tile) |
| --: | :-- | :-- | :-- | :-- |
| 1 | room **2** doorway `(19,1)` | The Gatehouse | — (ground) | room 9 → (33,33) |
| 2 | up-stair room **9** `(33,33)` | Hall of Banners | room 9 → (33,33) | room 6 → (33,19) |
| 3 | up-stair room **6** `(33,19)` | Ember Gallery | room 6 → (33,19) | room 3 → (33,6) |
| 4 | up-stair room **3** `(33,6)` | Umbral Spire | room 3 → (33,6) | room 8 → (20,33) |
| 5 | up-stair room **8** `(20,33)` | Crown of Light | room 8 → (20,33) | **Summit `(20,20)` room 5 — final, boss-gated** |

Level 5 has **no down-stair**. `(20,20)` in room 5 is the Summit: defeating the level-5 guardian triggers the ending (see §6.4).

---

## 4. Key / door progression

### 4.1 Tiers & keys

| Tier | Key item id | Key name | Gate tile kind | Required to pass |
| :-- | :-- | :-- | :-- | :-- |
| copper | `key_copper` | Copper Key | `GATED_DOOR` gate=`copper` | → copper gate |
| silver | `key_silver` | Silver Key | `GATED_DOOR` gate=`silver` | → silver gate |
| gold | `key_gold` | Gold Key | `GATED_DOOR` gate=`gold` | → stairs / boss chamber |

**Progression invariant (strict):** `entry → copper holder → [copper gate] → silver holder → [silver gate] → gold holder → [gold gate] → stair room`.

### 4.2 Acquisition & opening (single canonical behavior for E3)

1. Each level has exactly one **key-holder** monster per key room; it is visually distinct (key glint/aura, §11) and flagged `holdsKey`.
2. On the holder's death the key is **granted instantly and atomically** (no ground drop → impossible to lose, no inventory-full failure) and mirrored in the **HUD keyring**.
3. Granting a key **immediately unlocks and opens** every `GATED_DOOR` of that tier on that level. Doors stay open for the rest of the run and persist.
4. Opening is a first-class feedback beat: keyring lights, gate slides open (150 ms), unlock chime, brief `"[Tier] Gate Opened"` toast, minimap gate marker flips to open. Target < 400 ms (Doherty).
5. Locked-gate bump feedback (before the key): gate shakes once, "locked" thud, and the **keyhole glows in the tier's shape** (circle / square / crown) — a non-color affordance.

> The plan's "keys are inventory" assumption is honored by the non-droppable keyring entry; the **issue's** "defeating it grants the key and opens the door" is the canonical automation. This removes the only soft-lock surface a dropped-key pickup could create.

### 4.3 Room tiers (number of gates passed)

`tier 0` = entry component (no key) · `tier 1` = after copper · `tier 2` = after silver · `tier 3` = after gold (stair room / boss chamber).

| Level | tier 0 rooms | tier 1 rooms | tier 2 rooms | tier 3 (stair) |
| --: | :-- | :-- | :-- | :-- |
| 1 | 1, 2, 3 | 4, 7, 8 | 5, 6 | 9 |
| 2 | 8, 9 | 7 | 1, 2, 3, 4, 5 | 6 |
| 3 | 5, 6, 9 | 8 | 1, 2, 4, 7 | 3 |
| 4 | 2, 3 | 5, 6, 9 | 1, 4, 7 | 8 |
| 5 | 6, 7, 8, 9 | 4 | 1, 2, 3 | 5 (Summit) |

---

## 5. Per-level progression tables (authoritative)

`holder` = key-holder room. Gate tiles are the two threshold tiles of the named edge (§2.3).

### Level 1 — The Gatehouse
- **Entry** room 2 · **Stair** room 9 (down)
- **Open edges:** `h12 h23 h45 h56 v14 v47 h78 h89` · **Sealed:** `v25 v36 v58 v69`

| Step | Room | Edge | Gate tile |
| :-- | --: | :-- | :-- |
| Copper holder | **1** | — | — |
| **Copper gate** | — | `v14` (1↔4) | (6,12) |
| Silver holder | **4** | — | — |
| **Silver gate** | — | `h45` (4↔5) | (12,19) |
| Gold holder | **6** | — | — |
| **Gold gate** | — | `h89` (8↔9) | (26,34) |
| Stair | **9** | — | — |

### Level 2 — The Hall of Banners
- **Entry** room 9 (up-stair) · **Stair** room 6 (down)
- **Open edges:** `h23 h45 h56 h78 h89 v14 v47 v25` · **Sealed:** `h12 v58 v36 v69`

| Step | Room | Edge | Gate tiles |
| :-- | --: | :-- | :-- |
| Copper holder | **8** | — | — |
| **Copper gate** | — | `h78` (7↔8) | (12,33) (12,34) |
| Silver holder | **7** | — | — |
| **Silver gate** | — | `v47` (4↔7) | (5,27) (6,27) |
| Gold holder | **5** | — | — |
| **Gold gate** | — | `h56` (5↔6) | (26,19) (26,20) |
| Stair | **6** | — | — |

### Level 3 — The Ember Gallery
- **Entry** room 6 (up-stair) · **Stair** room 3 (down)
- **Open edges:** `h12 h23 h56 h78 v14 v47 v58 v69` · **Sealed:** `h45 h89 v25 v36`

| Step | Room | Edge | Gate tiles |
| :-- | --: | :-- | :-- |
| Copper holder | **5** | — | — |
| **Copper gate** | — | `v58` (5↔8) | (18,27) (19,27) |
| Silver holder | **8** | — | — |
| **Silver gate** | — | `h78` (7↔8) | (12,33) (12,34) |
| Gold holder | **2** | — | — |
| **Gold gate** | — | `h23` (2↔3) | (26,5) (26,6) |
| Stair | **3** | — | — |

### Level 4 — The Umbral Spire
- **Entry** room 3 (up-stair) · **Stair** room 8 (down)
- **Open edges:** `h23 h45 h56 h78 v14 v47 v25 v69` · **Sealed:** `h12 h89 v58 v36`

| Step | Room | Edge | Gate tiles |
| :-- | --: | :-- | :-- |
| Copper holder | **2** | — | — |
| **Copper gate** | — | `v25` (2↔5) | (18,12) (19,12) |
| Silver holder | **5** | — | — |
| **Silver gate** | — | `h45` (4↔5) | (12,19) (12,20) |
| Gold holder | **7** | — | — |
| **Gold gate** | — | `h78` (7↔8) | (12,33) (12,34) |
| Stair | **8** | — | — |

### Level 5 — The Crown of Light (final)
- **Entry** room 8 (up-stair) · **Objective** room 5 Summit (boss chamber)
- **Open edges:** `h12 h23 h78 h89 v14 v25 v47 v69` · **Sealed:** `h45 h56 v58 v36`

| Step | Room | Edge | Gate tiles |
| :-- | --: | :-- | :-- |
| Copper holder | **7** | — | — |
| **Copper gate** | — | `v47` (4↔7) | (5,27) (6,27) |
| Silver holder | **4** | — | — |
| **Silver gate** | — | `v14` (1↔4) | (5,12) (6,12) |
| Gold holder | **2** | — | — |
| **Gold gate** | — | `v25` (2↔5) | (18,12) (19,12) |
| Summit | **5** | — | — |

> No new keys on any level; keys are per-level and reset (re-acquired) on each level.

---

## 6. Monster groups

### 6.1 Group size & composition

- Every room spawns a group of `groupSize(level)` monsters.
- `groupSize` = **3** for levels 1–2, **4** for levels 3–5.
- Composition is deterministic: member `i` of room `r` uses `pool[(r - 1 + i) mod pool.length]` (see `pool` per level below).
- **Key rooms:** the **last** group slot is replaced by the tier's `keyHolderType`, buffed and flagged `holdsKey`.
- **Entry room:** its group is placed at the anchor **farthest** from the spawn tile and starts non-aggro (safe landing; no spawn ambush).

| Level | Monster pool (catalog `type`s) | `keyHolderType` copper / silver / gold |
| --: | :-- | :-- |
| 1 | `giant_rat`, `crypt_skeleton` | `crypt_skeleton` / `crypt_skeleton` / `shadow_cultist` |
| 2 | `giant_rat`, `crypt_skeleton`, `shadow_cultist` | `crypt_skeleton` / `shadow_cultist` / `shadow_cultist` |
| 3 | `crypt_skeleton`, `shadow_cultist` | `shadow_cultist` / `shadow_cultist` / `elite_cultist` |
| 4 | `shadow_cultist`, `elite_cultist` | `elite_cultist` / `elite_cultist` / `elite_cultist` |
| 5 | `elite_cultist`, `shadow_cultist`, `elite_cultist` | `elite_cultist` / `elite_cultist` / `elite_cultist` |

> `type` keys are stable; D1 may rename display names. `MONSTERS_CATALOG` remains the base-stat source.

### 6.2 Level stat scaling

`hp = round(baseHp × hpMult[L])`, `atk = round(baseAttack × atkMult[L])`.

| Level | hpMult | atkMult |
| --: | --: | --: |
| 1 | 1.00 | 1.00 |
| 2 | 1.35 | 1.25 |
| 3 | 1.80 | 1.55 |
| 4 | 2.40 | 1.90 |
| 5 | 3.20 | 2.40 |

**Key holder modifier:** `hp ×1.5`, `atk ×1.15`, plus `holdsKey: "<tier>"`, key-glint sprite, no random loot.

### 6.3 Boss-room guards (level 5, room 5)

The Summit group is the guardian plus **2 guards** (`elite_cultist` base, scaled at level 5), positioned flanking the guardian.

### 6.4 Level-5 guardian

- Room **5**, center `(19,19)`, `type: abyssal_overlord`, display name **"The Spire Warden"** (canonical per D1 `docs/lore-and-naming.md`).
- Stats **unchanged** from the existing boss to respect the sprint guardrail: `600 HP / 20 ATK / 6 DEF`, `isBoss: true`.
- Guardrail: only key/chest drop wiring may touch combat; **do not re-tune** vocation/combat systems here.

---

## 7. Chests & loot

### 7.1 Placement rules (per room)

- **Exactly one chest per room** (9 per level, 45 total).
- Chest becomes a world entity `{ room, x, y, tier, opened: false }`.
- **Chest tier rule:**
  - room **tier 0** → **copper**
  - room **tier 1 or 2** → **silver**
  - room **tier 3** (stair room) → **gold**
  - **exception:** the **gold-key room** always holds a **gold** chest (deepest reward of the level).
- Placement is deterministic (§9) at the room's chest anchor, skipping walls/doors/stairs/pillars/spawn/monsters/other chests.
- Clearing the gold gate does **not** reveal a chest; chests are visible when the player first lights the tile.

### 7.2 Chest tier per room (derived)

| Level | Room 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| --: | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | copper | copper | copper | silver | silver | **gold** | silver | silver | gold |
| 2 | silver | silver | silver | silver | **gold** | gold | silver | copper | copper |
| 3 | silver | **gold** | gold | silver | copper | copper | silver | silver | copper |
| 4 | silver | copper | copper | silver | silver | silver | **gold** | gold | silver |
| 5 | silver | **gold** | silver | silver | gold | copper | copper | copper | copper |

(**bold** = gold-key room; star rooms are the tier-3 stair room.)

### 7.3 Loot tables

Each chest rolls `rolls` entries, weighted, **without replacement**. Quantities are `[min,max]` inclusive. `vocationGear` entries roll an item from the opener's vocation pool filtered by `lootTier` and by `vocationAffinity` (neutral items always eligible) — "smart loot" so drops are usable (Kano: must-be).

```jsonc
{
  "chests": {
    "copper": {
      "rolls": 2,
      "entries": [
        { "itemId": "health_potion", "quantity": [1,1], "weight": 30 },
        { "itemId": "mana_potion",   "quantity": [1,1], "weight": 15 },
        { "itemId": "arrows",        "quantity": [8,16], "weight": 30 },
        { "itemId": "torch",         "quantity": [1,1], "weight": 15 },
        { "vocationGear": true, "lootTier": [1,1], "quantity": [1,1], "weight": 10 }
      ]
    },
    "silver": {
      "rolls": 2,
      "entries": [
        { "itemId": "health_potion", "quantity": [2,2], "weight": 18 },
        { "itemId": "mana_potion",   "quantity": [2,2], "weight": 15 },
        { "itemId": "arrows",        "quantity": [20,32], "weight": 22 },
        { "itemId": "torch",         "quantity": [1,1], "weight": 10 },
        { "itemId": "relic_luminous_amulet", "quantity": [1,1], "weight": 8 },
        { "vocationGear": true, "lootTier": [1,2], "quantity": [1,1], "weight": 27 }
      ]
    },
    "gold": {
      "rolls": 3,
      "entries": [
        { "itemId": "health_potion", "quantity": [3,3], "weight": 15, "displayName": "Greater Health Potion" },
        { "itemId": "mana_potion",   "quantity": [3,3], "weight": 15, "displayName": "Greater Mana Potion" },
        { "itemId": "arrows",        "quantity": [40,60], "weight": 12 },
        { "itemId": "relic_luminous_amulet", "quantity": [1,1], "weight": 10 },
        { "itemId": "relic_champions_crest", "quantity": [1,1], "weight": 8 },
        { "vocationGear": true, "lootTier": [2,3], "quantity": [1,1], "weight": 40 }
      ]
    }
  }
}
```

### 7.4 Vocation gear `lootTier` (add to `items.json`)

| Tier | Magician | Archer | Fighter | Paladin | Neutral |
| --: | :-- | :-- | :-- | :-- | :-- |
| 1 | `apprentice_wand`, `apprentice_cape`, `spell_wand_spark` | `wooden_bow`, `hunter_quiver`, `hunter_leathers` | `tempered_broadsword`, `iron_helm`, `buckler` | `consecrated_warhammer`, `holy_crown` | — |
| 2 | `astral_scepter`, `spell_energy_beam` | `composite_bow`, `grey_stalker_quiver`, `archer_hood` | `vanguard_shield`, `plate_armor` | `aegis_shield`, `plate_armor` | `relic_luminous_amulet` |
| 3 | — | — | — | — | `relic_champions_crest` |

### 7.5 Ground scatter (reduced)

Replace the 5 fixed floor drops + milestone drop with **one starter cache per level**, placed near the entry/up-stair:

| Level | Starter cache (near spawn) |
| --: | :-- |
| 1 | `arrows` ×22 (supports Archer onboarding, as before) |
| 2–5 | `health_potion` ×1 + `torch` ×1 |

All other rewards come from chests.

---

## 8. Catalogs contract (for E1)

E1 builds these catalog shapes from this spec; the values are already fully determined above.

```jsonc
// dungeons.json — replace standard_40x40 layout payload
{
  "standard_40x40": {
    "templateVersion": 3,
    "width": 40, "height": 40,
    "rooms": [ /* §2.2 unchanged */ ],
    "roomCenters": { "1": [6,6], "2": [19,6], "3": [32,6], "4": [6,19], "5": [19,19], "6": [32,19], "7": [6,33], "8": [19,33], "9": [32,33] },
    "pillars": [[18,18],[18,23],[23,18],[23,23]],
    "edges": {
      "h12": { "rooms": [1,2], "tiles": [[12,5],[12,6]] },
      "h23": { "rooms": [2,3], "tiles": [[26,5],[26,6]] },
      "h45": { "rooms": [4,5], "tiles": [[12,19],[12,20]] },
      "h56": { "rooms": [5,6], "tiles": [[26,19],[26,20]] },
      "h78": { "rooms": [7,8], "tiles": [[12,33],[12,34]] },
      "h89": { "rooms": [8,9], "tiles": [[26,33],[26,34]] },
      "v14": { "rooms": [1,4], "tiles": [[5,12],[6,12]] },
      "v25": { "rooms": [2,5], "tiles": [[18,12],[19,12]] },
      "v36": { "rooms": [3,6], "tiles": [[32,12],[33,12]] },
      "v47": { "rooms": [4,7], "tiles": [[5,27],[6,27]] },
      "v58": { "rooms": [5,8], "tiles": [[18,27],[19,27]] },
      "v69": { "rooms": [6,9], "tiles": [[32,27],[33,27]] }
    }
  }
}
```

```jsonc
// tower_levels.json — 5-level definition + stair shaft + per-level gates
{
  "levelCount": 5,
  "entry": { "level": 1, "room": 2, "doorTile": [19,1], "spawnTile": [19,2] },
  "stairShaft": { "1": 9, "2": 6, "3": 3, "4": 8, "5": 5 },
  "stairTiles": { "3": [33,6], "5": [20,20], "6": [33,19], "8": [20,33], "9": [33,33] },
  "levels": [
    { "level": 1, "tierId": "crypt",          "entryRoom": 2, "stairRoom": 9,
      "openEdges": ["h12","h23","h45","h56","v14","v47","v58","v69"],
      "sealedEdges": ["h78","h89","v25","v36"],
      "gates": { "copper": "v14", "silver": "h45", "gold": "v69" },
      "keyRooms": { "copper": 1, "silver": 4, "gold": 6 },
      "roomTiers": { "1":0,"2":0,"3":0,"4":1,"5":2,"6":2,"7":1,"8":2,"9":3 } },
    { "level": 2, "tierId": "catacombs",      "entryRoom": 9, "stairRoom": 6,
      "openEdges": ["h23","h45","h56","h78","h89","v14","v47","v25"],
      "sealedEdges": ["h12","v58","v36","v69"],
      "gates": { "copper": "h78", "silver": "v47", "gold": "h56" },
      "keyRooms": { "copper": 8, "silver": 7, "gold": 5 },
      "roomTiers": { "1":2,"2":2,"3":2,"4":2,"5":2,"6":3,"7":1,"8":0,"9":0 } },
    { "level": 3, "tierId": "shadow_vaults",  "entryRoom": 6, "stairRoom": 3,
      "openEdges": ["h12","h23","h56","h78","v14","v47","v58","v69"],
      "sealedEdges": ["h45","h89","v25","v36"],
      "gates": { "copper": "v58", "silver": "h78", "gold": "h23" },
      "keyRooms": { "copper": 5, "silver": 8, "gold": 2 },
      "roomTiers": { "1":2,"2":2,"3":3,"4":2,"5":0,"6":0,"7":2,"8":1,"9":0 } },
    { "level": 4, "tierId": "abyssal_sanctum","entryRoom": 3, "stairRoom": 8,
      "openEdges": ["h23","h45","h56","h78","v14","v47","v25","v69"],
      "sealedEdges": ["h12","h89","v58","v36"],
      "gates": { "copper": "v25", "silver": "h45", "gold": "h78" },
      "keyRooms": { "copper": 2, "silver": 5, "gold": 7 },
      "roomTiers": { "1":2,"2":0,"3":0,"4":2,"5":1,"6":1,"7":2,"8":3,"9":1 } },
    { "level": 5, "tierId": "crown_spire",    "entryRoom": 8, "stairRoom": 5, "isFinal": true,
      "openEdges": ["h12","h23","h78","h89","v14","v25","v47","v69"],
      "sealedEdges": ["h45","h56","v58","v36"],
      "gates": { "copper": "v47", "silver": "v14", "gold": "v25" },
      "keyRooms": { "copper": 7, "silver": 4, "gold": 2 },
      "roomTiers": { "1":2,"2":2,"3":2,"4":1,"5":3,"6":0,"7":0,"8":0,"9":0 } }
  ],
  "monsterGroups": {
    "groupSize": { "1":3, "2":3, "3":4, "4":4, "5":4 },
    "pool": {
      "1": ["giant_rat","crypt_skeleton"],
      "2": ["giant_rat","crypt_skeleton","shadow_cultist"],
      "3": ["crypt_skeleton","shadow_cultist"],
      "4": ["shadow_cultist","elite_cultist"],
      "5": ["elite_cultist","shadow_cultist","elite_cultist"]
    },
    "keyHolderType": {
      "1": { "copper":"crypt_skeleton", "silver":"crypt_skeleton", "gold":"shadow_cultist" },
      "2": { "copper":"crypt_skeleton", "silver":"shadow_cultist", "gold":"shadow_cultist" },
      "3": { "copper":"shadow_cultist", "silver":"shadow_cultist", "gold":"elite_cultist" },
      "4": { "copper":"elite_cultist",  "silver":"elite_cultist",  "gold":"elite_cultist" },
      "5": { "copper":"elite_cultist",  "silver":"elite_cultist",  "gold":"elite_cultist" }
    },
    "statScale": {
      "1": { "hp":1.00, "atk":1.00 }, "2": { "hp":1.35, "atk":1.25 },
      "3": { "hp":1.80, "atk":1.55 }, "4": { "hp":2.40, "atk":1.90 },
      "5": { "hp":3.20, "atk":2.40 }
    },
    "keyHolderModifier": { "hp": 1.5, "atk": 1.15 }
  },
  "chestTierRule": {
    "byRoomTier": { "0":"copper", "1":"silver", "2":"silver", "3":"gold" },
    "goldKeyRoomOverride": "gold"
  }
}
```

```jsonc
// biomes.json → 5 tower tiers (replace 4 cave biomes).
// Per D1 (docs/lore-and-naming.md): tier display names + legacy biome ids are FROZEN.
// Each legacy id is reused for exactly one level; a new fifth id covers level 5.
{
  "crypt":          { "id":"crypt",          "name":"The Gatehouse",      "minLevel":1, "maxLevel":1, "lightColor":"#ff8800" },
  "catacombs":      { "id":"catacombs",      "name":"The Hall of Banners", "minLevel":2, "maxLevel":2, "lightColor":"#00d4ff" },
  "shadow_vaults":  { "id":"shadow_vaults",  "name":"The Bell Keep",      "minLevel":3, "maxLevel":3, "lightColor":"#a855f7" },
  "abyssal_sanctum":{ "id":"abyssal_sanctum","name":"The Solar Gallery",  "minLevel":4, "maxLevel":4, "lightColor":"#ef4444" },
  "crown_spire":    { "id":"crown_spire",    "name":"The Crown Spire",    "minLevel":5, "maxLevel":5, "lightColor":"#ffd700" }
}
```

```jsonc
// items.json — add three keys
{
  "key_copper": { "item_id":"key_copper", "name":"Copper Key", "type":"key", "keyTier":"copper", "vocationAffinity":"neutral", "icon":"🔑", "svgCode":"1F511", "maxStack":1, "droppable":false },
  "key_silver": { "item_id":"key_silver", "name":"Silver Key", "type":"key", "keyTier":"silver", "vocationAffinity":"neutral", "icon":"🗝️", "svgCode":"1F5DD", "maxStack":1, "droppable":false },
  "key_gold":   { "item_id":"key_gold",   "name":"Gold Key",   "type":"key", "keyTier":"gold",   "vocationAffinity":"neutral", "icon":"🗝️", "svgCode":"1F5DD", "maxStack":1, "droppable":false }
}
```

```jsonc
// doors.json (new) — tier → key + non-color shape cue (D3 owns art)
{
  "copper": { "tier":"copper", "keyItemId":"key_copper", "shape":"circle", "accent":"#b87333" },
  "silver": { "tier":"silver", "keyItemId":"key_silver", "shape":"square", "accent":"#c0c0c8" },
  "gold":   { "tier":"gold",   "keyItemId":"key_gold",   "shape":"crown",  "accent":"#facc15" }
}
```

`encounters.json` is replaced by `tower_levels.json.monsterGroups` + the existing `MONSTERS_CATALOG` base stats (no `tier_1_5…tier_20_boss` keys remain).

---

## 9. Determinism & placement algorithm

### 9.1 Seed policy

- **Structure is seed-independent:** rooms, open/sealed edges, gates, key rooms, room tiers, chest tiers, stair tiles — identical on every run.
- **Seeded PRNG** (`createPRNG(1337 + level*42)`, existing) affects only: which pool member lands in each non-holder slot when the pool length > needed (none at current sizes), monster jitter within ±1 tile of its anchor, and chest **contents**.
- Same seed + same level ⇒ byte-identical output (keeps E7's determinism tests valid).

### 9.2 Deterministic entity placement (normative)

For each room, build the ordered candidate list:
`interior = [x1+1..x2-1] × [y1+1..y2-1]`, minus pillars, minus any stair/door/entry/spawn tile.
For each placement role, scan candidates **row-major starting at a role anchor** (wrap to the top-left) and take the first free, unoccupied tile:

| Role | Anchor (relative to room center) |
| :-- | :-- |
| key holder | `+ (2, +2)` |
| chest | `+ (-3, +2)` |
| monster slot 0..3 | `+(0,0)`, `+(-3,0)`, `+(3,0)`, `+(0,3)` |
| starter cache (entry room only) | `+ (0, +3)` (L1 spawn room) |

Order: fixed tiles → key holder → chest → monster slots → starter cache. This makes monster/chest placement collision-free and reproducible without hand-authored coordinates.

### 9.3 Stair arming (prevents transition loops)

- On arrival from a transition, the tile the player lands on is marked `stairArmed:false` until the player steps off it.
- A `STAIRS` tile advances only when `stairArmed` is true and the player moves onto it.
- `stairDir` selects the target level (`up` → N−1, `down` → N+1); missing direction is a no-op with a feedback cue.
- Level 5's Summit `(20,20)` triggers victory only after the level-5 guardian dies.

---

## 10. No-soft-lock proof

**Model.** For each level L, the carved graph `G_L = (rooms, openEdges)` is a **tree** (8 edges, 9 nodes, connected — verified). Every gate edge is therefore a **bridge**. Removing the three gate edges splits `G_L` into 4 components `C0, C1, C2, C3`. `entry ∈ C0`; `stairRoom ∈ C3` and the stair room is a **leaf** (degree 1).

**Invariant per level (verified for all 5):**

1. `copperHolder ∈ C0` → reachable with no keys.
2. `silverHolder ∈ C1` → **not** reachable before the copper gate; reachable after it.
3. `goldHolder ∈ C2` → **not** reachable before the silver gate; reachable after it.
4. `stairRoom ∈ C3` → **not** reachable before the gold gate; reachable after it.

Because each component's only connection toward the goal is its single bridge gate, no alternate route can bypass a key. Keys are granted atomically (no droppable inventory step), so a key can never become unreachable. Therefore **there is no soft-lock**.

**Reference validator (also the E7 test oracle):**

```js
function assertNoSoftlock(level) {
  const state = { copper:false, silver:false, gold:false };
  const bfs = () => {
    const adj = buildAdjacency(level.openEdges, level.gates, state); // locked gate => edge omitted
    return reachable(adj, level.entryRoom);
  };
  const R0 = bfs();
  assert(R0.has(level.keyRooms.copper));
  assert(!R0.has(level.keyRooms.silver) && !R0.has(level.keyRooms.gold) && !R0.has(level.stairRoom));
  state.copper = true; const R1 = bfs();
  assert(R1.has(level.keyRooms.silver));
  assert(!R1.has(level.keyRooms.gold) && !R1.has(level.stairRoom));
  state.silver = true; const R2 = bfs();
  assert(R2.has(level.keyRooms.gold) && !R2.has(level.stairRoom));
  state.gold = true; const R3 = bfs();
  assert(R3.has(level.stairRoom));
}
```

Reference run output (scratch validator, all 5 levels): `ALL LEVELS OK: strict order, no soft-locks`.

---

## 11. Accessibility, feedback & game-feel

| Concern | Spec | Lens |
| :-- | :-- | :-- |
| **Color-independence** | Keys use bow shapes (circle/square/crown); gates show the same shape in the keyhole; chests show 1/2/3 lid studs. Tier is readable in greyscale. | WCAG 1.4.1 |
| **Contrast** | Key/chest/door accents must hit ≥3:1 against floor `#1a1c23`; use the master palette (`docs/art-direction.md` App. A). | WCAG 1.4.11 |
| **Feedback latency** | Key grant → gate open ≤400 ms; hit/attack feedback unchanged. | Doherty |
| **Recognition over recall** | Persistent HUD keyring per level (copper/silver/gold) + toast on unlock; minimap gate markers. | Nielsen #6 |
| **Reduced motion** | Gate slide and chest open collapse to a 1-frame state change under `prefers-reduced-motion`. | WCAG 2.3 |
| **No spawn ambush** | Entry-room group placed farthest from spawn, non-aggro. | Fairness |
| **Ethics** | No time pressure on gates, no consumable keys, no surprise tolls; rewards are deterministic and visible. | Refuse dark patterns |

---

## 12. Acceptance criteria (traceability)

| # | Criterion | Owner |
| --: | :-- | :-- |
| A1 | Catalogs encode the §8 shapes: 5 levels, `openEdges`/`sealedEdges`, gates, key rooms, stair shaft, monster groups, chest loot. | E1 |
| A2 | Generator produces 5 levels, entry at room-2 `(19,1)`/spawn `(19,2)`, per-level open/sealed edges, gate tiles as `GATED_DOOR`, stair tiles §2.4, `templateVersion 3`. | E2 |
| A3 | Up/down stairs traverse the shaft; no transition loops (stair arming §9.3). | E2/E6 |
| A4 | Groups of 3–4 per room; holder flagged, buffed, drops/grants key; grant opens the tier gate. | E3 |
| A5 | One chest per room at the §7.2 tier; loot per §7.3; opened state persists. | E4 |
| A6 | Keys/doors/chests render with tier + shape cue; per-level tower variation. | E5 |
| A7 | 20→5 migration clamps saves to levels 1–5 and invalidates cached floors. | E6 |
| A8 | Tests cover §10 validator (all levels, many seeds) plus generation/keys/chests/migration. | E7 |

**D2 done means:** E1–E7 can implement from this document alone; §10 validates on all 5 levels; every table is copy-pasteable.

---

## 13. Residual risks & decisions left open

- **Auto-open vs bump-to-open.** Canonical is auto-open on grant (soft-lock-proof, E3-literal). A bump-to-open variant with guaranteed inventory keys is equally safe but needs a new interaction; **not** in scope.
- **Tower tier names/light colors** align to D1's canon (`docs/lore-and-naming.md`): tier display names and legacy biome ids (`crypt`, `catacombs`, `shadow_vaults`, `abyssal_sanctum`) + new `crown_spire` are **frozen**. D3 owns the final per-level palette refinement.
- **"Reduced gold chests" tuning:** §7.2 yields 2 gold chests/level (gold-key room + stair room). If playtesting shows this is too rich, raise the gold-key-room exception to a silver chest — a one-line catalog change.
- **Room-5 pillars** remain on odd levels; placement skips them. If E2 removes them, §7 placement is unaffected.
- **Boss/actor display names** are canonical per D1; internal `type` ids are frozen so catalogs and tests stay stable.
