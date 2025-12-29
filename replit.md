# Social Media Inbox Management System with Metricool

## Overview
This project is an advanced Social Media Inbox Management System integrated with Metricool, designed to streamline customer interactions across multiple social media platforms. The core purpose is to provide a unified view of customer communications, automate responses, and offer robust CRM functionalities. Key capabilities include multi-platform message buffering, conversation-specific cooldowns, dynamic AI personality adjustments, and a comprehensive CRM for contact management, identity merging, and historical interaction timelines. The system aims to enhance efficiency in social media customer service by integrating AI-powered automation with a flexible and configurable architecture.

## User Preferences
- I prefer simple language and clear explanations.
- I like an iterative development approach, where features are built and reviewed in stages.
- Ask for my approval before implementing major architectural changes or new third-party integrations.
- I expect detailed explanations for complex technical decisions.
- Do not make changes to the `DOCUMENTACION_COMPLETA.md` file.

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
- **Identity Merge (Planned):** An atomic transaction-based system to merge duplicate contacts, resolving conflicts and consolidating historical data. It will include detection algorithms, a primary/secondary contact selection process, and a reversible soft-delete mechanism with an undo option.
- **Context View - Unified History:** An endpoint (`GET /api/crm/contacts/:id/timeline`) aggregates messages from all linked channels of a contact, ordered chronologically. The UI displays this as a slide-over panel with "Profile" and "History" tabs, showing chat bubbles with platform icons.

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