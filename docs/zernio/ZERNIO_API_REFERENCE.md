# Zernio API — Referencia para Repliyo (Inbox / WhatsApp)

> Referencia curada y verificada para la integración Zernio ↔ Repliyo.
> Fuente oficial: https://docs.zernio.com/ — volcado completo en `docs/zernio/zernio-llms-full.txt`.
> Capturado y verificado en vivo: 2026-06-17.

---

## 1. Conceptos base

Zernio es una plataforma de social media (scheduling + inbox/DMs) controlable por API.

| Concepto | Qué es |
|---|---|
| **Profile** | Contenedor que agrupa cuentas sociales (≈ "marca"/"proyecto"). |
| **Account** | Una cuenta social conectada (ej. el número de WhatsApp Business), pertenece a un profile. `accountId` con prefijo `acc_`. |
| **Posts / Queue** | Programación y publicación de contenido (no lo usamos en el observer de WhatsApp). |
| **Inbox** | Conversaciones (DMs) de todas las cuentas de mensajería conectadas. **Esto es lo que usamos.** |

WhatsApp es una de las 15 plataformas soportadas (`platform: "whatsapp"`).

---

## 2. Base URL y autenticación

- **Base URL oficial (docs):** `https://zernio.com/api/v1`
- **Base URL alternativa (la que usa nuestro adapter/probe y QUE TAMBIÉN responde con datos reales):** `https://api.zernio.com/v1`
  - ⚠️ Las dos resuelven los mismos endpoints. Si alguna vez hay un comportamiento raro, probar la oficial `zernio.com/api/v1` como fallback.
- **Auth:** header `Authorization: Bearer <API_KEY>`
- **Formato de la key:** prefijo `sk_` + 64 hex (67 chars total). Solo se muestra una vez al crearla. Se guarda hasheada (SHA-256).
- En Repliyo el token vive en el secret `ZERNIO_API_TOKEN`.

### Códigos de error relevantes
- **401 Unauthorized** → token inválido/ausente.
- **403 Inbox addon required** (`INBOX_REQUIRED`) → la cuenta Zernio NO tiene el addon de Inbox habilitado. (Nos pasó con el primer token; se resolvió creando un token nuevo con permiso de Inbox.)
- **400** → parámetro inválido. Ej.: `status` con un valor no permitido devuelve `"status is invalid"`.

---

## 3. ⚠️ Convención de parámetros (LECCIÓN CLAVE — verificada en vivo)

**Todos los parámetros de los endpoints de Inbox son camelCase**, NO snake_case:
`accountId`, `profileId`, `sortOrder` — **NUNCA** `account_id`, `profile_id`, `sort_order`.

Matiz importante que descubrimos:
- En **List conversations** (`GET /inbox/conversations`), `accountId` es **opcional**. Por eso un `account_id` (snake) mal escrito **no da error**: simplemente se ignora y el endpoint devuelve conversaciones de TODAS las cuentas, sin filtrar por la de WhatsApp. Parece que "funciona" pero NO está scopeado. → Hay que enviar `accountId` camelCase para filtrar de verdad.
- En **List messages** (`GET /inbox/conversations/{id}/messages`), `accountId` es **obligatorio**. Si se manda `account_id` (snake), responde error de que falta `accountId`.

**Valores de `status`:** sólo `active` o `archived`. (Antes usábamos `open`, que da 400.)

> Estado del código Repliyo (a 2026-06-17): `zernioWhatsAppAdapter.ts` y `probe-zernio-whatsapp.ts` necesitan corregir a camelCase (`accountId`, `sortOrder`) y usar `status=active`. Pendiente de PR de Codex.

---

## 4. Endpoints de Inbox que usa (o usará) Repliyo

Prefijo: `{BASE_URL}` = `https://zernio.com/api/v1` (o `https://api.zernio.com/v1`).

### 4.1 List conversations — `GET /inbox/conversations`
Lista DMs de todas las cuentas de mensajería conectadas (agregadas y deduplicadas).
Plataformas: Facebook, Instagram, X/Twitter, Bluesky, Reddit, Telegram, **WhatsApp**.

**Query params (todos opcionales, camelCase):**
| Param | Descripción |
|---|---|
| `profileId` | Filtrar por profile |
| `platform` | Filtrar por plataforma (`whatsapp`) |
| `status` | `active` \| `archived` |
| `sortOrder` | orden por `updatedTime` |
| `limit` | máximo a devolver |
| `cursor` | cursor de paginación |
| `accountId` | filtrar por cuenta social concreta (**mándalo siempre para scopear a WhatsApp**) |

**Respuesta 200 (campos clave por conversación):** `id`, `platform`, `accountId`, `accountUsername`, `participantId`, `participantName`, `participantPicture`, `lastMessage`, `updatedTime`, `status` (`active`/`archived`), `unreadCount`, `url`. Más `pagination.{hasMore,nextCursor}` y `meta.{accountsQueried,accountsFailed,failedAccounts[],lastUpdated}`.

### 4.2 List messages — `GET /inbox/conversations/{conversationId}/messages`
**Read-only**: NO marca como leído ni envía confirmaciones de lectura. Ideal para el modo observer.

**Params:**
- `conversationId` (path, requerido) — el `id` de la conversación (identificador de plataforma, NO un id interno de BD).
- `accountId` (query, **requerido**, camelCase).
- `limit` (query, opcional) — default 100, máx 100.
- `cursor` (query, opcional) — pasar `pagination.nextCursor` de la respuesta previa (opaco, no parsear).
- `sortOrder` (query, opcional) — default `asc` (más antiguos primero). Para "últimos mensajes": `?sortOrder=desc&limit=N`. WhatsApp respeta el orden. El campo `sortOrderApplied` de la respuesta dice qué orden se aplicó realmente.

**Respuesta 200:** `messages[]` (cada uno con `id`, etc.), `pagination.{hasMore,nextCursor}`, `sortOrderApplied` (`asc`/`desc`).

### 4.3 Get conversation — `GET /inbox/conversations/{conversationId}`
Metadatos de una conversación. `accountId` (query, **requerido**).
Devuelve `data` con `id`, `accountId`, `platform`, `status`, `participantName`, `participantId`, `lastMessage`, `lastMessageAt`, `updatedTime`, `participants[]`.

### 4.4 Update conversation status — `PUT /inbox/conversations/{conversationId}`
⚠️ Es **PUT** (no POST). Archiva/activa una conversación.
**Body:** `accountId` (requerido), `status` (`active` \| `archived`).
(404 sólo en WhatsApp; otras plataformas hacen upsert.)

### 4.5 Mark a conversation as read — `POST /inbox/conversations/{conversationId}/read`
Marca como leídos los entrantes. En WhatsApp envía **blue ticks** (excepto en cuentas coexistence).
**Body:** `accountId` (requerido). Respuesta: `success`, `markedCount`.
> ❌ NO usar en modo observer (Fase 1) — manda confirmaciones de lectura al cliente.

### 4.6 Send typing indicator — `POST /inbox/conversations/{conversationId}/typing`
WhatsApp: muestra "escribiendo…" hasta 25s; **requiere un mensaje entrante reciente y lo marca como leído como efecto secundario**. Best-effort (siempre 200).
**Body:** `accountId` (requerido).
> ❌ NO usar en modo observer (marca como leído).

### 4.7 Send message — `POST /inbox/conversations/{conversationId}/messages`
Envía un mensaje (texto, adjuntos, quick replies, botones, plantillas, tags). Soporte varía por plataforma.
WhatsApp: dentro de la ventana de 24h se puede mandar texto libre. Fuera de la ventana hay que usar plantilla aprobada (campo `template`).
> ❌ NO usar en modo observer (Fase 1 es sólo lectura).

### 4.8 Create conversation (plantilla WhatsApp) — `POST /inbox/conversations`
Inicia una conversación nueva. En WhatsApp **requiere plantilla aprobada** (`templateName`, `templateLanguage`, `templateParams`, teléfono en `participantId`). Sin plantilla → `TEMPLATE_REQUIRED`. Es la vía para re-enganchar tras cerrarse la ventana de 24h.
**Rate limits (compartidos entre todos los endpoints de DM):** 200 req / 15 min, 1.000 / 24h por usuario, 15.000 / 24h por app.
> ❌ NO usar en modo observer.

### Otros endpoints de Inbox disponibles (no usados aún)
`Add reaction`, `Remove reaction`, `Edit message`, `Delete message`, `Upload media file`. Además analytics de inbox (volumen, response-time, heatmap, source breakdown, top accounts).

---

## 5. Conectar WhatsApp a Zernio (headless) — `POST /v1/connect/whatsapp/credentials`
Alternativa al Embedded Signup. **Body:** `profileId`, `accessToken` (System User token permanente de Meta), `wabaId`, `phoneNumberId`.
Pasos para obtener credenciales: Meta Business Suite → WABA → System User con permisos `whatsapp_business_management` + `whatsapp_business_messaging` → token permanente → WABA ID y Phone Number ID desde WhatsApp Manager.
> Para Inpulza esto ya lo gestionó Cowork; nosotros sólo consumimos el `ACCOUNT_ID` resultante.

---

## 6. Modo Observer (Fase 1) — qué SÍ y qué NO

**SÍ (sólo lectura, sin efectos visibles para el cliente):**
- `GET /inbox/conversations?accountId=...&status=active`
- `GET /inbox/conversations/{id}/messages?accountId=...`
- `GET /inbox/conversations/{id}?accountId=...`

**NO (tienen efectos secundarios visibles para el cliente):**
- `POST .../read` → blue ticks
- `POST .../typing` → "escribiendo…" + marca leído
- `POST .../messages` y `POST /inbox/conversations` → envían mensajes
- `PUT /inbox/conversations/{id}` → cambia el estado (archivar)

---

## 7. Identificadores de Inpulza (referencia rápida)
- `ZERNIO_WHATSAPP_ACCOUNT_ID = 6a05d9385e333c0529696d05` (validado por Cowork — es el `accountId` de Zernio).
- `ZERNIO_WHATSAPP_BLOG_ID = 4074962` → es el `metricool_blog_id` de la marca Inpulza en Repliyo (clave de scoping del lado Repliyo), **NO** un ID de Zernio. Brand id Repliyo: `72307812-2edb-43a6-884b-e19f1a9cf200`.
- Token en secret `ZERNIO_API_TOKEN` (creado con permiso de Inbox tras el 403 inicial).

---

## 8. Cómo actualizar esta referencia
Los docs de Zernio son un sitio Mintlify con volcado completo en texto:
- Índice de páginas: `https://docs.zernio.com/llms.txt`
- Documentación completa: `https://docs.zernio.com/llms-full.txt`
- Sitemap: `https://docs.zernio.com/sitemap.xml`

Para refrescar: re-descargar `llms-full.txt` a `docs/zernio/zernio-llms-full.txt` y revisar la sección **Inbox** (buscar `# List conversations API Reference`, `# List messages API Reference`, etc.).
