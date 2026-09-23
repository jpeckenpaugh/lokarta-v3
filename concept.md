# Lokarta: Come Into The Light — Concept Document

## Product Identity & Purpose

**Lokarta: Come Into The Light** is a zero-backend, client-side, offline-capable 2D roguelike RPG. It provides a retro-inspired, turn-based grid simulation and real-time canvas rendering experience directly inside standard modern web browsers.

The purpose of Lokarta is to deliver a rich tactical dungeon crawler featuring depth-based procedural floor generation, line-of-sight fog-of-war lighting, class-based combat mastery, procedural Web Audio synthesis, and robust offline save persistence — all executing natively in the browser without requiring external application servers or remote database infrastructure.

---

## Target Audience

- Fans of classic roguelike RPGs, grid-based dungeon crawlers, and turn-based tactical combat.
- Web gaming enthusiasts who value zero-installation, zero-dependency, instant-play browser experiences.
- Players seeking offline-capable gameplay with local character progression and persistent dungeon exploration.

---

## Implemented Technical Stack

Lokarta is built as a pure web-native client application utilizing modern standard browser APIs:

- **Zero-Backend Architecture:** Self-contained static assets hosted via standard HTTP static file servers (`run.sh`, Python `http.server`, `npx serve`, GitHub Pages, Cloudflare Pages, S3).
- **Vanilla ES Modules (`type="module"`):** Decoupled, dependency-free JavaScript modules (`engine.js`, `floor-generator.js`, `storage.js`, `game-worker.js`, `game-client.js`, `app.js`, `audio.js`).
- **Dedicated Web Worker (`game-worker.js`):** Offloads procedural dungeon floor generation, state calculation, and floor caching off the main UI thread.
- **Typed Worker RPC Bridge (`game-client.js`):** Asynchronous Promise-wrapped message protocol for state mutation and worker commands (`INIT_GAME`, `GENERATE_FLOOR`, `LOAD_FLOOR`, `SAVE_GAME`, `GET_GAME`).
- **IndexedDB Persistence (`storage.js`):** Asynchronous local database storage utilizing dedicated Object Stores (`characters`, `dungeon_floors`, `profile`, `game_settings`).
- **HTML5 Canvas 2D Renderer (`app.js`):** 60 FPS sprite and tile rendering pipeline with smooth coordinate interpolation, camera centering, line-of-sight shadow masks, particle effects, and dynamic light radii.
- **Procedural Web Audio API (`audio.js`):** Dynamic Web Audio synthesizer creating retro sound effects (footsteps, wand sparks, energy beams, bow shots, power shots, holy strikes, healing spells, monster hits, level-up fanfares, potions) entirely in code without external audio assets.
- **10 Hz Simulation Loop & Gesture Engine (`app.js`, `engine.js`):** Fixed-tick turn-based engine handling input gestures, movement, combat actions, AI pathing, and cooldown updates.

---

## Seed Data & Character Vocations

### 1. Playable Vocations
The game supports 4 distinct playable vocations, each possessing unique stat growth per level and a 2.5x Native Class Mastery damage/healing multiplier when using aligned gear and abilities:

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

### 2. Procedural 20-Floor Dungeon & Biomes
Dungeons are procedurally generated on a $40 \times 40$ tile grid using a deterministic Mulberry32 PRNG seed generator (`floor-generator.js`), ensuring reproducible connectivity between player spawn at `(2,2)` and exit stairs at `(35,35)`. The 20 floors are grouped into 4 distinct biomes:

1. **Subterranean Crypt (Floors 1–5):** Introductory biome populated by Rats, Bats, and Skeleton Crawlers.
2. **Catacombs of Whispers (Floors 6–10):** Darker catacombs featuring Skeleton Archers, Shadow Fiends, and Goblins.
3. **Shadow Vaults (Floors 11–15):** Dangerous vaults containing Orc Warriors, Dark Mages, and Gargoyles.
4. **Abyssal Sanctum (Floors 16–20):** High-level sanctum with Abyssal Knights and Demons, culminating in the **Floor 20 Abyssal Overlord** boss fight (600 HP, 20 ATK, 6 DEF).

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

2. **Dynamic Line-of-Sight & Raycasted Fog of War:**
   - Calculates dynamic vision radii: Base FOV (10 tiles), Torch boost (14 tiles), and Light Spell activation (12 tiles).
   - Uses Bresenham line-casting to evaluate wall occlusion and illuminate visible tiles while keeping unexplored tiles shrouded in dark fog-of-war.

3. **Turn/Tick Simulation & Entity AI:**
   - 10 Hz simulation tick loop managing player inputs, monster aggro range checks, pathfinding toward the player, melee/ranged monster attacks, and status condition updates.

4. **Class-Based Combat & Skill Mechanics:**
   - Implements ranged spells (Wand Spark, Energy Beam), physical attacks (Bow Shot, Power Shot), and holy magic (Holy Strike, Healing Prayer).
   - Applies a 2.5x Native Class Mastery multiplier when matching class archetype with appropriate abilities and gear.

5. **Leveling, Progression & Fate Grant System:**
   - Player leveling up to Level 20 cap based on `level * 100` XP requirement.
   - On level-up, the **Fate Grant System** offers a 5-card draft selection of vocation-aligned skills, stat boosts, and items.

6. **Local Persistence via IndexedDB:**
   - Saves character attributes, equipped gear, action bar layout, backpack inventory, and floor progression across browser reloads.
