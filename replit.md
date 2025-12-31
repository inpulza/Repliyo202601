# Social Media Inbox Management System with Metricool

## Overview
This project is an advanced Social Media Inbox Management System integrated with Metricool, designed to streamline customer interactions across multiple social media platforms. It provides a unified view of customer communications, automates responses, and offers robust CRM functionalities. Key capabilities include multi-platform message buffering, conversation-specific cooldowns, dynamic AI personality adjustments, and a comprehensive CRM for contact management, identity merging, and historical interaction timelines. The system aims to enhance efficiency in social media customer service through AI-powered automation and a flexible, configurable architecture.

## User Preferences
- I prefer simple language and clear explanations.
- I like an iterative development approach, where features are built and reviewed in stages.
- Ask for my approval before implementing major architectural changes or new third-party integrations.
- I expect detailed explanations for complex technical decisions.

## System Architecture
The system employs a multi-tenant architecture with a focus on modularity and extensibility.

### UI/UX Decisions
The user interface includes an "Orchestration" tab for managing timing configurations and an "Automation" tab for response modes. A `CRMContextPanel` provides a unified view of customer profiles, channels, and activity metrics. Design emphasizes clear visual indicators for contact status, connected channels, and a chronological timeline of interactions.

### Technical Implementations
- **Core AI Services:** `autoReplyService`, `dmBufferService`, and `syncService` process messages, buffer DMs, apply cooldowns, and trigger AI responses.
- **Dynamic Personality:** `prompt-composer.ts` adjusts AI responses based on contextual variables.
- **Conversation-Specific Cooldowns:** Per-conversation cooldowns are implemented using `last_ai_reply_at` in the `conversations` table.
- **DM Buffering:** A `dmBufferService` accumulates messages and triggers a single AI response after a configurable delay.
- **Channel-Specific Configuration:** `platformSettings` in `ai_agents` allows overriding default buffer and cooldown settings per social channel.
- **LLM Integration:** `SummaryService` uses a `createLLMProvider` pattern for agent-specific API keys.
- **Comprehensive CRM Module:** Features `crm_contacts`, `crm_contact_channels`, `crm_contact_limbo` tables, `crmTrafficController.ts` for routing, AI function calling (`update_contact`, `set_custom_field`, `update_status`, `update_lifecycle`), and RESTful APIs.
- **Identity Merge:** An atomic transaction-based system to merge duplicate contacts, including detection, merge transactions, and undo capability.
- **Context View:** An endpoint aggregates messages from all linked channels of a contact, displayed as a chronological timeline in the UI.
- **Contact Enrichment Service:** Extracts phone numbers and emails from DMs using regex, integrated into `syncService.processInboundMessage()`.
- **LLM Enrichment Service:** AI-powered extraction of `serviceInterest`, `intent`, `budget`, and `qualifiers` from messages, integrated into `syncService`.
- **CRM Filters & Population Backfill:** Expanded filters for Limbo and Duplicates tabs and a script/API for populating the CRM from existing conversations.
- **Sync Service Hardening:** Ensures robust comment capture in CRM with customer ID normalization and routing for nested replies.
- **Conversation Lifecycle Management:** A state machine with five states (new, open, pending, solved, closed), AI-powered closing summaries, a `thankYouDetector.ts` service, and a `lifecycleScheduler.ts` for auto-closing conversations. AI agents cannot reopen closed conversations.
- **Smart Customer Follow-up System:** Automated reminder system for inactive customers covering both DMs and comments. Implements:
  - Database: `reminder_rules` (per-brand config) and `reminder_events` (scheduled/sent reminders) tables with unique partial index for duplicate prevention.
  - Storage: 14 CRUD methods including `checkConversationEligibleForReminder()` (precheck) and `scheduleReminderAtomic()` (transactional scheduling).
  - ReminderService: Pre-check → AI generation → Atomic schedule workflow. Prevents AI quota waste by validating eligibility before expensive LLM calls.
  - Defense layers: Eligibility query, pre-check, transaction checks, unique partial index, structured responses with terminal state tracking.
  - Daily cap enforcement counting both scheduled + sent reminders to prevent over-scheduling.
- **Customer Journey Timeline:** Visualización cronológica de todos los puntos de contacto clave con cada cliente. Combina:
  - Datos de: `messages`, `conversation_user_summaries`, `reminder_events`, `conversationStatusHistory`
  - Tipos de eventos: primer contacto, mensajes in/out, respuestas IA, recordatorios, cambios de estado, resúmenes
  - Endpoint: `GET /api/conversations/:id/timeline`
  - UI: Componente `ConversationTimeline.tsx` integrado en `CRMContextPanel.tsx` como sección "Customer Journey"

### System Design Choices
- **Multi-Tenant Architecture:** Data isolation per brand using `brandId`.
- **Idempotent Operations:** Designed for safe re-execution of migration scripts and CRM contact creation.
- **FK Constraints:** `conversations.contact_id` linked to `crm_contacts.id` with `ON DELETE SET NULL`.
- **Shared Schemas:** `shared/schema.ts` for consistent data types.
- **Normalized Providers:** `normalizeProvider()` for consistent social media platform naming.

## External Dependencies
- **Metricool:** Used for syncing social media DMs and comments.
- **OpenAI / Gemini:** AI LLM providers for generating responses, summaries, and executing CRM functions.
- **PostgreSQL:** Primary database for all system data, utilizing UUIDs and JSONB.