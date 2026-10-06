# Feature Brief: 05 — Inventory, Paperdoll Equipment, and Offline Storage

## 1. Purpose

The **Inventory, Paperdoll Equipment, and Offline Storage** feature manages player item collection, action bar hotbar mapping, paperdoll equipment slot calculations, item stacking limits, and asynchronous zero-backend IndexedDB persistence.

---

## 2. Implemented Behavior

### 2.1 Inventory Layout & Action Bar Structure
- **10-Slot Action Bar (`action_bar`):** Hotbar array (slots 0–9 mapped to keys `1`–`9` and `0`) for instant consumable use or skill triggering (`CONFIG.ACTION_BAR_SLOTS = 10`).
- **6-Slot Backpack (`backpack`):** General storage array (slots 0–5) for extra loot and spare equipment (`CONFIG.BACKPACK_SLOTS = 6`).
- **Item Movement & Swapping:** `InventorySystem.swapItems` enables moving and swapping items between action bar and backpack slots.

### 2.2 4-Slot Paperdoll Equipment System
- **Equipped Slots (`paperdoll` object):**
  1. `main_hand`: Primary weapons (Wands, Longbows, Heavy Swords, Warhammers).
  2. `off_hand`: Secondary equipment (Shields, Quivers, Torches).
  3. `armor`: Body protection (Robes, Leather Armor, Heavy Plate Armor).
  4. `relic`: Magical accessories and charms.
- **Dynamic Stat Recalculation:** Equipping or unequipping items recalculates player stats (`InventorySystem.recalculateStats`), modifying total Attack, Defense, Max HP, and Max MP.

### 2.3 Stacking Rules & Limits
- **Consumable Potions & Torches:** `health_potion`, `mana_potion`, and `torch` stack up to **9 items** per slot.
- **Ammunition:** `arrows` stack up to **99 items** per slot.
- **Equipment & Relics:** Non-stackable (**1 item** per slot max).
- **Auto-Stacking & Floor Drops:** Pickup attempts first to merge with existing stacks; if action bar and backpack are full, items remain on floor with a log alert.

### 2.4 IndexedDB Local Storage (`lokarta_browser_db`)
- **Database Engine:** Pure browser IndexedDB (`DB_NAME = 'lokarta_browser_db'`) managed by `html/services/storage.js`.
- **4 Dedicated Object Stores (`STORES`):**
  1. `profile`: Keyed by `id` (`'player_profile'`). Stores audio volume, sound toggle (`soundEnabled`), and update timestamps.
  2. `characters`: Keyed by `id`. Stores character entity JSON (vocation, level, stats, inventory, equipment, current floor).
  3. `dungeon_floors`: Keyed by `floor_number`. Caches floor state objects (explored tiles, item locations, monster status).
  4. `game_settings`: Keyed by `key`. Stores application configuration key-value pairs.

---

## 3. Inputs & Outputs

- **Inputs:** Item objects (`item_id`, `name`, `type`, `quantity`, `stat_bonus`), slot indices, IndexedDB transaction requests.
- **Outputs:**
  - `action_bar`: `Array<ItemObject | null>` (length 10)
  - `backpack`: `Array<ItemObject | null>` (length 6)
  - `paperdoll`: `{ main_hand, off_hand, armor, relic }`
  - IndexedDB read/write Promise resolutions (`read`, `put`, `getAll`, `clearStore`).

---

## 4. User-Visible Experience

- **HUD Display:** Action bar displays 10 hotbar slots with item icons, hotkey badges (`1`–`0`), and stack count overlays (e.g. `x9`).
- **Paperdoll Interface:** Opening the inventory panel presents a paperdoll character silhouette with 4 equipment slots alongside the 6-slot backpack grid.
- **Offline Continuity:** Closing and reopening the browser restores exact character position, inventory, and floor exploration state seamlessly without a login server.

---

## 5. Constraints

- Action bar capacity is strictly fixed at 10 slots; backpack at 6 slots.
- Potions/Torches hard-cap stack at 9; Arrows hard-cap stack at 99.
- Storage calls are fully asynchronous and fail gracefully if IndexedDB is disabled in private browsing modes.

---

## 6. Acceptance Criteria

1. **Slot Capacity Enforcement:** Action bar strictly holds 10 slots; backpack strictly holds 6 slots (Verified in `html/tests/engine.test.mjs#L400-L408`).
2. **Potions/Torches Stack Limit (9):** Adding potions to a full stack caps quantity at 9 and overflows remaining to new slot (Verified in `html/tests/engine.test.mjs#L410-L422`).
3. **Arrows Stack Limit (99):** Arrows stack up to 99 items per slot (Verified in `html/tests/engine.test.mjs#L424-L432`).
4. **Paperdoll Stat Modification:** Equipping plate armor or sword dynamically increments defense or attack attributes (Verified in `html/tests/engine.test.mjs#L434-L446`).
5. **IndexedDB 4 Object Stores:** Opening `lokarta_browser_db` creates object stores `profile`, `characters`, `dungeon_floors`, and `game_settings` (Verified in `html/tests/engine.test.mjs#L500-L515`).
