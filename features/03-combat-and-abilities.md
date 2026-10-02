# Feature Specification: 03 — Tactical Combat and Vocation Abilities

## 1. Overview & Purpose

The **Tactical Combat and Vocation Abilities** feature governs turn-based combat interactions, melee and ranged attacks, spellcasting, damage/mitigation calculations, monster AI behavior, status effects, and vocation-locked equipment. It delivers grid-aligned turn resolution at a 10 Hz simulation tick.

---

## 2. Mapped Codebase Modules

- [html/engine/combat-system.js](file:///Users/jarad/git/lokarta-v3/html/engine/combat-system.js) — `CombatSystem`, `EntityAI`, ability execution logic.
- [html/data/abilities.json](file:///Users/jarad/git/lokarta-v3/html/data/abilities.json) — Catalog definitions for ability stats (`Wand Spark`, `Light Spell`, `Energy Beam`, `Bow Shot`, `Power Shot`, `Holy Strike`, `Healing Prayer`).
- [html/data/monsters.json](file:///Users/jarad/git/lokarta-v3/html/data/monsters.json) — Bestiary catalog defining stats, behaviors, and loot tables (`lootTable`).
- [html/app/app-controller.js](file:///Users/jarad/git/lokarta-v3/html/app/app-controller.js) — Input gesture mapping, combat log dispatch, floating damage text, particle FX.

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

### 3.3 Vocation-Locked Equipment (No Class Multiplier)
- Equipment is **vocation-locked**: every equippable item carries a `vocationAffinity` in `items.json` (e.g. `"archer"`, `"fighter"`, `"paladin"`, `"neutral"`, or an array like `["fighter","paladin"]`), and only the matching vocation can equip or use it.
- The class advantage is **exclusive access to class-specific gear** (e.g. Archer's Hunter set, Fighter's Legion set, Paladin's Crusader set), **not** a damage/healing multiplier.
- Damage and healing scale solely from `skillBoosts.damageMultiplier`; there is no `NATIVE_CLASS_MULTIPLIER` and no `(2.5x Class Mastery!)` combat log messaging.

### 3.4 Damage & Hit Mechanics
- Attack calculations evaluate attacker Attack (ATK) power against defender Armor/Defense (DEF).
- Damage formula guarantees minimum 1 damage on successful hits.
- Supports critical hits and evasion checks.

### 3.5 Monster AI & Aggro System
- **Aggro Range Detection:** Monsters enter aggressive tracking mode when player moves within line-of-sight detection radius (6–10 tiles).
- **Pathfinding & Movement:** Aggroed monsters path toward player coordinates using grid distance calculation.
- **Melee & Ranged Attack Triggers:** Monsters attack when adjacent (melee) or within line of sight (ranged spellcasters/archers).
- **Final Level Boss Fight:** *The Spire Warden* guardian featuring 600 HP, 20 ATK, 6 DEF, and unique combat dialogue.

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
