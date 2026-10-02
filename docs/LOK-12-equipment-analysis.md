# LOK-12 — Equipment & Strategic Depth Analysis + Golden Starter Sets (v2)

**Status:** Design / analysis document — **v2** (board-compliant revision). No code or data changes in this revision.
**Author:** Gameplay Designer (LOK-13); v2 revision per LOK-14 board directives.
**Sources:** `html/data/items.json`, `html/data/vocations.json`, `html/data/cards.json`, `html/data/abilities.json`, `html/data/monsters.json`, `html/engine/*.js`, `html/app/app-controller.js`, `features/03`, `features/04`, `features/05`
**Scope:** Current equipment layouts → analysis → 4 "Golden" starter sets (v2, board-directive compliant) → creative strategic depth options (trimmed to 3) → recommendation & implementation slice order.

**Revision note (LOK-14):** §1–3 are the approved analysis from the original document and are kept, with the §3 power-budget ledger lightly re-driven to match the v2 sets. §4 (Golden Starter Sets), §5 (creative options), and §6 (recommendation/slice order) are replaced by the board-compliant design below. The board's directives are reproduced verbatim in §4.0 and every design choice traces to a directive.

---

## 1. Current Equipment Layouts (from live catalogs)

All four vocations acquire gear the same way today:

1. **`nativeEquipment`** (vocations.json) defines the vocation's starter pool (auto-offered at level 1).
2. **Fate Grant drafts** (cards.json, `FateGrantSystem.generateDraftOffer`) offer a 5-card draft on new game and on every level-up; the player picks 1–2 cards. Cards are filtered by `vocationAffinity`. **LOK-4** guarantees the level-1 draft always offers ≥1 `main_hand` and ≥1 `off_hand` card.
3. Cards either **grant a new item** (auto-equips into an empty paperdoll slot) or become a **LEVEL UP card** when the player already owns the item and the item has an `upgradeSpec` (max rank 5).
4. Floor loot (floor-generator.js) supplies potions, arrows, and torches.

### Magician — "master of radiant arcane energies and expansive illumination" (mana regen)

| Slot | Item (item_id) | Type | Key values (items.json/abilities.json) | Upgrade spec |
|---|---|---|---|---|
| main_hand | Beam Staff (`astral_scepter`) | weapon | `stat_bonus` 8, range 4, MP 5, `energy_beam` (wave steps 20/15/10/5, range 4, 3.0s CD, knockback) | `stepDamageInc` 5, `rangeInc` 1, `manaCostInc` 5 |
| off_hand | Spark Wand (`apprentice_wand`) | weapon | `stat_bonus` 3, dmg 12–16, range 5, MP 1, `wand_spark` (1.0s CD) | `randomDamageInc` [4,6], `rangeInc` 1, `manaCostInc` 1 |
| armor | Apprentice's Cape (`apprentice_cape`) | armor | `stat_bonus` 2, Power Pulse (+rank MP every 22−2·rank s) | `mpPulseInc` 1, `cooldownReductionSec` 2 |
| relic | Luminous Amulet (`relic_luminous_amulet`, neutral) | relic | `stat_bonus` 5, +5 HP, +5 MP, Auto-Prayer (rank×2 pts every 10 s) | `maxHpInc` 5, `maxMpInc` 5 |
| bonus | Light Spell (`spell_light`) | spell | 15 MP, 5.0s CD, vision radius ~13 tiles / 30 s | — |

`nativeEquipment`: apprentice_wand, astral_scepter, apprentice_cape. The amulet and Light come from cards.

### Archer — "deadly long-range sniper … fletched arrows and precision burst" (HP regen)

| Slot | Item (item_id) | Type | Key values | Upgrade spec |
|---|---|---|---|---|
| main_hand | Wooden Bow (`wooden_bow`) / Composite Longbow (`composite_bow`) | weapon | stat 4 / 6, `bow_shot` (14–18 dmg, range 6, 1.0s CD, consumes arrow); Composite grants 20 arrows | none |
| off_hand | Hunter's Quiver (`hunter_quiver`) | offhand | stat 3 | none |
| armor | Hunter's Leathers (`hunter_leathers`) | armor | stat 5 | none |
| relic | Archer's Hood (`archer_hood`) | relic | stat 4 | none |
| bonus | Power Shot (`spell_power_shot`) | spell | 32–42 dmg, range 6, 4.0s CD, consumes arrow, grants 20 arrows | none |

`nativeEquipment`: wooden_bow, composite_bow, hunter_quiver, hunter_leathers, archer_hood.

### Fighter — "resilient front-line warrior … heavy broadswords, cleaves, defensive stances" (HP regen)

| Slot | Item (item_id) | Type | Key values | Upgrade spec |
|---|---|---|---|---|
| main_hand | Tempered Broadsword (`tempered_broadsword`) | weapon | stat 7, `slash` (16–22 dmg, reach ~2.5, 0.8s CD) | none |
| off_hand | Reinforced Buckler (`buckler`) | offhand | stat 4 (shared fighter+paladin) | none |
| armor | Knight Plate Armor (`plate_armor`) | armor | stat 8 (shared fighter+paladin) | none |
| relic | Iron Helm (`iron_helm`) | relic | stat 6 | none |
| bonus | Cleave (`spell_cleave`, 24–34, MP 10), Fortify (`spell_fortify`, −50% dmg, MP 15) | spells | see abilities/items | none |
| bonus | Champion's Crest (`relic_champions_crest`, fighter+paladin legendary) | relic | stat 15; card text "+20% dmg / +15 HP" | none |

`nativeEquipment`: tempered_broadsword, buckler, plate_armor, iron_helm.

### Paladin — "holy champion … sacred warhammers, area light, restorative prayers" (HP regen)

| Slot | Item (item_id) | Type | Key values | Upgrade spec |
|---|---|---|---|---|
| main_hand | Consecrated Warhammer (`consecrated_warhammer`) | weapon | stat 6, `holy_strike` (18–26 dmg, reach ~2.5, MP 10, 1.2s CD) | none |
| off_hand | Reinforced Buckler (`buckler`) | offhand | stat 4 (shared) | none |
| armor | Knight Plate Armor (`plate_armor`) | armor | stat 8 (shared) | none |
| relic | Holy Crown (`holy_crown`) | relic | stat 7 | none |
| bonus | Healing Prayer (`spell_healing_prayer`), Holy Radiance (`spell_holy_radiance`, MP 30) | spells | heal 35–50 MP 25, 6.0s CD | none |
| bonus | Champion's Crest (shared with Fighter) | relic | stat 15 | none |

`nativeEquipment`: consecrated_warhammer, buckler, plate_armor, holy_crown.

---

## 2. Analysis of the Current State

### 2.1 The Magician / placeholder asymmetry
The Magician's four gear pieces are individually **hand-designed mechanics**: the cape is a passive mana engine, the amulet is a hybrid HP/MP prayer pulse, the scepter is a controllable knockback wave that *scales* (damage/range/MP steps), and the wand is a cheap filler that also scales. Every Magician slot can rank up through Fate Grant LEVEL UP cards (`upgradeSpec` present on all four base items).

Archer, Fighter, and Paladin have **zero `upgradeSpec` entries**. Their gear is pure stat stickers — flat ±nothing gear with no rank-up path, no passive, no build-around. This is "Magician was designed, everyone else got stat sticks."

### 2.2 `stat_bonus` doesn't drive combat today
Verified in `combat-system.js` / `entity-ai.js` / `inventory-system.js`: `stat_bonus` is consumed as **HUD display text**, potion heal/restore values, and the amulet's HP/MP grant. **Player attack damage** is `abilityBaseDamage × level damageMultiplier` — the weapon's `stat_bonus` is not part of the damage roll. **Incoming damage** is a flat `randomBetween(damageMin, damageMax)` with **no armor/defense mitigation** — `stat_bonus` armor does nothing against monsters today. So the three "stat stick" vocations are flat twice over: stats don't enrich their combat, and their stats don't even reduce incoming damage.

### 2.3 Shared Fighter/Paladin gear, no set identity
Buckler, Plate Armor and Champion's Crest are shared `vocationAffinity: ["fighter","paladin"]`. Combined with the same placement in the same four slots, Fighter and Paladin read as Palette-Swap classes: same base gear trays, same stat profile shape, different one ability each. There is no "set" concept (`setFamily` doesn't exist in the schema), so wearing the matching gear grants nothing — no synergy, no identity, no build incentive.

### 2.4 Vocation identity today
Identity is carried almost entirely by **abilities and vitals**, not equipment:

| Vocation | Regen | HP/MP base (per level) | damageStep | Signature ability nuance |
|---|---|---|---|---|
| Magician | Mana | 60 / 150 (+8/+16) | 0.10 | cheapest abilities, light/vision master |
| Archer | HP | 90 / 80 (+14/+8) | 0.12 | only ranged physical, ammo-gated |
| Fighter | HP | 140 / 30 (+18/+4) | 0.15 | highest damageStep, cheapest basic attack |
| Paladin | HP | 120 / 90 (+15/+10) | 0.11 | melee + heal + light |

Damage multiplier at level 20 (1 + 19×step): Magician **2.9×**, Archer **3.28×**, Fighter **3.85×**, Paladin **3.09×**. The Fighter's 3.85× is the intended bruiser payoff, but because there is no defense stat that actually mitigates, the tank role is under-delivered.

### 2.5 Two small correctness notes surfaced by this analysis
- `cleave` (`actionKey: "cleave"`) currently routes to `CombatSystem.executeSlash` — a single-target swing, not a true multi-target sweep. The card text advertises a wide arc, so the mechanic is slightly ahead of the implementation.
- `fortify` (`actionKey: "fortify"`, −50% dmg for 10 s per card text) has **no registered handler** in `app-controller.js` today; the card can be granted but nothing executes.

These matter because the design work in §4 depends on honest implementations.

---

## 3. Power-Budget Ledger for Golden Sets

Each Golden set is tuned to roughly the **same mechanical budget** (numbers below are schema-compatible; **bold** fields are proposed additions to `items.json`). Budget is split across four levers:

1. **Combat power** — per-hit damage/min range and/or damage% scaling.
2. **Defense economy** — mitigation (flat damage reduction), max HP, dodge, or absorption, matching the vocation fantasy.
3. **Resource engine** — mana/HP/ammo sustain so the fantasy is playable over a 20-floor run.
4. **Signature mechanic** — one distinctive, engine-wired behavior that the other three sets don't have.

Target: each set ≈ **~20 stat point budget** ≈ **one signature** ≈ **comparable win-rate vs. the same monster roster**.

*v2 note (LOK-14):* the ledger rows below are re-driven to match the board-compliant sets in §4. Magician is untouched. Signature levers shift per directive: Archer's sustain becomes a **quiver arrow-regen engine**, Fighter's signature is the **active shield bash (pushback + stun, cooldown-gated)**, and Paladin's signature is the **mana-gated holy bubble (damage absorb)**.

| Vocation | Combat | Defense | Sustain | Signature (v2) | Σ |
|---|---|---|---|---|---|
| Magician | 8 | 4 | cape MP engine (∞) | knockback zone control | ~20+ |
| Archer | 8 (+ crit 10→14%) | dodge 10→18% | quiver arrow-regen engine (∞) | arrow economy + crit burst | ~20 |
| Fighter | 9 | mitigation 10→14% | HP pool (+15 → +55) | shield bash pushback + stun (CD 10→6 s) | ~20 |
| Paladin | 8 | bubble absorb 10→30 + mitigation 10→14% | heal power 15→27% + mana pool (+20 → +60) | holy bubble (mana-gated, 30→46 s) | ~20 |

*Old v2-prior rows for reference:* Archer (ammo refund engine, dodge 12%), Fighter (DR 25%), Paladin (DR 15% + light aura) described the pre-directive designs and are superseded by the rows above.

---

## 4. Golden Starter Sets v2 (board-compliant)

### 4.0 Board directives (verbatim) and how this section satisfies them

| # | Board directive | Where it lands in v2 |
|---|---|---|
| 1 | **Magician — DO NOT change.** Keep Beam Staff, Spark Wand, Apprentice's Cape, Luminous Amulet, Light spell "exactly as they are today, including their existing `upgradeSpec` rank-up paths. No stat changes, no new magician items." | §4.1 reproduces the current Magician loadout literally — same `item_id`s, same values, same `upgradeSpec`s. No edits. |
| 2 | **Archer — quiver as the off hand with arrow regeneration.** Off-hand is a real equipped quiver: max 25 arrows, starts with 25, regen 1 arrow / 5 s, with a per-rank upgrade path. | §4.2 `grey_stalker_quiver`: `arrowCapacity` 25, `arrowCount` 25, `ammoRegenSec` 5; spec `arrowCapacityInc` 5, `ammoRegenSecReduction` 0.5 (rank 5: cap 45, regen 3.0 s). Engine tick = new 5 s ammo accumulator in `app-controller.tick()` (same cadence as passive regen). |
| 3 | **Fighter — shield as an ACTIVE off-hand with pushback + stun.** Used item pushes back adjacent enemies and applies a 1 s stun; gated once per 10 s at level 1 with a per-rank upgrade path. Must be an action/activation (`actionKey`), not just `stat_bonus`. Keep broadsword + armor + relic as the coherent set. | §4.3 `vanguard_shield`: `actionKey: "shield_bash"`, `cooldown` 10, `pushbackRange` 1, `stunSec` 1.0; spec `stunInc` 0.5, `cooldownReductionSec` 1 (rank 5: stun 3 s, CD 6 s). New `shield_bash` handler + `CombatSystem.executeShieldBash`. |
| 4 | **Paladin — shield with a bubble (damage-absorb) effect.** Off-hand casts a force-field bubble: absorbs 10 damage to start, lasts 30 s, costs mana; per-rank upgrade path. Keep mace/hammer + armor + relic as the coherent set. | §4.4 `aegis_shield`: `actionKey: "holy_shield"`, `manaCost` 15, `shieldAbsorb` 10, `shieldDuration` 30; spec `shieldAbsorbInc` 5, `shieldDurationInc` 4, `shieldManaCostReduction` 2 (rank 5: absorb 30, 46 s, 7 MP). New `holy_shield` handler + damage-intercept seam. |
| 5 | **ALL 4 vocations: every Golden 4-slot item must have a per-rank `upgradeSpec` (max rank 5)** — no flat stat sticks; rest-of-set items need real upgrade paths, not dead weight. | Every item in every set below carries a concrete per-rank `upgradeSpec`; rank-5 totals are listed per item. None of the Golden set items are flat stat sticks. |

### 4.1 Magician — **"Astral Arborist"** *(directive 1: literally unchanged)*

> The board approved the current layout. Nothing here changes: same `item_id`s, same values, same `upgradeSpec`s, same Light spell. This section is the reference record so the other three vocations can be tuned against it.

| Slot | Item (item_id) | Values (base) | Upgrade spec (per rank, max 5) |
|---|---|---|---|
| main_hand | Beam Staff (`astral_scepter`) | stat 8, range 4, MP 5, `energy_beam` (wave steps 20/15/10/5, CD 3.0 s, knockback) | `stepDamageInc` 5, `rangeInc` 1, `manaCostInc` 5 → rank 5: wave dmg +20, range 8, MP 25 |
| off_hand | Spark Wand (`apprentice_wand`) | stat 3, dmg 12–16, range 5, MP 1, `wand_spark` (CD 1.0 s) | `randomDamageInc` [4,6], `rangeInc` 1, `manaCostInc` 1 → rank 5: +16–24 dmg, range 9 |
| armor | Apprentice's Cape (`apprentice_cape`) | stat 2, Power Pulse (+rank MP every `max(12, 22−2·rank)` s) | `mpPulseInc` 1, `cooldownReductionSec` 2 → rank 5: +5 MP every 12 s |
| relic | Luminous Amulet (`relic_luminous_amulet`) | stat 5, +5 HP/MP, Auto-Prayer (rank×2 pts / 10 s) | `maxHpInc` 5, `maxMpInc` 5 → rank 5: +25 HP/MP, prayer 10 pts |
| bonus | Light Spell (`spell_light`) | 15 MP, 5.0 s CD, vision ~13 tiles / 30 s | — (spell, not part of the 4-slot set) |

`nativeEquipment` unchanged: apprentice_wand, astral_scepter, apprentice_cape. Amulet + Light continue to arrive via cards.

### 4.2 Archer — **"Grey Stalker"** *(directive 2: quiver off-hand with arrow regen; directive 5: full set upgrades)*

> Identity: hold the distance. Your quiver is a *real resource* — it starts full, it regenerates, and it never lets the fantasy starve. You spend arrows like treasure; the crit hood makes every arrow worth more.

| Slot | Item (item_id) | Values (base) | Upgrade spec (per rank, max 5) |
|---|---|---|---|
| main_hand | Composite Longbow (`composite_bow`) — kept as the Golden bow base | stat 6, `bow_shot` (14–18 dmg, range 6, CD 1.0 s, consumes arrow), grants 20 arrows | `randomDamageInc` [5,8], `rangeInc` 1 → rank 5: +20–32 dmg, range 10 |
| off_hand | Regen Quiver (`grey_stalker_quiver`) — **NEW** (replaces `hunter_quiver` in the Golden loadout) | stat 3; **`arrowCapacity` 25**, **`arrowCount` 25**, **`ammoRegenSec` 5** | **`arrowCapacityInc` 5**, **`ammoRegenSecReduction` 0.5** → rank 5: capacity 45, regen every 3.0 s |
| armor | Hunter's Leathers (`hunter_leathers`) | stat 5, **`dodgePct` 10%** | **`dodgePctInc` 2%** → rank 5: 18% dodge |
| relic | Archer's Hood (`archer_hood`) | stat 4, **`critChance` 10%**, **`critMult` 1.25×** | **`critChanceInc` 1%**, **`critMultInc` 0.05** → rank 5: 14% / 1.45× |
| bonus | Power Shot (`spell_power_shot`) | 32–42 dmg, range 6, 4.0 s CD, consumes arrow, grants 20 arrows | — (spell, outside the 4-slot set) |

**The quiver mechanic, honestly specified:**
- **Fields (all on the equipped item)** — `arrowCapacity` (25), `arrowCount` (25, starts full per directive), `ammoRegenSec` (5).
- **Regen tick (engine seam, `app-controller.tick()`):** add an `ammoRegenAccumulator` that runs on the **same 5 s cadence as the passive regen accumulator** — when `player.paperdoll.off_hand.arrowCount < arrowCapacity` and the accumulator reaches `ammoRegenSec` elapsed, `arrowCount += 1` (cap at capacity). The accumulator is reset on each regen and when the quiver is swapped.
- **Consumption (`CombatSystem.consumeArrow`):** check the equipped off-hand quiver's `arrowCount` first; decrement and fall back to searching `action_bar`/`backpack` for `arrows` stacks only when the quiver is empty (existing path unchanged). `executeBowShot` / `executePowerShot` already call `consumeArrow`, so they inherit the quiver automatically.
- **Pickup order:** floor arrow drops (e.g. Bone Sentry ×10) fill the quiver up to `arrowCapacity` first, then spill to an `arrows` stack as the reserve. This keeps floor loot meaningful while the regen engine is the sustain backbone.
- **Bow damage parity (engine alignment, no new field):** align `executeBowShot` (and `executePowerShot` for procurement of `item.damage` in the future) with the proven `executeWandSpark` pattern — if the equipped bow item embeds `damage` (card-rolled, e.g. 14–18), read it; else fall back to `CONFIG.ARCHER_BOW_DAMAGE_MIN/MAX`. `randomDamageInc` then bumps the item's `damage` exactly like the wand does today.
- **Upgrade wiring (directive 5):** new `fate-grant-system.applyDraftedCards` branches for `arrowCapacityInc` (`item.arrowCapacity += 5` per rank) and `ammoRegenSecReduction` (`item.ammoRegenSec = max(2.5, base − 0.5×(rank−1))`), plus `dodgePctInc`, `critChanceInc`, `critMultInc` recomputing their base fields by rank.

**Set synergy:** quiver regen pays for sustained kiting; hood crit makes every arrow count; leathers dodge covers the moment a rat gets adjacent. Ranking up any piece makes the whole "spend-then-regen" loop smoother. Rank-5 archer fires bow shots well above the 14–18 base (up to +32 from upgrades) with 14% ×1.45 crits, 18% dodge, and effectively infinite arrows.

`nativeEquipment` (v2): composite_bow, grey_stalker_quiver, hunter_leathers, archer_hood. New off-hand card `card_grey_stalker_quiver` satisfies LOK-4's ≥1 off_hand guarantee for level-1 drafts.

### 4.3 Fighter — **"Iron Vanguard"** *(directive 3: active shield pushback + stun; directive 5: full set upgrades)*

> Identity: stand in the doorway and let them come. When they crowd you, the shield *acts* — it shoves the pack back and stuns the stragglers, on a hard cooldown that ranks down as you level the shield.

| Slot | Item (item_id) | Values (base) | Upgrade spec (per rank, max 5) |
|---|---|---|---|
| main_hand | Tempered Broadsword (`tempered_broadsword`) — kept | stat 7, `slash` (16–22 dmg, reach ~2.5, CD 0.8 s) | `randomDamageInc` [4,6] → rank 5: +16–24 dmg |
| off_hand | Vanguard Shield (`vanguard_shield`) — **NEW active** (replaces `buckler` in the Golden loadout) | stat 4; `actionKey` **`shield_bash`**; `cooldown` **10**; **`pushbackRange` 1**; **`stunSec` 1.0** | **`stunInc` 0.5**, **`cooldownReductionSec` 1** → rank 5: stun 3.0 s, CD 6 s |
| armor | Knight Plate Armor (`plate_armor`) — kept, shared | stat 8, **`mitigationPct` 10%** | **`mitigationPctInc` 1%** → rank 5: 14% |
| relic | Iron Helm (`iron_helm`) — kept | stat 6, **`hpBonus` 15** | `maxHpInc` 10 → rank 5: +55 max HP from helm (15 base + 10/rank-up) |
| bonus | Cleave (`spell_cleave`), Fortify (`spell_fortify`) | see §2.5 — handlers to be fixed | — (spells / bonus, outside the 4-slot set) |

**The shield bash mechanic, honestly specified:**
- **Activator (directive 3):** the Golden Vanguard Shield carries `actionKey: "shield_bash"` so `useItem` picks it up (identical to how `slash`/`holy_strike` are routed in `app-controller.js`'s handlers map). A new handler `shield_bash` calls `CombatSystem.executeShieldBash(player, gridMap, monsters, item)`.
- **Cooldown gate:** base `cooldown: 10` (existing item field, as used on spells). The handler writes `player.cooldowns.shield_bash = item.cooldown`, and the existing `CombatSystem.decrementCooldowns` tick decays it — same machinery as every other ability. The item's rank then reduces the effective cooldown: `effectiveCooldown = max(1, item.cooldown − Σ(cooldownReductionSec per rank))`.
- **Pushback:** find monsters **adjacent** to the player (Manhattan distance 1 — the same adjacency definition `entity-ai.js` uses to decide melee attacks). For each, push `pushbackRange` tiles: compute the away direction from the player, move the monster if `gridMap.isWalkable(nx, ny)`, the tile isn't the player's, and no other monster occupies it (matches the existing monster-move occupancy rules). This reuses `grid-map.js` walkability; not pushing through walls — monsters stop against geometry.
- **Stun:** set `monster.stunTimer = stunSec` on every pushed (or otherwise adjacent) monster. `monster.stunTimer` **already exists and is engine-wired**: `entity-ai.js` skips movement *and* actions while `stunTimer > 0`, so a 1 s stun means one full tick-cadence of the monster sitting still.
- **Upgrade path (directive 5):** `stunInc` 0.5/rank (1 → 3 s) and `cooldownReductionSec` 1/rank (10 → 6 s). The bash becomes a *reliable* crowd tool at higher ranks rather than a panic button.
- **Upgrade wiring:** new `applyDraftedCards` branches for `stunInc` (`item.stunSec += 0.5`) and a **functional** read of `cooldownReductionSec` (today it is only cosmetic on the cape; here it actually shortens the bash cooldown). Specs on broadsword (`randomDamageInc`, aligning `executeSlash` to read `item.damage` like the wand), plate (`mitigationPctInc`), and helm (`maxHpInc` — existing branch) complete the set.

**Set synergy:** broadsword = the damage engine (highest damageStep in the game at 3.85×); plate mitigation makes the flat monster roll finally eat a reduction; helm HP is the attrition buffer; the bash creates the breathing room a slow bruiser needs. Fighter is the only set that **wants** monsters adjacent — the bash punishes clustering and the cleave tax follows.

### 4.4 Paladin — **"Radiant Crusader"** *(directive 4: bubble shield, mana-gated; directive 5: full set upgrades)*

> Identity: stand at the front *and* heal through it. Your shield isn't metal — it's a prayer that wraps you in light, absorbs the next wave of hits, and burns mana while it lasts.

| Slot | Item (item_id) | Values (base) | Upgrade spec (per rank, max 5) |
|---|---|---|---|
| main_hand | Consecrated Warhammer (`consecrated_warhammer`) — kept | stat 6, `holy_strike` (18–26 dmg, reach ~2.5, MP 10, CD 1.2 s) | `randomDamageInc` [4,6] → rank 5: +16–24 dmg |
| off_hand | Aegis Shield (`aegis_shield`) — **NEW active** (replaces `buckler` in the Golden loadout) | stat 4; `actionKey` **`holy_shield`**; `manaCost` **15**; **`shieldAbsorb` 10**; **`shieldDuration` 30** | **`shieldAbsorbInc` 5**, **`shieldDurationInc` 4**, **`shieldManaCostReduction` 2** → rank 5: absorb 30, 46 s, 7 MP |
| armor | Knight Plate Armor (`plate_armor`) — kept, shared | stat 8, **`mitigationPct` 10%** | **`mitigationPctInc` 1%** → rank 5: 14% |
| relic | Holy Crown (`holy_crown`) — kept | stat 7, **`manaBonus` 20**, **`healPowerPct` 15%** | `maxMpInc` 10, **`healPowerPctInc` 3%** → rank 5: +60 max MP from crown, heal power 27% |
| bonus | Healing Prayer (`spell_healing_prayer`), Holy Radiance (`spell_holy_radiance`) | heal 35–50 MP 25 CD 6 s; radiance MP 30 | — (spells / bonus) |

**The holy bubble mechanic, honestly specified:**
- **Activator (directive 4):** `actionKey: "holy_shield"` → new handler in `app-controller.js` calling `CombatSystem.executeHolyShield(player, item)`. Mana-gated exactly like `executeHolyStrike`: check `player.mana >= manaCost` (15 base), deduct, then set the bubble state on the player.
- **Bubble state:** `player.shieldAbsorb = item.shieldAbsorb` (10), `player.shieldDurationSec = item.shieldDuration` (30). A new decrement in `app-controller.tick()` decays `shieldDurationSec` by `deltaSec`; when it reaches 0 the bubble pops and `shieldAbsorb` clears (HUD shows the fade).
- **Damage interception (engine seam, `entity-ai.js` damage application):** incoming monster damage is applied as `player.hp = Math.max(0, player.hp − damage)`. When the bubble is active, that line becomes: `absorbed = Math.min(player.shieldAbsorb, damage); player.shieldAbsorb -= absorbed; damage -= absorbed; player.hp -= damage`. The bubble is a damage sink, not mitigation — it does not block stuns/knockback and it empties fast under The Spire Warden (monster rolls are rat 4–8, sentry 8–14, cultist 10–16, elite 12–20, boss 16–24 — the bubble at base absorbs one typical rat pack hit or most of a sentry swing).
- **Mana is the real gate:** Paladin base mana 90 (+10/level). Casting bubble (15) plus holy strike cadence (10) plus prayer (25) means the crown's `manaBonus` and `maxMpInc` are what make the bubble *castable* at the start of a floor — this is the set's built-in economic pressure and why `shieldManaCostReduction` (15 → 7 MP) is the best per-rank lever for the shield.
- **Upgrade path (directive 5):** `shieldAbsorbInc` 5 → 30, `shieldDurationInc` 4 → 46 s, `shieldManaCostReduction` 2 → 7 MP. The bubble goes from "absorbs a rat bite" to "absorbs a boss swing and lasts nearly a full floor's fight."
- **Upgrade wiring:** new `applyDraftedCards` branches for `shieldAbsorbInc`, `shieldDurationInc`, `shieldManaCostReduction` (`item.shieldAbsorb += 5`, `item.shieldDuration += 4`, `item.manaCost = max(1, base − 2×(rank−1))`); `maxMpInc` reuses the existing HP/MP branch; `healPowerPctInc` recomputes `item.healPowerPct` by rank and `executeHealingPrayer` multiplies its heal by `(1 + healPowerPct/100)`.

**Set synergy:** warhammer = the holy damage engine; Aegis bubble = damage sink that makes standing at the front viable; plate mitigation compounds under the bubble; crown keeps mana flowing so the bubble, the hammer, and the prayer can coexist. Paladin trades raw damage (lowest damageStep band after Magician) for the heal + bubble package — no strictly dominant vocation.

### Balance note on the four v2 sets
No vocation is strictly dominant. The level-20 damage multipliers (Mag 2.9 / Arch 3.28 / Fight 3.85 / Pal 3.09) keep the four sets in the same *band* while giving each a distinct axis:

- **Magician** — control/kiting + infinite mana engine; unchanged by board directive.
- **Archer** — ranged burst + crit hood, infinite ammo from the regen quiver, glassiest (90 HP + dodge instead of flat mitigation).
- **Fighter** — highest raw damage + flat mitigation + HP pool + a hard-CC bash, but no ranged option and no resource engine.
- **Paladin** — tankiest package (bubble + mitigation + heal scaling), lowest burst, mana is the throttle.

Each set clears the same monster roster on similar par: Archer deletes threats from range before they arrive, Fighter eats the crowd, Paladin outlasts it, Magician reshapes the battlefield.

---

## 5. Creative Strategic Options (trimmed to the top 3, secondary layer)

The board fixed the equipment direction in §4; the options below are a **secondary strategic layer**, not replacements. They are short, independent, and each is a "next game after the Golden sets ship" candidate.

### Option B — Set & Resonance Bonuses (matching gear gets real)
Add `setFamily` to `items.json`; wearing 2 pieces of a family grants a small passive and wearing all 4 unlocks the set's signature bonus. With the Golden sets as the 4-piece target, the player has a thesis from floor 1 and off-set loot then **competes** for a slot — mitigated with resonance bonuses ("while at full HP", "while outnumbered") so partial builds stay viable. This is the cheapest game-wide win and it makes the §4 sets *sing*.

### Option A — Lumen Affinities (elemental rock-paper-scissors)
Every damage type gains a "lumen" affinity (Arcane / Physical / Holy / Fire / Frost…); monsters carry a resistance profile, and damage is multiplied (e.g. ×1.5 vs weak, ×0.75 vs resistant). Systems touched: `monsters.json` affinity fields, `items.json` element type, `combat-system.js` multiplier resolution, tooltip pips. Keeps floor multipliers gentle so it reads as informed choice, not tax; turns Paladin's light and Magician's arcane zone into *matchups* instead of flavor.

### Option E — Combo & Synergy Triggers
A small trigger system where specific ability+gear combos fire printed bonuses (e.g. "Land 3 wand sparks within 2 s → next beam is free"; "Shield-bash a stunned target → Cleave's cooldown −4 s"; "Power Shot from 5+ tiles → guaranteed crit"). Cap at ~3 recipes per set, printed on the card text so the player *knows* the rule. Deep but additive — no math retune; it separates skilled players from button-mashers on the mastery axis.

*Note: the arrow-economy ideas from the original Option D are folded directly into the Archer quiver design in §4.2 (capacity, regen, consume/pickup ordering) — D as a standalone option is dropped.*

---

## 6. Recommendation & Implementation Slice Order (v2)

### Recommendation
**Ship the four board-compliant Golden sets (§4) as the starting point.** They directly satisfy all five board directives: Magician untouched, Archer/Fighter/Paladin get their prescribed off-hand mechanics, and every Golden item across all four vocations carries a real per-rank `upgradeSpec`. The creative options in §5 are parked as the post-stable layer — Option B first, then A, then E.

### Suggested implementation slice order (build what first)

1. **Slice 0 — Engine seams (new action handlers + ammo/damage paths):**
   - New action handlers `shield_bash` and `holy_shield` in `app-controller.js`, routing to new `CombatSystem.executeShieldBash` / `executeHolyShield` (cooldown gate via `player.cooldowns`, mana gate, `stunTimer` set, `shieldAbsorb`/`shieldDurationSec` state).
   - Quiver ammo accumulator in `app-controller.tick()` (5 s regen) + `consumeArrow` reads equipped quiver `arrowCount` first, with floor-pickup fill-then-spill ordering.
   - Damage-intercept seam for the bubble in `entity-ai.js` damage application; `dodgePct` and `mitigationPct` consume in the same damage path.
   - Damage-parity alignment: `executeBowShot`/`executeSlash`/`executeHolyStrike` read embedded `item.damage` with CONFIG fallback (the `executeWandSpark` pattern); crit roll (`critChance`/`critMult`) in the archer damage path; `healPowerPct` in `executeHealingPrayer`.
2. **Slice 1 — Data:** add the three new items (`grey_stalker_quiver`, `vanguard_shield`, `aegis_shield`) with their fields to `items.json`; add `upgradeSpec`s and new base fields (`arrowCapacity`/`arrowCount`/`ammoRegenSec`, `pushbackRange`/`stunSec`, `shieldAbsorb`/`shieldDuration`, `dodgePct`, `critChance`/`critMult`, `mitigationPct`, `hpBonus`/`manaBonus`, `healPowerPct`) to the kept items; add matching draft cards (`card_grey_stalker_quiver`, `card_vanguard_shield`, `card_aegis_shield`) to `cards.json`; update each vocation's `nativeEquipment`.
3. **Slice 2 — Upgrade wiring:** new `fate-grant-system.applyDraftedCards` branches for the new spec keys (`arrowCapacityInc`, `ammoRegenSecReduction`, `dodgePctInc`, `critChanceInc`/`critMultInc`, `mitigationPctInc`, `healPowerPctInc`, `stunInc`, functional `cooldownReductionSec`, `shieldAbsorbInc`/`shieldDurationInc`/`shieldManaCostReduction`, `maxMpInc` on crown); general consumable-equip recompute for `hpBonus`/`manaBonus` on any slot (not just the amulet special case).
4. **Slice 3 — Balance pass:** re-tune monster damage ranges now that mitigation/dodge/absorb actually consume them; verify all four vocations clear the same floors on similar par with the new signatures; autotune Fate Grant draft weights so the Golden items show up at the right cadence; sanity-check the shield cooldown and bubble mana curves against the boss fight.

### Why this order
The engine seams (Slice 0) are the only "new system" work and they are each tiny (all reuse existing machinery: `player.cooldowns`, `monster.stunTimer`, `gridMap.isWalkable`, tick accumulators). Data (Slice 1) then drops in with zero engine risk. Upgrade wiring (Slice 2) is what makes the sets *rank up* per directive 5 — the board's central ask. The balance pass (Slice 3) is where the math gets honest now that the flat monster roll finally touches gear.

---

## Appendix — New schema fields proposed (v2, one-line reference)

| New field | Type | Meaning | Consumed by |
|---|---|---|---|
| `arrowCapacity` | number | max arrows the equipped quiver can hold (base 25) | ammo regen accumulator + `consumeArrow` |
| `arrowCount` | number | current arrows in the equipped quiver (base 25) | ammo regen accumulator + `consumeArrow` |
| `ammoRegenSec` | number | seconds between +1 arrow while below capacity (base 5) | `app-controller.tick()` ammo accumulator |
| `pushbackRange` | number | tiles the fighter shield bash pushes adjacent monsters (base 1) | `CombatSystem.executeShieldBash` + `gridMap.isWalkable` |
| `stunSec` | number | seconds of monster stun on shield bash (base 1.0) | `CombatSystem.executeShieldBash` → sets existing `monster.stunTimer` |
| `shieldAbsorb` | number | damage the paladin bubble absorbs before popping (base 10) | `entity-ai.js` damage application (intercept) |
| `shieldDuration` | number | seconds the paladin bubble lasts (base 30) | `app-controller.tick()` bubble decrement |
| `dodgePct` | number | % chance to avoid a monster hit (base 10) | `entity-ai.js` damage application |
| `critChance` | number | % chance a bow shot crits (base 10) | `executeBowShot`/`executePowerShot` damage roll |
| `critMult` | number | crit damage multiplier (base 1.25×) | `executeBowShot`/`executePowerShot` damage roll |
| `mitigationPct` | number | % reduction of incoming monster damage (base 10) | `entity-ai.js` damage application |
| `hpBonus` | number | max HP granted on equip (extends existing amulet field to any slot) | equip recompute |
| `manaBonus` | number | max MP granted on equip (extends existing amulet field to any slot) | equip recompute |
| `healPowerPct` | number | % healing increase (base 15) | `executeHealingPrayer` heal resolution |
| `shieldAbsorbInc` | number | per-rank +absorb (5) | `applyDraftedCards` new branch |
| `shieldDurationInc` | number | per-rank +duration s (4) | `applyDraftedCards` new branch |
| `shieldManaCostReduction` | number | per-rank −mana cost (2) | `applyDraftedCards` new branch |
| `arrowCapacityInc` | number | per-rank +quiver capacity (5) | `applyDraftedCards` new branch |
| `ammoRegenSecReduction` | number | per-rank −regen interval s (0.5) | `applyDraftedCards` new branch |
| `stunInc` | number | per-rank +stun s (0.5) | `applyDraftedCards` new branch |
| `dodgePctInc` | number | per-rank +dodge % (2) | `applyDraftedCards` new branch |
| `critChanceInc` | number | per-rank +crit chance % (1) | `applyDraftedCards` new branch |
| `critMultInc` | number | per-rank +crit multiplier (0.05) | `applyDraftedCards` new branch |
| `mitigationPctInc` | number | per-rank +mitigation % (1) | `applyDraftedCards` new branch |
| `healPowerPctInc` | number | per-rank +heal power % (3) | `applyDraftedCards` new branch |

Engine-alignment notes (no new fields, reuse of existing schema):

- `item.damage` — `executeBowShot` / `executeSlash` / `executeHolyStrike` read embedded item damage with CONFIG fallback, mirroring `executeWandSpark` (today only the wand reads item damage).
- `item.cooldown` — becomes functional for equipped item actions: `shield_bash` sets `player.cooldowns.shield_bash = item.cooldown − Σ rank reductions` (today cooldown is read only on spells).
- `actionKey` on off-hand gear — new `shield_bash` / `holy_shield` values route in `app-controller.js`'s handlers map exactly like `slash` / `holy_strike`.
- `monster.stunTimer` — already engine-wired in `entity-ai.js` (skips movement + attacks); no change, just populated by the bash.
- `setFamily` / `element` / `affinity` / `cover` — deferred to §5 options B/A (and dropped Option C cover); not needed for the v2 Golden sets.