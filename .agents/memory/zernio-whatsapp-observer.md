---
name: Zernio WhatsApp read-only observer
description: How the read-only WhatsApp observer is gated/activated and the platform-name coupling caveat for its no-send guards.
---

# Zernio WhatsApp read-only observer

Read-only sync of WhatsApp conversations from Zernio into the Repliyo Inbox, wired into the existing `syncService` sync loop (reuses `upsertConversation`/`upsertMessage`). Dormant by default.

## Activation (deliberate, two conditions)
- Env `ZERNIO_OBSERVER_ENABLED=1` **and** brand's `metricoolBlogId` === `4074962` (Inpulza), overridable via `ZERNIO_WHATSAPP_BLOG_ID`. Also requires WhatsApp listed in the brand's active providers.
- With the flag unset, the WhatsApp feed returns empty → zero behavior change.

## Read-only is enforced on 4 send paths
auto-reply (skipped), follow-up reminders (skipped/cancelled), and the two manual reply API endpoints (return 400 for WhatsApp).

## Caveat — guards key on `platform === 'whatsapp'`, not on source/origin
**Why it matters:** the no-send guards (auto-reply skip, reminder skip, reply-endpoint block) all test `platform === 'whatsapp'`. If WhatsApp is ever connected via **Metricool** (WhatsApp Business) in the future, those messages would *also* be treated as read-only and silently blocked from sending.
**How to apply:** acceptable today because no brand uses Metricool WhatsApp. If Metricool WhatsApp is ever enabled, switch the read-only guards to key on message `source` (e.g. `zernio_sync`) instead of platform name.

## Dedupe
WhatsApp messages set `metricoolId = zernio:<scope>:<convId>:<msgId>` (namespaced so they never collide with real Metricool ids) and `source = 'zernio_sync'` (keeps them out of Metricool's reconciliation path). `upsertMessage` only dedupes when `metricoolId` is set — without it, duplicates every 2-min cycle.
