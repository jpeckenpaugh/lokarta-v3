# Feature Specification: 05 — Inventory, Paperdoll Equipment, and Offline Storage

## 1. Overview & Purpose

The **Inventory, Paperdoll Equipment, and Offline Storage** feature governs item storage grids, hotbar quick-use slots, paperdoll equipment slots, item stacking constraints, and IndexedDB local offline persistence. It enables zero-backend character saving, floor state caching, and player settings storage directly in the browser.

---

## 2. Mapped Codebase Modules

- [html/engine.js](file:///Users/jarad/git/lokarta-v3/html/engine.js) — `InventorySystem`, item definitions (`health_potion`, `mana_potion`, `arrow`, weapons, armor, relics).
- [html/storage.js](file:///Users/jarad/git/lokarta-v3/html/storage.js) — `openStorage`, `read`, `put`, `getAll`, `clearStore`, `STORES` (`profile`, `characters`, `dungeon_floors`, `game_settings`).
- [html/game-worker.js](file:///Users/jarad/git/lokarta-v3/html/game-worker.js) — Persistence request handling (`handleSaveCharacter`, `handleBootstrap`, `handleLoadFloor`).

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 Inventory & Action Bar Layout
- **10-Slot Action Bar (Slots 0–9):** Hotbar mapped to keyboard keys `1`–`9` and `0` for instant activation of consumable potions or vocation skills.
- **6-Slot Backpack:** Extra inventory capacity for non-hotbar loot, spare equipment, and surplus supplies.
- **Item Drag & Drop / Swap:** Enables moving and swapping items between action bar slots and backpack slots.

### 3.2 4-Slot Paperdoll Equipment System
- **Equip Slots:**
  1. `main_hand`: Weapons (Wands, Longbows, Crossbows, Heavy Swords, Warhammers).
  2. `off_hand`: Shields, Quivers, or Off-hand relics.
  3. `armor`: Body armor (Robes, Leather Armor, Heavy Plate Armor).
  4. `relic`: Magical artifacts and divine charms boosting stats.
- **Stat Application:** Equipping or unequipping items dynamically modifies player Attack, Defense, Max HP, and Max MP attributes.

### 3.3 Stacking Rules & Limits
- **Consumable Potions:** Stack up to **9 items** per slot.
- **Arrows:** Stack up to **99 items** per slot.
- **Equipment & Relics:** Non-stackable (**1 item** per slot).

### 3.4 IndexedDB Local Persistence (`lokarta_browser_db`)
- **Zero-Backend Offline Storage:** Stores all game data locally using browser IndexedDB.
- **4 Dedicated Object Stores:**
  1. `profile`: Player settings, master sound toggle (`soundEnabled`), volume, creation timestamp.
  2. `characters`: Active character entity state (vocation, level, XP, stats, inventory, equipment, current floor).
  3. `dungeon_floors`: Cached floor-state objects (explored tiles, floor items, cleared monsters).
  4. `game_settings`: Key-value application configuration and user preferences.

---

## 4. Inputs, Outputs & State Data

- **Inputs:** Item objects, equipment slot targets, IndexedDB read/write requests, character state JSON.
- **Outputs:**
  - Persisted character record in `characters` store.
  - Cached floor layout in `dungeon_floors` store.
  - Updated inventory state (item count decrement on use, stack merge).
  - Recalculated player character stats based on paperdoll equipment.

---

## 5. Operational Constraints & Boundaries

- All IndexedDB transactions run asynchronously; operations wrap in Promises to avoid main-thread blocking.
- Attempting to add items to a full inventory (no open action bar or backpack slots) leaves the item on the floor and outputs a log message.
