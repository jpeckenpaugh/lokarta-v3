# Role Pipeline Orchestration (Reverse-Engineering Mode)

This project uses a sequence of clearly separated roles to **reverse-engineer and formalize complete project documentation, design artifacts, and test baselines** from a working client application codebase (`html/`).

The codebase and its automated tests serve as the **ground truth**. Each role reads the source code and upstream artifacts, produces its designated specification file or audit report, writes a stage summary, and hands off to the next role.

---

## Folder / file layout

```
.
├── concept.md                      Stage 1 (Extracted from code & README)
├── features/
│   ├── 01-<name>.md                Stage 2 (Decomposed from code modules)
│   ├── 02-<name>.md
│   └── briefs/
│       ├── 01-<name>.md            Stage 3 (Reverse-engineered briefs)
│       ├── 02-<name>.md
│       └── ...
├── run.sh                          Stage 4 (Verified HTTP server launcher)
├── .gitignore                      Stage 4
├── environment-notes.md            Stage 4 (Prerequisites & browser standards)
├── html/                           Ground Truth (Client application source code)
│   ├── engine.js                   Core simulation modules
│   ├── storage.js                  IndexedDB persistence manager
│   ├── game-worker.js              Web Worker background thread
│   ├── game-client.js              Worker RPC protocol client
│   ├── floor-generator.js          Procedural dungeon generator
│   ├── app.js                      UI controller & Canvas renderer
│   ├── audio.js                    Procedural Web Audio synthesizer
│   ├── index.html                  DOM layout container
│   ├── styles.css                  CSS responsive styling
│   └── tests/                      Automated test suites
├── docs/
│   ├── architecture.md             Stage 5 (Reverse-engineered technical architecture)
│   └── verification-report.md      Stage 8 (Evidence-backed test & audit report)
├── README.md                       Stage 9 (Root documentation & quickstart)
├── instructions/                   (Pipeline instructions)
└── summaries/
    ├── 00-template.md
    └── NN-<slug>.md                (Per-stage summaries)
```

---

## Roles in order

| Order | Role | Instruction file | Produces |
| :---: | :--- | :--- | :--- |
| **1** | **Concept Extraction** | `01-write-concept.md` | `concept.md` (Extracted from `html/` & code analysis) |
| **2** | **Feature Decomposition** | `02-decompose-features.md` | `features/01-<name>.md`, `features/02-<name>.md`, … |
| **3** | **Feature Brief Writer** | `03-write-feature-briefs.md` | `features/briefs/01-<name>.md`, … |
| **4** | **System & Tooling Eng.** | `04-system-engineering.md` | `run.sh`, `.gitignore`, `environment-notes.md` |
| **5** | **Client Architect** | `05-architecture.md` | `docs/architecture.md` |
| **6** | **Core Engine Code Auditor** | `06-core-engine.md` | Engine code audit & refinement under `html/` |
| **7** | **UI & Presentation Auditor** | `07-ui-presentation.md` | UI, Canvas, & Audio code audit under `html/` |
| **8** | **Verification Engineer** | `08-verification.md` | `docs/verification-report.md` |
| **9** | **Project Manager / Docs** | `09-documentation.md` | Root `README.md` |

---

## Handoffs & Reverse Pipeline Flow

Each role is the sole owner of its stage. A role must not reach backwards to invent unimplimented behavior, nor reach forwards to perform future stage work. The source codebase is ground truth:

```
html/ (Ground Truth) -> concept.md -> features/*.md -> features/briefs/*.md -> 
env scripts -> docs/architecture.md -> Engine & UI Code Audit -> 
docs/verification-report.md -> README.md
```

---

## Summary requirement

Every role must write a single markdown summary of its completed work into the `summaries/` folder, named `NN-<slug>.md` to match its stage number (e.g. `summaries/02-decompose-features.md`), using `summaries/00-template.md` as the template.

---

## Per-stage commits

Each stage commits its work as the **final step** of the stage, after producing all artifacts and writing its summary:
- Commit changes to the current branch and push to `origin`.
- Use the commit message format `stage <NN>: <brief summary>` (e.g., `stage 05: reverse-engineer client architecture`).

---

## The Ground-Truth Code Contract

1. **Working Code is Binding:** The implementation in `html/` and tests in `html/tests/` define actual behavior. Specifications and briefs capture and formalize existing implementation details without breaking existing contracts.
2. **No Invented Unimplemented Features:** Stages reverse-engineering docs do not introduce unimplimented features or hypothetical APIs unless explicitly requested by the human.
3. **Conflicts go to the Human:** If a stage discovers a discrepancy or bug in the code, it records the observation in its stage summary and verification report rather than silently altering requirements.