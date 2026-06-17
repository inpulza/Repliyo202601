---
name: Vite dev middleware starved by slow API in same process
description: Why "Failed to fetch dynamically imported module" crashes can be caused by a slow/heavy Express endpoint, not a stale chunk
---

In this repo the Vite dev server runs **in the same Node process** as the Express backend (single event loop). A slow or heavy API response therefore blocks Vite's module-serving middleware too.

**Symptom:** Browser throws `Failed to fetch dynamically imported module: .../SomeComponent.tsx` and the app white-screens (no error boundary on the lazy routes). Looks transient/stale-chunk, but recurs on every load.

**Real cause we hit:** an endpoint returning a huge payload synchronously serialized to JSON (e.g. `GET /api/messages` returning ~40k rows in ~78s) saturated the event loop, so the dynamic `import()` of the lazy route timed out → crash.

**How to diagnose:** check the workflow log for an `[express] GET ... <big-ms>ms` line whose timestamp lines up with the import failure. Multi-second API responses next to a module-fetch failure = event-loop starvation, not a chunk problem.

**Fixes that worked:**
- Eliminate the heavy query if its data is unused. The global `messages` array was fetched into context and destructured but never read — pure dead weight.
- Resilience layer: wrap `React.lazy` with retry + one-time `window.location.reload()` (`lazyWithRetry` in `client/src/App.tsx`) so transient import failures self-recover instead of white-screening.

**Why:** front-end-only retries can't fix a backend that keeps blocking the loop on every reload; you must remove/limit the slow endpoint. Prefer per-conversation/paginated fetches over whole-table eager loads.
