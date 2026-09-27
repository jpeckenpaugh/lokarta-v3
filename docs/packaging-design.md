# Lokarta Packaging — UX + Visual Design Spec

**Issue:** LIV-13 · **Parent:** LIV-12 · **Owner:** Game Designer · **Audience:** CTO / Engineer (implementation), QA (verification)

This is an implementation-ready spec for the "packaging" pass. It is an **upgrade** of the
existing title / character-select / victory / game-over modals (`html/app/modal-manager.js`)
and single-save IndexedDB layer (`html/services/storage.js`), not a greenfield build.

Everything here is decidable: exact labels, timings, easings, option values, persistence keys,
storage schema, and test assertions. Where a choice is low-stakes it is called out as
**[default]**.

- **Constraints honored:** zero-backend, no bundler, native ES modules, static `html/` only,
  data-driven JSON catalogs, 60 FPS render loop + 10 Hz sim loop.
- **Bundler / backend compliance:** all new logic is native ESM imported from `html/index.html`
  or `html/app.js`. No npm packages, no build step, no network calls. New asset is a static
  `.svg` served by `run.sh`. All tunables live in `html/data/ui.json` (new **presentation**
  catalog) so they can be changed without touching logic.

---

## 0. Decisions at a glance

| # | Item | Decision |
| :-- | :-- | :-- |
| 1 | Studio splash | "Livive.net Studios" candle-in-arch lockup, 2300 ms default, any key/tap skips, reduced-motion variant 900 ms with no scale/glow. |
| 2 | Title menu | Full-screen title with **Emberfall Parallax** ambient canvas; menu = `NEW GAME`, `CONTINUE`, `OPTIONS`, `GUIDE & CONTROLS`. |
| 3 | Options | 8 persisted options in `game_settings/options`; apply immediately; `RESET TO DEFAULTS`; no music option (no music system exists). |
| 4 | Save slots | 5 fixed slots in new `save_slots` + `slot_floors` stores at `DB_VERSION = 2`; legacy single save migrates to **Slot 1**, non-destructively. |
| 5 | Transitions | Timed/whitelisted transition controller; **Retry** and **Continue** both restore the current floor's arrival state — Retry stays in-game, Continue returns to title. |
| 6 | Keyboard focus | One global, token-only `:focus-visible` ring (`--gold-accent`, 2px + 2px gap) on every interactive control; pointer-initiated focus renders no ring. See §10. |

New files: `html/app/splash-screen.js`, `html/app/title-ambient.js`,
`html/app/transition-controller.js`, `html/data/ui.json`, `html/assets/livive-studios-lockup.svg`,
`html/assets/livive-studios-mark.svg`, `html/tests/packaging.test.mjs`.

Touched files: `html/index.html`, `html/app.js`, `html/app/{app-controller,modal-manager,input-controller,canvas-renderer}.js`,
`html/services/storage.js`, `html/worker/{game-worker,game-client}.js`, `html/audio/audio-system.js`,
`html/data/{index.js,sounds.json}`, `html/styles/{base,hud,modals}.css`.

---

## 1. Studio splash

### 1.1 Concept

A **gothic pointed arch cradling a single candle flame**, gold on near-black, with the wordmark
`LIVIVE.NET` and `STUDIOS` beneath. Rationale: the studio marque states the game's own theme
("Come into the light"), it reads at 64 px and at full screen, it is single-color friendly, and it
uses only existing brand tokens (`--gold-accent #e5b95c`, `--bg-primary #0a0b10`,
`--border-highlight #4c5680`, `--text-muted #94a3b8`).

### 1.2 Assets (already committed in this issue)

| File | viewBox | Use |
| :-- | :-- | :-- |
| `html/assets/livive-studios-lockup.svg` | `0 0 640 400` | Splash lockup (emblem + wordmark). |
| `html/assets/livive-studios-mark.svg` | `0 0 128 128` | Compact emblem: small screens, transition watermark, favicon-scale. |

Both are self-contained (no scripts, no external refs, no embedded raster, no network fonts).
The wordmark uses `font-family="Cinzel, 'Trajan Pro', Georgia, serif"`. The splash **inlines**
the lockup into the DOM (see 1.5) so the page's Cinzel webfont applies; rendered standalone it
falls back to Georgia.

### 1.3 Timing (default, `reduceMotion` resolved **false**)

`t = 0` is the first painted frame after `DOMContentLoaded`. All values live in
`ui.json.splash`.

| Phase | t | Motion |
| :-- | :-- | :-- |
| Show | 0 → 400 ms | Lockup `opacity 0 → 1`, `transform scale(0.96) → scale(1)`. Backdrop is already `--bg-primary`. |
| Hold | 400 → 1900 ms | Fully visible; ember glow breathes via `filter: drop-shadow(0 0 18px var(--gold-glow))` at 2.4 s sine period. |
| Hide | 1900 → 2300 ms | Lockup `opacity 1 → 0` (400 ms), then `#splash-overlay` is removed from the DOM. |
| **Total** | **2300 ms** | |

Easings: show uses `cubic-bezier(0.2, 0, 0.2, 1)`; hide uses linear opacity.

### 1.4 Skip behavior

- Any `keydown`, `pointerdown`, or `touchstart` after **150 ms** (ignore a stray startup event)
  fast-forwards: fade out over **150 ms** from the current opacity, then remove.
- Input listeners are registered on `window` with `{ capture: true, once: true }` and removed on
  completion.
- Skip is **not** persisted; the splash plays on every full page load (parent criterion:
  "only app launch" — internal navigation never reloads, so it cannot repeat).

### 1.5 Reduced motion

Resolve reduced motion with the shared resolver in §3.4. If reduced:

- Lockup appears instantly (opacity 1, no scale), holds **900 ms** (`splash.reducedHoldMs`),
  fades out over 200 ms. No glow pulse.
- Skip still works after 150 ms.

### 1.6 Integration

- `html/index.html`: add `<div id="splash-overlay" class="splash-overlay" aria-label="Livive.net Studios" role="img">`
  as the last child of `#app`, after `#modal-overlay`. `z-index: 2000` (above modal `1000`).
- `html/app/splash-screen.js` (new): `export function showSplash(el, { reduceMotion }) → Promise<void>`.
  It `fetch('./assets/livive-studios-lockup.svg')`, sets `el.innerHTML = await res.text()`, and on
  failure falls back to `<img src="./assets/livive-studios-mark.svg" alt="Livive.net Studios">`.
  It dispatches `window.dispatchEvent(new Event('lokarta:splash-done'))` when finished.
- `html/app.js`: on `DOMContentLoaded`, call `showSplash(document.getElementById('splash-overlay'), ...)`.
- `html/app/app-controller.js`: `init()` runs the existing bootstrap **concurrently**, then
  `await splashDone` before `showTitleScreen(...)`. This overlaps the 2.3 s splash with worker +
  IndexedDB warm-up so the splash adds **zero** perceived load time. If the splash promise
  rejects, treat as done.
- `html/app/title-ambient.js` starts on `lokarta:splash-done` (or immediately if the splash is
  already past) so ambient frames are not spent behind the splash.

**Acceptance:** splash is the first visible screen; skippable after 150 ms; never repeats without a
full reload; no console errors if the SVG fetch fails (falls back to `<img>`).

---

## 2. Title menu

### 2.1 Layout (wireframe)

Full-screen title surface. `#title-ambient-canvas` fills the viewport behind a centered column.

```
┌──────────────────────────────────────────────────────────────┐
│ #title-ambient-canvas (Emberfall Parallax, aria-hidden)       │
│                                                              │
│                    ╭─ arch + candle ─╮                        │
│                    │  (mark 128px)   │                        │
│                    ╰────────────────╯                        │
│                        L O K A R T A                         │
│                   C O M E  I N T O  T H E  L I G H T          │
│                A Gothic Roguelike Dungeon Crawl              │
│                                                              │
│              ┌────────────────────────────────┐              │
│              │  NEW GAME                      │              │
│              │  CONTINUE                      │  ← disabled when no save
│              │  OPTIONS                       │              │
│              │  GUIDE & CONTROLS              │              │
│              └────────────────────────────────┘              │
│                                                              │
│           v2.4 · 5 Save Slots · Fate Grant Draft             │
└──────────────────────────────────────────────────────────────┘
```

Title card: `width 520px`, `max-width 90vw`, `radial-gradient(circle at center, #151824, #08090f)`,
`2px solid var(--gold-accent)`, `border-radius 10px` (reuse `.title-screen-modal`).

### 2.2 Menu items and states

| Order | Label | Action | Enabled |
| :-- | :-- | :-- | :-- |
| 1 | `NEW GAME` | Slot Select (create) §4 | always |
| 2 | `CONTINUE` | Slot Select (load) §4 | only if ≥1 occupied slot |
| 3 | `OPTIONS` | Options modal §3 | always |
| 4 | `GUIDE & CONTROLS` | Guide modal (existing) | always |

Row states: `default`, `selected` (keyboard focus / hover), `disabled`, `busy`.

- On show, focus the first **enabled** row (usually `NEW GAME`; if a save exists, `CONTINUE` is
  focused first). Selection is the visual focus ring plus a `▸` caret and the gold hover style
  already in `.title-btn:hover`.
- `CONTINUE` disabled: `aria-disabled="true"`, `cursor: not-allowed`, opacity `0.5`, no sound on
  activation.
- Row min height **48 px** (touch target ≥ 44 px, Fitts's Law). Rows are full-width.

### 2.3 Navigation

| Input | Behavior |
| :-- | :-- |
| `ArrowUp` / `ArrowDown`, `W` / `S` | Move selection, wrap-around. |
| `Enter` / `Space` | Activate selected row. |
| `Escape` | If a submenu is open → back to title; on title → no-op. |
| Mouse | Hover sets selection; click activates. |
| Touch | Tap activates. |
| `Tab` | Native focus traversal (rows are `<button>`s in DOM order). |

Audio cues: moving selection plays `uiMove` at volume scale `0.5`; activating plays `click`;
`Escape`/back plays `uiBack`. Both new sounds are defined in §6.

### 2.4 Ambient background — "Emberfall Parallax"

An evocative, low-cost canvas loop that *mimics* gameplay without simulating it.

Three composited layers drawn into `#title-ambient-canvas` (`aria-hidden="true"`):

1. **Vault parallax** — two horizontal bands of dungeon silhouettes (wall/floor/torch/door
   rectangles colored from `TILE_THEMES_CATALOG`) drifting at **4 px/s** (far) and **10 px/s**
   (near), with a ±12 px vertical sine bob at 0.12 Hz.
2. **Torch pools** — two `createRadialGradient` light pools anchored at 18% and 82% width, radius
   pulsing 180 → 220 px at 0.7 Hz, tinted `--gold-glow` and `--xp-gold-glow`.
3. **Embers** — **36** particles (radius 1–2.5 px) rising 12–28 px/s with a 0.15 px/frame
   horizontal sine sway, alpha fading in/out over 4–7 s, wrapping at the top edge.

**Cost budget:** ≤ **2.0 ms/frame** CPU on a 4-year-old mid-tier laptop at 1920×1080; ≤ **250**
canvas draw ops/frame; canvas backing store DPR capped at **1.5**; fixed **30 FPS** via
`requestAnimationFrame` + accumulator (skip a frame when elapsed < 33 ms). Pause when
`document.hidden`. Stop entirely when the title surface is not active (start on
`lokarta:splash-done`, stop when leaving the title).

**Reduced motion:** draw exactly **one** static frame (parallax at t = 0, torch pools at mid
pulse, embers at fixed seeded positions) and schedule **no** rAF. The overlay also gets
`html.reduced-motion` (§5.5) so the CSS torch flicker is frozen. `ui.json` carries the effect
knobs (`titleAmbient.particleCount = 36`, `targetFps = 30`, drift/bob constants).

**Integration:** `html/app/title-ambient.js` (new) exports
`TitleAmbient.start(canvas, { reduceMotion, theme })` and `TitleAmbient.stop()`;
`ModalManager.showTitleScreen` starts it, and every navigation away stops it.

**Acceptance:** all 4 actions reachable by keyboard and pointer; `CONTINUE` disabled/styled with no
saves; ambient pauses under reduced motion; title surface holds ~60 FPS with ambient active
(ambient itself capped at 30 FPS).

---

## 3. Options menu

A modal (`options-modal`) with a vertically scrolling list of rows. Every row is
`[label] [control] [value]`. Changes apply **immediately** (no Save button) and persist.

### 3.1 Final option list

| # | Key | Label | Type | Range / Values | Default | Effect |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | `soundEffects` | Sound Effects | toggle | `true`/`false` | `true` | `soundFX.setEnabled()` |
| 2 | `sfxVolume` | Sound Volume | slider | int 0–100 step 5 | `70` | master gain `= 0.5 × (v/100)` (max 0.5) |
| 3 | `reduceMotion` | Reduce Motion | segmented | `system` \| `on` \| `off` | `system` | all animation, ambient, transitions |
| 4 | `uiScale` | UI Scale | segmented | `small` 0.85 \| `normal` 1.0 \| `large` 1.15 \| `xlarge` 1.3 | `normal` | `--ui-scale` on `:root` |
| 5 | `pixelScale` | Pixel Zoom | segmented | `auto` \| `1x` \| `2x` \| `3x` | `auto` | `CanvasRenderer` tile px: `auto`→64, `1x`→32, `2x`→64, `3x`→96 |
| 6 | `fullscreen` | Fullscreen | toggle | `true`/`false` | `false` | Fullscreen API |
| 7 | `damageNumbers` | Damage Numbers | toggle | `true`/`false` | `true` | gates `addFloatingText` combat numbers |
| 8 | `showFps` | Frame Rate Counter | toggle | `true`/`false` | `false` | small FPS readout (supports the §2.4 budget check) |

**Music: omitted.** There is no music/ambient-loop system (`sounds.json` is 19 one-shot SFX), so a
Music toggle would be a dead control. Note this explicitly rather than shipping a no-op. [default]

Footer actions: `SAVE DATA` (opens Slot Select in manage mode §4), `RESET TO DEFAULTS` (confirm),
`BACK`.

### 3.2 Persistence

- Store: existing `game_settings` object store, key **`options`**, value
  `{ version: 1, options: { ... }, updatedAt: ISO-8601 }`.
- Read merges over `ui.json.options.defaults`: unknown keys dropped, out-of-range numbers clamped,
  invalid enums fall back to default, missing keys filled. Read never throws.
- Write mirrors `soundEffects` into the legacy `profile.soundEnabled` **and**
  `localStorage['lokarta_audio_muted']` so the `AudioSystem` constructor honors the choice before
  bootstrap completes.
- `RESET TO DEFAULTS` confirm: title `RESET OPTIONS?`, body `All options return to their default
  values. Save slots are not affected.`, confirm `RESET`, cancel `CANCEL`, safe default focus on
  `CANCEL`. It writes §3.1 defaults and leaves save data untouched.

### 3.3 Fullscreen and scale behavior

- `fullscreen`: on toggle call `document.documentElement.requestFullscreen()` /
  `document.exitFullscreen()`; subscribe to `fullscreenchange` so the toggle reflects real state
  (Esc/OS exit included). Persist the preference, but on load **do not** auto-enter fullscreen —
  browsers require a user gesture. [default]
- `uiScale`: set `document.documentElement.style.setProperty('--ui-scale', String(scale))`.
  `rem`-based HUD/modal type multiplies by `var(--ui-scale)`; the canvas is untouched so pixels
  stay crisp.
- `pixelScale`: `CanvasRenderer.setZoom(px)` sets the tile size used for draw and camera math
  (`auto` = 64 px, current behavior). Nearest-neighbor rendering already sets
  `imageSmoothingEnabled = false`, so integer scales stay crisp.

### 3.4 Reduced-motion resolver (shared)

```js
export function resolveReducedMotion(setting, systemPrefersReduced) {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return !!systemPrefersReduced; // 'system'
}
```

When `reduceMotion === 'system'`, listen to `matchMedia('(prefers-reduced-motion: reduce)')` and
re-resolve on `change`. The resolved boolean drives the splash, title ambient, and transition
controller.

**Acceptance:** every option changes behavior and survives reload; reset works; invalid/missing
settings fall back to defaults; fullscreen reflects real state.

---

## 4. Five save slots

### 4.1 Entry points

| From | Mode | Screen |
| :-- | :-- | :-- |
| Title → `NEW GAME` | create | Slot Select (choose a slot for a new run) |
| Title → `CONTINUE` | load | Slot Select (focused on last-played slot) |
| Options → `SAVE DATA` | manage | Slot Select (load / overwrite / delete) |

Screen header: `SELECT A SAVE SLOT` (create/load) or `SAVE DATA` (manage).
Subtitles: create `Choose a slot for your new expedition.` · load `Choose an expedition to
continue.` · manage `Load, overwrite, or delete a save.` Footer: `BACK`.

### 4.2 Slot card

Five stacked `slot-card` rows. Card content:

```
┌───────────────────────────────────────────────────────────────┐
│ [SLOT 1]  ▣   MAGICIAN — Level 4                 [ LOAD ]     │
│          48px Floor 3/20 · Subterranean Crypt    [ DELETE ]   │
│               Played 1h 24m · Last played Sep 27, 2026 02:14  │
└───────────────────────────────────────────────────────────────┘
```

- Slot badge: `SLOT {n}`, `--font-mono`.
- Thumbnail: **56×56** canvas rendering the vocation's idle sprite via
  `SpriteRenderer.drawActor` (crisp, data-driven). Fallback: vocation OpenMoji icon.
- Vocation + level: `MAGICIAN — Level 4`.
- Floor + biome: `Floor 3/20 · Subterranean Crypt`.
- Playtime + timestamp: `Played 1h 24m · Last played Sep 27, 2026 02:14`. If playtime < 1 min,
  show `New`.
- `LAST PLAYED` ribbon (Von Restorff) on the most recently played occupied card.
- Actions: load mode `[LOAD] [DELETE]`; create/manage `[OVERWRITE] [DELETE]`.
- Empty card: dashed `--border-color`, centered `EMPTY — NEW GAME` button in create mode; in
  load mode empty cards are `disabled` and labeled `EMPTY`.
- Corrupt/unknown record: `SLOT {n} — DATA UNAVAILABLE` with `[DELETE]` only.

Card states: `empty`, `occupied`, `selected`, `disabled`, `busy` (spinner; all buttons disabled).

### 4.3 Flows

- **Create:** choose slot → empty: Character Select → `createSlot(slotIndex, vocation)` →
  gameplay transition. Occupied: `OVERWRITE` → confirm → Character Select → create.
- **Load:** choose occupied slot → `loadSlot(slotIndex)` → gameplay transition. Empty slots are
  disabled in load mode.
- **Overwrite (manage):** confirm (same copy as create-overwrite) → Character Select → create into
  that slot.
- **Delete:** confirm → `deleteSlot(slotIndex)` → card returns to `empty`.
- **Busy/failure:** card shows `loading…`, buttons disabled; on worker error show inline
  `Could not load Slot {n}. Try again.` and keep the screen usable.

### 4.4 Exact copy

| Context | Text |
| :-- | :-- |
| Create header | `SELECT A SAVE SLOT` |
| Manage header | `SAVE DATA` |
| Empty slot action | `NEW GAME` |
| Occupied actions | `LOAD` · `OVERWRITE` · `DELETE` |
| Delete confirm title | `DELETE SLOT {n}?` |
| Overwrite confirm title | `OVERWRITE SLOT {n}?` |
| Confirm body (both) | `This permanently deletes {SUMMARY}. This cannot be undone.` |
| Confirm buttons | `DELETE` / `OVERWRITE` (danger, `--hp-red`) · `CANCEL` |
| Summary format | `{VOCATION} — Level {level}, Floor {floor}` (e.g. `MAGICIAN — Level 4, Floor 3`) |
| Worker failure | `Could not load Slot {n}. Try again.` |

All destructive confirms default focus to `CANCEL`; `Escape` cancels (error prevention).

### 4.5 Storage schema (`DB_VERSION 1 → 2`)

New stores created in `onupgradeneeded`; **legacy stores are left intact**:

| Store | keyPath | Record |
| :-- | :-- | :-- |
| `save_slots` | `id` | `{ id: 'slot_1'..'slot_5', slotIndex, status: 'empty'\|'occupied', characterId, name, vocation, level, currentFloor, biome, playtimeMs, floorEntry, createdAt, updatedAt, lastPlayedAt }` |
| `characters` | `id` | unchanged; character keyed by `characterId` (e.g. `char_slot_1`) |
| `slot_floors` | `['slotIndex','floor_number']` | per-slot floor cache (same shape as legacy floors) |
| `dungeon_floors` | `floor_number` | legacy, read-only after migration |
| `game_settings` | `key` | adds `options`, `migration_slot_v2`, `last_played_slot` |
| `profile` | `id` | unchanged |

Helpers (pure, unit-testable): `slotId(n) → 'slot_' + n`, `slotFloorKey(n, floor) → [n, floor]`,
`deriveSlotMeta(player) → slot metadata`.

`floorEntry` is the player snapshot written at slot create, slot load, and every `advanceFloor`
(before the floor's own progress). It stores `{ hp, max_hp, mana, max_mana, x, y, current_floor,
level, xp, action_bar, backpack, paperdoll, skillBoosts }` (deep clone). It is what Retry/Continue
restore (§5.4).

### 4.6 Migration rule (existing single save → Slot 1)

Guarded and **non-destructive**:

1. Bump `DB_VERSION` to `2`; create `save_slots` + `slot_floors`; leave `characters` /
   `dungeon_floors` untouched.
2. After open, run `migrateLegacySave()` if `game_settings/migration_slot_v2` is absent.
3. Read legacy `characters`. If empty → write guard `{ done: true, migratedAt, fromCharacterId: null }`
   and stop (all slots empty).
4. Else pick the most recently updated character (same comparator as today's `handleBootstrap`),
   assign `player.slotId = 'slot_1'` / `player.slotIndex = 1`, write it back, write
   `save_slots/slot_1 = deriveSlotMeta(player)`, and copy every legacy `dungeon_floors` row into
   `slot_floors` keyed `[1, floor_number]`.
5. Write guard `{ done: true, migratedAt, fromCharacterId }`.
6. **Idempotent recovery:** if the guard is missing but `save_slots/slot_1` already exists, treat
   migration as complete and only write the guard.
7. **Failure fallback:** if migration throws, log, show the title with all slots empty, and leave
   legacy stores untouched. `deleteSlot` never touches legacy stores.

The guard makes reruns safe and preserves the legacy data for rollback.

### 4.7 Worker RPC surface

New / changed commands (`game-worker.js` + `game-client.js`):

| Command | Payload | Returns |
| :-- | :-- | :-- |
| `bootstrap` | — | `{ slots, options, lastPlayedSlotIndex }` (no implicit `player`) |
| `listSlots` | — | `{ slots: SlotMeta[5] }` |
| `createSlot` | `{ slotIndex, vocation }` | `{ player, floor, slot }` |
| `loadSlot` | `{ slotIndex }` | `{ player, floor, slot }` |
| `deleteSlot` | `{ slotIndex }` | `{ success }` |
| `restartFloor` | `{ slotIndex }` | `{ player, floor }` (restores `floorEntry`) |
| `saveCharacter` | `{ player }` | slot-aware via `player.slotId`; also updates `lastPlayedAt` / `playtimeMs` |
| `advanceFloor` | `{ player, nextFloorNumber }` | slot-aware; writes `floorEntry` + `slot_floors` |
| `getFloor` | `{ floorNumber, slotIndex, forceRegenerate }` | slot-scoped floor |
| `getOptions` / `setOptions` / `resetOptions` | `{ patch? }` | `{ options }` |

`setSoundEnabled` is superseded by `setOptions({ soundEffects })` but kept as a thin alias.

### 4.8 Playtime

Add `playtimeMs` to the player; increment by `CONFIG.TICK_INTERVAL_MS` inside `tick()` while
running, flush on save/floor-advance. Slot card formats `Xh Ym` (or `New` under 60 s).

**Acceptance:** 5 slots independently create/save/load/delete; migration works from a pre-v2
profile with zero data loss; corrupted/absent slot handled gracefully.

---

## 5. Transitions

### 5.1 Transition controller

`html/app/transition-controller.js` (new):

- Overlay `#screen-transition` (fixed, `z-index 1500`) used for fades and wipes.
- `transition(kind) → Promise<void>` resolves when the incoming screen is interactive.
- Every transition runs inside `try/finally`; the lock releases in `finally` **and** via a hard
  timeout of `duration + 400 ms`, so a dropped rAF can never trap input.
- Sets `document.documentElement.classList.add('input-locked')` and increments
  `app.inputLockCount`; `InputController`, title nav, and modal buttons all early-return while
  locked.

### 5.2 Choreography

| From → To | Effect | Duration | Easing | Reduced motion |
| :-- | :-- | :-- | :-- | :-- |
| splash → title | Logo fade out; backdrop crossfade into ambient canvas | 400 ms | `cubic-bezier(0.4,0,0.2,1)` | instant + 120 ms fade |
| title → character select | Card fades down/out; 90 ms black flash | 260 ms | `cubic-bezier(0.4,0,0.2,1)` | 90 ms opacity only |
| title / continue → gameplay | Letterbox: black bars close 120 ms, swap, bars open 180 ms; ambient stops | 300 ms | `ease-in-out` | instant |
| character select → gameplay | Gold light wipe L→R over a black flash | 380 ms | `cubic-bezier(0.65,0,0.35,1)` | instant |
| floor advance | "Descend" vertical wipe: black from bottom 180 ms, swap floor, reveal from top 220 ms; floor label burn-in 700 ms | 400 ms + label | `ease-in-out` | instant + static label 500 ms |
| level up (fate grant) | Card grid scale-in, `scale(0.96) → 1` | 140 ms | `cubic-bezier(0.2,0,0.2,1)` | instant |
| game over → Retry | Black flash 120 ms, restore snapshot, fade in 220 ms | 340 ms | `ease-out` | instant |
| game over → Continue | Fade to title | 260 ms | `ease-in-out` | instant |
| victory → title | Fade + compact mark watermark | 400 ms | `ease-in-out` | instant |

No hard cuts; every transition resolves to a stable interactive state.

### 5.3 Input-lock and skip rules

- All transitions lock input for their duration (release guaranteed as in 5.1).
- **Skippable:** splash, title→character, title→gameplay, character-select→gameplay, game-over
  fades, victory. Any key/pointer fast-forwards to the end and resolves immediately.
- **Not skippable:** floor advance and game-over→Retry (both are short, < 450 ms, and cover state
  swaps; skipping risks desync). They still release via the hard timeout.
- Under reduced motion all transitions are instant (≤ 120 ms), so a skip is a no-op.

### 5.4 Retry vs Continue (exact semantics + copy)

On death: freeze the sim, play the death cue, **write the slot's `floorEntry` snapshot back as the
saved character** (never persist HP 0), then show `GAME OVER`. Death costs the current floor
attempt.

- **RETRY** — restore `floorEntry`, reload the cached floor for `current_floor` unchanged
  (`getFloor(..., forceRegenerate: false)`), stay in the dungeon, resume the loop.
- **CONTINUE** — return to the title screen. The slot now resumes at the same floor-entry state
  (because the snapshot was written back), so `CONTINUE` on the title resumes this floor.

Both options restart the current floor from arrival; the only difference is immediacy. Exact copy:

```
YOU HAVE PERISHED
Floor {n}/20 claims another soul.
[ RETRY FLOOR {n} ]   [ CONTINUE ]
Both options restart Floor {n} from your arrival.
Retry stays in the dungeon; Continue returns to the title screen.
```

Rationale: the old modal's single `Try Again` reloaded and silently resumed the latest autosave,
which was indistinguishable from Continue and could resume at 1 HP mid-floor. Splitting makes the
cost of death explicit and prevents accidental reloads.

**Victory copy** (replaces `Play Again`):

```
ULTIMATE VICTORY
All 20 floors cleared. Lokarta is lit.
[ NEW GAME ]   [ RETURN TO TITLE ]
```

plus the existing stats block (vocation, final level, damage boost, HP/MP).

### 5.5 Reduced-motion global CSS

Add to `base.css`:

```css
html.reduced-motion * ,
html.reduced-motion *::before,
html.reduced-motion *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}
```

Opacity transitions are made instantaneous, not removed, so screens still swap cleanly. The class
is toggled whenever the resolver (§3.4) changes.

### 5.6 Floor-advance correctness (required fix)

Today `handleFloorClear()` awaits `advanceFloor` while the player still stands on the stairs,
so the next 10 Hz tick can re-enter it. Required: set `this.isFloorCleared = true` and
`this.isPaused = true` **before** the await, run the desk wipe, then `applyDungeonData` and clear
the flags in `finally`. **Acceptance:** a floor advance shows one transition and never double-fires.

---

## 6. Catalog additions

### 6.1 `html/data/ui.json` (new presentation catalog)

Exported from `html/data/index.js` as `UI_CATALOG`. Presentation-only; no gameplay rules.

```json
{
  "splash": { "showMs": 400, "holdMs": 1500, "hideMs": 400, "reducedHoldMs": 900, "skipAfterMs": 150, "skipFadeMs": 150 },
  "transitions": {
    "splashToTitle":   { "ms": 400, "easing": "cubic-bezier(0.4,0,0.2,1)", "skippable": true },
    "titleToSelect":   { "ms": 260, "easing": "cubic-bezier(0.4,0,0.2,1)", "skippable": true },
    "selectToGame":    { "ms": 380, "easing": "cubic-bezier(0.65,0,0.35,1)", "skippable": true },
    "floorAdvance":    { "ms": 400, "easing": "ease-in-out", "skippable": false },
    "gameOverToRetry": { "ms": 340, "easing": "ease-out", "skippable": false },
    "toTitle":         { "ms": 400, "easing": "ease-in-out", "skippable": true }
  },
  "titleAmbient": { "targetFps": 30, "particleCount": 36, "parallaxFarPxPerSec": 4, "parallaxNearPxPerSec": 10, "torchPulseHz": 0.7, "maxDpr": 1.5 },
  "saveSlots": { "count": 5 },
  "options": {
    "defaults": {
      "soundEffects": true,
      "sfxVolume": 70,
      "reduceMotion": "system",
      "uiScale": "normal",
      "pixelScale": "auto",
      "fullscreen": false,
      "damageNumbers": true,
      "showFps": false
    },
    "ranges": {
      "sfxVolume": { "min": 0, "max": 100, "step": 5 },
      "uiScale": { "small": 0.85, "normal": 1.0, "large": 1.15, "xlarge": 1.3 },
      "pixelScale": { "auto": 64, "1x": 32, "2x": 64, "3x": 96 }
    }
  }
}
```

### 6.2 `html/data/sounds.json` (add 2, 19 → 21)

```json
{
  "uiMove": { "type": "sweep", "oscType": "triangle", "startFreq": 520, "endFreq": 620, "duration": 0.04, "gain": 0.08 },
  "uiBack": { "type": "sweep", "oscType": "triangle", "startFreq": 420, "endFreq": 260, "duration": 0.07, "gain": 0.10 }
}
```

**Test sync required:** `html/tests/audio.test.mjs` and `html/tests/data-catalogs.test.mjs`
assert `Object.keys(soundsJson).length === 19` — update both to `21` and extend the required-key
lists with `uiMove`, `uiBack`.

---

## 7. Integration points (file-by-file)

| File | Change |
| :-- | :-- |
| `html/index.html` | Add `#splash-overlay`, `#title-ambient-canvas` target/container, `#screen-transition`; keep `#modal-overlay`. |
| `html/app.js` | Boot order: `showSplash()` + construct `LokartaApp()` concurrently; native ESM import only. |
| `html/app/splash-screen.js` *(new)* | Splash lifecycle, skip, reduced-motion, `lokarta:splash-done`. |
| `html/app/title-ambient.js` *(new)* | Emberfall Parallax start/stop + static reduced-motion frame. |
| `html/app/transition-controller.js` *(new)* | Fade/wipe transitions, input lock, hard timeout, skippability. |
| `html/app/modal-manager.js` | Rewrite `showTitleScreen`; add `showOptionsModal`, `showSlotSelectModal`, `showConfirmModal`; update `showGameOverModal`, `showVictoryModal`; start/stop ambient. |
| `html/app/app-controller.js` | Slot-aware start/load, playtime, `floorEntry` writes, transition hooks, `inputLockCount`, options apply, pause menu (`Esc` → Resume/Options/Guide/Return to Title). |
| `html/app/input-controller.js` | Respect `inputLockCount`; title keyboard nav hook. |
| `html/app/canvas-renderer.js` | `setZoom(px)` for `pixelScale`. |
| `html/services/storage.js` | `DB_VERSION = 2`; `save_slots` + `slot_floors`; migration helper + pure helpers. |
| `html/worker/game-worker.js` | New/changed RPC commands (§4.7), migration, `floorEntry`, playtime. |
| `html/worker/game-client.js` | Typed wrappers for the new commands. |
| `html/audio/audio-system.js` | `setVolume(v)`; master gain `= 0.5 × v/100`. |
| `html/data/ui.json` *(new)* + `html/data/index.js` | Presentation catalog + barrel export `UI_CATALOG`. |
| `html/data/sounds.json` | Add `uiMove`, `uiBack`. |
| `html/styles/base.css` | `--ui-scale` token, `html.reduced-motion` block, splash/transition base styles, `--focus-*` tokens + global `:focus-visible` ring (§10). |
| `html/styles/modals.css` | Title/options/slot-select/confirm components, card states. |
| `html/styles/hud.css` | `calc()`-based scaling for `--ui-scale`. |
| `html/assets/livive-studios-{lockup,mark}.svg` | New logo assets. |
| `html/tests/packaging.test.mjs` *(new)* | Assertions in §8. |
| `docs/*`, `README.md` | Note the catalog count is now **12** (11 gameplay + `ui.json`). |

---

## 8. Verification

### 8.1 Native test suite (must stay green; baseline 104 tests)

`node --test html/tests/*.test.mjs`

New `html/tests/packaging.test.mjs`:

1. `ui.json` has `splash`, `transitions`, `titleAmbient`, `saveSlots`, `options`; `saveSlots.count === 5`;
   `options.defaults` matches §3.1 exactly.
2. `sounds.json` has 21 entries including `uiMove` and `uiBack`, each with a valid `type`.
3. Pure slot helpers: `slotId(3) === 'slot_3'`, `slotFloorKey(3, 7)` deep-equals `[3, 7]`,
   `deriveSlotMeta(player)` summary renders `MAGICIAN — Level 4, Floor 3`.
4. `normalizeOptions({ sfxVolume: 999, reduceMotion: 'wat', bogus: 1 })` clamps volume to 100,
   falls back `reduceMotion` to `system`, drops `bogus`, fills all defaults.
5. `resolveReducedMotion('on', false) === true`, `('off', true) === false`,
   `('system', true) === true`.
6. Pure `planLegacyMigration(legacyCharacters, legacyFloors)` returns the exact writes:
   one `save_slots/slot_1`, one character with `slotId 'slot_1'`, one `slot_floors/[1,n]` per legacy
   floor, and a `migration_slot_v2` guard; empty input yields only the guard; rerunning with the
   guard is a no-op.

Update existing: `audio.test.mjs` and `data-catalogs.test.mjs` sound counts 19 → 21;
`data-catalogs.test.mjs` add `UI_CATALOG` assertions; `app-modules.test.mjs` assert the new
`ModalManager` methods exist.

### 8.2 Browser QA checklist (QA stage on `main`)

Splash timing + skip + reduced; title nav with keyboard/mouse/touch; `CONTINUE` disabled with no
save; each option applies immediately and survives reload; reset-to-defaults; fullscreen reflects
Esc; create/load/overwrite/delete across all 5 slots; migrate a pre-v2 profile into Slot 1 with no
data loss; every transition incl. floor advance, death → Retry and → Continue, and victory; no
input traps; title + gameplay hold ~60 FPS; ambient pauses under reduced motion; no console errors
with the SVG fetch blocked (fallback path).

### 8.3 Compliance

- **No bundler:** all new modules are native ESM with explicit extensions; `ui.json` is a static
  JSON import through the existing `data/index.js` barrel.
- **Zero backend:** assets are static files served by `run.sh`; no fetches outside same-origin
  static paths.
- **Data-driven:** timings, option defaults/ranges, ambient budget, and slot count live in
  `ui.json`; new UI sounds live in `sounds.json`.

---

## 9. Risks and mitigations

| Risk | Mitigation |
| :-- | :-- |
| Ambient effect hurts low-end/mobile FPS | Hard budget (≤2 ms/frame, ≤250 ops, DPR ≤1.5, 30 FPS cap), reduced-motion static frame, `showFps` option to verify. |
| Save migration corrupts/loses data | New stores, legacy stores untouched, guarded + idempotent migration, pure planner unit test, `DELETE` never touches legacy. |
| Transition input traps | `try/finally` release + `duration + 400 ms` hard timeout; non-skippable transitions are <450 ms. |
| Floor advance double-fires | Set `isFloorCleared`/`isPaused` before the await; clear in `finally` (§5.6). |
| Adding sounds breaks count assertions | Explicitly bump 19 → 21 in both test files (§6.2). |
| Logo font mismatch standalone vs inlined | Splash inlines the SVG so Cinzel applies; declares a Georgia serif fallback. |
| Death resumes at low HP | Death writes the `floorEntry` snapshot, never HP 0 (§5.4). |

---

## 10. Keyboard focus treatment (`:focus-visible`)

**Origin:** non-blocking [LIV-21](/LIV/issues/LIV-21) observation on [LIV-20](/LIV/issues/LIV-20).
`html/styles/*.css` defined no app-level focus style, so keyboard users only saw the Chromium UA
ring — and a pointer-opened destructive confirm, whose programmatic `.focus()` lands on
`#confirm-cancel`, rendered no ring at all. This section is the design decision; implementation is
delegated to the Engineer.

### 10.1 Decision

| # | Question | Decision |
| :-- | :-- | :-- |
| 1 | Keyboard indicator | **One global, on-brand ring** on every interactive control via `:focus-visible`. |
| 2 | Ring skin | `var(--focus-ring-width)` solid `var(--focus-ring-color)` (aliases `--gold-accent`) with a `var(--focus-ring-offset)` gap. |
| 3 | Pointer-opened dialogs | **No ring.** Keep LIV-20's invisible `#confirm-cancel` default focus; the ring appears only once the user interacts by keyboard. |
| 4 | Token rule | Values live in the `:root` token layer; the component rule references only `var(--focus-*)`. |

### 10.2 Tokens — add to `html/styles/base.css` `:root`

```css
  /* Keyboard focus indicator (packaging-design.md §10) */
  --focus-ring-color: var(--gold-accent);
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
```

- `--focus-ring-color` aliases an existing brand token; **no new color is introduced**.
- Width and offset are deliberately fixed **px**, not `rem`: `html { font-size: calc(16px * var(--ui-scale)) }`
  would shrink a rem-based ring to ~1.7 px at `uiScale: small`, below the 2 px WCAG 2.4.13 floor. A
  fixed 2 px ring stays compliant at every UI scale. Defining the numbers once in the token layer
  keeps the component rule free of raw values.

### 10.3 Rule — add to `html/styles/base.css` (after the `html.input-locked` block)

```css
/* Keyboard focus indicator. :focus-visible is the modality heuristic: it matches
   keyboard and assistive-tech focus, and stays off for the programmatic .focus()
   a pointer click performs (showConfirmModal's #confirm-cancel safe default).
   outline (not box-shadow) so the ring composes with the existing hover glows. */
:where(button, [role='button'], a[href], input, select, textarea, summary, [tabindex]:not([tabindex='-1'])):focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

### 10.4 Why this works (evidence)

- **Color-independent** (WCAG 1.4.1): the only difference the ring makes is shape — a 2 px ring
  separated from the control by a 2 px gap. It reads in a monochrome or color-blind rendering.
- **Contrast** (WCAG 1.4.11 / 2.4.13): `--gold-accent` `#e5b95c` is **9.7:1** against the modal
  panel `#141722` and higher against the darker card surfaces. The 2 px offset puts the ring's inner
  edge over the dark panel rather than over the control's own border, so it stays legible on the gold
  `.action-btn`, the red `.action-btn.danger`, and the blue `.title-btn.continue-btn` skins.
- **Composes with state styles**: `outline` is independent of the `box-shadow` glows used by
  `.title-btn:hover`, `.action-btn:hover`, and `.fate-card.selected`, so focus never erases a hover
  glow and a hover never hides the ring.
- **Low specificity**: `:where()` keeps the selector at specificity 0, so a future component style
  can override it without `!important`.
- **Motion-safe**: a static outline, no transition — unaffected by `html.reduced-motion`.

### 10.5 Covered controls

`button` covers every built-in control: `.title-btn`, `.action-btn` (including `.danger`),
`.select-btn`, `.confirm-draft-btn`, `.option-toggle`, `.option-seg`, `.header-btn`, `.audio-btn`,
`.touch-btn`, `#confirm-cancel`, and `#confirm-ok`. `input` covers `.option-slider`.
`[role='button']` / `[tabindex]` future-proof custom controls.

### 10.6 Pointer-opened dialogs — decision and rationale

**No forced ring.** Rationale:

1. `:focus-visible` is exactly the right mechanism. Chromium and Firefox do not match it for a
   `.focus()` call that follows a pointer gesture, so mouse users get no ring — which is correct:
   the pointer user can already see the button they clicked, and a ring would falsely signal
   "keyboard mode".
2. LIV-20's safe default (focus `#confirm-cancel` so a reflexive `Enter` cancels) is an
   error-prevention measure for keyboard users. For a pointer user it is invisible and harmless; it
   must not become a visible "selected" state that would make `Enter`-to-cancel look like an active
   choice.
3. Any later keyboard interaction switches modality: the next `Tab`/`Shift+Tab` moves focus and the
   ring appears on the newly focused control.

Considered and rejected: styling plain `:focus` (would ring every mouse click and programmatic
focus), and giving the confirm dialog a visible default-action highlight (would compete with the
danger styling and imply `Enter` confirms). If a future dialog needs to advertise its primary action
to pointer users, use a dedicated filled-button treatment, not the focus ring — the ring must stay
exclusive to keyboard focus to remain a reliable modality signal.

### 10.7 Verification

**Native test (`html/tests/packaging.test.mjs`)** — the Engineer adds:

```js
await t.test('global :focus-visible ring is token-only (LIV-22)', () => {
  const css = readFileSync(resolve(process.cwd(), 'html/styles/base.css'), 'utf8');
  for (const token of ['--focus-ring-color', '--focus-ring-width', '--focus-ring-offset']) {
    assert.match(css, new RegExp(`${token}\\s*:`), `${token} defined in the token layer`);
  }
  const rule = css.match(/:focus-visible[^{]*\{[^}]*\}/);
  assert.ok(rule, 'a :focus-visible rule exists');
  assert.match(rule[0], /var\(--focus-ring-color\)/);
  assert.match(rule[0], /var\(--focus-ring-width\)/);
  assert.match(rule[0], /var\(--focus-ring-offset\)/);
  assert.doesNotMatch(rule[0], /#[0-9a-fA-F]{3,8}\b/, 'component rule uses no raw hex');
});
```

**Browser QA:**

- `Tab` through the title menu: each focused row shows a 2 px gold ring with a 2 px gap, distinct
  from the gold hover / `selected` fill.
- Open `DELETE SLOT n?` with the mouse: `#confirm-cancel` shows **no** ring; `Enter` cancels.
- Open `DELETE SLOT n?` from the keyboard (focus `DELETE`, press `Enter`): `#confirm-cancel` shows
  the ring; `Enter` cancels.
- Open a confirm with the mouse, then press `Tab`: the ring appears on the newly focused control.
- Verify the ring on every skin: `.action-btn`, `.action-btn.danger`, `.title-btn.continue-btn`,
  `.option-toggle`, `.option-seg`, `.confirm-draft-btn`, `.option-slider`.
- At 200% browser zoom and `uiScale: small`/`xlarge`: the ring stays 2 px and aligned.

### 10.8 Adjacent finding (out of scope — recommend follow-up)

`.fate-card` in the Fate Grant draft is a click-only `<div>` (no `tabindex`, no `role`, no key
handler), so keyboard users cannot draft cards at all — only the disabled `#confirm-draft-btn` is a
button. A focus ring cannot help a control that cannot receive focus. Recommended follow-up: render
each card as a `<button>`, expose selection with `aria-pressed`, and support Arrow-key movement
within the grid. Not part of this issue; flag for the Producer/CTO to schedule.
