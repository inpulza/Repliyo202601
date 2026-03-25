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
- **Facebook Private Replies (Mar-2026):** Agents can send private DMs (Messenger messages) to users who commented on Facebook posts, Reels, or videos, directly from the Inbox. Uses the Meta Messenger Platform Send API (`POST /{page-id}/messages` with `recipient.comment_id`). Metricool stores comment IDs in compound format `{postId}_{commentId}`; the system extracts the real ID from the permalink's `comment_id=` param or by stripping the post prefix. Page Access Tokens are permanent (`expires_at=0`) and stored in `meta_page_connections`. Requires `pages_messaging` permission. Key files: `server/services/metaService.ts` (API call), `server/routes.ts` (ID extraction + route), `client/src/components/AIAgentConfig.tsx` (page connection UI).

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