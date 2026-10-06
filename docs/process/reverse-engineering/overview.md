# Build Pipeline Overview (Reverse-Engineering Mode)

The build pipeline orchestrates 9 sequential roles to **reverse-engineer and formalize project specifications, technical architecture, feature briefs, and test baselines** from a working client application codebase (`html/`).

The codebase serves as the **ground truth**.

---

## 🏛️ Pipeline Flow

```
html/ (Ground-Truth Code & Tests)
  │
  ├── Stage 1: Concept Extraction ──────────► concept.md
  │
  ├── Stage 2: Feature Decomposition ───────► features/01-*.md, 02-*.md, ...
  │
  ├── Stage 3: Feature Brief Writer ────────► features/briefs/01-*.md, ...
  │
  ├── Stage 4: System & Tooling Eng. ───────► run.sh, environment-notes.md
  │
  ├── Stage 5: Client Architect ────────────► docs/architecture.md
  │
  ├── Stage 6: Core Engine Code Auditor ────► html/ (engine, storage, worker audit)
  │
  ├── Stage 7: UI & Presentation Auditor ───► html/ (app, audio, canvas audit)
  │
  ├── Stage 8: Verification Engineer ───────► docs/verification-report.md
  │
  └── Stage 9: Project Manager / Docs ──────► README.md
```

---

## 📋 Role Responsibilities Summary

1. **Stage 1 (Concept Extraction):** Extracts `concept.md` from working application code and `html/README.md`.
2. **Stage 2 (Feature Decomposition):** Decomposes system modules into feature specification files under `features/`.
3. **Stage 3 (Feature Brief Writer):** Reverse-engineers detailed behavioral briefs under `features/briefs/` with exact formulas, tile limits, and worker contracts.
4. **Stage 4 (System & Tooling Engineer):** Verifies root `./run.sh` launcher script and documents browser environment prerequisites in `environment-notes.md`.
5. **Stage 5 (Client Architect):** Reverse-engineers technical architecture into `docs/architecture.md` (Web Worker RPC, IndexedDB schemas, Canvas render loops, audio synth).
6. **Stage 6 (Core Engine Code Auditor):** Audits engine code (`engine.js`, `storage.js`, `game-worker.js`, `game-client.js`, `floor-generator.js`) against briefs and architecture.
7. **Stage 7 (UI & Presentation Auditor):** Audits UI presentation, renderer, and Web Audio code (`app.js`, `audio.js`, `index.html`, `styles.css`) against briefs and architecture.
8. **Stage 8 (Verification Engineer):** Runs test suite (`node --test html/tests/engine.test.mjs`), verifies server startup (`./run.sh`), and compiles `docs/verification-report.md`.
9. **Stage 9 (Project Manager / Docs):** Compiles root `README.md` summarizing project identity, architecture overview, quickstart instructions, and test procedures.
