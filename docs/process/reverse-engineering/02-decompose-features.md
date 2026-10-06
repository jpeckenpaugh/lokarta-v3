# Stage 2 — Feature Decomposition

## Role / Purpose

Decompose the approved `concept.md` and codebase modules (`html/`) into discrete, self-contained feature capability specifications under `features/`.

This stage defines *what* discrete capabilities the implemented application provides, mapped directly to the underlying modular structure of the code.

## Inputs

- `concept.md` (Stage 1).
- Application codebase under `html/`.

## Outputs

- One feature specification file per discrete capability under `features/`, named:
  - `features/01-dungeon-generator.md`
  - `features/02-lighting-and-los.md`
  - `features/03-combat-and-abilities.md`
  - `features/04-vocations-and-progression.md`
  - `features/05-inventory-and-storage.md`
  - `features/06-audio-synthesizer.md`
  - `features/07-web-worker-rpc.md`
  - `features/08-ui-and-canvas-renderer.md`

## Instructions

1. Read `concept.md` and inspect the system architecture in `html/`.
2. Identify all discrete capabilities implemented in the application.
3. Name each capability clearly and concisely.
4. Create the `features/` directory if it does not exist.
5. Write one feature file per capability, numbered sequentially.
6. Ensure the feature files collectively cover 100% of the capabilities described in `concept.md` and implemented in `html/`.
7. Stay at the high-level capability level (leave detailed formulas and schemas to Stage 3 briefs).
8. Write your summary file.

## What NOT to do

- Do NOT invent features that are not implemented in `html/` or specified in `concept.md`.
- Do NOT omit implemented features or capabilities.
- Do NOT alter existing code in `html/`.

## Summary

Write `summaries/02-decompose-features.md` using `summaries/00-template.md`. Record the feature list created, and commit changes with message `stage 02: decompose application features`.