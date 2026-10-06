# Stage 6 — Core Engine Code Auditor

## Role / Purpose

Audit, refine, and verify the non-UI core simulation engine, state machine, procedural generator, IndexedDB storage manager, and background Web Worker thread in `html/` against the reverse-engineered feature briefs and technical architecture.

This stage ensures engine modules have clean ES Module exports, JSDoc annotations, and full conformance with specified formulas and schemas.

## Inputs

- `features/briefs/*.md` (Stage 3).
- `docs/architecture.md` (Stage 5).
- Core engine code under `html/` ([engine.js](file:///Users/jarad/git/lokarta-v3/html/engine.js), [floor-generator.js](file:///Users/jarad/git/lokarta-v3/html/floor-generator.js), [storage.js](file:///Users/jarad/git/lokarta-v3/html/storage.js), [game-worker.js](file:///Users/jarad/git/lokarta-v3/html/game-worker.js), [game-client.js](file:///Users/jarad/git/lokarta-v3/html/game-client.js)).

## Outputs

- Audited and refined core engine modules in `html/`:
  - `engine.js` — Core simulation logic (`GridMap`, `LightingSystem`, `CombatSystem`, `EntityAI`, `InventorySystem`, `ProgressionSystem`).
  - `floor-generator.js` — Procedural dungeon generator with Mulberry32 PRNG.
  - `storage.js` — IndexedDB manager (`characters`, `dungeon_floors`, `profile`, `game_settings`).
  - `game-worker.js` — Background Web Worker thread execution.
  - `game-client.js` — Typed RPC client bridge.

## Instructions

1. Read `features/briefs/*.md`, `docs/architecture.md`, and inspect engine source files in `html/`.
2. Audit engine modules for strict compliance with formulas, bounds, and worker message protocols.
3. Add missing JSDoc comments or improve code readability where helpful, maintaining existing contracts.
4. Ensure clean ES Module exports for UI consumption.
5. Write stage summary.

## What NOT to do

- Do NOT break existing engine contracts or alter working game formulas.
- Do NOT introduce backend server APIs.
- Do NOT modify UI presentation or Canvas rendering code.

## Summary

Write `summaries/06-core-engine.md` using `summaries/00-template.md`. Summarize audit findings and commit changes with message `stage 06: audit core engine modules`.
