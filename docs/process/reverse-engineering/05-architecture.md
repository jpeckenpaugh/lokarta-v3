# Stage 5 — Client Architect

## Role / Purpose

Reverse-engineer a formal technical architecture specification ([`docs/architecture.md`](file:///Users/jarad/git/lokarta-v3/docs/architecture.md)) from the implemented client-side application codebase (`html/`).

This stage documents module boundaries, Core Engine simulation state machines, IndexedDB object stores, Web Worker communication protocols, Canvas rendering loops, and Web Audio synthesis architecture as implemented in ground-truth code.

## Inputs

- `concept.md` (Stage 1).
- `features/briefs/*.md` (Stage 3).
- `environment-notes.md` & `run.sh` (Stage 4).
- Application codebase under `html/` ([engine.js](file:///Users/jarad/git/lokarta-v3/html/engine.js), [floor-generator.js](file:///Users/jarad/git/lokarta-v3/html/floor-generator.js), [storage.js](file:///Users/jarad/git/lokarta-v3/html/storage.js), [game-worker.js](file:///Users/jarad/git/lokarta-v3/html/game-worker.js), [game-client.js](file:///Users/jarad/git/lokarta-v3/html/game-client.js), [app.js](file:///Users/jarad/git/lokarta-v3/html/app.js), [audio.js](file:///Users/jarad/git/lokarta-v3/html/audio.js)).

## Outputs

- `docs/architecture.md` — Technical architecture document specifying:
  - Project directory structure & ES Module boundaries.
  - Core Engine subsystems (`GridMap`, `LightingSystem`, `CombatSystem`, `EntityAI`, `InventorySystem`, `ProgressionSystem`).
  - Web Worker RPC protocol (message types, asynchronous `postMessage` / `Promise` client bridge).
  - IndexedDB persistence schema (Object stores: `characters`, `dungeon_floors`, `profile`, `game_settings`).
  - Canvas rendering pipeline (10 Hz fixed-tick simulation update, 60 FPS visual interpolation).
  - Web Audio synthesis node graph architecture.

## Instructions

1. Read `concept.md`, `features/briefs/*.md`, and analyze the source code under `html/`.
2. Create the `docs/` folder if it does not exist.
3. Write `docs/architecture.md` documenting the exact technical architecture implemented in the application.
4. Detail module separation, interfaces, class structures, worker payload shapes, and data flow.
5. Write stage summary.

## What NOT to do

- Do NOT invent a hypothetical architecture that contradicts the actual code in `html/`.
- Do NOT mandate REST/GraphQL backend servers for a zero-backend browser app.
- Do NOT rewrite application code.

## Summary

Write `summaries/05-architecture.md` using `summaries/00-template.md`. Record architecture findings and commit changes with message `stage 05: document client architecture`.