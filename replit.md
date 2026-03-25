# Social Media Inbox Management System with Metricool

## Overview
This project is an advanced Social Media Inbox Management System integrated with Metricool, designed to streamline customer interactions across multiple social media platforms. It provides a unified view of customer communications, automates responses, and offers robust CRM functionalities. The system aims to enhance efficiency in social media customer service through AI-powered automation and a flexible, configurable architecture. Key capabilities include multi-platform message buffering, conversation-specific cooldowns, dynamic AI personality adjustments, a comprehensive CRM for contact management, identity merging, historical interaction timelines, and real-time crisis management with sentiment analysis.

## User Preferences
- I prefer simple language and clear explanations.
- I like an iterative development approach, where features are built and reviewed in stages.
- Ask for my approval before implementing major architectural changes or new third-party integrations.
- I expect detailed explanations for complex technical decisions.

## System Architecture
The system employs a multi-tenant architecture with a focus on modularity and extensibility, using a "Strangler Fig Pattern" for gradual architectural improvements. New code strictly adheres to a layered architecture: `Route (validation) → Service (business logic) → Repository (data access) / Adapter (external APIs)`.

### UI/UX Decisions
The user interface features an "Orchestration" tab for timing configurations, an "Automation" tab for response modes, and a `CRMContextPanel` for unified customer profiles. Critical UI rules dictate specific background and text colors for outbound (blue) and inbound (white) messages across various components to ensure clear visual distinction. A "Crisis Alerts" dashboard provides real-time sentiment analysis and triage capabilities, while a "Customer Journey" timeline visually represents all key customer touchpoints.

### Technical Implementations
- **Core AI Services:** `autoReplyService`, `dmBufferService`, and `syncService` manage message processing, DM buffering, cooldowns, and AI responses. `prompt-composer.ts` dynamically adjusts AI personalities.
- **Conversation Management:** Implements per-conversation cooldowns, DM buffering, and channel-specific configuration overrides for AI agents.
- **Comprehensive CRM Module:** Includes `crm_contacts`, `crm_contact_channels`, `crm_contact_limbo` tables, `crmTrafficController.ts` for routing, AI function calling for contact updates, identity merging, and contact enrichment (regex for contact details, LLM for service interest, intent, budget).
- **Conversation Lifecycle Management:** A state machine handles conversation states (new, open, pending, solved, closed) with AI-powered closing summaries and auto-closing mechanisms.
- **Smart Customer Follow-up System:** Automated reminder system for inactive customers, with `reminder_rules` and `reminder_events` tables, transactional scheduling, and daily cap enforcement. Reminders are only programmed after the brand has responded to the customer.
- **Sentiment Analysis & Crisis Management:** `SentimentAnalysisService.ts` uses LLM for sentiment and severity classification of inbound messages (critical/negative/neutral/positive; P1-P4) and crisis categories. `SentimentAlertRepository.ts` and `sentimentAlerts.routes.ts` manage alerts. WebSocket emits real-time `crisis_alert` events for high-severity messages. An "Fire Mode" in the Inbox filters conversations by active P1/P2 alerts.
- **Customer Journey Timeline:** Aggregates data from messages, summaries, reminders, and status history to provide a chronological view of customer interactions.
- **Authentication System:** Hybrid authentication supporting email/password and OAuth via Replit Auth (Google, GitHub, Apple, Twitter). Includes a secure email registration and verification flow.
- **URL Structure:** Clearly defined routes for public landing, authentication, and authenticated dashboard sections (e.g., `/app/inbox`, `/app/crm`, `/app/crisis-alerts`).
- **Facebook Private Replies (Mar-2026):** Agents can send private DMs (Messenger messages) to users who commented on Facebook posts, Reels, or videos, directly from the Inbox. Uses the Meta Messenger Platform Send API (`POST /{page-id}/messages` with `recipient.comment_id`). Metricool stores comment IDs in compound format `{postId}_{commentId}`; the system extracts the real ID from the permalink's `comment_id=` param or by stripping the post prefix. Page Access Tokens are permanent (`expires_at=0`) and stored in `meta_page_connections`. Requires `pages_messaging` permission. Currently MANUAL only — agent clicks button in Inbox, template interpolates `{{first_name}}`, `{{username}}`, `{{comment}}`, then agent edits and sends. After the first private reply, subsequent Messenger DMs in that thread are handled by autoReplyService automatically. Key files: `server/services/metaService.ts` (API call), `server/routes.ts` (ID extraction + route), `client/src/components/AIAgentConfig.tsx` (page connection UI).
- **Instagram Private Replies (Mar-2026, BLOCKED):** Implementation is complete in code (`sendInstagramPrivateReply()` in `metaService.ts`, `igUserId` column in `meta_page_connections`, platform routing in `routes.ts`, button enabled in `CommentThread.tsx`). Blocked at Meta level: `instagram_manage_messages` requires Advanced Access (App Review) for non-developer users. Error #3 persists for real Instagram users. Requires Meta App Review submission to unblock. Jordan Inpulza brand: `igUserId=17841469380903816`, Facebook Page ID: `468497419676631`, `brand_id=9328112e-feed-40c8-b6a3-a69ec99303a8`.
- **Privacy Policy Page (Mar-2026):** Public route at `/privacy` — full English-language privacy policy compliant with Meta App Review requirements. Includes all Meta-required sections: CDN URL handling, human escalation path, PSIDs/IGSIDs disclosure, data deletion instructions (30-day SLA), cookie policy, user rights. Footer link added to landing page. Contact: privacy@repliyo.com. File: `client/src/pages/PrivacyPolicy.tsx`.
- **Landing Page Branding (Mar-2026):** Logo image (`client/src/assets/repliyo-logo.jpg`) now displayed in landing page header (replaced text wordmark) and Privacy Policy navbar. Loading/splash screen added to landing page — shows logo with animated dots for 1.2s then fades to page content.

### Post Context System (AI Prompts)
The `PromptComposer` (`server/services/llm/prompt-composer.ts`) builds AI prompts with a `{{post_context}}` variable:
- **For comments:** Sends the `caption` field of the `SocialPost` object, truncated to 500 characters. Injected explicitly under `--- CONTEXTO DEL POST COMENTADO ---` in the user prompt.
- **For DMs:** Defaults to the string `"Este es un mensaje directo privado."` — no actual post context.
- **Fallback:** If caption is missing: `"[Comentario en publicación - caption no disponible]"`.
- **What's NOT included currently:** Post title/type, platform, media type (video/reel/image), hashtags, engagement metrics.
- The `buildVariableContext` function in `prompt-composer.ts` extracts only `socialPost.caption` → maps to `{{post_context}}`.

### System Design Choices
- **Multi-Tenant Architecture:** Data isolation per brand using `brandId`.
- **Idempotent Operations:** Ensures safe re-execution of critical operations.
- **Database Integrity:** Utilizes Foreign Key constraints (`ON DELETE SET NULL`) and consistent schema definitions.
- **Normalized Providers:** Standardizes social media platform naming.

## External Dependencies
- **Metricool:** Used for syncing social media direct messages and comments.
- **OpenAI / Gemini:** Large Language Model (LLM) providers for generating responses, summaries, and executing CRM functions.
- **Meta Graph API / Messenger Platform:** Used for sending Facebook Private Replies (DMs) from Page to comment authors.
- **PostgreSQL:** The primary relational database for all system data, leveraging UUIDs and JSONB data types.