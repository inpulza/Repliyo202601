# Private Replies — Investigación Completa y Estrategia de Implementación

> Documento creado: 26 de marzo de 2026
> Última actualización: 26 de marzo de 2026

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual — Facebook Private Replies (IMPLEMENTADO)](#2-estado-actual--facebook-private-replies-implementado)
3. [Estado Actual — Instagram Private Replies (BLOQUEADO por Meta)](#3-estado-actual--instagram-private-replies-bloqueado-por-meta)
4. [Estrategia Alternativa — ManyChat + Repliyo para Instagram](#4-estrategia-alternativa--manychat--repliyo-para-instagram)
5. [Investigación de Cruce de Datos — Pruebas Reales](#5-investigación-de-cruce-de-datos--pruebas-reales)
6. [Anatomía de los IDs y el Mensaje Handshake](#6-anatomía-de-los-ids-y-el-mensaje-handshake)
7. [Cuentas y Configuración Actual](#7-cuentas-y-configuración-actual)
8. [Plan de Implementación — Cruce Automático Instagram](#8-plan-de-implementación--cruce-automático-instagram)
9. [Referencia Técnica — Archivos Clave](#9-referencia-técnica--archivos-clave)
10. [Skill de Referencia — Facebook Private Replies](#10-skill-de-referencia--facebook-private-replies)

---

## 1. Resumen Ejecutivo

Repliyo necesita enviar **Private Replies** (mensajes directos privados) a usuarios que comentan en las publicaciones de las marcas clientes, tanto en Facebook como en Instagram.

| Plataforma | Estado | Mecanismo |
|---|---|---|
| **Facebook** | ✅ Implementado y funcionando | API directa de Meta (Messenger Platform Send API) |
| **Instagram** | ❌ Bloqueado por Meta App Review | Código listo, pero `instagram_manage_messages` requiere Advanced Access |
| **Instagram (alternativa)** | 🔄 En investigación | ManyChat abre el DM → Repliyo toma el control con IA |

### Contexto del negocio

- Se usó **Respond.io** anteriormente en BOTrust para gestionar conversaciones, incluyendo private replies.
- Se usa **ManyChat** activamente para automatizar private replies en Instagram para las cuentas de BOTrust y Solidaridad Sin Fronteras.
- Repliyo es **más inteligente que ManyChat** porque tiene un LLM conectado con contexto del post, reglas del agente, knowledge base, CRM y guardrails.
- El objetivo es que **ManyChat abra la puerta** (envíe el DM inicial) y **Repliyo tome el control** de la conversación con su inteligencia artificial.

---

## 2. Estado Actual — Facebook Private Replies (IMPLEMENTADO)

### Cómo funciona

1. Un usuario comenta en un post/video/Reel de Facebook de la marca
2. El agente (o el sistema automático) envía un Private Reply desde Repliyo
3. Repliyo usa la **API de Messenger Platform** (`POST /{page-id}/messages` con `recipient.comment_id`)
4. El usuario recibe un DM en su Messenger
5. Si el usuario responde, `autoReplyService` toma el control automáticamente

### Modos de operación

| Modo | Descripción |
|---|---|
| **Manual** | El agente entra al Inbox, ve el comentario, hace clic en "Private Reply", revisa el template y envía |
| **Automático** | Comentario nuevo → esperar delay configurable → enviar template interpolado automáticamente |

### Cuenta configurada

| Campo | Valor |
|---|---|
| Brand | Jordan Delgado |
| Facebook Page ID | `468497419676631` |
| Page Name | Jordan Inpulza |
| IG User ID | `17841469380903816` |
| Auto Private Reply | ✅ Habilitado |
| Usa IA para Auto Reply | ✅ Sí |
| Secret en Replit | `META_JORDAN_INPULZA_USER_TOKEN` |

### Mensaje "Handshake"

Cuando se envía un Facebook Private Reply, el sistema genera dos mensajes en la conversación de DM:

**Mensaje 1 — El Private Reply:**
```
Hola, ~Pablito ¿cómo estás? He visto tu comentario sobre taxes en mi video 
¿algo en lo que podamos ayudarte? Cualquier cosa pueden escribirnos a nuestro 
WhatsApp al (305) 639-0110. O te podemos dar respuesta por acá, cualquier duda 
que tengas. Sí?, un saludo!!
```

**Mensaje 2 — El Handshake (generado por la plataforma, no por Repliyo):**
```
Estás respondiendo el comentario de un usuario en una publicación de tu página. 
Ver comentario(https://facebook.com/61565322155205/videos/1453383796148155/
?comment_id=1376842070300452&reply_comment_id=1718794826028773)
```

Este handshake **solo existe en Facebook**. Es generado por Meta/Respond.io cuando se envía el private reply. En Instagram (vía ManyChat) **no se genera este mensaje**.

### Token Flow (Facebook)

```
Short-lived User Token (2h)     ← Se genera en Graph API Explorer
    ↓  GET /oauth/access_token?grant_type=fb_exchange_token
Long-lived User Token (60 días)
    ↓  GET /me/accounts
Page Access Token (PERMANENTE, expires_at = 0)  ← Se guarda en meta_page_connections
```

### Extracción del Comment ID

Metricool envía IDs en formato compuesto `{postId}_{commentId}`. El sistema extrae el ID real:

```typescript
// Prioridad 1: separar compuesto POSTID_COMMENTID (siempre confiable)
const extractedFromCompound = rawCommentId.includes('_') ? rawCommentId.split('_').pop() : null;

// Prioridad 2 fallback: permalink comment_id (NO confiable — puede contener post ID)
const permalinkMatch = permalink.match(/comment_id=(\d+)/);
```

### API Call (Facebook)

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

---

## 3. Estado Actual — Instagram Private Replies (BLOQUEADO por Meta)

### Implementación técnica (COMPLETA en código)

El código está listo en Repliyo:
- `sendInstagramPrivateReply()` en `metaService.ts`
- Columna `igUserId` en `meta_page_connections`
- Routing por plataforma en `routes.ts`
- Botón habilitado en `CommentThread.tsx`

### ¿Por qué está bloqueado?

| Aspecto | Detalle |
|---|---|
| **Permiso necesario** | `instagram_manage_messages` |
| **Nivel requerido** | Advanced Access (requiere Meta App Review) |
| **Error actual** | Error #3 para usuarios reales (no developers/testers) |
| **Lo que falta** | Enviar la app a Meta App Review y pasar la revisión |

### API Call (Instagram — cuando se desbloquee)

```
POST https://graph.facebook.com/v19.0/{IG_USER_ID}/messages
Authorization: Bearer {PAGE_ACCESS_TOKEN}
Content-Type: application/json

{
  "recipient": { "comment_id": "<IG_COMMENT_ID>" },
  "message": { "text": "Hola, gracias por tu comentario..." }
}
```

### Meta App Review Checklist

1. Settings → Basic: App Icon (1024x1024), Privacy Policy URL (`/privacy`), Category = Business
2. App Review → Permissions: Solicitar Advanced Access para `pages_messaging` + `instagram_manage_messages`
3. Cuestionario: Describir uso (private replies de comentarios → DM para soporte al cliente)
4. Video demo: Flujo completo comentario → private reply → DM (2-3 min)
5. Cambiar a Live Mode
6. App principal: "Repliyo Inbox" (NO usar "Repliyo Inbox-IG" que tiene conflictos)

---

## 4. Estrategia Alternativa — ManyChat + Repliyo para Instagram

### El problema

Instagram Private Replies directos desde Repliyo están bloqueados por Meta App Review. ManyChat ya tiene este permiso aprobado.

### La solución propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario comenta en video de Instagram                   │
│     ↓                                                       │
│  2. Repliyo responde el COMENTARIO públicamente (con IA)    │
│     (contexto del video, tono personalizado, CTA)           │
│     ↓                                                       │
│  3. ManyChat detecta el comentario → envía DM privado       │
│     (template genérico: "Hola, vi tu comentario...")        │
│     ↓                                                       │
│  4. Metricool sincroniza el DM → Repliyo lo ve              │
│     (aparece como mensaje outbound de la marca)             │
│     ↓                                                       │
│  5. Usuario RESPONDE al DM                                  │
│     ↓                                                       │
│  6. Repliyo detecta el mensaje inbound                      │
│     ↓                                                       │
│  7. Repliyo CRUZA el username del DM con los comentarios    │
│     → encuentra qué dijo y en qué video                     │
│     ↓                                                       │
│  8. La IA responde con contexto completo:                   │
│     "Vi que comentaste en nuestro video sobre [tema],       │
│      dijiste que te interesa [X]. Te cuento que..."         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Ventajas de esta estrategia

| Aspecto | ManyChat solo | ManyChat + Repliyo |
|---|---|---|
| Mensaje inicial | Template genérico | Template genérico (ManyChat) |
| Respuestas posteriores | Templates estáticos / flows | **IA con contexto completo** |
| Conoce el comentario | No | **Sí (cruce por username)** |
| Conoce el video/post | No | **Sí (por el comment thread)** |
| Reglas de negocio | Básicas | **Knowledge base + guardrails** |
| CRM | No | **Automático (crea contacto, enriquece datos)** |
| Seguimiento | Manual | **Reminders automáticos** |

### Caveat importante (CONFIRMADO)

**Repliyo solo puede responder DESPUÉS de que el usuario responda al DM de ManyChat.**

Flujo técnico:
1. ManyChat envía DM → Repliyo lo ve como **outbound** → **no hace nada**
2. Usuario responde → Repliyo detecta **inbound** → activa buffer → IA responde

Esto es correcto y deseable. No queremos que Repliyo y ManyChat hablen al mismo tiempo.

---

## 5. Investigación de Cruce de Datos — Pruebas Reales

### Prueba 1: BOTrust (Facebook) — Cruce por Comment ID ✅

**Caso: Pablito Lopzhdz**

| Dato | Valor | Ubicación |
|---|---|---|
| **Comentario original** | "Hola yo quiero información" (Robert Gasper) | Comment thread, `metricool_id`: `1453383796148155_1376842070300452` |
| **Reply de Pablito** | "BO Trust Service hacen en California" | Comment thread, `metricool_id`: `1453383796148155_1718794826028773` |
| **Handshake en DM** | `comment_id=1376842070300452&reply_comment_id=1718794826028773` | DM conversation `b0d8108e-...` |
| **Private Reply en DM** | "Hola, ~Pablito ¿cómo estás?..." | Mismo DM conversation |

**Cruce exitoso:** El `comment_id` en la URL del handshake coincide con el `metricool_id` del comentario (segunda parte después del `_`).

**Total de handshakes en BOTrust:** 110 mensajes, todos en conversaciones tipo DM.

### Prueba 2: BOTrust (Instagram) — Cruce por Username ✅

**Caso: tifany0803a (Tiffany)**

| Dato | Valor | Ubicación |
|---|---|---|
| **DM de Instagram** | Conversación con `customer_name` = `tifany0803a` | DM conv `0fe9a6b6-...` |
| **Comentario en Instagram** | "Yo creo que tendré que pagar no las he echo hize 17 mil..." | Comment thread `0314d659-...`, `author` = `tifany0803a` |
| **Handshake** | ❌ **No existe** (es Instagram, no Facebook) | — |
| **Video donde comentó** | Thread de `dervispericana` (nombre del primer comentarista, NO del video) | `metricool_id`: `17955505517942808` |

**Cruce exitoso por username:** `tifany0803a` aparece tanto en el DM como en los comentarios. Sin handshake, pero el username es suficiente para vincular.

**Nota importante:** Los comment threads pertenecen al VIDEO/POST, no al usuario. El `customer_name` de la conversación es el primer comentarista, pero dentro hay múltiples usuarios comentando con anidamiento.

### Prueba 3: Solidaridad Sin Fronteras (Instagram) — Cruce masivo ✅

**Datos de la cuenta:**

| Tipo | Instagram | Facebook |
|---|---|---|
| DM conversations | 27 | 34 |
| Comment threads | 20 | 22 |

**Resultado del cruce Instagram DM ↔ Comentarios:**

De **27 usuarios con DMs**, **12 también tienen comentarios** = **44% de match**.

#### Usuarios con cruce exitoso (12):

| Username | Comentó | En qué video/thread | Primer DM |
|---|---|---|---|
| `chiquinquira2989` | "Información" | Thread `yennis1222` | Template de ManyChat (Helmer Dieguez) |
| `djokarii` | "Nurse" | Thread `djokarii` | Template de ManyChat → respondió "Info" |
| `drjuliocesaralfonso` | Respondió a otro usuario por la marca | Thread `mercy.pediatra` | Template de ManyChat (múltiples mensajes) |
| `garciaceliaperez` | "Información de Medical Asistent por favor" | Thread `melissasuarezdelvillar` | Template de ManyChat → dio su correo |
| `linafgalindo` | "Info" | Thread `sakitaana` | Template de ManyChat |
| `linetdelolmo` | "Info" | Thread `dra.gerimar` | Template de ManyChat |
| `mariadelcarmencorellamorales` | "Médico general" | Thread `nancychaile4` | Template de ManyChat |
| `marycrivero` | "Quiero hacer curso de feblotomia" | Thread `melissasuarezdelvillar` | Template de ManyChat |
| `melissasuarezdelvillar` | "Y Medical asistent no hay cursos ahora" | Thread `melissasuarezdelvillar` | Template de ManyChat |
| `piabloom_` | "Nurse" | Thread `jmdsc23` | Template de ManyChat |
| `ronimeisbel` | "Información" | Thread `sani_pac_services` | DM previo: "Quiero presentar un examen de inglés..." |
| `wendyrock007` | "USMLE" | Thread `samoflo1` | DM previo → dio su email |

#### Usuarios con DM pero SIN comentario encontrado (15):

`bettssymadrid`, `cardiotorres`, `cruzverdeinternacional`, `daniguti06`, `elisa.araujo.37266136`, `felipaos0616`, `ga_aguilarguzman`, `gabymelendezl`, `karelysjorke`, `listjimenez`, `mayeacosta05`, `medal.rosa`, `oneydamaltez`, `vgn2508`, `yessikacarrasquero`

Estos pueden ser usuarios que escribieron directamente al DM sin haber comentado en un video, o cuyos comentarios aún no se sincronizaron.

### Ejemplo detallado de cruce ideal

**garciaceliaperez:**
- **Comentó:** "Información de Medical Asistent por favor" en un video de Instagram
- **ManyChat le envió DM:** Template genérico de Helmer Dieguez pidiendo nombre, teléfono y correo
- **Ella respondió al DM:** "Celia Pérez García, correo epidemióloga2006@gmail.com"

**Lo que Repliyo podría haber hecho con el cruce:**
> "Hola Celia, vi que estás interesada en el programa de Medical Assistant. 
> Te cuento que tenemos próximamente un curso con certificación. ¿Te gustaría 
> que te envíe los detalles de fechas, requisitos y costos?"

En vez del template genérico que no menciona nada específico.

---

## 6. Anatomía de los IDs y el Mensaje Handshake

### URL del Handshake (Facebook)

```
https://facebook.com/61565322155205/videos/1453383796148155/?comment_id=1376842070300452&reply_comment_id=1718794826028773
                     └──────────┘         └──────────────┘              └──────────────┘                    └──────────────┘
                      Page ID              Video ID                      Comment ID (raíz)                   Reply Comment ID
```

| Componente | Descripción | Ejemplo |
|---|---|---|
| `61565322155205` | **Facebook Page ID** de la marca (BOTrust) | Identifica la página |
| `1453383796148155` | **Video/Post ID** — el contenido donde se comentó | Identifica el video |
| `comment_id` | **Comment ID** — el comentario raíz (puede ser de otro usuario) | `1376842070300452` |
| `reply_comment_id` | **Reply Comment ID** — la respuesta específica dentro del hilo | `1718794826028773` |

### Formato de Metricool ID (compuesto)

```
1453383796148155_1376842070300452
└──────────────┘ └──────────────┘
   Post/Video ID    Comment ID
```

Separar por `_` y tomar la segunda parte da el Comment ID real.

### Instagram Comment IDs (Metricool)

En Instagram, Metricool usa IDs simples (no compuestos):
```
17955505517942808    ← ID del comentario directamente
```

No hay handshake ni URL de permalink en Instagram vía ManyChat. El cruce se hace por **username**.

---

## 7. Cuentas y Configuración Actual

### Meta Page Connections

| Brand | Page ID | Page Name | IG User ID | Activa | Secret |
|---|---|---|---|---|---|
| Jordan Delgado | `468497419676631` | Jordan Inpulza | `17841469380903816` | ✅ | `META_JORDAN_INPULZA_USER_TOKEN` |

### AI Agents — Configuración Private Reply

| Brand | Auto PR Enabled | Delay (min) | Usa IA |
|---|---|---|---|
| **Jordan Delgado** | ✅ Sí | 0 | ✅ Sí |
| BO Trust | ❌ No | 0 | ❌ No |
| solidaridadsinfronteras | ❌ No | 0 | ❌ No |
| Inpulza | ❌ No | 0 | ❌ No |
| Fortress | ❌ No | 0 | ❌ No |
| addysrevemd | ❌ No | 0 | ❌ No |

### Herramientas externas por cuenta

| Cuenta | ManyChat | Respond.io | Repliyo IA |
|---|---|---|---|
| **BOTrust** | ✅ Activo (IG) | ⏹ Desconectado | ✅ Activo (FB comments) |
| **Solidaridad Sin Fronteras** | ✅ Activo (IG) | ⏹ Desconectado | 🔄 Conectado, sin prompt |
| **Jordan Delgado** | ❌ | ❌ | ✅ Activo (FB+IG comments, Private Replies) |

---

## 8. Plan de Implementación — Cruce Automático Instagram

### Objetivo

Cuando ManyChat abra un DM en Instagram y el usuario responda, Repliyo debe:
1. Detectar el DM inbound
2. Buscar si ese username tiene comentarios recientes en videos de la marca
3. Si hay match: inyectar el contexto del comentario y del video en el prompt de la IA
4. La IA responde con conocimiento de qué dijo el usuario y en qué video

### Lógica de cruce propuesta

```typescript
async function findCommentContextForDMUser(brandId: string, username: string): Promise<CommentContext | null> {
  // 1. Buscar comentarios recientes de este author en comment threads de Instagram
  const recentComments = await storage.findCommentsByAuthor(brandId, 'instagram', username);
  
  if (recentComments.length === 0) return null;
  
  // 2. Tomar el comentario más reciente
  const latestComment = recentComments[0];
  
  // 3. Obtener el contexto del post/video (caption, tipo, etc.)
  const postContext = await getPostContextFromCommentThread(latestComment.conversationId);
  
  return {
    commentContent: latestComment.content,    // "Quiero hacer curso de feblotomia"
    commentDate: latestComment.createdAt,
    postContext: postContext,                  // "Video sobre programas de salud..."
    threadName: latestComment.threadName,      // Nombre del thread
  };
}
```

### Dónde inyectar

En `autoReplyService.ts` o `prompt-composer.ts`, cuando se procesa un DM de Instagram:

```typescript
// Si es un DM de Instagram y es la primera respuesta del usuario
if (conversation.platform === 'instagram' && conversation.type === 'dm') {
  const commentContext = await findCommentContextForDMUser(brandId, conversation.customerName);
  if (commentContext) {
    // Inyectar en el prompt: "Este usuario comentó '[contenido]' en un video sobre [tema]"
  }
}
```

### Consideraciones

| Aspecto | Detalle |
|---|---|
| **Múltiples comentarios** | Si el usuario comentó en varios videos, tomar el más reciente |
| **Timing** | Solo buscar comentarios de los últimos 7 días (ventana de ManyChat) |
| **Username match** | Exacto — los usernames de Instagram son únicos |
| **Facebook vs Instagram** | En Facebook ya tenemos el handshake con comment_id (cruce directo). Este cruce por username es solo para Instagram |
| **Performance** | Hacer un query indexado por `author` + `brand_id` + `platform` + `created_at` |

### Fases de implementación

| Fase | Descripción | Prioridad |
|---|---|---|
| **Fase 1** | Query de cruce por username (backend) | Alta |
| **Fase 2** | Inyección de contexto en el prompt de la IA | Alta |
| **Fase 3** | Indicador visual en el Inbox ("Este usuario comentó en...") | Media |
| **Fase 4** | Dashboard de analytics: tasa de conversión comentario → DM → respuesta | Baja |

---

## 9. Referencia Técnica — Archivos Clave

| Archivo | Función |
|---|---|
| `server/services/metaService.ts` | `sendPrivateReply()`, `sendInstagramPrivateReply()` — API calls a Meta |
| `server/services/syncService.ts` | Sincronización con Metricool, `triggerAutoPrivateReply()`, detección de comentarios nuevos |
| `server/services/autoReplyService.ts` | IA auto-reply para DMs, buffer, cooldowns |
| `server/services/llm/prompt-composer.ts` | Construcción de prompts, `enrichPostContext()`, `enrichPostContextForTemplate()` |
| `server/routes.ts` | Endpoint `/api/inbox/private-reply`, extracción de comment IDs |
| `client/src/components/CommentThread.tsx` | UI del botón Private Reply en comentarios |
| `client/src/components/AIAgentConfig.tsx` | Configuración de Facebook pages, auto mode, templates |
| `shared/schema.ts` | Tablas `meta_page_connections`, `ai_agents` (columnas auto_private_reply_*) |
| `server/services/crmTrafficController.ts` | Creación automática de contactos CRM desde DMs |
| `server/services/dmBufferService.ts` | Buffer de mensajes (espera antes de responder) |

### Tablas de base de datos relevantes

**`meta_page_connections`**
```
id | brand_id | page_id | page_name | page_access_token | ig_user_id | is_active | created_at
```

**`ai_agents`** (columnas de private reply)
```
auto_private_reply_enabled | auto_private_reply_delay_minutes | auto_private_reply_use_ai
```

**`messages`** (campos relevantes para cruce)
```
id | conversation_id | content | author | direction | metricool_id | internal_origin | created_at
```

**`conversations`** (para identificar comment threads vs DMs)
```
id | brand_id | platform | type ('comment' | 'dm') | customer_name | thread_external_id
```

---

## 10. Skill de Referencia — Facebook Private Replies

El skill completo para configurar una nueva cuenta de Facebook Private Replies está en:

```
.agents/skills/facebook-private-replies/SKILL.md
```

Incluye:
- Setup paso a paso del Facebook Developer Portal
- Generación de tokens (User → Long-lived → Page permanente)
- Configuración de secrets en Replit
- Comment ID extraction (compound format)
- API calls para Facebook e Instagram
- Error reference (códigos 190, 200, 100, etc.)
- Checklist para nuevas cuentas
- Schema de `meta_page_connections`

---

## Apéndice A — Datos de la Investigación en Crudo

### BOTrust — Mensajes Handshake encontrados (110 total, muestra)

| Usuario | Video ID | Comment ID | Reply Comment ID |
|---|---|---|---|
| Pablito Lopzhdz | `1453383796148155` | `1376842070300452` | `1718794826028773` |
| Luciana Diniz | `1453383796148155` | `1431999345306713` | — |
| Alimor Williams Garth | `1336725418227609` | `783657310732629` | — |
| Jorge Javier | `1453383796148155` | `1266686938641876` | — |
| Jose Rivera | `1336725418227609` | `884933111014112` | — |
| David Canedo | `1336725418227609` | `2069475763624477` | — |
| Mario Mendoza | `1336725418227609` | `895912582844127` | — |
| Manuel Vazquez | `849241414658947` | `1378529656786354` | — |

### Solidaridad Sin Fronteras — Template de ManyChat detectado

El template que ManyChat envía automáticamente en Instagram es:

```
👋 ¡Hola!
Soy Helmer Dieguez y quiero agradecerte personalmente por tu interés 
en los programas educativos de Solidaridad Sin Fronteras.

Será un gusto compartir contigo todos los detalles de nuestras 
capacitaciones en el área de la salud y acompañarte en tu camino 
profesional aquí en los Estados Unidos.

Para poder enviarte la información completa y adaptada a ti, 
por favor compárteme estos datos:
• Nombre completo
• Número de teléfono (preferiblemente de EE. UU.)
• Correo electrónico

📲 También, si lo prefieres, puedes escribirme directamente:
Helmer Dieguez
Junior Social Media Specialist
📞 786.410.6482
📧 hdieguez@ssfhelp.org
```

Este template es **genérico** — no menciona qué comentó el usuario ni en qué video. Con Repliyo, la respuesta de seguimiento podría ser personalizada con esa información.
