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
- **Facebook Private Replies (Mar-2026):** Agents can send private DMs (Messenger messages) to users who commented on Facebook posts, Reels, or videos, directly from the Inbox. Uses the Meta Messenger Platform Send API (`POST /{page-id}/messages` with `recipient.comment_id`). Metricool stores comment IDs in compound format `{postId}_{commentId}`; the system extracts the real ID from the permalink's `comment_id=` param or by stripping the post prefix. Page Access Tokens are permanent (`expires_at=0`) and stored in `meta_page_connections`. Requires `pages_messaging` permission. After the first private reply, subsequent Messenger DMs in that thread are handled by autoReplyService automatically. Key files: `server/services/metaService.ts` (API call), `server/routes.ts` (ID extraction + route), `client/src/components/AIAgentConfig.tsx` (page connection UI + auto mode UI).
- **Auto Private Reply / Modo Automático (Mar-2026):** New feature in AI Agent Config > Private Replies. Three new columns in `ai_agents`: `auto_private_reply_enabled` (bool), `auto_private_reply_delay_minutes` (int), `auto_private_reply_use_ai` (bool). When enabled, `syncService.triggerAutoPrivateReply()` fires after every new Facebook comment (fire-and-forget). Uses idempotency check (checks existing `meta_private_reply` messages for same `parentMessageId`) before and after the configured delay. Supports template mode (interpolates template) and AI mode (calls LLM with enriched post context, falls back to template on failure). Only for Facebook (Instagram blocked by Meta App Review).
- **Enriched `{{post_context}}` (Mar-2026):** `enrichPostContext()` in `server/services/llm/prompt-composer.ts` (now exported) replaces the raw `caption.slice(0, 500)` with a rich block: content type (Reel/Video/Imagen/Post), clean caption (hashtag blocks stripped, up to 1500 chars real content), permalink URL, and a natural-reference instruction. Used in: LLM auto-replies, reminder prompts, manual private reply template preview (routes.ts), and auto private replies (syncService). DMs get a tailored fallback when no post is associated.
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

## External Dependencies
- **Metricool:** Used for syncing social media direct messages and comments.
- **OpenAI / Gemini:** Large Language Model (LLM) providers for generating responses, summaries, and executing CRM functions.
- **Meta Graph API / Messenger Platform:** Used for sending Facebook Private Replies (DMs) from Page to comment authors.
- **PostgreSQL:** The primary relational database for all system data, leveraging UUIDs and JSONB data types.