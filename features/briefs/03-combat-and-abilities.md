# Feature Brief: 03 — Tactical Combat and Vocation Abilities

## 1. Purpose

The **Tactical Combat and Vocation Abilities** feature governs turn-based combat interactions, physical/ranged/magical ability execution, damage mitigation, entity AI pathing and aggro, status condition ticks, and **vocation-locked equipment**. It runs at a fixed 10 Hz simulation tick loop (`CONFIG.TICK_INTERVAL_MS = 100`) to process inputs, projectile trajectories, and entity actions.

---

## 2. Implemented Behavior

### 2.1 Vocation-Locked Equipment (No Class Multiplier)
- **Mechanic:** Every equippable item in `items.json` carries a `vocationAffinity` — `"magician"`, `"archer"`, `"fighter"`, `"paladin"`, `"neutral"`, or an array such as `["fighter","paladin"]`. Equipping (`InventorySystem.equipItem`) or using (`executeActionSlotCombat`) an item whose affinity does not match the player's vocation is **rejected** with a `"Only a {Vocation} can equip/use {item}!"` combat log message. Affinity checks are array-aware (`includes()`), mirroring `FateGrantSystem.generateDraftOffer`.
- **Archetype Alignment (declarative):** `vocations.json` declares a `nativeEquipment` item-id list per vocation (Magician: wand/scepter/cape; Archer: bows + Hunter set; Fighter: broadsword/buckler/plate/helm; Paladin: warhammer/buckler/plate/crown).
- **No damage/healing multiplier:** `CONFIG.NATIVE_CLASS_MULTIPLIER`, `CombatSystem.isNativeItem`, and `CombatSystem.getVocationMultiplier` are removed. Damage and healing scale solely from `player.skillBoosts?.damageMultiplier || 1.0`. The class advantage is exclusive access to vocation-locked gear.

### 2.2 Vocation Ability Catalogue & Attributes
- **Magician:**
  - *Wand Spark:* Range 5 tiles (`+bonusRange`), 1.0s cooldown, base damage 12–16 magic.
  - *Light Spell:* Mana cost 15 MP, 5.0s cooldown, grants 12-tile vision for 30s (`CONFIG.LIGHT_SPELL_DURATION_SEC = 30`).
  - *Energy Beam:* Mana cost 30 MP, 3.0s cooldown, range 4 tiles (`+bonusRange`), base damage 30–40. Penetrates all aligned targets in facing direction.
- **Archer:**
  - *Bow Shot:* Range 6 tiles, 1.0s cooldown, base damage 14–18. Requires 1 Arrow (`item_id: 'arrows'`).
  - *Power Shot:* Range 6 tiles, 4.0s cooldown, base damage 32–42. Requires 1 Arrow.
- **Fighter:**
  - *Slash:* Melee range 1.5 tiles, 0.8s cooldown, base damage 16–22 physical.
  - *Heavy Cleave:* Mana cost 10 MP, 2.5s cooldown, base damage 24–34. Melee cleave area.
- **Paladin:**
  - *Holy Strike:* Mana cost 10 MP, 1.2s cooldown, base damage 18–26 holy/physical. Deal bonus damage against undead.
  - *Healing Prayer:* Mana cost 25 MP, 6.0s cooldown, base healing 35–50 HP. Restores health scaling with Paladin level.

### 2.3 Monster AI Cadence & Aggro System
- **Aggro Trigger:** Monsters become aggroed when entering player line of sight within detection radius.
- **Cadence & Standoff:**
  - `rat`: Move cadence 0.6s, Attack cadence 1.2s, Damage 4–8.
  - `skeleton`: Move cadence 0.8s, Attack cadence 1.5s, Damage 8–14.
  - `cultist`: Move cadence 1.0s, Attack cadence 2.0s, Standoff distance 3–4 tiles (ranged spellcaster), Damage 10–16.
  - `abyssal_overlord` (Floor 20 Boss): Move cadence 0.7s, Attack cadence 1.4s, Damage 16–24.
- **Pathfinding:** Aggroed monsters compute step coordinates toward player using grid distance logic.

### 2.4 Ammunition & Cooldown Tracking
- **Ammo Decrement:** Archer ranged skills call `CombatSystem.consumeArrow(player)`, decrementing `quantity` of arrows in action bar or backpack by 1 per shot. If quantity reaches 0, the stack is removed.
- **Cooldown Decrement:** Cooldown timers update each tick via `CombatSystem.decrementCooldowns(player, deltaSec)`.

---

## 3. Inputs & Outputs

- **Inputs:** `player` (entity object), `target` / `monsters` (entity arrays), `facing` (direction string), `gridMap` (`GridMap` instance).
- **Outputs:** Ability Result Object:
  - `success`: boolean
  - `message`: string (combat log formatted message)
  - `damageDealt`: number (damage inflicted)
  - `healedAmount`: number (HP restored)
  - `projectiles`: `Array<ProjectileObject>` (rendering animation metadata)
  - `defeatedMonsterId`: string | undefined
  - `droppedLoot`: `Array<ItemObject>` | undefined

---

## 4. User-Visible Experience

- **Ability Activation:** Pressing keys `1`–`9` or `0` triggers assigned hotbar skills.
- **Combat FX:** Ranged attacks spawn animated projectiles across canvas (blue spark for Wand Spark, yellow line for Energy Beam, arrow trajectory for Bow Shot).
- **Floating Text:** Inflicted damage displays red numbers floating over targets; heals display green numbers; combat log messages carry no `"(2.5x Class Mastery!)"` suffix — equipping/using mis-classed gear logs `"Only a {Vocation} can equip/use {item}!"`.

---

## 5. Constraints

- Ranged abilities fail with log notification if target is out of range or LOS is obstructed.
- Archer skills fail if arrow quantity is 0.
- Spells fail if current MP is less than mana cost.

---

## 6. Acceptance Criteria

1. **No Class Multiplier:** Magician using Wand Spark computes base damage scaled only by `skillBoosts.damageMultiplier` (no 2.5x native class multiplier; verified in the `CombatSystem (No Class Multiplier) & Vocation-Locked Equipment` suite in `html/tests/engine.test.mjs`).
2. **Vocation-Locked Equipment:** Wrong-class characters cannot equip `buckler`/`plate_armor`/class gear (including array-affinity `["fighter","paladin"]` gear rejected for archer/magician yet accepted by both Fighter and Paladin; verified in `html/tests/engine.test.mjs`).
3. **Archer Ammunition Consumption:** Executing Bow Shot decrements arrow inventory stack by 1 (Verified in `html/tests/engine.test.mjs`).
4. **Paladin Healing Prayer:** Executing Healing Prayer restores HP and consumes 25 MP (Verified in `html/tests/engine.test.mjs`).
5. **Energy Beam Line Penetration:** Energy Beam strikes multiple aligned targets along facing vector within range 4 (Verified in `html/tests/engine.test.mjs`).
6. **Cooldown Enforcement:** Attempting to execute an ability prior to cooldown expiration returns `success: false` (Verified in `html/tests/engine.test.mjs`).
