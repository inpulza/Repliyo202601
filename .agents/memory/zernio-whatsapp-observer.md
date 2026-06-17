---
name: Zernio WhatsApp read-only observer
description: How the read-only WhatsApp observer is gated/activated and the platform-name coupling caveat for its no-send guards.
---

# Zernio WhatsApp read-only observer

Read-only sync of WhatsApp conversations from Zernio into the Repliyo Inbox, wired into the existing `syncService` sync loop (reuses `upsertConversation`/`upsertMessage`). Dormant by default.

## Activation (deliberate, three conditions)
- Env `ZERNIO_OBSERVER_ENABLED=1` **and** brand's `metricoolBlogId` === `4074962` (Inpulza = brand id `72307812-2edb-43a6-884b-e19f1a9cf200`, NOT 9328112e), overridable via `ZERNIO_WHATSAPP_BLOG_ID`.
- **Third gate:** brand must have a `social_accounts` row `provider='WHATSAPP'` with `is_active=true`. `getActiveProviders` only returns active rows; gating silently returns empty otherwise.
- **Two-step manual activation by design:** the `/social-accounts/refresh` endpoint auto-detects WhatsApp via Zernio (only when flag on + blogId match) but inserts it `isActive=false`. An admin must then toggle it on (or set `is_active=true` directly). Until then the observer stays dormant even with the flag on.
- With the flag unset, the WhatsApp feed returns empty → zero behavior change.

## Verified live (supervised test)
Confirmed working: observer imported Inpulza WhatsApp conversations as `source='zernio_sync'` (inbound + the brand's own historical outbound replies), logs show `auto-reply disabled for read-only mode`, and a DB check found **0** Repliyo-generated/sent messages (`source IN repliyo_auto/manual` or `internal_origin IN ai/manual/meta_private_reply`). Read-only guarantee held.

## Syncing one brand without the full cycle
The 2-min auto cycle processes 10 brands sequentially; brand `1e13d4a8` (solidaridadsinfronteras) has huge comment volume and the dev server auto-restarts (vite) reset the cycle before it reaches Inpulza. To force a single-brand sync, run a one-off tsx script importing `{ syncService }` and calling `syncService.syncBrandById(brandId)` — constructor has no side effects (timers start only via explicit `start()`). Pass `ZERNIO_OBSERVER_ENABLED=1` inline (dev-scoped env vars aren't in the interactive shell). Running it concurrently with the live workflow causes benign `messages_metricool_id_unique` collisions (dedupe race, no data loss).

## Read-only is enforced on 4 send paths
auto-reply (skipped), follow-up reminders (skipped/cancelled), and the two manual reply API endpoints (return 400 for WhatsApp).

## Caveat — guards key on `platform === 'whatsapp'`, not on source/origin
**Why it matters:** the no-send guards (auto-reply skip, reminder skip, reply-endpoint block) all test `platform === 'whatsapp'`. If WhatsApp is ever connected via **Metricool** (WhatsApp Business) in the future, those messages would *also* be treated as read-only and silently blocked from sending.
**How to apply:** acceptable today because no brand uses Metricool WhatsApp. If Metricool WhatsApp is ever enabled, switch the read-only guards to key on message `source` (e.g. `zernio_sync`) instead of platform name.

## Dedupe
WhatsApp messages set `metricoolId = zernio:<scope>:<convId>:<msgId>` (namespaced so they never collide with real Metricool ids) and `source = 'zernio_sync'` (keeps them out of Metricool's reconciliation path). `upsertMessage` only dedupes when `metricoolId` is set — without it, duplicates every 2-min cycle.
