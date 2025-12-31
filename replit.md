# Social Media Inbox Management System with Metricool

## Overview
This project is an advanced Social Media Inbox Management System integrated with Metricool, designed to streamline customer interactions across multiple social media platforms. The core purpose is to provide a unified view of customer communications, automate responses, and offer robust CRM functionalities. Key capabilities include multi-platform message buffering, conversation-specific cooldowns, dynamic AI personality adjustments, and a comprehensive CRM for contact management, identity merging, and historical interaction timelines. The system aims to enhance efficiency in social media customer service by integrating AI-powered automation with a flexible and configurable architecture.

## User Preferences
- I prefer simple language and clear explanations.
- I like an iterative development approach, where features are built and reviewed in stages.
- Ask for my approval before implementing major architectural changes or new third-party integrations.
- I expect detailed explanations for complex technical decisions.

## System Architecture
The system employs a multi-tenant architecture with a focus on modularity and extensibility.

### UI/UX Decisions
The user interface includes a consolidated "Orchestration" tab for managing all timing-related configurations (cooldowns, DM buffers) and a simplified "Automation" tab for response modes and character limits. A dedicated `CRMContextPanel` provides a unified view of customer profiles, channels, and activity metrics within the Inbox. Design emphasizes clear visual indicators for contact status (new prospect, existing), connected channels, and a chronological timeline of interactions.

### Technical Implementations
- **Core AI Services:** `autoReplyService`, `dmBufferService`, and `syncService` work in conjunction to process incoming messages, buffer DMs, apply cooldowns, and trigger AI responses.
- **Dynamic Personality Rules:** The `prompt-composer.ts` dynamically adjusts AI responses based on contextual variables like `is_dm`, `first_name`, `time_since_last_interaction`, and `relationship_status`. This allows for intelligent greetings and direct-to-the-point responses.
- **Conversation-Specific Cooldowns:** The system implements per-conversation cooldowns, storing `last_ai_reply_at` in the `conversations` table, preventing global brand-wide cooldowns.
- **DM Buffering:** A `dmBufferService` accumulates messages and triggers a single AI response after a configurable delay, with reply modes (auto, batch, first_only) configurable per AI agent.
- **Channel-Specific Configuration:** `platformSettings` in the `ai_agents` table allows for overriding default buffer and cooldown settings on a per-social-channel basis (e.g., Instagram, TikTok). A `getEffectiveChannelSettings()` function merges defaults with channel-specific overrides.
- **LLM Integration:** Refactored `SummaryService` to use `createLLMProvider` pattern, respecting agent-specific `openaiApiKey` or `geminiApiKey` for generating raw completions.

### Feature Specifications
- **Comprehensive CRM Module:**
    - **Database Structure:** Three core tables: `crm_contacts`, `crm_contact_channels`, and `crm_contact_limbo`, using UUIDs for primary keys to facilitate future identity merging. `JSONB` `customFields` store dynamic AI-extracted data.
    - **Traffic Controller:** `crmTrafficController.ts` intelligently routes DMs to create contacts (lazy creation after a DM handshake) and comments to a "limbo" state.
    - **AI Function Calling:** Four CRM-specific functions (`update_contact`, `set_custom_field`, `update_status`, `update_lifecycle`) enable AI to extract and update contact information during conversations.
    - **API Endpoints:** A full suite of RESTful APIs for managing contacts, channels, custom fields, and limbo entries.
- **Identity Merge (Completed - PASO 3):** An atomic transaction-based system to merge duplicate contacts, fully implemented with:
    - **Detection:** `findPotentialDuplicates()` and `findAllDuplicatePairs()` methods detect contacts with matching email or phone.
    - **Merge Transaction:** `mergeContacts()` consolidates channels, conversations, customFields, and metrics into the primary contact. Secondary is soft-deleted with `status='archived'`.
    - **Undo Capability:** `undoMerge()` restores both contacts to pre-merge state within a 15-minute grace period. Merge metadata stored in `customFields._mergeInfo`.
    - **API Endpoints:** `GET /api/crm/duplicates`, `POST /api/crm/merge`, `POST /api/crm/undo-merge`.
    - **UI:** "Duplicados" tab in CRM page shows detected pairs, merge modal with primary selection, and toast with undo action.
- **Context View - Unified History:** An endpoint (`GET /api/crm/contacts/:id/timeline`) aggregates messages from all linked channels of a contact, ordered chronologically. The UI displays this as a slide-over panel with "Profile" and "History" tabs, showing chat bubbles with platform icons.
- **Contact Enrichment Service (Completed - Dec 2024):** Automatic extraction of phone numbers and emails from DM messages, independent of auto-reply functionality:
    - **Regex-First Extraction:** Uses deterministic regex patterns for phones and emails (no AI cost). Multiple phone formats supported: international (+1...), US formats, WhatsApp prefixes.
    - **Data Safety:** "Fill only if empty" logic prevents overwriting existing contact data with old message data. `!contact.phone` and `!contact.email` verified before any update.
    - **Integration Point:** Hooked into `syncService.processInboundMessage()` as fire-and-forget async call. Runs for ALL inbound DMs regardless of auto-reply status.
    - **Backfill Capability:** `POST /api/crm/backfill` endpoint and `scripts/run-backfill.ts` for processing historical messages. Stats tracking: messagesProcessed, phonesFound, emailsFound, contactsUpdated.
    - **Results:** Initial backfill processed 635 messages, extracted 18 phones and 7 emails, updated 18 contacts.
- **LLM Enrichment Service (Completed - Dec 30, 2024):** AI-powered extraction of service interest, intent, and budget from messages, independent of auto-reply:
    - **Fields Extracted:** `serviceInterest` (e.g., "ITIN", "LLC", "Taxes"), `intent` (user's goal), `budgetAmount`/`budgetCurrency`, `qualifiers` (additional data).
    - **Fire-and-Forget:** Hooked into `syncService` after each inbound DM. Runs async without blocking message sync.
    - **Idempotent Updates:** Only fills empty fields, uses Set to dedupe qualifiers, guards against null values.
    - **LLM Provider Agnostic:** Uses brand's configured AI agent (OpenAI or Gemini) via `createLLMProvider` pattern.
    - **API Endpoints:** `POST /api/crm/llm-enrich` for batch backfill, `POST /api/crm/contacts/:id/enrich` for single contact.
    - **UI Integration:** "Interés detectado" section highlighted in contact profile and limbo panel with serviceInterest, intent, and budget display.
- **CRM Filters Expansion (Dec 30, 2024):** Added platform/type filters to Limbo and Duplicates tabs (matching Contacts tab design).
- **CRM Population Backfill (Dec 30, 2024):** Script and API endpoint to process ALL existing conversations and populate CRM:
    - **Script:** `scripts/run-crm-populate.ts` processes all brands automatically
    - **API Endpoint:** `POST /api/crm/populate` for brand-specific backfill
    - **Results:** 717 conversations processed, 100% DMs linked to contacts, all comments in limbo or linked to existing contacts
    - **Idempotent:** Can be run multiple times safely without creating duplicates
- **Sync Service Hardening (Dec 30, 2024):** Critical fixes to ensure 100% comment capture in CRM:
    - **CustomerId Normalization:** Coerces numeric IDs (Facebook/TikTok) to strings before processing; fallback chain: authorParticipant.id → comment.author → commentOwnerId → comment.id
    - **Nested Replies CRM Routing:** Added crmTrafficController.routeIncomingMessage() call for all nested replies (previously bypassed CRM entirely)
    - **Warning Logs:** Added logs when fallback IDs are used, enabling monitoring of data quality issues
    - **Idempotent:** Uses Metricool message IDs for deduplication, safe to re-sync

- **Conversation Lifecycle Management (Completed - Dec 31, 2024):** Full-featured conversation state machine with AI-powered closing summaries:
    - **State Machine:** Five states (new, open, pending, solved, closed) with controlled transitions. Closed conversations are immutable - AI agents cannot reopen them.
    - **Database Schema:** Added `status`, `closingSummary`, `closingSentiment`, `closingIntent`, `closingResolution`, `solvedAt`, `closedAt`, `closedBy`, `aiActive`, `lastAiReplyAt` fields to `conversations` table. New `conversation_status_history` and `brand_lifecycle_settings` tables for audit trail and brand-specific configuration.
    - **Thank-You Detection:** `thankYouDetector.ts` service with 15-word limit, multilingual keyword matching (Spanish/English), 0.8+ confidence threshold. Detects closing messages to auto-mark as solved.
    - **AI Closing Summaries:** `closingSummaryService.ts` generates structured summaries with sentiment, intent, resolution, topics, and action items using brand's LLM provider.
    - **Lifecycle Scheduler:** `lifecycleScheduler.ts` runs every 15 minutes, auto-closes solved conversations after configurable grace period (default 24 hours).
    - **Integration Points:** SyncService records customer messages and applies thank-you detection. AutoReplyService checks `aiActive` and `closed` status before responding.
    - **API Endpoints:** `POST /api/conversations/:id/status`, `POST /api/conversations/:id/generate-summary`, `PUT /api/conversations/:id/summary`, `GET /api/brands/:id/lifecycle-settings`, `PUT /api/brands/:id/lifecycle-settings`, `GET /api/analytics/lifecycle`.
    - **UI Components:**
        - **Inbox:** Status badge with color-coded display, dropdown menu for status changes (Open/Pending/Solved), AI summary generation button
        - **CRMContextPanel:** Closing summary display with sentiment indicator, intent, and resolution fields
        - **AgentSettings:** Lifecycle settings section with auto-close timer (1-72 hours) and AI summary toggle
    - **Critical Rule:** AI agents CANNOT reopen closed conversations (hard-coded prevention). Customer must start new conversation.

### System Design Choices
- **Multi-Tenant Architecture:** Strong isolation of data per brand via `brandId` for CRM and AI configurations.
- **Idempotent Operations:** Migration scripts and CRM contact creation are designed to be idempotent to prevent duplicate entries.
- **FK Constraints:** `conversations.contact_id` linked to `crm_contacts.id` with `ON DELETE SET NULL` for data integrity.
- **Shared Schemas:** `shared/schema.ts` defines common types and Zod schemas for consistency across frontend and backend.
- **Normalized Providers:** A `normalizeProvider()` utility ensures consistent naming for social media platforms across the system.

## External Dependencies
- **Metricool:** Used for syncing social media DMs and comments.
- **OpenAI / Gemini:** AI LLM providers for generating responses, summaries, and executing CRM functions. The system supports dynamic switching and API key management for these services.
- **PostgreSQL:** Primary database for storing all system data, including CRM contacts, conversations, messages, and AI agent configurations. Utilizes UUIDs for primary keys and JSONB for flexible custom fields.