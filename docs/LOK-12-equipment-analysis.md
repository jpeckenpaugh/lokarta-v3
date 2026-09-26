# LOK-12 — Equipment & Strategic Depth Analysis + Golden Starter Sets

**Status:** Design / analysis document (no code or data changes)
**Author:** Gameplay Designer (LOK-13)
**Sources:** `html/data/items.json`, `html/data/vocations.json`, `html/data/cards.json`, `html/data/abilities.json`, `html/data/monsters.json`, `html/engine/*.js`, `features/03`, `features/04`, `features/05`
**Scope:** Current equipment layouts → analysis → 4 "Golden" starter sets → creative strategic depth options → recommendation & implementation slice order.

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
2. **Defense economy** — mitigation (flat damage reduction), max HP, or avoidance (dodge), matching the vocation fantasy.
3. **Resource engine** — mana/HP/ammo sustain so the fantasy is playable over a 20-floor run.
4. **Signature mechanic** — one distinctive, engine-wired behavior that the other three sets don't have.

Target: each set ≈ **~20 stat point budget** ≈ **one signature** ≈ **comparable win-rate vs. the same monster roster**.

| Vocation | Combat | Defense | Sustain | Signature | Σ |
|---|---|---|---|---|---|
| Magician | 8 | 4 | cape MP engine (∞) | knockback zone control | ~20+ |
| Archer | 8 | dodge 12% | ammo refund engine | precision crit burst | ~20 |
| Fighter | 9 | DR 25% | HP-based | crowd threat + cleave | ~20 |
| Paladin | 8 | DR 15% + light | heal/lifesteal engine | holy light aura | ~20 |

---

## 4. Golden Starter Sets (one per vocation)

Each set is a complete 4-slot loadout with a **distinctive play identity**, **draftable upgrade path** (Fate Grant LEVEL UP pattern), and **cross-slot synergy**. New item names are suggestions; `item_id`s follow the existing snake_case convention. All **bold** fields are new schema proposals that the Systems Architect can either add to `items.json` or short-circuit in the engine — but the recommendation is to add them to data so the catalog stays the single source of truth.

### 4.1 Magician — **"Astral Arborist"** (control / zone)

> Identity: push enemies where you want them, then finish with budget sparks. Light is your second weapon.

| Slot | Item | Values | Upgrade spec (per rank, max 5) |
|---|---|---|---|
| main_hand | Prism Scepter (`prism_scepter`) | stat 8, range 4, MP 5, `energy_beam` | `stepDamageInc` 5, `rangeInc` 1, **`knockbackInc` 0.5 tiles**, `manaCostInc` 5 |
| off_hand | Spark Wand (keep) | dmg 12–16, range 5, MP 1, `wand_spark` | keep existing spec |
| armor | Astral Cloak (`astral_cloak`) | stat 2, Power Pulse (existing cape engine) | `mpPulseInc` 1, `cooldownReductionSec` 2 |
| relic | Luminous Amulet (keep) | +5 HP/MP, Auto-Prayer 10 s | keep existing spec |

- **Signature:** Knocking enemies *into* choke points and walls before the next beam wave; the scepter's knockback scales, so zoning only gets stronger.
- **Synergies:** cape keeps MP topped → beam stays sustainable; amulet covers HP so glassy mage survives scratches; Light spell (vision) gives you the information advantage to aim beams.
- **What changes vs. today:** one new field (`knockbackInc`) that the existing beam projectile already consumes (`knockbackEnabled`), plus formalizing the cape/amulet as the set's engine. Cheap, tiny, high pay-off.

### 4.2 Archer — **"Grey Stalker"** (range / burst / kiting)

> Identity: hold the distance, spend arrows like treasure, land a crit that deletes a threat. What you *don't* carry, you don't need.

| Slot | Item | Values | Upgrade spec (per rank, max 5) |
|---|---|---|---|
| main_hand | Longbow of the Grey Stalker (`grey_stalker_bow`) | stat 8, range 6, `power_shot` (32–42, 4s CD), grants 20 arrows | `randomDamageInc` [5,8], `rangeInc` 1, **`ammoRefundPctInc` 10%** |
| off_hand | Windfall Quiver (`windfall_quiver`) | stat 4, **`ammoRefundPct` 10%**, **`arrowCapacityBonus` 10** | `ammoRefundPctInc` 10, **`arrowCapacityBonusInc` 5** |
| armor | Stalker's Garb (`stalker_garb`) | stat 5, **`dodgePct` 12%** | **`dodgePctInc` 2%** |
| relic | Keensight Eye (`keensight_eye`) | stat 5, **`critChanceInc` 10%**, **`critMultInc` 1.5×** | **`critChanceInc` 2%, `critMultInc` 0.05** |
| bonus | Bow Shot (keep as filler) | 14–18 dmg, 1.0s CD | — |

- **Signature:** **Ammo economy.** Arrows stop being a flat tax and become a resource you *manage* (refund + capacity). Combined with Keensight's crit burst, Power Shot becomes a "delete" button that the economy can actually support.
- **Synergies:** dodge on the garb = kiting insurance when a rat gets adjacent; quiver refund pays for the last-stand volleys; crit relic makes every arrow worth more, so hoarding arrows is rewarded.
- **What changes vs. today:** three new fields (`ammoRefundPct`, `dodgePct`, `crit*`), all of which the engine already has seams for (arrow consumption + random rolls exist; crit is advertised in the combat log spec but currently generous).

### 4.3 Fighter — **"Iron Vanguard"** (tank / bruiser / crowd control)

> Identity: stand in the doorway and let them come. Your gear is your wall; your cleave punishes anyone who clusters.

| Slot | Item | Values | Upgrade spec (per rank, max 5) |
|---|---|---|---|
| main_hand | Legion Warblade (`legion_warblade`) | stat 9, reach 2.5, `cleave` (true 90° arc, 24–34, MP 6) | `stepDamageInc` 4, **`cleaveArcInc` 15°** |
| off_hand | Vanguard Shield (`vanguard_shield`) | stat 4, **`mitigationPct` 12%** | **`mitigationPctInc` 2%** |
| armor | Legion Plate (`legion_plate`) | stat 8, **`mitigationPct` 10%** | **`mitigationPctInc` 2%** |
| relic | Warband Crest (`warband_crest`, fighter-only) | stat 12, **`threatMult` 1.2×** (aggro more monsters), **`damagePctInc` 10%** | **`damagePctInc` 2%** |
| bonus | Slash (keep as income; free), Fortify (fix handler) | 16–22 dmg | — |

- **Signature:** **Crowd threat + real cleave.** Fighter becomes the only vocation that wants monsters to *group up*, and the only one whose gear explicitly turns incoming attention into outgoing value (`threatMult` makes you the target; the creature that jumps you pays the cleave tax).
- **Synergies:** shield + plate mitigation stack → the flat monster damage roll finally gets eaten; Crest damage% makes the 3.85× damageStep even more punishing; Fortify (once handler is wired) becomes a panic button that the mitigation already compounds.
- **What changes vs. today:** three new fields (`mitigationPct`, `threatMult`, `damagePctInc`), a real cleave handler, and a Fighter-exclusive relic (breaking Champion's Crest sharing so the classes diverge).

### 4.4 Paladin — **"Radiant Crusader"** (sustain / holy hybrid / light-bearer)

> Identity: stand at the front *and* heal through it. Your light weakens what your hammer smites.

| Slot | Item | Values | Upgrade spec (per rank, max 5) |
|---|---|---|---|
| main_hand | Radiant Mace (`radiant_mace`) | stat 8, reach 2.5, MP 8, `holy_strike` (18–26) | `stepDamageInc` 4, **`holyPowerInc` 2** (heals + dmg scale) |
| off_hand | Aegis of Dawn (`aegis_of_dawn`) | stat 4, **`healPowerPctInc` 15%** | **`healPowerPctInc` 3%** |
| armor | Crusader Plate (`crusader_plate`) | stat 7, **`mitigationPct` 10%**, **`lightRadiusBonus` 1** | `mitigationPctInc` 2%, **`lightRadiusBonusInc` 1 (max +2)** |
| relic | Dawn Sigil (`dawn_sigil`) | stat 5, **`lifestealPct` 6%**, **`lightRadiusBonus` 1** | **`lifestealPctInc` 1%**, **`lightRadiusBonusInc` 1 (max +2)** |
| bonus | Healing Prayer (keep) | heal 35–50, MP 25, 6s CD | — |

- **Signature:** **Holy light as a combat resource.** `lightRadiusBonus` on plate + sigil means Paladin is the *second* light-bearer (Magician has the spell; Paladin has it in the gear). Light interacts with the recommended strategic option **Lumen Affinities** (§5) — undead burn brighter in your radiance.
- **Synergies:** Aegis boosts Healing Prayer at the same time the mace's holy power scales it; lifesteal means every smite tops you up, so Prayer is saved for spikes; plate + mitigation lets the melee hybrid actually stand.
- **What changes vs. today:** new fields (`holyPowerInc`, `healPowerPctInc`, `lifestealPct`, `lightRadiusBonus` on gear), and Fighter/Paladin gear fully separated (no more shared buckler/plate — each gets its own identity plate).

### Balance note on the four sets
No vocation should be strictly dominant. Roughly: Magician trades sustain-on-frames for control; Archer trades survivability for deleting single threats from range; Fighter trades speed for raw damage and attrition trading; Paladin trades raw damage for self-healing and utility. The `damageStep` multipliers at level 20 (2.9 / 3.28 / 3.85 / 3.09) already encode this; the gear budget above keeps them in the same *band* rather than flattening them.

---

## 5. Creative Strategic Options (5 candidates)

Each option is a coherent, game-wide direction. They are independent; the first two are recommended (see §6).

### Option A — **Lumen Affinities** (elemental rock-paper-scissors)
- **What it changes:** Every damage type gains a "lumen" affinity (Arcane / Physical / Holy / Fire / Frost…). Monsters get 1–2 affinities and a resistance profile in `monsters.json`. Weapons/spells declare their type in `items.json` / `abilities.json`. Damage is multiplied vs. weak affinity (e.g. ×1.5) and reduced vs. resistant (×0.75).
- **Systems touched:** `monsters.json` (affinity/weakness fields), `items.json` (element field), `combat-system.js` (multiplier resolution), cards (new affinity cards), HUD (affinity pips).
- **How it differentiates vocations:** each vocation's kit is anchored to a primary affinity, and its *options* branch into secondaries — Magician can splash holy (burns undead), Fighter can take a fire-laced warblade, Archer gets elemental arrowheads from floor drops.
- **Difficulty/challenge:** adds a "match the tool to the enemy" layer every floor; floor themes can enforce a swap cadence that a flat attack-button build can't ignore.
- **Risks:** affinity can feel like taxes without visible payoff; keep floor multipliers gentle (≥0.75), make weak-weakness the *bonus* not the tax, and surface affinities in the tooltip so decisions are informed.

### Option B — **Set & Resonance Bonuses** (matching gear gets real)
- **What it changes:** add `setFamily` to `items.json`. Wearing **2 pieces** of a family grants a small passive; wearing **4** unlocks the set's signature bonus. This directly repairs §2.3 — gear stops being a pile of numbers and becomes a build choice.
- **Systems touched:** `items.json` (setFamily field), a small set-bonus registry (data or engine constant), character stat recompute on equip, HUD (set tracker).
- **How it differentiates vocations:** each Golden set is its own family, so the "put on your class kit" choice is legible, and cross-set teases (e.g. 1 Arctic piece + 1 Flame piece) can be tuned to be *interesting*, not strictly worse.
- **Difficulty/challenge:** with the Golden sets as the 4-piece target, the player has a clear thesis from floor 1; encounters can then present off-set loot that competes for a slot, creating real tension.
- **Risks:** set-bonus railroading (always wear the full set). Mitigate with **resonance bonuses** — gear above or below the set cap grants *situational* bonuses (e.g. "while at full HP", "while outnumbered") so partial off-set builds stay viable.

### Option C — **Cover, Chokepoints & Zone Control**
- **What it changes:** grid tiles get a `cover` flag (partial LOS/physical block). Ranged attacks can't hit through cover; beams/waves interact with it (Arcane wave *destroys* cover in its path, rewarding the Magician's zoning). Choke doors channel monsters so AoE (cleave, beam, radiance) matters.
- **Systems touched:** `grid-map.js`, `combat-system.js` (LOS), `lighting-system.js` (cover dimming), floor generator (cover placement), AI (`entity-ai.js` pathing through choke).
- **How it differentiates vocations:** Fighter *wants* chokes (holds a door); Archer wants sight-lines (shoots down corridors); Magician rewrites geometry (blasts cover open); Paladin's light keeps the corridor lit so allies aim clean.
- **Difficulty/challenge:** raises the skill ceiling without raising numbers; makes positioning a first-class resource.
- **Risks:** biggest scope item (grid + AI + combat). Tighten by doing cover-as-LOS-block first and cover-destruction second. Torches/light become strategic (dark cover hides monsters).

### Option D — **Ammo & Resource Trade-offs** (deep Archer + relic curses)
- **What it changes:** arrows become rarer on deeper floors (drop curve tweak) but special arrowheads (fire/ice/silver-tip) drop as loot; using a *wrong* arrowhead vs. a resistant foe wastes the slot. Add **curse/bane relics** (high stat, one downside — e.g. "+25 max HP but −10 vision") so the relic slot becomes a real trade.
- **Systems touched:** `items.json` (arrowhead items, bane-relic fields), loot tables, ammo consumption, HUD.
- **How it differentiates vocations:** Archer gets a genuine resource-management loop; other vocations still eat ammo for consumables but gain the *relic-curse* loop as their trade-off layer.
- **Difficulty/challenge:** adds scarcity-driven decisions without touching the damage formula.
- **Risks:** scarcity can read as punishment; keep ammo refund (Golden Archer) so the floor is never "can't attack." Curse relics must be *obviously* worth it or they become dead drops.

### Option E — **Combo & Synergy Triggers**
- **What it changes:** a small trigger system: specific ability+gear combos fire bonus effects (e.g. "Land 3 wand sparks within 2 s → next beam is free"; "Cleave a stunned target → Fortify's cooldown −4 s"; "Power Shot from 5+ tiles away → guaranteed crit"). Triggers are printed on the item/card text so the player *knows* the rule.
- **Systems touched:** `combat-system.js` (trigger checks), cards/descriptions, HUD toasts.
- **How it differentiates vocations:** each vocation's Golden set comes with 2–3 printed trigger recipes; mastery = learning the recipes, which separates skilled players from button-mashers on the *player* axis instead of the *numbers* axis.
- **Difficulty/challenge:** deep but additive; no math retune needed.
- **Risks:** trigger sprawl and text-bloat; cap at ~3 recipes per set and keep them readable on the item card.

---

## 6. Recommendation & Implementation Slice Order

### Recommended starting point
1. **Ship all four Golden sets (option: yes — they're the cohesive package).** They are cheap (mostly data + a few new fields), directly fix the §2 asymmetry, and give every vocation rank-up depth for the first time.
2. **Creative options:** adopt **Option B (Set & Resonance Bonuses)** first — it's the cheapest game-wide win and it makes the Golden sets *sing* — followed by **Option A (Lumen Affinities)** as the strategic depth layer that turns light into a resource and gives each set a reason to exist beyond raw stats.
3. Park C (cover/zone) as the stretch goal (higher scope), D as an Archer/relic expansion, E as a post-stable mastery layer.

### Suggested implementation slice order (build what first)
1. **Slice 0 — Fix the seams:** true 90°-arc cleave handler + a working Fortify handler. (Unblocks the Fighter identity honestly.)
2. **Slice 1 — Data:** add the 12 Golden items + 4 new `setFamily`s + `upgradeSpec`s to `items.json`; add matching draft cards to `cards.json` (rarities: weapon epic, armor rare, relic rare/legendary). The existing Fate Grant LEVEL UP path picks them up automatically.
3. **Slice 2 — Engine fields:** wire `mitigationPct`, `dodgePct`, `critChanceInc/critMultInc`, `ammoRefundPct`, `lifestealPct`, `holyPowerInc`, `knockbackInc` into combat resolution + HUD stat display.
4. **Slice 3 — Set/Resonance bonuses (Option B):** 2-piece/4-piece registry, equip-recompute, HUD set tracker.
5. **Slice 4 — Lumen Affinities (Option A):** monster affinity fields, item/spell element types, ×1.5/×0.75 multiplier, tooltip pips, cards for affinity-flavored loot.
6. **Slice 5 — Balance pass:** re-tune monster damage ranges against the new mitigation (the flat roll finally interacts with gear), verify all four vocations clear the same floors on similar par, autotune Fate Grant draft weights so Golden items show up at the right cadence.

### Why this order
Fixing the two dead seams (Slice 0) is trivial and upstream; Golden sets (Slice 1–2) land the *wholesale* depth with low risk because they reuse the existing card/upgrade pipeline; set resonance (Slice 3) makes the gear a *system*; lumen affinities (Slice 4) deliver the strategy layer the board asked for; and the balance pass (Slice 5) is where the math gets honest now that defense actually exists.

---

## Appendix — New schema fields proposed (one-line reference)

| New field | Type | Meaning | Consumed by |
|---|---|---|---|
| `knockbackInc` | number | tiles of knockback gained per rank | beam projectile |
| `ammoRefundPct` (+`Inc`) | number | % chance a shot doesn't consume an arrow | arrow consumption |
| `arrowCapacityBonus` (+`Inc`) | number | extra max arrows carried | inventory max-stack |
| `dodgePct` (+`Inc`) | number | % chance to avoid a monster hit | entity-ai damage application |
| `critChanceInc` / `critMultInc` | number | crit chance / multiplier | combat damage roll |
| `mitigationPct` (+`Inc`) | number | flat % damage reduction vs. monster rolls | entity-ai / combat |
| `threatMult` | number | multiplier on aggro radius/weight | entity-ai aggro |
| `damagePctInc` | number | % attack damage increase | combat damage roll |
| `holyPowerInc` | number | scales holy dmg and healing | combat / heal resolution |
| `healPowerPctInc` | number | % healing increase | heal resolution |
| `lifestealPct` | number | % of damage dealt restored as HP | combat resolution |
| `lightRadiusBonus` | number | added vision radius (exists on torch; extend to gear) | lighting-system |
| `setFamily` | string | set/tribe id for resonance bonuses | equip-recompute / HUD |
| `element` / `affinity` | string | lumen type (Option A) | combat multiplier |
| `cover` (tile) | bool | blocks LOS/line-of-shot (Option C) | grid / combat |