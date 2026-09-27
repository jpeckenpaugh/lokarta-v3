# Environment & System Notes

## Overview

*Lokarta: Come Into The Light* is a zero-backend, client-side browser application built with standard HTML5, CSS3, ES Modules, and browser APIs. This document details the runtime environment, browser prerequisites, local hosting server requirements, and test execution procedures.

---

## 1. Client Runtime Environment

The application runs entirely within the web browser context without external server dependencies or build transpilers.

### Supported Browsers & API Requirements
- **Browser Compatibility:** Any modern evergreen web browser (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge).
- **ES Modules (ESM):** Native support for `import` / `export` syntax in standard script tags (`<script type="module" src="app.js">`).
- **Web Workers:** Native support for dedicated Web Workers (`new Worker('game-worker.js', { type: 'module' })`) to execute game state simulation off the main UI thread.
- **IndexedDB:** Client-side object database API used by `storage.js` for persistent profile storage, settings, and floor state saves (`lokarta_db`).
- **Web Audio API:** Native support for `AudioContext` used by `audio.js` for procedural real-time Web Audio sound synthesis (synthesizing retro sound effects without external audio files).
- **HTML5 Canvas 2D:** Native 2D rendering context (`HTMLCanvasElement.getContext('2d')`) used by `app.js` for 60 FPS tile map, particle, light overlay, and UI rendering.

---

## 2. Local HTTP Server Setup

Because the application relies on Web Workers and ES Modules, files must be served over HTTP/HTTPS rather than opened via the `file://` protocol (which triggers CORS restriction errors for ESM and Web Workers).

### Launching the Application

The repository includes a launcher script at the root:

```bash
./run.sh
```

`run.sh` auto-detects available static HTTP server environments in order:
1. `python3 -m http.server -d html 3000`
2. `npx serve html -l 3000`
3. `python -m SimpleHTTPServer 3000` (Python 2 fallback)

By default, the server listens on `http://localhost:3000`. You can override the port by setting the `PORT` environment variable:

```bash
PORT=8080 ./run.sh
```

---

## 3. Automated Testing Procedure

The codebase includes native ES Module unit test suites located in `html/tests/`.

### Test Runner Prerequisites
- **Node.js:** v18.0.0 or higher (supporting native Node.js test runner `node:test` and `node:assert`).
- Zero external test dependencies required (no Jest, Vitest, or Mocha required).

### Running Automated Tests

Run the engine test suite using Node's built-in test runner:

```bash
node --test html/tests/engine.test.mjs
```

### Coverage
The test suite (`html/tests/engine.test.mjs`) validates:
1. **Floor Generator:** Determinism, 40x40 grid boundaries, spawn (2,2) and stairs (35,35) placement, floor-to-stairs connectivity, biome mapping (Floors 1–20), and Abyssal Overlord boss stats.
2. **GridMap & Tile Bounds:** Dimension initialization, tile types, and item management.
3. **LightingSystem & FOV:** Vision radius computation (base 10, torch +2, degrading light spell +3/+2/+1), spatial circle lighting, and monster visibility.
4. **ProgressionSystem:** 4 playable vocations (Magician, Archer, Fighter, Paladin), level scaling, and stat increments.
5. **CombatSystem:** Vocation-locked equipment enforcement (no class multiplier — damage/healing scales from `skillBoosts.damageMultiplier` only), ability execution, arrow consumption, and Paladin prayers/strikes.
6. **InventorySystem:** Slot priority (action bar 0–9 before backpack), paperdoll equipment slots, and unequip functionality.
7. **FateGrantSystem:** 5-card draft generation and card application.
8. **GestureEngine:** Hotkey mapping for keys 1–9 and 0.
9. **GameClient & Worker Protocol:** Client bootstrap and worker lifecycle RPC communication.

---

## 4. Environment Rules & Constraints

1. **Zero Backend Required:** Do not add server-side frameworks (FastAPI, Express, Django) or remote database services.
2. **No Bundlers / Transpilers:** Do not introduce Webpack, Vite, Babel, or npm build scripts into `html/`. Application code must run natively in standard browsers.
3. **Isolated Scratch Files:** All temporary files, test logs, and experimental scripts must be stored under `./tmp/` which is ignored by `.gitignore`.

---

## 5. Shared Git Hosting (`/repos/lokarta.git`) & Push Workaround

The project's `origin` is a local bare repository at `file:///repos/lokarta.git`, owned by the agent user (`node`). `refs/heads/main` and most of `objects/` are agent-writable, but 19 `objects/<xx>/` fanout directories are owned by `root:root` (created by a root-run process on 2026-09-27 05:14–05:18) and cannot be written by `node`.

When a push contains loose objects that hash into one of those directories, the receive side fails deterministically with:

```text
remote: error: unable to migrate objects to permanent storage
```

### Active workaround (non-destructive, reversible)

Keep incoming pushes as **packfiles** in the agent-writable `objects/pack/` instead of exploding them into loose fanout directories:

```sh
git -C /repos/lokarta.git config receive.unpackLimit 1
```

This setting is already applied to the shared bare repository, so pushes land normally. Revert with:

```sh
git -C /repos/lokarta.git config --unset receive.unpackLimit
```

Do **not** `rm`/`chown`/`chmod` the root-owned directories from an agent run. The permanent fix requires root:

```sh
chown -R node:1003 /repos/lokarta.git/objects
```

(or at minimum the 19 root-owned `objects/<xx>` directories). Once that is done the `receive.unpackLimit` workaround can be removed.
