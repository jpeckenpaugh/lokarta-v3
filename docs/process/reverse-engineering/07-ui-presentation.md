# Stage 7 — UI & Presentation Code Auditor

## Role / Purpose

Audit, refine, and verify the user presentation layer, Canvas graphics renderer, fixed-tick animation loop, Web Audio synthesizer, and user controls in `html/` against approved feature briefs and technical architecture.

## Inputs

- `features/briefs/*.md` (Stage 3).
- `docs/architecture.md` (Stage 5).
- Audited Core Engine & Storage modules (Stage 6).
- UI presentation files under `html/` ([app.js](file:///Users/jarad/git/lokarta-v3/html/app.js), [audio.js](file:///Users/jarad/git/lokarta-v3/html/audio.js), [index.html](file:///Users/jarad/git/lokarta-v3/html/index.html), [styles.css](file:///Users/jarad/git/lokarta-v3/html/styles.css)).

## Outputs

- Audited and refined presentation layer in `html/`:
  - `app.js` — Main UI controller, 10 Hz fixed-tick loop, 60 FPS interpolated renderer, and input handlers.
  - `audio.js` — Procedural Web Audio API sound synthesizer.
  - `index.html` — DOM layout container, paperdoll UI, backpack slots, ability hotbars, vitals meters, combat log.
  - `styles.css` — Responsive CSS styling.

## Instructions

1. Read `features/briefs/*.md`, `docs/architecture.md`, and inspect presentation source files in `html/`.
2. Audit UI components, Canvas renderer, and Web Audio synthesis for strict compliance with design briefs and architecture.
3. Refine code formatting, comments, or UI bindings where appropriate, preserving all working behavior.
4. Write stage summary.

## What NOT to do

- Do NOT rewrite core simulation math or IndexedDB schemas.
- Do NOT introduce external server dependencies or media asset frameworks.
- Do NOT break existing UI layout or controls.

## Summary

Write `summaries/07-ui-presentation.md` using `summaries/00-template.md`. Summarize audit findings and commit changes with message `stage 07: audit ui presentation modules`.
