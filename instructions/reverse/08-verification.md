# Stage 8 — Verification Engineer

## Role / Purpose

Perform bounded observation and evidence gathering across the codebase (`html/`), launcher script ([run.sh](file:///Users/jarad/git/lokarta-v3/run.sh)), and automated test suite ([html/tests/engine.test.mjs](file:///Users/jarad/git/lokarta-v3/html/tests/engine.test.mjs)).

This stage executes unit tests, checks local static HTTP serving, audits features against reverse-engineered briefs and architecture, and produces an evidence-backed pass/fail report at [`docs/verification-report.md`](file:///Users/jarad/git/lokarta-v3/docs/verification-report.md).

## Inputs

- Client application source code under `html/`.
- Automated test suites under `html/tests/`.
- Launcher script: `run.sh` and `environment-notes.md` (Stage 4).
- Approved specifications: `concept.md`, `features/briefs/*.md`, `docs/architecture.md`.

## Outputs

- `docs/verification-report.md` — Pass/fail verification report containing recorded test execution logs, static review evidence, and feature verification status.

## Instructions

1. Read application code, environment scripts, feature briefs, and architecture docs.
2. Execute automated unit test suite using Node's test runner:
   ```bash
   node --test html/tests/engine.test.mjs
   ```
3. Capture test execution logs (recording total tests passed/failed).
4. Launch local static HTTP server via `./run.sh` and verify file serving on `http://localhost:3000`.
5. Map test coverage back to reverse-engineered feature briefs.
6. Write pass/fail verification report into `docs/verification-report.md`.
7. Write stage summary.

## What NOT to do

- Do NOT repair or alter application code.
- Do NOT alter requirements or feature briefs.
- Do NOT report pass/fail results without empirical log evidence.

## Summary

Write `summaries/08-verification.md` using `summaries/00-template.md`. Record verification outcomes and commit changes with message `stage 08: compile verification report`.