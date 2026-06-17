---
name: Zernio API conventions
description: Param naming, status values, base URL and observer-mode rules for the Zernio Inbox/WhatsApp API used by Repliyo.
---

# Zernio API conventions (Inbox / WhatsApp)

Full registered docs live in the repo: `docs/zernio/ZERNIO_API_REFERENCE.md` (curated) and `docs/zernio/zernio-llms-full.txt` (verbatim official dump from https://docs.zernio.com/llms-full.txt). Refresh via `llms-full.txt`.

## Durable lessons (verified live 2026-06-17)

- **All Inbox params are camelCase**: `accountId`, `profileId`, `sortOrder`. NOT snake_case. A snake_case `account_id` on `GET /inbox/conversations` does NOT error — it's silently ignored (accountId is optional there), so the call returns ALL accounts' conversations unscoped and *looks* like it works. On `GET .../messages` accountId is **required** → snake_case there returns "accountId required". **Why:** this exact subtlety wasted a debugging cycle and produced a misleading "snake_case works on conversations" conclusion.
- **`status` only accepts `active` | `archived`.** `open` returns 400 "status is invalid".
- **Base URL:** official docs say `https://zernio.com/api/v1`; our adapter/probe use `https://api.zernio.com/v1` which ALSO returns real data. Both resolve. Prefer official as fallback if behavior is odd.
- **Update status is `PUT /inbox/conversations/{id}`** (not POST), body `{accountId, status}`.
- **403 `INBOX_REQUIRED`** = the Zernio token/account lacks the Inbox addon. Fix is account-side (new token with Inbox enabled), not code.

## Observer mode (read-only) — safe vs unsafe endpoints
- SAFE (no client-visible side effects): `GET /inbox/conversations`, `GET /inbox/conversations/{id}`, `GET /inbox/conversations/{id}/messages` (explicitly does NOT mark read).
- UNSAFE for observer: `POST .../read` (blue ticks), `POST .../typing` (also marks read), `POST .../messages` & `POST /inbox/conversations` (send), `PUT /inbox/conversations/{id}` (archive).

## Inpulza IDs
- `ZERNIO_WHATSAPP_ACCOUNT_ID=6a05d9385e333c0529696d05` is the real Zernio accountId.
- `ZERNIO_WHATSAPP_BLOG_ID=4074962` is Repliyo's `metricool_blog_id` for the Inpulza brand (Repliyo-side scoping key), NOT a Zernio ID. Repliyo brand id `72307812-2edb-43a6-884b-e19f1a9cf200`.
