# Lokarta: Come Into The Light — Performance & Architecture Optimization Report

## 1. Executive Summary

A comprehensive performance, memory, and runtime audit was conducted across the **Lokarta: Come Into The Light** codebase following recent refactoring efforts (data catalog extractions, dictionary dispatch tables, and Web Worker state decoupling). 

While the codebase demonstrates strong architectural boundaries—specifically separating background simulation and persistence into a Web Worker and driving game rules through decoupled JSON catalogs—there are **six key runtime bottlenecks and design issues** that impact framerate stability, memory footprint, garbage collection overhead, and input reliability.

This document details each identified issue, its root cause and performance implications, and concrete proposed solutions with implementation patterns.

---

## 2. Issues Breakdown & Proposed Solutions

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Runtime Hotspot Profile                                 │
│                                                                                        │
│   60 FPS Render Loop (Canvas)         10 Hz Tick Simulation         Client Persistence │
│   ┌───────────────────────────┐      ┌───────────────────────┐     ┌─────────────────┐ │
│   │ • Overdraw of dark tiles  │      │ • DOM rebuild (HUD)   │     │ • Unthrottled   │ │
│   │   (70-90% redundant calls)│      │ • A* array scans      │     │   IndexedDB     │ │
│   │                           │      │ • Raycast GC churn    │     │   transactions  │ │
│   │                           │      │ • Unbounded log DOM   │     │                 │ │
│   └───────────────────────────┘      └───────────────────────┘     └─────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Issue 1: High DOM Churn & Gesture Listener Breakage in HUDManager
- **Severity:** 🔴 Critical (Performance & Potential Input Defect)
- **Affected Files:**
  - [`html/app/hud-manager.js`](file:///Users/jarad/git/lokarta-v3/html/app/hud-manager.js#L40-L295)
  - [`html/app/app-controller.js`](file:///Users/jarad/git/lokarta-v3/html/app/app-controller.js#L278)

#### Root Cause
The engine simulation loop ticks at 10 Hz (`CONFIG.TICK_INTERVAL_MS = 100`). In [`LokartaApp.tick()`](file:///Users/jarad/git/lokarta-v3/html/app/app-controller.js#L222-L279), [`HUDManager.updateHUD()`](file:///Users/jarad/git/lokarta-v3/html/app/hud-manager.js#L40-L46) is invoked on every single tick.

Within `HUDManager`:
1. `renderStatusBars()`, `renderPaperdoll()`, `renderBackpack()`, and `renderHotbar()` completely replace their parent elements' `innerHTML` with string-interpolated template literals.
2. Every 100 ms, all 10 hotbar action buttons are destroyed and recreated.
3. Every 100 ms, `pointerdown`, `pointerup`, and `pointerleave` event listeners are attached to all 10 newly created action buttons (30 new listener closures created and attached every 100 ms = 300 event listeners allocated and GC-discarded per second).

#### Impact & Defects
1. **Broken GestureEngine Charging / Hold Gestures:**
   When a player presses and holds down on an action button to perform a charged cast or hold gesture ([`GestureEngine`](file:///Users/jarad/git/lokarta-v3/html/engine/gesture-engine.js)), the button element that captured the `pointerdown` event is removed from the DOM 100 ms later by `renderHotbar()`. As a result, subsequent `pointerup` or `pointerleave` events are dropped or fire on orphaned nodes, causing held abilities to misfire, cancel unexpectedly, or become stuck in an active charging state.
2. **Browser Layout Thrashing & GC Pauses:**
   Forcing the browser's HTML parser and layout engine to reconstruct dozens of DOM nodes 10 times per second causes continuous style recalculations, reflows, and frequent minor Garbage Collection (GC) pauses on lower-powered devices.

#### Proposed Solution
1. **Initialize DOM Structure Once:**
   Build the DOM skeleton for the status bars, hotbar slots, backpack slots, and paperdoll slots once during application startup.
2. **Selective Attribute & Text Mutations:**
   On tick, only update dynamic attributes on the pre-existing elements (e.g., element `.textContent`, `.style.width` for progress bars, and `.classList.toggle('on-cooldown')`).
3. **Container-Level Event Delegation:**
   Bind a single set of pointer listeners to the static `#hotbar-container` element using event delegation (`event.target.closest('.action-slot-btn')`), completely removing per-button listener allocations.

```javascript
// Proposed Event Delegation Pattern in app/hud-manager.js or app/input-controller.js
export function bindHotbarDelegation(hotbarContainer, gestureEngine) {
  hotbarContainer.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.action-slot-btn');
    if (!btn) return;
    e.preventDefault();
    const slotIndex = parseInt(btn.dataset.slotIndex, 10);
    gestureEngine.handleInputDown(slotIndex);
  });

  hotbarContainer.addEventListener('pointerup', (e) => {
    const btn = e.target.closest('.action-slot-btn');
    if (!btn) return;
    e.preventDefault();
    const slotIndex = parseInt(btn.dataset.slotIndex, 10);
    gestureEngine.handleInputUp(slotIndex);
  });
}
```

---

### Issue 2: Viewport Canvas Overdraw: Redundant Rendering of Unlit Tiles
- **Severity:** 🟠 High (60 FPS Framerate & CPU/GPU Bottleneck)
- **Affected Files:**
  - [`html/app/canvas-renderer.js`](file:///Users/jarad/git/lokarta-v3/html/app/canvas-renderer.js#L48-L68)
  - [`html/app/canvas-renderer.js`](file:///Users/jarad/git/lokarta-v3/html/app/canvas-renderer.js#L148-L168)
  - [`html/app/sprite-renderer.js`](file:///Users/jarad/git/lokarta-v3/html/app/sprite-renderer.js#L8-L70)

#### Root Cause
In [`CanvasRenderer.render()`](file:///Users/jarad/git/lokarta-v3/html/app/canvas-renderer.js#L32-L106):
1. **Step 1 (Tiles Layer):** Iterates over every tile coordinate in the camera viewport and unconditionally executes [`SpriteRenderer.drawTile()`](file:///Users/jarad/git/lokarta-v3/html/app/sprite-renderer.js#L253-L257). Each tile invocation executes 3 to 6 Canvas 2D context calls (`fillStyle`, `fillRect`, `strokeStyle`, `strokeRect`, `beginPath`, `lineTo`, `stroke`).
2. **Step 2 (Ground Items Layer):** Iterates over every tile coordinate in the camera viewport and renders items via [`SpriteRenderer.drawItem()`](file:///Users/jarad/git/lokarta-v3/html/app/sprite-renderer.js#L259-L274).
3. **Step 6 (renderLightMask):** Iterates over the exact same viewport tile coordinates, checks `if (!tile.isLit)`, and paints a solid black `#050608` rectangle directly over each unlit tile.

#### Impact
Given the player's vision radius of 10–14 tiles, on a typical 1080p browser window ($1920 \times 1080$ px at $32 \times 32$ px per tile $\approx 60 \times 34 = 2,040$ tiles), roughly **75% to 90% of the visible screen is shrouded in darkness**.
The renderer paints hundreds of tiles and ground items with complex paths and styling, only to immediately paint black over them in the lighting pass. At 60 FPS, this translates to over 100,000 wasted Canvas 2D API calls every second.

#### Proposed Solution
1. Clear the canvas with `#050608` once at the beginning of `render()`.
2. In the tile and ground item rendering loops, skip any tile where `!tile.isLit`:
```javascript
// Proposed Optimization in html/app/canvas-renderer.js
// 1. Tiles Layer
for (let y = startTileY; y <= endTileY; y++) {
  for (let x = startTileX; x <= endTileX; x++) {
    const tile = gridMap.tiles[y][x];
    if (!tile.isLit) continue; // Skip unlit tiles entirely!

    const screenX = x * CONFIG.GRID_SIZE - this.cameraX;
    const screenY = y * CONFIG.GRID_SIZE - this.cameraY;
    SpriteRenderer.drawTile(ctx, tile.type, screenX, screenY);
  }
}

// 2. Ground Items Layer
for (let y = startTileY; y <= endTileY; y++) {
  for (let x = startTileX; x <= endTileX; x++) {
    const tile = gridMap.tiles[y][x];
    if (!tile.isLit || tile.items.length === 0) continue; // Skip unlit items

    const screenX = x * CONFIG.GRID_SIZE - this.cameraX;
    const screenY = y * CONFIG.GRID_SIZE - this.cameraY;
    const topItem = tile.items[tile.items.length - 1];
    SpriteRenderer.drawItem(ctx, topItem, screenX, screenY);
  }
}
```
3. In `renderLightMask()`, remove the unlit tile loop entirely (as the clear color `#050608` already handles unlit areas) and only render the continuous radial darkness gradient and torch/spell auras.

---

### Issue 3: $O(N)$ Linear Scans & Allocations in A* Pathfinding
- **Severity:** 🟠 High (Simulation Tick Latency & CPU Spikes)
- **Affected Files:**
  - [`html/engine/entity-ai.js`](file:///Users/jarad/git/lokarta-v3/html/engine/entity-ai.js#L214-L288)

#### Root Cause
In [`EntityAI.findNextStepAStar()`](file:///Users/jarad/git/lokarta-v3/html/engine/entity-ai.js#L214-L288):
1. **Unsorted Array for `openSet`:**
   `openSet` is maintained as a standard Array. Finding the lowest $f$-score node requires an $O(N)$ linear loop over `openSet.length`, followed by `openSet.splice(lowestIndex, 1)` (an $O(N)$ memory shift).
2. **Linear Search for Neighbor Nodes:**
   For every neighbor of every visited node, the code executes:
   ```javascript
   let neighborNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
   ```
   This is an $O(N)$ scan per neighbor.
3. **Linear Collision Scan:**
   Inside `isBlocked()`, `otherMonsters.some(m => m.x === x && m.y === y)` is evaluated for each neighbor, iterating through all monsters on every step.

#### Impact
When 4 to 8 monsters are active and aggroed simultaneously, each monster running A* on a 10 Hz tick results in quadratic algorithmic overhead ($O(V^2)$). On a $40 \times 40$ map, `openSet` can contain dozens to hundreds of candidates, causing significant simulation tick time spikes and dropping simulation frequency below 10 Hz.

#### Proposed Solution
1. **Fast Coordinate Hashing / Lookup Map:**
   Index `openSet` nodes by integer hash key `y * 40 + x` in a `Map` or flat typed array for $O(1)$ neighbor lookup.
2. **Binary Min-Heap Priority Queue:**
   Store `openSet` nodes in a lightweight binary min-heap keyed by $f$-score, reducing extraction from $O(N)$ to $O(\log N)$ and insertion to $O(\log N)$.
3. **Precomputed Monster Occupancy Set:**
   Construct a single `Set<number>` of monster position hashes once at the beginning of [`EntityAI.updateMonsters()`](file:///Users/jarad/git/lokarta-v3/html/engine/entity-ai.js#L29-L58), allowing `isBlocked()` to check monster collision in $O(1)$ time rather than iterating through the monsters array repeatedly.

---

### Issue 4: Transient Object Allocations in Raycasting FOV System
- **Severity:** 🟡 Medium (Garbage Collection Pause Overhead)
- **Affected Files:**
  - [`html/engine/lighting-system.js`](file:///Users/jarad/git/lokarta-v3/html/engine/lighting-system.js#L100-L119)
  - [`html/engine/lighting-system.js`](file:///Users/jarad/git/lokarta-v3/html/engine/lighting-system.js#L151-L177)

#### Root Cause
In [`LightingSystem.castLightCircle()`](file:///Users/jarad/git/lokarta-v3/html/engine/lighting-system.js#L73-L95), rays are cast to the perimeter of the bounding box. For a radius of 10–14, this issues 80 to 112 rays every simulation tick (10 times/sec).

For each ray:
1. `castRay()` calls `getBresenhamLine(x0, y0, x1, y1)`.
2. `getBresenhamLine()` allocates a new array `points = []` and creates a coordinate object `{ x: currX, y: currY }` for every step along the line.
3. `castRay()` loops through this array, performing `Math.hypot(pt.x - x0, pt.y - y0)`.

#### Impact
This generates roughly 1,000 to 1,500 short-lived objects per tick, or **10,000 to 15,000 ephemeral objects per second**. This places unnecessary pressure on the V8 young-generation garbage collector (Scavenge GC), causing periodic micro-stutters during player movement.

#### Proposed Solution
Inline the Bresenham line stepping directly inside `castRay()` without creating an array or `{x, y}` point objects:

```javascript
// Proposed Inlined Raycaster in html/engine/lighting-system.js
static castRay(gridMap, x0, y0, x1, y1, maxRadius) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;
  const maxRadiusSq = (maxRadius + 0.5) * (maxRadius + 0.5);

  while (true) {
    const distSq = (currX - x0) * (currX - x0) + (currY - y0) * (currY - y0);
    if (distSq > maxRadiusSq) break;

    const tile = gridMap.getTile(currX, currY);
    if (!tile) break;

    tile.isLit = true;
    const dist = Math.sqrt(distSq);
    const intensity = Math.max(0, 1 - dist / (maxRadius + 1));
    tile.lightIntensity = Math.max(tile.lightIntensity, intensity);

    if (gridMap.isWall(currX, currY) && (currX !== x0 || currY !== y0)) {
      break;
    }

    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }
}
```

---

### Issue 5: Unbounded DOM Accumulation in Combat Log
- **Severity:** 🟡 Medium (Memory Leak / DOM Bloat)
- **Affected Files:**
  - [`html/app/hud-manager.js`](file:///Users/jarad/git/lokarta-v3/html/app/hud-manager.js#L309-L320)

#### Root Cause
In [`HUDManager.logCombat()`](file:///Users/jarad/git/lokarta-v3/html/app/hud-manager.js#L309-L320):
```javascript
static logCombat(combatLogScrollEl, message, category = 'system') {
  if (!combatLogScrollEl) return;
  // ...
  const line = document.createElement('div');
  line.className = `log-line log-${category}`;
  line.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-msg">${HUDManager.escapeHtml(message)}</span>`;

  combatLogScrollEl.appendChild(line);
  combatLogScrollEl.scrollTop = combatLogScrollEl.scrollHeight;
}
```
Each game event (attacks, damage, player footsteps, stairs, leveling, item pickups) appends a new child element to `#log-entries-container`. There is no upper bound or pruning logic.

#### Impact
During a typical 20-floor playthrough, the combat log accumulates thousands of DOM nodes. This increases memory consumption and progressively degrades layout and scroll calculation performance whenever `scrollTop = scrollHeight` is updated.

#### Proposed Solution
Cap the total number of log elements to a fixed threshold (e.g., 100 or 150 items). When appending a new line causes the child count to exceed the maximum, prune the oldest element from the top:

```javascript
// Proposed Ring Buffer Pruning in html/app/hud-manager.js
const MAX_LOG_LINES = 100;

static logCombat(combatLogScrollEl, message, category = 'system') {
  if (!combatLogScrollEl) return;
  // ...
  combatLogScrollEl.appendChild(line);

  while (combatLogScrollEl.childElementCount > MAX_LOG_LINES) {
    combatLogScrollEl.removeChild(combatLogScrollEl.firstElementChild);
  }

  combatLogScrollEl.scrollTop = combatLogScrollEl.scrollHeight;
}
```

---

### Issue 6: Unthrottled Worker IPC & IndexedDB Save Transactions
- **Severity:** 🟡 Medium (I/O & Worker Message Saturation)
- **Affected Files:**
  - [`html/app/app-controller.js`](file:///Users/jarad/git/lokarta-v3/html/app/app-controller.js#L637-L643)
  - [`html/worker/game-client.js`](file:///Users/jarad/git/lokarta-v3/html/worker/game-client.js#L48-L51)
  - [`html/worker/game-worker.js`](file:///Users/jarad/git/lokarta-v3/html/worker/game-worker.js#L97-L110)

#### Root Cause
[`LokartaApp.persistSave()`](file:///Users/jarad/git/lokarta-v3/html/app/app-controller.js#L637-L643) is called directly upon every inventory action (consuming potions, equipping items, moving items, picking up floor items, descending stairs).
Each invocation sends a `saveCharacter` RPC to the Web Worker via `postMessage`, cloning the entire `player` entity via the structured clone algorithm and opening an IndexedDB `readwrite` transaction to put the player record.

#### Impact
When a player rapidly drinks multiple potions or walks over a cluster of floor items, multiple `saveCharacter` messages are dispatched in rapid succession (<100 ms apart). This leads to redundant structured clone serialization, message queuing, and consecutive disk I/O transactions in IndexedDB.

#### Proposed Solution
Implement a trailing-edge debounce on auto-saves (e.g., 500 ms to 1,000 ms), with an immediate flush on critical milestones (descending stairs, leveling up, player defeat, or page unload):

```javascript
// Proposed Debounced Save Pattern in app/app-controller.js
export class LokartaApp {
  // ...
  persistSave(immediate = false) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    if (immediate) {
      return this._executeSave();
    }

    this.saveDebounceTimer = setTimeout(() => {
      this._executeSave();
    }, 750);
  }

  async _executeSave() {
    try {
      await this.gameClient.saveCharacter(this.player);
    } catch (err) {
      console.warn('Auto-save error:', err);
    }
  }
}
```

---

## 3. Priority Matrix & Implementation Roadmap

| Priority | Issue | Area | Impact | Complexity | Risk |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **P1** | **Issue 1: DOM Churn & Gesture Listener Breakage** | [`HUDManager`](file:///Users/jarad/git/lokarta-v3/html/app/hud-manager.js) | Prevents dropped input, eliminates layout thrashing | Medium | Low |
| **P1** | **Issue 2: Viewport Canvas Overdraw** | [`CanvasRenderer`](file:///Users/jarad/git/lokarta-v3/html/app/canvas-renderer.js) | Cuts ~80% of canvas draw calls at 60 FPS | Low | Very Low |
| **P2** | **Issue 3: A* Pathfinding Allocations & Complexity** | [`EntityAI`](file:///Users/jarad/git/lokarta-v3/html/engine/entity-ai.js) | Eliminates $O(V^2)$ simulation latency spikes | Medium | Low |
| **P2** | **Issue 4: Raycasting Allocation Churn** | [`LightingSystem`](file:///Users/jarad/git/lokarta-v3/html/engine/lighting-system.js) | Eliminates 10k–15k object allocations/sec | Low | Very Low |
| **P3** | **Issue 5: Unbounded Combat Log Accumulation** | [`HUDManager`](file:///Users/jarad/git/lokarta-v3/html/app/hud-manager.js) | Prevents DOM bloating and long-term memory leaks | Very Low | None |
| **P3** | **Issue 6: Auto-Save Debouncing** | [`LokartaApp`](file:///Users/jarad/git/lokarta-v3/html/app/app-controller.js) | Smooths out IPC and IndexedDB write volume | Low | None |

---

## 4. Verification & Testing Strategy

To ensure that performance optimizations maintain functional correctness:
1. **Unit Test Suite:** Run the Node.js test runner to verify engine math, lighting rules, combat multipliers, and determinism remain intact:
   ```bash
   node --test html/tests/engine.test.mjs html/tests/audio.test.mjs html/tests/submodules.test.mjs html/tests/app-modules.test.mjs html/tests/data-catalogs.test.mjs
   ```
2. **Browser DevTools Profiling:**
   - **Performance Tab:** Measure frame rate stability and verify reduction in scripting/rendering time per frame (target: < 2 ms render frame time).
   - **Memory Tab:** Take timeline allocation profiles to verify Scavenge GC frequency decreases by at least 80%.
   - **DOM Inspection:** Confirm hotbar button DOM nodes remain persistent during simulation ticks and combat log element count stabilizes at the defined cap.
