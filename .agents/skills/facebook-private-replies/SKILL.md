---
name: facebook-private-replies
description: Configure and implement Facebook Private Replies (sending DMs to users who comment on Facebook posts/Reels/videos) for a Repliyo brand account. Use when setting up a new Facebook page connection, troubleshooting private reply errors, adding a new brand/account, or debugging Facebook Messenger Platform API issues. Covers Facebook Developer Portal setup, token generation, Replit secrets, and technical implementation details.
---

# Facebook Private Replies — Repliyo

Allows agents to send private Messenger DMs to users who comment on a Facebook Page's posts, Reels, or videos, directly from the Repliyo inbox.

---

## Anatomy of the Feature

```
Inbox comment → Extract real comment ID → POST /{page-id}/messages → User receives DM in Messenger
```

**Key files:**
| File | Role |
|---|---|
| `server/services/metaService.ts` | `sendPrivateReply()` — calls Facebook API |
| `server/routes.ts` | `POST /api/messages/:id/private-reply` — ID extraction + coordination |
| `client/src/components/AIAgentConfig.tsx` | UI to connect/manage Facebook pages |
| `shared/schema.ts` | `meta_page_connections` table |

---

## Part 1 — Facebook Developer Portal Setup (per brand)

Do this once per Meta App. If the app already exists, skip to Step 4.

### Step 1 — Create a Meta App
1. Go to https://developers.facebook.com/apps
2. Click **Create App**
3. Select **Business** type
4. Fill in app name and contact email
5. Connect to a Business Portfolio if available

### Step 2 — Add Messenger Product
1. In the app dashboard → **Add Product** → **Messenger** → Set Up

### Step 3 — Request Required Permissions
Go to **App Review → Permissions and Features** and request:

| Permission | Purpose |
|---|---|
| `pages_messaging` | **Required** — send messages from page |
| `pages_read_engagement` | Read comments |
| `pages_manage_metadata` | Page configuration |
| `pages_show_list` | List pages the user manages |

> **Note:** For development/testing, these permissions work without App Review approval as long as you use a token from an Admin of the app. For production with external users, App Review is required.

### Step 4 — Generate a User Access Token
1. Go to https://developers.facebook.com/tools/explorer
2. Select your app from the dropdown
3. Click **Generate Access Token**
4. Check these permissions:
   - `pages_messaging`
   - `pages_read_engagement`
   - `pages_manage_metadata`
   - `pages_show_list`
5. Copy the token — this is a **short-lived User Token (2 hours)**

> The system will automatically exchange it for a permanent Page Token. You never need to regenerate it unless you want to reconfigure.

### Step 5 — Find the Facebook Page ID
Option A: Go to the page on Facebook → **About** → scroll down to find "Page ID"  
Option B: Use Graph API Explorer: `GET /me/accounts` — returns list of pages with their IDs

---

## Part 2 — Repliyo Configuration (per brand)

### Step 1 — Create the Replit Secret
Name the secret following this pattern:
```
META_{BRAND_NAME_UPPERCASE}_USER_TOKEN
```
Example for "Jordan Inpulza":
```
META_JORDAN_INPULZA_USER_TOKEN = <the short-lived user token from Step 4 above>
```

Use the `environment-secrets` skill to set this via Replit's secret manager.

### Step 2 — Configure Auto-Connect in Code
In `server/routes.ts`, find the auto-connect route for `META_*` tokens. The system reads env vars matching `META_*_USER_TOKEN`, exchanges them for permanent Page Tokens, and stores them in `meta_page_connections`.

If adding a completely new brand, verify that the auto-connect logic scans all `META_*_USER_TOKEN` env vars and links them to the correct `brand_id` in the database.

### Step 3 — Connect via the UI
1. Go to Repliyo → Brand Settings → AI Agent Config → **Private Replies**
2. The page should appear automatically after the auto-connect runs
3. If not, use the manual form:
   - Page ID: `468497419676631` (example)
   - Page Name: display name
   - Page Access Token: permanent token from `/me/accounts`
4. Click **Check Permissions** to verify `pages_messaging` is active
5. Set the page as **Active**

---

## Part 3 — Token Flow (Technical)

```
Short-lived User Token (2h)  [stored in Replit Secret]
    ↓  GET /oauth/access_token?grant_type=fb_exchange_token
Long-lived User Token (60 days)
    ↓  GET /me/accounts
Page Access Token (PERMANENT, expires_at = 0)  [stored in meta_page_connections]
    ↓  Used for all API calls
```

Only the permanent Page Token is used at runtime. It never expires as long as the user stays admin of the page.

---

## Part 4 — Comment ID Extraction (Critical)

### The Problem
Metricool stores comment IDs in compound format:
```
{postId}_{commentId}   →   122200652672575116_884686284607817
```

Facebook's API needs **only** the comment ID:
```
884686284607817
```

### The Solution (in `server/routes.ts`)
```typescript
const rawCommentId = rawData?.id || rawData?.root?.id || message.metricoolId;

// Priority 1: extract from permalink (most reliable)
const permalinkMatch = (rawData?.root?.properties?.permalink || rawData?.properties?.permalink || '')
  .match(/comment_id=(\d+)/);

// Priority 2 fallback: strip post prefix
const commentId = permalinkMatch
  ? permalinkMatch[1]
  : (rawCommentId.includes('_') ? rawCommentId.split('_').pop() : rawCommentId);
```

---

## Part 5 — The API Call

**Endpoint (Messenger Platform Send API — modern, works for all content types):**
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

**Success response:**
```json
{ "recipient_id": "USER_PSID", "message_id": "mid.xxxx" }
```

> **Why not `/{comment-id}/private_replies`?** That endpoint is the old approach (~2016). It does NOT work for Reels and videos. The Messenger Platform Send API is the modern standard used by Respond.io, ManyChat, etc.

---

## Part 6 — Facebook Restrictions

| Rule | Detail |
|---|---|
| **7-day window** | Private reply must be sent within 7 days of the original comment |
| **One reply only** | Facebook allows only one private reply per comment |
| **No self-reply** | Cannot send a private reply to the page admin (yourself) |
| **Platform scope** | Only works for Facebook comments — Instagram requires different API + permissions |

---

## Part 7 — Error Reference

| Error Code | Meaning | Action |
|---|---|---|
| `190` | Token expired or invalid | Reconnect page with a fresh User Token |
| `200` / `10` | Permission denied — missing `pages_messaging` | Add permission in Meta Developers → App Review |
| `100` / subcode `33` | Object not found — wrong comment ID or Instagram comment | Verify comment ID format; check if comment is on Facebook (not Instagram) |
| `100` + "outside of" | 7-day window expired or already replied | Cannot send — inform agent |
| "admin" / "page owner" | Trying to reply to yourself | Block this case in UI |

---

## Part 8 — Adding a New Brand Account (Checklist)

- [ ] Generate User Access Token in Facebook Graph Explorer with correct permissions
- [ ] Create Replit Secret: `META_{BRAND}_USER_TOKEN`
- [ ] Restart the application so auto-connect reads the new secret
- [ ] Verify page appears in AIAgentConfig → Private Replies tab
- [ ] Click "Check Permissions" and confirm `pages_messaging` shows ✓
- [ ] Set page as Active
- [ ] Test with a real comment (< 7 days old, from a non-admin user)
- [ ] Verify DM arrives in user's Messenger

---

## Part 9 — Database Schema

Table: `meta_page_connections`
```typescript
{
  id: uuid (PK),
  brandId: uuid (FK → brands),
  pageId: text,           // Facebook Page ID (e.g. "468497419676631")
  pageName: text,
  pageAccessToken: text,  // Permanent Page Token (expires_at=0)
  isActive: boolean,
  createdAt: timestamp
}
```

---

## Brands Configured (as of Mar 2026)

| Brand | Page ID | Secret Name |
|---|---|---|
| Jordan Inpulza | `468497419676631` | `META_JORDAN_INPULZA_USER_TOKEN` |
