# Feature Brief: 04 — Vocations and Character Progression

## 1. Purpose

The **Vocations and Character Progression** feature manages character archetypes, stat growth curves, experience point (XP) accumulation, level advancements up to the Level 20 cap, and the level-up **Fate Grant System** draft selection interface.

---

## 2. Implemented Behavior

### 2.1 Playable Character Vocations & Growth Curves
The 4 playable vocations (built in `html/engine/config.js` from `vocations.json`) possess initial vitals and per-level stat growth curves (`ProgressionSystem.addXp`). Each vocation also declares a `nativeEquipment` item-id list in `vocations.json` (**vocation-locked gear** — weapons/armor/relics can only be equipped by their appropriate vocation; there is **no** class damage/healing multiplier):

- **Magician:**
  - Base Vitals: 60 HP, 150 MP.
  - Per-Level Growth: +8 HP, +16 MP.
  - Locked Gear & Abilities: Arcane Wands, Beam Staff, Apprentice's Cape (native equipment: `apprentice_wand`, `astral_scepter`, `apprentice_cape`); Wand Spark, Energy Beam, Shock Shield (Apprentice's Cape `E`), Luminous Prayer (Luminous Amulet `R`).
- **Archer:**
  - Base Vitals: 90 HP, 80 MP.
  - Per-Level Growth: +14 HP, +8 MP.
  - Locked Gear & Abilities: Bows, Longbows, Hunter's Quiver, Vampiric Cloak, Ranger's Talisman (native equipment: `wooden_bow`, `composite_bow`, `hunter_quiver`, `hunter_leathers`, `ranger_talisman`); Bow Shot, Power Shot, Poison Tip (Quiver `W`), Life Siphon (Cloak `E`), Hunter's Mark (Talisman `R`), Arrows.
- **Fighter:**
  - Base Vitals: 140 HP, 30 MP.
  - Per-Level Growth: +18 HP, +4 MP.
  - Locked Gear & Abilities: Tempered Broadsword, Reinforced Buckler, Knight Plate Armor, Iron Helm (native equipment: `tempered_broadsword`, `buckler`, `plate_armor`, `iron_helm`); Slash, Heavy Cleave. Buckler/Plate/Crest are shared with Paladin (`vocationAffinity: ["fighter","paladin"]`).
- **Paladin:**
  - Base Vitals: 120 HP, 90 MP.
  - Per-Level Growth: +15 HP, +10 MP.
  - Locked Gear & Abilities: Consecrated Warhammer, Reinforced Buckler, Knight Plate Armor, Holy Crown (native equipment: `consecrated_warhammer`, `buckler`, `plate_armor`, `holy_crown`); Holy Strike, Healing Prayer. Buckler/Plate/Crest are shared with Fighter.

### 2.2 Leveling Formula & Level 20 Cap
- **Leveling Formula:** Required XP to reach the next level is calculated by `ProgressionSystem.getXpForLevel(level)`:
  $$\text{XP Required} = \text{Current Level} \times 100$$
  (Level $1 \rightarrow 2$: 100 XP; Level $5 \rightarrow 6$: 500 XP).
- **Level 20 Cap:** Level advancement caps strictly at Level 20 (`ProgressionSystem.MAX_LEVEL = 20`). At level 20, accumulated XP is pinned to `player.xpToNextLevel`.
- **Restorative Surge:** Leveling up instantly fully restores player current HP to `max_hp` and current MP to `max_mana`.

### 2.3 The Fate Grant Draft System
- **Draft Trigger:** Advancing a level pauses the 10 Hz game loop and instantiates a 5-card draft pool (`FateGrantSystem.generateOptions(player)`).
- **5-Card Selection Pool:** Randomized cards drawn from:
  1. Vocation-aligned Skill Grants or Upgrades.
  2. Max HP Boosts (+15 to +30 Max HP).
  3. Max MP Boosts (+15 to +30 Max MP).
  4. Base ATK / DEF Attribute Increases (+2 to +5 ATK/DEF).
  5. Consumable / Equipment Item Grants.
- **Selection Application:** Calling `FateGrantSystem.applyOption(player, optionId)` mutates player state permanently and unblocks movement input.

---

## 3. Inputs & Outputs

- **Inputs:** `player` (character object), `amount` (XP gained number), `optionId` (draft selection ID).
- **Outputs:** Progression Result Object:
  - `leveledUp`: boolean
  - `oldLevel`: number
  - `newLevel`: number ($1..20$)
  - `hpGained`: number
  - `manaGained`: number
  - `damagePercentGained`: number

---

## 4. User-Visible Experience

- **Character Creation:** Player chooses 1 of 4 vocation avatars (Magician, Archer, Fighter, Paladin) with preview stats.
- **Level-Up Fanfare:** Defeating monsters to fill the green XP bar triggers an arpeggiated sound fanfare and modal backdrop blur.
- **Fate Grant Draft Modal:** An interactive 5-card draft modal pops up over canvas, prompting card selection before resuming tower exploration.

---

## 5. Constraints

- Progression hard-caps at Level 20.
- Level-up stat gains instantly top off HP and MP to maximum.
- Game simulation input is strictly locked while Fate Grant modal is open.

---

## 6. Acceptance Criteria

1. **4 Vocation Archetype Vitals:** Instantiating new player objects (`createPlayer`) produces correct starting HP/MP vitals for all 4 vocations (Verified in `html/tests/engine.test.mjs#L248-L260`).
2. **XP Level Formula (`level * 100`):** Level 1 requires 100 XP, Level 5 requires 500 XP, Level 19 requires 1900 XP (Verified in `html/tests/engine.test.mjs#L262-L270`).
3. **Per-Level Stat Growth:** Magician receives +8 HP/+16 MP; Archer receives +14 HP/+8 MP; Fighter receives +18 HP/+4 MP; Paladin receives +15 HP/+10 MP per level (Verified in `html/tests/engine.test.mjs#L272-L290`).
4. **Level 20 Cap Enforcement:** Granting massive XP (e.g. 50,000 XP) caps player level at exactly 20 without exceeding (Verified in `html/tests/engine.test.mjs#L292-L300`).
5. **Fate Grant 5-Card Pool Generation:** `FateGrantSystem.generateOptions(player)` returns an array of exactly 5 distinct options (Verified in `html/tests/engine.test.mjs#L380-L392`).
