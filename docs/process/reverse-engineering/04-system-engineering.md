# Stage 4 — System & Tooling Engineer

## Role / Purpose

Verify, audit, and document the reproducible development, local hosting, and test execution environment for the client-side browser application.

This stage ensures the root launcher script ([run.sh](file:///Users/jarad/git/lokarta-v3/run.sh)), [.gitignore](file:///Users/jarad/git/lokarta-v3/.gitignore), and [environment-notes.md](file:///Users/jarad/git/lokarta-v3/environment-notes.md) accurately capture browser API prerequisites, static server requirements, ES Module rules, and automated test execution.

## Inputs

- `features/briefs/*.md` (Stage 3).
- Existing repository scripts: [run.sh](file:///Users/jarad/git/lokarta-v3/run.sh), `.gitignore`.
- Application codebase under `html/` and test suite under `html/tests/`.

## Outputs

- [run.sh](file:///Users/jarad/git/lokarta-v3/run.sh) — Root static HTTP server launcher script (auto-detects `python3`, `npx serve`, `python`).
- `.gitignore` — Ignore rules for `./tmp/`, OS artifacts (`.DS_Store`), test coverage logs.
- `environment-notes.md` — Environment notes detailing browser APIs (Web Workers, IndexedDB, Web Audio, ES Modules), local HTTP port setup, and test runner execution commands (`node --test html/tests/*.test.mjs`).

## Instructions

1. Inspect existing [run.sh](file:///Users/jarad/git/lokarta-v3/run.sh) script and ensure it functions cleanly across Python 3 and Node.js environments.
2. Verify `.gitignore` rules prevent temporary and OS scratch files from being committed.
3. Write `environment-notes.md` documenting:
   - Client runtime environment (Modern Web Browsers supporting ES Modules & Web Workers).
   - Local HTTP server launching guidelines (`./run.sh` or `python3 -m http.server -d html 3000`).
   - Automated testing procedure (`node --test html/tests/engine.test.mjs`).
4. Write stage summary.

## What NOT to do

- Do NOT mandate backend server dependencies (e.g. FastAPI, Python databases) for a zero-backend browser application.
- Do NOT introduce build bundlers or transpilers unless specified in the codebase.
- Do NOT alter application code in `html/`.

## Summary

Write `summaries/04-system-engineering.md` using `summaries/00-template.md`. Record environment findings and commit changes with message `stage 04: document system and tooling environment`.