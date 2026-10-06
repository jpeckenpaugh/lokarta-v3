# Lokarta: Game Design Specification

A high-level design canon for *Lokarta: Come Into The Light*.

---

## 1. Core Game Loop

1. **Title & Save Slot Selection:** Choose from 5 persistent save slots stored in browser IndexedDB.
2. **Havenreach Town Hub:** Visit the town hub to access the Shop, Temple (full heal on defeat), or embark into the tower.
3. **5-Tier Tower Ascent:** Ascend through 5 deterministic procedural levels on a $40 \times 40$ tile grid.
4. **Gated Progression & Keys:** Defeat key holders in each tier to obtain Copper, Silver, and Gold keys to unlock gates leading to the ascent stairs.
5. **Combat & Tactical Abilities:** Real-time / 10 Hz simulation using vocation-specific abilities, cooldowns, and range mechanics.
6. **Fate Grants (Level-Up Draft):** On leveling up (up to Level 20), select from a 5-card draft offering vocation-aligned skills, stat upgrades, and rank-scaling gear (Ranks 1–5).
7. **The Spire Warden:** Defeat the final boss on Level 5 to achieve victory.

---

## 2. Playable Vocations & Archetypes

Class balance and distinct identity are enforced through **vocation-locked equipment** (`vocationAffinity` in `items.json`) and specific stat progression curves (`vocations.json`):

| Vocation | Role & Playstyle | Primary Weapon | Signature Mechanics & Golden Sets |
| :--- | :--- | :--- | :--- |
| **Magician** | Radiant arcane spellcaster & vision control | Wands & Scepters | High mana pool, Light spell vision expand (+3/+2/+1 decay), ranged projectile spells. |
| **Archer** | High mobility ranged marksman | Shortbows & Longbows | Arrow ammo management, *Grey Stalker* quiver regen/fill, piercing power shots. |
| **Fighter** | Melee juggernaut & frontline control | Broadswords & Greatswords | *Vanguard* set: Shield bash push + stun, wide sweeping cleaves, fortify defense. |
| **Paladin** | Holy warrior & radiant support | Warhammers & Maces | *Radiant Crusader* set: Holy strike bonus vs undead, healing prayer, mana-gated absorption bubble. |

---

## 3. The 5-Tier Tower Structure

The tower layout is catalog-driven via [`html/data/tower_levels.json`](../html/data/tower_levels.json):

* **Level 1 (Crypt):** Warm amber glow. Enemies: Giant Rats, Crypt Skeletons.
* **Level 2 (Catacombs):** Cyan glow. Enemies: Skeletons, Shadow Cultists.
* **Level 3 (Shadow Vaults):** Arcane purple glow. Enemies: Cultists, Elite Cultists.
* **Level 4 (Abyssal Sanctum):** Crimson glow. Enemies: Elite Cultists.
* **Level 5 (Crown Spire):** Deep infernal sanctum. Final boss: **The Spire Warden** (`abyssal_overlord`) with Spire Sentinels.

---

## 4. Systems & Invariants

* **Inventory Layout:** 10 Action Bar hotkey slots (`1`–`9`, `0`), 6 Backpack slots, and 4 Paperdoll equipment slots (`main_hand`, `off_hand`, `armor`, `relic`).
* **Death & Defeat:** Defeat in the tower descends the character by 1 floor and revives them at full health/mana in the Havenreach Town Temple.
* **Data-Driven Truth:** All balance stats, drop tables, room tiers, and costs are authored in `html/data/*.json`.
