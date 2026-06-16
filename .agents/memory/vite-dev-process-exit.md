---
name: Vite dev customLogger process.exit footgun
description: Why the dev server (and whole app) can "crash with a runtime error" in setupVite
---
The Replit vite dev template wires `createViteServer({ customLogger: { error: (msg) => { viteLogger.error(msg); process.exit(1) } } })` in `server/index-dev.ts`.

**Symptom:** App "crashes with a runtime error" / preview shows ERR_CONNECTION_REFUSED, workflow goes to `failed`. Any transient Vite error (transform error in a requested module, HMR hiccup, optimize-dep error) calls the logger's `error` → `process.exit(1)` → the ENTIRE backend dies (Express API + sync service + ws), not just the request.

**Why:** This is especially dangerous for heavy apps (huge lazy components, many deps, constant HMR) where transient Vite errors are common.

**How to apply:** In `server/index-dev.ts` keep `viteLogger.error(msg, options)` but DELETE the `process.exit(1)`. Vite's browser runtime-error overlay still surfaces transform errors to the developer; the backend stays alive.

**Note (false lead):** A landing page stuck on a black splash (logo + animated dots) is usually NOT the crash — it's `LandingPage`'s own 1.2s splash (`useState(loading=true)` + `setTimeout(()=>setLoading(false),1200)`), captured by the screenshot tool within its window after the auth round-trip. The real crash is the process.exit above.
