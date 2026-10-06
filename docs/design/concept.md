# Lokarta: Come Into The Light — Concept Document

## Product Identity & Purpose

**Lokarta: Come Into The Light** is a zero-backend, client-side, offline-capable 2D roguelike RPG. It provides a retro-inspired, turn-based grid simulation and real-time canvas rendering experience directly inside standard modern web browsers.

The purpose of Lokarta is to deliver a rich tactical tower-climbing roguelike featuring ascent-based procedural floor generation, line-of-sight fog-of-war lighting, class-based combat mastery, procedural Web Audio synthesis, and robust offline save persistence — all executing natively in the browser without requiring external application servers or remote database infrastructure.

---

## Target Audience

- Fans of classic roguelike RPGs, grid-based tower-climbing crawlers, and turn-based tactical combat.
- Web gaming enthusiasts who value zero-installation, zero-dependency, instant-play browser experiences.
- Players seeking offline-capable gameplay with local character progression and persistent tower exploration.

---

## Implemented Technical Stack

Lokarta is built as a pure web-native client application utilizing modern standard browser APIs:

- **Zero-Backend Architecture:** Self-contained static assets hosted via standard HTTP static file servers (`run.sh`, Python `http.server`, `npx serve`, GitHub Pages, Cloudflare Pages, S3).
- **Vanilla ES Modules (`type="module"`):** Decoupled, dependency-free JavaScript modules (`html/engine/*.js`, `html/services/floor-generator.js`, `html/services/storage.js`, `html/worker/game-worker.js`, `html/worker/game-client.js`, `html/app.js`, `html/audio/audio-system.js`).
- **Dedicated Web Worker (`html/worker/game-worker.js`):** Offloads procedural tower floor generation, state calculation, and floor caching off the main UI thread.
- **Typed Worker RPC Bridge (`html/worker/game-client.js`):** Asynchronous Promise-wrapped message protocol for state mutation and worker commands.
- **IndexedDB Persistence (`html/services/storage.js`):** Asynchronous local database storage utilizing dedicated Object Stores (`characters`, `dungeon_floors`, `profile`, `game_settings`).
- **HTML5 Canvas 2D Renderer (`html/app/`):** 60 FPS sprite and tile rendering pipeline with camera centering, line-of-sight shadow masks, particle effects, and dynamic light radii.
- **Procedural Web Audio API (`html/audio/audio-system.js`):** Dynamic Web Audio synthesizer creating retro sound effects (footsteps, wand sparks, energy beams, bow shots, power shots, holy strikes, healing spells, monster hits, level-up fanfares, potions) entirely in code without external audio assets.
- **10 Hz Simulation Loop & Gesture Engine (`html/app/`, `html/engine/`):** Fixed-tick turn-based engine handling input gestures, movement, combat actions, AI pathing, and cooldown updates.

---

## Seed Data & Character Vocations

### 1. Playable Vocations
The game supports 4 distinct playable vocations, each possessing unique stat growth per level. The class advantage is **exclusive access to vocation-locked equipment** — weapons, armor, and relics can only be equipped by their appropriate vocation (there is **no** damage/healing class multiplier):

- **Magician:**
  - *Focus:* Ranged spellcasting, illumination, and area-of-effect energy attacks.
  - *Starting Vitals:* 60 HP, 150 MP.
  - *Stat Growth:* +8 HP / +16 MP per level.
  - *Native Gear/Abilities:* Wand Spark, Light Spell, Energy Beam, Arcane Wands.
- **Archer:**
  - *Focus:* High single-target physical damage, range control, and ammunition management.
  - *Starting Vitals:* 90 HP, 80 MP.
  - *Stat Growth:* +14 HP / +8 MP per level.
  - *Native Gear/Abilities:* Bow Shot, Power Shot, Longbows, Crossbows, Arrows.
- **Fighter:**
  - *Focus:* Melee powerhouse, high durability, and close-quarters combat.
  - *Starting Vitals:* 140 HP, 30 MP.
  - *Stat Growth:* +18 HP / +4 MP per level.
  - *Native Gear/Abilities:* Heavy Swords, Shields, Heavy Plate Armor.
- **Paladin:**
  - *Focus:* Holy warrior hybrid combining melee combat, defense, and restorative divine magic.
  - *Starting Vitals:* 120 HP, 90 MP.
  - *Stat Growth:* +15 HP / +10 MP per level.
  - *Native Gear/Abilities:* Holy Strike, Healing Prayer, Relics, Warhammers, Shields.

### 2. Procedural Tower Ascent & Tiers
The tower is procedurally generated on a $40 \times 40$ tile grid using a deterministic Mulberry32 PRNG seed generator (`html/services/floor-generator.js`), ensuring reproducible connectivity between player spawn at `(2,2)` and the ascent stairs at `(35,35)`. The tower comprises **five tiers**, climbed in ascending order; level 5 is the final level:

1. **The Gatehouse (Level 1):** Ground-floor entry, reached through the room-2 doorway. Populated by Giant Rats and Bone Sentries.
2. **The Hall of Banners (Level 2):** First gated keys; Shadow Cultists and Bone Sentries tighten the corridors.
3. **The Bell Keep (Level 3):** Mid-tower chambers guarded by Elite Cultists and heavier sentry groups.
4. **The Solar Gallery (Level 4):** High, light-blessed chambers with the richest loot.
5. **The Crown Spire (Level 5):** The summit, final level, culminating in the **Spire Warden** guardian fight (600 HP, 20 ATK, 6 DEF).

### 3. Inventory & Equipment Structure
- **10-Slot Action Bar (Slots 0–9):** Maps directly to keyboard keys `1`–`9` and `0` for immediate skill activation or consumable item usage.
- **6-Slot Backpack:** General storage for non-hotbar items and extra loot.
- **4-Slot Paperdoll Equipment:** Equippable item slots consisting of `main_hand`, `off_hand`, `armor`, and `relic`.
- **Stacking Mechanics:** Potions (Health, Mana) and Torches stack up to 9 items; Arrows stack up to 99 items; equipment and relics remain unstacked (1 per slot).

---

## Major Implemented Capabilities

1. **Procedural Floor Generation & BFS Connectivity Verification:**
   - Carves rooms and corridors on a $40 \times 40$ matrix, placing walls, doors, floor tiles, stairs, monsters, and chest loot.
   - Guarantees valid pathing between start `(2,2)` and exit stairs `(35,35)` via Breadth-First Search (BFS) path verification.

2. **Dynamic Line-of-Sight & Circular Fog of War:**
   - Calculates dynamic vision radii driven by JSON catalog specs: Base FOV (10 tiles), Torch (+2 radius -> 12 tiles), and Light Spell (+3/+2/+1 degrading radius).
   - Evaluates tile distance to illuminate visible tiles while keeping unexplored tiles shrouded in dark fog-of-war.

3. **Turn/Tick Simulation & Entity AI:**
   - 10 Hz simulation tick loop managing player inputs, monster aggro range checks, pathfinding toward the player, melee/ranged monster attacks, and status condition updates.

4. **Class-Based Combat & Skill Mechanics:**
   - Implements ranged spells (Wand Spark, Energy Beam), physical attacks (Bow Shot, Power Shot), and holy magic (Holy Strike, Healing Prayer).
   - Enforces **vocation-locked equipment**: only the appropriate vocation (or shared fighter/paladin classes for `["fighter","paladin"]` gear) can equip or use an item. Damage and healing scale solely from `skillBoosts.damageMultiplier` — no class multiplier.

5. **Leveling, Progression & Fate Grant System:**
   - Player leveling up to Level 20 cap based on `level * 100` XP requirement.
   - On level-up, the **Fate Grant System** offers a 5-card draft selection of vocation-aligned skills, stat boosts, and items.

6. **Local Persistence via IndexedDB:**
   - Saves character attributes, equipped gear, action bar layout, backpack inventory, and floor progression across browser reloads.
