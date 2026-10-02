# Feature Brief: 07 — Web Worker Async RPC Bridge

## 1. Purpose

The **Web Worker Async RPC Bridge** offloads heavy computational operations—such as Mulberry32 tower floor generation, BFS path validation, and IndexedDB storage persistence—to a Dedicated Web Worker (`game-worker.js`). By isolating CPU-bound generation and async storage calls off the main thread, it guarantees smooth 60 FPS rendering on the primary UI thread without frame drops.

---

## 2. Implemented Behavior

### 2.1 Promise-Wrapped RPC Protocol
- **Client Class:** `GameClient` ([game-client.js](file:///Users/jarad/git/lokarta-v3/html/game-client.js)) instantiates the worker (`{ type: 'module' }`) and manages asynchronous request-response mapping via `postMessage` and `onmessage`.
- **Unique Request Identifier:** Outgoing calls generate unique ID strings:
  `req_${reqIdCounter}_${Date.now()}_${randomString}`.
- **Pending Request Registry:** Pending Promises are registered in `this.pending` (a `Map<string, { resolve, reject, timer, command }>`).
- **Timeout Management:** Enforces a default 10,000 ms timeout (`options.timeout = 10000`). Requests failing to receive a worker response within 10 seconds reject with a timeout error (`Request '<command>' timed out after 10000ms.`).
- **Worker Error Handling:** Unhandled worker runtime errors trigger `_handleError`, clearing `this.pending` and rejecting all active pending Promises.

### 2.2 RPC Command Dispatch Matrix
The Dedicated Worker (`game-worker.js`) listens for messages and dispatches payload parameters across 7 RPC endpoints:
1. `bootstrap`: Opens IndexedDB, loads profile preferences, fetches active character, and loads floor state.
2. `newGame`: Initializes Level 1 character archetype, generates Floor 1 map, commits records to IndexedDB, and returns `{ player, floor }`.
3. `generateFloor` / `getFloor`: Fetches floor depth ($1..20$) from IndexedDB cache or generates via `generateFloor(floorNumber)`.
4. `saveCharacter`: Asynchronously saves updated character vitals, inventory, equipment, and position into `characters` store.
5. `saveFloor`: Asynchronously commits floor state (explored tile mask, item changes, monster state) into `dungeon_floors` store.
6. `clearAll`: Empties all IndexedDB object stores for hard reset.

---

## 3. Inputs & Outputs

- **Inputs:** Command string (`command`), parameters object (`payload`), optional custom timeout duration (`timeoutMs`).
- **Outputs:** Promise resolving with worker response payload:
  - `bootstrap`: `{ player: object | null, profile: object, activeFloor: object | null }`
  - `newGame`: `{ player: object, floor: object }`
  - `getFloor`: `FloorStateObject`
  - `saveCharacter`: `{ success: true, savedAt: string }`
  - `saveFloor`: `{ success: true, floorNumber: number, savedAt: string }`

---

## 4. User-Visible Experience

- **Zero UI Lag:** Climbing to a new floor triggers procedural generation in background thread while UI renders loading spinner or immediate transition.
- **Background Auto-Save:** Game state periodically commits to disk without causing input stuttering or micro-freezes.

---

## 5. Constraints

- Web Worker executes in ES module mode (`{ type: 'module' }`).
- Requests time out after 10,000 ms if unfulfilled.
- Worker context has no access to DOM, HTML5 Canvas element, or Web Audio API `AudioContext`.

---

## 6. Acceptance Criteria

1. **Unique Request ID Generation:** Outgoing requests receive unique ID strings containing request counter and timestamp (Verified in `html/tests/engine.test.mjs#L460-L470`).
2. **Promise Resolution (`ok: true`):** Worker sending message with `{ id, ok: true, data }` resolves corresponding `GameClient.request()` Promise with `data` (Verified in `html/tests/engine.test.mjs#L472-L482`).
3. **Promise Rejection (`ok: false`):** Worker sending message with `{ id, ok: false, error }` rejects pending Promise with Error object (Verified in `html/tests/engine.test.mjs#L484-L492`).
4. **Timeout Enforcement (10,000ms):** Pending requests exceeding timeout duration automatically reject with timeout error (Verified in `html/tests/engine.test.mjs#L494-L505`).
