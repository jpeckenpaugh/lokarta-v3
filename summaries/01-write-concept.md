# Summary: Concept Extraction (Stage 01)

- **Date:** 2026-09-23
- **Author / Executor:** Stage 1 Concept Extraction Lead
- **Instruction file:** `instructions/reverse/01-write-concept.md`
- **Commit:** `stage 01: extract concept from working codebase`

## Work Completed

Extracted and formalized the authoritative seed concept (`concept.md`) for *Lokarta: Come Into The Light* by analyzing the ground-truth codebase (`html/engine.js`, `html/floor-generator.js`, `html/storage.js`, `html/app.js`, `html/audio.js`) and verified test suite (`html/tests/engine.test.mjs`). Aligned documentation (`html/README.md`) with the codebase to accurately reflect all 4 implemented playable vocations and 4 paperdoll equipment slots.

## Outputs Produced

- `concept.md` (Root project concept document detailing product identity, zero-backend web stack, 4 playable vocations, 20-floor procedural dungeon biomes, inventory system, and major capabilities).
- `html/README.md` (Updated application README aligned with 4 playable vocations and 4-slot Paperdoll equipment mechanics).
- `summaries/01-write-concept.md` (Stage 1 summary document).

## Key Decisions

1. **Document All 4 Implemented Vocations:** Ground-truth code (`engine.js`, `app.js`) and tests (`engine.test.mjs`) support Magician, Archer, Fighter, and Paladin. Documented all 4 vocations in `concept.md` and updated `html/README.md` accordingly per the Ground-Truth contract in `00-README.md`.
2. **Document 4-Slot Paperdoll Equipment:** Ground-truth code (`DEFAULT_ARCHETYPES` in `engine.js`) defines `main_hand`, `off_hand`, `armor`, and `relic`. Updated `html/README.md` and `concept.md` to reflect 4 equipment slots.

## Open Questions & Concerns

None. All stage outputs are aligned with the ground-truth implementation and automated tests.

## Status

- [x] Complete
- [ ] Needs review
