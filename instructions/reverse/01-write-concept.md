# Stage 1 — Concept Extraction

## Role / Purpose

Extract and formalize the seed concept (`concept.md`) by analyzing the working client-side application codebase (`html/`) and existing application documentation (`html/README.md`).

This stage establishes the authoritative product identity, target audience, core capabilities, and web-native technical stack as implemented in the ground-truth codebase.

## Inputs

- Working client application source code under `html/` ([engine.js](file:///Users/jarad/git/lokarta-v3/html/engine.js), [app.js](file:///Users/jarad/git/lokarta-v3/html/app.js), etc.).
- Existing application README ([html/README.md](file:///Users/jarad/git/lokarta-v3/html/README.md)).
- Stakeholder / human input (optional clarifications).

## Outputs

- `concept.md` at the repository root, stating:
  - Product identity and purpose (what the game/app is and why it exists).
  - Target user / audience.
  - The actual technical stack implemented (Zero-Backend Web App / HTML5 Canvas / Vanilla ES Modules / Web Workers / IndexedDB / Web Audio API).
  - Implemented seed data (default vocations, 20 dungeon floor biomes, items, player capabilities).
  - Major capabilities (dungeon exploration, real-time lighting, procedural Web Audio, turn/tick simulation, inventory, save persistence).

## Instructions

1. **Inspect the Ground-Truth Codebase:**
   - Read [html/README.md](file:///Users/jarad/git/lokarta-v3/html/README.md) and key modules under `html/` ([engine.js](file:///Users/jarad/git/lokarta-v3/html/engine.js), [floor-generator.js](file:///Users/jarad/git/lokarta-v3/html/floor-generator.js), [app.js](file:///Users/jarad/git/lokarta-v3/html/app.js)).
2. **Draft `concept.md`:**
   - Document the game's identity: Lokarta — Come Into The Light (2D roguelike RPG).
   - Document the implemented web-native stack (no server runtime, pure client-side execution).
   - Document implemented capabilities (Magician vs. Archer vocations, 20 floors across 4 biomes, line-of-sight lighting, IndexedDB local saves, Web Audio synth).
3. **Verify Alignment:**
   - Ensure `concept.md` accurately reflects the application in `html/` without omitting major implemented features or inventing unimplemented features.
4. **Obtain Human Approval:**
   - Present `concept.md` to the human for ratification.
5. **Write Summary:**
   - Write `summaries/01-write-concept.md` using `summaries/00-template.md`.
   - Commit changes to current branch and push to `origin` with message `stage 01: extract concept from working codebase`.

## What NOT to do

- Do NOT invent hypothetical capabilities or features not present in the codebase.
- Do NOT mandate external backend servers or frameworks not used by the app.
- Do NOT rewrite or alter existing application code in `html/`.

## Summary

Write `summaries/01-write-concept.md` using `summaries/00-template.md`. Record the concept extraction findings and commit with `stage 01: extract concept from working codebase`.