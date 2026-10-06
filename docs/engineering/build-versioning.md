# Per-Deployment Cache Flush & Build Versioning

Lokarta is a static, zero-backend game. After a rebuild/redeploy an existing
browser window must run the **newly deployed build** and drop stale client-side
state — even though HTTP caches, a warm ES-module graph, IndexedDB, and service
workers can all pin the previous version. This document describes the mechanism
([LIV-27](/LIV/issues/LIV-27)).

## Mechanism at a glance

1. **Generate a build id at build/deploy time** into `html/build-id.json`.
2. **`boot.js` fetches that manifest with `cache: 'no-store'`** (bypassing the
   HTTP cache) before loading the game bundle.
3. **Compare** the deployed id against the id this browser last ran
   (`localStorage["lokarta.buildId"]`).
4. **On mismatch**: hard-flush client state, then clean-reload once into the new
   build. Repeated loads of the same build are stable.
5. **A network-first service worker** (`sw.js`) re-fetches every same-origin
   script/style/document/JSON from the network so nested ES module imports can
   never be pinned to a stale HTTP-cached copy.

## 1. Build id generation

`tools/write-build-id.mjs` writes the manifest:

```json
{ "buildId": "9f889b4-20261005T184500Z", "builtAt": "2026-10-05T18:45:00.000Z", "source": "git" }
```

Source priority: `LOKARTA_BUILD_ID` env override → `git rev-parse --short HEAD`
plus a UTC timestamp → bare UTC timestamp.

- **Local dev / `run.sh`** runs the generator before starting the server, so
  restarting the server (a local "redeploy") produces a new id and flushes stale
  clients on their next reload.
- **CI / GitHub Pages** (`.github/workflows/deploy.yml`) runs
  `node tools/write-build-id.mjs --out _site` after copying `html/` and uploads
  the result. The generated `html/build-id.json` is git-ignored.
- The build id is **not** committed; it must be regenerated on each deploy.

## 2. Boot flow (`html/boot.js`)

`index.html` loads `boot.js` instead of `app.js`. Boot:

1. Calls `ensureCurrentBuild()` (`html/services/build-version.js`).
   - current build → no-op, stamps `localStorage` and continues;
   - mismatch → flush + `location.replace('<page>?v=<id>&flushed=<id>')`.
2. Surfaces the id: `document.documentElement.dataset.buildId`,
   `window.__LOKARTA_BUILD_ID__`, and the header engine badge
   (`v2.3 · <short-id>`).
3. Registers the network-first service worker (`sw.js`), which re-fetches all
   same-origin assets (styles, scripts, JSON) so none are pinned to a stale
   HTTP cache.
4. `import('./app.js?v=<buildId>')`.

Because the manifest fetch is `no-store` and the guard lives in *both*
`sessionStorage` and the reload URL, detection works even when the surrounding
HTML/JS is still being served from a warm cache.

## 3. What the flush clears

`flushClientState()` clears, best-effort and independently:

- `localStorage`
- `sessionStorage`
- every IndexedDB database (`lokarta_browser_db`, or
  `indexedDB.databases()` when supported)
- every CacheStorage cache
- **stale/foreign service workers** whose script URL is not the current
  `sw.js`. The current network-first worker is intentionally retained so the
  subsequent clean reload fetches fresh modules.

This resets saved player state during active development, which is the accepted
trade-off.

## 4. Loop safety (idempotent, no infinite reload)

A mismatch normally flushes once. The mechanism refuses to reload twice for the
same deployed build:

- The **session guard** (`lokarta.buildFlushGuard`) records the build id that
  was flushed.
- The **reload URL token** (`?flushed=<id>`) is a storage-independent backup for
  private mode / blocked storage.
- If the deployed id is still newer than the stored id but either guard matches
  it, boot switches to **recover**: it adopts the new id and continues loading
  without another reload.

A brand-new visitor with no persisted state is *not* reloaded; only visitors
with real legacy state get the one-time flush.

## 5. How to verify a flush occurred

1. Open the preview and note the header badge (`v2.3 · <short-id>`) and
   `window.__LOKARTA_BUILD_ID__`.
2. Ask engineering/CI to trigger a redeploy (or locally run `./run.sh` again,
   then stop/start your server) so `build-id.json` changes.
3. Reload the **same** tab (not incognito). The page should reload once and the
   badge / `__LOKARTA_BUILD_ID__` should show the **new** id.
4. In DevTools → Application: `localStorage` and `sessionStorage` are reset
   (only `lokarta.buildId` and `lokarta.buildFlushGuard` remain), IndexedDB
   `lokarta_browser_db` is gone and rebuilt on demand, and the console may log
   the flush.
5. Reload again: the build is now stable (no further reload, same id).

## 6. Files

| File | Role |
| --- | --- |
| `tools/write-build-id.mjs` | Generates `build-id.json`. |
| `html/build-id.json` | Generated per-deploy manifest (git-ignored). |
| `html/services/build-version.js` | Pure decision logic + injected-env orchestrator/flush. |
| `html/boot.js` | Entry point: version check, badge, SW registration, bundle import. |
| `html/sw.js` | Network-first freshness service worker. |
| `html/tests/build-version.test.mjs` | T0 coverage for the guard, flush, and tool. |

## 7. Limitations

- The service worker requires a secure context (HTTPS or `localhost`); GitHub
  Pages and `run.sh` both qualify.
- On a static host the browser's HTTP cache cannot be cleared from script, so the
  network-first worker — not the flush — is what guarantees fresh nested modules.
  The flush guarantees fresh *state*.
- The very first deploy of this mechanism may require one manual hard refresh for
  browsers that cached the old `index.html`; every deploy after that is handled
  automatically.
