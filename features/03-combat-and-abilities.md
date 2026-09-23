# Feature Specification: 03 — Tactical Combat and Vocation Abilities

## 1. Overview & Purpose

The **Tactical Combat and Vocation Abilities** feature governs turn-based combat interactions, melee and ranged attacks, spellcasting, damage/mitigation calculations, monster AI behavior, status effects, and class-specific mastery multipliers. It delivers grid-aligned turn resolution at a 10 Hz simulation tick.

---

## 2. Mapped Codebase Modules

- [html/engine.js](file:///Users/jarad/git/lokarta-v3/html/engine.js) — `CombatSystem`, `EntityAI`, ability implementations (`Wand Spark`, `Light Spell`, `Energy Beam`, `Bow Shot`, `Power Shot`, `Holy Strike`, `Healing Prayer`).
- [html/app.js](file:///Users/jarad/git/lokarta-v3/html/app.js) — Input gesture mapping, combat log dispatch, floating damage text, particle FX.

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 Turn-Based Simulation Tick (10 Hz)
- Player action (movement, attack, skill, item use) triggers a turn tick.
- All active monsters on the floor process their turn tick sequentially after player action.

### 3.2 Vocation Abilities & Skill System
- **Magician Skills:**
  - *Wand Spark:* Single-target ranged magic attack.
  - *Light Spell:* Expands vision radius to 12 tiles and illuminates surrounding area.
  - *Energy Beam:* Penetrating line-of-sight ranged spell striking multiple aligned targets.
- **Archer Skills:**
  - *Bow Shot:* Standard physical ranged attack requiring equipped arrows.
  - *Power Shot:* High-damage physical ranged strike consuming extra MP and ammo.
- **Fighter Skills:**
  - *Heavy Melee Cleave:* High physical melee damage with heavy weapons/swords.
- **Paladin Skills:**
  - *Holy Strike:* Melee physical + holy magic hybrid attack dealing bonus damage to undead.
  - *Healing Prayer:* Restores player HP scaling with magic power and Paladin level.

### 3.3 2.5x Native Class Mastery Multiplier
- When a player executes an ability or uses a weapon archetype native to their chosen vocation (e.g., Magician using wands/beams, Archer using longbows/power shot, Fighter using heavy swords, Paladin using holy strikes/healing), a **2.5x Class Mastery multiplier** is applied to total damage or healing output.

### 3.4 Damage & Hit Mechanics
- Attack calculations evaluate attacker Attack (ATK) power against defender Armor/Defense (DEF).
- Damage formula guarantees minimum 1 damage on successful hits.
- Supports critical hits and evasion checks.

### 3.5 Monster AI & Aggro System
- **Aggro Range Detection:** Monsters enter aggressive tracking mode when player moves within line-of-sight detection radius (6–10 tiles).
- **Pathfinding & Movement:** Aggroed monsters path toward player coordinates using grid distance calculation.
- **Melee & Ranged Attack Triggers:** Monsters attack when adjacent (melee) or within line of sight (ranged spellcasters/archers).
- **Floor 20 Boss Fight:** *Abyssal Overlord* boss featuring 600 HP, 20 ATK, 6 DEF, and unique combat dialogue.

---

## 4. Inputs, Outputs & State Data

- **Inputs:** Attacker entity state, defender entity state, skill/weapon attributes, grid obstacle matrix.
- **Outputs:**
  - Health point (HP) changes on attacker or defender.
  - Mana point (MP) consumption.
  - Arrow ammo decrement for archer skills.
  - Combat log message strings.
  - Floating text indicators (Damage values, "MISS", "CRIT", "HEAL").

---

## 5. Operational Constraints & Boundaries

- Abilities requiring MP or ammo fail gracefully with log notification if resources are insufficient.
- Dead entities (HP $\le 0$) are removed from active grid lists and trigger experience/loot distribution.
