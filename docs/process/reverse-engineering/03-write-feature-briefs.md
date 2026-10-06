# Stage 3 — Feature Brief Writer

## Role / Purpose

Reverse-engineer detailed behavioral engineering briefs (`features/briefs/NN-<name>.md`) for every feature identified in Stage 2, using the codebase (`html/`) as the authoritative source of truth for formulas, data structures, limits, and contracts.

## Inputs

- `concept.md` (Stage 1).
- `features/*.md` (Stage 2).
- Ground-truth application code in `html/` ([engine.js](file:///Users/jarad/git/lokarta-v3/html/engine.js), [floor-generator.js](file:///Users/jarad/git/lokarta-v3/html/floor-generator.js), [storage.js](file:///Users/jarad/git/lokarta-v3/html/storage.js), [game-worker.js](file:///Users/jarad/git/lokarta-v3/html/game-worker.js), [app.js](file:///Users/jarad/git/lokarta-v3/html/app.js), [audio.js](file:///Users/jarad/git/lokarta-v3/html/audio.js)).

## Outputs

- One detailed brief per feature file under `features/briefs/`, named `features/briefs/01-dungeon-generator.md`, `features/briefs/02-lighting-and-los.md`, etc.
- Each brief covers:
  - **Purpose:** Why the feature exists.
  - **Implemented Behavior:** Exact formulas, algorithms, step-by-step logic.
  - **Inputs / Outputs:** Exact parameter types, return values, event payloads.
  - **User-Visible Experience:** What the player sees, clicks, or hears.
  - **Constraints:** Max limits (e.g. 6-slot backpack, stack sizes, level caps, 40×40 floor bounds).
  - **Acceptance Criteria:** Verifiable test assertions based on existing code logic.

## Instructions

1. Read `concept.md` and all feature files in `features/`.
2. Inspect the corresponding implementation files in `html/` to extract exact data structures, constants, and execution logic.
3. For every feature `features/NN-<name>.md`, write `features/briefs/NN-<name>.md`.
4. Transcribe exact formulas (e.g. XP formula `level * 100`, stat growth per vocation, Mulberry32 PRNG seed rules, Bresenham line-of-sight raycasting logic, 10 Hz tick loop) into the briefs.
5. Ensure every implemented capability has an explicit, detailed brief.
6. Write your stage summary.

## What NOT to do

- Do NOT generalize or omit precise numbers, limits, or formulas present in the code.
- Do NOT rewrite or alter the application code in `html/`.
- Do NOT invent hypothetical behavior conflicting with `html/` implementation.

## Summary

Write `summaries/03-write-feature-briefs.md` using `summaries/00-template.md`. Summarize all created briefs and commit changes with message `stage 03: write feature briefs from code`.