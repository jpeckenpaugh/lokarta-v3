# Stage 9 — Project Manager / Documentation

## Role / Purpose

Synthesize the final root [`README.md`](file:///Users/jarad/git/lokarta-v3/README.md) for the repository, documenting the project identity, architecture overview, quickstart launching instructions, test runner commands, and reverse-engineered documentation pointers.

## Inputs

- `concept.md` (Stage 1).
- `features/briefs/*.md` (Stage 3).
- `environment-notes.md` & `run.sh` (Stage 4).
- `docs/architecture.md` (Stage 5).
- Application codebase under `html/` (Stages 6 & 7).
- `docs/verification-report.md` (Stage 8).
- `summaries/*.md` — Stage summary files from all prior stages.

## Outputs

- Root `README.md` — Authoritative project README describing the zero-backend client app, launching guidelines, architecture tables, test instructions, and documentation links.

## Instructions

1. Read `concept.md`, `features/briefs/*.md`, `docs/architecture.md`, `docs/verification-report.md`, and stage summaries.
2. Write root `README.md` detailing:
   - Project overview and key highlights.
   - Quickstart launching instructions via `./run.sh` or `python3 -m http.server`.
   - Running automated test suites (`node --test html/tests/engine.test.mjs`).
   - Architecture overview table mapping modules (`engine.js`, `storage.js`, `game-worker.js`, `app.js`, `audio.js`).
   - Controls and gameplay summary.
   - Pointers to reverse-engineered specifications (`concept.md`, `features/`, `docs/architecture.md`, `docs/verification-report.md`).
3. Write stage summary.

## What NOT to do

- Do NOT retroactively repair or redefine upstream work.
- Do NOT alter application code or feature briefs.
- Do NOT report unverified test results or missing features.

## Summary

Write `summaries/09-documentation.md` using `summaries/00-template.md`. Summarize close-out and commit changes with message `stage 09: write root project readme`.