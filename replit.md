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
- **Core AI Services:** `autoReplyService`, `dmBufferService`, and `syncService` manage message processing, DM buffering, cooldowns, and AI responses. `prompt-composer.ts` dynamically adjusts AI personalities. Includes `sanitizeAiResponse()` post-processing that strips em-dashes from LLM output to prevent AI-slop patterns. Anti-repetition and anti-AI-slop rules are enforced at system prompt level (both JSON and non-JSON modes).
- **Conversation Management:** Implements per-conversation cooldowns, DM buffering, and channel-specific configuration overrides for AI agents.
- **Comprehensive CRM Module:** Includes `crm_contacts`, `crm_contact_channels`, `crm_contact_limbo` tables, `crmTrafficController.ts` for routing, AI function calling for contact updates, identity merging, and contact enrichment (regex for contact details, LLM for service interest, intent, budget).
- **Conversation Lifecycle Management:** A state machine handles conversation states (new, open, pending, solved, closed) with AI-powered closing summaries and auto-closing mechanisms.
- **Smart Customer Follow-up System:** Automated reminder system for inactive customers, with `reminder_rules` and `reminder_events` tables, transactional scheduling, and daily cap enforcement. Reminders are only programmed after the brand has responded to the customer.
- **Sentiment Analysis & Crisis Management:** `SentimentAnalysisService.ts` uses LLM for sentiment and severity classification of inbound messages (critical/negative/neutral/positive; P1-P4) and crisis categories. `SentimentAlertRepository.ts` and `sentimentAlerts.routes.ts` manage alerts. WebSocket emits real-time `crisis_alert` events for high-severity messages. An "Fire Mode" in the Inbox filters conversations by active P1/P2 alerts.
- **Customer Journey Timeline:** Aggregates data from messages, summaries, reminders, and status history to provide a chronological view of customer interactions.
- **Authentication System:** Hybrid authentication supporting email/password and OAuth via Replit Auth (Google, GitHub, Apple, Twitter). Includes a secure email registration and verification flow.
- **User Management Panel (Apr-2026):** Admin-only CRUD panel at `/app/users` for managing platform access. Features: create/edit/delete users, assign brands, toggle status (active/suspended/pending), reset passwords. Enforces tenant integrity (client users must have a brand; brand must exist and not be archived). Navigation link visible only to admin users (Sidebar + BottomNav "More" menu). Backend endpoints: `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, `POST /api/users/:id/reset-password`, `DELETE /api/users/:id` — all admin-only with comprehensive validation. File: `client/src/pages/UserManagement.tsx`.
- **URL Structure:** Clearly defined routes for public landing, authentication, and authenticated dashboard sections (e.g., `/app/inbox`, `/app/crm`, `/app/crisis-alerts`, `/app/users`).
- **Facebook Private Replies (Mar-2026):** Agents can send private DMs (Messenger messages) to users who commented on Facebook posts, Reels, or videos, directly from the Inbox. Uses the Meta Messenger Platform Send API (`POST /{page-id}/messages` with `recipient.comment_id`). Metricool stores comment IDs in compound format `{postId}_{commentId}`; the system extracts the real ID from the permalink's `comment_id=` param or by stripping the post prefix. Page Access Tokens are permanent (`expires_at=0`) and stored in `meta_page_connections`. Requires `pages_messaging` permission. After the first private reply, subsequent Messenger DMs in that thread are handled by autoReplyService automatically. Key files: `server/services/metaService.ts` (API call), `server/routes.ts` (ID extraction + route), `client/src/components/AIAgentConfig.tsx` (page connection UI + auto mode UI).
- **Auto Private Reply / Modo Automático (Mar-2026):** New feature in AI Agent Config > Private Replies. Three new columns in `ai_agents`: `auto_private_reply_enabled` (bool), `auto_private_reply_delay_minutes` (int), `auto_private_reply_use_ai` (bool). When enabled, `syncService.triggerAutoPrivateReply()` fires after every new Facebook comment (fire-and-forget). Uses idempotency check (checks existing `meta_private_reply` messages for same `parentMessageId`) before and after the configured delay. Supports template mode (interpolates template) and AI mode (calls LLM with enriched post context, falls back to template on failure). Only for Facebook (Instagram blocked by Meta App Review).
- **Enriched `{{post_context}}` (Mar-2026):** Two functions: `enrichPostContext()` for LLM prompts (structured blocks with TIPO DE CONTENIDO, TEXTO DEL POST, URL, instructions) and `enrichPostContextForTemplate()` for user-facing templates (natural text like "tu Reel de Facebook sobre Deja de tirar..."). Template function produces clean, conversational descriptions (max 120 chars). Used in: LLM auto-replies/reminders use `enrichPostContext()`, template interpolation (manual + auto private replies) uses `enrichPostContextForTemplate()`.
- **Faithful Care Medical Agent Config (Mar-2026):** Complete AI assistant configuration for Faithful Care Medical Services (Dr. Addys Reve, MD — Naples, FL). Three documents in `docs/agent-config/`: System Prompt (virtual receptionist identity, bilingual EN/ES, warm tone, CTA strategy), Knowledge Base (services, insurance, DPC, FAQs, service area), and Guardrails (HIPAA compliance, medical advice prohibition, escalation triggers, competitor handling, pricing boundaries).
- **Private Reply DM Storage (Mar-2026):** Private reply outbound messages are now saved in a DM conversation (type 'dm'), not in the comment thread. The system finds or creates a DM conversation for the customer using `getConversationByKey()`. Idempotency check uses global `storage.hasPrivateReplyForComment(brandId, parentMessageId)` instead of scanning the comment conversation. Frontend uses `GET /api/inbox/private-reply/status?conversationId=` to check which comments already have private replies sent. `meta_page_connections` has no `platform` column — the `find()` check uses `p.isActive && p.pageId` instead of `p.platform === 'facebook'`.
- **Instagram Private Replies (Mar-2026, BLOCKED):** Implementation is complete in code (`sendInstagramPrivateReply()` in `metaService.ts`, `igUserId` column in `meta_page_connections`, platform routing in `routes.ts`, button enabled in `CommentThread.tsx`). Blocked at Meta level: `instagram_manage_messages` requires Advanced Access (App Review) for non-developer users. Error #3 persists for real Instagram users. Requires Meta App Review submission to unblock. Jordan Inpulza brand: `igUserId=17841469380903816`, Facebook Page ID: `468497419676631`, `brand_id=9328112e-feed-40c8-b6a3-a69ec99303a8`.
- **Privacy Policy Page (Mar-2026):** Public route at `/privacy` — full English-language privacy policy compliant with Meta App Review requirements. Includes all Meta-required sections: CDN URL handling, human escalation path, PSIDs/IGSIDs disclosure, data deletion instructions (30-day SLA), cookie policy, user rights. Footer link added to landing page. Contact: privacy@repliyo.com. File: `client/src/pages/PrivacyPolicy.tsx`.
- **Landing Page Branding (Mar-2026):** Logo image (`client/src/assets/repliyo-logo.jpg`) now displayed in landing page header (replaced text wordmark) and Privacy Policy navbar. Loading/splash screen added to landing page — shows logo with animated dots for 1.2s then fades to page content.
- **Facebook Sticker/Media Comments (Mar-2026):** Comments containing only Facebook stickers (GIF images from Giphy) now display correctly instead of appearing blank. Metricool sends sticker data in `root.mediaUrl` (not `root.text`). Backend (`metricool.ts`) extracts `commentMediaUrl`; `syncService.ts` detects media type and sets `content='[Sticker]'` with `mediaUrl`/`mediaType` fields. Frontend (`CommentThread.tsx`) renders sticker images inline (120x120px) with fallback text. Conversation previews show "🎭 Sticker". Also handles stickers in nested reply comments.
- **CRM Phone Extraction Fix (Apr-2026):** Fixed critical bug where Facebook system messages ("Facebook created this chat because...") were marked as inbound and contained URLs with numeric Facebook IDs (e.g., `id=100063745503440`) that regex patterns incorrectly captured as phone numbers. Three fixes applied: (1) System message detection — `contactEnrichmentService.isSystemMessage()` identifies and skips FB system messages, auto-labels, and greeting-related messages in 3 languages (EN/ES/PT). (2) URL stripping — all URLs are removed from text before phone regex matching to prevent digits in URLs from being captured. (3) Removed overly broad `\b\d{10,15}\b` regex pattern that matched any 10-15 digit sequence. Both real-time enrichment in `syncService.ts` and backfill in `contactEnrichmentService.ts` are protected. Cleaned 2 SSF contacts that had the FB page ID `100063745503440` stored as phone `+11000637455`.
- **Jonathan Acuña / Simple Tech Skills Agent Config (Apr-2026):** New client onboarding via Metricool. AI Consultant & Trainer ("Doctor AI") connecting TikTok + YouTube. Full config at `docs/agent-config/JONATHAN_ACUNA_AGENT_CONFIG.md`. Includes: system prompt (English-primary, bilingual), knowledge base (products, courses, pricing, cases), guardrails (anti-AI markers, platform adaptation), and a new **Link Magnet / Keyword CTA in Public Comments** section — since TikTok/YouTube have no accessible DMs, the entire link magnet strategy executes in public comment replies. The AI detects keywords from `{{comment}}` and video CTA context from `{{post_context}}` to deliver resources directly in the comment (within TikTok's 150-char limit). Handles 4 cases: exact keyword match, intent without keyword, normal comments, and generic reactions. More intelligent than ManyChat (contextual intent detection, varied responses, no DM dependency). No code changes needed — works entirely through the system prompt + knowledge base.

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

## Pending Feature Plans

### Plan 1: Mejorar el Contexto del Post en Respuestas de IA
**Objetivo:** Enriquecer la información que se envía al LLM sobre el post que se está comentando, para que las respuestas sean más naturales y relevantes.

**Diagnóstico:** `PromptComposer` (`server/services/llm/prompt-composer.ts`) actualmente solo envía el campo `caption` del post, truncado a 500 caracteres. Para DMs pone siempre: `"Este es un mensaje directo privado."`.

**Problemas identificados:**
- Solo la caption cruda — puede empezar con hashtags o emojis sin contexto → **Solución:** Limpiar y extraer el "gancho" del post (primeras 2-3 frases limpias)
- No sabe si es video, reel, imagen o foto → **Solución:** Incluir el tipo de contenido (`video`, `reel`, `image`)
- Para DMs no hay contexto real → **Solución:** Si el DM viene referenciado a un post, incluir ese contexto
- El LLM referencia el post de forma robótica ("he visto tu comentario sobre...") → **Solución:** Agregar instrucción en el prompt de cómo referenciar el post de forma natural

**Archivos a modificar:**
- `server/services/llm/prompt-composer.ts` — función `buildVariableContext` y la sección `--- CONTEXTO DEL POST COMENTADO ---`
- Opcionalmente enriquecer el objeto `socialPost` que llega desde `autoReplyService.ts`

---

### Plan 2: Private Replies Automáticos en Facebook
**Objetivo:** Añadir un modo automático a los Facebook Private Replies: cuando llega un comentario nuevo, el sistema lo responde automáticamente con el template configurado, sin que el agente tenga que hacer clic.

**Diagnóstico:** El sistema actual es 100% manual. El agente debe entrar al Inbox, hacer clic en "Private Reply", revisar el template y enviarlo. El único automatismo existe *después* del primer envío — cuando el usuario responde por Messenger, `autoReplyService` toma el control.

**Arquitectura propuesta — dos modos:**
- **Modo Manual (conservado):** Igual que hoy — agente entra al Inbox, hace clic, revisa y envía.
- **Modo Automático (nuevo):** Comentario nuevo en Facebook → esperar delay configurable → enviar template interpolado automáticamente.

**Cambios necesarios:**

| Capa | Cambio |
|---|---|
| DB | Nueva columna en `ai_agents`: `auto_private_reply_enabled` (boolean) + `auto_private_reply_delay_minutes` (integer, default 0) |
| Backend | En `syncService.ts`, cuando se detecta comentario nuevo de Facebook y `autoPrivateReplyEnabled=true`, llamar directamente a `sendPrivateReply()` con el template interpolado |
| UI — AIAgentConfig | Dentro de la pestaña Private Replies: dos sub-pestañas — **Manual** (actual) \| **Automático** (toggle on/off + configuración de delay) |
| Seguridad | No enviar si ya se envió un private reply a ese comentario (idempotencia usando `internalOrigin=meta_private_reply` en mensajes existentes) |

**Flujo automático completo:**
```
Comentario nuevo en FB
    ↓
syncService detecta: platform=facebook, type=comment, isNew=true
    ↓
¿autoPrivateReplyEnabled=true para este brand?
    ↓ SÍ
Esperar delay configurado (0-30 min)
    ↓
Interpolate template: {{first_name}}, {{username}}, {{comment}}
    ↓
sendPrivateReply() → Meta API
    ↓
Guardar mensaje con internalOrigin=meta_private_reply
    ↓
A partir de ahí: autoReplyService maneja el thread de Messenger automáticamente
```

---

### Meta App Review — Checklist para "Repliyo Inbox"
Para publicar la app y desbloquear `pages_messaging` para todos los usuarios (no solo developers/testers):
1. **Settings → Basic:** Subir App Icon (1024x1024), añadir Privacy Policy URL (`/privacy`), Category = Business
2. **App Review → Permissions and Features:** Solicitar Advanced Access para `pages_messaging`
3. **Cuestionario `pages_messaging`:** Describir uso (private replies de comentarios en Facebook Pages → Messenger para soporte al cliente)
4. **Video demo:** Mostrar flujo completo — comentario en FB → botón Private Reply en Repliyo → mensaje enviado por Messenger (2-3 min)
5. **Cambiar a Live Mode:** Settings → Basic → Switch to Live Mode
6. **URL del App Review:** `https://developers.facebook.com/apps/[APP-ID]/app-review/`
- App "Repliyo Inbox-IG" (Instagram sin Facebook Login, App ID: 1127262189526061) — NO usar para production, tiene conflictos con Business Manager ownership
- App principal "Repliyo Inbox" — esta es la que hay que publicar

### Performance Investigation (Apr-2026)
A thorough investigation of application freezing (20-30s freeze affecting entire browser) identified 6 root causes:
1. **Query Invalidation Cascade (CRITICAL):** WebSocket events trigger 6+ simultaneous `invalidateQueries` calls in Inbox.tsx (21 total calls in file). During sync cycles, dozens of messages arrive, each triggering the cascade. Fix: debounce invalidations.
2. **Monolithic Components:** Inbox.tsx (3,215 lines), LandingPage.tsx (4,191 lines), AIAgentConfig.tsx (3,170 lines) cause full reconciliation on any state change. LandingPage has 56 setInterval/setTimeout calls for animations.
3. **Monolithic NexusContext:** Single context with 20+ properties causes all consumers to re-render on any change.
4. **Aggressive Polling:** 8+ queries with `refetchInterval` (30s-5min) plus `refetchOnWindowFocus: true` triggers all queries when returning to tab.
5. **Backend Sync Load:** SyncService processes all brands sequentially every 2 minutes, sending WebSocket notifications per message (amplifies #1).
6. **Auth Check on Visibility:** `checkAuth` in AuthContext.tsx fires on `pageshow`/`visibilitychange` events.

**Already mitigated:** `staleTime: 30000` is set globally in queryClient.ts.
**Refactoring plan:** 3 phases documented in `docs/audits/performance-freeze-investigation-2026-04.md` — from low-risk/high-impact (debounce, reduce polling) to structural changes (context splitting, component extraction, sync optimization).

## External Dependencies
- **Metricool:** Used for syncing social media direct messages and comments.
- **OpenAI / Gemini:** Large Language Model (LLM) providers for generating responses, summaries, and executing CRM functions.
- **Meta Graph API / Messenger Platform:** Used for sending Facebook Private Replies (DMs) from Page to comment authors.
- **PostgreSQL:** The primary relational database for all system data, leveraging UUIDs and JSONB data types.