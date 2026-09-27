# LIV-23 evidence — Save-slot UX (New Game default + delete/reuse)

Browser-verified on `main` with the change at `10cd15e`, served from `html/` by
`python3 -m http.server` (static only, no bundler). Fresh browser profile,
1280×720, Chromium headless via Playwright. Page errors: none.

Reproduce with `tools/render-slot-evidence.mjs` or by hand.

```sh
python3 -m http.server -d html 4173 &     # static server, no bundler
EVIDENCE_DIR=docs/evidence node tools/render-slot-evidence.mjs
```

`tools/render-slot-evidence.mjs` is the exact runner used for the screenshots
above; it prints the runtime probes and writes the PNGs. It needs Playwright
resolvable from the workspace and, in a minimal container, the Chromium system
libraries (`libglib-2.0`, `libnss3`, `libgbm1`, …).

## Scenario and result

| # | Step | Evidence | Observed |
| :-- | :-- | :-- | :-- |
| 1 | Fresh profile → New Game | `LIV-23-01-fresh-profile-slot1-default.png` | Slot 1 auto-selected: card has a solid gold border, its action is a gold-filled `SLOT 1 — NEW GAME` primary button, and keyboard focus lands on it. |
| 2 | Press `Enter` (focus untouched) | `LIV-23-02-enter-reaches-character-select.png` | Character Select opens for Slot 1 — one step, no dead end. |
| 3 | Create Slot 1, return to title, New Game again | `LIV-23-03-slot1-occupied-default-slot2.png` | Default advances to the first **loadable empty** slot, Slot 2; Slot 1 shows FIGHTER + OVERWRITE/DELETE. |
| 4 | DELETE on Slot 2 | `LIV-23-04-delete-slot-confirm.png` | One obvious action opens `DELETE SLOT 2?` with the exact summary body; safe focus is `CANCEL`. |
| 5 | Confirm delete | `LIV-23-05-slot-freed-after-delete.png` | Slot 2 returns to empty; default is Slot 2 again. |
| 6 | `Enter` on the freed default | `LIV-23-06-freed-slot-reused.png` | Character Select opens for the freed Slot 2. |

Runtime probes captured alongside the screenshots:

- `firstNewGameSlotIndex`: `1` on a fresh profile; `2` when Slot 1 is occupied;
  `null` only when nothing is selectable (all corrupt), never a fabricated slot.
- Empty-slot New Game buttons in create mode are all `disabled: false`
  (visibly selectable, not disabled).
- Load mode renders no default (`0` `data-default-new` markers) and its empty
  slots stay `disabled`.
- `deleteSlot(2)` removed only the slot metadata: `save_slots` went from
  `[{1, occupied}, {2, occupied}]` to `[{1, occupied}]`.

## Native suite

`node --test html/tests/*.test.mjs` → **140 tests / 14 suites / 0 fail**.

New coverage in `html/tests/packaging.test.mjs`:

- `firstNewGameSlotIndex defaults New Game to the first loadable empty slot (LIV-23)`
- `create-mode slot screen marks the default New Game action and focuses it (LIV-23)`

## Constraint check

Static `html/` only: no new server, no bundler/transpiler, no new runtime
dependency, no new IndexedDB store or schema change. `save-slots.js` helpers
stay pure and browser-free so the native suite exercises them directly.
