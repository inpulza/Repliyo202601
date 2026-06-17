# Zernio WhatsApp API Reference for Repliyo

Last updated: 2026-06-17

This note records the public Zernio docs plus the live Replit/Cowork findings used by the Repliyo WhatsApp integration. It intentionally contains no tokens or secrets.

## Practical Summary

For Repliyo, the WhatsApp integration goes through Zernio's Inbox API.

- Use the Zernio WhatsApp account ID as `accountId`.
- Keep Repliyo's `blogId` separate; it is only the internal brand mapping key.
- Start with read-only observer mode. Do not send, mark read, or typing until those write paths are separately verified.
- Webhooks should be treated as event notifications; persist fast, dedupe, and process in background.

## Sources

- Quickstart: https://docs.zernio.com/
- LLMS full docs: https://docs.zernio.com/llms-full.txt
- WhatsApp guide: https://docs.zernio.com/platforms/whatsapp
- WhatsApp Inbox: https://docs.zernio.com/platforms/whatsapp/inbox
- List conversations: https://docs.zernio.com/messages/list-inbox-conversations
- Send message: https://docs.zernio.com/messages/send-inbox-message
- Typing indicator: https://docs.zernio.com/messages/send-typing-indicator
- Webhooks: https://docs.zernio.com/webhooks
- Create webhook: https://docs.zernio.com/webhooks/create-webhook-settings
- MCP: https://docs.zernio.com/mcp

## Environment Variables

Zernio docs call the key `ZERNIO_API_KEY`. Repliyo currently uses `ZERNIO_API_TOKEN`. They mean the same thing in our code: a Zernio Bearer token.

```txt
ZERNIO_API_TOKEN=<secret from Replit Secrets>
ZERNIO_WHATSAPP_ACCOUNT_ID=6a05d9385e333c0529696d05
ZERNIO_WHATSAPP_BLOG_ID=4074962
```

Do not log or commit the token.

## Inpulza IDs

| Field | Value | Meaning |
|---|---|---|
| Zernio WhatsApp Account ID | `6a05d9385e333c0529696d05` | Use as Zernio `accountId` |
| Zernio Profile ID | `6a05cc575c12d354ea079800` | Zernio profile/container, not the WhatsApp account |
| Meta WABA ID | `1341770383558206` | Only for direct Meta Cloud API work |
| Meta Phone Number ID | `768139726373250` | Only for direct Meta Cloud API work |
| Repliyo blogId | `4074962` | Internal Repliyo brand mapping |

## Base URL

Public docs show:

```txt
https://zernio.com/api/v1
```

The Repliyo adapter defaults to:

```txt
https://api.zernio.com/v1
```

Keep `ZERNIO_API_BASE_URL` configurable. If one host fails, verify the other before changing logic.

## Read Conversations

Official endpoint:

```http
GET /v1/inbox/conversations
```

Official docs list these useful query params:

- `accountId`
- `profileId`
- `platform`
- `status`: `active` or `archived`
- `sortOrder`: `asc` or `desc`
- `limit`
- `cursor`

Live Replit finding, 2026-06-17:

- `status=open` fails with `400 status is invalid`.
- `status=active` works.
- The live conversations endpoint accepted `account_id` in the current probe, even though the docs list `accountId`.

Current Repliyo read shape:

```http
GET /v1/inbox/conversations?account_id={accountId}&status=active&limit=50&sort_order=desc
```

If this regresses, test camelCase `accountId` and `sortOrder` against Zernio before changing broader code.

## Read Messages

Official endpoint:

```http
GET /v1/inbox/conversations/{conversationId}/messages
```

Live Replit finding, 2026-06-17:

- This endpoint requires `accountId` camelCase.
- `account_id` fails with `400 accountId query parameter is required`.

Current Repliyo read shape:

```http
GET /v1/inbox/conversations/{conversationId}/messages?accountId={accountId}&limit=20&sort_order=asc
```

If this regresses, the next small probe change should test `sortOrder=asc`.

## Send Message

Official endpoint:

```http
POST /v1/inbox/conversations/{conversationId}/messages
```

Official body shape:

```json
{
  "accountId": "zernio_account_id",
  "message": "text"
}
```

Do not enable sending until the write path is tested separately. WhatsApp free-form replies only work inside the 24-hour customer-service window; outside that window, use an approved WhatsApp template.

## Typing Indicator

Official endpoint:

```http
POST /v1/inbox/conversations/{conversationId}/typing
```

Official body shape:

```json
{
  "accountId": "zernio_account_id"
}
```

Important: Zernio docs say WhatsApp typing requires a recent inbound message and can mark that message as read as a side effect. Do not use typing in read-only observer mode.

## Webhooks

Use webhooks after the read-only polling/probe path is stable.

Useful events:

- `message.received`
- `conversation.started`
- `message.sent`
- `message.delivered`
- `message.read`
- `message.failed`
- `reaction.received`

Webhook rules:

- Return `2xx` within 5 seconds.
- Treat deliveries as at-least-once.
- Dedupe by `payload.id` or `X-Zernio-Event-Id`.
- If a webhook secret is set, verify `X-Zernio-Signature` as HMAC-SHA256 over the raw body.

Create webhook:

```http
POST /v1/webhooks/settings
```

Minimum body:

```json
{
  "name": "Repliyo WhatsApp Observer",
  "url": "https://<app>/webhook/zernio",
  "events": ["message.received", "conversation.started"],
  "secret": "<secret>"
}
```

## MCP

Zernio MCP exists at:

```txt
https://mcp.zernio.com/mcp
```

Use MCP/Cowork for live endpoint investigation, but keep Repliyo production paths implemented through the REST adapter and covered by small PRs.

## Known Traps

1. `Profile ID` is not `Account ID`.
2. Repliyo `blogId` is not a Zernio ID.
3. A valid token can still lack Inbox permission.
4. `403 INBOX_REQUIRED` means the token/account reached Zernio, but Inbox access is not active for that key/account.
5. `status=open` is invalid; use `active`.
6. Messages require `accountId` camelCase.
7. The docs use camelCase params, but the live conversations endpoint accepted snake_case in the current probe.
8. Typing indicator is not read-only because it can mark messages as read.
9. Webhooks can be retried; handlers must be idempotent.

## PR Rules For This Integration

- Probe PRs: only GET requests.
- Observer PRs: read/persist/display, no sending.
- Manual approval PRs: drafts and approved sends only.
- Auto-send: separate later phase with guardrails and rollback.
- Do not mix read fixes with write fixes.
- Verify any Zernio parameter mismatch with a live probe before broad adapter changes.
