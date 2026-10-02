# Feature Specification: 07 — Web Worker Async RPC Bridge

## 1. Overview & Purpose

The **Web Worker Async RPC Bridge** offloads computationally heavy tasks—such as procedural tower floor generation, IndexedDB storage reads/writes, character bootstrap initialization, and floor caching—off the main UI renderer thread into a Dedicated Web Worker (`game-worker.js`). It provides a Promise-wrapped message protocol via `GameClient` for asynchronous command execution.

---

## 2. Mapped Codebase Modules

- [html/game-client.js](file:///Users/jarad/git/lokarta-v3/html/game-client.js) — `GameClient` RPC client class (`request`, `_handleMessage`, `_handleError`, `pending` request map, timeout handler).
- [html/game-worker.js](file:///Users/jarad/git/lokarta-v3/html/game-worker.js) — Dedicated Web Worker message listener (`onmessage`), command dispatcher (`BOOTSTRAP`, `NEW_GAME`, `GENERATE_FLOOR`, `LOAD_FLOOR`, `SAVE_CHARACTER`, `SAVE_FLOOR`, `CLEAR_ALL`).

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 Asynchronous Promise-Wrapped RPC Protocol
- **Request Identification:** Generates unique request IDs (`req_N_timestamp_random`) for every outgoing message sent via `postMessage`.
- **Promise Lifecycle:** Wraps worker calls in JavaScript Promises; resolves on success response (`ok: true`) or rejects on failure/error response (`ok: false`).
- **Timeout Management:** Enforces a configurable request timeout (default 10,000 ms), rejecting pending requests if the worker does not respond in time.

### 3.2 Off-Thread Execution Capabilities
- **Background Floor Generation:** Executes Mulberry32 PRNG map carving and BFS path validation without dropping frames on the main UI render loop.
- **Background Storage Operations:** Handles IndexedDB initialization, character saves, and floor loading off the main thread.

### 3.3 RPC Command Matrix
1. `BOOTSTRAP`: Initializes IndexedDB, loads player profile settings, fetches latest saved character, and retrieves active floor state.
2. `NEW_GAME`: Instantiates a new Level 1 character entity, generates Floor 1, and saves initial state to IndexedDB.
3. `GENERATE_FLOOR`: Generates a specified floor depth ($1..20$), verifies BFS connectivity, and caches floor state.
4. `LOAD_FLOOR`: Reads a cached floor object from `dungeon_floors` IndexedDB store.
5. `SAVE_CHARACTER`: Commits current player character state (vitals, position, inventory, gear) to IndexedDB.
6. `SAVE_FLOOR`: Commits current floor state (explored tiles, dropped items, monster status) to IndexedDB.
7. `CLEAR_ALL`: Clears all IndexedDB stores for fresh game restarts.

---

## 4. Inputs, Outputs & State Data

- **Inputs:** Command string, payload parameters object, custom timeout duration.
- **Outputs:**
  - Promise resolving with requested data object (`player`, `floor`, `profile`, `success: true`).
  - Standardized error object on failure or timeout.

---

## 5. Operational Constraints & Boundaries

- Web Worker operates in ES module mode (`{ type: 'module' }`).
- Robust error handling ensures unhandled worker exceptions reject all active pending Promises with clear diagnostic error messages.
