---
name: facebook-private-replies
description: Configure and implement Facebook and Instagram Private Replies (sending DMs to users who comment on Facebook posts/Reels/videos or Instagram posts) for a Repliyo brand account. Use when setting up a new Facebook or Instagram page connection, troubleshooting private reply errors, adding a new brand/account, or debugging Facebook Messenger Platform API issues. Covers Facebook Developer Portal setup, token generation, Replit secrets, Instagram Business Account ID lookup, and technical implementation details for both platforms.
---

# Private Replies — Facebook & Instagram (Repliyo)

Allows agents to send private DMs to users who comment on a brand's Facebook or Instagram posts, directly from the Repliyo inbox.

---

## Platform Comparison

| | Facebook Pages | Instagram Business |
|---|---|---|
| **Status** | ✅ Implemented (Mar 2026) | 🔄 Pending implementation |
| **Endpoint** | `POST /{page-id}/messages` | `POST /{ig-user-id}/messages` |
| **Recipient param** | `recipient.comment_id` | `recipient.comment_id` |
| **Token** | Page Access Token | Same Page Access Token (if IG linked to Page) |
| **Key permission** | `pages_messaging` | `instagram_manage_messages` |
| **Where DM arrives** | User's Messenger inbox | User's Instagram DM inbox |
| **Max age** | 7 days from comment | 7 days from comment |
| **Max sends** | 1 per comment | 1 per comment |
| **Follow-ups** | Only if user replies (24h window) | Only if user replies (24h window) |

---

## Key Files

| File | Role |
|---|---|
| `server/services/metaService.ts` | `sendPrivateReply()` — calls Facebook/Instagram API |
| `server/routes.ts` | `POST /api/messages/:id/private-reply` — ID extraction + routing |
| `client/src/components/AIAgentConfig.tsx` | UI to connect/manage Facebook pages |
| `shared/schema.ts` | `meta_page_connections` table |

---

# PHASE 1 — Facebook (COMPLETE ✅)

## Facebook Developer Portal Setup (once per Meta App)

### Step 1 — Create a Meta App
1. Go to https://developers.facebook.com/apps
2. Click **Create App** → Select **Business** type
3. Fill in app name and contact email
4. Connect to a Business Portfolio if available

### Step 2 — Add Messenger Product
App dashboard → **Add Product** → **Messenger** → Set Up

### Step 3 — Request Required Permissions
Go to **App Review → Permissions and Features** and request:

| Permission | Purpose |
|---|---|
| `pages_messaging` | **Required** — send messages from page |
| `pages_read_engagement` | Read comments |
| `pages_manage_metadata` | Page configuration |
| `pages_show_list` | List pages the user manages |

> For development/testing, these work without App Review as long as the token belongs to an Admin of the app. For production with external users, App Review is required.

### Step 4 — Generate a User Access Token
1. Go to https://developers.facebook.com/tools/explorer
2. Select your app → Click **Generate Access Token**
3. Check: `pages_messaging`, `pages_read_engagement`, `pages_manage_metadata`, `pages_show_list`
4. Copy the token — this is a **short-lived User Token (2 hours)** — the system auto-exchanges it for a permanent Page Token

### Step 5 — Find the Facebook Page ID
- Option A: Facebook page → **About** → scroll to "Page ID"
- Option B: Graph API Explorer → `GET /me/accounts` → returns all pages with IDs

## Repliyo Configuration (per brand)

### Step 1 — Create the Replit Secret
```
META_{BRAND_NAME_UPPERCASE}_USER_TOKEN = <short-lived user token>
```
Example: `META_JORDAN_INPULZA_USER_TOKEN`

Use the `environment-secrets` skill to set this in Replit's secret manager.

### Step 2 — Auto-Connect
The system reads all `META_*_USER_TOKEN` env vars at startup, exchanges them for permanent Page Tokens, and stores them in `meta_page_connections`. Restart the app after adding a new secret.

### Step 3 — Verify via UI
1. Brand Settings → AI Agent Config → **Private Replies** tab
2. Page should appear automatically
3. Click **Check Permissions** — confirm `pages_messaging` shows ✓
4. Set page as **Active**

## Token Flow

```
Short-lived User Token (2h)  [Replit Secret]
    ↓  GET /oauth/access_token?grant_type=fb_exchange_token
Long-lived User Token (60 days)
    ↓  GET /me/accounts
Page Access Token (PERMANENT, expires_at = 0)  [meta_page_connections DB]
```

## Comment ID Extraction — Critical

Metricool stores comment IDs in compound format `{postId}_{commentId}`:
```
122200652672575116_884686284607817  →  only need: 884686284607817
```

**⚠️ Permalink `comment_id` is UNRELIABLE** — some permalinks contain `comment_id=POSTID` instead of the actual comment ID (e.g., Melva Vidal's comment had `comment_id=122200710758575116` which was the post ID, not the comment). Always prioritize the compound split.

Code in `server/routes.ts` and `server/services/syncService.ts`:
```typescript
const rawCommentId = rawData?.id || rawData?.root?.id || message.metricoolId;

// Priority 1: extract from compound POSTID_COMMENTID (always reliable)
const extractedFromCompound = rawCommentId.includes('_') ? rawCommentId.split('_').pop() : null;

// Priority 2 fallback: permalink comment_id (unreliable — may contain post ID)
const permalinkMatch = (rawData?.root?.properties?.permalink || rawData?.properties?.permalink || '')
  .match(/comment_id=(\d+)/);

let commentId: string;
if (extractedFromCompound) {
  commentId = extractedFromCompound;
} else if (permalinkMatch) {
  commentId = permalinkMatch[1];
} else {
  commentId = rawCommentId;
}
```

## Facebook API Call

```
POST https://graph.facebook.com/v19.0/{PAGE_ID}/messages
Authorization: Bearer {PAGE_ACCESS_TOKEN}
Content-Type: application/json

{
  "recipient": { "comment_id": "884686284607817" },
  "message": { "text": "Tu mensaje aquí" },
  "messaging_type": "RESPONSE"
}
```

> **Why not `/{comment-id}/private_replies`?** That's the old 2016 endpoint. It does NOT work for Reels and videos. The Messenger Platform Send API is the modern standard used by Respond.io, ManyChat, etc.

## New Brand Account Checklist (Facebook)

- [ ] Generate User Access Token in Graph API Explorer with correct permissions
- [ ] Create Replit Secret: `META_{BRAND}_USER_TOKEN`
- [ ] Restart the app so auto-connect reads the new secret
- [ ] Verify page appears in AIAgentConfig → Private Replies tab
- [ ] Click "Check Permissions" — confirm `pages_messaging` ✓
- [ ] Set page as Active
- [ ] Test with a real comment (< 7 days old, from a non-admin user)
- [ ] Verify DM arrives in user's Messenger

---

# PHASE 2 — Instagram (PENDING 🔄)

## How Instagram Private Replies Work

**Endpoint:**
```
POST https://graph.facebook.com/v19.0/{ig-user-id}/messages
Authorization: Bearer {PAGE_ACCESS_TOKEN}
Content-Type: application/json

{
  "recipient": { "comment_id": "<IG_COMMENT_ID>" },
  "message": { "text": "Hola, gracias por tu comentario..." }
}
```

**Success response:**
```json
{ "recipient_id": "526...", "message_id": "aWdfZ..." }
```

> **Key difference from Facebook:** The `{ig-user-id}` is the **Instagram Business Account ID**, NOT the Facebook Page ID.

## Getting the Instagram Business Account ID

```
GET https://graph.facebook.com/{page-id}?fields=instagram_business_account&access_token={token}

Response:
{ "instagram_business_account": { "id": "17841400000000000" } }
```

This ID goes into the `igUserId` field in `meta_page_connections`.

## Additional Permissions Needed

| Permission | Purpose |
|---|---|
| `instagram_manage_messages` | **Required** — send DMs from IG comments |
| `instagram_manage_comments` | Read Instagram comments |
| `pages_read_engagement` | Already needed for Facebook |

## Code Changes Required

### 1. Schema (`shared/schema.ts`)
Add new column to `meta_page_connections`:
```typescript
igUserId: varchar("ig_user_id")  // Instagram Business Account ID, nullable
```
Run `npm run db:push` after.

### 2. Auto-connect (`server/routes.ts`)
Modify auto-connect to also fetch and store `igUserId`:
```
GET /me?fields=id,name,instagram_business_account
```
Save `instagram_business_account.id` as `igUserId`.

### 3. New function (`server/services/metaService.ts`)
```typescript
async function sendInstagramPrivateReply(igUserId, commentId, message, pageAccessToken)
// POST graph.facebook.com/{igUserId}/messages
// body: { recipient: { comment_id: commentId }, message: { text: message } }
```

### 4. Routing logic (`server/routes.ts`)
In the private reply route, detect platform and use correct function:
```typescript
if (message.platform === 'FACEBOOK') {
  result = await sendPrivateReply(commentId, text, token, pageId);
} else if (message.platform === 'INSTAGRAM') {
  result = await sendInstagramPrivateReply(igUserId, commentId, text, token);
}
```

### 5. Frontend (`client/src/components/Inbox.tsx` or `CommentThread.tsx`)
Enable the Private Reply button for Instagram comments:
```typescript
// Before: message.platform === 'FACEBOOK' only
// After: message.platform === 'FACEBOOK' || message.platform === 'INSTAGRAM'
```

### 6. AIAgentConfig UI
Update restriction card: replace "no funciona en Instagram" with the actual requirement: "Para Instagram requiere `instagram_manage_messages` y cuenta Business/Creator".

## Instagram Setup Steps (Meta Developers)

### Step 1 — Check current permissions
1. https://developers.facebook.com → select your app
2. **App Review → Permissions and Features**
3. Note which are active: `pages_messaging`, `instagram_manage_messages`, `instagram_manage_comments`

### Step 2 — Add `instagram_manage_messages`
1. Same "Permissions and Features" section
2. Search `instagram_manage_messages` → **Request**
3. In dev mode: activates immediately for your own account
4. For production: requires Meta App Review

### Step 3 — Get Instagram Business Account ID
1. Graph API Explorer (tools.facebook.com/explorer)
2. Use your existing Page Token
3. Query: `GET /{page-id}?fields=instagram_business_account`
4. Save the returned `id` — needed for the `igUserId` field

### Step 4 — Test manually before implementing
1. Graph API Explorer → POST → `/{ig-user-id}/messages`
2. Body: `{ "recipient": { "comment_id": "<real IG comment ID>" }, "message": { "text": "Test" } }`
3. Verify: `{ "recipient_id": "...", "message_id": "..." }` ✅

### Step 5 — Validate Metricool's comment ID format for IG
Instagram comment IDs from Metricool may also be in compound format. Test with a real comment ID from the DB against the Graph API to confirm what format is accepted.

## Implementation Order

1. [ ] Confirm Meta Developer steps (1-5) with user
2. [ ] Add `igUserId` column to `meta_page_connections` in schema + db:push
3. [ ] Modify auto-connect to fetch and store `igUserId`
4. [ ] New function `sendInstagramPrivateReply()` in metaService.ts
5. [ ] Update routes.ts — platform detection + correct function call
6. [ ] Enable button in UI for Instagram comments
7. [ ] Update AIAgentConfig restriction card
8. [ ] End-to-end test with real Instagram comment

---

## Error Reference (Both Platforms)

| Code | Meaning | Action |
|---|---|---|
| `190` | Token expired or invalid | Reconnect page with fresh User Token |
| `200` / `10` | Permission denied — missing `pages_messaging` or `instagram_manage_messages` | Add permission in Meta Developers |
| `100` / subcode `33` | Object not found — wrong comment ID or wrong platform | Verify comment ID format and platform |
| `100` + "outside of" | 7-day window expired or already replied | Cannot send |
| `100` (generic) | Invalid parameter — often wrong comment ID format (e.g., sending post ID instead of comment ID) | Check compound ID extraction logic |
| "admin" / "page owner" | Replying to yourself (page admin) | Block in UI |

## Facebook Restrictions

- 7-day window from original comment
- Only one private reply per comment
- Cannot reply to the page admin (yourself)
- Only works for Facebook comments (not Instagram — different API)

## Database Schema

Table: `meta_page_connections`
```typescript
{
  id: uuid (PK),
  brandId: uuid (FK → brands),
  pageId: text,           // Facebook Page ID
  pageName: text,
  pageAccessToken: text,  // Permanent Page Token (expires_at=0)
  igUserId: text | null,  // Instagram Business Account ID (Phase 2)
  isActive: boolean,
  createdAt: timestamp
}
```

## Brands Configured

| Brand | Page ID | IG User ID | Secret |
|---|---|---|---|
| Jordan Inpulza | `468497419676631` | TBD (Phase 2) | `META_JORDAN_INPULZA_USER_TOKEN` |
