# Feature Specification: 04 — Vocations and Character Progression

## 1. Overview & Purpose

The **Vocations and Character Progression** feature manages player character creation, class archetypes, level progression up to the Level 20 cap, experience (XP) calculation, stat growth per level, and the level-up **Fate Grant System** draft selection interface.

---

## 2. Mapped Codebase Modules

- [html/engine/progression-system.js](file:///Users/jarad/git/lokarta-v3/html/engine/progression-system.js) — `ProgressionSystem`, `createPlayer`.
- [html/engine/fate-grant-system.js](file:///Users/jarad/git/lokarta-v3/html/engine/fate-grant-system.js) — `FateGrantSystem` draft logic.
- [html/data/vocations.json](file:///Users/jarad/git/lokarta-v3/html/data/vocations.json) — Vocation catalog defining base vitals, growth stats, `eyeColor`, and `regenResource`.
- [html/data/cards.json](file:///Users/jarad/git/lokarta-v3/html/data/cards.json) — Fate Grant card pool definition catalog.
- [html/app/app-controller.js](file:///Users/jarad/git/lokarta-v3/html/app/app-controller.js) — Character creation UI, Fate Grant card modal presentation, HUD stat displays.

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 4 Playable Character Vocations (Data-Driven from `vocations.json`)
- **Magician:**
  - Base Vitals: 60 HP, 150 MP.
  - Per-Level Growth: +8 HP, +16 MP.
  - Eye Color: `#3b82f6` (Blue). Passive Regen: MP.
  - Class Specialty: Ranged arcane wands, AOE energy beams, illumination spells.
- **Archer:**
  - Base Vitals: 90 HP, 80 MP.
  - Per-Level Growth: +14 HP, +8 MP.
  - Eye Color: `#10b981` (Green). Passive Regen: HP.
  - Class Specialty: Longbows, crossbows, precision ranged physical combat, ammo management.
- **Fighter:**
  - Base Vitals: 140 HP, 30 MP.
  - Per-Level Growth: +18 HP, +4 MP.
  - Eye Color: `#ef4444` (Red). Passive Regen: HP.
  - Class Specialty: Heavy swords, high defense, melee cleaves, physical durability.
- **Paladin:**
  - Base Vitals: 120 HP, 90 MP.
  - Per-Level Growth: +15 HP, +10 MP.
  - Eye Color: `#f59e0b` (Gold). Passive Regen: HP.
  - Class Specialty: Holy warhammers, divine healing prayers, holy strikes, hybrid defense.

### 3.2 Experience Points & Level Cap
- **Leveling Formula:** Level advancement requires $\text{Current Level} \times 100$ experience points (e.g., Level 1 $\rightarrow$ Level 2 requires 100 XP; Level 5 $\rightarrow$ Level 6 requires 500 XP).
- **Level 20 Cap:** Progression caps at Level 20; additional XP beyond level 20 cap is ignored or retained without level increment.
- **Monster XP Grants:** Defeating tower monsters awards XP scaled to monster level and floor depth.

### 3.3 The Fate Grant Draft System
- **Trigger:** Reaching a new level pauses game simulation and opens the Fate Grant draft modal.
- **5-Card Selection Options:** Generates a randomized 5-card draft pool containing:
  1. Vocation-aligned skill grants or upgrades.
  2. Maximum HP stat boosts (+15 to +30 HP).
  3. Maximum MP stat boosts (+15 to +30 MP).
  4. Base Attack / Defense stat increases (+2 to +5 ATK/DEF).
  5. Rare item or potion grants.
- **Player Choice:** Player selects 1 card from the 5 options to permanently apply rewards to character state, then resumes exploration.

---

## 4. Inputs, Outputs & State Data

- **Inputs:** Current player level, accumulated XP, monster defeat XP value, player vocation archetype ID.
- **Outputs:**
  - Updated player level ($1..20$).
  - Recalculated max HP & max MP totals.
  - Incremented base ATK / DEF attributes.
  - Added or upgraded active abilities.
  - Applied Fate Grant card choice data.

---

## 5. Operational Constraints & Boundaries

- Stat increases from leveling immediately restore current HP and MP by the gain amount.
- Fate Grant modal must block movement input until card selection is confirmed.
