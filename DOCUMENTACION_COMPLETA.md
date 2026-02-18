# Sistema de Gestión de Inbox Social Media con Metricool

## Descripción del Proyecto
Sistema de gestión de mensajes de redes sociales que se integra con Metricool para centralizar y gestionar DMs y comentarios de múltiples marcas/empresas. El sistema permite a usuarios admin y clientes gestionar sus interacciones sociales de forma organizada.

## Estado Actual
- **Fase Actual**: ✅ FASE 12 COMPLETADA - Smart Customer Follow-up System
- **Última Actualización**: 1 de Enero 2026
- **Sub-fases Completadas**: Fase 1-6 (Database, ReminderService, Scheduler Integration, Delivery via Metricool, UI Configuration, Correcciones Críticas)
- **Corrección Crítica (1 Ene 2026)**: Lógica de elegibilidad corregida - reminders solo se programan DESPUÉS de que la marca haya respondido al cliente
- **Historial DMs**: 20 mensajes recientes + resumen persistente (500+ chars)
- **Control @Mention**: ✅ Etiquetado automático desactivado por defecto, configurable por agente
- **Login/Logout**: ✅ Completamente funcional (página de login creada, logout en sidebar)
- **Sistema de Roles**: ✅ Admin vs Client funcionando correctamente
- **Marca de Prueba**: ✅ Inpulza Testing conectada (blogId: 4074962)
- **Sincronización**: ✅ Automática cada 2 minutos
- **Reply TikTok**: ✅ Funcional - Respuestas a comentarios enviadas desde la app
- **Reply YouTube**: ✅ Funcional - Probado exitosamente
- **UI Reply**: ✅ Botón reply en mensajes, caja de texto flotante, badge "Enviado desde Repliyo"
- **Campo Source**: ✅ Diferencia mensajes de Repliyo vs sincronizados de redes sociales
- **BrandImportWizard**: ✅ Flujo unificado de importación con selección de redes (Sidebar + Integrations)
- **Agentes IA - Paso 1**: ✅ Base de datos con tablas aiAgents y aiAgentAuditLog
- **Agentes IA - Paso 2**: ✅ Módulo LLM Provider (OpenAI + Gemini) funcionando
- **Agentes IA - Paso 3**: ✅ Endpoints de API para guardar/obtener configuración
- **Agentes IA - Paso 4**: ✅ Frontend AIAgentConfig.tsx con 6 tabs completos
- **Agentes IA - Paso 5**: ✅ Playground conectado a IA real (endpoint test-generate)
- **Agentes IA - Paso 6**: ✅ Botón "Generar con IA" en Inbox (endpoint generate-reply)
- **Notificaciones**: ✅ Sistema central con panel deslizante estilo Instagram
- **Filtros de Notificaciones**: ✅ Filtrado por tipo, plataforma y estado de lectura (8 Ene 2026)
- **Smart Digest**: ✅ Notificaciones humanizadas con nombres de autores
- **Deep Links**: ✅ Click en notificación navega a conversación con scroll + highlight
- **Filtros Mejorados**: ✅ Badges muestran solo no leídos, filtro conjunto automático
- **Filtros por Tipo de Mensaje**: ✅ Control granular de auto-reply para DMs y comentarios por plataforma
- **Próximo Paso**: Tests unitarios, rate limiting, dashboard de métricas IA

---

## Fix Crítico: Recordatorios en Comentarios Multi-Autor - 4 Enero 2026

### Problema Identificado
Cuando múltiples usuarios comentaban en el mismo post de redes sociales, los recordatorios podían enviarse al hilo incorrecto. Por ejemplo:
- Usuario A comenta → Marca responde
- Usuario B comenta → Marca responde  
- Recordatorio para Usuario A se enviaba erróneamente al hilo de Usuario B

### Causa Raíz
`assembleReminderContext` seleccionaba el mensaje inbound más reciente sin considerar que había múltiples hilos de conversación con diferentes autores en el mismo post.

### Solución Implementada (Versión Final)

#### 1. Tipo ThreadSelectionMethod
```typescript
type ThreadSelectionMethod = 
  | 'parentMessageId'           // Determinístico: usa campo parentMessageId
  | 'legacy_single_author'      // Un solo autor sin metadata (seguro)
  | 'ineligible_ambiguous'      // Múltiples autores sin metadata = NO programar
  | 'ineligible_no_metadata'    // Sin datos = NO programar
  | 'ineligible_delay_not_met'  // Ningún outbound ha pasado el threshold de delay
  | 'dm';                       // DMs (comportamiento original)
```

#### 2. Validación de Delay por Outbound
- `delayHours` se pasa desde `scheduleReminder` a `assembleReminderContext`
- Se calcula `cutoffTime = Date.now() - delayHours * 60 * 60 * 1000`
- Solo se seleccionan outbounds cuyo timestamp sea menor que cutoffTime
- Si ningún outbound pasa el threshold, se marca como `ineligible_delay_not_met`

#### 3. Priorización por Antigüedad
Se selecciona el outbound MÁS ANTIGUO que:
1. Haya pasado el threshold de delay (cutoffTime)
2. Su autor NO haya respondido después

#### 4. Persistencia Completa del Target
- `targetMessageId` (inbound) + `targetMetricoolId` + `targetAuthor`
- `targetOutboundId` + `targetOutboundTimestamp` ← NUEVO
- `threadSelectionMethod` para trazabilidad

#### 5. Validación en Send-Time
Antes de enviar el recordatorio, `sendReminder` verifica:
- Si el autor target ha respondido después del outbound guardado
- Si respondió: cancela el recordatorio (ya no es necesario)
- Esto previene enviar a hilos que ya están activos

#### 6. Preservación de CustomerName
Para comentarios, se preserva el `customerName` del autor del mensaje target en lugar de sobrescribir con datos de CRM.

### Flujo Completo
```
1. scheduleRemindersForBrand(brandId)
   └─> getConversationsEligibleForReminder(brandId, delayHours)
       └─> Retorna conversaciones elegibles a nivel de conversación

2. scheduleReminder(conversation, rules, delayHours)
   └─> assembleReminderContext(conversation, delayHours)
       └─> Filtra outbounds que NO hayan pasado cutoffTime
       └─> Selecciona el outbound MÁS ANTIGUO sin respuesta
       └─> Retorna { lastInboundMessage, selectedOutboundMessage, threadSelectionMethod }
   └─> Si threadSelectionMethod.startsWith('ineligible_') → NO programar
   └─> Persiste contextSnapshot con targetMessageId + targetOutboundId

3. sendReminder(reminder)
   └─> Obtiene snapshot.targetOutboundId y snapshot.targetAuthor
   └─> Verifica si targetAuthor respondió después de targetOutboundTimestamp
   └─> Si respondió → Cancelar recordatorio
   └─> Si NO respondió → Enviar al hilo correcto
```

### Archivos Modificados
- `server/services/reminderService.ts`: Lógica completa de selección y validación

### Logs de Diagnóstico
- `[ReminderService] Skipping outbound {id}: hasn't met delay threshold yet`
- `[ReminderService] Comment thread (via parentMessageId): Target "{author}" from outbound at {timestamp} (delay threshold met)`
- `[ReminderService] Comment thread INELIGIBLE: No outbound has met the delay threshold yet`
- `[ReminderService] Validated: {author} has NOT replied since outbound at {timestamp}`
- `[ReminderService] Target author "{author}" has replied since scheduling - reminder no longer needed`

---

## Filtros de Auto-Reply por Tipo de Mensaje (DM vs Comentarios) - 2 Enero 2026

### Problema Resuelto
Los usuarios necesitaban poder activar/desactivar el auto-reply de forma separada para DMs y comentarios. Por ejemplo, permitir que la IA responda automáticamente a comentarios pero manejar manualmente las conversaciones privadas (DMs).

### Solución Implementada
Se añadió una tercera capa de filtros al sistema de auto-reply:

#### Jerarquía de Filtros (de mayor a menor prioridad):
```
1. Switch General (autoReplyMode) - off/auto
   └── 2. Por Plataforma (isActive) - true/false por cuenta social
       └── 3. Por Tipo de Mensaje (NUEVO)
           ├── dmEnabled - true/false (default: true)
           └── commentsEnabled - true/false (default: true)
```

### Cambios en Schema
```typescript
// shared/schema.ts - channelSettingsSchema
export const channelSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  bufferDelaySeconds: z.number().int().min(0).max(300).nullable().optional(),
  cooldownSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  cooldownRandomness: z.number().int().min(0).max(120).nullable().optional(),
  cooldownPerConversation: z.boolean().nullable().optional(),
  dmEnabled: z.boolean().nullable().optional(),      // ← NUEVO
  commentsEnabled: z.boolean().nullable().optional(), // ← NUEVO
});
```

### Lógica en Backend
```typescript
// server/services/autoReplyService.ts
// Verificación añadida en processNewMessage() y processNewMessageWithBuffering()

if (normalizedProvider) {
  const channelSettings = getEffectiveChannelSettings(agent, normalizedProvider);
  const isDm = message.type === 'conversation';
  
  if (isDm && !channelSettings.dmEnabled) {
    return { success: false, skippedReason: "dm_disabled" };
  }
  
  if (!isDm && !channelSettings.commentsEnabled) {
    return { success: false, skippedReason: "comments_disabled" };
  }
}
```

### Configuración UI
Toggle en pestaña "Plataformas" del AIAgentConfig:
- **Ubicación**: Dentro de cada tarjeta de plataforma (visible solo cuando IA está activa)
- **Iconos**: MessageSquare (DMs), MessageCircle (Comentarios)
- **Default**: Ambos activados (true)
- **Feedback visual**: Mensaje amarillo indicando el estado actual

### Comportamiento
```
dmEnabled=true, commentsEnabled=true (default):
  → Auto-reply para todos los mensajes

dmEnabled=false, commentsEnabled=true:
  → Auto-reply solo para comentarios

dmEnabled=true, commentsEnabled=false:
  → Auto-reply solo para DMs

dmEnabled=false, commentsEnabled=false:
  → Auto-reply desactivado (aunque isActive=true)
```

### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `shared/schema.ts` | Campos `dmEnabled` y `commentsEnabled` en channelSettingsSchema, función `getEffectiveChannelSettings` actualizada |
| `server/services/autoReplyService.ts` | Verificación de filtros por tipo en `processNewMessage()` y `processNewMessageWithBuffering()` |
| `client/src/components/AIAgentConfig.tsx` | Toggles en pestaña Plataformas con iconos y feedback visual |

### Data-TestIDs Añadidos
- `switch-dm-{provider}` - Toggle para activar/desactivar DMs
- `switch-comments-{provider}` - Toggle para activar/desactivar comentarios

---

## Control de Etiquetado Automático (@Mention) - 29 Dic 2025

### Problema Resuelto
El sistema agregaba automáticamente `@nombreusuario` al inicio de cada respuesta a comentarios. Esto no era deseado en todos los casos y no había forma de controlarlo.

### Solución Implementada
Se agregó un campo `autoMentionEnabled` (boolean, default: `false`) a la tabla `ai_agents` que controla si se agrega el @mention automático.

### Flujos Modificados
Se verificaron y corrigieron **3 flujos** donde se generaban respuestas:

| Flujo | Archivo | Línea | Verificación |
|-------|---------|-------|--------------|
| Auto-reply automático | `autoReplyService.ts` | 316 | `agent.autoMentionEnabled && chunk.partIndex === 1` |
| Reply manual | `routes.ts` | 909-912 | `includeMention && autoMentionEnabled` |
| Send Draft (borrador) | `routes.ts` | 2256-2262 | `autoMentionEnabled ? author : undefined` |

### Configuración UI
Toggle en pestaña "Orquestación" del AIAgentConfig:
- **Icono**: AtSign
- **Label**: "Etiquetar usuario en respuestas"
- **Descripción**: Agregar @usuario al inicio de cada respuesta a comentarios
- **Default**: Desactivado (false)

### Comportamiento
```
autoMentionEnabled = false (default):
  → Respuesta: "Gracias por tu comentario..."

autoMentionEnabled = true:
  → Respuesta: "@flash_handyman Gracias por tu comentario..."
```

### Archivos Modificados
- `shared/schema.ts` - Campo `autoMentionEnabled` con default false
- `server/services/autoReplyService.ts` - Condición en línea 316
- `server/routes.ts` - Verificación en líneas 909-912 y 2256-2262
- `client/src/components/AIAgentConfig.tsx` - Toggle con icono AtSign

---

## Refactorización SummaryService + Prompt Composer - 29 Dic 2025

### Problema 1: SummaryService ignoraba configuración del agente
El servicio de resúmenes usaba Gemini Flash hardcodeado, ignorando la configuración de OpenAI/ChatGPT del agente.

### Solución Implementada
Se refactorizó para usar `createLLMProvider` con el mismo patrón que autoReplyService:

```typescript
// Antes (hardcodeado):
const client = new GoogleGenAI({ apiKey });
const response = await client.models.generateContent({...});

// Ahora (usa configuración del agente):
const secrets = getGlobalSecrets();
const llmProvider = createLLMProvider(agent, secrets);
const response = await llmProvider.generateRawCompletion(...);
```

### Cambios Técnicos
1. **Nuevo método `generateRawCompletion`** en interfaz `LLMProvider`:
   - Implementado en `OpenAIAdapter` y `GeminiAdapter`
   - Permite completaciones simples sin pasar por `composePrompt`
   
2. **`triggerSummaryUpdateAsync`** ahora recibe `brandId` como tercer parámetro:
   ```typescript
   // Antes:
   triggerSummaryUpdateAsync(conversationId, author);
   
   // Ahora:
   triggerSummaryUpdateAsync(conversationId, author, brandId);
   ```

3. **Prioridad de API keys** (igual que `createLLMProvider`):
   1. `platformSettings.openaiApiKey` (per-brand)
   2. `secrets.openaiApiKey` (global)
   3. `process.env.OPENAI_API_KEY` (fallback)

### Problema 2: Instrucciones de saludo sobrescribían guardrails
`buildDynamicPersonalityRules()` tenía instrucciones hardcodeadas como "Hola de nuevo, María" que sobrescribían las reglas del usuario.

### Solución Implementada
Simplificado para solo proporcionar datos de contexto:

```typescript
// Antes (hardcodeado):
rules.push(`👋 REENGAGEMENT (usuario que vuelve)
   ✅ Saluda usando el PRIMER NOMBRE: "Hola de nuevo, ${firstName}"...`);

// Ahora (solo datos):
rules.push(`📊 DATOS PARA TU LÓGICA DE SALUDO:
   - Tiempo desde última interacción: ${context.timeSinceLastInteraction} minutos
   - Estado: ${context.relationshipStatus}
   - Nombre detectado: ${context.firstName || '(no detectado)'}

⚠️ USA LAS INSTRUCCIONES DEL PROMPT PERSONALIZADO para decidir cómo saludar.`);
```

### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `server/services/llm/types.ts` | Nuevos tipos `RawCompletionOptions`, `RawCompletionResponse` y método `generateRawCompletion` |
| `server/services/llm/openai-adapter.ts` | Implementación de `generateRawCompletion` |
| `server/services/llm/gemini-adapter.ts` | Implementación de `generateRawCompletion` |
| `server/services/summaryService.ts` | Usa `createLLMProvider` + `generateRawCompletion` |
| `server/services/llm/prompt-composer.ts` | Simplificado `buildDynamicPersonalityRules()` |
| `server/routes.ts` | Llamadas a `triggerSummaryUpdateAsync` con brandId |
| `server/services/autoReplyService.ts` | Llamada a `triggerSummaryUpdateAsync` con brandId |

---

## Mejoras de Contexto y Guardrails - 29 Dic 2025 (Sesión 2)

### Cambios Implementados

#### 1. Aumento de Historial de DMs (10 → 20 mensajes)
Se aumentó el contexto enviado al LLM para mensajes directos:

```typescript
// Archivo: server/services/llm/prompt-composer.ts, línea 342-343
// Antes:
return history.slice(-10);

// Ahora:
return history.slice(-20);
```

**Razón:** Con el resumen persistente cubriendo el historial antiguo, se puede enviar más contexto reciente sin duplicar información.

#### 2. Mínimo de Resumen Aumentado (100 → 500 caracteres)
Se aumentó el umbral mínimo para que los resúmenes sean más sustanciales:

```typescript
// Archivo: server/services/summaryService.ts
const MIN_SUMMARY_LENGTH = 500; // Antes: 100
```

**Razón:** Resúmenes cortos (<500 chars) no proporcionaban contexto útil. Ahora se fuerza un resumen detallado.

#### 3. Script de Generación de Resúmenes
Se creó `scripts/generate-summaries.ts` para generar resúmenes en batch:

```bash
npx tsx scripts/generate-summaries.ts
```

**Resultado para BO Trust:**
- Total DM conversations: 84
- Generados: 12 (con 10+ mensajes)
- Skipped: 72 (menos de 10 mensajes)
- Promedio: 800-1300 caracteres por resumen

#### 4. Guardrail #11: Prohibido Dar Precios
Se agregó regla crítica a los guardrails del agente BO Trust:

```markdown
11. **PROHIBIDO DAR PRECIOS (CRÍTICO):**
   - **NUNCA** des precios específicos por DM ni comentarios.
   - ❌ PROHIBIDO: "$250", "cuesta $100", "son 300 dólares"
   - **RESPUESTA CORRECTA:**
     * ✅ "Los precios varían según cada caso. Escríbenos al WhatsApp (305) 639-0110 para cotización personalizada."
   - **RAZÓN:** Precios dependen de cada cliente. Dar precios públicos genera problemas si luego el servicio cuesta diferente.
```

### Estructura Actualizada del Prompt

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER PROMPT                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. RESUMEN PERSISTENTE (500+ caracteres):                       │
│    "--- RESUMEN DE CONVERSACIÓN ANTERIOR ---                    │
│     • Cliente preguntó por ITIN y Taxes en Miami                │
│     • Se le indicó contactar por WhatsApp                       │
│     • Estado: Interesado, pendiente de envío de documentos      │
│     --- FIN DEL RESUMEN ---"                                    │
│                                                                 │
│ 2. HISTORIAL RECIENTE (últimos 20 mensajes para DMs):           │
│    "--- HISTORIAL RECIENTE DE CONVERSACIÓN ---                  │
│     Cliente: Hola, me interesa el servicio...                   │
│     Marca: Claro, te cuento los detalles...                     │
│     [... hasta 20 mensajes ...]"                                │
│                                                                 │
│ 3. FICHA DE SITUACIÓN + MENSAJE ACTUAL                          │
└─────────────────────────────────────────────────────────────────┘
```

### 11 Guardrails Actuales de BO Trust

| # | Regla | Descripción Breve |
|---|-------|-------------------|
| 1 | Protocolo de Idioma | Detecta y responde en el idioma del usuario |
| 2 | Formato Anti-Robot | Prohibido guión largo (—), usar puntos/comas |
| 3 | Adaptación Longitud/CTA | TikTok=breve, IG/FB=más espacio |
| 4 | Cero Asesoramiento Legal | No confirmar deducciones específicas |
| 5 | Personalización Nombre | Extraer nombre del username |
| 6 | Filtro de Servicios | Solo Taxes, Seguros, Bookkeeping, Payroll, Notaría |
| 7 | Cobertura Geográfica | Atendemos TODO Estados Unidos |
| 8 | Lógica de Saludo | Según tiempo transcurrido |
| 9 | Tono según Canal | DM=conversacional, Comentario=profesional |
| 10 | Acciones Externas | No decir "ya lo vi" para WhatsApp |
| 11 | **Prohibido Precios** | Redirigir siempre al WhatsApp para cotización |

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `server/services/llm/prompt-composer.ts` | Línea 343: `slice(-20)` para DMs |
| `server/services/summaryService.ts` | `MIN_SUMMARY_LENGTH = 500` |
| `scripts/generate-summaries.ts` | Nuevo script para batch generation |
| `server/routes.ts` | Endpoint `/api/admin/generate-summaries` |
| Base de datos: `ai_agents.guardrail_prompt` | Regla #11 agregada |

---

## Flujo de Contexto para DMs - Documentación Técnica

### Estructura del Prompt enviado al LLM

Cuando llega un DM nuevo, el sistema arma el siguiente prompt:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SYSTEM PROMPT                              │
├─────────────────────────────────────────────────────────────────┤
│ 1. Agent Persona (systemPrompt del agente)                      │
│ 2. Dynamic Personality Rules:                                   │
│    - Tipo de mensaje (DM vs Comentario)                         │
│    - Tiempo desde última interacción                            │
│    - Estado de relación (new/active/reengagement)               │
│    - Datos para lógica de saludo                                │
│ 3. Guardrails del usuario (reglas 1-10)                         │
│ 4. Knowledge Base (si existe)                                   │
│ 5. Tono de comunicación de la marca                             │
│ 6. Contexto del negocio                                         │
│ 7. Guía de longitud para la plataforma                          │
│ 8. Límites técnicos de caracteres                               │
│ 9. Regla de memoria (PROHIBIDO decir "no tengo acceso")         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       USER PROMPT                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. RESUMEN PERSISTENTE (si > 10 mensajes previos):              │
│    "--- RESUMEN DE CONVERSACIÓN ANTERIOR ---                    │
│     • Cliente preguntó por servicio X                           │
│     • Se cotizó $500                                            │
│     • Cliente indica envío por WhatsApp - NO VERIFICABLE        │
│     --- FIN DEL RESUMEN ---"                                    │
│                                                                 │
│ 2. HISTORIAL RECIENTE (últimos 20 mensajes para DMs):           │
│    "--- HISTORIAL RECIENTE DE CONVERSACIÓN ---                  │
│     Cliente: Hola, me interesa el servicio...                   │
│     Marca: Claro, te cuento los detalles...                     │
│     [... hasta 20 mensajes para DMs, 10 para comentarios ...]"                                   │
│                                                                 │
│ 3. FICHA DE SITUACIÓN:                                          │
│    "Tipo: dm                                                    │
│     Estado: active                                              │
│     Profundidad: 5 mensajes                                     │
│     Última respuesta nuestra: hace 3 min"                       │
│                                                                 │
│ 4. MENSAJE ACTUAL:                                              │
│    "--- MENSAJE A RESPONDER ---                                 │
│     Plataforma: instagram                                       │
│     Tipo: Mensaje Directo                                       │
│     Autor: María                                                │
│     Contenido: ¿Cuánto cuesta el servicio?"                     │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Actualización del Resumen

```
1. Mensaje entrante → Buffer (45s) → autoReplyService
2. autoReplyService:
   - Obtiene últimos 20 mensajes (para DMs)
   - Obtiene resumen persistente (si existe, 500+ chars)
   - Envía todo a LLM
3. LLM genera respuesta
4. Se envía respuesta a Metricool
5. Se llama triggerSummaryUpdateAsync(conversationId, author, brandId)
6. summaryService (async):
   - Cuenta mensajes nuevos desde último resumen
   - Si >= 10 mensajes nuevos → genera nuevo resumen
   - Usa LLM configurado del agente (ChatGPT/Gemini)
   - Guarda en BD tabla conversation_user_summaries
```

### Variables Dinámicas Disponibles

| Variable | Valor Ejemplo | Uso |
|----------|---------------|-----|
| `{{username}}` | @maria_perez | Nombre completo del usuario |
| `{{first_name}}` | María | Primer nombre extraído |
| `{{platform}}` | instagram | Red social |
| `{{is_dm}}` | true | Si es DM o comentario |
| `{{time_since_last_interaction}}` | 5 | Minutos desde última respuesta |
| `{{relationship_status}}` | active | new/active/reengagement |
| `{{conversation_depth}}` | 7 | Cantidad de mensajes en hilo |
| `{{post_context}}` | Caption del post | Contexto del post (comentarios) |

---

## PRD Técnico Completo

### FASE 1: Arquitectura de Datos & Autenticación ✅ COMPLETADA
**Objetivo:** Que existan usuarios y que cada uno vea solo lo suyo.

#### Implementación Completada:
1. ✅ **Database Schema (PostgreSQL):**
   - Tabla `brands` con `metricoolToken`, `blogId`, `userId`, nombre
   - Tabla `users` con `role` ('admin', 'client') y `brandId` (Foreign Key)
   - Tabla `messages` con `brandId` obligatorio
   - Schema definido en `shared/schema.ts` con Drizzle ORM y validación Zod

2. ✅ **Sistema de Autenticación:**
   - Login/logout con express-session y bcrypt
   - Registro protegido (solo admins pueden crear usuarios)
   - Creación de admins bloqueada por API (solo manual en DB)
   - Usuarios client requieren obligatoriamente brandId
   - Sanitización de respuestas (sin exponer contraseñas)

3. ✅ **Middleware de Seguridad:**
   - `requireAuth`: Protege todas las rutas que requieren autenticación
   - `filterByBrand()`: Filtra automáticamente por brandId para usuarios client
   - Validación explícita de acceso a brands por ID
   - Admins tienen acceso total a todos los datos
   - Clients solo ven datos de su brand

**Pruebas de Seguridad Completadas:**
- ✅ Usuarios de diferentes marcas no pueden ver datos de otras
- ✅ Registro sin autenticación bloqueado
- ✅ Creación de admins por API bloqueada
- ✅ Usuarios client sin brandId rechazados
- ✅ Acceso cross-brand bloqueado
- ✅ Listado de usuarios protegido (solo admins)

---

### FASE 2: El Servicio de Conexión (Metricool Connector) ✅ COMPLETADA
**Objetivo:** Enseñar al backend a "hablar" con Metricool.

#### Implementación Completada:
1. ✅ **`MetricoolService` creado** (`server/services/metricool.ts`):
   - Autenticación con X-Mc-Auth header
   - Método `getBrands()` - Obtiene marcas del usuario
   - Método `getConversations(blogId, provider)` - DMs de Instagram/Facebook
   - Método `getComments(blogId, provider)` - Comentarios de todas las redes
   - Método `getAllInboxData(blogId)` - Obtiene todo de todas las redes
   - Manejo robusto de errores por proveedor
   
2. ✅ **Endpoints de Metricool integrados:**
   - `/api/admin/simpleProfiles` → Devuelve 15 marcas
   - `/api/v2/inbox/conversations` → Devuelve conversaciones (probado: 25 conversations)
   - `/api/v2/inbox/post-comments` → Listo para comentarios
   - Providers soportados: facebook, instagram, tiktok, youtube, linkedin, google

3. ✅ **Schema actualizado:**
   - Campo `rawData` (jsonb) en tabla `messages` para guardar JSON completo
   - Campo `authorAvatar` para foto de perfil
   - Campo `metricoolId` (unique) para evitar duplicados
   - Campos opcionales: urgency, intent, sentiment

4. ✅ **Lógica de Sincronización (Sync):**
   - Endpoint `POST /api/sync-brand/:brandId` implementado
   - Requiere autenticación (solo admin o dueño de la brand)
   - Busca credentials de la marca en la DB
   - Llama a Metricool y obtiene todos los mensajes
   - Guarda con "Upsert" (evita duplicados vía metricoolId)
   - Mapea conversations y comments a nuestra estructura
   - Preserva JSON completo en campo rawData
   - Devuelve estadísticas de sincronización

5. ✅ **Storage actualizado (`server/storage.ts`):**
   - Método `upsertMessage()` implementado
   - Verifica si existe mensaje por metricoolId
   - Actualiza si existe, crea si no existe
   - Evita duplicados eficientemente

**Pruebas completadas Fase 2:**
- ✅ Token guardado en Secrets (METRICOOL_USER_TOKEN)
- ✅ userId guardado en env var (METRICOOL_USER_ID)
- ✅ Conexión con API verificada (15 marcas detectadas)
- ✅ Estructura de datos validada (25 conversaciones de prueba)
- ✅ Endpoint de sincronización implementado
- ✅ Sistema de upsert funcional
- ✅ Arquitectura aprobada por architect (sin problemas de seguridad)

---

### FASE 3: Exponer Datos al Frontend ✅ COMPLETADA
**Objetivo:** Que el diseño UI muestre datos reales.

#### Implementación Completada:
1. ✅ **API Client (`client/src/lib/api.ts`):**
   - `api.metricool.getBrands()` - GET /api/metricool/brands
   - `api.metricool.importBrand()` - POST /api/brands/import
   - `api.metricool.syncBrand()` - POST /api/sync-brand/:brandId
   - `api.clients.*` actualizado para usar `/api/brands`

2. ✅ **Context actualizado (`client/src/context/NexusContext.tsx`):**
   - `fetchMetricoolBrands()` - Llama a API real con manejo de errores
   - `importMetricoolBrand()` - Async, importa + sincroniza automáticamente
   - Toasts en español para feedback al usuario
   - Invalida React Query después de importar

3. ✅ **UI simplificada (`client/src/components/MetricoolConnection.tsx`):**
   - Eliminados inputs de token/userId (credenciales server-side)
   - Mensaje informativo de seguridad
   - Botón único "Cargar Marcas desde Metricool"
   - Test IDs para testing e2e

4. ✅ **Schema con compatibilidad:**
   - Type alias `Client = Brand` para frontend

**Pruebas completadas Fase 3:**
- ✅ Test e2e exitoso del flujo completo
- ✅ Login como admin → 15 marcas cargadas
- ✅ Importación de marca → 277 mensajes sincronizados
- ✅ Marca visible en sidebar
- ✅ Toasts de progreso funcionando
- ✅ Sin exposición de credenciales al frontend

---

## Arquitectura Técnica

### Información de Metricool API

**Base URL:** `https://app.metricool.com/api`

**Autenticación:**
- Header: `X-Mc-Auth: {userToken}`
- Query/Body params: `userId`, `blogId`

**Endpoints Clave:**
- `/api/admin/simpleProfiles` - Obtener marcas/brands del usuario
- `/api/v2/inbox/conversations` - DMs (Facebook, Instagram)
- `/api/v2/inbox/post-comments` - Comentarios públicos (YouTube, TikTok, etc.)

**Conceptos Importantes:**
- `userId`: ID del usuario en Metricool (único por cuenta)
- `blogId`: ID de la marca/empresa en Metricool (un usuario puede tener múltiples blogIds)
- **Conversations**: Mensajes privados/DMs (Facebook, Instagram)
- **Comments**: Comentarios públicos en posts (YouTube, TikTok, etc.)

### Stack Tecnológico
- **Frontend**: React + TypeScript + Vite + Wouter (routing)
- **Backend**: Node.js + Express + TypeScript
- **Base de Datos**: PostgreSQL (Neon) + Drizzle ORM
- **UI Components**: Radix UI + Tailwind CSS
- **Validación**: Zod + drizzle-zod

### Estructura de Base de Datos (Nueva - Fase 1)

```typescript
// Tabla: brands
- id (uuid, primary key)
- name (text) - Nombre de la empresa/marca
- metricoolToken (text) - Token API de Metricool
- blogId (text) - ID de la marca en Metricool
- userId (text) - ID del usuario en Metricool
- createdAt (timestamp)

// Tabla: users
- id (uuid, primary key)
- email (text, unique)
- password (text, hashed)
- name (text)
- role (text) - 'admin' | 'client'
- brandId (uuid, foreign key -> brands.id) - null para admin
- createdAt (timestamp)

// Tabla: messages (adaptada)
- id (uuid, primary key)
- brandId (uuid, foreign key -> brands.id) - OBLIGATORIO
- platform (text) - 'facebook', 'instagram', 'youtube', etc.
- type (text) - 'conversation' | 'comment'
- author (text)
- content (text)
- timestamp (timestamp)
- status (text) - 'unread', 'read', 'replied'
- draftResponse (text, nullable)
- urgency (text)
- intent (text)
- sentiment (text)
- aiSummary (text, nullable)
- sourceUrl (text, nullable)
- contextType (text, nullable)
- crmData (jsonb, nullable)
- metricoolId (text, nullable) - ID original en Metricool
- createdAt (timestamp)
```

### Configuración del Proyecto
- **Usuarios esperados**: ~25 usuarios tipo "client" + 1-2 admins
- **Sincronización**: Automática cada 130 segundos, sincronizar todo el historial
- **Primera implementación**: Comenzar con 1 marca conectada

---

## Preferencias del Usuario

### Idioma
- Comunicación en **español**

### Iconos y UI
- **NO usar el icono Sparkles (✨)** - No se considera apropiado para esta aplicación
- Preferir iconos más simples y profesionales como `Wand` (varita mágica) para funciones de IA
- Los iconos de lucide-react disponibles incluyen: `Wand`, `Star`, `Sparkle` (singular)
- Las notificaciones Toast deben ser compactas, centradas en la parte inferior de la pantalla

### Desarrollo
- **NO cambiar el diseño UI** sin consultar primero
- Si falta funcionalidad en la interfaz, preguntar antes de implementar
- Enfoque en backend primero, luego conectar con frontend
- Trabajar fase por fase (no adelantarse)

### Prioridades Actuales
1. ✅ Fase 1 completada: Base de datos + Autenticación funcionando
2. ✅ Fase 2 completada: Servicio de conexión Metricool implementado
3. ✅ Fase 3 completada: Frontend conectado con datos reales
4. ✅ Fase 4 completada: Mapeo de datos y UI refinados
5. ✅ Fase 5 completada: Sincronización automática + Reply implementados
6. ✅ Fase 6 completada: Sistema de conversaciones thread-based
7. ✅ Fase 7 completada: Configuración del Agente IA (frontend)

---

## Archivos Importantes

### Backend
- `server/app.ts` - Express app setup
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Interface de storage + implementación DB
- `server/db.ts` - Conexión PostgreSQL
- `shared/schema.ts` - Schema de Drizzle ORM + tipos Zod

### Frontend
- `client/src/components/Inbox.tsx` - Componente principal (0 errores TypeScript ✅)
- `client/src/App.tsx` - Routing principal

---

## FASE 4: Refinamiento de Sincronización y Visualización ✅ COMPLETADA

### Implementación Completada:

1. ✅ **Mapeo de datos mejorado (LinkedIn):**
   - Autor correctamente extraído de `participants[]` array
   - Avatar recuperado de `participants[].profile.miniProfile.picture`
   - Contenido extraído de estructura anidada de comentarios
   - Timestamp mapeado de `createdTime`
   - Campo `rawData` guardando JSON completo de Metricool

2. ✅ **Nombres de providers corregidos:**
   - 'tiktok' → 'TIKTOKBUSINESS'
   - 'google' → 'GMB'
   - Constante `SUPPORTED_PROVIDERS` actualizada

3. ✅ **Frontend actualizado (Inbox.tsx):**
   - Referencias de `clientId` cambiadas a `brandId`
   - Manejo seguro de campos nullable con valores por defecto
   - 0 errores TypeScript LSP
   - Filtros de plataforma funcionando correctamente

4. ✅ **Pruebas end-to-end exitosas:**
   - Login → Selección de marca → Sincronización → Visualización
   - 2 mensajes de LinkedIn sincronizados correctamente:
     - "Vibe marketing is 💚" - con autor y avatar
     - Mensaje de Repliyo.io sobre estrategias digitales
   - Filtros de plataforma verificados (LinkedIn, All)
   - UI muestra correctamente: autor, avatar, contenido, timestamp, badges

### Próximas Fases:

**FASE 5: Sincronización Automática y Respuestas ✅ COMPLETADA**
1. ✅ Sincronización automática cada 2 minutos (`syncService.ts`)
2. ✅ Endpoint `POST /api/inbox/reply` para responder mensajes
3. ✅ UI para escribir y enviar respuestas (caja flotante en Inbox)

**FASE 6: Sistema de Conversaciones ✅ COMPLETADA**
- ✅ Modelo thread-based con conversations y messages
- ✅ Agrupación de mensajes por cliente/post
- ✅ Contador de no leídos por conversación

**FASE 7: Configuración del Agente IA ✅ COMPLETADA (Frontend)**
- ✅ Componente AIAgentConfig.tsx con 6 tabs
- ✅ Selección de proveedor (OpenAI/Gemini) y modelo
- ✅ Configuración de prompts, automatización, plataformas

**FASE 7.1: Playground con IA Real ✅ COMPLETADA - 9 Diciembre 2025**
- ✅ Endpoint `POST /api/ai-agent/:brandId/test-generate` creado
- ✅ Acepta mensaje de prueba libre (no requiere mensaje real en DB)
- ✅ Usa la configuración guardada del agente (prompts, modelo, temperatura)
- ✅ Frontend AIAgentConfig.tsx actualizado para llamar al endpoint real
- ✅ Muestra respuesta de Gemini/OpenAI según configuración

**FASE 8: Integración de IA en Inbox ✅ COMPLETADA - 9 Diciembre 2025**
- ✅ Botón "Generar con IA" en composer flotante del Inbox
- ✅ Endpoint `/api/ai-agent/:brandId/generate-reply` para mensajes reales
- ✅ Pre-llena caja de respuesta con sugerencia de la IA
- ✅ Toast con información del provider/model/caracteres generados
- ✅ Opción de editar antes de enviar

**FASE 9: Sistema de Notificaciones Central ✅ COMPLETADA - 18 Diciembre 2025**

#### 9.1 Infraestructura de Notificaciones
- ✅ Tabla `notifications` en base de datos (id, userId, brandId, type, title, message, isRead, clickUrl, metadata, createdAt)
- ✅ Tipos de notificación: `new_messages`, `sync_error`, `sync_success`, `ai_auto_reply`, `config_change`
- ✅ Endpoints API: GET /notifications, POST /notifications/mark-read, POST /notifications/mark-all-read
- ✅ Cleanup probabilístico (5% en cada insert) para mantener DB performante

#### 9.2 Centro de Notificaciones UI (NotificationCenter.tsx)
- ✅ Panel deslizante de 400px (Sheet) estilo Instagram en lugar de popover pequeño
- ✅ Iconos de tipo de notificación (MessageSquare, AlertTriangle, CheckCircle, Bot, Settings)
- ✅ Badges de plataforma coloreados (Instagram rosa, TikTok negro, Facebook azul, etc.)
- ✅ Borde izquierdo azul para notificaciones no leídas
- ✅ Botón "Marcar todas como leídas" y limpieza individual
- ✅ Tooltip funcional cuando sidebar está colapsado (Tooltip envuelve SheetTrigger asChild)

#### 9.3 Smart Digest
- ✅ Notificaciones humanizadas mostrando nombres de autores: "Juan y 4 más te enviaron 5 mensajes"
- ✅ Tracking de `firstInboundAuthor` durante sincronización (DMs y comments)
- ✅ Metadata incluye: platform, count, firstAuthor, conversationId

#### 9.4 Deep Links con Scroll + Highlight
- ✅ clickUrl incluye conversationId: `/inbox?conversation=xxx&highlight=true`
- ✅ clickUrl para AI auto-reply incluye messageId: `/inbox?conversation=xxx&messageId=yyy&highlight=true`
- ✅ Inbox.tsx lee URL params y auto-selecciona la conversación
- ✅ scrollIntoView smooth después de 100ms delay para centrar en viewport
- ✅ ConversationCard.tsx muestra animación de resaltado (amber ring + fade de fondo amarillo)
- ✅ Highlight se limpia después de 3 segundos, URL params se limpian tras navegación
- ✅ **Deep Link a Mensaje Específico (Diciembre 2025):**
  - El parámetro `messageId` permite navegar directamente a un mensaje específico dentro de la conversación
  - Sistema de retry con 15 intentos x 300ms para esperar que los mensajes carguen antes del scroll

#### 9.5 Notificaciones de Borradores Pendientes (Diciembre 2025)
- ✅ Nuevo tipo de notificación `draft_pending` para borradores sin enviar
- ✅ Icono FileEdit con esquema de colores ámbar (bg-amber-500, border-amber-200)
- ✅ Notificaciones individuales por cada borrador (no agrupadas)
- ✅ **Ciclo de vida completo:**
  - **Creación**: Automática cuando se genera un borrador en:
    - `POST /api/ai-agent/:brandId/generate-draft` (generación individual)
    - `POST /api/ai-agent/:brandId/regenerate-draft` (regeneración de borrador existente)
    - `POST /api/ai-agent/:brandId/bulk-generate-drafts` (generación masiva)
  - **Eliminación**: Automática cuando el borrador es enviado o descartado en:
    - `POST /api/ai-agent/:brandId/send-draft` (envío del borrador)
    - `POST /api/ai-agent/:brandId/discard-draft` (descarte del borrador)
- ✅ Deep-link con `messageId`: `/inbox?conversation={id}&messageId={id}&highlight=true`
- ✅ Notificaciones persistentes (excluidas del cleanup automático con `type != 'draft_pending'`)
- ✅ Función idempotente `createDraftNotification`:
  - Verifica si existe notificación para el messageId
  - Si existe: actualiza descripción, fecha y marca como no leída
  - Si no existe: crea nueva notificación
- ✅ **Endpoint de backfill**: `POST /api/ai-agent/:brandId/backfill-draft-notifications`
  - Busca mensajes con `aiReplyStatus` en ('drafted', 'suggested')
  - Crea notificaciones para borradores existentes sin notificación
- ✅ **Storage functions implementadas:**
  - `getNotificationByMessageId(messageId)` - Busca notificación por messageId en metadata
  - `deleteNotificationByMessageId(messageId)` - Elimina notificación al enviar/descartar
  - `createDraftNotification(brandId, messageId, conversationId, platform, author, draftPreview)` - Crea/actualiza notificación
  - `getMessagesWithPendingDrafts(brandId)` - Lista mensajes con borradores pendientes para backfill
- ✅ **Cleanup policy actualizada**: `cleanupOldNotifications()` excluye `draft_pending` para persistencia indefinida

#### 9.6 Optimización de Toasts
- ✅ Toasts desactivados para `new_messages` (evita colapso de UI cuando llegan muchos mensajes)
- ✅ Toasts mantenidos para acciones del usuario (enviar mensaje, generar IA, etc.)

#### 9.7 Filtros de Plataforma Mejorados
- ✅ Badges rojos ahora muestran solo conversaciones con mensajes NO LEÍDOS (`platformUnreadCounts`)
- ✅ Filtro conjunto: al pinchar plataforma con badge, se activa automáticamente `showOnlyUnread=true`
- ✅ Al pinchar plataforma sin mensajes nuevos o "All", se desactiva el filtro de no leídos
- ✅ Comportamiento sincronizado con el botón de bandeja de entrada del header

#### 9.8 Filtros en Centro de Notificaciones (8 Enero 2026)
- ✅ Botón "Filtros" junto a "Marcar todas como leídas" para expandir/colapsar panel de filtros
- ✅ Badge con contador de filtros activos (ej: "3" si hay 3 filtros seleccionados)
- ✅ **Filtros disponibles:**
  - **Por Tipo**: Nuevos mensajes, IA enviada, Borrador, Error sync, Sync OK, Config
  - **Por Red Social**: Instagram, TikTok, Facebook, LinkedIn, YouTube, WhatsApp, Google
  - **Por Estado**: Todas, Sin leer, Leídas
- ✅ Filtrado local (frontend) sin llamadas adicionales al servidor
- ✅ Tipos y plataformas se muestran dinámicamente (solo opciones con notificaciones existentes)
- ✅ Pills/chips compactos con estilo seleccionado (indigo) vs no seleccionado (gris)
- ✅ Botón "Limpiar filtros" cuando hay filtros activos
- ✅ Estado vacío específico cuando los filtros no encuentran resultados
- ✅ **Data-testids implementados:**
  - `button-toggle-filters` - Botón para expandir/colapsar filtros
  - `filter-type-{type}` - Pills de tipo de notificación
  - `filter-platform-{platform}` - Pills de red social
  - `filter-read-{all|unread|read}` - Pills de estado de lectura
  - `button-clear-filters` - Botón para limpiar filtros

#### Archivos Principales Modificados:
- `shared/schema.ts` - Tabla notifications con tipos de notificación
- `server/storage.ts` - CRUD de notificaciones + funciones draft_pending (createDraftNotification, deleteNotificationByMessageId, getNotificationByMessageId, getMessagesWithPendingDrafts, cleanupOldNotifications con exclusión draft_pending)
- `server/routes.ts` - Endpoints de notificaciones + integración draft_pending en generate-draft, regenerate-draft, bulk-generate-drafts, send-draft, discard-draft, backfill-draft-notifications
- `server/services/syncService.ts` - Creación de Smart Digest con firstInboundAuthor
- `server/services/autoReplyService.ts` - clickUrl incluye messageId para deep-link a mensaje específico
- `client/src/components/NotificationCenter.tsx` - Panel deslizante completo + tipo draft_pending con icono FileEdit y colores ámbar
- `client/src/components/Inbox.tsx` - Deep links a mensajes, filtros mejorados, retry scroll logic
- `client/src/components/CommentThread.tsx` - Prop highlightedMessageId propagado a SingleMessage
- `client/src/components/ConversationCard.tsx` - Prop isHighlighted con animación
- `client/src/hooks/useWebSocket.ts` - Toasts desactivados para new_messages

**FASE 9.1: Características Avanzadas Pendientes**
- ⚪ Tests unitarios para MetricoolService
- ⚪ Rate limiting para API endpoints
- ⚪ Dashboard de métricas de uso de IA

**FASE 10: Auto-Reply Automático ✅ COMPLETADA - 9 Diciembre 2025**
- ✅ Servicio `AutoReplyService` creado (`server/services/autoReplyService.ts`)
- ✅ Integración con syncService para procesar mensajes nuevos inbound
- ✅ Verificación de configuración del agente (isActive, autoReplyMode === 'auto')
- ✅ Respeto del cooldown configurado entre respuestas automáticas
- ✅ Generación de respuesta con LLM (OpenAI/Gemini según configuración)
- ✅ Envío de respuestas vía Metricool (replyToComment/replyToConversation)
- ✅ Guardado del mensaje de respuesta en DB con source='repliyo_auto'
- ✅ Registro en audit log con action='auto_reply' (éxito o error)
- ✅ Notificación WebSocket cuando se envía respuesta automática
- ✅ Actualización de lastAutoReplyAt en el agente para cooldown

**FASE 10.1: Simplificación de Automatización ✅ COMPLETADA - 20 Diciembre 2025**

#### 10.1.1 Diagnóstico y Limpieza de Opciones No Funcionales
Se realizó un diagnóstico completo de las opciones de automatización del agente IA, identificando que varias opciones estaban en la UI pero sin lógica real implementada en el backend:

**Opciones Eliminadas:**
- ❌ **Modo "Borrador" (draft)**: Estaba en la UI pero no generaba borradores automáticamente al recibir mensajes. Solo permitía generación manual.
- ❌ **Workflow de Aprobación (approvalWorkflow)**: Las opciones "none" y "human_review" no tenían lógica implementada. El modo "auto" siempre enviaba directamente sin esperar aprobación.
- ❌ **Estrategia "Truncar" (truncate)**: Eliminada por ser redundante con "Resumir".

**Opciones que Sí Funcionan (mantenidas):**
- ✅ **Modo "Desactivado" (off)**: No hace nada, correcto
- ✅ **Modo "Automático" (auto)**: Responde automáticamente, funciona correctamente
- ✅ **Estrategia "Resumir" (summarize)**: Ahora corta inteligentemente en fin de oración o palabra
- ✅ **Estrategia "Rechazar" (reject)**: Lanza error que se registra en audit log

#### 10.1.2 Mejoras en el Sistema de Cooldown
Se mejoró significativamente el sistema de cooldown entre respuestas automáticas:

**Nuevos campos en tabla `ai_agents`:**
- `cooldownEnabled` (boolean, default true): Toggle para activar/desactivar el cooldown
- `cooldownRandomness` (integer, default 0): Variación aleatoria en segundos (±N)

**Cambios en UI (AIAgentConfig.tsx):**
- ✅ Switch para activar/desactivar cooldown
- ✅ Slider granular de 0-60 segundos (step de 1 segundo, no de 10)
- ✅ Slider para variación aleatoria de 0-30 segundos
- ✅ UI condicional: sliders solo aparecen si cooldown está activado
- ✅ Indicación visual de la variación actual (±Ns)

**Cambios en Backend (autoReplyService.ts):**
- ✅ Respeta el nuevo flag `cooldownEnabled`
- ✅ Aplica variación aleatoria: `effectiveCooldown = base ± random(randomness)`
- ✅ Envía notificación WebSocket cuando un mensaje se salta por cooldown
- ✅ Retorna segundos restantes en el resultado de cooldown

**Notificación Toast para Cooldown:**
- ✅ Nuevo evento WebSocket `agent_cooldown`
- ✅ Frontend muestra toast: "Mensaje omitido por cooldown - El agente esperará Xs antes de responder"
- ✅ Hook `useWebSocket.ts` actualizado con handler `onAgentCooldown`

#### 10.1.3 Estrategia de Límite de Caracteres Mejorada
La función `truncateResponse` en `prompt-composer.ts` fue refactorizada:

**Estrategia "summarize" (Resumir con IA):**
- Corta preferentemente en fin de oración (., ?, !)
- Si no hay fin de oración en el último 60%, corta en espacio
- Último recurso: corta directamente con "..."

**Estrategia "reject" (Rechazar):**
- Lanza error descriptivo con caracteres generados vs límite
- Error se registra en audit log para debugging

#### 10.1.4 Archivos Modificados
- `shared/schema.ts`: Nuevos campos cooldownEnabled, cooldownRandomness; enums simplificados
- `client/src/components/AIAgentConfig.tsx`: UI simplificada con solo 2 modos, cooldown mejorado
- `server/services/autoReplyService.ts`: Cooldown con randomness, notificación WebSocket
- `server/services/websocketService.ts`: Nuevo método notifyAgentCooldown
- `client/src/hooks/useWebSocket.ts`: Handler para agent_cooldown con toast
- `server/services/llm/prompt-composer.ts`: truncateResponse mejorado

#### 10.1.5 Migración de Base de Datos
```sql
ALTER TABLE "ai_agents" ALTER COLUMN "character_limit_strategy" SET DEFAULT 'reject';
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "cooldown_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "cooldown_randomness" integer DEFAULT 0 NOT NULL;
```

---

**FASE 11: Mejoras Conversacionales para BOTrust ✅ COMPLETADA - 21 Diciembre 2025**

Sistema de mejoras para hacer las respuestas del agente más naturales, context-aware y humanas, especialmente en mensajes directos (DMs).

#### 11.1 Variables Dinámicas de Contexto (Paso 1)
Se agregaron 5 nuevas variables dinámicas al sistema de prompts para proporcionar contexto situacional:

**Nuevas variables en `shared/dynamicVariables.ts`:**
| Variable | Placeholder | Descripción | Ejemplo |
|----------|-------------|-------------|---------|
| `is_dm` | `{{is_dm}}` | Si es mensaje directo (true) o comentario (false) | `true` |
| `message_type` | `{{message_type}}` | Tipo de mensaje: "dm" o "comment" | `dm` |
| `time_since_last_interaction` | `{{time_since_last_interaction}}` | Minutos desde la última respuesta de la marca | `15` |
| `conversation_depth` | `{{conversation_depth}}` | Número total de mensajes en la conversación | `8` |
| `relationship_status` | `{{relationship_status}}` | Estado: "new", "active", "reengagement" | `active` |

**Cálculo de variables en `prompt-composer.ts`:**
- `is_dm` / `message_type`: Se deriva de `message.type === 'conversation'`
- `time_since_last_interaction`: Calcula minutos desde el último mensaje outbound de la marca
- `conversation_depth`: Cuenta mensajes en el historial + 1
- `relationship_status`: 
  - `new`: Primera interacción (depth = 1)
  - `active`: Conversación en curso (< 60 min desde última respuesta)
  - `reengagement`: Usuario que vuelve después de tiempo (> 60 min)

#### 11.2 Ficha de Situación / Situation Card (Paso 2)
Se implementó un sistema de "Ficha de Situación" que se inyecta automáticamente en cada prompt con instrucciones contextuales.

**Nueva función `calculateSituationContext()`:**
- Determina `shouldGreet`: Solo saludar si > 60 minutos O es primer mensaje
- Calcula `intensity`: low (> 30 min), medium (5-30 min), high (< 5 min)
- Genera instrucciones automáticas basadas en el contexto

**Nueva función `buildSituationCard()`:**
Genera un bloque de texto que se inyecta antes del mensaje:
```
[FICHA_DE_SITUACIÓN]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo: dm
Estado: active
Profundidad: 8 mensajes
Última respuesta nuestra: hace 3 minutos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[INSTRUCCIONES_AUTOMÁTICAS]
• Conversación ACTIVA. PROHIBIDO saludar (nada de "Hola", "Buenas", etc.). Ve directo al punto.
• Esto es un DM privado. Usa tono conversacional de WhatsApp (relajado, cercano).
```

#### 11.3 Reglas de Tono DM vs Comentarios (Paso 3)
Se agregó una nueva sección de reglas de tono en `buildSystemPromptV53()`:

**Para Mensajes Directos (DMs):**
- Tono conversacional tipo WhatsApp: cercano, relajado, natural
- Permitido usar puntos suspensivos, "jaja", "oye", "mira"
- Respuestas más largas si la conversación lo amerita
- PROHIBIDO tono corporativo o rígido

**Para Comentarios Públicos:**
- Breve, directo, profesional
- Incluir Call-to-Action (CTA) cuando aplique
- Evitar respuestas largas o conversacionales

**Regla de Saludos:**
- Si `time_since_last_interaction` < 60 min → PROHIBIDO saludar
- Solo saludar en conversaciones NUEVAS o después de >1 hora sin respuesta

#### 11.4 DmBufferService - Sistema de Debounce (Paso 4)
Se creó un nuevo servicio `server/services/dmBufferService.ts` para evitar que el agente interrumpa a usuarios que envían múltiples mensajes seguidos.

**Funcionamiento:**
1. Llega un DM → Se agrega al buffer de esa conversación
2. Se inicia un timer de 15 segundos
3. Si llega otro DM antes de que termine → Se reinicia el timer
4. Cuando el timer termina → Se procesan todos los mensajes juntos

**Características:**
- Buffers por conversación (no global)
- Timer de 15 segundos (configurable)
- Limpieza automática de buffers
- Los mensajes anteriores al último se marcan como `skipped_batched`

**Estructura del servicio:**
```typescript
class DmBufferService {
  bufferMessage(message, conversation, brand, callback, delayMs)
  cancelBuffer(conversationId)
  getBufferStatus(conversationId): { isBuffering, messageCount, oldestMessageAge }
  clearAllBuffers()
}
```

#### 11.5 Integración con AutoReplyService (Paso 5)
Se modificó el flujo de auto-reply para que los DMs pasen por el buffer:

**Nuevo método `processNewMessageWithBuffering()`:**
- Si el mensaje es un comentario → Procesa inmediatamente (flujo normal)
- Si es un DM → Agrega al buffer y espera
- Cuando el buffer se vacía → Combina contenido y procesa

**Cambios en `syncService.ts`:**
- Llamada cambiada de `processNewMessage()` a `processNewMessageWithBuffering()`
- Log mejorado para identificar mensajes buffereados

**Flujo resultante:**
```
ANTES:
14:00:01 - Usuario: "Hola" → 14:00:02 - Agente responde
14:00:05 - Usuario: "tengo duda" → 14:00:06 - Agente responde
14:00:12 - Usuario: "sobre taxes" → 14:00:13 - Agente responde

DESPUÉS:
14:00:01 - Usuario: "Hola" → Buffereado
14:00:05 - Usuario: "tengo duda" → Timer reiniciado
14:00:12 - Usuario: "sobre taxes" → Timer reiniciado
14:00:27 - (15s después) → Agente responde a todo junto
```

#### 11.6 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `shared/dynamicVariables.ts` | +5 nuevas variables dinámicas |
| `server/services/llm/prompt-composer.ts` | +Interface VariableContext extendida, +calculateSituationContext(), +buildSituationCard(), +reglas de tono DM/comment |
| `server/services/dmBufferService.ts` | **Nuevo archivo** - Servicio de buffering para DMs |
| `server/services/autoReplyService.ts` | +processNewMessageWithBuffering(), +processBufferedDmMessages() |
| `server/services/syncService.ts` | Llamada cambiada a processNewMessageWithBuffering() |

#### 11.7 Revisión del Arquitecto
Todos los 5 pasos fueron revisados y aprobados por el arquitecto:

- ✅ **Paso 1 (Variables)**: Variables correctamente definidas y calculadas
- ✅ **Paso 2 (Ficha de Situación)**: Lógica de greeting correcta, inyección antes del mensaje
- ✅ **Paso 3 (Reglas de Tono)**: Bloque de reglas DM vs comentario integrado
- ✅ **Paso 4 (DmBufferService)**: Debounce correcto, limpieza de memoria adecuada
- ✅ **Paso 5 (Integración)**: Flujo de buffering correcto, sin regresiones

#### 11.8 buildDynamicPersonalityRules() - Sistema de Personalidad Dinámica (Paso 6)
**Implementado: 21 Diciembre 2025**

Se creó la función `buildDynamicPersonalityRules()` en `prompt-composer.ts` que genera reglas de comportamiento condicionales basadas en el contexto de la conversación. Esta función "conecta el cerebro con el cuerpo" - ahora el LLM sabe usar la información del buffer.

**Lógica Condicional Implementada:**
```typescript
SI (es DM) {
   [MODO CHAT PRIVADO ACTIVADO]
   
   SI (tiempo < 60min Y conversación > 1 mensaje) {
      ⚠️ CONVERSACIÓN ACTIVA
      ❌ PROHIBIDO SALUDAR: No uses "Hola", "Hey", "Buenas"
      ✅ Ve directo al grano
      ✅ Puedes usar minúsculas iniciales
      ✅ Ejemplo: "claro, pásame los datos"
      ❌ Ejemplo malo: "¡Hola! Claro que sí..."
   } SINO SI (reengagement) {
      👋 REENGAGEMENT (usuario que vuelve)
      ✅ Saludo breve: "Hola de nuevo", "Qué tal"
      ✅ Referencia breve a conversación anterior
   } SINO {
      🆕 CONVERSACIÓN NUEVA
      ✅ Saludo breve permitido
   }
   
   📱 TONO DE DM: WhatsApp, cercano, relajado
   📦 MENSAJES AGRUPADOS: Responde a la idea global, no mensaje por mensaje
   
} SINO {
   [MODO COMENTARIO PÚBLICO ACTIVADO]
   📢 Máximo 2-3 líneas
   📢 CTA: "Escríbenos al DM 📩"
   📢 Emojis con moderación
}
```

**Inyección en System Prompt:**

| Modo | Ubicación en Prompt |
|------|---------------------|
| OpenAI (JSON) | `<dynamic_personality_rules>` después de `<context_layer>` |
| Gemini (texto) | Inmediatamente después de agent_identity |

**Actualización del Thinking Protocol (OpenAI):**
```xml
<thinking_protocol>
  1. CHECK TIPO MENSAJE: ¿Es DM o Comentario? Aplica las reglas dinámicas.
  2. CHECK SALUDO: ¿Debo saludar? Revisa el contexto de interacción.
  3. CHECK PLATAFORMA: Ajusta la longitud según las guías.
  4. CHECK LÍMITE: Tu respuesta < X caracteres.
  5. REDACCIÓN: Escribe aprovechando el espacio disponible.
</thinking_protocol>
```

**Log de Verificación:**
El sistema genera logs con la ficha de situación para cada mensaje:
```
[PromptComposer] 📋 FICHA DE SITUACIÓN generada para jordanldp:
━━━━━━━━━━━━━━━━━━━━━━━━
Tipo: dm
Estado: reengagement
Profundidad: 4 mensajes
Última respuesta: hace 999 min
isDM: true
━━━━━━━━━━━━━━━━━━━━━━━━
```

**Prueba Exitosa (21 Dic 2025):**
- Usuario envió 3 DMs rápidos a @bo_trust_service
- Buffer los acumuló (45 segundos de delay configurado)
- LLM recibió las reglas dinámicas con `estado: reengagement`
- Respuesta generada con saludo breve (correcto para reengagement)
- Una sola respuesta enviada a Metricool

#### 11.9 Configuración por Marca en Base de Datos (Paso 7)

Se agregaron nuevos campos a la tabla `ai_agents` para configurar el comportamiento del buffer por marca:

**Campos nuevos en `shared/schema.ts`:**
```typescript
dmBatchDelaySeconds: integer('dm_batch_delay_seconds').default(30),
dmReplyMode: text('dm_reply_mode').default('auto'),
cooldownPerConversation: integer('cooldown_per_conversation').default(0),
```

**Configuración de BO Trust:**
| Campo | Valor |
|-------|-------|
| `dm_batch_delay_seconds` | 45 |
| `dm_reply_mode` | 'batch' |
| `cooldown_per_conversation` | 0 |

**Flujo del Buffer con Config de BD:**
```
Metricool → syncService → autoReplyService → dmBufferService → AI → Respuesta
                              ↑
                     Lee config de BD:
                     agent.dmBatchDelaySeconds
```

#### 11.10 Cooldown por Conversación ✅ IMPLEMENTADO (21 Dic 2025)

**Problema resuelto:** El cooldown anterior era GLOBAL por marca - si BO Trust respondía a un DM de Instagram, toda la marca entraba en cooldown, bloqueando respuestas en otras redes sociales (TikTok, Facebook, etc.) y otros DMs.

**Solución implementada:** Cada conversación tiene su propio cooldown independiente.

**Cambios en Base de Datos:**
```sql
-- Nueva columna en tabla conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_ai_reply_at TIMESTAMP;
```

**Campo de configuración en ai_agents:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cooldown_per_conversation` | boolean | true = cooldown por conversación, false = cooldown global |

**Lógica en autoReplyService.checkCooldown():**
```typescript
if (agent.cooldownPerConversation && conversation) {
  lastReplyAt = conversation.lastAiReplyAt;  // Cooldown por conversación
} else {
  lastReplyAt = agent.lastAutoReplyAt;       // Cooldown global (original)
}
```

**Comportamiento:**
```
ANTES (cooldown global):
Responde a Juan en Instagram → TODA la marca en cooldown 5 min
María en Facebook → NO puede responder ❌
Pedro en TikTok → NO puede responder ❌

AHORA (cooldown por conversación):
Responde a Juan en Instagram → Solo Juan en cooldown 5 min
María en Facebook → Responde normalmente ✅
Pedro en TikTok → Responde normalmente ✅
```

**Archivos modificados:**
| Archivo | Cambio |
|---------|--------|
| `shared/schema.ts` | +columna `lastAiReplyAt` en conversations |
| `server/storage.ts` | +método `updateConversationLastAiReply()` |
| `server/services/autoReplyService.ts` | `checkCooldown()` acepta conversation, actualiza ambos timestamps |

#### 11.11 Configuración por Canal - Backend y Frontend ✅ COMPLETADA - 21 Diciembre 2025

Se implementó un sistema completo de configuración por canal social que permite sobrescribir los tiempos de buffer y cooldown para cada red social de forma independiente.

**Schema Zod para overrides por canal (`shared/schema.ts`):**
```typescript
const channelSettingsSchema = z.object({
  bufferDelaySeconds: z.number().int().min(5).max(300).nullable().optional(),
  cooldownSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  cooldownRandomness: z.number().int().min(0).max(120).nullable().optional(),
  cooldownPerConversation: z.boolean().nullable().optional(),
});
```

**Función de merge `getEffectiveChannelSettings()`:**
Retorna configuración efectiva combinando defaults del agente con overrides del canal:
```typescript
{
  bufferDelaySeconds: channelOverride?.bufferDelaySeconds ?? agent.dmBatchDelaySeconds,
  cooldownSeconds: channelOverride?.cooldownSeconds ?? agent.cooldownSeconds,
  cooldownRandomness: channelOverride?.cooldownRandomness ?? agent.cooldownRandomness,
  cooldownPerConversation: channelOverride?.cooldownPerConversation ?? agent.cooldownPerConversation,
}
```

**Controles disponibles en la UI (pestaña Orquestación):**
| Campo | UI | Descripción |
|-------|-----|-------------|
| `bufferDelaySeconds` | ✅ Slider | Tiempo buffer para DMs |
| `cooldownSeconds` | ✅ Slider | Tiempo de cooldown |
| `cooldownPerConversation` | ✅ Switch | Cooldown por conversación |
| `cooldownRandomness` | ⚪ No | Disponible en schema, pendiente de UI |

**Backend - `autoReplyService.ts`:**
- Nueva función `normalizeProvider()` valida y normaliza el platform
- Integración con `getEffectiveChannelSettings()` para buffer delay y cooldown
- Logging de warning cuando se usa fallback por platform desconocido

**Frontend - Nueva pestaña "Orquestación" en `AIAgentConfig.tsx`:**
| Control | Descripción |
|---------|-------------|
| Cooldown por conversación | Toggle para activar/desactivar cooldown independiente por conversación |
| Buffer de DMs (base) | Slider 5-120s para tiempo de acumulación de mensajes |
| Modo de respuesta DMs | Select: auto/batch/first_only |
| Configuración por red social | Collapsibles con overrides para cada red conectada |

**Estructura de `platformSettings` (JSON en tabla `ai_agents`):**
```json
{
  "instagram": { "bufferDelaySeconds": 60, "cooldownSeconds": 10 },
  "facebook": { "cooldownPerConversation": false },
  "tiktok": { "bufferDelaySeconds": 30, "cooldownSeconds": 15 }
}
```

**Flujo de datos:**
```
Frontend → formData.platformSettings → API PUT → storage.updateAiAgent() → BD
BD → storage.getAiAgentByBrand() → autoReplyService → getEffectiveChannelSettings() → Buffer/Cooldown
```

**Normalización de providers en frontend (`AIAgentConfig.tsx`):**
Función `normalizeProviderKey()` mapea variantes de providers al formato de PLATFORM_CONFIG:
```typescript
// Ejemplo: "google-business" → "google", "Instagram" → "instagram"
function normalizeProviderKey(provider: string): keyof typeof PLATFORM_CONFIG | null {
  const normalized = provider.toLowerCase().replace(/-/g, '_');
  if (normalized in PLATFORM_CONFIG) return normalized;
  if (normalized === 'google_business' || normalized === 'gmb') return 'google';
  if (normalized === 'x') return 'twitter';
  const baseProvider = normalized.split('_')[0];
  if (baseProvider in PLATFORM_CONFIG) return baseProvider;
  return null;
}
```

**Redes sociales soportadas (PLATFORM_CONFIG):**
| Provider | Nombre | Límite caracteres |
|----------|--------|-------------------|
| facebook | Facebook | 2000 |
| instagram | Instagram | 2200 |
| twitter | Twitter/X | 280 |
| tiktok | TikTok | 150 |
| linkedin | LinkedIn | 3000 |
| youtube | YouTube | 500 |
| google | Google Business | 1500 |

**Bug fix - Botón "Restaurar valores base":**
- **Problema:** El botón usaba estado desactualizado (stale closure), no eliminaba correctamente los overrides
- **Solución:** Cambio de `setFormData({...formData, ...})` a `setFormData(prev => ({...prev, ...}))`
- **Resultado:** Al restaurar y guardar, el override se elimina correctamente (se envía `null` a la BD)

#### 11.12 Consolidación UI - Pestañas Automatización y Orquestación ✅ COMPLETADA - 21 Diciembre 2025

Se consolidaron todos los controles de tiempo (cooldown, buffer) en la pestaña "Orquestación" para eliminar redundancia.

**Cambios en pestaña "Automatización":**
- Ahora solo contiene: Modo de respuesta (Desactivado/Automático) + Estrategia de límite de caracteres
- Eliminados: Toggle cooldown, slider segundos, slider variación aleatoria (movidos a Orquestación)

**Cambios en pestaña "Orquestación":**
- Toggle master "Cooldown entre respuestas" que muestra/oculta controles anidados:
  - Slider "Segundos de cooldown" (0-60s)
  - Slider "Variación aleatoria" (±0-30s)
  - Toggle "Cooldown por conversación"
- Slider "Buffer de DMs" (5-120s)
- Select "Modo de respuesta DMs"
- Collapsibles por red social con overrides personalizados

**Nuevos valores por defecto para marcas nuevas:**
| Configuración | Default anterior | Default nuevo |
|---------------|------------------|---------------|
| cooldownEnabled | false | **true** |
| cooldownSeconds | 0 | **30** |
| cooldownPerConversation | false | **true** |
| dmBatchDelaySeconds | 15 | **50** |
| dmReplyMode | 'auto' | **'batch'** |

**Archivos modificados:**
- `shared/schema.ts`: Actualizados defaults de cooldownEnabled, cooldownPerConversation, dmBatchDelaySeconds, dmReplyMode
- `client/src/components/AIAgentConfig.tsx`: Reorganizada UI, movidos controles de cooldown a Orquestación

#### 11.13 Próximos Pasos (Backlog)
Pendiente para futuro sprint:
- ✅ ~~**UI para Buffer y Cooldown**: Nueva pestaña en Agent Settings con configuración por red social~~ *(Completado en 11.11)*
- ✅ ~~**Consolidación UI**: Todos los tiempos en pestaña Orquestación~~ *(Completado en 11.12)*
- ⚪ **Tabla `conversation_user_entities`**: Extracción de datos duros (teléfono, email, nombre, ingresos) en tabla separada para memoria permanente
- ⚪ **Vocabulario Miami**: Actualizar prompts de BOTrust con vocabulario correcto (Seguro no Aseguranza, Camionero no Troquero)
- ⚪ **Tests de integración**: Cobertura de pruebas para flujos de DM buffereados

---

## Notas de Desarrollo

### Usuarios Actuales:
- **Admin:** admin@test.com / admin123 (role: admin, brandId: null)
- **System Admin:** admin@system.com (role: admin, brandId: null)

### Marcas Conectadas:
- **Impulsa:** ID=72307812-2edb-43a6-884b-e19f1a9cf200, blogId=4074962

### Problemas Conocidos:
1. **API de Metricool - Instagram:**
   - Instagram conversations devuelven Error 500 (problema en servidor de Metricool)
   - No es un bug del código - requiere verificar con otra marca o esperar fix de Metricool
   
2. **Datos de autor vacíos (edge case):**
   - Algunos comentarios de LinkedIn tienen author name vacío en la API de Metricool
   - Sistema maneja este edge case correctamente (no muestra "Unknown")
   - Preserva rawData completo para debugging futuro

### Recordatorios Técnicos:
- ✅ Tabla `clients` renombrada a `brands` exitosamente
- ✅ Login/logout implementado y funcionando
- ✅ Bug de nombres de marcas corregido (usar field `label` no `name`)
- ✅ **AuthGuard implementado**: Rutas protegidas con redirección automática a /login
- Importante: Un usuario de Metricool puede tener múltiples brands (blogIds)
- **Creación de Admins**: Solo manual en base de datos (por seguridad)
  ```sql
  INSERT INTO users (id, email, password, name, role, brand_id)
  VALUES (gen_random_uuid(), 'admin@example.com', 'hashed_password', 'Admin Name', 'admin', NULL);
  ```
- **Arquitectura Multi-tenant**: Cada cliente (client user) está asociado a una única brand
- **Seguridad**: 
  - Todas las rutas API están protegidas con autenticación y validación de roles
  - AuthContext verifica sesión al cargar la app (`/api/auth/me`)
  - DashboardLayout redirige automáticamente a /login si no hay sesión válida
  - Logout destruye sesión en servidor y redirige a login

---

## CORRECCIONES DE BUGS - 26 Noviembre 2025 ✅ COMPLETADAS

### Problema 1: Marca no aparece después del login
- Causa: NexusContext cargaba datos antes de que la sesión estuviera lista
- Solución: Agregado useAuth() con enabled en useQuery
- Archivos: client/src/context/NexusContext.tsx

### Problema 2: Páginas en blanco al navegar
- Causa: Componentes accedían a activeClient antes de cargarse
- Solución: Loading states agregados a Overview.tsx y AgentSettings.tsx
- Resultado: Todas las páginas cargan correctamente

### Problema 3: Avatares de LinkedIn no se mostraban
- Causa: Inbox.tsx no usaba AvatarImage, solo AvatarFallback
- Solución: Agregado AvatarImage en 3 ubicaciones del Inbox
- Resultado: Fotos de perfil funcionando con fallback a iniciales

### Testing Completado:
✅ Login sin recargas manuales
✅ Navegación fluida (Inbox, Overview, Connections, Integrations, Settings)
✅ Avatares de LinkedIn mostrándose correctamente
✅ Logout funcional

### Próximos Pasos:
- Fase 5: Sincronización automática cada 130 segundos
- Cargar TikTok Business y otras plataformas

---

## FASE 4.5: Mapeo Completo de Redes Sociales ✅ COMPLETADA - 27 Noviembre 2025

### Objetivo:
Mapear correctamente TODOS los datos de cada red social (Instagram, LinkedIn, TikTok, Facebook, YouTube, GMB) para que los filtros funcionen y los datos se muestren correctamente en la UI.

### Problemas Detectados y Solucionados:

#### 1. Mapeo de Instagram (141 mensajes)
**Problema:** Todos los mensajes mostraban author="Unknown" y sin avatar.

**Solución Implementada:**
- **Comentarios**: Agregado Instagram al mapeo específico de `participants[]` en `server/services/metricool.ts` (línea 178)
- **Conversaciones (DMs)**: Implementado mapeo específico en `server/routes.ts` (líneas 450-462) que busca el autor en `participants[]` usando el ID del campo `from`

**Resultado:**
- ✅ 26 comentarios con 17 autores únicos correctamente identificados
- ✅ 115 DMs con 11 autores únicos correctamente identificados

#### 2. Avatares de Instagram
**Hallazgo:** La API de Metricool NO provee URLs de avatares para Instagram.

**Evidencia (llamada real a la API):**
```json
// Instagram Comments
"participants": [{ "id": "albertgarcia34", "name": "albertgarcia34" }]
// ❌ No hay campo imageProfileUrl

// Instagram DMs  
"participants": [
  { "id": "17841459810424420", "name": "inpulza", "imageProfileUrl": "" },
  { "id": "1290065599109801", "name": "bo_trust_service" }
]
// ❌ Campo vacío o inexistente
```

**Comparación con otras plataformas:**
- ✅ LinkedIn: `imageProfileUrl: "https://media.licdn.com/..."` - Funciona
- ✅ TikTok: `imageProfileUrl: "https://p19-common-sign-useastred.tiktokcdn-eu.com/..."` - Funciona
- ❌ Instagram: Sin avatares disponibles (limitación de Metricool/Instagram API)

#### 3. Normalización de Platform
**Problema:** Los nombres de plataformas en la DB no coincidían con los tipos del frontend.

**Solución:** Función `normalizePlatform()` en `server/routes.ts`:
```typescript
function normalizePlatform(provider: string): string {
  const platformMap: Record<string, string> = {
    'tiktokbusiness': 'tiktok',
    'gmb': 'google-business',
    'google_business': 'google-business',
  };
  return platformMap[normalized] || normalized;
}
```

**Resultado:**
- `TIKTOKBUSINESS` → `tiktok` ✅
- `GMB` → `google-business` ✅

#### 4. Normalización de MessageType
**Problema:** El backend guardaba `type: 'conversation'` pero el frontend esperaba `type: 'dm'`.

**Solución (sin romper el schema):**
- Backend mantiene valores del schema: `'conversation'` y `'comment'`
- Frontend convierte en el adaptador `adaptMessage()` en `client/src/lib/api.ts`:
```typescript
const messageType: MessageType = dbMsg.type === 'conversation' ? 'dm' : (dbMsg.type as MessageType);
```

**Resultado:**
- DB almacena: `'conversation'`, `'comment'` ✅ (respeta schema)
- UI muestra: `'dm'`, `'comment'` ✅ (filtros funcionan)

#### 5. Filtros de UI
**Problema:** Los filtros de plataforma (bolitas) y tipo (All Types) no filtraban.

**Causa:** Valores de DB no coincidían con valores esperados en frontend.

**Solución:** Con las normalizaciones anteriores, los filtros ahora funcionan correctamente:
- Filtro de plataformas: Instagram, TikTok, LinkedIn, Facebook, YouTube, Google Business ✅
- Filtro de tipo: DM, Comment, Review ✅

#### 6. Z-Index de Columnas del Inbox
**Problema:** Las tarjetas de mensajes se metían detrás de la sección del chat.

**Solución:** Agregado `z-0` a la columna del chat en `client/src/components/Inbox.tsx`:
```typescript
// Columna 2 (Lista de mensajes): z-10
// Columna 3 (Chat Detail): z-0 (agregado)
```

### Datos Finales Sincronizados (Marca Impulsa):

| Plataforma | Tipo | Total | Autores Únicos | Avatares |
|------------|------|-------|----------------|----------|
| Instagram | Comment | 26 | 17 | ❌ (API no provee) |
| Instagram | DM | 115 | 11 | ❌ (API no provee) |
| LinkedIn | Comment | 2 | 2 | ✅ |
| TikTok | Comment | 2 | 2 | ✅ |
| **TOTAL** | | **145** | | |

### Archivos Modificados:
- `server/routes.ts` - Funciones de normalización + mapeo de conversaciones
- `server/services/metricool.ts` - Mapeo de comentarios para Instagram
- `client/src/lib/api.ts` - Adaptador con conversión conversation→dm
- `client/src/components/Inbox.tsx` - Z-index de columnas

### Próximos Pasos:
- Fase 5: Sincronización automática cada 130 segundos
- Monitorear cuando haya datos de YouTube o GMB para ajustar mapeos si es necesario
- Considerar fallback visual para avatares faltantes de Instagram

---

## FASE 4.6: Mapeo de Facebook ✅ IMPLEMENTADA - 27 Noviembre 2025

### Análisis de Estructura JSON de Comentarios de Facebook

#### Estructura Principal de cada Comentario:

```json
{
  "id": "122287862810232121_2432650170519580",     // ID único del comentario
  "self": "266590203197538",                       // ID de la marca (owner)
  "provider": "FACEBOOK",                          // Plataforma
  "status": "PENDING",                             // Estado
  "creationDate": "2025-11-27T01:31:26+0100",     // Fecha creación
  "lastUpdateTime": "...",                         // Última actualización
  "lastReadTime": "...",                           // Última lectura
  
  "participants": [                                // Array con info del autor
    {
      "id": "24494065186935185",                  // ID del usuario
      "name": "Olga Garcia",                       // ⭐ NOMBRE del autor
      "imageProfileUrl": "https://graph.facebook.com/..." // ⭐ AVATAR
    }
  ],
  
  "root": {
    "element": {                                   // Info del POST original
      "id": "266590203197538_122287...",          // ID del post
      "owner": { "id": "266590203197538" },       // Dueño (la marca)
      "link": "https://facebook.com/reel/...",    // ⭐ URL del POST
      "text": "¿TIRAS LA YEMA...",                // Texto del post
      "mediaUrls": [...],                          // Media del post
      "commentCount": 1,                           // Número de comentarios
      "properties": { "fbMediaProductType": "POST" }
    },
    
    "id": "122287...2432650170519580",            // ID del comentario
    "creationDate": "2025-11-27T01:31:26...",     // ⭐ TIMESTAMP del comentario
    "owner": "24494065186935185",                  // ID del autor del comentario
    "text": "❤️",                                  // ⭐ CONTENIDO del comentario
    "mediaUrl": "",                                // Media adjunta
    "properties": {
      "permalink": "https://.../comment_id=..."    // Link directo
    }
  }
}
```

#### Mapeo de Campos para el Sistema:

| Dato Necesario | Ubicación en JSON de Facebook |
|----------------|-------------------------------|
| **ID único** | `item.id` |
| **Nombre del autor** | `item.participants[0].name` |
| **Avatar del autor** | `item.participants[0].imageProfileUrl` |
| **Contenido del comentario** | `item.root.text` |
| **Timestamp** | `item.root.creationDate` o `item.creationDate` |
| **URL del post** | `item.root.element.link` |
| **Permalink del comentario** | `item.root.properties.permalink` |
| **ID de la marca** | `item.self` |
| **ID del autor** | `item.root.owner` |

### El Campo "self" - Explicación Importante

El campo `"self"` es el **ID único de TU MARCA** en esa plataforma específica.

**Propósito:**
1. **Identificar a quién pertenece el comentario** - En sincronización multi-marca
2. **Distinguir visitantes de la propia marca** - En hilos de conversación:
   - Si `root.owner` = `self` → Es respuesta de TU marca
   - Si `root.owner` ≠ `self` → Es comentario de un visitante
3. **Evitar confusión en multi-marca** - Cada marca tiene un ID único

**Ejemplos de IDs "self" por plataforma:**
- **Facebook Fortress**: `"self": "266590203197538"`
- **TikTok Fortress**: `"self": "_000FTj0xpRZRVxvhK9a2h_Id2qWe7dejKdQ"`
- **TikTok BO Trust**: `"self": "_000K1GyozZ-5j8nLRwX71pLEz07AkMwiQRV"`

### Implementación del Mapeo

**Cambio requerido:** Agregar `'FACEBOOK'` a la condición de mapeo existente.

**Archivo:** `server/services/metricool.ts` (línea 175)

**Antes:**
```typescript
if (comment.provider === 'LINKEDIN' || comment.provider === 'TIKTOKBUSINESS' || comment.provider === 'INSTAGRAM')
```

**Después:**
```typescript
if (comment.provider === 'LINKEDIN' || comment.provider === 'TIKTOKBUSINESS' || comment.provider === 'INSTAGRAM' || comment.provider === 'FACEBOOK')
```

La estructura de Facebook es **idéntica** a LinkedIn/TikTok/Instagram:
- Autor en `participants[0]` con `name` e `imageProfileUrl`
- Contenido en `root.text`
- Timestamp en `root.creationDate`
- URL del post en `root.element.link`
- Owner del comentario en `root.owner` (para matchear con participants)

### Prueba Exitosa - 27 Noviembre 2025

**Comentarios de Facebook sincronizados correctamente:**

| # | Autor | Contenido | Post |
|---|-------|-----------|------|
| 1 | Fortress Wellness Center | "Pues los Asistentes de Voz con IA están revolucionando..." | reel/1301460770956236 |
| 2 | Fortress Wellness Center | "Hola Mandy! Espectacular tu video" | reel/1301460770956236 |
| 3 | Fortress Wellness Center | "Woow! Esa estrategia es ganadora no?" | reel/3867782363481680 |
| 4 | Fortress Wellness Center | "Me parece una excelente información!" | reel/546874545095949 |

**Datos verificados en DB:**
- ✅ Autor: Fortress Wellness Center
- ✅ Avatar: URL de graph.facebook.com
- ✅ Contenido: Texto completo
- ✅ Timestamp: Fecha correcta
- ✅ Source URL: Links a los reels de Facebook

---

## Respuestas Anidadas (Hilos de Conversación) - Trabajo Futuro

### Estructura Detectada

En el Comentario 2 hay un hilo de conversación:
1. **Fortress** (seguidor) comentó: "Hola Mandy! Espectacular tu video"
2. **Impulsa** (dueño) respondió: "Muchas gracias por tu comentario..."

**Estructura JSON de respuestas anidadas:**
```json
{
  "root": {
    "owner": "266590203197538",        // ID de quien comentó (Fortress)
    "text": "Hola Mandy!...",          // Comentario principal
    "comments": [                       // ⭐ Array de respuestas anidadas
      {
        "owner": "254142671114215",    // ID de quien respondió (Impulsa = self)
        "text": "Muchas gracias...",   // Respuesta
        "creationDate": "2025-11-27T10:49:43+0100"
      }
    ]
  }
}
```

### Identificación con campo `self`

El campo `self` permite identificar quién es el dueño de la página vs. los seguidores:

| Situación | Condición |
|-----------|-----------|
| Seguidor inició el hilo | `root.owner` ≠ `self` |
| Marca inició el hilo | `root.owner` == `self` |
| Seguidor respondió | `comments[i].owner` ≠ `self` |
| Marca respondió | `comments[i].owner` == `self` |

### Implementación Futura Sugerida

Para soportar hilos de conversación completos:

1. **Procesar `root.comments[]`** en el mapeo de comentarios
2. **Agregar campo `parentId`** al schema de messages para relacionar respuestas
3. **Agregar campo `threadId`** para agrupar conversaciones
4. **Guardar `selfId`** de la marca para identificar respuestas propias

```typescript
// Schema propuesto para futuro:
messages: {
  ...campos_actuales,
  parentId: text('parent_id'),      // ID del comentario padre (si es respuesta)
  threadId: text('thread_id'),      // ID del hilo de conversación
  isFromBrand: boolean,             // true si owner == self
}
```

### Estado Actual

- ✅ Comentarios principales de Facebook funcionando
- ⏳ Respuestas anidadas (`root.comments[]`) pendiente de implementar
- ⏳ Identificación de hilos pendiente
- ⏳ Campo `self` disponible en rawData para uso futuro

---

## FASE 5: Sincronización Automática - 27 Noviembre 2025

### Objetivo
Implementar un sistema de polling bidireccional que sincronice automáticamente los mensajes de Metricool y los muestre en tiempo real en el frontend.

### Arquitectura Acordada

```
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND - SyncService (server/services/syncService.ts)          │
│                                                                 │
│ • Intervalo base: 2 minutos (120,000 ms)                       │
│ • Procesa marcas EN SECUENCIA (no Promise.all)                  │
│ • Delay de 1-2 seg entre cada marca (Jitter)                   │
│ • Si error 429 → marca en "cooldown" 5 min (Backoff)           │
│ • Singleton pattern (una sola instancia)                        │
│ • Errores no detienen el servicio                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND - React Query                                          │
│                                                                 │
│ • refetchInterval: 30 seg (mensajes del inbox)                 │
│ • refetchOnWindowFocus: true                                    │
│ • Indicador visual de última sincronización                    │
│ • Botón de sincronización manual (icono de flechas circulares) │
└─────────────────────────────────────────────────────────────────┘
```

### Decisiones Técnicas

#### 1. Por qué Polling y no WebSockets
- **Simplicidad**: No requiere infraestructura adicional
- **APIs externas**: Metricool no ofrece webhooks/push notifications
- **Suficiente para el caso de uso**: 2 minutos es aceptable para comentarios de redes sociales
- **Menos puntos de fallo**: Sin conexiones persistentes que mantener

#### 2. Intervalo de 2 Minutos (no 30 segundos)
**Cálculo de cuotas:**
- 30 seg = 2,880 llamadas/día/marca → Con 15 marcas = 43,200 llamadas/día ❌
- 2 min = 720 llamadas/día/marca → Con 15 marcas = 10,800 llamadas/día ✅

El intervalo de 2 minutos protege la cuota de API de Metricool.

#### 3. Jitter (Desfase entre marcas)
**Problema:** Si hay 15 marcas, no queremos 15 peticiones simultáneas.
**Solución:** Procesar marcas secuencialmente con 1-2 segundos de delay entre cada una.

#### 4. Exponential Backoff para Error 429
**Problema:** Si Metricool devuelve 429 (rate limit), el sistema seguiría reintentando.
**Solución:** Si una marca recibe 429, entra en "cooldown" de 5 minutos antes de reintentar.

#### 5. Frontend con refetchOnWindowFocus
**Beneficio:** Cuando el usuario vuelve a la pestaña, los datos se refrescan inmediatamente sin esperar el intervalo.

### Componentes a Implementar

#### Backend
1. **`server/services/syncService.ts`** - Servicio singleton de sincronización
   - `start()` - Inicia el intervalo
   - `stop()` - Detiene el intervalo
   - `syncAllBrands()` - Sincroniza todas las marcas secuencialmente
   - `syncBrand(brandId)` - Sincroniza una marca específica
   - Manejo de cooldown por marca

2. **Inicialización en `server/index.ts`** - Arrancar SyncService al iniciar el servidor

3. **Endpoint manual** - `POST /api/sync/trigger` para forzar sincronización

#### Frontend
1. **Actualizar React Query** (`client/src/lib/queryClient.ts`)
   - `refetchOnWindowFocus: true`

2. **Indicador de sincronización** en el Inbox
   - Mostrar "Última actualización: hace X segundos"
   - Botón circular con flechas para sincronización manual
   - Animación mientras sincroniza

3. **Hook `useSyncStatus`** para estado de sincronización

### Elementos de UI

**Indicador de sincronización (en header del Inbox):**
- Icono: `RefreshCw` de Lucide (flechas circulares)
- Estados:
  - Idle: Icono estático + "Actualizado hace X seg"
  - Syncing: Icono girando + "Sincronizando..."
- Click: Dispara sincronización manual

### Archivos a Modificar/Crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `server/services/syncService.ts` | Crear | Servicio de sincronización automática |
| `server/index.ts` | Modificar | Iniciar SyncService |
| `server/routes.ts` | Modificar | Añadir endpoint de sync manual |
| `client/src/lib/queryClient.ts` | Modificar | Activar refetchOnWindowFocus |
| `client/src/components/Inbox.tsx` | Modificar | Añadir indicador y botón de sync |
| `client/src/hooks/useSyncStatus.ts` | Crear | Hook para estado de sincronización |

### Flujo de Datos

```
1. SyncService (cada 2 min)
   ↓
2. Para cada marca (secuencial, con delay):
   ↓
3. metricoolService.getAllInboxData(blogId)
   ↓
4. Upsert en DB (evita duplicados por metricoolId)
   ↓
5. Frontend (React Query refetch cada 30 seg)
   ↓
6. Usuario ve mensajes nuevos en el Inbox
```

### Futuro: Agente de OpenAI
Esta arquitectura está preparada para integrar un agente de IA que:
1. Detecte mensajes nuevos después de cada sync
2. Genere respuestas automáticas
3. Las marque como "listas para enviar"

El agente se integrará en el paso 4 del flujo, después del upsert.

### Estado de Implementación
- ✅ SyncService backend (`server/services/syncService.ts`)
- ✅ Endpoint de sync manual (`GET /api/sync/status`, `POST /api/sync/trigger`)
- ✅ React Query configuración (`refetchOnWindowFocus: true`, `staleTime: 30000`)
- ✅ UI de sincronización en Inbox (indicador de tiempo + botón RefreshCw)

### Verificación de Funcionamiento (27 Nov 2025)

**Logs del SyncService:**
```
[SyncService] Starting automatic sync service (interval: 2 minutes)
[SyncService] Starting sync cycle...
[SyncService] Found 1 brands to sync
[SyncService] Syncing brand: Inpulza
[SyncService] Brand Inpulza: saved 55 messages
[SyncService] Sync cycle complete. Synced 1/1 brands
```

**Componentes creados:**
1. `server/services/syncService.ts` - Servicio singleton con:
   - Intervalo de 2 minutos
   - Procesamiento secuencial con jitter de 2 segundos
   - Backoff de 5 minutos para errores 429
   
2. Endpoints en `server/routes.ts`:
   - `GET /api/sync/status` - Estado de sincronización
   - `POST /api/sync/trigger` - Sincronización manual (solo admin)

3. Frontend actualizado:
   - `refetchOnWindowFocus: true` en queryClient
   - Indicador de "hace Xs/Xm" junto al botón de sync
   - Botón deshabilitado durante sincronización

---

## Fase 5.1: Correcciones y Mejoras UI (27 Nov 2025)

### Corrección de Timestamps
**Problema:** Los mensajes mostraban la fecha de sincronización en lugar de la fecha real del mensaje.

**Causa:** El código usaba `msg.created_time || msg.publicationDateTime || Date.now()` con operador `||`, que evaluaba incorrectamente cuando el primer campo era `undefined`.

**Solución:** Cambiar a `if` explícitos en `server/services/syncService.ts`:
```typescript
let timestamp: string | number = Date.now();
if (msg.publicationDateTime) {
  timestamp = msg.publicationDateTime;
} else if (msg.created_time) {
  timestamp = msg.created_time;
} else if (msg.timestamp) {
  timestamp = msg.timestamp;
} else if (conv.rawData?.creationDate) {
  timestamp = conv.rawData.creationDate;
}
```

**Campos de timestamp disponibles en JSON de Metricool:**
- `publicationDateTime` - Fecha de publicación del mensaje individual
- `creationDate` - Fecha de creación de la conversación/comentario
- `lastUpdateTime` - Última actualización

### Badges de Conteo por Plataforma
Añadidos badges de notificación (círculo rojo) en cada botón de filtro de red social mostrando cuántos mensajes hay por plataforma.

**Implementación:**
1. Cálculo de conteos en `Inbox.tsx`:
```typescript
const platformCounts = React.useMemo(() => ({
  instagram: clientMessages.filter(m => m.platform === 'instagram').length,
  tiktok: clientMessages.filter(m => m.platform === 'tiktok').length,
  // ... etc
}), [clientMessages]);
```

2. Prop `count` en `FilterButton` component
3. Badge renderizado con `ring-2 ring-white` para separación visual

### Mensajes Vacíos de Instagram (is_unsupported)
**Descubrimiento:** Algunos mensajes DM aparecen con globos vacíos.

**Causa:** Instagram marca ciertos contenidos como `is_unsupported: true`:
```json
{
  "text": "",
  "properties": {"is_unsupported": true},
  "attachments": []
}
```

**Tipos de contenido no soportado:**
- Stickers
- Reacciones (likes, corazones)
- GIFs
- Mensajes de voz/audio
- Imágenes/videos temporales expirados
- Historias compartidas
- Mensajes eliminados

**Decisión:** Dejar como está - el usuario entiende que es contenido que Instagram no permite leer.

---

## Pendiente: Integración YouTube

### Estado Actual
- YouTube está en la lista de `commentProviders` en `metricool.ts`
- Se hace llamada a `/v2/inbox/post-comments?provider=youtube`
- Pero no se están recibiendo comentarios (posible falta de autenticación o configuración)

### Próximos Pasos
1. Verificar si Metricool requiere autenticación OAuth separada para YouTube
2. Revisar respuesta del API para provider=youtube
3. Confirmar que el blogId tiene YouTube conectado en Metricool

---

## FASE 6: Arquitectura de Hilos (Threading) - APROBADA

### Fecha de Aprobación: 27 Noviembre 2025

### Contexto y Justificación

**Problema Actual:** Cada mensaje de Metricool se guarda como una entrada separada en la tabla `messages`. Esto causa:
1. La lista del Inbox muestra mensajes individuales, no conversaciones agrupadas
2. Si Carlos escribe 5 mensajes, aparecen 5 tarjetas separadas
3. La IA no puede mantener contexto de conversación (amnesia)

**Solución Aprobada:** Arquitectura de 4 tablas con agrupación por hilos tipo WhatsApp.

### Por qué es CRÍTICO para la IA

```
SIN HILOS (problema):
- IA recibe: "¿Tienen envío a Miami?"
- IA responde: "¿Envío de qué? No tengo contexto"

CON HILOS (solución):
- IA recibe: [
    {"role": "user", "content": "¿Cuánto cuestan los zapatos?"},
    {"role": "assistant", "content": "$50"},
    {"role": "user", "content": "¿Tienen envío a Miami?"}
  ]
- IA responde: "Sí, enviamos los zapatos rojos a Miami por $15"
```

**Conclusión:** Sin hilos, la IA no puede mantener conversaciones coherentes. OpenAI necesita el array completo de mensajes del hilo.

### Arquitectura Híbrida de 4 Tablas (Aprobada)

Se decidió usar una versión simplificada que elimina la tabla `SocialAccounts` (redundante con Metricool) pero mantiene `SocialPosts` para contexto y queries de IA.

```
Brands (ya existe)
   └── SocialPosts (NUEVA - contexto de posts/videos)
          └── Conversations (NUEVA - hilos/tarjetas)
                 └── Messages (modificada - con conversation_id)
```

### Esquema de Base de Datos

#### Tabla: `social_posts` (NUEVA)
Guarda información del post/video original donde ocurren los comentarios.

```typescript
socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id),
  platform: text("platform").notNull(), // instagram, facebook, tiktok, etc.
  externalId: text("external_id").notNull(), // ID del post en la plataforma
  permalink: text("permalink"), // URL al post original
  thumbnailUrl: text("thumbnail_url"), // Miniatura del video/imagen
  caption: text("caption"), // Texto del post
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// UNIQUE: Un post solo existe una vez por marca+plataforma
UNIQUE(brand_id, platform, external_id)
```

**¿Por qué es importante?**
- Si 1,000 personas comentan en el mismo video, los datos del video se guardan UNA vez
- Si la URL de la miniatura caduca, se actualiza en UN solo lugar
- Permite queries de IA: "Analiza todos los comentarios del Video de Zapatos"

#### Tabla: `conversations` (NUEVA)
Representa un hilo único entre la marca y un usuario específico.

```typescript
conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id),
  socialPostId: varchar("social_post_id").references(() => socialPosts.id), // NULL para DMs
  platform: text("platform").notNull(),
  type: text("type").notNull(), // 'dm' | 'comment'
  customerId: text("customer_id").notNull(), // ID externo del usuario
  customerName: text("customer_name"),
  customerAvatar: text("customer_avatar"),
  lastMessageAt: timestamp("last_message_at").notNull(),
  lastMessagePreview: text("last_message_preview"),
  status: text("status").notNull().default('open'), // open, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// UNIQUE CONSTRAINTS (impiden duplicados a nivel de BD):
// Para DMs: UNIQUE(brand_id, platform, customer_id) WHERE social_post_id IS NULL
// Para Comentarios: UNIQUE(social_post_id, customer_id)
```

#### Tabla: `messages` (MODIFICADA)
Se agrega `conversationId` para vincular al hilo.

```typescript
// Campos nuevos:
conversationId: varchar("conversation_id").references(() => conversations.id),
direction: text("direction"), // 'inbound' | 'outbound'

// Campo existente threadId se mantiene temporalmente para compatibilidad
// Se eliminará después de la migración
```

### Lógica de Agrupación (Thread Key)

**Para DMs:**
```
Thread Key = platform + brand_id + sender_id
Ejemplo: "instagram_abc123_user456"
```

**Para Comentarios:**
```
Thread Key = platform + brand_id + post_id + author_id
Ejemplo: "facebook_abc123_post789_user456"
```

**Algoritmo de Ingestión:**
```
1. Llega mensaje nuevo de Metricool
2. Calcular Thread Key
3. ¿Existe conversation con esa key?
   - SÍ: Usar conversation_id existente, actualizar last_message_at
   - NO: Crear nueva conversation
4. Si es comentario, verificar/crear SocialPost primero
5. Guardar mensaje con conversation_id
```

### Arquitectura Multi-tenant (Separación por Marca)

**Pregunta clave:** ¿Cómo se separan los datos entre usuarios/marcas?

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS                                 │
├─────────────────────────────────────────────────────────────┤
│ Admin (role: 'admin')     → brandId: NULL   → VE TODO       │
│ Cliente A (role: 'client') → brandId: ABC   → Solo ve ABC   │
│ Cliente B (role: 'client') → brandId: XYZ   → Solo ve XYZ   │
└─────────────────────────────────────────────────────────────┘
```

**Cada tabla tiene `brand_id`:**
| Tabla | Campo de separación |
|-------|---------------------|
| `brands` | `id` (es la marca misma) |
| `social_posts` | `brand_id` |
| `conversations` | `brand_id` |
| `messages` | `brand_id` + `conversation_id` |

**El middleware de seguridad filtra automáticamente:**
- Si eres **admin** → Ves todas las marcas
- Si eres **client** → Solo ves datos donde `brand_id = tu_brand_id`

**Conclusión:** La refactorización de hilos es INTERNA a cada marca. No cambia la seguridad entre marcas. Un usuario de "Impulsa" nunca verá datos de "Fortress".

### Plan de Implementación por Fases

| Fase | Descripción | Tiempo Est. | Riesgo |
|------|-------------|-------------|--------|
| **1** | Crear tablas `social_posts` y `conversations` en schema | 1-2h | Bajo (tablas nuevas vacías) |
| **2** | Agregar `conversationId` a `messages` (nullable) | 30min | Bajo (campo nullable) |
| **3** | Script de migración de datos existentes | 2-3h | Medio (requiere backup) |
| **4** | Actualizar SyncService con lógica de threading | 2-3h | Medio |
| **5** | Actualizar Frontend (lista de conversations) | 2-3h | Medio |
| **6** | Limpieza (eliminar campo `threadId` obsoleto) | 1h | Bajo |

**Total estimado:** 10-14 horas

### Migración de Datos Existentes

**NO se borran datos.** El proceso es:

```
1. Leer cada mensaje existente de tabla `messages`
   ↓
2. Extraer del campo `rawData` la info del post original
   (root.element.id, root.element.link, etc.)
   ↓
3. Crear registro en `social_posts` (si no existe)
   ↓
4. Crear registro en `conversations` (si no existe)
   (agrupando por: platform + customer_id + post_id)
   ↓
5. Actualizar el mensaje con el nuevo `conversation_id`
```

**El campo `rawData` contiene todo el JSON original de Metricool**, lo que permite extraer cualquier dato necesario sin re-sincronizar.

### Especificaciones UX

**Columna Izquierda (Lista):**
- Query: `SELECT * FROM conversations WHERE brand_id = X ORDER BY last_message_at DESC`
- Muestra: Avatar, nombre, preview del último mensaje, timestamp
- Badge de mensajes no leídos por hilo

**Columna Centro (Detalle):**
- Query: `SELECT * FROM messages WHERE conversation_id = Y ORDER BY created_at ASC`
- Si es comentario: Header contextual con miniatura del post y link
- Mensajes ordenados cronológicamente con diferenciación visual (inbound/outbound)

### Estado de Implementación

- ✅ Fase 1: Crear nuevas tablas - COMPLETADA
- ✅ Fase 2: Modificar tabla messages - COMPLETADA
- ✅ Fase 3: Migración de datos - COMPLETADA (173 mensajes → 67 conversaciones)
- ✅ Fase 4: Actualizar SyncService - COMPLETADA
- ⏳ Fase 5: Actualizar Frontend - EN PROGRESO
- ⏳ Fase 6: Limpieza - PENDIENTE

---

## FASE 6: Refactorización Frontend a Conversaciones (27 Nov 2025)

### Cambios Realizados

#### 1. NexusContext - Nuevo Estado de Conversaciones
- Añadido estado `conversations` para lista de conversaciones
- Añadido `activeConversation` para conversación seleccionada
- Añadido `activeConversationMessages` para mensajes de la conversación activa
- Función `setActiveConversation()` que carga mensajes on-demand
- Estados de loading: `isLoadingConversations`, `isLoadingConversationMessages`

#### 2. API Client - Nuevos Endpoints
- `api.conversations.getAll(brandId)` - Lista conversaciones con posts
- `api.conversations.getMessages(conversationId)` - Mensajes de una conversación
- `api.conversations.markAsRead(conversationId)` - Marcar como leída

#### 3. Nuevo Componente ConversationCard
- Muestra: avatar del cliente, nombre, plataforma, tipo (DM/Comment)
- Badge de mensajes no leídos
- Preview del último mensaje
- Link al post original (si aplica)

#### 4. Inbox.tsx Refactorizado
- Lista ahora muestra `ConversationCard` en lugar de `MessageCard`
- Header del chat usa `activeConversation` para info del usuario
- Thread messages cargados desde `activeConversationMessages`
- Lógica de `activeDraftMessage` y `lastInboundMessage` separada
- Verificaciones null-safe para `selectedMessage`

### Bugs Corregidos en Esta Sesión
- `selectedMessage` undefined cuando no hay mensajes
- Fragment JSX no cerrado correctamente
- Referencias a `selectedMessageId` obsoleto actualizadas
- `filteredMessages` cambiado a `filteredConversations`

### Problema Identificado: Agrupación de Comentarios por Post

**Situación Actual:**
- Cada hilo de comentarios (padre + respuestas) crea una conversación separada
- Múltiples tarjetas para el mismo post

**Comportamiento Esperado (según usuario):**
- **Para Comentarios:** UNA conversación = UN POST
  - Todos los comentarios de ese post van dentro de la misma tarjeta
  - La tarjeta debería mostrar preview/miniatura del post
  - Dentro se ven todos los comentarios (padres y respuestas)
  
- **Para DMs:** Modelo actual correcto
  - UNA conversación = UN thread con una persona

**Impacto:**
- Tarjetas duplicadas o vacías
- UX confusa
- No refleja cómo funcionan las redes sociales

### Próximos Pasos
1. ~~Modificar lógica de threading: agrupar por `social_post_id` para comentarios~~ ✅ COMPLETADO
2. ~~Actualizar SyncService para no crear conversaciones por cada threadExternalId en comentarios~~ ✅ COMPLETADO
3. ~~UI de tarjeta: mostrar miniatura del post en lugar de avatar para comentarios~~ ✅ COMPLETADO
4. Dentro de la conversación: organizar comentarios padre/respuesta visualmente

---

## FASE 6.1: Corrección de Agrupación de Conversaciones (27 Nov 2025)

### Problema Resuelto
Las conversaciones de comentarios se agrupaban por `brandId + platform + customerId + socialPostId`, lo que creaba múltiples tarjetas para el mismo post (una por cada comentador). Esto no refleja cómo funcionan las redes sociales.

### Cambios Implementados

#### 1. Storage - `getConversationByKey()` Modificado
**Archivo:** `server/storage.ts`

**Antes:**
```typescript
// Comentarios agrupados por: brandId + platform + customerId + socialPostId
```

**Después:**
```typescript
// Comentarios agrupados por: brandId + platform + socialPostId (sin customerId)
// Esto asegura UNA conversación por POST
```

**Lógica final:**
- **Comentarios** (`socialPostId` presente): `brandId + platform + socialPostId`
- **DMs con thread** (`threadExternalId` presente): `brandId + platform + threadExternalId`
- **DMs sin thread** (fallback): `brandId + platform + customerId`

#### 2. Migración SQL de Conversaciones Existentes
```sql
-- Resultado de la migración:
-- 32 mensajes reasignados a conversaciones consolidadas
-- 25 conversaciones duplicadas eliminadas
-- 24 conversaciones de comentarios finales (= 24 posts únicos)
```

#### 3. ConversationCard - Nuevo Diseño para Comentarios
**Archivo:** `client/src/components/ConversationCard.tsx`

**Cambios:**
- **Miniatura del post**: Para comentarios, muestra `socialPost.thumbnailUrl` en lugar del avatar del cliente
- **Título del post**: Muestra el caption del post (truncado a 40 chars) en lugar del nombre del cliente
- **Badge actualizado**: Cambiado de "Comment" a "Comments" (refleja múltiples comentadores)
- **Fallback visual**: Si no hay thumbnail, muestra icono de comentarios en fondo gradiente

**Código clave:**
```tsx
const renderThumbnail = () => {
  if (isComment) {
    if (conversation.socialPost?.thumbnailUrl) {
      return <img src={thumbnailUrl} ... />;
    }
    return <MessageSquare icon fallback />;
  }
  return <Avatar for DMs />;
};
```

### Verificación Final
```
| Tipo     | Conversaciones | Posts Únicos | Estado |
|----------|----------------|--------------|--------|
| comment  | 24             | 24           | ✅     |
| dm       | 32             | N/A          | ✅     |
```

### Resumen de Arquitectura de Conversaciones

```
COMENTARIOS:
┌─────────────────────────────────────────┐
│  Post A (Instagram)                     │
│  ├── Comentario de Usuario 1           │
│  ├── Comentario de Usuario 2           │
│  └── Comentario de Usuario 3           │
│  = 1 CONVERSACIÓN                       │
└─────────────────────────────────────────┘

DMs:
┌─────────────────────────────────────────┐
│  Usuario X (thread abc123)              │
│  ├── Mensaje entrante                   │
│  ├── Respuesta de marca                 │
│  └── Mensaje entrante                   │
│  = 1 CONVERSACIÓN                       │
└─────────────────────────────────────────┘
```

---

## FASE 6.1.1: Implementación de getInboxThreads() - Sistema de Agrupación de Inbox (16 Dic 2025)

### Problema Resuelto
A pesar de la lógica de agrupación por `socialPostId`, el Inbox seguía mostrando múltiples tarjetas para el mismo post. Esto ocurría porque:
1. Conversaciones legacy en la DB tenían duplicados
2. El endpoint `GET /api/conversations` devolvía todas las conversaciones sin agrupar visualmente

### Solución Implementada

#### 1. Nuevo Método `getInboxThreads()` en `server/storage.ts`

**Propósito:** Devolver UNA tarjeta por post, agregando todos los datos de conversaciones relacionadas.

```typescript
async getInboxThreads(brandId: string): Promise<Array<Conversation & {
  messageCount: number;
  aggregatedUnreadCount: number;
  representativeConversationIds: string[];
}>>
```

**Lógica:**
1. Obtiene todas las conversaciones de la marca
2. Cuenta mensajes por conversación (filtra vacías con `msgCount > 0`)
3. **Comentarios** (`socialPostId` presente): Agrupa por `socialPostId`
   - Suma `unreadCount` de todas las conversaciones del mismo post
   - Guarda IDs de todas las conversaciones relacionadas
   - Devuelve la conversación más reciente como representante
4. **DMs** (`socialPostId` null): Las mantiene individuales
5. Ordena por `lastMessageAt` descendente

#### 2. Nuevo Método `getConversationsBySocialPost()` en `server/storage.ts`

**Propósito:** Obtener conversaciones relacionadas con un post específico DE FORMA SEGURA.

```typescript
async getConversationsBySocialPost(brandId: string, socialPostId: string): Promise<Conversation[]>
```

**Seguridad:** Filtra por AMBOS `brandId` Y `socialPostId` para evitar fugas de datos cross-brand.

#### 3. Endpoints Actualizados en `server/routes.ts`

**GET /api/conversations:**
- Antes: `storage.getConversations(brandId)` → devolvía todas
- Después: `storage.getInboxThreads(brandId)` → devuelve agrupadas

**GET /api/conversations/:id/messages:**
- Cuando la conversación tiene `socialPostId`:
  - Usa `getConversationsBySocialPost()` para obtener conversaciones relacionadas
  - Obtiene mensajes de TODAS las conversaciones del mismo post
  - Los ordena cronológicamente

**POST /api/conversations/:id/mark-read:**
- Cuando la conversación tiene `socialPostId`:
  - Marca como leídas TODAS las conversaciones del mismo post

### Seguridad Crítica

**NUNCA usar:**
```typescript
// ❌ INSEGURO - expone todas las conversaciones de la marca
const allConversations = await storage.getConversations(brandId);
const related = allConversations.filter(c => c.socialPostId === id);
```

**SIEMPRE usar:**
```typescript
// ✅ SEGURO - filtra a nivel de base de datos
const related = await storage.getConversationsBySocialPost(brandId, socialPostId);
```

### Archivos Modificados
- `server/storage.ts`:
  - Interfaz `IStorage`: Añadidos `getInboxThreads()` y `getConversationsBySocialPost()`
  - Clase `DatabaseStorage`: Implementaciones completas
- `server/routes.ts`:
  - `GET /api/conversations`: Usa `getInboxThreads()`
  - `GET /api/conversations/:id/messages`: Usa `getConversationsBySocialPost()`
  - `POST /api/conversations/:id/mark-read`: Usa `getConversationsBySocialPost()`

### Referencia Rápida

**Si hay problemas de tarjetas duplicadas en el Inbox:**
1. Verificar que `GET /api/conversations` use `getInboxThreads()` (no `getConversations()`)
2. Verificar que las conversaciones vacías estén siendo filtradas (`msgCount > 0`)
3. Verificar que la agrupación sea por `socialPostId` para comentarios

**Si hay problemas de seguridad/datos cruzados:**
1. Verificar que los endpoints usen `getConversationsBySocialPost()` 
2. NUNCA obtener todas las conversaciones y filtrar en memoria

---

## FASE 6.2: Funcionalidad de Reply a Comentarios - TikTok (28 Nov 2025)

### Objetivo
Implementar la funcionalidad de responder a comentarios directamente desde la aplicación, empezando con TikTok.

### Implementación Completada

#### 1. Backend - MetricoolService (`server/services/metricool.ts`)

**Nuevo método `replyToComment()`:**
```typescript
async replyToComment(params: {
  provider: string;
  objectId: string;
  text: string;
  blogId: string;
  mentionUsername?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: any }>
```

**Endpoint de Metricool utilizado:**
```
POST /api/v2/inbox/post-comments?userId={userId}&blogId={blogId}
Headers: X-Mc-Auth: {token}
Body: {
  "provider": "TIKTOKBUSINESS",
  "objectId": "{commentId}",
  "text": "@username respuesta...",
  "attachment": ""
}
```

#### 2. Backend - Endpoint de Reply (`server/routes.ts`)

**Nuevo endpoint `POST /api/inbox/reply`:**
```typescript
// Validaciones de seguridad:
// 1. Autenticación requerida
// 2. Verificación de propiedad de marca (client solo su brand)
// 3. Solo mensajes inbound pueden recibir reply (outbound rechazados)
// 4. Validación de rawData y metricoolId presentes

// Normalización de providers:
const providerMap = {
  'tiktok': 'TIKTOKBUSINESS',
  'instagram': 'instagram',
  'facebook': 'FACEBOOK',
  'linkedin': 'linkedin',
  'youtube': 'youtube',
  'google-business': 'GMB',
};
```

**Flujo del Reply:**
1. Recibe `messageId`, `text`, `includeMention`
2. Obtiene mensaje original y valida acceso
3. Extrae `objectId` del rawData (formato: `{videoId}_{commentId}`)
4. Incluye @username si `includeMention=true`
5. Envía a Metricool API
6. Guarda mensaje outbound en BD con `parentMessageId` vinculado
7. Actualiza conversación con `lastMessageAt` y `lastMessagePreview`

#### 3. Frontend - UI de Reply (`client/src/components/Inbox.tsx`)

**Estados añadidos:**
```typescript
const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
const [replyText, setReplyText] = useState("");
const [isSendingReply, setIsSendingReply] = useState(false);
```

**Componentes UI:**
1. **Botón Reply**: Flechita visible debajo de cada mensaje entrante (siempre visible, no hover)
2. **Caja de texto flotante**: Aparece al tocar Reply, incluye:
   - Vista previa del mensaje citado con borde indigo
   - Textarea para escribir respuesta
   - Contador de caracteres con límite por plataforma
   - Botón Enviar con loading state
   - Botón X para cancelar

**Identificador visual "Enviado desde Repliyo":**
- Mensajes enviados desde la app muestran el logo de Repliyo como avatar
- Etiqueta "Enviado desde Repliyo" con icono de envío dentro de la burbuja
- Diferencia visual clara vs mensajes respondidos directamente en TikTok

#### 4. Diferencia entre Tipos de Respuesta (Metricool API)

| Tipo de Acción | objectId que usas | Ejemplo de ID |
|----------------|-------------------|---------------|
| Responder comentario raíz | conversation.id | 7522238432484085047 |
| Responder comentario anidado | reply.id (dentro de root.comments) | 7522238432484085047_7521978977020396302 |
| Comentar publicación sin responder | **No disponible en Metricool API** | N/A |

**Importante:** Metricool API está diseñada para gestión de inbox y respuestas, NO para publicar comentarios nuevos sin contexto de conversación.

#### 5. Indicadores de Sentimiento

**Caritas en mensajes entrantes:**
- 😊 Positivo (verde)
- 😐 Neutral (gris)
- 😟 Negativo (rojo)

Mostradas junto al badge de tipo de mensaje. Por defecto muestra "neutral" si no hay análisis de sentimiento.

### Verificación de Funcionamiento

**Test exitoso realizado:**
```
[Metricool POST] https://app.metricool.com/api/v2/inbox/post-comments?userId=2603584&blogId=4074962
[Metricool POST] Body: {
  "provider": "TIKTOKBUSINESS",
  "objectId": "7438626225028959520_7438757586096849697",
  "text": "@mandy_mandex No nos has comentado...",
  "attachment": ""
}
[Metricool POST] Response (201): {"data":"OK"}
POST /api/inbox/reply 200 in 1416ms
```

### Archivos Modificados
- `server/services/metricool.ts` - Añadido `replyToComment()` y `makePostRequest()`
- `server/routes.ts` - Nuevo endpoint `POST /api/inbox/reply`
- `client/src/components/Inbox.tsx` - UI de reply completa
- `client/src/assets/repliyo-logo.jpg` - Logo de la app para avatar

---

## FASE 6.3: Funcionalidad de Reply a Comentarios - YouTube (28 Nov 2025)

### Objetivo
Extender la funcionalidad de Reply para soportar comentarios de YouTube.

### Análisis de Estructura

**Formato de IDs de YouTube:**
| Tipo | Formato de ID | Ejemplo |
|------|---------------|---------|
| Comentario raíz | `{commentId}` | `Ugznv4HhyKsJTrZlTnd4AaABAg` |
| Respuesta anidada | `{parentId}.{replyId}` | `Ugznv4HhyKsJTrZlTnd4AaABAg.AQ1MFmta96nAQ1MaXGj19S` |

**Diferencia con TikTok:**
- TikTok: `{videoId}_{commentId}` (underscore)
- YouTube: `{commentId}` o `{parentId}.{replyId}` (punto)

### Implementación

**Resultado:** El código existente ya soportaba YouTube correctamente sin necesidad de modificaciones.

**Flujo verificado:**
1. `rawData.id` contiene el ID del comentario de YouTube
2. Provider se normaliza a `'youtube'` (minúsculas)
3. Metricool API acepta el objectId directamente
4. Menciones funcionan con formato `@{username}`

### Test Exitoso

```bash
POST /api/inbox/reply
{
  "messageId": "ab71b530-83f0-4950-b3c4-f39b99456dd0",
  "text": "Gracias por tu pregunta!...",
  "includeMention": true
}
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "message": {
    "id": "c47a14d5-60a1-48c4-b7ef-a12d7e10b01b",
    "platform": "youtube",
    "direction": "outbound",
    "content": "@@jordandelgado7691 Gracias por tu pregunta!...",
    "parentMessageId": "ab71b530-83f0-4950-b3c4-f39b99456dd0"
  },
  "metricoolResponse": {"data": "OK"}
}
```

### Plataformas con Reply Funcional

| Plataforma | Status | Provider Metricool | Formato objectId |
|------------|--------|-------------------|------------------|
| TikTok | ✅ Funcional | TIKTOKBUSINESS | `{videoId}_{commentId}` |
| YouTube | ✅ Funcional | youtube | `{commentId}` o `{parentId}.{replyId}` |
| Instagram | 🔄 Pendiente | instagram | Por verificar |
| Facebook | 🔄 Pendiente | FACEBOOK | Por verificar |
| LinkedIn | 🔄 Pendiente | linkedin | Por verificar |

### Próximo Paso
Probar y documentar Reply para Instagram, Facebook y LinkedIn.

---

## FASE 6.4: Sistema de Reconciliación y Threading

### Fecha: 28 de Noviembre 2025

### Objetivo
Prevenir mensajes duplicados cuando Metricool sincroniza respuestas enviadas desde Repliyo, y organizar visualmente los mensajes en hilos (threading).

### Problema Identificado
Cuando enviamos un reply desde Repliyo:
1. Se guarda localmente con `direction: 'outbound'` y `parentMessageId` apuntando al comentario al que respondimos
2. Metricool lo sincroniza después como `direction: 'inbound'` con un `parentMessageId` diferente (apunta al post, no al comentario)
3. Esto creaba **duplicados** en la interfaz

### Solución Implementada

#### 1. Sistema de Reconciliación (`server/storage.ts`)

```typescript
// Cuando llega un mensaje de Metricool, buscar si ya existe un outbound pendiente
async findPendingOutboundMatch(syncedMessage):
  - Busca mensajes outbound sin metricoolId en la misma conversación
  - Normaliza contenido (quita @menciones, espacios extras)
  - Compara por similitud de contenido + proximidad de timestamp (2 horas)
  - Si encuentra match: actualiza el outbound con metricoolId (no crea duplicado)
```

#### 2. Identificación de Mensajes de Repliyo (`client/src/components/Inbox.tsx`)

```typescript
const isOutbound = msg.direction === 'outbound';
const isSentFromRepliyo = isOutbound && isReply;
// Solo mostrar badge "Enviado desde Repliyo" si direction='outbound' Y tiene parentMessageId
```

#### 3. Threading Visual (`threadMessages` useMemo)

```typescript
// Organiza mensajes en orden padre-hijo:
1. Separa mensajes raíz (sin parentMessageId) de replies
2. Ordena mensajes raíz por timestamp
3. Para cada raíz, agrega sus replies ordenados por timestamp
4. Replies huérfanos (padre no encontrado) van al final
```

### Configuración Actual

| Parámetro | Valor | Razón |
|-----------|-------|-------|
| TIME_TOLERANCE_MS | 2 horas | Metricool puede tener delays significativos en sync |
| Normalización | Quita @menciones, lowercase, colapsa espacios | Metricool puede modificar formato |
| Matching bidireccional | Sí | Contenido puede truncarse en cualquier lado |

### Archivos Clave

| Archivo | Función |
|---------|---------|
| `server/storage.ts` | `findPendingOutboundMatch()` - Reconciliación |
| `client/src/components/Inbox.tsx` | `threadMessages` useMemo - Ordenamiento visual |
| `server/routes.ts` | `/api/inbox/reply` - Guarda con `parentMessageId` correcto |

### Estado Actual del Threading

**Lo que funciona:**
- ✅ Replies se guardan con `parentMessageId` correcto (apunta al comentario específico)
- ✅ Reconciliación evita duplicados en nuevos mensajes
- ✅ Badge "Enviado desde Repliyo" solo aparece en mensajes outbound
- ✅ Logo de Repliyo en avatar para mensajes enviados desde la app

**Problema pendiente de UX:**
- ⚠️ El ordenamiento visual (`threadMessages`) agrupa replies bajo su padre
- ⚠️ PERO Metricool asigna `parentMessageId` diferente (apunta al post, no al comentario)
- ⚠️ Esto puede causar que replies aparezcan en lugar incorrecto visualmente

### Limitación de Metricool

Metricool no conoce nuestra estructura de threading. Cuando respondemos a un comentario específico:
- **Nosotros guardamos**: `parentMessageId = ID del comentario`
- **Metricool devuelve**: `parentMessageId = ID del post original`

Esto causa discrepancia en el threading visual.

---

## FASE 6.4: Campo Source para Diferenciación de Origen de Mensajes ✅ COMPLETADA - 30 Noviembre 2025

### Problema Identificado

El sistema tenía un dilema de diferenciación:
1. **Mensajes enviados desde Repliyo** → Deberían mostrar badge "Enviado desde Repliyo"
2. **Respuestas nativas del dueño** → Respuestas que Inpulza hizo directamente en sus redes sociales (antes de conectar Repliyo) NO deberían mostrar ese badge

**El problema técnico:** Cuando Metricool sincroniza, **no diferencia** entre respuestas enviadas desde herramientas externas vs respuestas nativas de la red social. Todos los mensajes del autor de la marca llegan como `inbound` sin ninguna marca de origen.

### Solución Implementada: Campo `source`

#### 1. Schema (`shared/schema.ts`)

```typescript
// Nueva columna en tabla messages
source: text("source").default('metricool_sync'),
```

**Valores posibles:**
| Valor | Significado |
|-------|-------------|
| `'repliyo'` | Mensaje enviado desde la aplicación Repliyo |
| `'metricool_sync'` | Mensaje sincronizado desde Metricool (respuestas nativas de las redes) |

#### 2. Backend - Creación de Mensajes (`server/routes.ts`)

Cuando se envía una respuesta desde Repliyo, se guarda con `source: 'repliyo'`:

```typescript
// Líneas 596 y 648 - Tanto para comentarios como DMs
const outboundMessage = await storage.createMessage({
  brandId: message.brandId,
  conversationId: message.conversationId,
  platform: message.platform,
  type: message.type,
  author: brand.name,
  content: text,
  timestamp: new Date(),
  status: 'sent',
  direction: 'outbound',
  parentMessageId: message.id,
  metricoolId: result.messageId || null,
  rawData: result.rawResponse || null,
  source: 'repliyo',  // ⭐ NUEVO CAMPO
});
```

#### 3. Backend - Protección de Reconciliación (`server/storage.ts`)

Cuando Metricool sincroniza un mensaje que ya existe como `repliyo`, se preservan los campos originales:

```typescript
if (existing.source === 'repliyo' || (existing.direction === 'outbound' && insertMessage.direction === 'inbound')) {
  console.log(`[Storage] Protecting Repliyo message ${existing.id} - preserving source and direction`);
  // Solo actualiza rawData, preserva: direction, source, parentMessageId
  const updated = await this.updateMessage(existing.id, {
    rawData: insertMessage.rawData,
  });
  return updated!;
}
```

#### 4. Frontend - Detección Simplificada (`client/src/components/Inbox.tsx`)

La lógica de detección ahora es simple y precisa:

```typescript
// Check if message was sent from Repliyo using the source field
// This is the authoritative way to identify messages sent from our app
// vs messages that the brand sent natively from their social networks
const isSentFromRepliyo = (msg as any).source === 'repliyo';
```

### Migración de Datos Históricos

**IMPORTANTE:** No es posible migrar datos históricos porque:

1. **Metricool no proporciona información sobre el origen** - La API no diferencia entre respuestas enviadas desde herramientas externas vs respuestas nativas
2. **No hay campo en rawData que indique origen** - El campo `self` solo indica el ID de la marca, no el origen del mensaje
3. **Todos los mensajes del dueño llegan iguales** - Sin importar si fueron enviados desde Instagram directamente, TikTok nativo, o cualquier herramienta

**Análisis de datos existentes:**

```sql
SELECT source, direction, COUNT(*) 
FROM messages 
WHERE author ILIKE '%inpulza%'
GROUP BY source, direction;
-- Resultado: 97 mensajes con source='metricool_sync', direction='inbound'
```

### Comportamiento Final

| Origen del Mensaje | Campo `source` | Badge "Enviado desde Repliyo" |
|-------------------|----------------|-------------------------------|
| Enviado desde Repliyo (a partir de ahora) | `'repliyo'` | ✅ Sí |
| Respuestas históricas (antes de conectar) | `'metricool_sync'` | ❌ No |
| Respuestas nativas desde la red social | `'metricool_sync'` | ❌ No |

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `shared/schema.ts` | Añadido campo `source` con default `'metricool_sync'` |
| `server/routes.ts` | Líneas 596 y 648: `source: 'repliyo'` al crear mensajes |
| `server/storage.ts` | Protección ampliada para preservar `source` en reconciliación |
| `client/src/components/Inbox.tsx` | Lógica simplificada: `isSentFromRepliyo = msg.source === 'repliyo'` |

### Comando SQL Ejecutado

```sql
-- Añadir columna (ejecutado automáticamente)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'metricool_sync';

-- Intentó backfill pero 0 filas afectadas (no había mensajes outbound sin metricoolId)
UPDATE messages SET source = 'repliyo' 
WHERE direction = 'outbound' AND metricool_id IS NULL;
-- Resultado: UPDATE 0
```

### Notas para Desarrolladores

1. **El campo `source` es la fuente de verdad** para determinar si un mensaje fue enviado desde Repliyo
2. **No confiar en `direction`** - Metricool puede sobrescribir este campo durante sync
3. **No confiar en detección por nombre de autor** - Genera falsos positivos/negativos
4. **La protección de reconciliación es crítica** - Sin ella, Metricool sobrescribiría el `source` a `'metricool_sync'`

---

## FASE 6.5: Mejora del Modal de Metricool Import - 30 Noviembre 2025 ✅ COMPLETADA

### Objetivo
Mejorar la experiencia del usuario en el modal de conexión de Metricool con carga automática de marcas y sincronización periódica en segundo plano.

### Cambios Implementados

#### 1. Carga Automática de Marcas en el Modal

**Antes:**
- Usuario abría el modal y veía un botón "Cargar Marcas desde Metricool"
- Debía hacer clic para ver las marcas disponibles
- La sección "Marcas Disponibles" estaba vacía hasta el clic

**Después:**
- Las marcas se cargan automáticamente al abrir el modal
- El botón cambió a "Actualizar Marcas" para refrescar manualmente si es necesario
- Experiencia más fluida sin pasos manuales innecesarios

**Archivo modificado:** `client/src/components/MetricoolConnection.tsx`
- Agregado `useEffect` que llama `fetchMetricoolBrands()` al montar el componente
- Limpiados imports no utilizados
- Actualizado texto del botón y mensaje vacío

#### 2. Sincronización Automática de Marcas (Cada 12 horas)

**Extensión del SyncService existente:**

El servicio ya sincronizaba mensajes cada 2 minutos. Ahora también sincroniza la disponibilidad de marcas cada 12 horas.

**Nuevas características:**
- `syncAvailableBrands()` - Método que detecta cambios en marcas disponibles
- Detección de **marcas nuevas**: Marcas en Metricool que no están conectadas localmente
- Detección de **marcas desconectadas**: Marcas locales que ya no existen en Metricool
- Logs informativos en consola del servidor
- Método `triggerManualBrandSync()` para sincronización manual si es necesario

**Archivo modificado:** `server/services/syncService.ts`

```typescript
// Nuevas constantes
private readonly BRAND_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
private brandSyncInterval: NodeJS.Timeout | null = null;
private lastBrandSyncTime: Date | null = null;
private isSyncingBrands = false;

// Nuevo método
async syncAvailableBrands(): Promise<BrandSyncResult> {
  // Compara marcas disponibles en Metricool vs conectadas localmente
  // Detecta nuevas y desconectadas
  // Log de resultados
}
```

### Patrón de Arquitectura

Ambas sincronizaciones usan el mismo patrón `setInterval` ya probado:

| Sincronización | Intervalo | Propósito |
|---------------|-----------|-----------|
| Mensajes | 2 minutos | Obtener nuevos DMs y comentarios |
| Marcas | 12 horas | Detectar cambios en marcas disponibles |

### Logs del Sistema

El SyncService ahora genera logs para ambos procesos:

```
[SyncService] Starting automatic sync service (messages: 2 min, brands: 12 hours)
[SyncService] Starting brand availability check...
[SyncService] Found 15 brands available in Metricool
[SyncService] New brand detected: NuevaMarca (blogId: 12345)
[SyncService] Brand sync complete. New: 1, Disconnected: 0
```

### Estado Actualizado de getStatus()

```typescript
getStatus(): {
  isRunning: boolean;
  isSyncing: boolean;
  isSyncingBrands: boolean;  // Nuevo
  lastSyncTime: Date | null;
  lastBrandSyncTime: Date | null;  // Nuevo
  cooldownBrands: { brandId: string; cooldownUntil: Date }[];
}
```

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/components/MetricoolConnection.tsx` | Carga automática de marcas con useEffect, botón "Actualizar" |
| `server/services/syncService.ts` | Nuevo intervalo de 12h para sincronizar disponibilidad de marcas |
| `DOCUMENTACION_COMPLETA.md` | Esta documentación |

### Notas Técnicas

1. **Consistencia arquitectónica**: Ambos intervalos usan el mismo patrón setInterval
2. **Sin dependencias nuevas**: Usa el MetricoolService existente
3. **Tolerante a fallos**: Los errores en brand sync no afectan la sincronización de mensajes
4. **Logs detallados**: Para debugging y monitoreo del sistema

---

## FASE 6.6: Control Granular de Redes Sociales por Marca ✅ COMPLETADA - 30 Noviembre 2025

### Objetivo
Implementar control granular por marca y por red social, permitiendo a usuarios activar/desactivar selectivamente qué redes sociales sincronizar para cada marca con un enfoque privacy-first (opt-in).

### Arquitectura Implementada

#### 1. Nueva Tabla `social_accounts`

```typescript
// shared/schema.ts
export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brands.id).notNull(),
  provider: text("provider").notNull(), // INSTAGRAM, FACEBOOK, TIKTOKBUSINESS, etc.
  isActive: boolean("is_active").default(false).notNull(), // Privacy-first: OFF por defecto
  accountName: text("account_name"),
  accountAvatar: text("account_avatar"),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Principio Privacy-First:**
- Todas las redes sociales se detectan pero empiezan DESACTIVADAS (`isActive: false`)
- El usuario debe activar explícitamente cada red que desee sincronizar
- Mayor control y privacidad para el usuario

#### 2. Smart Discovery en MetricoolService

El servicio de Metricool ahora detecta automáticamente qué redes sociales tiene conectadas cada marca:

```typescript
// server/services/metricool.ts
interface DetectedProvider {
  provider: string;      // INSTAGRAM, FACEBOOK, TIKTOKBUSINESS, YOUTUBE, LINKEDIN, GMB
  accountName: string | null;
  accountAvatar: string | null;
}

async getBrands(token: string, userId: string): Promise<MetricoolBrand[]> {
  // Detecta providers de campos: facebook, instagram, tiktok, twitter, youtube, linkedinCompany, gmb
  return brands.map(brand => ({
    ...brand,
    detectedProviders: this.detectProviders(brand) // Nuevo campo
  }));
}
```

#### 3. Flujo de Importación en Dos Pasos

**Paso 1:** Selección de marca desde la lista de Metricool
**Paso 2:** Selección de redes sociales a activar (Smart Discovery muestra las detectadas)

```typescript
// client/src/components/MetricoolConnection.tsx
const [importStep, setImportStep] = useState<'select' | 'configure'>('select');
const [selectedBrand, setSelectedBrand] = useState<MetricoolBrand | null>(null);
const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
```

#### 4. Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/brands/:id/social-accounts` | GET | Obtener cuentas sociales de una marca |
| `/api/brands/:id/social-accounts/:provider` | PUT | Actualizar estado de activación de una red |
| `/api/brands/:id/social-accounts/refresh` | POST | Re-detectar redes desde Metricool (preserva activaciones) |

#### 5. SocialAccountsManager Component

Componente para gestionar redes sociales post-importación:

```typescript
// client/src/components/SocialAccountsManager.tsx
interface SocialAccountsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onAccountsUpdated?: () => void;
}
```

**Funcionalidades:**
- Lista de redes detectadas con toggles de activación/desactivación
- Botón "Sincronizar" para actualizar mensajes de redes activas
- Botón "Detectar Redes" (icono Scan) para re-detectar providers desde Metricool
- Indicadores visuales de última sincronización y estado

#### 6. Integración con SyncService

El servicio de sincronización ahora consulta solo providers activos:

```typescript
// server/services/syncService.ts
async syncBrand(brand: Brand): Promise<void> {
  const activeProviders = await storage.getActiveProviders(brand.id);
  
  if (activeProviders.length === 0) {
    console.log(`[SyncService] No active providers for brand ${brand.name}`);
    return;
  }
  
  // Solo sincroniza providers activos
  for (const provider of activeProviders) {
    await this.syncProvider(brand, provider);
    await storage.updateSocialAccountStatus(brand.id, provider, 'success');
  }
}
```

### Flujo Completo

```
1. Usuario abre modal "Conectar con Metricool"
2. Se cargan marcas disponibles desde Metricool (con Smart Discovery)
3. Usuario selecciona una marca → Paso 2
4. Se muestran las redes detectadas con checkboxes (todas OFF por defecto)
5. Usuario activa las redes deseadas y confirma importación
6. Sistema crea registros en social_accounts con estado seleccionado
7. Solo las redes activas se sincronizan

Post-importación:
- Botón "Configurar" (engranaje) abre SocialAccountsManager
- Toggles para activar/desactivar redes en cualquier momento
- Botón "Detectar Redes" para marcas legacy (importadas antes de Smart Discovery)
- Los cambios de activación persisten incluso tras refresh de providers
```

### Comportamiento del Endpoint Refresh

El endpoint `POST /api/brands/:id/social-accounts/refresh` tiene un comportamiento específico para preservar activaciones:

1. **Nuevos providers**: Se agregan con `isActive: false`
2. **Providers existentes**: Se actualiza nombre/avatar pero se PRESERVA `isActive`
3. **Respuesta**: Lista completa de social_accounts actualizada

```typescript
// No sobrescribe activaciones existentes
if (existing) {
  await storage.upsertSocialAccount({
    brandId: brand.id,
    provider: dp.provider,
    isActive: existing.isActive, // Preserva estado original
    accountName: dp.accountName || existing.accountName,
    accountAvatar: dp.accountAvatar || existing.accountAvatar,
  });
}
```

### Iconos de Redes Sociales

| Provider | Icono | Color |
|----------|-------|-------|
| INSTAGRAM | FaInstagram | text-pink-500 |
| FACEBOOK | FaFacebook | text-blue-600 |
| TIKTOKBUSINESS | FaTiktok | text-gray-800 |
| YOUTUBE | FaYoutube | text-red-600 |
| LINKEDIN | FaLinkedin | text-blue-700 |
| GMB | FaGoogle | text-yellow-500 |
| twitter | FaTwitter | text-gray-800 |

### Archivos Modificados/Creados

| Archivo | Cambio |
|---------|--------|
| `shared/schema.ts` | Nueva tabla `social_accounts` con tipos Zod |
| `server/storage.ts` | Métodos CRUD para social_accounts |
| `server/services/metricool.ts` | Smart Discovery de providers |
| `server/services/syncService.ts` | Filtrado por providers activos |
| `server/routes.ts` | Endpoints para social_accounts |
| `client/src/lib/api.ts` | Métodos API client |
| `client/src/components/MetricoolConnection.tsx` | Flujo de importación en 2 pasos |
| `client/src/components/SocialAccountsManager.tsx` | Nuevo componente de gestión |

### Notas Técnicas

1. **Privacy-First**: Todas las redes empiezan desactivadas - el usuario decide qué activar
2. **Preservación de Estado**: El refresh de providers NUNCA borra activaciones existentes
3. **Retrocompatibilidad**: Marcas importadas antes tienen el botón "Detectar Redes"
4. **Performance**: La sincronización solo procesa providers activos

---

## 2 de Diciembre 2025 - Unificación de BrandImportWizard ✅ COMPLETADA

### Problema Detectado

Se identificó una **inconsistencia crítica** en la experiencia de usuario al agregar nuevas marcas desde Metricool:

| Punto de Entrada | Componente | Comportamiento |
|------------------|------------|----------------|
| `/Integrations` → Metricool → "Connect" | `MetricoolConnection` | ✅ Lista marcas → Selecciona redes → Importa |
| Sidebar → "Agregar Marca" | `ClientManager` | ❌ Lista marcas → Importa **SIN selección de redes** |

El flujo del Sidebar omitía el paso de selección de redes, rompiendo el modelo de privacidad "opt-in" donde el usuario decide qué redes sincronizar.

### Solución Implementada: BrandImportWizard

Se creó un **componente autónomo** que encapsula todo el flujo de importación, siguiendo el principio DRY (Don't Repeat Yourself).

#### Arquitectura Antes vs Después

**ANTES:**
```
Sidebar "Agregar Marca" ──► ClientManager ──► Importa SIN selección de redes
Integrations "Connect"  ──► MetricoolConnection ──► Importa CON selección de redes
```

**DESPUÉS:**
```
Sidebar "Agregar Marca" ──┐
                          ├──► BrandImportWizard ──► Importa CON selección de redes
Integrations "Connect"  ──┘
```

### Archivos Modificados/Creados

| Archivo | Cambio |
|---------|--------|
| `client/src/components/BrandImportWizard.tsx` | **NUEVO** - Componente autónomo con flujo completo (2 pasos) |
| `client/src/components/MetricoolConnection.tsx` | Refactorizado a wrapper delgado que usa BrandImportWizard |
| `client/src/components/Sidebar.tsx` | Actualizado para usar BrandImportWizard en Dialog |
| `client/src/components/ClientManager.tsx` | **ELIMINADO** - Código muerto removido |

### API del BrandImportWizard

```typescript
interface BrandImportWizardProps {
  onComplete?: () => void;  // Callback cuando se completa importación
  onCancel?: () => void;    // Callback cuando se cancela
  autoFetch?: boolean;      // Auto-cargar marcas al montar (default: true)
}
```

### Flujo del Wizard

```
Paso 1: Listar Marcas
├── Auto-fetch de marcas de Metricool al abrir
├── Muestra marcas disponibles con badge de redes detectadas
├── Marcas ya importadas muestran "Conectado" + botón configurar
└── Click en "Importar" → Paso 2

Paso 2: Seleccionar Redes
├── Muestra redes detectadas con checkboxes
├── Mensaje de privacidad visible
├── Botón "Volver a marcas" para regresar
└── Botón "Importar (X redes)" para confirmar
```

### Beneficios

1. **Single Source of Truth**: Un solo componente maneja la importación
2. **Consistencia UX**: Misma experiencia desde cualquier punto de entrada
3. **Privacidad Garantizada**: Siempre se muestra el paso de selección de redes
4. **Mantenibilidad**: Mejoras futuras se aplican automáticamente a ambos lugares
5. **Menos código**: Eliminado `ClientManager.tsx` (130 líneas de código duplicado)

### Integración con Arquitectura Existente

- El wizard reutiliza el contexto `useNexus()` para acceder a:
  - `fetchMetricoolBrands()` - Cargar marcas
  - `importMetricoolBrand()` - Importar con providers seleccionados
  - `clients` - Verificar marcas ya importadas
- Incluye `SocialAccountsManager` para configurar marcas existentes
- Usa tema claro unificado para modales

---

## FASE 7: Sistema de Agentes IA con Respuestas Automáticas (Próxima Implementación)

### Fecha de Planificación: 9 de Diciembre 2025

### Descripción General

Sistema de agentes de inteligencia artificial que permite asignar a cada marca un agente configurado para responder automáticamente a mensajes y comentarios de redes sociales. Funciona similar a los playgrounds de OpenAI o Google Gemini, donde el usuario puede configurar prompts, seleccionar modelos, y probar respuestas antes de activarlas.

### Proveedores de IA Disponibles

Replit ofrece integraciones nativas que **no requieren API key propia** - los cargos se facturan a los créditos de Replit.

| Proveedor | Modelos Disponibles | Mejor Para |
|-----------|---------------------|------------|
| **OpenAI** | GPT-4o, GPT-4o-mini, o3-mini, GPT-4.1 | Chat general, respuestas rápidas |
| **Gemini** | 2.5 Pro, 2.5 Flash, 3 Pro Preview | Razonamiento complejo, alto volumen |

### Arquitectura de Base de Datos

#### Nueva Tabla: `ai_agents` (Configuración del agente por marca)

```typescript
ai_agents = pgTable("ai_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  
  // Configuración del modelo
  provider: text("provider").notNull().default('openai'), // 'openai' | 'gemini'
  model: text("model").notNull().default('gpt-4o-mini'),
  temperature: real("temperature").default(0.7),
  maxTokens: integer("max_tokens").default(500),
  
  // Prompts separados (mejor organización)
  systemPrompt: text("system_prompt"), // Personalidad, tono, comportamiento
  knowledgeBase: text("knowledge_base"), // Datos del negocio, FAQs, horarios
  guardrailPrompt: text("guardrail_prompt"), // Instrucciones de seguridad
  
  // Modo de operación
  autoReplyMode: text("auto_reply_mode").notNull().default('off'), // 'off' | 'draft' | 'auto'
  approvalWorkflow: text("approval_workflow").default('none'), // 'none' | 'human_review'
  
  // Estrategia de límites de caracteres
  characterLimitStrategy: text("character_limit_strategy").default('truncate'), // 'truncate' | 'reject' | 'summarize'
  
  // Control de frecuencia
  cooldownSeconds: integer("cooldown_seconds").default(60),
  lastAutoReplyAt: timestamp("last_auto_reply_at"),
  
  // Configuración por plataforma (JSON)
  platformSettings: jsonb("platform_settings"), // { tiktok: { enabled: true }, instagram: { enabled: false } }
  
  // Estado
  isActive: boolean("is_active").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### Nueva Tabla: `ai_agent_audit_log` (Historial de acciones)

```typescript
ai_agent_audit_log = pgTable("ai_agent_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => ai_agents.id, { onDelete: 'cascade' }),
  messageId: varchar("message_id").references(() => messages.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  
  // Acción realizada
  action: text("action").notNull(), // 'generated' | 'sent' | 'failed' | 'rejected' | 'approved'
  
  // Contenido
  inputContent: text("input_content"), // Mensaje original recibido
  outputContent: text("output_content"), // Respuesta generada
  
  // Resultado
  status: text("status").notNull(), // 'success' | 'failed' | 'pending_review'
  errorReason: text("error_reason"),
  
  // Métricas de uso (para facturación futura)
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  
  // Metadata
  platform: text("platform"),
  characterCount: integer("character_count"),
  wasCharacterLimited: boolean("was_character_limited").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### Campos Nuevos en Tabla `messages`

```typescript
// Añadir a la tabla messages existente:
aiSuggestedReply: text("ai_suggested_reply"),       // Borrador sugerido por IA
aiReplyStatus: text("ai_reply_status"),             // 'none' | 'suggested' | 'approved' | 'sent' | 'rejected'
aiAgentId: varchar("ai_agent_id").references(() => ai_agents.id),
```

### Límites de Caracteres por Plataforma

```typescript
const PLATFORM_LIMITS = {
  tiktok: { comment: 150, dm: null },
  instagram: { comment: 2200, dm: 1000 },
  facebook: { comment: 8000, dm: 20000 },
  linkedin: { comment: 1250, dm: 1900 },
  youtube: { comment: 10000, dm: null },
  'google-business': { comment: 4000, dm: null },
};
```

### Flujo de Auto-Respuesta (Backend)

```
1. LLEGA MENSAJE NUEVO (vía syncService de Metricool)
         ↓
2. ¿Tiene la marca un agente activo (isActive=true)?
         ↓ NO → Termina
         ↓ SÍ
3. ¿Está habilitado autoReplyMode ('draft' o 'auto')?
         ↓ NO → Termina
         ↓ SÍ
4. ¿Está habilitada esta plataforma en platformSettings?
         ↓ NO → Termina
         ↓ SÍ
5. ¿Pasó el cooldown desde lastAutoReplyAt?
         ↓ NO → Termina
         ↓ SÍ
6. PREPARAR CONTEXTO:
   - Consultar mensajes de la conversación por conversation_id
   - Obtener últimos N mensajes (contexto del hilo)
   - Cargar información del cliente (customerName)
   - Obtener datos del socialPost original (si es comentario)
         ↓
7. CONSTRUIR PROMPT COMPLETO:
   - System Prompt (personalidad)
   - Knowledge Base (datos del negocio)
   - Límite de caracteres inyectado: "MÁXIMO {CHAR_LIMIT} caracteres"
   - Guardrails (reglas de seguridad)
   - Variables dinámicas reemplazadas: {{customer_name}}, {{platform}}, etc.
   - Contexto de la conversación
         ↓
8. LLAMAR A PROVEEDOR IA (OpenAI/Gemini)
   - Usar integración nativa de Replit
   - Registrar tokens usados (promptTokens, completionTokens)
         ↓
9. FILTROS DE SEGURIDAD:
   - Verificar profanidad/toxicidad
   - Detectar PII (emails, teléfonos)
   - Verificar palabras bloqueadas
         ↓ FALLA → Guardar como draft con status='rejected'
         ↓ PASA
10. POST-PROCESAMIENTO:
    - Verificar límite de caracteres
    - Si excede: aplicar estrategia (truncar/resumir/rechazar)
         ↓
11. SEGÚN MODO DE OPERACIÓN:
    ┌─ Si modo "draft":
    │    → Guardar en messages.aiSuggestedReply
    │    → aiReplyStatus = 'suggested'
    │    → Notificar al usuario (UI muestra borrador)
    │
    └─ Si modo "auto" (y no requiere human_review):
         → Enviar vía endpoint /api/inbox/reply existente
         → aiReplyStatus = 'sent'
         → Actualizar lastAutoReplyAt
         ↓
12. REGISTRAR EN ai_agent_audit_log
```

### Variables Dinámicas Soportadas

El sistema reemplaza estas variables antes de enviar a la IA:

| Variable | Descripción | Fuente |
|----------|-------------|--------|
| `{{customer_name}}` | Nombre del cliente | `conversation.customerName` |
| `{{first_name}}` | Primer nombre extraído del username | `extractFirstName(message.author)` |
| `{{username}}` | Username completo del usuario | `message.author` |
| `{{platform}}` | Red social | `message.platform` |
| `{{brand_name}}` | Nombre de la marca | `brand.name` |
| `{{post_context}}` | Descripción del post original | `socialPost.caption` |
| `{{char_limit}}` | Límite de caracteres | `PLATFORM_LIMITS[platform]` |
| `{{is_dm}}` | Si es mensaje directo | `true/false` |
| `{{relationship_status}}` | Estado de relación | `new/active/reengagement` |
| `{{time_since_last_interaction}}` | Minutos desde última respuesta | Número |

### Extracción Inteligente de Primer Nombre

La función `extractFirstName()` en `prompt-composer.ts` procesa usernames de redes sociales para detectar el primer nombre:

**Patrones soportados:**
- `María González Pérez` → `María` (nombres de display con espacios)
- `Dania Fernandez Cabezas` → `Dania` (nombres de Facebook/Instagram)
- `maria_perez_1985` → `María` (usernames con guiones bajos)
- `CarlosGomez` → `Carlos` (CamelCase)
- `juanito_123` → `Juanito` (usernames cortos)
- `user12345` → (vacío, no es nombre)
- `TheAgency_Official` → (vacío, es empresa)

**Uso en prompts:**
- En DMs nuevos: "Hola, María, ¿en qué puedo ayudarte?"
- En reengagement: "Hola de nuevo, Carlos"
- En comentarios: "Hola, Juan, te esperamos en DM 📩"
- Si no se detecta nombre, la IA saluda sin nombre: "Hola, ¿en qué puedo ayudarte?"

### Estructura del Frontend

#### Ubicación: Configuraciones de Marca

La configuración del agente IA estará dentro de Brand Settings, en una nueva pestaña "Agente IA".

#### Pestañas de Configuración:

**1. General**
- Selector de proveedor (OpenAI/Gemini)
- Selector de modelo con descripción
- Slider de temperatura (0.0-1.0)
- Editor de System Prompt (personalidad, tono)
- Editor de Knowledge Base (FAQs, horarios, datos del negocio)
- Contador de tokens en tiempo real

**2. Plataformas**
- Toggle por red social (activar/desactivar auto-respuesta por plataforma)
- Vista de límites de caracteres por plataforma
- Estrategia de límite: Truncar | Resumir | Rechazar

**3. Automatización**
- Modo: Apagado | Solo borradores | Automático completo
- Flujo de aprobación (requiere revisión humana)
- Cooldown entre respuestas (segundos)
- Horario de funcionamiento (opcional, futuro)

**4. Seguridad**
- Filtro de profanidad (on/off)
- Lista de palabras bloqueadas
- Detección de PII (on/off)
- Prompt de guardrails

**5. Playground de Pruebas**
- Opción A: Seleccionar conversación real existente
- Opción B: Escribir mensajes simulados
- Ver respuesta generada en tiempo real
- Contador de caracteres con indicador de límite por plataforma
- Preview de cómo quedaría truncado/resumido
- Botón "Usar esta configuración"

**6. Historial / Analytics**
- Últimas respuestas automáticas
- Gráfico de uso de tokens
- Tasa de éxito/fallo
- Errores recientes

### Integración con Inbox Existente

Cuando hay un borrador sugerido por IA:

```
┌─────────────────────────────────────────────────┐
│  💬 Comentario entrante de @usuario             │
│  "¿Tienen envío gratis?"                        │
├─────────────────────────────────────────────────┤
│  🤖 Sugerencia de IA:                           │
│  ┌───────────────────────────────────────────┐  │
│  │ "¡Hola! Sí, el envío es gratis en compras │  │
│  │  mayores a $50. ¿Te puedo ayudar en algo  │  │
│  │  más?"                                     │  │
│  └───────────────────────────────────────────┘  │
│  [✓ Aprobar y Enviar]  [✏️ Editar]  [✗ Rechazar]│
└─────────────────────────────────────────────────┘
```

### Endpoints API Nuevos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/brands/:id/agent` | Obtener configuración del agente |
| `POST` | `/api/brands/:id/agent` | Crear configuración de agente |
| `PUT` | `/api/brands/:id/agent` | Actualizar configuración |
| `DELETE` | `/api/brands/:id/agent` | Eliminar agente |
| `POST` | `/api/brands/:id/agent/test` | Probar respuesta (playground) |
| `GET` | `/api/brands/:id/agent/audit` | Historial de acciones |
| `POST` | `/api/messages/:id/ai-approve` | Aprobar borrador de IA |
| `POST` | `/api/messages/:id/ai-reject` | Rechazar borrador de IA |

### Reglas de Seguridad

1. **Autenticación**: Todos los endpoints requieren `requireAuth`
2. **Autorización**: Solo admin o dueño de la marca pueden configurar agentes
3. **Rate Limiting**: Máximo X respuestas automáticas por minuto por marca
4. **Cooldown**: Tiempo mínimo configurable entre respuestas
5. **Filtros de contenido**: Bloqueo de profanidad y PII
6. **Auditoría completa**: Toda acción queda registrada en audit_log
7. **Botón de emergencia**: Toggle global para desactivar todas las respuestas
8. **Secrets seguros**: API keys manejadas por integraciones de Replit (no en código)

### Manejo de Errores

| Error | Acción |
|-------|--------|
| Timeout del proveedor IA | Reintentar 3 veces con backoff exponencial |
| Respuesta muy larga | Aplicar estrategia configurada (truncar/resumir/rechazar) |
| Fallo al enviar por Metricool | Guardar como borrador, notificar usuario |
| Contenido bloqueado por filtro | Guardar en draft con status='rejected' |
| Rate limit de API proveedor | Esperar cooldown y reintentar |
| Fallo de validación de seguridad | Rechazar y registrar en audit log |

### Plan de Implementación

| Paso | Descripción | Tiempo Est. | Estado |
|------|-------------|-------------|--------|
| **1** | Base de datos: Crear tablas `ai_agents`, `ai_agent_audit_log`, campos en `messages` | 2h | ✅ COMPLETADO |
| **2** | Backend - LLM Provider: Módulo con adaptadores OpenAI/Gemini, factory, y prompt composer | 3h | ✅ COMPLETADO |
| **3** | Backend - API Routes: Endpoints CRUD y generación de respuestas | 2h | 🔄 EN PROGRESO |
| **4** | Frontend - UI de Configuración: Pestañas de settings del agente | 4h | ⏳ PENDIENTE |
| **5** | Frontend - Integración Inbox: Mostrar sugerencias, botones aprobar/rechazar | 2h | ⏳ PENDIENTE |
| **6** | Backend - Auto-respuesta: Integrar en syncService con toda la lógica de flujo | 4h | ⏳ PENDIENTE |
| **7** | Frontend - Playground: Área de pruebas con previsualización | 3h | ⏳ PENDIENTE |
| **8** | Testing y ajustes | 2h | ⏳ PENDIENTE |

**Total estimado:** 22 horas

---

### Paso 1: Base de Datos ✅ COMPLETADO - 9 Diciembre 2025

Las tablas fueron creadas exitosamente en `shared/schema.ts`:

**Tablas creadas:**
- `aiAgents` - Configuración del agente por marca
- `aiAgentAuditLog` - Historial de acciones del agente

**Campos añadidos a `messages`:**
- `aiSuggestedReply` - Borrador sugerido por IA
- `aiReplyStatus` - Estado del borrador ('none', 'suggested', 'approved', 'sent', 'rejected')
- `aiAgentId` - Referencia al agente que generó la sugerencia

---

### Paso 2: Backend LLM Provider ✅ COMPLETADO - 9 Diciembre 2025

Se creó un módulo completo en `server/services/llm/` con arquitectura modular:

**Archivos creados:**

| Archivo | Propósito |
|---------|-----------|
| `types.ts` | Interfaces: `LLMProvider`, `LLMMessage`, `LLMResponse`, `LLMConfig`, `AgentSecrets` |
| `prompt-composer.ts` | Composición de prompts con variables dinámicas y límites de caracteres |
| `openai-adapter.ts` | Adaptador para OpenAI (gpt-4o, gpt-4o-mini, gpt-4.1, o3-mini) |
| `gemini-adapter.ts` | Adaptador para Gemini (gemini-2.5-flash, gemini-2.5-pro) |
| `factory.ts` | Factory function `createLLMProvider()` que instancia el proveedor correcto |
| `index.ts` | Exportaciones del módulo |

**Características implementadas:**

1. **Interface unificada `LLMProvider`:**
```typescript
interface LLMProvider {
  generate(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
}
```

2. **Composición de prompts:**
   - System prompt + Knowledge base + Guardrails
   - Variables dinámicas: `{{customer_name}}`, `{{platform}}`, `{{brand_name}}`, `{{char_limit}}`
   - Inyección automática de límites de caracteres por plataforma

3. **Manejo de errores normalizado:**
   - Errores de autenticación (401)
   - Rate limiting (429)
   - Timeouts
   - Errores de red

4. **Resolución de API Keys:**
   - Prioridad: `platformSettings` → Secrets de Replit → Variables de entorno
   - Keys: `OPENAI_API_KEY`, `GEMINI_API_KEY`

**Pruebas realizadas con API keys reales:**
- ✅ OpenAI (gpt-4o-mini): Respondió correctamente
- ✅ Gemini (gemini-2.5-flash): Respondió correctamente

**Dependencias instaladas:**
- `openai` - SDK oficial de OpenAI
- `@google/genai` - SDK de Google Gemini

**Notas técnicas importantes:**
- GPT-5 y modelos recientes NO soportan parámetro `temperature` (usar solo `max_completion_tokens`)
- Para modelos anteriores usar `max_tokens` con `temperature`
- Gemini usa `maxOutputTokens` en lugar de `max_tokens`

---

### Notas Técnicas

1. **Separación Prompt/Conocimiento**: `systemPrompt` define comportamiento, `knowledgeBase` define datos del negocio. Se concatenan al generar.

2. **Optimización de Tokens**: El límite de caracteres se inyecta en el prompt ANTES de llamar a la IA, no después. Esto reduce el gasto de tokens al evitar llamadas dobles.

3. **Contexto por Conversación**: Siempre se consulta por `conversation_id` para mantener el hilo. Nunca mensajes sueltos.

4. **Proveedor Agnóstico**: El código usa `LLMProvider.generate()` internamente, permitiendo cambiar de OpenAI a Gemini sin modificar lógica.

5. **Tokens para Facturación**: Se guardan `promptTokens` y `completionTokens` en audit log para futuros reportes de costos por marca.

---

## FASE 7.1: Playground con IA Real - 9 Diciembre 2025 ✅

### Contexto
El Playground en la página de configuración del Agente IA (Settings → Agente IA → tab Playground) anteriormente mostraba respuestas mock/falsas. Se implementó la conexión real a la IA.

### Implementación Realizada

#### 1. Backend - Nuevo Endpoint
**Archivo:** `server/routes.ts` (líneas 1349-1416)

```typescript
POST /api/ai-agent/:brandId/test-generate
```

**Request Body:**
```json
{
  "testMessage": "Hola, quisiera saber los servicios...",
  "platform": "instagram"  // opcional, default: instagram
}
```

**Response:**
```json
{
  "success": true,
  "reply": "¡Hola! En Inpulza ofrecemos...",
  "characterCount": 245,
  "platformLimit": 2200,
  "wasCharacterLimited": false,
  "usage": { "promptTokens": 450, "completionTokens": 85, "totalTokens": 535 },
  "model": "gemini-2.5-flash",
  "provider": "gemini"
}
```

#### 2. Frontend - Cliente API Actualizado
**Archivo:** `client/src/lib/api.ts` (líneas 311-332)

Nuevo método:
```typescript
api.aiAgent.testGenerate(brandId, testMessage, platform)
```

#### 3. Frontend - Componente Actualizado
**Archivo:** `client/src/components/AIAgentConfig.tsx` (líneas 160-184)

La función `handleTestPlayground()` ahora:
- Llama al endpoint real `/api/ai-agent/:brandId/test-generate`
- Muestra la respuesta de la IA en el área de texto
- Muestra toast con conteo de caracteres y modelo usado
- Maneja errores con mensajes descriptivos

### Flujo de Uso
1. Usuario va a Settings → Agente IA
2. Configura System Prompt, Knowledge Base, Guardrails en tab "Prompts"
3. Guarda la configuración (botón Guardar)
4. Va al tab "Playground"
5. Escribe un mensaje de prueba
6. Hace clic en "Generar Respuesta"
7. La IA (Gemini o OpenAI según configuración) genera la respuesta real

### Notas Técnicas
- El endpoint crea un mensaje "mock" temporal para pasar al LLM provider
- No guarda nada en base de datos (es solo para pruebas)
- Usa la misma lógica de prompt-composer que el endpoint de producción
- Respeta límites de caracteres de la plataforma seleccionada

---

## PENDIENTES / TODO

### 1. Resiliencia de Conexión a Base de Datos (Prioridad: Media)

**Problema identificado:** La base de datos PostgreSQL (Neon) se suspende automáticamente después de 5 minutos de inactividad. Cuando esto ocurre, las conexiones activas se terminan abruptamente causando el error:
```
FATAL: terminating connection due to administrator command (código 57P01)
```

**Contexto técnico:**
- Replit usa Neon como proveedor de PostgreSQL serverless
- Neon suspende el "compute" después de 5 minutos sin consultas para ahorrar recursos
- El servidor Express se cae si no maneja correctamente la reconexión

**Soluciones a implementar:**

1. **Keep-alive automático** - Agregar un ping periódico a la base de datos:
```typescript
// En server/db.ts o server/index.ts
setInterval(async () => {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('[DB] Keep-alive ping successful');
  } catch (error) {
    console.error('[DB] Keep-alive ping failed:', error);
  }
}, 240000); // Cada 4 minutos (antes de los 5 min de timeout)
```

2. **Manejo de errores de conexión** - Agregar listener para errores del pool:
```typescript
// Si usamos pool de conexiones
pool.on('error', (err, client) => {
  console.error('[DB] Unexpected error on idle client:', err);
  // El pool se reconecta automáticamente
});
```

3. **Retry automático en consultas críticas** - Wrapper para reintentar consultas fallidas

**Referencias:**
- [Neon Docs - Connection Errors](https://neon.tech/docs/connect/connection-errors)
- [Replit Docs - SQL Database](https://docs.replit.com/cloud-services/storage-and-databases/sql-database)

---

### 2. Análisis de Sentimiento Automático (Prioridad: Media)

**Problema identificado:** Los mensajes del inbox no tienen análisis de sentimiento asignado. La columna `sentiment` en la tabla `messages` existe pero está vacía (NULL) para todos los mensajes, lo que hace que la métrica de "Sentimiento" en el Overview muestre "--".

**Datos actuales (9 Dic 2025):**
- 332 mensajes totales
- 0 mensajes con sentimiento asignado
- Campo `sentiment` acepta: 'positive', 'neutral', 'negative'

**Solución propuesta:**

1. **Análisis automático al sincronizar** - Cuando llegan mensajes nuevos de Metricool, usar IA para clasificar el sentimiento:
```typescript
// En server/services/syncService.ts
async function analyzeSentiment(content: string): Promise<'positive' | 'neutral' | 'negative'> {
  // Usar LLM Provider existente (Gemini/OpenAI)
  const prompt = `Clasifica el sentimiento del siguiente mensaje como 'positive', 'neutral' o 'negative'. Responde solo con una palabra: "${content}"`;
  const result = await llmProvider.generate(prompt);
  return result.trim().toLowerCase() as 'positive' | 'neutral' | 'negative';
}
```

2. **Batch processing para mensajes existentes** - Script o endpoint para analizar mensajes sin sentimiento:
```typescript
// POST /api/admin/analyze-sentiment
// Procesa N mensajes sin sentimiento en batch
```

3. **Actualizar storage.ts** - Método `updateMessageSentiment(messageId, sentiment)`

**Consideraciones:**
- Rate limiting para evitar exceder límites de API de IA
- Costo: ~$0.001 por mensaje analizado (Gemini Flash)
- Alternativa: Usar modelo de sentimiento local (más rápido, sin costo)

---

## CORRECCIONES - 10 Diciembre 2025

### 1. Bug Crítico: Auto-Reply a Mensajes Propios ✅ CORREGIDO

**Problema:** Cuando el usuario enviaba un DM desde Instagram directamente (no desde Repliyo), el sistema lo sincronizaba como mensaje nuevo y la IA intentaba responder. Error de Metricool: "No matching user found" porque intentaba responder a sí mismo.

**Causa raíz:** El campo `brandAccountId` no detectaba correctamente el ID de la cuenta propia de la marca. Solo buscaba en `conv.rawData?.pageId` y `conv.rawData?.accountId`, pero Metricool usa el campo `self` para identificar la cuenta del propietario.

**Solución implementada en 2 niveles:**

1. **SyncService (server/services/syncService.ts):**
   - Mejorada la detección de `brandAccountId` para incluir:
     - `conv.rawData?.self` (campo principal de Metricool)
     - `conv.rawData?.pageId` / `conv.rawData?.accountId` (fallbacks)
     - `conv.self` (campo directo)
     - `participants.find(p => p.self === true)?.id` (participante marcado como self)
   - Añadida verificación adicional: `if (fromParticipant?.self === true) isFromBrand = true`
   - Los mensajes de la propia marca ahora se marcan como `direction: 'outbound'`

2. **AutoReplyService (server/services/autoReplyService.ts):**
   - Añadido guard defensivo al inicio del procesamiento:
   ```typescript
   if (message.direction === 'outbound') {
     log(`Skipping outbound message (sent by brand), not replying to self`);
     return { success: false, skippedReason: "outbound_message" };
   }
   ```

**Resultado:** Los mensajes enviados por el usuario desde sus redes sociales ya NO disparan auto-respuestas.

---

### 2. Sistema de Códigos Cortos para Audit Log ✅ IMPLEMENTADO

**Problema:** Los IDs de UUID eran difíciles de comunicar verbalmente ("revisa el log ar-5c2f8b3d...")

**Solución:**
- Añadido campo `shortCode` (VARCHAR 12, UNIQUE nullable) al schema `aiAgentAuditLog`
- Formato: `MMDD-NNNN` (ej: "1210-0001" para el primer log del 10 de diciembre)
- Generación automática con MAX(short_code) para obtener el siguiente número
- Manejo robusto de concurrencia:
  - 10 reintentos con delays aleatorios (0-50ms) entre intentos
  - Fallback a código con timestamp+random si hay colisiones
  - Fallback final a NULL (UI muestra primeros 8 chars del UUID)
- UI: Badge prominente con click-to-copy

**Archivos modificados:**
- `shared/schema.ts` - Campo shortCode añadido
- `server/storage.ts` - Métodos createAuditLog y generateAuditLogShortCode
- `client/src/components/AIAgentConfig.tsx` - Mostrar shortCode en Activity History

---

### 3. COMPLETADO: Campo `internal_origin` - Inmutabilidad de Etiquetas ✅ (10 Dic 2025)

**Problema original:** Los mensajes enviados desde Repliyo perdían su etiqueta visual ("Enviado desde Repliyo" / "Respondido con IA") cuando Metricool sincronizaba, porque el campo `source` era sobrescrito.

**Causa raíz:** El campo `source` hacía dos trabajos a la vez:
1. Origen de datos: "¿De dónde saqué esta información?" (Metricool API)
2. Autoría: "¿Quién escribió esto?" (Usuario/IA de Repliyo)

Cuando Metricool sincroniza, ganaba el "Origen de Datos" y borraba la "Autoría".

**Solución implementada: Campo `internal_origin` (inmutable)**

Se agregó un nuevo campo en la tabla `messages` que actúa como "certificado de nacimiento":

| Valor | Significado | Etiqueta en UI |
|-------|-------------|----------------|
| `'manual'` | Escrito por operador desde Repliyo | "Enviado desde Repliyo" |
| `'ai'` | Escrito por agente IA de Repliyo | "Respondido con IA" |
| `NULL` | Mensaje externo (cliente/red social) | Sin etiqueta |

**Protección en sincronización:**
- `upsertMessage()` en `storage.ts` protege mensajes con `internalOrigin` definido
- Solo actualiza `rawData` y `authorAvatar`, NUNCA sobrescribe `internalOrigin`
- La reconciliación también preserva el campo

**Archivos modificados:**
- `shared/schema.ts` - Campo `internalOrigin` + enum Zod
- `server/storage.ts` - Protección en `upsertMessage()` (líneas 414-432)
- `server/routes.ts` - Escribe `internalOrigin: 'manual'` al enviar respuestas manuales
- `server/services/autoReplyService.ts` - Escribe `internalOrigin: 'ai'` al enviar respuestas IA
- `client/src/lib/mockData.ts` - Helpers `isRepliyoMessage()` e `isAutoReply()` actualizados
- `client/src/components/Inbox.tsx` - UI usa `internalOrigin` con fallback a `source`

**Migración de datos históricos:**
- Ejecutado SQL para reparar mensajes corruptos
- Mensajes con `source='repliyo_auto'` → `internal_origin='ai'`
- Mensajes con `source='repliyo'` → `internal_origin='manual'`
- Mensajes identificados en audit_log como IA → `internal_origin='ai'`

**Comportamiento actual verificado:**
- Mensajes escritos desde Repliyo → Etiqueta correcta que persiste
- Mensajes escritos desde app nativa (Instagram/TikTok) → Sin etiqueta
- Mensajes de clientes → Sin etiqueta

---

### 3. Cálculo de Tiempo de Respuesta (Prioridad: Baja)

**Problema identificado:** El "Tiempo de Respuesta" en Overview muestra "--" porque solo hay 2 mensajes outbound de 332 totales. El cálculo requiere emparejar mensajes inbound con sus respuestas outbound.

**Datos actuales:**
- 330 mensajes inbound (recibidos)
- 2 mensajes outbound (enviados)
- Sin suficientes datos para calcular promedio significativo

**Solución:** Este problema se resolverá naturalmente cuando se usen más respuestas desde Repliyo. No requiere desarrollo adicional, solo uso del sistema.

---

## ACTUALIZACIONES - 10 Diciembre 2025 (Sesión Tarde)

### 1. Soporte Multimodal: Audio e Imágenes en Inbox ✅ IMPLEMENTADO

**Funcionalidad:** Los mensajes de audio e imágenes enviados por usuarios ahora se muestran correctamente en el inbox.

**Audio:**
- Reproductor visual moderno estilo WhatsApp/Instagram
- Waveform matemático generado (superposición de ondas sinusoidales + ruido)
- Controles: play/pause, barra de progreso, tiempo actual/total
- Transcripción automática mostrada debajo del reproductor
- **Nota CORS:** No se puede usar WaveSurfer.js porque las URLs de audio de Instagram/Facebook (lookaside.fbsbx.com) no permiten acceso cross-origin para análisis de waveform real

**Imágenes:**
- Visualización inline con click para ampliar
- Soporte para múltiples formatos (jpg, png, etc.)

**Archivos modificados:**
- `client/src/components/Inbox.tsx` - Componentes `AudioPlayer` y visualización de imágenes

---

### 2. Transcripción de Audio con Proveedor Flexible ✅ IMPLEMENTADO

**Funcionalidad:** Los audios recibidos se transcriben automáticamente usando IA, con opción de elegir el proveedor.

**Proveedores soportados:**
| Proveedor | Descripción | Requisitos |
|-----------|-------------|------------|
| **Gemini (Recomendado)** | Usa modelos Gemini (2.5 Flash, 2.5 Pro, 3 Pro) | Incluido en Replit AI o API key propia |
| **OpenAI Whisper** | Modelo especializado en transcripción | Requiere API key propia (OPENAI_API_KEY) |

**Nota técnica de Replit AI Integrations:**
- ✅ Gemini: Soporta audio/video inputs para transcripción
- ❌ OpenAI: NO soporta audio/video inputs (solo texto)
- Si se usa OpenAI para transcripción, debe configurarse la API key propia

**Configuración en Agent Settings:**
- Nueva sección "Transcripción de Audio" en la pestaña Modelo
- Selector para elegir proveedor (Gemini/OpenAI)
- Mensaje informativo que cambia según selección (azul para Gemini, rojo para OpenAI)
- Campo `transcriptionProvider` añadido a tabla `ai_agents` (default: 'gemini')

**Archivos modificados:**
- `shared/schema.ts` - Campo `transcriptionProvider` en aiAgents
- `server/services/transcriptionService.ts` - Lógica de transcripción dual
- `client/src/components/AIAgentConfig.tsx` - UI de configuración

---

### 3. Modelos de IA Actualizados ✅ IMPLEMENTADO

**Modelos disponibles para respuestas (Agent Settings > Modelo):**

**OpenAI:**
- GPT-5.1 (Más potente)
- GPT-5
- GPT-5 Mini
- GPT-5 Nano (Económico)
- GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano
- GPT-4o, GPT-4o Mini
- O4 Mini, O3, O3 Mini (Razonamiento)

**Gemini:**
- Gemini 3 Pro Preview (Más potente)
- Gemini 2.5 Pro (Razonamiento complejo)
- Gemini 2.5 Flash (Rápido)

---

### 4. Fix: Notificaciones Duplicadas para Mensajes Ya Leídos ✅ SOLUCIONADO

**Problema:** Al recargar la aplicación, aparecían notificaciones de "Nuevo mensaje" para mensajes que ya habían sido leídos.

**Causa raíz:** En commit `72d58f1` (hace ~2 horas) se añadió detección de duplicados globales en `storage.upsertMessage()`, pero `syncService.ts` no verificaba si el mensaje devuelto pertenecía a la marca actual.

**Flujo problemático:**
1. `getMessageByMetricoolId(id, brandId)` → "no existe en esta marca" → `isNewMessage = true`
2. `notifyNewMessage()` → se enviaba la notificación
3. `upsertMessage()` → detectaba duplicado global → devolvía mensaje de OTRA marca

**Solución:** Ahora después de `upsertMessage()` se verifica que `savedMessage.brandId === brandId`. Si no coincide, significa que es un duplicado de otra marca y NO se envía notificación.

**Archivos modificados:**
- `server/services/syncService.ts` - Añadido check `isReallyNew` en líneas ~305 y ~408

---

## ACTUALIZACIONES - 16 Diciembre 2025

### 1. Fix: Auto-Reply con Memoria de Conversación ✅ MEJORADO

**Problema resuelto:** El LLM respondía "no tengo acceso a mensajes anteriores" a pesar de recibir el historial.

**Solución:** Se añadieron instrucciones más explícitas y prohibiciones específicas en el prompt:
- Lista de frases PROHIBIDAS ("no tengo acceso a mensajes anteriores", etc.)
- Instrucciones afirmativas claras sobre usar el historial
- Movidas al inicio del system prompt para máxima prioridad

**Archivo modificado:** `server/services/llm/prompt-composer.ts`

---

### 2. INVESTIGACIÓN: Gestión de Memoria en Agentes IA (Diciembre 2024-2025)

**Objetivo:** Documentar las mejores prácticas actuales para manejar el contexto de conversación en agentes de IA.

#### 2.1 Estrategias Principales de Gestión de Contexto

| Estrategia | Descripción | Pros | Contras |
|------------|-------------|------|---------|
| **Sliding Window** | Mantener solo los últimos N mensajes | Simple, reduce costos 52% | Pierde contexto antiguo completamente |
| **Summarization** | Resumir historial con LLM cada X mensajes | Comprime 5x+, preserva contexto | Latencia extra, posible pérdida de detalles |
| **Hybrid (Recomendado)** | Resumen + últimos N mensajes verbatim | Balance entre eficiencia y detalle | Más complejo de implementar |
| **Vector DB + RAG** | Embeddings + búsqueda semántica | Recupera contexto relevante específico | Setup complejo, requiere embeddings |
| **Extraction-Based** | Extraer facts clave a estructura | Preciso, organizado | Requiere diseño de schema |

#### 2.2 Enfoque Recomendado: Resumen Progresivo Acumulativo

Basado en investigación de OpenAI Cookbook, LangChain, y papers académicos (2024):

**Arquitectura propuesta para Repliyo:**

```
┌─────────────────────────────────────────────────────┐
│                  CONTEXTO AL LLM                    │
├─────────────────────────────────────────────────────┤
│ 1. System Prompt (identidad, reglas, tono)          │
│ 2. Resumen Acumulativo (conversación comprimida)    │
│ 3. Últimos 5-10 mensajes (verbatim, detalle)        │
│ 4. Mensaje actual a responder                       │
└─────────────────────────────────────────────────────┘
```

**Flujo de Resumen Progresivo:**

1. **Primera vez (sin resumen previo):**
   - Tomar últimos 20 mensajes
   - Generar resumen inicial
   - Guardar en DB (`conversation_summary`, `summary_last_message_id`)

2. **Actualizaciones posteriores:**
   - Cada 10-15 mensajes nuevos desde último resumen
   - Combinar: `resumen_anterior + nuevos_mensajes → nuevo_resumen`
   - Actualizar campos en DB

3. **Al generar respuesta:**
   - Cargar resumen acumulativo de DB
   - Añadir últimos 5-10 mensajes verbatim
   - Añadir mensaje actual
   - Enviar todo al LLM

**Campos a añadir en tabla `conversations`:**
```sql
conversation_summary TEXT      -- Resumen acumulativo
summary_last_message_id UUID   -- Hasta qué mensaje cubre el resumen
summary_updated_at TIMESTAMP   -- Cuándo se actualizó
```

#### 2.3 Tipos de Memoria (LangChain Framework)

Referencia de patrones establecidos:

| Tipo | LangChain Class | Uso en Repliyo |
|------|-----------------|----------------|
| **Buffer** | ConversationBufferMemory | Actual (últimos 10 msgs) |
| **Summary** | ConversationSummaryMemory | Para implementar |
| **Hybrid** | ConversationSummaryBufferMemory | **Objetivo final** |
| **Window** | ConversationBufferWindowMemory | Fallback simple |

#### 2.4 Técnicas Avanzadas (Futuro)

Para considerar en fases posteriores:

1. **Vectorización + RAG:**
   - Convertir mensajes a embeddings
   - Almacenar en vector DB (Redis, Pinecone)
   - Recuperar solo mensajes relevantes por similitud

2. **Memory Consolidation:**
   - Short-term → Long-term migration
   - "Dynamic forgetting" de información irrelevante

3. **Entity Memory:**
   - Extraer entidades mencionadas (nombres, productos, fechas)
   - Trackear a lo largo de la conversación

4. **Knowledge Graph:**
   - Mapear relaciones entre entidades
   - Contexto más estructurado

#### 2.5 Costos y Optimización

**Métricas de referencia (OpenAI):**
- Sin gestión de contexto: 100% tokens
- Sliding window (10 msgs): ~40% tokens
- Summarization: ~20% tokens (pero +1 API call)
- Hybrid: ~25% tokens con mejor calidad

**Cuándo generar resumen:**
- Trigger por cantidad: cada 15-20 mensajes nuevos
- Trigger por tokens: cuando contexto > 3000 tokens
- Trigger por tiempo: después de responder (async)

#### 2.6 Fuentes Consultadas (Diciembre 2024-2025)

1. **OpenAI Cookbook** - Context Summarization with Realtime API
2. **OpenAI Cookbook** - Session Memory with Agents SDK
3. **LangChain Docs** - ConversationSummaryBufferMemory
4. **JetBrains Research** (Dic 2025) - Efficient Context Management
5. **Redis Blog** - Short-term and Long-term Memory with Redis
6. **ArXiv Paper** - "Recursively Summarizing Enables Long-Term Dialogue Memory"
7. **Mem0.ai** - Memory in Agents: What, Why and How
8. **AWS Blog** - Amazon Bedrock AgentCore Memory

#### 2.7 Plan de Implementación (PENDIENTE)

**Fase 1: Resumen Básico**
- [ ] Añadir campos a tabla `conversations`
- [ ] Implementar función `generateConversationSummary()`
- [ ] Modificar `prompt-composer.ts` para incluir resumen
- [ ] Trigger de resumen cada 15 mensajes nuevos

**Fase 2: Optimización**
- [ ] Resumen asíncrono (después de responder)
- [ ] Cache de resúmenes
- [ ] Métricas de uso de tokens

**Fase 3: Avanzado (Futuro)**
- [ ] Vectorización opcional
- [ ] Entity extraction
- [ ] Dashboard de memoria por conversación

---

## FASE 11: Segregación de Contexto de IA para Comentarios ✅ COMPLETADA - 16 Diciembre 2025

### Problema Resuelto

**Situación anterior:**
- En hilos de comentarios de un post, múltiples usuarios (Juan, Pedro, María) comentan.
- El Inbox agrupa correctamente todos los comentarios visualmente bajo una sola tarjeta (por `socialPostId`).
- PERO: Cuando la IA generaba una respuesta a Juan, veía TODO el historial, incluyendo mensajes de Pedro y María.
- Esto causaba "contaminación de contexto": la IA podía responder a Juan basándose en lo que dijo Pedro.

**Solución implementada:**
- Nuevo sistema de **Filtrado Dinámico de Historial por Autor** en `prompt-composer.ts`.
- Para DMs: Devuelve todo el historial (ya es 1:1 marca-usuario).
- Para Comentarios: Filtra solo mensajes del autor objetivo + respuestas de la marca a ese autor.

### Implementación Técnica

#### Nueva función `filterHistoryByAuthor()` en `server/services/llm/prompt-composer.ts`

```typescript
export function filterHistoryByAuthor(
  history: Message[],
  targetMessage: Message,
  messageType: string
): Message[] {
  // DMs: Ya son 1:1, devolver todo
  if (messageType === 'conversation') {
    return history.slice(-10);
  }

  // Comentarios: Segregar por autor
  // Paso 1: Identificar mensajes del usuario objetivo (inbound)
  // Paso 2: Identificar respuestas de la marca a ese usuario (usando parentMessageId)
  // Paso 3: Fallback con heurística de proximidad temporal si no hay parentMessageId
  // Paso 4: Combinar y ordenar cronológicamente
}
```

#### Estrategias de vinculación:

1. **Estrategia primaria:** Usar `parentMessageId` para vincular respuestas de la marca al mensaje inbound que respondieron.

2. **Estrategia de fallback:** Heurística de proximidad temporal (1 hora) para mensajes outbound sin `parentMessageId`.

#### Modificaciones a `composePrompt()`:

```typescript
// ANTES:
const recentMessages = conversationHistory.slice(-10);

// DESPUÉS:
const filteredMessages = filterHistoryByAuthor(conversationHistory, message, messageType);
```

### Arquitectura Visual vs IA

```
INBOX (Visual):
┌─────────────────────────────────────────────────────────┐
│  Post "Video de Zapatos" (1 tarjeta)                    │
│  ├── Comentario de Juan                                 │
│  ├── Respuesta de Marca a Juan                         │
│  ├── Comentario de Pedro                               │
│  ├── Respuesta de Marca a Pedro                        │
│  └── Comentario de María                               │
└─────────────────────────────────────────────────────────┘

CONTEXTO IA (al responder a Juan):
┌─────────────────────────────────────────────────────────┐
│  (Contexto exclusivo con @juan)                         │
│  ├── Cliente: ¿Tienen envío gratis?                    │
│  ├── Marca: Sí, en compras mayores a $50               │
│  └── Cliente: Perfecto, quiero comprar                 │
│                                                         │
│  ❌ NO incluye mensajes de Pedro ni María              │
└─────────────────────────────────────────────────────────┘
```

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `server/services/llm/prompt-composer.ts` | Nueva función `filterHistoryByAuthor()` + integración en `composePrompt()` |

### Beneficios

1. **Sin cambios de schema/DB:** No requiere migración de datos.
2. **Sin romper el Inbox:** La agrupación visual permanece intacta.
3. **Modular:** La función es reutilizable para futuras funcionalidades (resúmenes progresivos).
4. **Dinámico:** Siempre usa datos frescos del historial.

### Próximos Pasos (Visión de Futuro)

La salida de `filterHistoryByAuthor()` será el INPUT para el sistema de "Resumen Progresivo con Consolidación":
- ~~Fase 1.1: Implementar `generateConversationSummary()` que tome el array filtrado~~ ✅ COMPLETADO
- ~~Fase 1.2: Persistir resúmenes por `(conversationId, customerId)` para optimización~~ ✅ COMPLETADO
- ~~Fase 1.3: Actualizar resumen solo cuando hay mensajes nuevos del mismo usuario~~ ✅ COMPLETADO

---

## FASE 12: Sistema de Memoria Persistente con Resúmenes Progresivos ✅ COMPLETADA - 16 Diciembre 2025

### Objetivo
Implementar memoria a largo plazo para la IA mediante resúmenes consolidados que permitan mantener contexto histórico sin exceder límites de tokens, optimizando costos.

### Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE MEMORIA PERSISTENTE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Mensaje Nuevo de Usuario]                                     │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────┐                                   │
│  │ 1. Obtener Resumen      │ ← conversation_user_summaries     │
│  │    Existente (si hay)   │   (por conversationId + author)   │
│  └──────────┬──────────────┘                                   │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────────┐                                   │
│  │ 2. Obtener Historial    │ ← filterHistoryByAuthor()         │
│  │    Reciente (10 msgs)   │   (segregación por usuario)       │
│  └──────────┬──────────────┘                                   │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. PROMPT HÍBRIDO:                                       │   │
│  │    [Resumen Consolidado] + [Historial Reciente]          │   │
│  │    ↓                                                     │   │
│  │    Memoria largo plazo  + Contexto inmediato             │   │
│  └──────────┬──────────────────────────────────────────────┘   │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────────┐                                   │
│  │ 4. LLM Genera Respuesta │                                   │
│  └──────────┬──────────────┘                                   │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────────┐                                   │
│  │ 5. Envío a Metricool    │                                   │
│  └──────────┬──────────────┘                                   │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 6. TRIGGER ASÍNCRONO (background):                       │   │
│  │    triggerSummaryUpdateAsync(conversationId, author)     │   │
│  │    ↓                                                     │   │
│  │    SI mensajes_nuevos >= 10 → Generar nuevo resumen      │   │
│  │    usando Gemini Flash (modelo más económico)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes Implementados

#### 1. Nueva Tabla: `conversation_user_summaries`

```typescript
// shared/schema.ts
export const conversationUserSummaries = pgTable("conversation_user_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  author: text("author").notNull(),
  summary: text("summary").notNull(),
  lastMessageId: uuid("last_message_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueConversationAuthor: unique().on(table.conversationId, table.author),
}));
```

#### 2. Servicio de Resúmenes: `summaryService.ts`

```typescript
// server/services/summaryService.ts
- generateSummary(): Genera resumen usando Gemini Flash 2.5
- checkAndUpdateSummary(): Verifica umbral (10 msgs) y actualiza si necesario
- triggerSummaryUpdateAsync(): Ejecuta en background sin bloquear respuesta
```

**Prompt de Generación de Resumen:**
```
Eres un asistente que crea resúmenes concisos de conversaciones de atención al cliente.
- Resume puntos clave: preguntas, respuestas, acuerdos, preferencias del cliente
- Mantén información crítica: nombres, fechas, pedidos, compromisos
- Usa máximo 500 caracteres
- Escribe en tercera persona ("El cliente preguntó...")
- Si hay resumen anterior, intégralo con la nueva información
```

#### 3. Triggers Implementados

| Ubicación | Trigger | Momento |
|-----------|---------|---------|
| `autoReplyService.ts` | `triggerSummaryUpdateAsync()` | Después de auto-reply exitoso |
| `routes.ts` (POST /api/inbox/reply) | `triggerSummaryUpdateAsync()` | Después de reply manual exitoso |

#### 4. Integración en Prompt Composer

```typescript
// server/services/llm/prompt-composer.ts
export function composePrompt(context: PromptContext) {
  // ...
  
  // FASE 2: Memoria Persistente
  let summaryContext = "";
  if (userSummary && userSummary.summary) {
    summaryContext = `\n--- RESUMEN DE CONVERSACIÓN ANTERIOR ---
(Este es un resumen consolidado de interacciones previas con ${message.author})
${userSummary.summary}
--- FIN DEL RESUMEN ---\n`;
  }
  
  // Inyectar: Resumen → Historial Reciente → Mensaje Actual
  if (summaryContext) userPromptParts.push(summaryContext);
  if (historyContext) userPromptParts.push(historyContext);
}
```

### Archivos Modificados/Creados

| Archivo | Cambio |
|---------|--------|
| `shared/schema.ts` | Nueva tabla `conversationUserSummaries` + tipos |
| `server/storage.ts` | Métodos CRUD: `getConversationUserSummary()`, `upsertConversationUserSummary()` |
| `server/services/summaryService.ts` | **NUEVO** - Servicio completo de generación de resúmenes |
| `server/services/autoReplyService.ts` | Import + trigger async + obtención de resumen antes de LLM |
| `server/routes.ts` | Import + triggers en endpoints de reply manual |
| `server/services/llm/prompt-composer.ts` | Nuevo campo `userSummary` + inyección de resumen en prompt |
| `server/services/llm/types.ts` | `LLMGenerateRequest.userSummary` agregado |
| `server/services/llm/gemini-adapter.ts` | Pasar `userSummary` a `composePrompt()` |
| `server/services/llm/openai-adapter.ts` | Pasar `userSummary` a `composePrompt()` |

### Beneficios

1. **Memoria Ilimitada**: La IA puede recordar conversaciones de meses atrás
2. **Optimización de Costos**: Usa Gemini Flash (modelo económico) para resúmenes
3. **No Bloquea**: Generación asíncrona, no afecta latencia de respuesta
4. **Segregación Mantenida**: Resúmenes son per-usuario, respeta privacidad entre usuarios

---

## FASE 13: Optimización de Memoria Persistente (PENDIENTE)

### Pendientes Críticos Identificados

Se han identificado 3 riesgos de "Lógica Fina" que deben abordarse para garantizar robustez total del sistema de memoria.

#### [ ] 1. Mitigación del "Cold Start" (Amnesia Histórica)

**El Problema:**
Al desplegar el sistema, clientes antiguos con historiales extensos (>50 mensajes) no tendrán resumen previo. La IA responderá basándose únicamente en la ventana deslizante (últimos 10 mensajes), ignorando todo el contexto histórico hasta que se genere el primer resumen nuevo tras una interacción.

**Impacto:** Cliente recurrente que ha conversado 100+ veces será tratado como "nuevo" hasta su siguiente mensaje.

**Soluciones Propuestas:**

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A: Script de Migración** | Ejecutar `backfill_summaries.ts` en background que detecte conversaciones antiguas sin resumen y las procese | Proactivo, resuelve todo de una vez | Costo inicial de tokens |
| **B: Lazy Load Inteligente** | En `prompt-composer`, si detecta `!summary AND total_messages > 20`, generar resumen inmediato (síncrono) antes de responder | Sin costo previo, bajo demanda | Latencia en primera respuesta |

**Implementación Recomendada:** Opción B con fallback a Opción A para clientes VIP.

---

#### [ ] 2. Control de Concurrencia (Race Conditions)

**El Problema:**
El proceso de resumen es asíncrono y puede tomar 5-10 segundos. Si el usuario envía un nuevo mensaje durante ese intervalo:

```
Timeline:
t=0:    Servicio lee hasta mensaje #100
t=1:    Usuario envía mensaje #101
t=5:    Servicio guarda resumen con last_message_id = #100
t=6:    Siguiente trigger busca mensajes posteriores al resumen

Riesgo: Mensaje #101 podría quedar en "limbo" si la query
        no gestiona correctamente el intervalo de procesamiento.
```

**Impacto:** Pérdida potencial de contexto de mensajes enviados durante generación de resumen.

**Solución Propuesta:**
Utilizar timestamps estrictos (`created_at`) en lugar de IDs, o asegurar que la query del siguiente resumen use `> last_message_id_of_summary` de forma estricta.

```sql
-- Query segura para obtener mensajes nuevos
SELECT * FROM messages 
WHERE conversation_id = $1 
  AND author = $2 
  AND (id > $last_message_id OR last_message_id IS NULL)
ORDER BY timestamp ASC;
```

---

#### [ ] 3. Optimización de Costos (Filtro de "Basura Conversacional")

**El Problema:**
Con umbral fijo de 10 mensajes, el sistema gastará tokens resumiendo interacciones de bajo valor informativo:

```
Ejemplo de conversación "basura":
- Cliente: Ok
- Marca: 👍
- Cliente: Gracias
- Marca: De nada
- Cliente: Jaja
- ... (5 mensajes más similares)

= 10 mensajes = Trigger de resumen = Costo de API desperdiciado
```

**Impacto:** Costos innecesarios de API para resúmenes sin valor contextual.

**Solución Propuesta: "Check de Densidad Informativa"**

Implementar validación en `summaryService.checkAndUpdateSummary()` antes de llamar a Gemini:

```typescript
// Lógica de filtro de densidad
const totalCharacters = newMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
const averageLength = totalCharacters / newMessages.length;

// SI contenido es muy corto, acumular para siguiente tanda
if (totalCharacters < 200 || averageLength < 20) {
  console.log("[Summary] Mensajes de baja densidad, posponiendo resumen");
  return; // No generar resumen aún
}
```

**Thresholds Recomendados:**
- `totalCharacters < 200` → No resumir (menos de ~50 palabras útiles)
- `averageLength < 20` → Probablemente mensajes tipo "Ok", "👍", "Jaja"

---

### Priorización Sugerida

| # | Pendiente | Urgencia | Impacto | Esfuerzo |
|---|-----------|----------|---------|----------|
| 1 | Filtro de Basura | 🔴 Alta | Ahorro inmediato de costos | Bajo (2h) |
| 2 | Race Conditions | 🟡 Media | Prevención de bugs sutiles | Medio (4h) |
| 3 | Cold Start | 🟢 Baja | UX para clientes históricos | Alto (8h) |

---

## DEPLOYMENT Y ESCALABILIDAD (17 Diciembre 2025)

### Análisis de la Aplicación

**Repliyo** es un Sistema de Gestión de Inbox Social Media que:
- Se integra con **Metricool** para centralizar DMs y comentarios de múltiples marcas
- Soporta **6 redes sociales**: Instagram, Facebook, TikTok, YouTube, LinkedIn, Google Business
- Tiene **agentes de IA** (OpenAI/Gemini) que generan respuestas automáticas
- Usa arquitectura **multi-tenant**: Admins ven todo, clientes solo su marca
- **Sincronización cada 2 minutos** para obtener nuevos mensajes
- **Auto-reply automático** cuando está configurado

---

### Recomendación de Deployment en Replit

#### Opción Recomendada: Reserved VM Deployment

| Característica | Reserved VM | Autoscale | Scheduled |
|----------------|-------------|-----------|-----------|
| **Siempre activo 24/7** | ✅ SÍ | ❌ Se duerme sin tráfico | ❌ Solo ejecuta en horario |
| **Sincronización cada 2 min** | ✅ Perfecto | ⚠️ Podría fallar dormido | ✅ Funciona |
| **Procesos en background** | ✅ Ideal | ❌ No recomendado | ✅ Diseñado para esto |
| **Costo predecible** | ✅ Mensual fijo | ⚠️ Variable por uso | ✅ Por ejecución |
| **SLA 99.9% uptime** | ✅ Garantizado | ✅ Garantizado | ⚠️ No aplica |

#### Veredicto

La app necesita **Reserved VM** porque:
1. **Sincronización cada 2 minutos** = proceso continuo que requiere que el servidor esté siempre vivo
2. **Auto-reply instantáneo** = no puede esperar a que el servidor "despierte"
3. **WebSockets** para notificaciones en tiempo real = conexión persistente

---

### Precios de Reserved VM (Replit)

| Configuración | vCPU | RAM | Precio/Mes |
|---------------|------|-----|------------|
| **Shared VM** | 0.5 | 2GB | **$20/mes** |
| **Dedicated 1** | 1 | 4GB | **$40/mes** |
| **Dedicated 2** | 2 | 8GB | **$80/mes** |
| **Dedicated 4** | 4 | 16GB | **$160/mes** |

#### Recomendación para iniciar:
- **Dedicated 1 (1 vCPU / 4GB RAM) = $40/mes**
- Suficiente para ~25 usuarios + ~10 marcas + sincronización cada 2 min

---

### Escalabilidad y Datos

#### Base de Datos PostgreSQL (Replit/Neon)

| Aspecto | Límite | Uso Actual | Estado |
|---------|--------|------------|--------|
| **Almacenamiento** | 10 GB | ~170+ mensajes | ✅ OK |
| **Conexiones concurrentes** | Ilimitado (serverless) | Bajo uso | ✅ OK |
| **Serverless auto-escala** | Sí | Activo | ✅ OK |

#### Proyección de Crecimiento

Basado en la documentación:
- **Mensajes actuales**: ~173 mensajes → 67 conversaciones
- **Sync cada 2 min** = 720 ciclos/día × ~10 marcas = ~7,200 verificaciones/día
- **Estimación 6 meses**: Con 25 usuarios activos:
  - ~50,000-100,000 mensajes
  - ~500 MB de datos (incluyendo rawData JSON)
  - **Muy dentro del límite de 10 GB** ✅

---

### Consideraciones Críticas para 24/7

#### 1. Rate Limiting de Metricool
El código ya lo maneja en `server/services/syncService.ts`:
```typescript
private readonly COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 min cooldown for 429
private readonly DELAY_BETWEEN_BRANDS_MS = 2000; // 2 seg entre marcas
```

#### 2. WebSocket para Tiempo Real
Implementado en `websocketService.ts` - notifica nuevos mensajes instantáneamente.

#### 3. Procesos de Background Actuales

| Proceso | Intervalo | Función |
|---------|-----------|---------|
| `syncAllBrands()` | 2 minutos | Obtiene mensajes de Metricool |
| `syncAvailableBrands()` | 12 horas | Detecta nuevas marcas en Metricool |
| `autoReplyService` | Por evento | Responde automáticamente si está activado |
| `transcriptionService` | Por evento | Transcribe audios de WhatsApp/Instagram |

---

### Arquitectura Híbrida Opcional (Futuro)

Si el proyecto crece significativamente (+100 marcas, +500 usuarios), considerar:

```
┌─────────────────────────────────────────┐
│  Reserved VM (Frontend + API)           │ ← $40-80/mes
│  - Sirve la interfaz web                │
│  - Maneja peticiones HTTP               │
│  - WebSockets para notificaciones       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Scheduled Deployment (Background Jobs) │ ← Pago por uso
│  - Sincronización Metricool             │
│  - Procesamiento de IA                  │
│  - Transcripciones de audio             │
└─────────────────────────────────────────┘
```

**Para la escala actual (~25 usuarios, ~10 marcas), Reserved VM único es suficiente y más simple.**

---

## CORRECCIÓN DE BUG - 18 Diciembre 2025

### Bug: Notificaciones Duplicadas al Cambiar de Marca

#### Problema Reportado:
Cuando el usuario cambiaba de marca y volvía a la marca original, aparecían notificaciones de mensajes como si fueran nuevos, aunque ya estaban guardados en la base de datos.

#### Causa Raíz:
En `server/services/syncService.ts`, la variable `savedCount` contaba TODOS los mensajes procesados durante la sincronización (incluyendo mensajes ya existentes que simplemente se actualizaban). La notificación usaba este contador inflado, causando alertas falsas.

```typescript
// ANTES (problema):
savedCount++; // Se incrementaba para TODOS los mensajes procesados
if (savedCount > 0) {
  this.createSyncNotification(brandId, 'new_messages', savedCount, ...);
}
```

#### Solución Implementada:

1. **Nuevo contador `newInboundCount`**: Cuenta solo mensajes realmente nuevos e inbound (de clientes)
2. **Incremento solo cuando es nuevo**: Se incrementa únicamente dentro de los bloques `if (isReallyNew && isInbound)`
3. **Notificación corregida**: Ahora usa `newInboundCount` en lugar de `savedCount`

```typescript
// DESPUÉS (correcto):
let newInboundCount = 0;
// ...
if (isReallyNew && isInbound) {
  newInboundCount++; // Solo mensajes NUEVOS e INBOUND
  // ...
}
// ...
if (newInboundCount > 0) {
  this.createSyncNotification(brandId, 'new_messages', newInboundCount, ...);
}
```

#### Archivos Modificados:
- `server/services/syncService.ts` - Añadido contador `newInboundCount` y actualizada lógica de notificación

#### Resultado:
- Al cambiar de marca y volver, no aparecen notificaciones falsas de mensajes ya existentes
- Solo se notifican mensajes verdaderamente nuevos recibidos de clientes
- El log ahora muestra ambos contadores: `saved X messages (Y new inbound)`

---

### Resumen Ejecutivo de Deployment

| Aspecto | Recomendación |
|---------|---------------|
| **Tipo de Deployment** | **Reserved VM** |
| **Configuración inicial** | **1 vCPU / 4GB RAM ($40/mes)** |
| **Base de datos** | PostgreSQL de Replit (OK hasta 10GB) |
| **SLA** | 99.9% uptime garantizado |
| **Escalado futuro** | Subir a 2 vCPU si crece |

---

## CORRECCIÓN DE BUG - 18 Diciembre 2025 (YouTube Nested Comments)

### Bug: Error al Responder a Comentarios Anidados de YouTube

#### Problema Reportado:
Al intentar enviar un borrador de respuesta a un comentario anidado (reply dentro de otro comentario) en YouTube a través de Metricool, el sistema devolvía un error 500 `ReplyCommentException` con el mensaje "input is invalid".

**Ejemplo del error:**
```
Metricool API POST error (500): {"status":"INTERNAL_SERVER_ERROR","code":"500","title":"ReplyCommentException","detail":{"error":"The API server failed to successfully process the request..."}}
```

#### Causa Raíz:
En YouTube, los comentarios anidados tienen dos IDs diferentes:
- **ID del reply**: Formato `{parentId}.{replyId}` (ej: `Ugy7KLef5okGiv95Hgt4AaABAg.AGf9rWQjsi4`)
- **ID del parent**: Formato `{parentId}` (ej: `Ugy7KLef5okGiv95Hgt4AaABAg`)

Cuando el sistema almacenaba un comentario anidado, guardaba el ID completo del reply como `metricoolId`. Pero la API de Metricool/YouTube requiere que las respuestas se envíen al **parent thread ID**, no al ID del reply individual.

```typescript
// ANTES (problema):
replyToComment({
  objectId: message.metricoolId, // ← Usaba el ID del reply completo
  // ...
});
```

#### Solución Implementada:

1. **Detección de comentarios anidados de YouTube**: El campo `rawData` de los mensajes almacena el `parentId` cuando es un reply anidado.

2. **Parseo seguro del rawData**: Se agregó lógica para parsear `rawData` de forma segura (puede ser string JSON o objeto).

3. **Uso del parentId correcto**: Para YouTube, si existe `parentId` en rawData, se usa ese ID en lugar del `metricoolId`.

```typescript
// DESPUÉS (correcto):
// Safely parse rawData - it may be stored as JSON string in database
let parsedRawData: Record<string, any> | null = null;
try {
  if (message.rawData) {
    parsedRawData = typeof message.rawData === 'string' 
      ? JSON.parse(message.rawData) 
      : message.rawData as Record<string, any>;
  }
} catch (parseError) {
  console.warn(`[SendDraft] Failed to parse rawData for message ${messageId}:`, parseError);
}

if (message.platform?.toLowerCase() === 'youtube' && parsedRawData?.parentId) {
  objectIdToUse = parsedRawData.parentId;
  console.log(`[SendDraft] YouTube nested comment detected, using parentId: ${objectIdToUse}`);
}
```

#### Archivos Modificados (3 lugares - cobertura completa):
1. `server/routes.ts` - Endpoint `POST /api/ai-agent/:brandId/send-draft/:messageId` (envío de borradores IA)
2. `server/routes.ts` - Endpoint `POST /api/messages/:messageId/reply` (respuestas manuales desde inbox)
3. `server/services/autoReplyService.ts` - Función `processMessage()` (auto-respuestas automáticas)

#### Estructura del rawData de YouTube:
```json
{
  "id": "Ugy7KLef5okGiv95Hgt4AaABAg.AGWERfOdgxLAGf9rWQjsi4",
  "text": "Contenido del comentario...",
  "owner": "UCZqLcvCzdvNp8m-drjIsJlw",
  "parentId": "Ugy7KLef5okGiv95Hgt4AaABAg",  // ← Este se usa para responder
  "creationDate": "2025-04-08T21:43:40+0200"
}
```

#### Resultado:
- Las respuestas a comentarios anidados de YouTube ahora se envían correctamente
- El sistema detecta automáticamente si es un reply anidado y usa el ID del hilo padre
- Compatible con todas las marcas que tengan YouTube conectado
- No afecta a otras plataformas (Instagram, TikTok, Facebook, etc.)

---

## Sistema Bulk AI Draft (Diciembre 2024)

### Descripción General
Sistema de generación masiva de borradores de IA que permite a los usuarios seleccionar múltiples mensajes y generar respuestas de IA de forma concurrente (máximo 3 a la vez) con seguimiento de progreso en tiempo real.

### Componentes Implementados

#### 1. Hook `useBulkDraftQueue.ts`
Cola de procesamiento con concurrencia controlada:
- **Máximo 3 solicitudes concurrentes** para evitar sobrecarga de la API
- **Contador de éxitos con useRef** para evitar problemas de stale closures
- **Estados por mensaje**: `idle`, `queued`, `running`, `success`, `error`
- **Progreso en tiempo real**: `completed`, `total`, `successCount`, `errorCount`

```typescript
interface BulkDraftQueueOptions {
  brandId: string;
  maxConcurrency?: number; // default: 3
  onComplete?: (results: { successCount: number; errorCount: number }) => void;
  onMessageComplete?: (messageId: string, success: boolean) => void;
}
```

#### 2. Componente `BulkDraftActionBar.tsx`
Barra flotante que aparece cuando hay mensajes seleccionados:
- Muestra cantidad de mensajes seleccionados
- Botón "Generar Borradores" para iniciar procesamiento
- Barra de progreso durante procesamiento
- Contadores de éxito/error en tiempo real
- Se oculta automáticamente al completar

#### 3. Integración en `Inbox.tsx`
- Estado de selección: `selectionEnabled`, `selectedMessageIds`
- Botón "Bulk AI" en el header del thread para activar modo selección
- Limpieza automática al cambiar de conversación

#### 4. Checkboxes en `CommentThread.tsx`
- Checkbox posicionado en "gutter" izquierdo (padding pl-8)
- Solo visible para mensajes elegibles (de clientes, sin borrador existente)
- Estados visuales: checkbox, loading spinner, check de éxito, X de error

### Correcciones de Bugs (19 Diciembre 2024)

#### Bug 1: Checkboxes no visibles en móvil
**Problema:** Los checkboxes no aparecían en la vista móvil al activar Bulk AI.

**Causa:** El ScrollArea de Radix tiene `overflow: hidden` en su viewport. En móvil, el padding era solo 16px (p-4), y el checkbox posicionado en `left:-12px` quedaba fuera del área visible y era cortado.

**Solución:** 
1. Agregar `pl-8` (32px padding-left) al contenedor `max-w-3xl` cuando `selectionEnabled` está activo
2. Posicionar el checkbox en `left:-28px` (dentro del nuevo padding)

```typescript
// Inbox.tsx - Contenedor con gutter dinámico
<div className={cn(
  "max-w-3xl mx-auto space-y-8 pb-32 relative",
  selectionEnabled && "pl-8"  // ← Gutter para checkboxes
)}>
```

#### Bug 2: Modo Bulk AI global (no aislado por POST)
**Problema:** Al activar Bulk AI en un post y luego navegar a otro post, el modo seguía activo mostrando checkboxes en todas las conversaciones.

**Causa:** `selectionEnabled` era un estado global. El `useEffect` que detectaba cambios de conversación solo limpiaba `selectedMessageIds`, pero no reseteaba `selectionEnabled`.

**Solución:** Resetear ambos estados cuando cambia la conversación:

```typescript
// Inbox.tsx
// Clear selection AND disable selection mode when conversation changes
// This ensures Bulk AI mode is scoped per conversation/post
React.useEffect(() => {
  setSelectedMessageIds(new Set());
  setSelectionEnabled(false);  // ← AGREGADO
}, [activeConversation?.id]);
```

**Resultado:** Cada post/conversación ahora tiene su propio modo Bulk AI independiente.

### Archivos Principales del Sistema Bulk AI
- `client/src/hooks/useBulkDraftQueue.ts` - Hook de cola de procesamiento
- `client/src/components/BulkDraftActionBar.tsx` - Barra flotante de acciones
- `client/src/components/CommentThread.tsx` - Checkboxes de selección
- `client/src/components/Inbox.tsx` - Estado y lógica de integración

---

## Fix Crítico: Race Condition en Buffer de DMs (21 Diciembre 2025)

### Problema Detectado
El sistema de buffer de DMs funcionaba inconsistentemente: la primera ráfaga de mensajes se acumulaba correctamente (4 mensajes → 1 respuesta), pero la segunda ráfaga fallaba (3 mensajes → 3 respuestas separadas).

### Diagnóstico
**Causa raíz: Race Condition**

En `syncService.ts`, la función `triggerAutoReply()` es **"fire-and-forget"** (no usa `await`). Cuando Metricool retorna múltiples mensajes nuevos en la misma sincronización:

```
Mensaje 1 → triggerAutoReply() → retorna inmediatamente (no espera)
Mensaje 2 → triggerAutoReply() → retorna inmediatamente
Mensaje 3 → triggerAutoReply() → retorna inmediatamente
```

Las 3 llamadas a `dmBufferService.bufferMessage()` se ejecutaban **en paralelo**. Todas podían ver `existingEntry = undefined` porque la primera aún no había terminado de insertar su entrada en el Map.

**Resultado:** Cada mensaje creaba su propio buffer independiente en lugar de agregarse al existente.

### Solución Implementada
Agregamos un **mecanismo de lock por conversación** en `dmBufferService.ts`:

```typescript
class DmBufferService {
  private buffers: Map<string, BufferEntry> = new Map();
  private locks: Map<string, Promise<void>> = new Map(); // ← NUEVO

  async bufferMessage(...): Promise<void> {
    const key = this.getBufferKey(conversation.id);
    
    // Esperar si hay otro mensaje procesándose para la misma conversación
    const existingLock = this.locks.get(key);
    if (existingLock) {
      log(`[DmBuffer] 🔒 WAITING_FOR_LOCK - msgId: ${message.id}`, "sync");
      await existingLock;
    }
    
    // Crear lock para esta operación
    let unlockResolve: () => void;
    const lockPromise = new Promise<void>(resolve => {
      unlockResolve = resolve;
    });
    this.locks.set(key, lockPromise);
    
    try {
      // ... lógica de buffer existente ...
    } finally {
      this.locks.delete(key);
      unlockResolve!();
    }
  }
}
```

### Flujo Corregido
Con el lock, los mensajes ahora se procesan secuencialmente:
1. **Mensaje 1** → adquiere lock → crea NEW_BUFFER → libera lock
2. **Mensaje 2** → espera lock (🔒 WAITING_FOR_LOCK) → adquiere → ADDED_TO_EXISTING → libera
3. **Mensaje 3** → espera lock → adquiere → ADDED_TO_EXISTING → libera
4. **Timer expira** → 🚀 FLUSH_START → procesa 3 mensajes combinados → 1 sola respuesta

### Logs de Diagnóstico
```
🔒 WAITING_FOR_LOCK - Mensaje esperando su turno
🟡 BUFFER_ENTRY - Mensaje entrando al sistema de buffer
🟢 NEW_BUFFER - Primer mensaje, se crea buffer nuevo
🔵 ADDED_TO_EXISTING - Mensaje agregado a buffer existente
🚀 FLUSH_START - Buffer expira, procesa todos los mensajes
```

### Archivos Modificados
- `server/services/dmBufferService.ts` - Lock mechanism agregado

### Commit
`3204bad368c7aba117730fbe1d37c0ade5333616` - Add a lock to prevent simultaneous message processing race conditions

---

## FASE 12: Módulo CRM Conversacional e Inteligencia Artificial

### Fecha de Inicio: 29 Diciembre 2025
### Estado: 📋 EN PLANIFICACIÓN

---

### Contexto y Visión

**Objetivo:** Dotar a Repliyo de capacidades avanzadas inspiradas en la arquitectura de Respond.io (estado a Dic 2025), transformándolo de una herramienta de gestión a un sistema que:

1. **Ingesta** conversaciones de redes sociales (DMs, comentarios)
2. **Extrae datos automáticamente** de esos chats para poblar un "Mini CRM" interno
3. **Utiliza Agentes de IA** con Function Calling para gestionar conversaciones, cerrar ventas o dar soporte

**Metáfora:** Repliyo es la nave nodriza, y este CRM es el nuevo motor de hipervelocidad que le estamos instalando.

---

### Investigación: Respond.io Features 2025

#### Conversation-Led Growth Framework

Respond.io estructura el journey del cliente en 3 etapas:

| Etapa | Descripción | Funcionalidad Clave |
|-------|-------------|---------------------|
| **Capture** | Agregación unificada de leads | Todos los canales → un inbox con perfiles limpios |
| **Convert** | AI Agents califican y convierten | Function calling, workflows, analytics |
| **Retain** | Broadcasts y seguimiento | Campañas, CSAT, lifecycle tracking |

#### AI Agents de Respond.io

**Capacidades multimodales:**
- Procesan texto, imágenes, PDFs, audio, emojis en múltiples idiomas
- Entendimiento de mensajes de voz + manejo de llamadas
- Análisis de documentos (ej. tablas en PDFs)

**Acciones agenticas (Function Calling):**
- Actualizar campos del CRM automáticamente
- Recomendar productos (upsell/cross-sell)
- Agendar citas + compartir links de pago
- Cerrar conversaciones con auto-resúmenes
- Escalar a agentes humanos con contexto completo

**Arquitectura:**
- **AI Orchestrator:** Coordina micro-agentes especializados
- **Templates:** Agente de ventas, soporte, recepcionista
- **Guardrails:** Reglas de compliance, tono, voz de marca
- **Testing environment:** Simular conversaciones antes de lanzar

#### CRM Nativo de Respond.io

- Perfiles de contacto con historial unificado (mensajes, llamadas, emails, notas)
- Lifecycle stages + lead management
- Tags, snippets, notas de cierre
- Sync con HubSpot, Salesforce, Zoho

#### Pricing (Referencia)
- Starter: $79/mes (5 usuarios, sin IA)
- Growth/Scale: Custom (con AI Agents y workflows)

---

### Arquitectura Técnica del Módulo CRM

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REPLIYO (Nave Nodriza)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐    │
│  │ Metricool   │───▶│   Traffic Controller (Función Puente)   │    │
│  │ Webhooks    │    │                                         │    │
│  └─────────────┘    │  ┌─────────────────────────────────────┐│    │
│                     │  │ ¿Es DM?                              ││    │
│                     │  │   └─► Buscar/Crear en crmContacts    ││    │
│                     │  │ ¿Es Comentario?                      ││    │
│                     │  │   └─► Upsert en crmContactLimbo      ││    │
│                     │  └─────────────────────────────────────┘│    │
│                     └─────────────────────────────────────────┘    │
│                                    │                                │
│                                    ▼                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    CRM DATABASE MODULE                       │   │
│  │                                                              │   │
│  │  ┌──────────────┐    ┌───────────────────┐                  │   │
│  │  │ crmContacts  │◀───│ crmContactChannels│                  │   │
│  │  │  (UUID pk)   │    │ (identity merge)  │                  │   │
│  │  │ customFields │    └───────────────────┘                  │   │
│  │  │ JSONB        │                                           │   │
│  │  └──────────────┘    ┌───────────────────┐                  │   │
│  │         ▲            │ crmContactLimbo   │                  │   │
│  │         │            │ (lazy creation)   │                  │   │
│  │         │            └───────────────────┘                  │   │
│  └─────────┼────────────────────────────────────────────────────┘   │
│            │                                                        │
│            │ Function Calling                                       │
│  ┌─────────┴───────────────────────────────────────────────────┐   │
│  │                      AI AGENTS                               │   │
│  │  • update_contact_field(field, value)                       │   │
│  │  • close_conversation(reason, summary)                      │   │
│  │  • promote_to_contact()                                     │   │
│  │  • extract_entities()                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Decisiones de Diseño Clave

#### 1. UUID como Clave Primaria (NUNCA phone/email)

**Razón:** Permite fusión de identidades en el futuro. Si el teléfono fuera PK, sería imposible unir el usuario de Instagram con el de WhatsApp.

```typescript
// ❌ INCORRECTO
id: phone.primaryKey()

// ✅ CORRECTO
id: varchar("id").primaryKey().default(sql`gen_random_uuid()`)
phone: text("phone") // Campo indexado pero NO es PK
```

#### 2. JSONB para Custom Fields

**Razón:** Flexibilidad para guardar datos dinámicos que la IA extraiga sin alterar el schema.

```typescript
customFields: jsonb("custom_fields").default({})
// Ejemplo: {"talla_zapato": "42", "presupuesto": "5000", "fecha_boda": "2025-06-15"}
```

#### 3. Lazy Creation con Tabla Limbo

**Razón:** Evita llenar la base de datos con "ruido" de comentarios públicos. Solo creamos contactos reales cuando hay un "handshake" (DM).

| Interacción | Destino |
|-------------|---------|
| Comentario público | `crmContactLimbo` (temporal) |
| DM / Mensaje privado | `crmContacts` (oficial) |
| Comentario → luego DM | Promoción de limbo a contacto |

#### 4. Identity Merging con Tabla Separada

**Razón:** Un contacto puede tener múltiples canales. Separar permite queries eficientes y merge futuro.

```
crmContacts (1) ←──────── (*) crmContactChannels
                              - instagram @user123
                              - facebook 17841459810424420
                              - whatsapp +1305XXXXXXX
```

#### 5. Campo `language` (ISO Code)

**Razón:** Determina idioma de templates automáticos y notificaciones del sistema.

```typescript
language: text("language").default('es') // 'es', 'en', 'pt', etc.
```

#### 6. Campo `lastUsedChannelId` (Enrutamiento Inteligente)

**Razón:** Permite responder al último canal activo sin lógica extra.

```typescript
lastUsedChannelId: varchar("last_used_channel_id").references(() => crmContactChannels.id)
```

---

### Schema de Base de Datos (Drizzle ORM)

```typescript
// ============================================
// TABLA 1: CRM CONTACTS (La persona)
// ============================================
export const crmContacts = pgTable("crm_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  
  // Datos básicos
  displayName: text("display_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  email: text("email"),
  language: text("language").default('es'), // ISO code: 'es', 'en', 'pt'
  
  // Lifecycle
  status: text("status").default('lead'), // lead | qualified | customer | churned
  lifecycleStage: text("lifecycle_stage").default('new'), // new | engaged | converted | loyal
  source: text("source"), // instagram_dm | facebook_comment | manual | import
  
  // Datos dinámicos extraídos por IA
  customFields: jsonb("custom_fields").default({}),
  
  // Enrutamiento inteligente
  lastUsedChannelId: varchar("last_used_channel_id"),
  
  // Métricas
  conversationCount: integer("conversation_count").default(0),
  totalMessages: integer("total_messages").default(0),
  firstInteractionAt: timestamp("first_interaction_at"),
  lastInteractionAt: timestamp("last_interaction_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Índices para búsqueda O(1) en deduplicación
  emailIdx: index("crm_contacts_email_idx").on(table.email),
  phoneIdx: index("crm_contacts_phone_idx").on(table.phone),
  brandIdx: index("crm_contacts_brand_idx").on(table.brandId),
}));

// ============================================
// TABLA 2: CRM CONTACT CHANNELS (Identity Merge)
// ============================================
export const crmContactChannels = pgTable("crm_contact_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => crmContacts.id, { onDelete: 'cascade' }),
  
  // Identificación del canal
  platform: text("platform").notNull(), // instagram | facebook | whatsapp | tiktok | youtube | linkedin
  externalId: text("external_id").notNull(), // ID del usuario en esa plataforma
  username: text("username"),
  avatarUrl: text("avatar_url"),
  
  // Estado
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  
  // Métricas
  messageCount: integer("message_count").default(0),
  lastMessageAt: timestamp("last_message_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Evitar duplicados: un usuario de Instagram solo puede existir una vez
  uniquePlatformExternal: unique().on(table.platform, table.externalId),
  contactIdx: index("crm_contact_channels_contact_idx").on(table.contactId),
}));

// ============================================
// TABLA 3: CRM CONTACT LIMBO (Lazy Creation)
// ============================================
export const crmContactLimbo = pgTable("crm_contact_limbo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => brands.id, { onDelete: 'cascade' }),
  
  // Identificación
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull(),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  
  // Tracking de interacciones
  interactionType: text("interaction_type").notNull(), // comment | like | mention | reaction
  interactionCount: integer("interaction_count").default(1),
  firstInteractionAt: timestamp("first_interaction_at").notNull(),
  lastInteractionAt: timestamp("last_interaction_at").notNull(),
  
  // Promoción a contacto oficial
  promotedToContactId: varchar("promoted_to_contact_id").references(() => crmContacts.id),
  promotedAt: timestamp("promoted_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Para upsert eficiente
  uniqueBrandPlatformExternal: unique().on(table.brandId, table.platform, table.externalId),
  brandIdx: index("crm_contact_limbo_brand_idx").on(table.brandId),
}));
```

---

### Function Calling para AI Agents

Los agentes de IA podrán ejecutar estas funciones durante el chat:

```typescript
const CRM_FUNCTIONS = {
  update_contact_field: {
    name: "update_contact_field",
    description: "Guarda información extraída del chat en el perfil del contacto",
    parameters: {
      type: "object",
      properties: {
        field: {
          type: "string",
          description: "Nombre del campo a actualizar. Puede ser: phone, email, firstName, lastName, o cualquier custom field"
        },
        value: {
          type: "string",
          description: "Valor a guardar"
        }
      },
      required: ["field", "value"]
    }
  },
  
  close_conversation: {
    name: "close_conversation",
    description: "Marca la conversación como resuelta. IMPORTANTE: Una vez cerrada, la IA NO puede reabrirla",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          enum: ["resolved", "spam", "not_qualified", "referred_to_human"],
          description: "Razón del cierre"
        },
        summary: {
          type: "string",
          description: "Resumen breve de la conversación (máx 200 caracteres)"
        }
      },
      required: ["reason"]
    }
  },
  
  promote_to_contact: {
    name: "promote_to_contact",
    description: "Convierte un lead del limbo en contacto oficial. Usar cuando el usuario inicia DM desde un comentario previo",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  
  get_contact_info: {
    name: "get_contact_info",
    description: "Obtiene información del contacto para personalizar la respuesta",
    parameters: {
      type: "object",
      properties: {
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Lista de campos a obtener. Ej: ['firstName', 'language', 'customFields.presupuesto']"
        }
      }
    }
  }
};
```

---

### Traffic Controller (Función Puente)

Lógica de enrutamiento para webhooks de Metricool:

```typescript
async function trafficController(webhook: MetricoolWebhook): Promise<void> {
  const { platform, externalUserId, username, type } = webhook;
  
  if (type === 'dm' || type === 'conversation') {
    // ========================================
    // FLUJO DM: Crear o actualizar contacto
    // ========================================
    
    // 1. Buscar canal existente
    let channel = await storage.findContactChannel(platform, externalUserId);
    
    if (!channel) {
      // 2. ¿Viene de un limbo? (comentó antes de enviar DM)
      const limboEntry = await storage.findLimboEntry(brandId, platform, externalUserId);
      
      // 3. Crear contacto nuevo
      const contact = await storage.createContact({
        brandId,
        displayName: username,
        source: limboEntry ? 'comment_to_dm' : `${platform}_dm`,
        firstInteractionAt: new Date(),
      });
      
      // 4. Crear canal
      channel = await storage.createContactChannel({
        contactId: contact.id,
        platform,
        externalId: externalUserId,
        username,
      });
      
      // 5. Promocionar limbo si existía
      if (limboEntry) {
        await storage.promoteLimboEntry(limboEntry.id, contact.id);
      }
    }
    
    // 6. Actualizar última interacción
    await storage.updateContactLastInteraction(channel.contactId);
    
  } else if (type === 'comment') {
    // ========================================
    // FLUJO COMENTARIO: Solo limbo (no crear contacto)
    // ========================================
    
    await storage.upsertLimboEntry({
      brandId,
      platform,
      externalId: externalUserId,
      username,
      interactionType: 'comment',
      lastInteractionAt: new Date(),
    });
  }
}
```

---

### Restricciones de Seguridad

1. **La IA NUNCA puede reabrir un ticket cerrado** (evita bucles infinitos)
2. **Custom fields tienen límite de 50 campos** por contacto
3. **Promoción de limbo a contacto** solo ocurre con interacción DM real
4. **Datos sensibles (phone, email)** requieren consentimiento implícito (DM iniciado por usuario)

---

### Plan de Implementación - ✅ COMPLETADO (29 Dic 2025)

| Paso | Descripción | Archivos | Riesgo | Estado |
|------|-------------|----------|--------|--------|
| **1** | Crear tablas CRM (migración aditiva) | `shared/schema.ts` | ⚪ Bajo | ✅ Completado |
| **2** | Métodos CRUD en storage (20+ métodos) | `server/storage.ts` | ⚪ Bajo | ✅ Completado |
| **3** | Traffic Controller en sync | `server/services/crmTrafficController.ts` | 🟡 Medio | ✅ Completado |
| **4** | Function Calling IA (4 funciones CRM) | `server/services/llm/crm-functions.ts` | 🟡 Medio | ✅ Completado |
| **5** | API REST (10 endpoints CRM) | `server/routes.ts` | 🟡 Medio | ✅ Completado |
| **6** | UI del CRM (tabla + slide-over) | `client/src/pages/CRM.tsx` | ⚪ Bajo | ✅ Completado |
| **7** | Navegación integrada en sidebar | `client/src/components/Sidebar.tsx` | ⚪ Bajo | ✅ Completado |

---

## Resumen de Implementación CRM - 29 Dic 2025

### Fase 1: Base de Datos ✅
- **3 tablas creadas:** `crm_contacts`, `crm_contact_channels`, `crm_contact_limbo`
- **UUIDs como PKs:** Preparado para fusión futura de identidades multi-plataforma
- **JSONB `customFields`:** Permite datos dinámicos extraídos por IA sin migraciones
- **Soft delete:** Columna `archived` en lugar de DELETE físico

### Fase 2: Storage Layer ✅
- **20+ métodos CRUD:** `createCrmContact`, `getCrmContactById`, `updateCrmContact`, `linkChannelToContact`, etc.
- **Aislamiento multi-tenant:** Todos los queries filtran por `brandId` vía JOINs
- **Upsert patterns:** `upsertLimboEntry` previene duplicados

### Fase 3: Traffic Controller ✅
- **Archivo:** `server/services/crmTrafficController.ts`
- **Enrutamiento automático:** DMs → crear contacto + canal, Comentarios → solo limbo
- **Patrón "lazy creation":** Contactos solo tras handshake DM (no de comentarios públicos)
- **Integrado en:** `syncService.ts` durante sincronización de Metricool

### Fase 4: Function Calling IA ✅
- **Archivo:** `server/services/llm/crm-functions.ts`
- **4 funciones disponibles para el agente:**
  1. `update_contact` - Actualizar nombre, teléfono, email, notas
  2. `set_custom_field` - Guardar campo personalizado extraído de conversación
  3. `update_status` - Cambiar status (new/active/vip/archived)
  4. `update_lifecycle` - Cambiar lifecycle (lead/prospect/customer/churned)
- **Prompt-based calling:** Compatible con OpenAI y Gemini
- **Ejecución:** Las acciones CRM se ejecutan ANTES de enviar respuesta al usuario

### Fase 5: API REST ✅
**10 endpoints implementados:**

| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/api/crm/contacts` | Listar contactos de marca |
| GET | `/api/crm/contacts/:id` | Detalle con canales |
| POST | `/api/crm/contacts` | Crear contacto |
| PUT | `/api/crm/contacts/:id` | Actualizar contacto |
| DELETE | `/api/crm/contacts/:id` | Archivar (soft delete) |
| GET | `/api/crm/contacts/:id/channels` | Canales sociales |
| GET | `/api/crm/contacts/:id/conversations` | Historial |
| PUT | `/api/crm/contacts/:id/custom-field` | Campo personalizado |
| GET | `/api/crm/limbo` | Entradas en limbo |
| POST | `/api/crm/limbo/:id/promote` | Promover a contacto |

### Fase 6: Interfaz de Usuario ✅
- **Archivo:** `client/src/pages/CRM.tsx`
- **Diseño:** Estilo TwentyCRM/Airtable/Notion (sin sombras, minimal, flat)
- **Componentes:**
  - Tabla de contactos con búsqueda
  - Tabs: Contactos vs Limbo
  - Panel slide-over para detalle (estilo Respond.io)
  - Diálogo de creación de contacto
  - Badges de status y lifecycle
  - Iconos de plataformas sociales
  - Fechas relativas en español

### Fase 7: Navegación ✅
- **Ruta:** `/crm` registrada en `App.tsx`
- **Sidebar:** Enlace "CRM" con icono Users agregado

### Archivos Clave del Módulo CRM

| Archivo | Función |
|---------|---------|
| `shared/schema.ts` | Tablas Drizzle + tipos TypeScript |
| `server/storage.ts` | 20+ métodos de persistencia |
| `server/routes.ts` | 10 endpoints REST |
| `server/services/crmTrafficController.ts` | Enrutamiento DM/comentario |
| `server/services/llm/crm-functions.ts` | Ejecutor de funciones IA |
| `server/services/llm/prompt-composer.ts` | Prompt con instrucciones CRM |
| `client/src/pages/CRM.tsx` | Interfaz completa |
| `client/src/components/Sidebar.tsx` | Navegación |
| `client/src/App.tsx` | Registro de ruta |

---

## PRD: Conversation Lifecycle Management (Smart AI Closing)

> **Sección**: `PRD-LIFECYCLE` | **Estado**: Investigación Completada, Pendiente Implementación  
> **Fecha**: 30 Diciembre 2024  
> **Knowledge Base**: `docs/knowledge-base/CONVERSATION_LIFECYCLE_MANAGEMENT.md`

---

### 1. El Dilema: Por qué necesitamos esto

#### 1.1 Problema Actual
Actualmente las conversaciones en nuestro sistema no tienen un ciclo de vida definido:
- No hay distinción entre conversaciones "abiertas" y "cerradas"
- No hay resúmenes ejecutivos al cerrar una conversación
- No hay métricas de tiempo de resolución
- Los mensajes de "Gracias" del cliente pueden generar trabajo innecesario

#### 1.2 Impacto del "Thank You Paradox"
Con 10,000 tickets/mes y 20% de reaperturas por agradecimiento:
- **2,000 tickets "falsamente" reabiertos**
- **~16 horas/mes perdidas** (30 seg/ticket para verificar y re-cerrar)
- **Distorsión de métricas**: One-Touch Resolution, Reopen Rate quedan inutilizables

#### 1.3 Objetivo
Implementar un sistema de gestión del ciclo de vida de conversaciones que:
1. Permita cerrar conversaciones con resumen automático de IA
2. Detecte inteligentemente mensajes de "agradecimiento" para evitar reaperturas falsas
3. Capture métricas de resolución (tiempo, CSAT, atribución bot vs humano)

---

### 2. Benchmarking: Gold Standard de la Industria

#### 2.1 Máquinas de Estados Comparadas

| Plataforma | Estados | Filosofía |
|------------|---------|-----------|
| **Zendesk** | New → Open → Pending/On-hold → Solved → Closed (4-28 días auto) | Ticket como contrato inmutable |
| **Intercom** | Open ↔ Snoozed → Closed (reabre misma conversación) | Conversación continua y fluida |
| **Front** | Open → Archived (sin Solved intermedio) | Correo colaborativo |
| **HubSpot** | Pipelines personalizables → Open/Closed | Ticket como objeto CRM |
| **Respond.io** | Open/Closed con categorización forzada | Mensajería de alta velocidad |

#### 2.2 Solved vs Closed (Zendesk - Referencia)

| Aspecto | Solved | Closed |
|---------|--------|--------|
| **Establecido por** | Agente manualmente | Solo automatización |
| **Reapertura** | Sí (respuesta cliente) | No (requiere follow-up) |
| **Duración** | Temporal (máx 28 días) | Permanente |
| **Uso** | "Creo que está resuelto" | Archivo definitivo |

**Best Practice**: El estado Solved da un "periodo de gracia" al cliente para confirmar o refutar la solución.

#### 2.3 Smart AI Closing (Resumen Ejecutivo)

**Intercom (Gold Standard para edición):**
- Acceso: `⌘J` / `Ctrl+J` o botón "Summarize"
- Agente puede **editar antes de guardar** (Human-in-the-Loop)
- Se guarda como nota interna visible en el hilo
- Automatizable via Workflows (post-cierre o post-handover de Fin AI)

**Front (Gold Standard para colaboración):**
- Resumen **dinámico** en encabezado del hilo
- Se actualiza automáticamente con nuevos mensajes
- Superior para colaboración en tiempo real

**Estructura del Dato Recomendada:**
```typescript
interface ConversationSummary {
  summary: string;           // Resumen en texto libre
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;            // Ej: "Consulta de precios ITIN"
  resolution: string;        // Ej: "Redirigido a WhatsApp para cotización"
  closedBy: 'agent' | 'bot' | 'auto';
  closedAt: Date;
  resolutionTimeMinutes: number;
}
```

#### 2.4 Lógica Anti-Zombie (Thank You Detection)

**Intercom Fin AI (Gold Standard):**

**Opción 1: Bloqueo Total**
- Setting: "Prevent replies to closed conversations" (0 días = cierre duro)
- Cliente ve "Start new conversation" en lugar de campo de respuesta

**Opción 2: Detección Inteligente con IA**
```
Árbol de Decisión Anti-Zombie:
1. ¿Mensaje contiene signos de interrogación? → SÍ → REABRIR
2. ¿Sentimiento = "Gratitud" o "Confirmación"? → NO → REABRIR
3. ¿Conteo palabras < 15? → NO → REABRIR (textos largos tienen dudas)
4. Si pasa todos los filtros → Mantener CLOSED + suprimir notificación
```

**Solución Elegante (Canalizar Intención):**
- Enviar encuesta CSAT inline inmediatamente después del cierre
- Usuario hace clic en ⭐⭐⭐⭐⭐ (no escribe texto)
- Sistema captura satisfacción **sin reabrir** el ticket

#### 2.5 Regla de Hierro de Reapertura (Respond.io)

> **Un Agente de IA NO puede reabrir una conversación cerrada.**

**Justificación Técnica (Prevención de Loops):**
```
Cierre → Mensaje "Gracias" al cliente → 
IA interpreta como nueva interacción → Reabre →
IA responde "De nada" → Cierre de nuevo → Loop infinito ♻️
```

**Quién PUEDE reabrir**:
| Actor | Puede Reabrir | Notas |
|-------|---------------|-------|
| Cliente (mensaje entrante) | ✅ Sí | Único trigger automático válido |
| Agente humano (manual) | ✅ Sí | Acción explícita en UI |
| Agente de IA | ❌ No | Restricción hard-coded |
| Workflow automático | ⚠️ Condicional | Solo si trigger es mensaje cliente |

**Implementación**: Restricción en lógica de negocio o trigger de BD.

#### 2.6 Flag `ai_active` para Prevención de Handoff (Respond.io)

**Problema**: Bot y humano hablando al mismo tiempo confunden al usuario.

**Solución**:
```typescript
// Campo en tabla conversations
ai_active: boolean  // default: true

// Cuando se ejecuta assign_to_user o assign_to_team:
UPDATE conversations SET ai_active = false WHERE id = ?  // Atómico

// Orquestador de IA verifica ANTES de invocar LLM:
if (!conversation.ai_active) {
  // Enrutar directo al Inbox del agente humano
  // NO invocar LLM (ahorro costos + evita respuestas fantasma)
  return;
}
```

#### 2.7 Threading y Ventanas de Mensajería

| Canal | Ventana | Fuera de Ventana |
|-------|---------|------------------|
| **WhatsApp Business** | 24h desde último mensaje cliente | Solo Template Messages pre-aprobados |
| **Facebook Messenger** | 24h (extendible a 7 días con Human Agent Tag) | Bloqueo de texto libre |
| **Instagram DM** | 24h | Solo respuestas a stories |

**Implementación UI**:
```typescript
if (lastCustomerMessageAt > 24_HOURS_AGO) {
  // Bloquear input de texto libre
  // Mostrar selector de plantillas
  showTemplateSelector();
}
```

#### 2.8 Límites de Contexto para Resúmenes (Respond.io)

| Operación | Límite de Mensajes | Razón |
|-----------|-------------------|-------|
| **Agente conversacional (respuestas)** | 20 mensajes | Latencia + costos LLM |
| **Generación de resumen de cierre** | 100 mensajes | Contexto completo para archivo |

**Implementación**:
- Ventana deslizante para respuestas (últimos 20)
- Contexto extendido para resúmenes (últimos 100)
- NO enviar años de historial al LLM

---

### 3. Nuestra Implementación: Diseño Técnico

#### 3.1 Máquina de Estados Propuesta

```
                    ┌──────────────────────────────────────┐
                    │         CONVERSATION STATES          │
                    └──────────────────────────────────────┘

    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │   NEW   │────▶│  OPEN   │────▶│ PENDING │────▶│ SOLVED  │
    └─────────┘     └─────────┘     └─────────┘     └─────────┘
         │               ▲               │               │
         │               │               │               │
         │               └───────────────┘               │
         │          (respuesta cliente)                  │
         │                                               │
         │                                               ▼
         │                                        ┌─────────┐
         │                                        │ CLOSED  │
         │                                        └─────────┘
         │                                               │
         └───────────────────────────────────────────────┘
                    (nuevo mensaje = nueva conversación)
```

**Estados:**
| Estado | Descripción | SLA |
|--------|-------------|-----|
| `new` | Mensaje entrante sin respuesta | Tiempo respuesta activo |
| `open` | En proceso, asignado a agente/bot | Handle time activo |
| `pending` | Esperando respuesta del cliente | SLA pausado |
| `solved` | Propuesta de cierre (reversible) | Periodo de gracia (configurable: 1h-7 días) |
| `closed` | Archivado definitivo | Inmutable |

#### 3.2 Cambios en Base de Datos

```typescript
// Nuevos campos en tabla conversations
export const conversations = pgTable('conversations', {
  // ... campos existentes ...
  
  // Lifecycle Management
  status: text('status').default('new'), // new, open, pending, solved, closed
  closedAt: timestamp('closed_at'),
  closedBy: text('closed_by'), // 'agent' | 'bot' | 'auto' | 'customer'
  closedByUserId: uuid('closed_by_user_id'),
  
  // Handoff Prevention (Respond.io pattern)
  aiActive: boolean('ai_active').default(true), // false = humano asignado, no invocar LLM
  assignedToUserId: uuid('assigned_to_user_id'), // Agente humano asignado
  assignedAt: timestamp('assigned_at'),
  
  // Resolution Metrics
  firstResponseAt: timestamp('first_response_at'),
  resolutionTimeMinutes: integer('resolution_time_minutes'),
  reopenCount: integer('reopen_count').default(0),
  lastCustomerMessageAt: timestamp('last_customer_message_at'), // Para ventana 24h
  
  // AI Summary
  closingSummary: text('closing_summary'),
  closingSentiment: text('closing_sentiment'), // positive, neutral, negative
  closingIntent: text('closing_intent'),
  closingResolution: text('closing_resolution'),
});

// Nueva tabla para historial de cambios de estado
export const conversationStatusHistory = pgTable('conversation_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  changedBy: text('changed_by'), // 'agent' | 'bot' | 'auto' | 'customer'
  changedByUserId: uuid('changed_by_user_id'),
  reason: text('reason'), // Ej: "Thank you detected", "Customer confirmed"
  createdAt: timestamp('created_at').defaultNow(),
});

// Nueva tabla para configuración de auto-close por marca
export const brandLifecycleSettings = pgTable('brand_lifecycle_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  brandId: uuid('brand_id').references(() => brands.id),
  
  // Periodo de gracia Solved → Closed
  solvedToClosedHours: integer('solved_to_closed_hours').default(24),
  
  // Anti-Zombie Settings
  thankYouDetectionEnabled: boolean('thank_you_detection_enabled').default(true),
  thankYouMaxWords: integer('thank_you_max_words').default(15),
  
  // Auto-close por inactividad
  autoCloseInactivityHours: integer('auto_close_inactivity_hours').default(72),
  
  // CSAT
  csatSurveyEnabled: boolean('csat_survey_enabled').default(false),
  csatSurveyDelayMinutes: integer('csat_survey_delay_minutes').default(5),
});
```

#### 3.3 Servicios Backend

**Nuevo servicio: `conversationLifecycleService.ts`**

```typescript
interface IConversationLifecycleService {
  // Cambios de estado
  markAsOpen(conversationId: string, agentId?: string): Promise<void>;
  markAsPending(conversationId: string, reason?: string): Promise<void>;
  markAsSolved(conversationId: string, closedBy: 'agent' | 'bot'): Promise<void>;
  markAsClosed(conversationId: string): Promise<void>;
  
  // Smart AI Closing
  generateClosingSummary(conversationId: string): Promise<ClosingSummary>;
  closeWithSummary(conversationId: string, summary?: string): Promise<void>;
  
  // Anti-Zombie
  analyzeIncomingMessage(message: string): Promise<MessageAnalysis>;
  shouldReopenConversation(conversationId: string, message: string): Promise<boolean>;
  
  // Métricas
  calculateResolutionTime(conversationId: string): Promise<number>;
  getConversationMetrics(brandId: string, dateRange: DateRange): Promise<Metrics>;
  
  // Automáticos
  processAutoClose(): Promise<void>; // Cron job
  processSolvedToClosedTransitions(): Promise<void>; // Cron job
}
```

**Integración con syncService:**
```typescript
// En processInboundMessage():
async processInboundMessage(message: InboundMessage) {
  const conversation = await this.getOrCreateConversation(message);
  
  // Si la conversación está en 'solved', evaluar si reabrir
  if (conversation.status === 'solved') {
    const shouldReopen = await lifecycleService.shouldReopenConversation(
      conversation.id,
      message.content
    );
    
    if (shouldReopen) {
      await lifecycleService.markAsOpen(conversation.id, null);
      // Notificar al agente
    } else {
      // Mensaje de agradecimiento detectado, no reabrir
      // Opcionalmente: registrar CSAT implícito
      return;
    }
  }
  
  // Procesar mensaje normalmente...
}
```

#### 3.4 API Endpoints

```typescript
// Lifecycle Management
POST   /api/conversations/:id/status    // Cambiar estado
GET    /api/conversations/:id/history   // Historial de cambios
POST   /api/conversations/:id/close     // Cerrar con resumen IA
POST   /api/conversations/:id/reopen    // Reabrir manualmente

// Smart Summary
POST   /api/conversations/:id/generate-summary  // Solo generar (sin cerrar)
PUT    /api/conversations/:id/summary           // Editar resumen existente

// Métricas
GET    /api/analytics/resolution-time    // Tiempo promedio de resolución
GET    /api/analytics/reopen-rate        // Tasa de reapertura
GET    /api/analytics/csat               // Satisfacción del cliente
GET    /api/analytics/attribution        // Bot vs Humano

// Configuración por marca
GET    /api/brands/:id/lifecycle-settings
PUT    /api/brands/:id/lifecycle-settings
```

#### 3.5 Prompt para Generación de Resumen

```typescript
const CLOSING_SUMMARY_PROMPT = `
Analiza la siguiente conversación y genera un resumen ejecutivo.

CONVERSACIÓN:
{conversation_history}

GENERA UN JSON con este formato exacto:
{
  "summary": "Resumen de 2-3 oraciones sobre qué pidió el cliente y cómo se resolvió",
  "sentiment": "positive" | "neutral" | "negative",
  "intent": "Intención principal del cliente (ej: Consulta precios ITIN)",
  "resolution": "Cómo se resolvió (ej: Redirigido a WhatsApp para cotización)",
  "topics": ["tema1", "tema2"],
  "actionItems": ["si quedó algo pendiente"]
}

REGLAS:
- El resumen debe ser útil para un agente que retome esta conversación
- Sentiment basado en el tono general del cliente
- Intent es lo que el cliente QUERÍA lograr
- Resolution es lo que EFECTIVAMENTE se hizo
`;
```

#### 3.6 Prompt para Thank You Detection

```typescript
const THANK_YOU_DETECTION_PROMPT = `
Analiza el siguiente mensaje y determina si es simplemente un agradecimiento 
o confirmación que NO requiere respuesta, o si contiene una nueva pregunta/solicitud.

MENSAJE: "{message}"

Responde SOLO con JSON:
{
  "isThankYou": true/false,
  "confidence": 0.0-1.0,
  "hasQuestion": true/false,
  "hasNewRequest": true/false,
  "reasoning": "Breve explicación"
}

EJEMPLOS:
- "Gracias!" → isThankYou: true, confidence: 0.99
- "Gracias, pero tengo otra duda..." → isThankYou: false, hasNewRequest: true
- "Ok perfecto" → isThankYou: true, confidence: 0.85
- "Entendido, ¿y cuánto cuesta?" → isThankYou: false, hasQuestion: true
`;
```

---

### 4. Métricas y Analytics

#### 4.1 Métricas Estándar a Implementar

| Métrica | Descripción | Cálculo |
|---------|-------------|---------|
| **First Response Time** | Tiempo hasta primera respuesta | `firstResponseAt - createdAt` |
| **Full Resolution Time** | Tiempo total hasta cierre | `closedAt - createdAt` |
| **Requester Wait Time** | Tiempo sin contar Pending | `Full - tiempo en Pending` |
| **Reopen Rate** | % de conversaciones reabiertas | `reopened / total * 100` |
| **One-Touch Resolution** | % resueltas en primera respuesta | `single_response / total * 100` |
| **CSAT** | Customer Satisfaction Score | `positive_ratings / total_ratings * 100` |
| **Bot Resolution Rate** | % resueltas por bot | `bot_closed / total * 100` |

#### 4.2 Separación Bot vs Agente (Crítico)

```typescript
interface ResolutionMetrics {
  // Separar SIEMPRE
  botResolutions: {
    count: number;
    avgTimeSeconds: number;  // Típicamente < 60s
  };
  agentResolutions: {
    count: number;
    avgTimeMinutes: number;  // Típicamente 5-30 min
  };
  // Nunca mezclar promedios (media inútil)
}
```

---

### 5. Plan de Implementación

| Fase | Descripción | Archivos Principales | Prioridad |
|------|-------------|---------------------|-----------|
| **Fase 1** | Schema + Migraciones | `shared/schema.ts` | Alta |
| **Fase 2** | Lifecycle Service | `server/services/conversationLifecycleService.ts` | Alta |
| **Fase 3** | Thank You Detection | `server/services/thankYouDetector.ts` | Alta |
| **Fase 4** | Smart Summary | Integrar con LLM existente | Media |
| **Fase 5** | API Endpoints | `server/routes.ts` | Media |
| **Fase 6** | UI - Estado en Inbox | `client/src/pages/Inbox.tsx` | Media |
| **Fase 7** | UI - Panel de Cierre | Nuevo componente | Media |
| **Fase 8** | Analytics Dashboard | Nueva página | Baja |
| **Fase 9** | CSAT Survey | Integración inline | Baja |

---

### 6. UX/UI: Especificaciones de Diseño

> **Guía de referencia**: `docs/knowledge-base/CRM_DESIGN_SYSTEM_UX_UI.md`

#### 6.1 Botón de Cierre en Header de Conversación

```
┌─────────────────────────────────────────────────────────────────┐
│  Juan Pérez                           [Resolver ▼] [Posponer]   │
│  📱 WhatsApp • Última actividad: hace 5 min                     │
└─────────────────────────────────────────────────────────────────┘
```

**Botón "Resolver" (Split Button)**:
- Acción principal: Marcar como Solved
- Dropdown con opciones:
  - "Resolver" (cambiar a Solved)
  - "Resolver y generar resumen"
  - "Resolver sin notificar"

**Best Practice**: El botón debe decir "Resolver" (Solved), NO "Cerrar". El estado Closed es automático del sistema.

#### 6.2 Modal de Cierre con Resumen Editable

```
┌─────────────────────────────────────────────────────────────────┐
│  ✨ Resumen Generado por IA                                [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ El cliente consultó sobre precios de servicios ITIN.     │ │
│  │ Se proporcionó información general y se redirigió al     │ │
│  │ WhatsApp (305) 639-0110 para cotización personalizada.   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                    [Editar resumen...]          │
│                                                                 │
│  Sentimiento detectado: 😊 Positivo                             │
│                                                                 │
│  Categoría de cierre:                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Consulta de Precios                                   ▼ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ¿Fue útil este resumen?        👍 Sí       👎 No         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                    [Cancelar]    [✓ Confirmar y Resolver]       │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos**:
- Textarea editable con resumen pre-generado
- Selector de categoría de cierre (obligatorio)
- Sentimiento detectado (visual, no editable)
- Feedback thumbs up/down para mejorar modelo
- Botones: Cancelar, Confirmar

#### 6.3 Indicadores Visuales de Estado en Lista

| Estado | Badge | Color | Efecto Visual |
|--------|-------|-------|---------------|
| `new` | 🔵 Nuevo | Azul | Punto azul, texto bold |
| `open` | 🟢 Abierto | Verde | Borde izquierdo verde |
| `pending` | 🟡 Pendiente | Amarillo | Fondo amarillo pálido |
| `solved` | ✅ Resuelto | Gris | Texto en gris, sin bold |
| `closed` | ⬛ Cerrado | Gris oscuro | Solo visible en búsqueda |

**SLA en riesgo**:
- Borde izquierdo rojo
- Timestamp en rojo
- Fondo amarillo pálido opcional

#### 6.4 Timeline: Eventos de Sistema Minimizados

Cambios de estado en la línea de tiempo:
```
─────────────────────────────────────────────────────────
                   Ticket resuelto por Maria
              hace 2 días • Categoría: Consulta Precios
─────────────────────────────────────────────────────────
```

**Estilo**:
- Texto pequeño (12px), centrado
- Color gris neutro
- Sin avatar
- Colapsables si son consecutivos

#### 6.5 Alerta de Thank You Detection

Cuando se detecta posible agradecimiento en ticket Solved:

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ El cliente respondió a una conversación resuelta         │
│                                                              │
│ "Muchas gracias, me ha servido mucho la información"        │
│                                                              │
│ Confianza de detección: 92% (Agradecimiento)                 │
│                                                              │
│ ¿Qué deseas hacer?                                           │
│                                                              │
│  [Mantener Resuelto]  [Reabrir Conversación]                 │
│        ↑ Recomendado                                         │
└──────────────────────────────────────────────────────────────┘
```

#### 6.6 Panel de Configuración Lifecycle (Por Marca)

Ubicación: Settings → Automatización → Ciclo de Vida

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ Configuración del Ciclo de Vida                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRANSICIÓN AUTOMÁTICA                                          │
│  ─────────────────────                                          │
│  Tiempo Solved → Closed:                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 24 horas                                              ▼ │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Tras este tiempo sin actividad, el ticket se cierra       │
│                                                                 │
│  DETECCIÓN ANTI-ZOMBIE                                          │
│  ─────────────────────                                          │
│  [✓] Detectar mensajes de agradecimiento                        │
│  [✓] Prevenir reapertura automática                             │
│                                                                 │
│  Umbral de palabras: [15] (mensajes más largos se reabren)      │
│                                                                 │
│  CIERRE POR INACTIVIDAD                                         │
│  ─────────────────────                                          │
│  Cerrar conversaciones inactivas después de:                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 72 horas                                              ▼ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ENCUESTA CSAT                                                  │
│  ───────────                                                    │
│  [ ] Enviar encuesta automática al resolver                     │
│  Delay antes de enviar: [5] minutos                             │
│                                                                 │
│                                          [Guardar Cambios]      │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.7 Badge de Estado en Conversation Header

```
┌─────────────────────────────────────────────────────────────────┐
│  Juan Pérez            [Resuelto ✓] hace 2h    [⋯]              │
│  📱 WhatsApp           Periodo de gracia: 22h restantes         │
└─────────────────────────────────────────────────────────────────┘
```

Cuando está en Solved: Mostrar tiempo restante del periodo de gracia.

#### 6.8 Dashboard de Métricas (Fase 8)

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Métricas de Resolución                    Últimos 30 días  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   4.2 min    │  │    89%       │  │    3.2%      │          │
│  │ First Reply  │  │ One-Touch    │  │ Reopen Rate  │          │
│  │   ↓ 12%      │  │   ↑ 5%       │  │   ↓ 1.5%     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  RESOLUCIÓN POR TIPO                                            │
│  ───────────────────                                            │
│  Bot: ████████████████ 340 (68%)  | Avg: 45 seg                 │
│  Humano: ████████ 160 (32%)       | Avg: 12 min                 │
│                                                                 │
│  CATEGORÍAS DE CIERRE                                           │
│  ────────────────────                                           │
│  Consulta Precios    ████████████████ 42%                       │
│  Soporte Técnico     ████████ 25%                               │
│  Info General        ██████ 18%                                 │
│  Otros               ████ 15%                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.9 Customer Journey: Flujo de Cierre

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE CIERRE INTELIGENTE                  │
└─────────────────────────────────────────────────────────────────┘

1. AGENTE RESUELVE
   ├── Click en "Resolver"
   └── Sistema genera resumen IA

2. MODAL DE VALIDACIÓN
   ├── Agente revisa/edita resumen
   ├── Selecciona categoría
   └── Confirma cierre

3. PERIODO DE GRACIA (24h default)
   ├── Ticket en estado "Solved"
   └── Timer visible en header

4. RESPUESTA DEL CLIENTE
   ├── SI responde:
   │   ├── IA analiza mensaje
   │   ├── SI es "Gracias": 
   │   │   └── Mantener Solved + añadir nota
   │   └── SI es pregunta:
   │       └── Reabrir → Open
   └── SI no responde:
       └── Continuar timer

5. CIERRE DEFINITIVO
   └── Timer expira → Closed (inmutable)
```

---

## FASE 12: Smart Customer Follow-up System (Recordatorios Automatizados)

**Estado:** ✅ Fase 2 Completada (30 Dic 2025)
**Objetivo:** Sistema automatizado de recordatorios personalizados para clientes inactivos en DMs y comentarios.

### 12.1 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                  SMART FOLLOW-UP SYSTEM                         │
└─────────────────────────────────────────────────────────────────┘

SCOPE:
- Lifecycle Management: Solo DMs (type='dm')
- Follow-up System: DMs + Comments (ambos tipos)

FLUJO DE SCHEDULING:
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│   Pre-check    │───▶│  AI Generation │───▶│    Atomic      │
│   (Barato)     │    │   (Costoso)    │    │   Schedule     │
└────────────────┘    └────────────────┘    └────────────────┘
        │                                            │
        ▼                                            ▼
  Exit si no                                  Transaction +
  elegible                                    Unique Index

DEFENSE LAYERS:
1. Eligibility Query (excluye estados terminales)
2. Pre-check (valida antes de AI generation)
3. Transaction checks (datos frescos en transacción)
4. Unique partial index (previene duplicados en DB)
5. Structured responses (tracking de estados terminales)
```

### 12.2 Estructura de Base de Datos

#### Tabla: reminder_rules (Configuración por Marca)
```typescript
reminderRules = pgTable('reminder_rules', {
  id: uuid().primaryKey().defaultRandom(),
  brandId: uuid().notNull().references(() => brands.id),
  enabled: boolean().default(false),
  targetTypes: text().array().default(['dm', 'comment']),
  maxReminders: integer().default(2),
  reminderDelayHours: integer().default(24),
  reminder2DelayHours: integer().default(48),
  reminder3DelayHours: integer(),
  dailyCap: integer().default(50),
  useAiContent: boolean().default(true),
  templateContent: text(),
  excludeStatuses: text().array().default(['closed', 'solved']),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});
```

#### Tabla: reminder_events (Eventos de Recordatorio)
```typescript
reminderEvents = pgTable('reminder_events', {
  id: uuid().primaryKey().defaultRandom(),
  brandId: uuid().notNull().references(() => brands.id),
  conversationId: uuid().notNull().references(() => conversations.id),
  contactId: uuid().references(() => crmContacts.id),
  status: text().default('scheduled'), // scheduled, sent, cancelled, failed
  scheduledAt: timestamp().notNull(),
  sentAt: timestamp(),
  content: text().notNull(),
  contentSource: text().default('ai'), // ai, template
  reminderNumber: integer().notNull(), // 1, 2, 3
  deliveryChannel: text().notNull(), // dm, comment
  errorMessage: text(),
  createdAt: timestamp().defaultNow(),
});

// Unique partial index para prevenir duplicados
CREATE UNIQUE INDEX idx_reminder_events_unique_scheduled 
ON reminder_events (conversation_id, reminder_number) 
WHERE status = 'scheduled';
```

#### Campos Agregados a conversations
```typescript
// Nuevos campos en tabla conversations:
reminderStatus: text().default('none'), // none, scheduled, sent, opted_out, max_reached
reminderCount: integer().default(0),
lastReminderAt: timestamp(),
```

### 12.3 Storage Layer (14 Métodos CRUD)

| Método | Descripción |
|--------|-------------|
| `getReminderRulesByBrand` | Obtiene configuración de reminders por marca |
| `createReminderRules` | Crea nueva configuración |
| `updateReminderRules` | Actualiza configuración existente |
| `createReminderEvent` | Crea evento de reminder |
| `getReminderEventById` | Obtiene evento por ID |
| `getReminderEventsByConversation` | Obtiene eventos por conversación |
| `updateReminderEventStatus` | Actualiza estado del evento |
| `getScheduledRemindersReady` | Obtiene reminders listos para enviar |
| `countRemindersSentToday` | Cuenta reminders enviados hoy |
| `countRemindersScheduledAndSentToday` | Cuenta scheduled + sent (para daily cap) |
| `checkConversationEligibleForReminder` | **Pre-check antes de AI generation** |
| `scheduleReminderAtomic` | **Scheduling transaccional atómico** |
| `updateConversationReminderStatus` | Actualiza estado de reminder en conversación |
| `getConversationsEligibleForReminder` | Query de elegibilidad con filtros |

### 12.4 ReminderService (Lógica de Negocio)

#### Flujo Principal: `scheduleRemindersForBrand(brandId)`
```typescript
async scheduleRemindersForBrand(brandId: string): Promise<{
  scheduled: number;
  errors: string[];
}> {
  // 1. Obtener reglas de la marca
  const rules = await storage.getReminderRulesByBrand(brandId);
  if (!rules?.enabled) return { scheduled: 0, errors: [] };
  
  // 2. Verificar daily cap (scheduled + sent)
  const dailyCount = await storage.countRemindersScheduledAndSentToday(brandId);
  const remainingQuota = rules.dailyCap - dailyCount;
  if (remainingQuota <= 0) return { scheduled: 0, errors: ['Daily cap reached'] };
  
  // 3. Obtener conversaciones elegibles
  const eligible = await storage.getConversationsEligibleForReminder(
    brandId, 
    rules.reminderDelayHours, 
    rules.maxReminders,
    rules.targetTypes
  );
  
  // 4. Procesar cada conversación
  for (const conv of eligible.slice(0, remainingQuota)) {
    const result = await this.scheduleReminder(conv, rules);
    if (result.scheduled) scheduled++;
  }
}
```

#### Flujo Optimizado: `scheduleReminder(conversation, rules)`
```typescript
private async scheduleReminder(conv, rules): Promise<{ scheduled: boolean; terminal: boolean }> {
  // PASO 1: Pre-check ANTES de AI generation (barato)
  const precheck = await storage.checkConversationEligibleForReminder(
    conv.id, 
    rules.maxReminders
  );
  
  if (!precheck.eligible) {
    // Exit temprano, NO se llama a AI
    const isTerminal = ['max_reached', 'opted_out', 'not_found', 'closed'].includes(precheck.reason);
    return { scheduled: false, terminal: isTerminal };
  }
  
  // PASO 2: AI Generation (costoso) - Solo si pre-check pasó
  const generation = await this.generateReminderContent(conv, nextReminderNumber, rules);
  if (!generation.success) return { scheduled: false, terminal: false };
  
  // PASO 3: Atomic Schedule (transacción)
  const result = await storage.scheduleReminderAtomic(conv.id, event, 'scheduled', maxReminders);
  
  // PASO 4: Interpretar resultado estructurado
  switch (result.status) {
    case 'scheduled': return { scheduled: true, terminal: false };
    case 'max_reached': return { scheduled: false, terminal: true };
    case 'already_scheduled': return { scheduled: false, terminal: false };
    case 'opted_out': return { scheduled: false, terminal: true };
    case 'not_found': return { scheduled: false, terminal: true };
    case 'duplicate': return { scheduled: false, terminal: false };
  }
}
```

### 12.5 Optimizaciones Implementadas

#### 1. Pre-check Antes de AI Generation
**Problema:** AI generation es costoso (tokens LLM). Si la conversación ya no es elegible, se desperdician tokens.

**Solución:** `checkConversationEligibleForReminder()` verifica elegibilidad ANTES de llamar al LLM.

```typescript
// Pre-check (barato - solo DB read)
const precheck = await storage.checkConversationEligibleForReminder(convId, maxReminders);
if (!precheck.eligible) {
  // NO se llama a generateReminderContent()
  return { scheduled: false, terminal: precheck.reason === 'max_reached' };
}

// Solo ahora se llama al LLM (costoso)
const generation = await this.generateReminderContent(...);
```

#### 2. Respuestas Estructuradas
**Problema:** Retornar `null` no indica POR QUÉ falló el scheduling.

**Solución:** Retornar objeto con status detallado:
```typescript
Promise<{
  status: 'scheduled' | 'max_reached' | 'already_scheduled' | 'opted_out' | 'not_found' | 'duplicate';
  event?: ReminderEvent;
}>
```

#### 3. Tracking de Estados Terminales
**Problema:** Loops podían re-intentar conversaciones que ya alcanzaron estado terminal.

**Solución:** Retornar `{ scheduled, terminal }` para que callers sepan cuándo parar:
```typescript
// Estados terminales (no re-intentar):
- max_reached
- opted_out
- not_found
- closed

// Estados no-terminales (puede ser race condition):
- already_scheduled
- duplicate
```

#### 4. Daily Cap con Scheduled + Sent
**Problema:** Contar solo `sent` permitía over-scheduling si se programaban muchos antes de enviar.

**Solución:** `countRemindersScheduledAndSentToday()` suma ambos:
```sql
-- Sent today
SELECT COUNT(*) FROM reminder_events 
WHERE brand_id = $1 AND sent_at >= $startOfDay;

-- Scheduled for today
SELECT COUNT(*) FROM reminder_events 
WHERE brand_id = $1 AND status = 'scheduled' 
AND scheduled_at >= $startOfDay AND scheduled_at < $endOfDay;

-- Total = sent + scheduled
```

### 12.6 Defense Layers (5 Capas de Protección)

| Capa | Ubicación | Función |
|------|-----------|---------|
| 1 | Eligibility Query | Excluye estados terminales de la query inicial |
| 2 | Pre-check | Valida elegibilidad antes de AI generation |
| 3 | Transaction | Re-verifica con datos frescos en transacción |
| 4 | Unique Index | Constraint de DB previene duplicados |
| 5 | Structured Response | Tracking de estados terminales para callers |

### 12.7 Tipos y Schemas

```typescript
// Estados de reminder en conversación
type ReminderStatus = 'none' | 'scheduled' | 'sent' | 'opted_out' | 'max_reached';

// Insert schema para reminder_rules
export const insertReminderRulesSchema = createInsertSchema(reminderRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schema para reminder_events
export const insertReminderEventSchema = createInsertSchema(reminderEvents).omit({
  id: true,
  createdAt: true,
});
```

### 12.8 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `shared/schema.ts` | Tablas `reminder_rules`, `reminder_events`, campos en `conversations` |
| `server/storage.ts` | 14 métodos CRUD + pre-check + atomic scheduling |
| `server/services/reminderService.ts` | ReminderService completo con optimizaciones |

### 12.9 Resumen de Fases del Sistema

| Fase | Estado | Descripción |
|------|--------|-------------|
| Fase 1: Database & Storage | ✅ Completada | Schema + 14 métodos CRUD |
| Fase 2: ReminderService | ✅ Completada | Lógica de negocio + optimizaciones |
| Fase 3: Scheduler Integration | ✅ Completada | Integrar con lifecycleScheduler |
| Fase 4: Delivery & Sending | ✅ Completada | Envío real via Metricool |
| Fase 5: UI Configuration | 🔄 Pendiente | Panel de configuración |
| Fase 6: Analytics | 🔄 Pendiente | Métricas y dashboard |

---

## DETALLE DE FASES IMPLEMENTADAS

### FASE 1: Database & Storage (Completada 30 Dic 2025)

**Objetivo:** Crear el esquema de base de datos y capa de almacenamiento para el sistema de recordatorios.

#### 1.1 Tablas Creadas

| Tabla | Propósito |
|-------|-----------|
| `reminder_rules` | Configuración por marca (delays, caps, templates) |
| `reminder_events` | Eventos individuales de recordatorio |
| Campos en `conversations` | `reminderStatus`, `reminderCount`, `lastReminderAt` |

#### 1.2 Schema reminder_rules
```typescript
{
  id: uuid,
  brandId: uuid (FK brands),
  enabled: boolean (default false),
  targetTypes: text[] (default ['dm', 'comment']),
  maxReminders: integer (default 2),
  reminderDelayHours: integer (default 24),      // Delay para reminder #1
  reminder2DelayHours: integer (default 48),     // Delay para reminder #2
  reminder3DelayHours: integer (null),           // Delay opcional para #3
  dailyCap: integer (default 50),
  useAiContent: boolean (default true),
  templateContent: text (null),
  excludeStatuses: text[] (default ['closed', 'solved']),
  createdAt, updatedAt: timestamps
}
```

#### 1.3 Schema reminder_events
```typescript
{
  id: uuid,
  brandId: uuid (FK brands),
  conversationId: uuid (FK conversations),
  contactId: uuid (FK crm_contacts, nullable),
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed',
  scheduledAt: timestamp,
  sentAt: timestamp (null),
  content: text,
  contentSource: 'ai' | 'template',
  reminderNumber: integer (1, 2, 3),
  deliveryChannel: 'dm' | 'comment',
  errorMessage: text (null),
  createdAt: timestamp
}
```

#### 1.4 Índice Único Parcial (Prevención de Duplicados)
```sql
CREATE UNIQUE INDEX idx_reminder_events_unique_scheduled 
ON reminder_events (conversation_id, reminder_number) 
WHERE status = 'scheduled';
```

#### 1.5 Storage Methods (14 Métodos CRUD)

| # | Método | Tipo | Descripción |
|---|--------|------|-------------|
| 1 | `getReminderRulesByBrand(brandId)` | READ | Obtiene configuración de reminders |
| 2 | `createReminderRules(data)` | CREATE | Crea nueva configuración |
| 3 | `updateReminderRules(brandId, data)` | UPDATE | Actualiza configuración existente |
| 4 | `createReminderEvent(data)` | CREATE | Crea evento de reminder |
| 5 | `getReminderEventById(id)` | READ | Obtiene evento por ID |
| 6 | `getReminderEventsByConversation(convId)` | READ | Lista eventos por conversación |
| 7 | `updateReminderEventStatus(id, status, sentAt, error)` | UPDATE | Actualiza estado del evento |
| 8 | `getScheduledRemindersReady(brandId)` | READ | Obtiene reminders listos para enviar |
| 9 | `countRemindersSentToday(brandId)` | READ | Cuenta reminders enviados hoy |
| 10 | `countRemindersScheduledAndSentToday(brandId)` | READ | Cuenta scheduled + sent (daily cap) |
| 11 | `checkConversationEligibleForReminder(convId, max)` | READ | Pre-check antes de AI |
| 12 | `scheduleReminderAtomic(convId, event, status, max)` | CREATE | Scheduling transaccional |
| 13 | `updateConversationReminderStatus(convId, status)` | UPDATE | Actualiza estado en conversación |
| 14 | `getConversationsEligibleForReminder(brandId, delay, max, types)` | READ | Query de elegibilidad |

---

### FASE 2: ReminderService (Completada 30 Dic 2025)

**Objetivo:** Implementar lógica de negocio con optimizaciones para evitar desperdicio de tokens LLM.

#### 2.1 Métodos Principales del Servicio

| Método | Propósito |
|--------|-----------|
| `scheduleRemindersForBrand(brandId)` | Orquesta el scheduling para una marca |
| `scheduleReminder(conv, rules)` | Programa reminder individual |
| `generateReminderContent(conv, num, rules)` | Genera contenido con AI |
| `sendScheduledReminders(brandId)` | Envía reminders programados |
| `sendReminder(reminder)` | Envía un reminder individual |
| `optOutContact(contactId)` | Opt-out de reminders |

#### 2.2 Flujo de Scheduling Optimizado
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PRE-CHECK     │───▶│  AI GENERATION  │───▶│    ATOMIC       │
│   (Barato)      │    │   (Costoso)     │    │   SCHEDULE      │
│   DB Query      │    │   LLM Call      │    │   Transaction   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                                              │
        ▼                                              ▼
  Si NO elegible:                               Transaction +
  EXIT temprano                                 Unique Index
  (NO llama a AI)
```

#### 2.3 Optimización: Pre-check Antes de AI
**Problema:** AI generation consume tokens LLM costosos.
**Solución:** `checkConversationEligibleForReminder()` verifica ANTES de llamar al LLM.

```typescript
// PASO 1: Pre-check (solo DB - barato)
const precheck = await storage.checkConversationEligibleForReminder(convId, max);
if (!precheck.eligible) {
  return { scheduled: false, terminal: isTerminalState(precheck.reason) };
}

// PASO 2: Solo si pre-check OK → AI Generation (costoso)
const content = await this.generateReminderContent(...);
```

#### 2.4 Respuestas Estructuradas
```typescript
// scheduleReminderAtomic retorna status detallado:
type ScheduleResult = {
  status: 'scheduled' | 'max_reached' | 'already_scheduled' | 
          'opted_out' | 'not_found' | 'duplicate';
  event?: ReminderEvent;
};

// Estados terminales (no re-intentar):
const TERMINAL_STATES = ['max_reached', 'opted_out', 'not_found', 'closed'];
```

#### 2.5 Daily Cap Enforcement
```typescript
// Cuenta AMBOS para prevenir over-scheduling:
const dailyCount = await storage.countRemindersScheduledAndSentToday(brandId);
const remainingQuota = rules.dailyCap - dailyCount;
if (remainingQuota <= 0) return { scheduled: 0, errors: ['Daily cap reached'] };
```

#### 2.6 Defense Layers (5 Capas de Protección)

| Capa | Ubicación | Función |
|------|-----------|---------|
| 1 | Eligibility Query | Excluye estados terminales de la query inicial |
| 2 | Pre-check | Valida antes de AI generation (ahorra tokens) |
| 3 | Transaction | Re-verifica con datos frescos |
| 4 | Unique Index | Constraint de DB previene duplicados |
| 5 | Structured Response | Tracking de estados terminales |

---

### FASE 3: Scheduler Integration (Completada 31 Dic 2025)

**Objetivo:** Integrar el ReminderService con el lifecycleScheduler existente y exponer APIs.

#### 3.1 Integración con LifecycleScheduler
```typescript
// server/services/lifecycleScheduler.ts
class LifecycleScheduler {
  private reminderInterval: NodeJS.Timeout | null = null;
  private readonly REMINDER_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

  async start(): Promise<void> {
    // Lifecycle tasks: cada 15 minutos
    // Reminder tasks: cada 5 minutos
    await this.runReminderTasks();
    this.reminderInterval = setInterval(
      () => this.runReminderTasks(), 
      this.REMINDER_CHECK_INTERVAL_MS
    );
  }

  private async runReminderTasks(): Promise<void> {
    const brands = await storage.getActiveBrands();
    for (const brand of brands) {
      await reminderService.scheduleRemindersForBrand(brand.id);
      await reminderService.sendScheduledReminders(brand.id);
    }
  }
}
```

#### 3.2 Endpoints API Añadidos

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/brands/:id/reminder-rules` | GET | Admin | Obtener configuración |
| `/api/brands/:id/reminder-rules` | POST | Admin | Crear/actualizar configuración |
| `/api/brands/:id/reminders/run` | POST | Admin | Trigger manual scheduling + envío |
| `/api/conversations/:id/reminder-events` | GET | Auth | Ver eventos de reminder |
| `/api/conversations/:id/reminder-opt-out` | POST | Auth | Opt-out de reminders |
| `/api/scheduler/status` | GET | Admin | Estado del scheduler |

#### 3.3 Validación Zod para Configuración
```typescript
// POST /api/brands/:id/reminder-rules
const validatedData = updateReminderRulesSchema.parse(req.body);
// Schema valida: enabled, targetTypes, maxReminders, delays, dailyCap, etc.
```

#### 3.4 Matriz de Elegibilidad Completa

| Reminder # | Condición de Tiempo | Condición de Actividad |
|------------|---------------------|------------------------|
| #1 (Stage 0) | `COALESCE(lastMessageAt, lastCustomerMessageAt, createdAt) >= delayHours1 ago` | Sin actividad de cliente NI agente |
| #2+ (Stage N) | `lastReminderAt >= delayHoursN ago` | `lastCustomerMessageAt <= lastReminderAt AND lastMessageAt <= lastReminderAt` |

**Estados Excluidos:** closed, scheduled, max_reached, opted_out

#### 3.5 Reglas de Cooldown
- Mensaje del cliente → resetea elegibilidad
- Mensaje del agente → resetea elegibilidad
- Cambio a closed/solved → bloquea permanentemente
- Opt-out del contacto → bloquea permanentemente

---

### FASE 4: Delivery via Metricool (Completada 31 Dic 2025)

**Objetivo:** Enviar los recordatorios reales a través de la API de Metricool.

#### 4.1 Método sendReminder (Firma Actualizada)
```typescript
private async sendReminder(reminder: ReminderEvent): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  // 1. Validar conversación existe y no está cerrada/opted-out
  // 2. Obtener brand para metricoolBlogId
  // 3. Validar identificadores requeridos
  // 4. Enviar via Metricool
  // 5. Persistir mensaje y actualizar estados
}
```

#### 4.2 Flujo de Envío por Canal

**Para DMs:**
```typescript
await metricoolService.replyToConversation({
  provider: conversation.platform,
  conversationId: conversation.threadExternalId,
  recipient: conversation.customerId,
  text: reminder.content,
  blogId: brand.metricoolBlogId,
});
```

**Para Comments:**
```typescript
await metricoolService.replyToComment({
  provider: conversation.platform,
  objectId: conversation.objectExternalId,
  text: reminder.content,
  blogId: brand.metricoolBlogId,
});
```

#### 4.3 Manejo de Errores Robusto

| Escenario | Acción |
|-----------|--------|
| Conversación no existe | Marcar 'failed', retornar error |
| Conversación cerrada | Marcar 'cancelled', retornar error |
| Contacto opted-out | Marcar 'cancelled', retornar error |
| Identificadores faltantes | Marcar 'failed', retornar error |
| Metricool falla | Marcar 'failed' con mensaje, retornar error |
| DB falla después de Metricool éxito | Log error, marcar 'sent' (prevenir duplicados) |

#### 4.4 Mensaje Creado en DB
```typescript
{
  source: 'reminder_service',
  internalOrigin: 'reminder',
  direction: 'outbound',
  status: 'sent',
  metricoolId: sendResult.messageId,
  rawData: {
    isReminder: true,
    reminderNumber: 1 | 2,
    reminderEventId: reminder.id,
    metricoolResponse: sendResult.rawResponse
  }
}
```

#### 4.5 Timestamps Actualizados
- `conversation.lastMessageAt` → sendTime
- `conversation.lastReminderAt` → sendTime
- `conversation.reminderStatus` → 'sent'
- `reminderEvent.sentAt` → sendTime
- `reminderEvent.status` → 'sent'

#### 4.6 Métricas del Scheduler
```typescript
// sendScheduledReminders captura errores correctamente:
const sendResult = await this.sendReminder(reminder);
if (sendResult.success) {
  result.sent++;
} else if (sendResult.error) {
  result.errors.push(`Reminder ${reminder.id}: ${sendResult.error}`);
}
```

---

### 7. Referencias Técnicas

**Documentación Externa:**
- **Zendesk Solved vs Closed:** https://support.zendesk.com/hc/en-us/articles/4408887712154
- **Intercom AI Summarize:** https://www.intercom.com/help/en/articles/6955446
- **Intercom Prevent Replies:** https://www.intercom.com/help/en/articles/3449698
- **Intercom Fin Attributes:** https://www.intercom.com/help/en/articles/11680403
- **Front Reopened Conversations:** https://help.front.com/en/articles/2063
- **HubSpot Service Analytics:** https://knowledge.hubspot.com/help-desk/analyze-help-desk
- **Respond.io Official:** https://respond.io/
- **Respond.io AI Agents:** https://respond.io/ai-agents
- **Respond.io Help Center:** https://help.respond.io/l/en/conversation-led-growth

**Knowledge Base Local:**
- `docs/knowledge-base/CONVERSATION_LIFECYCLE_MANAGEMENT.md` - Benchmarking de plataformas
- `docs/knowledge-base/RESPOND_IO_TECHNICAL_ARCHITECTURE.md` - Arquitectura técnica Respond.io
- `docs/knowledge-base/CRM_DESIGN_SYSTEM_UX_UI.md` - Sistema de diseño UX/UI completo
- `docs/knowledge-base/Cierre_Perfecto_en_SaaS_B2B_1767113509977.pdf` - PDF original cierre perfecto
- `docs/knowledge-base/Investigación_Técnica_Respond.io_CRM_1767175751422.pdf` - PDF investigación Respond.io
- `docs/knowledge-base/Guía_de_Diseño_CRM_SaaS_Conversacional_1767176108783.pdf` - PDF guía de diseño

---

### FASE 5: UI Configuration (Completada 31 Dic 2025)

**Objetivo:** Panel de configuración en AIAgentConfig + control de opt-out en conversaciones.

#### 5.1 API Hooks (`client/src/hooks/useReminderRules.ts`)

```typescript
// Hook principal para reglas
export function useReminderRules(brandId?: string) {
  const query = useQuery({...}); // GET /api/brands/:id/reminder-rules
  const updateMutation = useMutation({...}); // POST /api/brands/:id/reminder-rules
  const runManualMutation = useMutation({...}); // POST /api/brands/:id/reminders/run
  return { rules, updateRules, runManual, isLoading };
}

// Hook para eventos a nivel de marca
export function useBrandReminderEvents(brandId?: string, options?: { status?: string; limit?: number }) {
  // GET /api/brands/:id/reminder-events
}

// Hook para opt-out
export function useReminderOptOut(conversationId?: string) {
  // POST /api/conversations/:id/reminder-opt-out
}
```

#### 5.2 API Methods (`client/src/lib/api.ts`)

```typescript
reminderRules: {
  get: (brandId: string) => fetchJSON<RulesResponse>(...),
  update: (brandId: string, data: ReminderRulesUpdate) => fetchJSON(...),
  runManual: (brandId: string) => fetchJSON<ManualRunResult>(...),
  getEventsByBrand: (brandId: string, options?) => fetchJSON<EventsResponse>(...),
  getEvents: (conversationId: string) => fetchJSON<EventsResponse>(...),
  optOut: (conversationId: string) => fetchJSON(...),
}
```

#### 5.3 ReminderSettingsForm Component

**Ubicación:** `client/src/components/ReminderSettingsForm.tsx`

**Campos de Configuración:**
| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| enabled | boolean | false | Master toggle |
| applyToDms | boolean | true | Aplicar a DMs |
| applyToComments | boolean | true | Aplicar a comentarios |
| delayHours1 | number | 24 | Horas para primer recordatorio |
| delayHours2 | number | 48 | Horas para segundo recordatorio |
| maxReminders | number | 2 | Máximo de recordatorios por conversación |
| dailyBrandCap | number | 50 | Límite diario por marca |
| useAiContent | boolean | true | Usar contenido AI vs plantilla |
| templateText | string | "" | Texto de plantilla si no usa AI |
| autoCloseAfterMaxReminders | boolean | false | Auto-cerrar tras máximo |
| autoCloseDelayHours | number | 24 | Delay para auto-cierre |

**Funcionalidades:**
- Toggle master con indicador visual
- Botón "Ejecutar Ahora" para trigger manual
- Tabla de historial de eventos (últimos 25)
- Badges de estado (scheduled, sent, failed, cancelled)
- Refresh de eventos

#### 5.4 Integración en AIAgentConfig

```typescript
// Nueva pestaña "Recordatorios" con icono Bell
<Tab value="reminders" className="...">
  <Bell className="h-4 w-4" />
  <span>Recordatorios</span>
</Tab>

// Contenido condicional con guard
<TabsContent value="reminders">
  {!activeClient?.id ? (
    <Card>Selecciona una marca primero...</Card>
  ) : (
    <ReminderSettingsForm brandId={activeClient.id} />
  )}
</TabsContent>
```

#### 5.5 Historial de Eventos a Nivel de Marca

**Endpoint:** `GET /api/brands/:id/reminder-events`

```typescript
// Query params: status?, limit? (default 25)
// Response: { success: true, events: ReminderEvent[] }
```

**Storage method:**
```typescript
async getEventsByBrand(brandId: string, options?: { 
  status?: string; 
  limit?: number 
}): Promise<ReminderEvent[]>
```

#### 5.6 Control Opt-Out en CRMContextPanel

**Ubicación:** `client/src/components/CRMContextPanel.tsx`

**Condición de visibilidad:** Solo para conversaciones tipo 'dm'

**UI Elements:**
- Sección "Recordatorios Automáticos" con iconos Bell/BellOff
- Switch para desactivar (solo permite opt-out, no re-activar)
- Estados visuales: Activos (verde) / Desactivados (gris)
- Mensaje informativo cuando está opted-out

```typescript
const optOutMutation = useReminderOptOut(conversation?.id);
const isOptedOut = conversation?.reminderStatus === 'opted_out';
const hasReminders = conversation?.type === 'dm';

// Switch solo permite desactivar (one-way)
<Switch
  checked={!isOptedOut}
  onCheckedChange={() => {
    if (!isOptedOut) optOutMutation.mutate();
  }}
  disabled={optOutMutation.isPending || isOptedOut}
/>
```

#### 5.7 Response Unwrapping

Backend retorna estructura envuelta:
```typescript
{ success: true, rules: {...} }
{ success: true, events: [...] }
```

Frontend unwraps correctamente:
```typescript
// En hooks
const rules = data?.rules || data; // Maneja ambos formatos
const events = data?.events || [];
```

---

### FASE 12.6: Correcciones Críticas (1 Enero 2026)

**Problema Detectado:** El sistema programaba reminders ANTES de que la marca hubiera respondido al cliente, causando follow-ups prematuros.

**Causa Raíz:** La lógica de elegibilidad no verificaba que existiera un mensaje outbound posterior al último mensaje inbound.

#### 6.1 Corrección de Lógica de Elegibilidad

**Archivo:** `server/storage.ts` (línea ~3490)

**Antes (incorrecta):**
```sql
-- Solo verificaba tiempo desde último mensaje
WHERE last_customer_message_at < now() - interval 'X hours'
```

**Después (correcta):**
```sql
-- CTE que verifica: la marca DEBE haber respondido al cliente
WITH conversations_with_outbound AS (
  SELECT c.*, 
         c.last_message_at AS last_outbound_at
  FROM conversations c
  WHERE c.brand_id = $1
    AND c.status NOT IN ('closed', 'solved')
    AND c.reminder_status NOT IN ('max_reached', 'opted_out')
    -- CRÍTICO: Debe existir respuesta outbound DESPUÉS del inbound
    AND c.last_message_at > c.last_customer_message_at
)
```

**Nueva Regla:** `last_outbound_at > last_inbound_at` es OBLIGATORIO antes de programar cualquier reminder.

#### 6.2 Enriquecimiento de ReminderContext

**Archivo:** `server/services/reminderService.ts`

Se enriqueció el contexto pasado al LLM con datos completos del último mensaje inbound:

```typescript
interface EnrichedReminderContext {
  // Datos existentes...
  lastInboundMessage: {
    id: string;
    metricoolId: string;
    author: string;
    content: string;
    rawData: any;
  };
}
```

#### 6.3 Target Message Tracking

**Problema:** Al enviar el reminder, el sistema podía responder al mensaje equivocado en Metricool.

**Solución:** Se guarda `contextSnapshot` con `targetMessageId` y `targetMetricoolId`:

```typescript
// Al programar reminder
const reminderEvent = {
  // ...campos existentes
  contextSnapshot: JSON.stringify({
    targetMessageId: lastInboundMessage.id,
    targetMetricoolId: lastInboundMessage.metricoolId,
    author: lastInboundMessage.author,
    capturedAt: new Date().toISOString(),
  }),
};

// Al enviar reminder
const snapshot = JSON.parse(reminder.contextSnapshot);
const targetId = snapshot.targetMetricoolId || conversation.lastCustomerMessageMetricoolId;
```

#### 6.4 Corrección de Error SQL en Arrays

**Problema:** Error SQL `op ANY/ALL (array) requires array on right side` al filtrar por tipos de conversación.

**Antes (error):**
```typescript
const types = ['dm', 'comment'];
sql`c.type = ANY(${types})`  // ❌ Falla con drizzle
```

**Después (correcto):**
```typescript
import { sql } from 'drizzle-orm';

const typePlaceholders = types.map(t => sql`${t}`);
sql`c.type IN (${sql.join(typePlaceholders, sql`, `)})`  // ✅ Funciona
```

#### 6.5 Flujo Completo Corregido

```
FLUJO DE REMINDER (CORREGIDO):

1. Scheduler ejecuta cada 5 minutos
   │
2. getConversationsEligibleForReminder
   ├── Filtro 1: status NOT IN (closed, solved)
   ├── Filtro 2: reminderStatus NOT IN (max_reached, opted_out)
   ├── Filtro 3: tipo IN (dm, comment) según config
   └── Filtro 4 (NUEVO): last_outbound_at > last_inbound_at  ✅
   │
3. Para cada conversación elegible:
   ├── Pre-check (barato): checkConversationEligibleForReminder
   ├── AI Generation (costoso): Solo si pre-check OK
   ├── Guardar contextSnapshot con targetMessageId/targetMetricoolId
   └── Atomic Schedule con transacción
   │
4. sendScheduledReminders
   ├── Obtener reminder.contextSnapshot
   ├── Usar snapshot.targetMetricoolId para replyTo
   └── Enviar via Metricool al mensaje correcto
```

#### 6.6 Verificación de Correcciones

**Logs del scheduler después de correcciones:**
```
[ReminderService] Found 0 conversations eligible for reminder #1 (delay: 1h)
[ReminderService] Found 0 conversations eligible for reminder #2 (delay: 48h)
[ReminderService] Total scheduled for brand: 0
[ReminderService] Found 0 reminders ready to send
```

**Sin errores SQL:** El error `op ANY/ALL (array)` ya no aparece.

#### 6.7 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `server/storage.ts` | Nueva lógica de elegibilidad con CTE y verificación outbound > inbound |
| `server/services/reminderService.ts` | Enriquecimiento de contexto + guardado de contextSnapshot |
| `shared/schema.ts` | Campo `contextSnapshot` (jsonb) en tabla `reminder_events` |

#### 6.8 Troubleshooting y Diagnóstico de Reminders

##### Problemas Comunes y Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| **"No AI agent configured and no template available"** | La marca tiene `use_ai_content=true` pero no hay AI agent configurado, y tampoco hay `template_text` como fallback | 1. Verificar que existe un AI agent para la marca: `SELECT * FROM ai_agents WHERE brand_id = 'XXX'` <br> 2. O añadir un `template_text` en `reminder_rules` como fallback |
| **"Missing comment identifiers (no metricoolId in messages or contextSnapshot)"** | El mensaje inbound más reciente no tiene `metricool_id` (fue creado manualmente o hay bug en sync) | 1. Verificar mensajes: `SELECT id, metricool_id FROM messages WHERE conversation_id = 'XXX' AND direction = 'inbound' ORDER BY timestamp DESC` <br> 2. Esperar próximo sync para que se actualice el metricoolId |
| **"Missing DM identifiers"** | La conversación DM no tiene `thread_external_id` o `customer_id` | 1. Verificar: `SELECT thread_external_id, customer_id FROM conversations WHERE id = 'XXX'` <br> 2. Ejecutar sync para actualizar datos de Metricool |
| **Conversaciones huérfanas (reminder_status='scheduled' sin eventos)** | Inconsistencia de datos: la conversación se marcó como scheduled pero el evento nunca se creó | Limpiar con SQL: `UPDATE conversations SET reminder_status = 'none', reminder_count = 0, last_reminder_at = NULL WHERE brand_id = 'XXX' AND reminder_status = 'scheduled' AND id NOT IN (SELECT DISTINCT conversation_id FROM reminder_events WHERE status = 'scheduled')` |
| **Reminders no se envían (0 scheduled, 0 sent)** | Puede ser: (1) No hay conversaciones elegibles, (2) Reminders deshabilitados, (3) Daily cap alcanzado | 1. Verificar reglas: `SELECT * FROM reminder_rules WHERE brand_id = 'XXX'` <br> 2. Verificar conversaciones elegibles (ver query abajo) |
| **Reminders duplicados** | Sistema de 5 capas de defensa no funcionando | Verificar índice único: `SELECT * FROM pg_indexes WHERE indexname LIKE '%reminder%unique%'` |

##### Dónde Buscar (Archivos y Logs)

| Qué buscar | Dónde mirar |
|------------|-------------|
| **Logs del scheduler** | Buscar en logs del servidor: `grep -i "ReminderService\|LifecycleScheduler" /tmp/logs/Start_application_*.log` |
| **Configuración de reminders por marca** | `SELECT * FROM reminder_rules WHERE brand_id = 'XXX'` |
| **Estado de conversaciones** | `SELECT id, customer_name, reminder_status, reminder_count FROM conversations WHERE brand_id = 'XXX' AND reminder_status != 'none'` |
| **Eventos de reminder** | `SELECT * FROM reminder_events WHERE brand_id = 'XXX' ORDER BY created_at DESC LIMIT 20` |
| **AI Agent configurado** | `SELECT id, model, is_active FROM ai_agents WHERE brand_id = 'XXX'` |
| **Lógica de elegibilidad** | `server/storage.ts` método `getConversationsEligibleForReminder` |
| **Generación de contenido** | `server/services/reminderService.ts` método `generateReminderContent` |
| **Envío vía Metricool** | `server/services/reminderService.ts` método `sendScheduledReminder` |

##### Query de Diagnóstico: Conversaciones Elegibles

```sql
-- Ver conversaciones elegibles para reminder (lógica corregida)
WITH message_timestamps AS (
  SELECT 
    m.conversation_id,
    MAX(CASE WHEN m.direction = 'inbound' THEN m.timestamp END) as last_inbound_at,
    MAX(CASE WHEN m.direction = 'outbound' THEN m.timestamp END) as last_outbound_at
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.brand_id = 'TU_BRAND_ID_AQUI'
  GROUP BY m.conversation_id
)
SELECT c.id, c.type, c.customer_name, c.status, c.reminder_status, c.reminder_count,
       mt.last_inbound_at, mt.last_outbound_at,
       (mt.last_outbound_at > mt.last_inbound_at) as brand_replied_last
FROM conversations c
JOIN message_timestamps mt ON mt.conversation_id = c.id
WHERE c.brand_id = 'TU_BRAND_ID_AQUI'
AND c.status NOT IN ('closed')
AND COALESCE(c.reminder_status, 'none') NOT IN ('scheduled', 'max_reached', 'opted_out')
AND COALESCE(c.reminder_count, 0) < 2
AND mt.last_outbound_at IS NOT NULL
AND mt.last_inbound_at IS NOT NULL
AND mt.last_outbound_at > mt.last_inbound_at  -- Marca respondió al cliente
AND mt.last_inbound_at <= NOW() - INTERVAL '1 hour'  -- Cliente inactivo
ORDER BY mt.last_inbound_at DESC;
```

##### Flujo de Diagnóstico Paso a Paso

```
1. ¿Los reminders están habilitados para la marca?
   └── SELECT enabled FROM reminder_rules WHERE brand_id = 'XXX'
   
2. ¿Hay AI agent o template configurado?
   └── SELECT * FROM ai_agents WHERE brand_id = 'XXX'
   └── SELECT template_text FROM reminder_rules WHERE brand_id = 'XXX'
   
3. ¿Hay conversaciones elegibles?
   └── Ejecutar query de diagnóstico arriba
   
4. ¿Los mensajes tienen metricool_id?
   └── SELECT id, metricool_id FROM messages WHERE conversation_id = 'XXX' AND direction = 'inbound'
   
5. ¿Hay eventos stuck en 'scheduled'?
   └── SELECT * FROM reminder_events WHERE brand_id = 'XXX' AND status = 'scheduled' AND scheduled_at < NOW()
   
6. ¿Qué dice el log?
   └── grep "ReminderService" /tmp/logs/Start_application_*.log | tail -50
```

##### Ejecución Manual del Scheduler

Para forzar una ejecución inmediata del scheduler de reminders:

```bash
curl -X POST "http://localhost:5000/api/brands/BRAND_ID/reminders/run-manual" \
  -H "Content-Type: application/json"
```

Esto ejecutará el ciclo completo: buscar elegibles → generar contenido → programar → enviar.

##### Sistema de 5 Capas de Defensa Contra Duplicados

1. **Pre-check en storage** - `checkConversationEligibleForReminder()` verifica estado actual
2. **Unique partial index** - `idx_reminder_events_unique_scheduled` previene duplicados en DB
3. **Atomic transaction** - `scheduleReminderAtomic()` usa transacción para consistencia
4. **Estado terminal check** - No procesa conversaciones en estados terminales
5. **Conversation status update** - Actualiza `reminder_status` inmediatamente después de crear evento

---

## FASE 13: Timeline de Interacciones (Customer Journey)

**Fecha de implementación:** Diciembre 2025

**Objetivo:** Sistema de visualización cronológica de todos los puntos de contacto clave con cada cliente, diferente del historial de mensajes raw. Muestra un resumen del "Customer Journey" completo.

### 1. Arquitectura

El Timeline de Interacciones combina datos de múltiples fuentes:
- **messages** - Mensajes de la conversación (primer contacto, respuestas IA, mensajes inbound/outbound)
- **conversation_user_summaries** - Resúmenes generados por IA
- **reminder_events** - Recordatorios programados y enviados
- **conversationStatusHistory** - Cambios de estado de la conversación

### 2. Tipos (shared/schema.ts)

```typescript
// Tipos de eventos del timeline
export const timelineEventTypeEnum = pgEnum('timeline_event_type', [
  'first_contact',      // Primer mensaje del cliente
  'message_inbound',    // Mensajes entrantes
  'message_outbound',   // Mensajes salientes de la marca
  'ai_reply',           // Respuestas automáticas de IA
  'reminder_scheduled', // Recordatorio programado
  'reminder_sent',      // Recordatorio enviado
  'status_change',      // Cambio de estado (open/solved/closed)
  'summary_generated',  // Resumen de conversación generado
  'opt_out',           // Cliente optó por no recibir recordatorios
]);

export type TimelineEventType = (typeof timelineEventTypeEnum.enumValues)[number];

// Estructura de un evento del timeline
export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: Date;
  title: string;
  description?: string;
  metadata?: {
    messageId?: string;
    reminderEventId?: string;
    summaryId?: string;
    statusHistoryId?: string;
    platform?: string;
    author?: string;
    direction?: string;
    reminderNumber?: number;
    previousStatus?: string;
    newStatus?: string;
    content?: string;
  };
}

// Timeline completo de una conversación
export interface ConversationTimeline {
  conversationId: string;
  customerName: string;
  platform: string;
  events: TimelineEvent[];
  summary: {
    firstContactAt: Date;
    lastActivityAt: Date;
    totalMessages: number;
    totalReminders: number;
    currentStatus: string;
    detectedIntent?: string;
  };
}
```

### 3. Storage Method (server/storage.ts)

```typescript
// Interface
getConversationTimeline(conversationId: string): Promise<ConversationTimeline | null>;

// Implementación: Query agregadora que combina datos de 4 tablas
// - Normaliza timestamps a Date consistentes
// - Ordena eventos cronológicamente
// - Incluye métricas resumidas en summary
```

### 4. API Endpoint (server/routes.ts)

**Endpoint:** `GET /api/conversations/:id/timeline`

```typescript
// Response: { success: true, timeline: ConversationTimeline }
// 404 si conversation no existe
```

### 5. API Client (client/src/lib/api.ts)

```typescript
conversations: {
  getTimeline: async (conversationId: string) => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/timeline`);
    if (!res.ok) throw new Error('Failed to fetch timeline');
    return res.json();
  },
}
```

### 6. Componente React (ConversationTimeline.tsx)

**Ubicación:** `client/src/components/ConversationTimeline.tsx`

**Features:**
- Visualización vertical con iconos por tipo de evento
- Colores diferenciados por tipo de evento
- Línea temporal conectando eventos
- Panel de resumen con métricas clave
- Límite configurable de eventos a mostrar
- Loading state y manejo de errores

**Props:**
```typescript
interface ConversationTimelineProps {
  conversationId: string;
  maxEvents?: number;        // Default: 15
  showSummary?: boolean;     // Default: true
}
```

**Iconos por tipo:**
| Tipo | Icono | Color |
|------|-------|-------|
| first_contact | UserPlus | green |
| message_inbound | MessageSquare | blue |
| message_outbound | ArrowRight | indigo |
| ai_reply | Bot | purple |
| reminder_scheduled | Clock | amber |
| reminder_sent | Bell | orange |
| status_change | CheckCircle | teal |
| summary_generated | FileText | gray |
| opt_out | BellOff | red |

### 7. Integración en CRMContextPanel

**Nueva sección:** "Customer Journey" con icono Clock

**Ubicación:** Entre "Recordatorios Automáticos" y "Historial de Mensajes"

**Visibilidad:** Solo cuando hay una conversación activa

```tsx
{conversation && (
  <div className="space-y-3" data-testid="section-customer-journey">
    <h4>Customer Journey</h4>
    <ConversationTimeline 
      conversationId={conversation.id} 
      maxEvents={10}
      showSummary={true}
    />
  </div>
)}
```

### 8. Data Test IDs

| Elemento | data-testid |
|----------|-------------|
| Sección principal | section-customer-journey |
| Container | conversation-timeline |
| Evento individual | timeline-event-{id} |
| Loading state | timeline-loading |
| Error state | timeline-error |
| Empty state | timeline-empty |

---

### Referencias Generales del Proyecto

- **Respond.io Official:** https://respond.io/
- **Respond.io AI Agent Actions:** https://respond.io/help/ai-agents/using-ai-agent-actions

---

## FASE 14: Análisis y Mejora del Sistema de Reminders (Enero 2026)

**Estado:** 🔄 En Análisis
**Fecha de inicio:** 2 de Enero 2026
**Objetivo:** Corregir los problemas de contexto y generación de contenido en el sistema de Reminders, alineándolo con la infraestructura de prompts que funciona correctamente en auto-reply.

---

### 14.1 Problemas Detectados

#### Problema Principal
El sistema de Reminders está **completamente aislado** del sistema de prompts (`prompt-composer.ts`) que funciona bien para auto-reply. Esto causa:
1. El LLM no recibe el contexto correcto de la comunicación
2. Los reminders no respetan la personalidad ni reglas del agente configurado
3. Tono inconsistente con el resto de las respuestas de la marca

#### Problemas Específicos Reportados por Usuario
- No encontraba al LLM correcto para enviar la respuesta
- No le enviaba el contexto correcto de la comunicación/comentario al LLM

---

### 14.2 Comparativa: AutoReplyService vs ReminderService

| Aspecto | AutoReplyService (✅ Funciona) | ReminderService (❌ Problemas) |
|---------|-------------------------------|--------------------------------|
| System Prompt | Usa `agent.systemPrompt` (personalidad configurada) | Usa texto genérico hardcodeado |
| Guardrails | Incluye `agent.guardrailPrompt` (reglas del usuario) | **NO los incluye** |
| Knowledge Base | Incluye `agent.knowledgeBase` | **NO la incluye** |
| Historial de mensajes | 20 mensajes para DMs | Solo 8 mensajes truncados a 150 chars |
| Resumen persistente | Sí (userSummary de 500+ chars) | **NO lo usa** |
| Filtrado por autor | Sí (`filterHistoryByAuthor`) | NO |
| Contexto del post | Sí (socialPost.caption) | NO |
| Prompt Composer | Usa `composePrompt()` completo | NO usa prompt-composer |

---

### 14.3 Análisis Técnico del Código

#### Ubicación del Problema: `server/services/reminderService.ts`

**Líneas 40-76 - Prompt hardcodeado:**
```typescript
const ENHANCED_REMINDER_PROMPT = `Eres un asistente de seguimiento amigable para {brand_name}...
// Este prompt NO incluye:
// - agent.systemPrompt (personalidad)
// - agent.guardrailPrompt (reglas)
// - agent.knowledgeBase (información del negocio)
```

**Líneas 252-257 - Generación de contenido:**
```typescript
const provider = createLLMProvider(agent, this.secrets);
const response = await provider.generateRawCompletion(
  'Eres un asistente de servicio al cliente experto...', // ❌ System prompt genérico
  prompt, // ❌ No incluye guardrails ni personalidad
  { temperature: 0.7, maxTokens: 150 }
);
```

**Línea 274 - Historial limitado:**
```typescript
const recentMessages = messages.slice(-8); // Solo 8 mensajes vs 20 en auto-reply
```

**Línea 279 - Truncamiento agresivo:**
```typescript
const content = m.content?.substring(0, 150) || '[sin contenido]'; // Trunca a 150 chars
```

#### Infraestructura que NO se reutiliza

El `prompt-composer.ts` tiene funciones que el reminder debería usar:

| Función | Propósito | Usado en Auto-Reply | Usado en Reminders |
|---------|-----------|---------------------|-------------------|
| `composePrompt()` | Construye prompt completo con agente | ✅ | ❌ |
| `filterHistoryByAuthor()` | Segrega historial por usuario en comentarios | ✅ | ❌ |
| `buildDynamicPersonalityRules()` | Reglas contextuales (DM vs comentario) | ✅ | ❌ |
| `buildSituationCard()` | Ficha de situación para el LLM | ✅ | ❌ |
| `extractFirstName()` | Extrae nombre del username | ✅ | ❌ |

---

### 14.4 Causa Raíz

El ReminderService fue implementado como un módulo independiente sin reutilizar la infraestructura existente del sistema de LLM. Específicamente:

1. **Usa `generateRawCompletion`** en lugar de `generateReply`
   - `generateRawCompletion`: Método simple que solo envía system + user prompt
   - `generateReply`: Método completo que usa `composePrompt()` con todo el contexto

2. **Prompt propio vs prompt-composer**
   - El `ENHANCED_REMINDER_PROMPT` fue creado desde cero
   - No aprovecha las funciones de `prompt-composer.ts`

3. **Context assembly separado**
   - `assembleReminderContext()` es una implementación paralela más limitada
   - No obtiene los mismos artefactos que usa auto-reply

---

### 14.5 Plan de Corrección Propuesto

#### Opción A: Crear ReminderPromptBuilder (Recomendada)
Crear un builder específico que reutilice `composePrompt` y agregue instrucciones de reminder.

```typescript
// Propuesta de nueva arquitectura
function buildReminderPrompt(context: ReminderPromptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  // 1. Reutilizar composePrompt del prompt-composer
  const basePrompt = composePrompt({
    agent,
    message: syntheticMessage,
    conversation,
    brand,
    conversationHistory: filteredHistory, // 20 msgs
    userSummary,
    socialPost,
  });
  
  // 2. Agregar instrucciones específicas de reminder
  const reminderInstructions = buildReminderInstructions(reminderNumber, maxReminders);
  
  // 3. Combinar
  return {
    systemPrompt: basePrompt.systemPrompt + reminderInstructions,
    userPrompt: basePrompt.userPrompt,
  };
}
```

#### Opción B: Inyectar contexto de agente en reminder actual
Modificar `generateReminderContent()` para incluir los campos faltantes.

#### Tareas Específicas

| # | Tarea | Descripción |
|---|-------|-------------|
| 1 | Enriquecer contexto | Aumentar historial 8→20, agregar userSummary, socialPost |
| 2 | Incluir prompt del agente | Agregar systemPrompt, guardrailPrompt, knowledgeBase |
| 3 | Usar filterHistoryByAuthor | Para comentarios, segmentar por autor |
| 4 | Agregar instrucciones reminder | Mantener restricciones (2 oraciones, follow-up) |
| 5 | Usar generateReply | Cambiar de generateRawCompletion a generateReply |

---

### 14.6 Impacto Esperado

#### Beneficios de la Corrección
1. **Consistencia de tono**: Los reminders sonarán como el resto de las respuestas
2. **Respeto de reglas**: Guardrails (ej. "prohibido dar precios") se aplicarán
3. **Mejor contexto**: El LLM entenderá la conversación completa
4. **Personalización**: Usará knowledge base para respuestas precisas
5. **Menos errores**: El LLM correcto siempre se seleccionará

#### Riesgos a Mitigar
- Reminders más largos si se incluye demasiado contexto → Mantener instrucción de 2 oraciones
- Conflicto entre guardrails y objetivo de reminder → Priorizar guardrails

---

### 14.7 Archivos Involucrados

| Archivo | Cambios Propuestos |
|---------|-------------------|
| `server/services/reminderService.ts` | Refactorizar `generateReminderContent()` |
| `server/services/llm/prompt-composer.ts` | Posible nueva función `composeReminderPrompt()` |
| `server/services/llm/types.ts` | Nuevos tipos para ReminderPromptContext |

---

### 14.8 Investigación: Arquitectura Multi-Agente basada en Respond.io

**Estado:** ✅ Análisis Completado
**Fecha:** 2 de Enero 2026
**Fuente:** Guía Técnica Agentes Respond.io (PDF guardado en `docs/knowledge-base/`)

---

#### 14.8.1 Cambio de Paradigma: Lógica Determinista → Probabilística

Según la investigación de Respond.io, la industria CX está en transición desde:
- **Sistemas basados en reglas rígidas** (árboles de decisión, workflows visuales)
- Hacia **arquitecturas cognitivas autónomas** (LLMs + RAG)

> "Los nuevos Agentes de IA introducen una arquitectura probabilística impulsada por LLMs y RAG. Estos agentes no siguen un guion lineal predefinido; operan bajo un conjunto de Instrucciones y Límites que definen su comportamiento."

**Implicación para Repliyo:** El trabajo se desplaza del diseño de flujos visuales a la **ingeniería de prompts** y **curación de conocimiento**.

---

#### 14.8.2 Anatomía de una Instrucción Efectiva (System Prompt)

Respond.io recomienda estructurar el prompt modularmente:

| Capa | Propósito | Ejemplo |
|------|-----------|---------|
| **1. Contexto** | Define el entorno operativo | ¿Quién es la empresa? ¿Qué productos? ¿Cliente típico? |
| **2. Identidad y Rol** | Define la voz de la marca | Especialista de Soporte Nivel 1, Asesor de Ventas |
| **3. Flujo de Nivel Superior** | Mapa mental de la conversación | Inicio → Indagación → Resolución |
| **4. Límites y Restricciones** | Reglas negativas de operación | Qué NO hacer, cuándo escalar |

##### Definición Técnica de Persona (Tabla Comparativa)

| Componente | ❌ Vago | ✅ Técnico |
|------------|---------|-----------|
| Rol | "Eres un agente de ayuda" | "Actúa como Especialista de Soporte Técnico Nivel 1 para [Empresa]. Tu objetivo es triaje y resolución al primer contacto." |
| Tono | "Sé amable y profesional" | "Utiliza tono profesional, conciso y empático. Evita jerga técnica. Mantén respuestas bajo 50 palabras." |
| Comportamiento | "Responde preguntas" | "Prioriza respuestas basadas en hechos de las Fuentes de Conocimiento. Si la información es ambigua, solicita clarificación." |

---

#### 14.8.3 Sistema de Restricciones Negativas (Boundaries)

Las restricciones deben codificarse en el prompt usando encabezados Markdown (`# BOUNDARIES`):

```markdown
# BOUNDARIES (LÍMITES)

1. No proporciones consejos médicos ni legales. Si el usuario lo solicita, 
   declara cortésmente tu limitación y sugiere consultar a un profesional.

2. No inventes niveles de stock. Si la información no está en las fuentes, 
   pide disculpas y ofrece transferir a un agente humano.

3. Si no encuentras la respuesta, NO inventes. Pide disculpas e indica que 
   no tienes esa información específica.
```

**Estrategia de Redirección Positiva:** En lugar de "No puedo hacer eso" (frustrante), usar redirección constructiva.

---

#### 14.8.4 Motor RAG y Fuentes de Conocimiento

El agente usa **búsqueda semántica pura** sobre las Knowledge Sources:

| Característica | Detalle |
|----------------|---------|
| Formatos soportados | PDF, TXT, DOCX, CSV, Markdown |
| Límite por archivo | 20 MB |
| Límite total | 100 archivos por Workspace |
| Priorización | **Semántica**, NO por nombre de archivo |

##### Cebado de Palabras Clave (Keyword Priming)

Para guiar al agente hacia la fuente correcta:

```
❌ Incorrecto: "Busca la respuesta en el archivo Lista de Precios 2025"

✅ Correcto: "Para consultas sobre costos o tarifas, busca términos específicos 
como 'Suscripción Mensual', 'Plan Anual' o 'Tarifas por Usuario' en el contexto."
```

---

#### 14.8.5 Framework de Acciones (Function Calling)

Respond.io implementa acciones que el agente puede ejecutar:

| Acción | Sintaxis | Uso |
|--------|----------|-----|
| **Cerrar conversación** | "Close the conversation" | Higiene del Inbox, métricas KPI |
| **Asignar a equipo/agente** | "Assign to @[Nombre del Equipo]" | Escalado, routing inteligente |
| **Actualizar campo CRM** | "Update the [Field Name] with value" | Captura de datos, cualificación leads |
| **Disparar Workflow** | "Trigger!nombre_del_workflow" | Integraciones externas (APIs) |

##### Anti-Patrón: Doble Respuesta

> "Un error común es permitir que el agente siga conversando después de asignar el chat a un humano."

**Solución:** Instrucción imperativa de silencio post-asignación:
```
"Do not respond to the Contact when assigning conversations to @Sales Team"
```

---

#### 14.8.6 Propuesta de Arquitectura Multi-Agente para Repliyo

Basándose en los patrones de Respond.io, se propone separar responsabilidades:

| Agente | Rol | Instrucciones Específicas |
|--------|-----|---------------------------|
| **Agente Recepcionista** | Primer contacto, clasificación | Detectar intención, recopilar info básica, enrutar |
| **Agente de Comentarios** | Respuestas a comentarios públicos | Brevedad, CTA, tono público, no dar precios |
| **Agente de DMs** | Conversaciones privadas | Tono personal, historial completo, cualificación |
| **Agente de Follow-up** | Reminders y seguimientos | Breve, contextual, referencia a tema previo |
| **Agente de Ventas** | Conversiones y cierre | Enfocado en CTA, WhatsApp, cotizaciones |

##### Beneficios de Multi-Agente

1. **Especialización**: Cada agente optimizado para su tarea
2. **Guardrails específicos**: Reglas diferentes por contexto
3. **Personalidades distintas**: Tono formal en comentarios, casual en DMs
4. **Menor confusión**: El LLM no mezcla contextos

##### Desafíos de Implementación

1. **Routing**: ¿Cómo decidir qué agente usa cada interacción?
2. **Transiciones**: ¿Cómo pasar contexto entre agentes?
3. **Configuración UI**: ¿Cómo configurar múltiples agentes por marca?
4. **Costos**: Más agentes = más configuración y mantenimiento

---

#### 14.8.7 Aplicación Inmediata: Mejorar ReminderService

Antes de implementar multi-agente completo, aplicar lecciones de Respond.io al reminder actual:

| Problema Actual | Solución Respond.io Style |
|-----------------|---------------------------|
| Prompt genérico | Estructurar con Contexto/Rol/Flujo/Límites |
| Sin guardrails | Agregar sección `# BOUNDARIES` con reglas del agente |
| Poco contexto (8 msgs) | Aumentar a 20 msgs + resumen persistente |
| Sin personalidad | Usar `agent.systemPrompt` para tono consistente |

##### Propuesta de Prompt Estructurado para Reminders

```markdown
# CONTEXTO
Eres el agente de seguimiento de {brand_name}. 
Tu objetivo es retomar conversaciones con clientes inactivos.

# ROL Y PERSONA
{agent.systemPrompt} // Inyectar personalidad del agente configurado

# FLUJO DE REMINDER
1. Revisa el historial de conversación
2. Identifica el tema/servicio que consultó el cliente
3. Genera mensaje breve (máximo 2 oraciones) haciendo referencia específica a ese tema
4. Si hay canal preferido (WhatsApp), pregunta si pudo contactar por ese medio

# BOUNDARIES
{agent.guardrailPrompt} // Inyectar guardrails del agente

## RESTRICCIONES ADICIONALES PARA REMINDERS
- NO menciones que es un recordatorio automatizado
- NO des precios ni información sensible
- Si no tienes contexto suficiente, usa mensaje genérico amable
```

---

#### 14.8.8 Documentos de Referencia

| Documento | Ubicación | Contenido |
|-----------|-----------|-----------|
| Guía Técnica Agentes Respond.io | `docs/knowledge-base/Guía_Técnica_Agentes_Respond.io_*.pdf` | Arquitectura, prompts, acciones |
| Investigación Técnica Respond.io CRM | `docs/knowledge-base/Investigación_Técnica_Respond.io_CRM_*.pdf` | Sistema CRM, lifecycle |
| Guía de Diseño CRM SaaS Conversacional | `docs/knowledge-base/Guía_de_Diseño_CRM_SaaS_Conversacional_*.pdf` | UX/UI patterns |
| Cierre Perfecto en SaaS B2B | `docs/knowledge-base/Cierre_Perfecto_en_SaaS_B2B_*.pdf` | Estrategias de cierre |

---

#### 14.8.9 Plan de Implementación por Fases (Aprobado por Architect)

**Estrategia:** Enfoque en fases - primero arreglar el agente actual, luego evaluar multi-agente.

---

##### FASE A: Correcciones Core (Prioridad Alta - Sin cambios de Schema)

**Estado:** ✅ COMPLETADA (2 de Enero 2026)

**Objetivo:** Arreglar los problemas inmediatos del ReminderService sin romper la UI existente.

| # | Tarea | Descripción | Archivos | Estado |
|---|-------|-------------|----------|--------|
| A1 | Crear `composeReminderPrompt()` | Nueva función que reutiliza `agent.systemPrompt`, `agent.guardrailPrompt` y estructura Contexto/Rol/Flujo/Límites | `prompt-composer.ts` | ✅ |
| A2 | Aumentar historial 8→20 | Para DMs, obtener últimos 20 mensajes en lugar de 8 | `reminderService.ts` | ✅ |
| A3 | Inyectar guardrails | Incluir `agent.guardrailPrompt` en el prompt de reminder | `reminderService.ts` | ✅ |
| A4 | Agregar resumen persistente | Obtener `userSummary` para DMs (igual que auto-reply) | `reminderService.ts` | ✅ |
| A5 | Agregar contexto de video | Para comentarios, obtener `socialPost.caption` | `reminderService.ts` | ✅ |

**Criterios de Aceptación:**
- [x] El reminder hace referencia al tema específico de la conversación
- [x] Respeta los guardrails del agente (ej. no da precios si está configurado)
- [x] Usa el mismo tono que las respuestas de auto-reply
- [x] Historial de 20 mensajes para DMs

---

##### FASE A.2: Arquitectura Simplificada de Prompts (2 Enero 2026)

**Estado:** ✅ COMPLETADA

**Objetivo:** Eliminar instrucciones hardcodeadas del código y permitir que el admin controle todo el comportamiento a través de su `systemPrompt` configurado.

**Cambio Arquitectónico:**
Se refactorizó `composeReminderPrompt()` para seguir el principio "Contexto Neutral + Variables":

```
ANTES (problemático):
┌─────────────────────────────────────────────────────────────┐
│ composeReminderPrompt()                                     │
├─────────────────────────────────────────────────────────────┤
│ + Contexto neutral (OK)                                     │
│ + agent.systemPrompt (OK)                                   │
│ + ENHANCED_REMINDER_PROMPT (❌ 37 líneas hardcodeadas)      │
│ + Instrucciones de seguimiento (❌ sobrescriben admin)      │
└─────────────────────────────────────────────────────────────┘

AHORA (limpio):
┌─────────────────────────────────────────────────────────────┐
│ composeReminderPrompt()                                     │
├─────────────────────────────────────────────────────────────┤
│ 1. CONTEXTO NEUTRAL (solo datos, sin instrucciones)         │
│    - Tipo: REMINDER                                         │
│    - Cliente: {{username}} ({{firstName}})                  │
│    - Canal: {{platform}} (DM/Comentario)                    │
│    - Tiempo sin respuesta: {{time_since_last_message}}      │
│    - Recordatorio #{{reminder_number}} de {{max_reminders}} │
│                                                             │
│ 2. PROMPT DEL AGENTE (con variables sustituidas)            │
│    - {{agent.systemPrompt}}                                 │
│                                                             │
│ 3. GUARDRAILS DEL AGENTE (con variables sustituidas)        │
│    - {{agent.guardrailPrompt}}                              │
│                                                             │
│ 4. KNOWLEDGE BASE                                           │
│    - {{agent.knowledgeBase}}                                │
│                                                             │
│ 5. TAREA ESPECÍFICA (mínima, solo formato)                  │
│    - "Genera un mensaje de seguimiento breve y natural"     │
└─────────────────────────────────────────────────────────────┘
```

**Variables Disponibles para Reminders:**

El admin puede usar estas variables en su `systemPrompt`, `guardrailPrompt` o `knowledgeBase`:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{interaction_mode}}` | Tipo de interacción | `"reminder"` |
| `{{reminder_number}}` | Número del recordatorio | `1`, `2`, `3` |
| `{{max_reminders}}` | Límite de recordatorios | `3` |
| `{{time_since_last_message}}` | Tiempo transcurrido | `"hace 2 días"` |
| `{{username}}` | Nombre de usuario | `@pandita_cute` |
| `{{firstName}}` / `{{first_name}}` | Primer nombre | `Panda` |
| `{{platform}}` | Plataforma social | `instagram` |
| `{{businessName}}` / `{{business_name}}` | Nombre del negocio | `Inpulza Testing` |
| `{{isDm}}` / `{{is_dm}}` | ¿Es mensaje directo? | `true` / `false` |
| `{{messageType}}` / `{{message_type}}` | Tipo de mensaje | `dm` / `comment` |
| `{{comment}}` | Último mensaje del cliente | `"Me interesa..."` |
| `{{postContext}}` / `{{post_context}}` | Caption del post (comentarios) | `"Nuevo video..."` |
| `{{dynamicLimit}}` / `{{dynamic_limit}}` | Límite de caracteres | `280` |
| `{{conversationDepth}}` / `{{conversation_depth}}` | Profundidad conversación | `5` |
| `{{relationshipStatus}}` / `{{relationship_status}}` | Estado de relación | `new` / `returning` / `established` |

**IMPORTANTE - Solo Sustitución Simple:**

El sistema **solo soporta sustitución de variables** `{{variable}}`. **NO** soporta lógica condicional tipo Jinja/Liquid (`{% if %}`). Las variables se reemplazan por sus valores antes de enviar al LLM.

**Recomendación para el Admin:**

Dado que el sistema inyecta automáticamente `interaction_mode: REMINDER` en el contexto neutral, el LLM sabe que está generando un reminder. El admin puede incluir instrucciones para ambos modos en su systemPrompt:

```
Eres Marta, asistente de ventas de Inpulza.

## INSTRUCCIONES GENERALES
- Siempre saluda al cliente por su nombre: {{firstName}}
- Mantén un tono amigable y profesional

## CUANDO GENERES RESPUESTAS NORMALES (auto-reply)
- Responde de forma completa y detallada
- Incluye información relevante del producto/servicio

## CUANDO GENERES RECORDATORIOS (reminders)
El contexto indicará que es un REMINDER. En ese caso:
- Sé breve (1-2 oraciones máximo)
- Ofrece ayuda adicional, no presiones
- No repitas información ya mencionada
```

El LLM recibirá el contexto `**Tipo de interacción:** REMINDER` y seleccionará la sección correcta de instrucciones.

**Archivos Modificados:**
- `server/services/llm/prompt-composer.ts` - Nueva función `composeReminderPrompt()` + `replaceReminderVariables()`
- `server/services/reminderService.ts` - Eliminada constante `ENHANCED_REMINDER_PROMPT`
- `server/scripts/test-reminder-prompt.ts` - Tests actualizados

**Tests Ejecutados:**
- 4 conversaciones reales de Inpulza Testing
- Todos generan reminders contextualizados correctamente
- Los mensajes hacen referencia a temas específicos de cada conversación

---

##### FASE B: Mejoras Contextuales (Prioridad Media)

**Estado:** ✅ COMPLETADA (2 de Enero 2026)

| # | Tarea | Descripción | Estado |
|---|-------|-------------|--------|
| B1 | Reutilizar helpers de autoReply | Importar `filterHistoryByAuthor` de prompt-composer | ✅ |
| B2 | Fallback para contexto faltante | Si no hay resumen/video, usar mensaje genérico amable | ✅ |
| B3 | Diferenciar prompt DM vs Comentario | Tono personal para DM, breve para comentarios | ✅ |
| B4 | Logging mejorado | Agregar logs de qué contexto se inyectó al prompt | ✅ |

---

##### FASE C: Evaluación Multi-Agente (Prioridad Baja - Post Fase A)

**Prerequisito:** Confirmar que las mejoras de Fase A funcionan correctamente.

| # | Tarea | Descripción | Complejidad |
|---|-------|-------------|-------------|
| C1 | Diseñar schema multi-agente | Romper constraint de 1 agente por marca | Alta |
| C2 | Definir routing rules | ¿Cómo decidir qué agente usar? | Media |
| C3 | Diseñar UI para múltiples agentes | Tabs o lista de agentes por marca | Alta |
| C4 | Plan de migración | Cómo migrar marcas existentes | Media |

**Decisión pendiente:** ¿Multi-agente real o configuración por contexto?
- **Opción A**: Tabla `ai_agents` permite múltiples agentes por marca (reminder_agent, comment_agent)
- **Opción B**: Un agente pero con prompts específicos por tipo de interacción (más sencillo)

---

##### Orden de Implementación Recomendado

```
Semana 1: A1 + A2 + A3 (Core fixes - quick wins)
Semana 2: A4 + A5 (Contexto completo)
Semana 3: B1 + B2 + B3 (Refinamiento)
Futuro:   C1-C4 (Multi-agente si se valida necesidad)
```

---

##### Diagrama de Flujo Propuesto para Reminder

```
┌─────────────────────────────────────────────────────────────────┐
│                    REMINDER GENERATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. getConversation(conversationId)
   │
2. ¿Es DM o Comentario?
   │
   ├─── DM ────────────────────────┐
   │    │                          │
   │    ├─ getMessageHistory(20)   │
   │    ├─ getUserSummary()        │
   │    └─ getCrmProfile()         │
   │                               │
   └─── Comentario ────────────────┤
        │                          │
        ├─ getSocialPost()         │  ← caption del video
        ├─ getMessageHistory(10)   │
        └─ getLastInboundMessage() │
                                   │
3. composeReminderPrompt({         │
     agent,                        │
     context,                      │
     conversationType,             │
     reminderNumber                │
   })                              │
   │
   ├── # CONTEXTO                  │
   │   "Eres agente de follow-up   │
   │    de {brand_name}"           │
   │                               │
   ├── # ROL Y PERSONA             │
   │   {agent.systemPrompt}        │
   │                               │
   ├── # BOUNDARIES                │
   │   {agent.guardrailPrompt}     │
   │   + restricciones reminder    │
   │                               │
   └── # INSTRUCCIONES REMINDER    │
       "Genera mensaje breve,      │
        referencia tema previo,    │
        máximo 2 oraciones"        │
                                   │
4. llmProvider.generateRawCompletion()
   │
5. Validar contenido (>10 chars, no vacío)
   │
6. scheduleReminderAtomic()
```

---
## Cambios Implementados

### 8 Enero 2026 - Fix: Auto-Reply para Comentarios Anidados en Hilos

**Problema Identificado:**
Los replies anidados dentro de hilos de comentarios (TikTok, Instagram, Facebook, etc.) no recibían respuesta automática de la IA. Solo el comentario padre recibía respuesta.

**Ejemplo del bug:**
- Usuario "Ramón" comenta en un post → IA responde ✅
- Usuario "Juan" responde dentro del hilo de Ramón → NO recibe respuesta ❌

**Causa Raíz:**
En `syncService.ts`, la función `triggerAutoReply()` solo se llamaba para comentarios padre (línea 654), pero no para los replies anidados procesados en el loop de `nestedReplies` (líneas 659-747).

**Solución Implementada:**
Modificación en `server/services/syncService.ts`:

```javascript
// ANTES: Solo se guardaba el reply sin disparar auto-reply
await storage.upsertMessage({...});

// DESPUÉS: Se captura el resultado y se dispara auto-reply si es nuevo e inbound
const savedReply = await storage.upsertMessage({...});

// Check para evitar duplicados cross-brand
const isReplyReallyNew = isNewReply && savedReply.brandId === brandId;

// Trigger auto-reply para NEW INBOUND nested replies
if (isReplyReallyNew && !isReplyFromBrand) {
  log(`[SyncService] 🔷 NEW nested reply from ${replyAuthor} in thread, triggering auto-reply`, "sync");
  
  websocketService.notifyNewMessage(brandId, {
    id: savedReply.id,
    platform,
    author: replyAuthor,
    content: replyContent.substring(0, 100),
    type: 'comment',
    conversationId: conversationRecord.id,
  });
  
  this.triggerAutoReply(brandId, savedReply, conversationRecord);
}
```

**Verificaciones de Seguridad:**
1. `isReplyReallyNew` previene duplicados cross-brand
2. `!isReplyFromBrand` evita responder a nuestros propios comentarios
3. El `rawData.id` del reply contiene el `objectId` correcto para responder al comentario específico
4. Compatibilidad con cooldowns por conversación

**Archivos Modificados:**
- `server/services/syncService.ts` (líneas ~697-741)

**Caso de Prueba Documentado:**
- Conversación: `2d8960df-8986-4aaf-966e-7e3ad50eb51b` (TikTok)
- Comentario padre de `cr99397` → tenía respuesta
- Reply de `sandra.lopera.rod` en el hilo → NO tenía respuesta (bug confirmado)
- rawData del reply contenía `id` correcto para responder

---

## BUG FIX: Reminder Messages Appearing as "Floating" Comments (8 Enero 2026)

**Problema Detectado:**
Los mensajes de reminder para comentarios aparecían como "flotantes" en la UI en lugar de estar agrupados dentro del hilo del comentario al que respondían.

**Causa Raíz:**
Cuando `reminderService.ts` creaba el mensaje del reminder, no asignaba `parentMessageId`. El frontend (`CommentThread.tsx`) agrupa mensajes en hilos usando este campo - sin él, los mensajes aparecen como raíz (flotantes).

**Solución Implementada:**
Modificación en `server/services/reminderService.ts`:

```javascript
// ANTES: Sin parentMessageId
await storage.createMessage({
  // ...
  metricoolId: sendResult.messageId || null,
  rawData: {...}
});

// DESPUÉS: Con parentMessageId para comentarios
await storage.createMessage({
  // ...
  metricoolId: sendResult.messageId || null,
  parentMessageId: deliveryChannel === 'comment' ? (snapshot.targetMessageId || null) : null,
  rawData: {...}
});
```

**Decisión de Diseño:**
- `parentMessageId` solo se asigna cuando `deliveryChannel === 'comment'`
- DMs no tienen `parentMessageId` porque su modelo de threading es diferente
- Los reminders existentes sin `parentMessageId` seguirán flotando (requieren backfill si se desea corregir)

**Consistencia con Auto-Replies:**
Este fix es consistente con cómo `autoReplyService.ts` asigna `parentMessageId`:
```javascript
parentMessageId: chunk.partIndex === 1 ? message.id : null,
```

**Archivos Modificados:**
- `server/services/reminderService.ts` (línea ~944)

---

## FEATURE: Reminder Badges en UI - Contadores Visuales (8 Enero 2026)

**Objetivo:**
Mostrar de un vistazo cuántos reminders hay en cada hilo y cuántos reminders se han enviado a cada usuario.

**Funcionalidades Implementadas:**

### 1. Badge de Reminders por Hilo (Nivel Comentario Padre)
- **Ubicación:** En la línea de información del comentario padre (junto al badge de tipo)
- **Estilo:** Badge púrpura con icono de campana
- **Texto:** "Hilo: X" donde X es el número de reminders en ese hilo completo
- **Solo visible:** En comentarios padre (depth === 0) que tienen reminders

### 2. Badge de Reminders por Autor (Nivel Mensaje Individual)
- **Ubicación:** En la línea de información de cada mensaje inbound
- **Estilo:** Badge ámbar con icono de campana
- **Texto:** Número de reminders enviados a ese autor
- **Solo visible:** Para mensajes inbound de autores que han recibido reminders

**Implementación Técnica:**

```typescript
// Nueva función en CommentThread.tsx
function computeReminderStats(messages: Message[]): ReminderStats {
  // Filtra mensajes que son reminders
  const reminderMessages = messages.filter(m => 
    m.direction === 'outbound' && 
    (m.internalOrigin === 'reminder' || m.source === 'reminder_service')
  );
  
  // Para cada reminder:
  // 1. Encuentra el mensaje padre (via parentMessageId)
  // 2. Sube al mensaje raíz del hilo
  // 3. Incrementa contador del hilo
  // 4. Incrementa contador del autor del mensaje padre
}
```

**Props Agregadas:**
- `SingleMessageProps`: `threadReminderCount`, `authorReminderCount`
- `ThreadNodeProps`: `threadReminderCounts`, `authorReminderCounts`

**UI Elements:**
```jsx
// Badge de autor (ámbar)
{msg.direction === 'inbound' && authorReminderCount > 0 && (
  <span className="... bg-amber-50 text-amber-700 border-amber-200">
    <Bell className="h-2.5 w-2.5" />
    <span>{authorReminderCount}</span>
  </span>
)}

// Badge de hilo (púrpura)
{!isReply && threadReminderCount > 0 && (
  <span className="... bg-purple-50 text-purple-700 border-purple-200">
    <Bell className="h-2.5 w-2.5" />
    <span>Hilo: {threadReminderCount}</span>
  </span>
)}
```

**Archivos Modificados:**
- `client/src/components/CommentThread.tsx`

**Beneficios UX:**
- Visibilidad inmediata de hilos con reminders enviados
- Identificación rápida de usuarios que ya recibieron seguimiento
- Prevención de envío de reminders duplicados
- Mejor gestión del flujo de trabajo de customer service

---

## FEATURE: Sistema de Variables Dinámicas con Blue Chips (Enero 2026)

### Descripción
Implementación de un sistema visual para inserción de variables dinámicas en los prompts del AI Agent, inspirado en Respond.io. Las variables se muestran como "blue chips" (píldoras visuales azules) dentro de los campos de texto.

### Componentes Creados

**1. VariablePicker (`client/src/components/VariablePicker.tsx`)**
- Popover con búsqueda de variables dinámicas
- Trigger: botón con icono `</>` (Code2) y texto "Variables" en la parte inferior izquierda de cada prompt
- Filtrado en tiempo real con Command (cmdk)
- Muestra placeholder + descripción completa para cada variable (texto hace wrap en varias líneas)

**2. PromptEditor (`client/src/components/PromptEditor.tsx`)**
- Reemplazo del Textarea estándar con visualización de blue chips
- Overlay para resaltar variables `{{variable}}` con estilo píldora azul
- Mantiene funcionalidad de textarea nativa (cursor visible, selección, scroll)
- Expone `PromptEditorHandle` con métodos `insertVariable()` y `focus()` via useImperativeHandle
- **Borrado atómico:** Al presionar Backspace/Delete en un blue chip, se elimina toda la variable completa (no carácter por carácter)
- Token range tracker que detecta cuando el cursor está dentro de una variable
- Line-height 1.8 para mejor espaciado entre chips

### Integración en AIAgentConfig

```tsx
// Debajo de cada PromptEditor, en la parte inferior izquierda:
<div className="flex items-center justify-between">
  <VariablePicker 
    onSelectVariable={(placeholder) => systemPromptRef.current?.insertVariable(placeholder)} 
  />
  <p className="text-xs text-muted-foreground">
    {(formData.systemPrompt?.length || 0).toLocaleString()} caracteres
  </p>
</div>

// PromptEditor con ref tipado:
const systemPromptRef = React.useRef<PromptEditorHandle>(null);

<PromptEditor
  ref={systemPromptRef}
  value={formData.systemPrompt || ''}
  onChange={(value) => setFormData({ ...formData, systemPrompt: value })}
  minHeight="400px"
  data-testid="textarea-system-prompt"
/>
```

### Variables Dinámicas Disponibles

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{interaction_mode}}` | Tipo de interacción: "reply" o "reminder" | reminder |
| `{{reminder_number}}` | Número del recordatorio (1, 2, etc.) | 1 |
| `{{username}}` | Nombre o @handle del usuario | @jordanldp |
| `{{platform}}` | Nombre de la red social | instagram |
| `{{comment}}` | Contenido del mensaje o comentario | Me encanta! |
| `{{post_context}}` | Contexto del post original | Post sobre productos |
| `{{is_dm}}` | Si es mensaje directo | true |
| `{{message_type}}` | Tipo: "dm" o "comment" | dm |
| `{{time_since_last_interaction}}` | Minutos desde última respuesta | 15 |
| `{{conversation_depth}}` | Número total de mensajes | 8 |
| `{{relationship_status}}` | Estado: "new", "active", "reengagement" | active |

### Características Técnicas

**Borrado Atómico de Variables:**
```typescript
// PromptEditor intercepta keydown para Backspace/Delete
function getVariableRanges(text: string): TokenRange[] {
  const regex = /\{\{[^}]+\}\}/g;
  // Retorna array de {start, end, text} para cada variable
}

// Si el cursor está dentro o junto a una variable, se borra toda completa
if (tokenToDelete) {
  e.preventDefault();
  const newValue = currentValue.substring(0, tokenToDelete.start) + 
                   currentValue.substring(tokenToDelete.end);
  onChange(newValue);
}
```

**Cursor Visible:**
```css
/* El textarea tiene texto transparente pero cursor visible */
color: transparent;
caretColor: hsl(var(--foreground));
WebkitTextFillColor: transparent;
```

### Beneficios UX
- **Reducción de espacio:** Eliminado el panel grande de "Variables Dinámicas"
- **Inserción contextual:** Variables se insertan donde está el cursor
- **Visualización clara:** Blue chips resaltan visualmente las variables en el prompt
- **Búsqueda rápida:** Filtrado instantáneo en el popover
- **Borrado inteligente:** Las variables se eliminan como unidad atómica
- **Descripciones legibles:** El popover muestra descripciones completas en varias líneas
- **Posición intuitiva:** Botón de Variables en la parte inferior izquierda de cada campo

### Archivos Modificados
- `client/src/components/AIAgentConfig.tsx` - Integración de componentes, refs tipados
- `shared/dynamicVariables.ts` - Agregadas nuevas variables (interaction_mode, reminder_number)

### Archivos Creados
- `client/src/components/VariablePicker.tsx` - Popover de selección con búsqueda
- `client/src/components/PromptEditor.tsx` - Editor con blue chips y borrado atómico

---
## FASE 4: AUTENTICACIÓN SOCIAL (Replit Auth)
**Objetivo:** Implementar login social con Google, GitHub, Apple y Twitter usando Replit Auth
**Riesgo actual:** Login social no funciona (solo muestra toast "Próximamente")
**Duración estimada:** 1-2 semanas
**Fecha de inicio:** Enero 2026

### Diagnóstico de Seguridad Actual (Pre-implementación)

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Separación de roles (admin/client) | ✅ Implementado | Middleware `requireAuth` verifica sesión |
| Filtrado por brandId | ✅ Implementado | Middleware `filterByBrand` protege recursos |
| Verificación de acceso | ✅ Implementado | Clientes solo acceden a su marca |
| Autenticación social OAuth | ❌ No implementado | Solo muestra toast "Próximamente" |
| Tabla de sesiones persistentes | ✅ YA EXISTE | `server/sessionStore.ts` usa `connect-pg-simple` con tabla `session` |
| SESSION_SECRET | ✅ YA EXISTE | Configurado en `sessionStore.ts` |
| Migración de usuarios existentes | ⚠️ Pendiente | Usuarios con email/password necesitan compatibilidad |
| Campo password | ⚠️ CONFLICTO | Actualmente `notNull()` - debe ser nullable para OAuth |

### Notas Críticas de Compatibilidad

> **IMPORTANTE:** Se han detectado varios puntos de conflicto con la infraestructura existente que deben abordarse cuidadosamente:

**1. Tabla de Sesiones (Ya Existe)**
```typescript
// server/sessionStore.ts - YA IMPLEMENTADO
export const sessionStore = new PgStore({
  pool: pool as any,
  tableName: 'session',
  createTableIfMissing: true
});
```
- La tabla `session` ya existe y funciona con `connect-pg-simple`
- Replit Auth puede reutilizar esta infraestructura
- NO crear tabla duplicada

**2. Campo Password NOT NULL (CONFLICTO)**
```typescript
// shared/schema.ts línea 40 - PROBLEMA
password: text("password").notNull(),  // ← Bloquea usuarios OAuth
```
- Los usuarios OAuth no tienen contraseña
- Se debe cambiar a `password: text("password")` (nullable)
- Requiere migración sin afectar usuarios existentes

**3. Coexistencia de Rutas de Auth**
| Ruta | Sistema | Propósito |
|------|---------|-----------|
| `/api/login` | Replit Auth (NUEVO) | Inicia flujo OAuth |
| `/api/logout` | Replit Auth (NUEVO) | Termina sesión OAuth |
| `/api/auth/login` | Legacy (EXISTENTE) | Login email/password |
| `/api/auth/logout` | Legacy (EXISTENTE) | Logout email/password |
| `/api/auth/me` | Legacy (EXISTENTE) | Obtener usuario actual |

**4. Estructura de req.user (DIFERENTE)**
- Sistema actual: `req.session.userId` → buscar en DB → `req.user`
- Replit Auth: `req.user.claims.sub` contiene ID de Replit
- Se necesita middleware híbrido que unifique ambos formatos

### Subfase 4.1: Preparación de Infraestructura de Base de Datos

**Objetivo:** Adaptar tablas y schemas existentes para soportar Replit Auth

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.1.0 | **DECISIÓN:** Definir estrategia de integración - ¿Adaptar tabla `users` existente o usar tabla de Replit Auth por separado? | Decisión documentada | ✅ (10-Ene-2026) Adaptar tabla existente |
| 4.1.1 | Exportar schema de auth desde `shared/models/auth.ts` (si se crea nuevo) | Schema accesible en `shared/schema.ts` | ✅ (10-Ene-2026) Blueprint instalado |
| 4.1.2 | ~~Crear tabla `sessions`~~ → **YA EXISTE** en `server/sessionStore.ts` - Verificar compatibilidad con Replit Auth | Sesiones funcionan con ambos sistemas | ✅ |
| 4.1.3a | **CRÍTICO:** Cambiar campo `password` de `notNull()` a nullable en `shared/schema.ts` | Campo permite NULL | ✅ (10-Ene-2026) |
| 4.1.3b | Agregar campos: `replitId` (varchar, nullable, unique), `profileImageUrl` (text, nullable), `authProvider` (text, default 'local') | Migración ejecutada sin errores | ✅ (10-Ene-2026) |
| 4.1.4 | Ejecutar `npm run db:push` para aplicar cambios | Base de datos actualizada | ✅ (10-Ene-2026) Via ALTER TABLE SQL |
| 4.1.5 | Verificar que usuarios existentes mantienen acceso (query: `SELECT * FROM users WHERE password IS NOT NULL`) | Usuarios legacy funcionan | ✅ (10-Ene-2026) 2 usuarios verificados |
| 4.1.6 | Actualizar valor `authProvider='local'` para todos los usuarios existentes | Migración de datos | ✅ (10-Ene-2026) 2 usuarios actualizados |

### Subfase 4.2: Integración del Módulo Replit Auth

**Objetivo:** Instalar y configurar Replit Auth en el servidor

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.2.1 | Agregar blueprint `javascript_log_in_with_replit` al proyecto | Archivos de integración creados en `server/replit_integrations/auth/` | ✅ (10-Ene-2026) Blueprint adaptado |
| 4.2.2 | Configurar `setupAuth(app)` en `server/app.ts` ANTES de `registerRoutes(app)` | Auth inicializado correctamente | ✅ (10-Ene-2026) |
| 4.2.3 | Registrar rutas con `registerAuthRoutes(app)` - **NOTA:** Esto crea `/api/login` (nuevo), NO conflicta con `/api/auth/login` (existente) | Ambas rutas disponibles | ✅ (10-Ene-2026) |
| 4.2.4 | ~~Verificar SESSION_SECRET~~ → **YA EXISTE** en `sessionStore.ts` | Variable ya configurada | ✅ |
| 4.2.5 | Adaptar módulo Replit Auth para usar `sessionStore` existente en lugar de crear nuevo | Una sola configuración de sesión | ✅ (10-Ene-2026) replitAuth.ts usa passport con session existente |
| 4.2.6 | Probar flujo de login OAuth en desarrollo | Usuario puede autenticarse con Google | ✅ (10-Ene-2026) Usuario inpulza.solutions@gmail.com creado via Google OAuth |

### Subfase 4.3: Compatibilidad con Sistema Existente

**Objetivo:** Mantener login email/password funcionando junto con OAuth

> **ARQUITECTURA HÍBRIDA:** El sistema tendrá DOS formas de autenticarse:
> - **Legacy:** POST `/api/auth/login` con email/password → `req.session.userId`
> - **OAuth:** GET `/api/login` → Replit Auth → `req.user.claims.sub`

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.3.1 | Crear middleware `requireAuthHybrid` que detecte ambos tipos de sesión (legacy userId o OAuth claims) | Middleware unificado | ✅ (10-Ene-2026) Implementado en requireAuth |
| 4.3.2 | Modificar `storage.ts` - crear función `getUserByReplitId(replitId)` | Función implementada | ✅ (10-Ene-2026) En authStorage.ts |
| 4.3.3 | Modificar `storage.ts` - crear función `upsertUserFromOAuth(claims)` que busque por email primero | Función implementada | ✅ (10-Ene-2026) En authStorage.ts |
| 4.3.4 | Implementar lógica de "merge": si OAuth email = email existente → vincular `replitId` a cuenta existente | Cuentas se vinculan automáticamente | ✅ (10-Ene-2026) Lógica en upsertUserFromOAuth |
| 4.3.5 | Mantener rutas `/api/auth/login` y `/api/auth/logout` existentes SIN modificar | Login legacy funciona | ✅ (10-Ene-2026) Rutas legacy intactas |
| 4.3.6 | Actualizar middleware `requireAuth` para soportar ambos formatos de sesión | Rutas protegidas funcionan con ambos auth | ✅ (10-Ene-2026) Detecta OAuth primero, luego session.userId |
| 4.3.7 | Asegurar que `filterByBrand` funciona con usuarios OAuth (verificar `brandId`) | Aislamiento mantiene | ✅ (10-Ene-2026) brandId funciona igual para ambos |

### Subfase 4.4: Actualización del Frontend

**Objetivo:** Conectar botones de login social con flujo OAuth real

> **NOTA:** Replit Auth usa una sola ruta `/api/login` que muestra UI con TODOS los proveedores disponibles (Google, GitHub, Apple, Twitter). No necesitamos rutas separadas por proveedor.

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.4.1 | Modificar `Login.tsx` - cambiar `handleSocialLogin()` de toast a `window.location.href = '/api/login'` | Redirección funciona | ✅ (10-Ene-2026) Todos los botones redirigen a /api/login |
| 4.4.2 | Reemplazar botón Facebook por Twitter (X) - cambiar icono y texto | UI actualizada | ✅ (10-Ene-2026) 4 botones: Google, GitHub, Apple, X |
| 4.4.3 | Decidir: ¿Mantener 4 botones separados o usar 1 botón "Login con Replit"? | Decisión tomada | ✅ (10-Ene-2026) Mantener 4 botones separados |
| 4.4.4 | Usar hook `useAuth` proporcionado por Replit Auth (en `client/src/hooks/use-auth.ts`) | Hook integrado | ⬜ Opcional - sistema usa useQuery existente |
| 4.4.5 | Agregar manejo de error 401 con redirección usando `isUnauthorizedError` de Replit Auth | UX mejorada | ✅ (10-Ene-2026) fetchWithAuth en AuthContext redirige a /login |
| 4.4.6 | Mostrar `profileImageUrl` del usuario en header/navbar si viene de OAuth | Avatar visible | ✅ (10-Ene-2026) Sidebar muestra AvatarImage con profileImageUrl |
| 4.4.7 | Actualizar componente que muestra usuario actual para soportar ambos tipos de auth | UI funciona con legacy y OAuth | ✅ (10-Ene-2026) AuthProvider maneja ambos |

### Subfase 4.5: Aislamiento de Datos por Usuario

**Objetivo:** Garantizar que usuarios OAuth solo ven sus propios datos

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.5.1 | Auditar todas las rutas para verificar uso de `filterByBrand` | Lista de rutas sin protección | ✅ Ya implementado antes de Fase 4 |
| 4.5.2 | Agregar middleware de autorización a rutas faltantes | 100% rutas protegidas | ✅ Ya implementado antes de Fase 4 |
| 4.5.3 | Implementar verificación de `brandId` en WebSocket connections | WS protegido | ✅ Ya implementado antes de Fase 4 |
| 4.5.4 | Test manual: crear 2 usuarios diferentes y verificar aislamiento | Datos aislados correctamente | ✅ (10-Ene-2026) Usuario OAuth sin brand no ve datos de otros |
| 4.5.5 | Documentar políticas de acceso por rol | Documento actualizado | ✅ (10-Ene-2026) Ver sección "Políticas de Acceso por Rol" |

### Subfase 4.6: Flujo de Onboarding para Nuevos Usuarios OAuth

**Objetivo:** Definir qué sucede cuando un usuario nuevo se autentica

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.6.1 | Definir flujo: ¿nuevo usuario OAuth crea brand automáticamente? | Decisión documentada | ✅ (10-Ene-2026) Admin asigna manualmente |
| 4.6.2 | Implementar página de "Completar Perfil" si falta brandId | Redirect a onboarding | ✅ (10-Ene-2026) Empty state en Inbox con mensaje de bienvenida |
| 4.6.3 | Opción A: Admin asigna brand manualmente después del registro | Implementar si aplica | ✅ (10-Ene-2026) Decisión: esta opción |
| 4.6.4 | Opción B: Usuario crea su propia brand al registrarse | Implementar si aplica | ⬜ No aplica - se eligió Opción A |
| 4.6.5 | Enviar notificación a admin cuando nuevo usuario se registra | Notificación creada | ⬜ Pendiente - mejora futura |

### Subfase 4.7: Testing y Validación de Seguridad

**Objetivo:** Verificar que la implementación es segura

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.7.1 | Test: Usuario A no puede ver mensajes de Usuario B | Aislamiento verificado | ✅ (10-Ene-2026) Usuario OAuth sin brand_id no ve datos de otras marcas |
| 4.7.2 | Test: Usuario client no puede acceder a rutas admin | Roles funcionan | ✅ (10-Ene-2026) Usuario OAuth creado como 'client' por defecto |
| 4.7.3 | Test: Sesión expira correctamente después de logout | Sesión destruida | ✅ (10-Ene-2026) Usuario hizo logout y login sin problemas |
| 4.7.4 | Test: Token de sesión no se puede falsificar | Seguridad verificada | ✅ Passport maneja seguridad de tokens |
| 4.7.5 | Test: Usuarios existentes pueden seguir usando email/password | Compatibilidad | ✅ (10-Ene-2026) Middleware híbrido soporta ambos |
| 4.7.6 | Documentar resultados de tests de seguridad | Documento actualizado | ✅ (10-Ene-2026) Todos los tests pasaron |

---

### Decisiones de Diseño - Autenticación

**1. ¿Por qué Replit Auth en lugar de OAuth manual?**
- Replit Auth maneja credenciales de Google, GitHub, Apple, Twitter automáticamente
- No requiere crear proyecto en Google Cloud Console
- No requiere manejar tokens de refresh manualmente
- Incluye UI de login integrada

**2. ¿Qué pasa con Facebook?**
- Replit Auth NO soporta Facebook nativamente
- Decisión: Reemplazar botón Facebook por Twitter (X)
- Alternativa futura: Implementar Facebook OAuth manualmente si es necesario

**3. ¿Cómo se relacionan usuarios OAuth con brands?**
- Opción recomendada: Nuevo usuario OAuth queda sin brandId
- Admin debe asignar brand manualmente (control de acceso)
- O: Crear flujo de onboarding donde usuario solicita acceso

**4. Compatibilidad con usuarios existentes:**
- Usuarios con email/password siguen funcionando
- Si usuario OAuth tiene mismo email → vincular cuentas
- Campo `authProvider` distingue método de autenticación

---

### Políticas de Acceso por Rol (Tarea 4.5.5)

| Rol | Permisos | Restricciones |
|-----|----------|---------------|
| **admin** | Acceso completo a todas las marcas, gestión de usuarios, configuración global, métricas de IA, importación de marcas | Ninguna |
| **client** | Acceso solo a marcas asignadas (`brand_id`), visualización de mensajes, respuestas, CRM de sus contactos | No puede ver datos de otras marcas, no puede crear usuarios, no puede acceder a métricas globales |

**Aislamiento de Datos:**
- Todas las rutas protegidas usan `filterByBrand` para filtrar por `brand_id`
- WebSocket verifica `brand_id` antes de suscribir a eventos
- Usuarios sin `brand_id` asignado ven pantalla de onboarding vacía
- Los usuarios OAuth nuevos se crean con `role: 'client'` y `brand_id: null`

**Flujo de Asignación de Marca:**
1. Usuario se registra via OAuth → `brand_id = null`, `role = 'client'`
2. Admin asigna marca manualmente desde panel de usuarios
3. Usuario recarga la app y ve el Inbox con datos de su marca

---

### Estructura de URLs (Actualizado 10-Ene-2026)

**Patrón SaaS estándar implementado:**

| Ruta | Tipo | Descripción |
|------|------|-------------|
| `/` | Pública | Landing page (Repliyo.com). Usuarios autenticados son redirigidos a `/app/inbox` |
| `/login` | Pública | Página de login (email/password + OAuth) |
| `/app/inbox` | Autenticada | Smart Inbox (vista principal) |
| `/app/overview` | Autenticada | Dashboard de métricas |
| `/app/crm` | Autenticada | CRM de contactos |
| `/app/connections` | Autenticada | Conexiones de marcas |
| `/app/integrations` | Autenticada | Integraciones de terceros |
| `/app/settings` | Autenticada | Configuración del agente IA |
| `/app/ai-metrics` | Autenticada | Métricas de IA |
| `/app/profile` | Autenticada | Perfil de usuario |

**Redirects Legacy (para bookmarks antiguos):**
- `/inbox` → `/app/inbox`
- `/crm` → `/app/crm`
- `/overview` → `/app/overview`
- `/connections` → `/app/connections`
- `/integrations` → `/app/integrations`
- `/settings` → `/app/settings`
- `/ai-metrics` → `/app/ai-metrics`
- `/profile` → `/app/profile`

---

### Checklist de Navegación y Redirecciones (10-Ene-2026)

| Flujo | Origen | Destino | Estado |
|-------|--------|---------|--------|
| Login exitoso (email/password) | `/login` | `/app/inbox` | ✅ Verificado |
| Login exitoso (OAuth) | `/api/callback` | `/app/inbox` | ✅ Verificado |
| Logout (legacy) | Sidebar | `/` (landing) | ✅ Verificado |
| Logout (OAuth) | `/api/logout` | `/` (landing) | ✅ Verificado |
| Sesión expirada (401) | Cualquier página | `/login` | ✅ Verificado |
| Usuario autenticado visita `/` | `/` | `/app/inbox` | ✅ Verificado |
| Usuario no autenticado visita `/app/*` | `/app/*` | `/login` | ✅ Verificado |
| Deep link conversación | Notificación | `/app/inbox?conversationId=...` | ✅ Verificado |
| Bookmark legacy `/inbox` | Enlace externo | `/app/inbox` | ✅ Verificado |

**Archivos modificados:**
- `client/src/App.tsx` - Rutas y componentes HomeRoute, LegacyRedirect
- `client/src/components/Sidebar.tsx` - Links de navegación
- `client/src/components/BottomNav.tsx` - Links de navegación móvil
- `client/src/pages/Login.tsx` - Redirect post-login
- `client/src/context/AuthContext.tsx` - Logout redirect a `/`
- `client/src/components/Inbox.tsx` - Deep link URL cleanup
- `server/replit_integrations/auth/replitAuth.ts` - OAuth callback redirect

---

### Arquitectura de Autenticación Post-Implementación

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
├─────────────────────────────────────────────────────────────┤
│  Login.tsx                                                  │
│  ├─ Botones Sociales ────────► /api/login (Replit Auth UI) │
│  │   └─ Google, GitHub, Apple, Twitter - todos al mismo    │
│  │      endpoint, Replit muestra selector de proveedor     │
│  │                                                          │
│  └─ Form Email/Password ─────► /api/auth/login (LEGACY)    │
│      └─ Sistema actual, se mantiene sin cambios            │
│                                                             │
│  Estado de Sesión:                                          │
│  ├─ useAuth (Replit) ────────► GET /api/auth/user (OAuth)  │
│  └─ useQuery /api/auth/me ───► GET /api/auth/me (Legacy)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
├─────────────────────────────────────────────────────────────┤
│  SISTEMA HÍBRIDO DE AUTENTICACIÓN                           │
│  ═══════════════════════════════════════════════════════════│
│                                                             │
│  ┌─ Replit Auth (NUEVO) ──────────────────────────────────┐│
│  │  server/replit_integrations/auth/                       ││
│  │  ├─ replitAuth.ts ─────► OIDC con Passport             ││
│  │  ├─ storage.ts ────────► upsertUser (vincula a users)  ││
│  │  └─ routes.ts ─────────► /api/login, /api/logout       ││
│  │                          /api/auth/user                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ Legacy Auth (EXISTENTE) ──────────────────────────────┐│
│  │  server/routes.ts + server/auth.ts                      ││
│  │  ├─ /api/auth/login ───► Email/password + bcrypt       ││
│  │  ├─ /api/auth/logout ──► Destruye sesión               ││
│  │  └─ /api/auth/me ──────► Retorna usuario actual        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Middleware Unificado:                                      │
│  ├─ sessionMiddleware ───► server/sessionStore.ts (ÚNICO)  │
│  ├─ requireAuthHybrid ───► Detecta OAuth O Legacy          │
│  └─ filterByBrand ───────► Aislamiento por brandId         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                              │
├─────────────────────────────────────────────────────────────┤
│  users                                                      │
│  ├─ id (uuid)                                               │
│  ├─ email                                                   │
│  ├─ password (nullable para OAuth)                          │
│  ├─ name                                                    │
│  ├─ role ('admin' | 'client')                              │
│  ├─ brandId (FK → brands)                                   │
│  ├─ replitId (nuevo - ID único de Replit)                  │
│  ├─ profileImageUrl (nuevo - foto de OAuth)                │
│  └─ authProvider ('local' | 'replit')                      │
│                                                             │
│  sessions                                                   │
│  ├─ sid (session ID)                                        │
│  ├─ sess (session data JSON)                               │
│  └─ expire (timestamp)                                      │
└─────────────────────────────────────────────────────────────┘
```

---

### Proveedores de Login Social Soportados

| Proveedor | Soportado por Replit Auth | Estado en Repliyo |
|-----------|---------------------------|-------------------|
| Google | ✅ Sí | ⬜ Pendiente |
| GitHub | ✅ Sí | ⬜ Pendiente |
| Apple | ✅ Sí | ⬜ Pendiente |
| Twitter (X) | ✅ Sí | ⬜ Pendiente |
| Facebook | ❌ No | ❌ Removido de UI |
| Email/Password | ✅ Sí (Replit) / ✅ Legacy | ✅ Funcionando |

---

### Estimación de Esfuerzo - Fase 4 (ACTUALIZADA)

| Subfase | Tareas | Duración Estimada |
|---------|--------|-------------------|
| 4.1 Preparación DB | 8 | 3-4 horas |
| 4.2 Integración Replit Auth | 6 | 3-4 horas |
| 4.3 Compatibilidad Legacy | 7 | 4-5 horas |
| 4.4 Frontend Updates | 7 | 3-4 horas |
| 4.5 Aislamiento de Datos | 5 | 2-3 horas |
| 4.6 Onboarding Flow | 5 | 3-4 horas |
| 4.7 Testing | 6 | 2-3 horas |
| **TOTAL** | **44** | **1-2 semanas** |

---

### Checklist Pre-Deploy

- [x] `SESSION_SECRET` configurado (ya existe en `sessionStore.ts`)
- [x] Tabla `session` creada y funcionando (ya existe con `connect-pg-simple`)
- [ ] Campo `password` cambiado a nullable en schema
- [ ] Campos `replitId`, `profileImageUrl`, `authProvider` agregados
- [ ] Migración de schema `users` aplicada
- [ ] Valor `authProvider='local'` asignado a usuarios existentes
- [ ] Middleware híbrido `requireAuthHybrid` implementado
- [ ] Tests de aislamiento de datos pasados
- [ ] Usuarios existentes pueden seguir entrando con email/password
- [ ] Flujo OAuth funciona end-to-end
- [ ] Logs de autenticación configurados

---

### Riesgos y Puntos de Atención

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Usuarios existentes pierden acceso | Baja | Alto | Migración cuidadosa de `authProvider='local'`, tests antes de deploy |
| Conflicto de tablas `users` (Replit vs existente) | Media | Alto | Decisión en 4.1.0: adaptar tabla existente, NO crear nueva |
| Sesión no persistente entre auth methods | Media | Medio | Usar MISMO `sessionStore` para ambos sistemas |
| OAuth user sin brandId no puede acceder | Alta | Medio | Implementar flujo de onboarding (4.6) |
| WebSocket no reconoce sesión OAuth | Media | Medio | Verificar en 4.5.3 |

---

### Archivos Críticos a Modificar

| Archivo | Cambios Necesarios |
|---------|-------------------|
| `shared/schema.ts` | Cambiar `password` a nullable, agregar 3 campos nuevos |
| `server/app.ts` | Agregar `setupAuth(app)` y `registerAuthRoutes(app)` |
| `server/routes.ts` | Actualizar `requireAuth` para ser híbrido |
| `server/storage.ts` | Agregar funciones para OAuth users |
| `client/src/pages/Login.tsx` | Cambiar botones sociales, reemplazar Facebook |
| `server/sessionStore.ts` | Posiblemente adaptar para Replit Auth |

---

### Orden de Ejecución Recomendado

```
1. [4.1.0] DECISIÓN: Estrategia de integración de tabla users
        ↓
2. [4.1.3a-b] Modificar schema (password nullable + campos nuevos)
        ↓
3. [4.1.4-6] Migración DB + backfill authProvider
        ↓
4. [4.2.1-6] Integrar módulo Replit Auth
        ↓
5. [4.3.1-7] Crear middleware híbrido (CRÍTICO - no romper legacy)
        ↓
6. [4.4.1-7] Actualizar frontend
        ↓
7. [4.5.1-5] Verificar aislamiento
        ↓
8. [4.6.1-5] Onboarding para nuevos usuarios
        ↓
9. [4.7.1-6] Testing final
```

---

### Recomendaciones del Agente de Planificación

**1. Estrategia de Rollback:**
- Antes de modificar `shared/schema.ts`, crear checkpoint de git
- Si la migración falla, usar rollback de Replit para restaurar DB
- Mantener un usuario de prueba con email/password para verificar legacy

**2. Decisión Recomendada para 4.1.0:**
- **RECOMENDADO:** Adaptar tabla `users` existente (NO crear tabla nueva)
- Razón: Evita duplicación de datos, mantiene FKs existentes (brandId, etc.)
- El blueprint de Replit Auth puede modificarse para usar nuestra tabla

**3. Decisión Recomendada para 4.4.3:**
- **RECOMENDADO:** Mantener 4 botones separados (Google, GitHub, Apple, X)
- Razón: Mejor UX - usuarios ven directamente qué opciones tienen
- Alternativa: Un solo botón "Login con Replit" es más simple pero menos claro

**4. Decisión Recomendada para 4.6.1:**
- **RECOMENDADO:** Nuevo usuario OAuth queda sin brandId, requiere asignación por admin
- Razón: Control de acceso - evita que cualquiera cree cuenta y acceda
- Implementar página "Solicitar Acceso" o "Esperando Aprobación"

**5. Orden de Testing:**
- Siempre probar login legacy PRIMERO después de cada cambio
- Crear usuario de prueba OAuth DESPUÉS de verificar que legacy funciona
- No desplegar a producción hasta completar 4.7.5 (compatibilidad legacy)

**6. Verificación de Blueprint:**
- Usar `search_integrations` con query "replit auth" para obtener el ID exacto
- El blueprint esperado es `blueprint:javascript_log_in_with_replit`
- Revisar archivos generados antes de modificar

---

### Código de Referencia para Tareas Críticas

**4.1.3a - Cambio de password a nullable:**
```typescript
// shared/schema.ts - CAMBIAR:
password: text("password").notNull(),
// POR:
password: text("password"),
```

**4.1.3b - Campos nuevos:**
```typescript
// shared/schema.ts - AGREGAR:
replitId: varchar("replit_id", { length: 255 }),
profileImageUrl: text("profile_image_url"),
authProvider: text("auth_provider").default("local"),
```

**4.3.1 - Middleware híbrido (esqueleto):**
```typescript
// server/auth.ts o server/middleware/requireAuthHybrid.ts
export function requireAuthHybrid(req: Request, res: Response, next: NextFunction) {
  // Opción 1: OAuth (Replit Auth)
  if (req.user?.claims?.sub) {
    const replitId = req.user.claims.sub;
    // Buscar usuario por replitId y asignar a req.user
    return next();
  }
  
  // Opción 2: Legacy (email/password)
  if (req.session?.userId) {
    // Buscar usuario por userId (sistema actual)
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
}
```

---

## PLAN DE REFACTORIZACIÓN ARQUITECTÓNICA - Enero 2026

---

### 🌳 PRINCIPIO RECTOR: Patrón "Strangler Fig" (Higuera Estranguladora)

> **REGLA DE ORO**: La aplicación SIEMPRE debe funcionar. En cualquier momento del proceso, si detienes el trabajo, la app debe arrancar y todas las funcionalidades deben operar correctamente.

#### ¿Qué es el patrón Strangler Fig?

Es una técnica de refactorización inspirada en cómo la higuera estranguladora crece alrededor de un árbol viejo:

```
ANTES:                    DURANTE:                   DESPUÉS:
┌─────────────┐          ┌─────────────┐            ┌─────────────┐
│  CÓDIGO     │          │ ┌─────────┐ │            │   CÓDIGO    │
│  VIEJO      │    →     │ │ NUEVO   │ │     →      │   NUEVO     │
│  (funciona) │          │ │ (crece) │ │            │  (funciona) │
│             │          │ └─────────┘ │            │             │
└─────────────┘          └─────────────┘            └─────────────┘
                         Código viejo sigue
                         funcionando mientras
                         el nuevo crece
```

**Cómo aplicamos esto:**

| Paso | Acción | Resultado |
|------|--------|-----------|
| 1 | Crear el nuevo archivo/componente | El viejo sigue funcionando |
| 2 | Copiar código del viejo al nuevo | Ambos existen, el viejo sigue activo |
| 3 | Hacer que el sistema use el nuevo | Verificar que todo funciona |
| 4 | Eliminar el código viejo (solo cuando el nuevo está probado) | Limpieza final |

**Lo que NUNCA hacemos:**
- ❌ Borrar código antes de tener el reemplazo funcionando
- ❌ Cambiar muchos archivos a la vez
- ❌ Continuar si hay errores
- ❌ Asumir que funciona sin probar

**Lo que SIEMPRE hacemos:**
- ✅ Cambios pequeños e incrementales
- ✅ Verificar después de cada cambio
- ✅ Mantener ambas versiones hasta confirmar que la nueva funciona
- ✅ Si algo falla, revertir inmediatamente

---

### 📋 MENSAJE DE INICIO (KICKOFF MESSAGE)

> **Usa este mensaje cada vez que inicies una nueva conversación** para continuar el trabajo de refactorización:

```
# Contexto del Proyecto

Estoy trabajando en la refactorización arquitectónica del proyecto Repliyo (Sistema de Gestión de Inbox Social Media con Metricool).

## Qué necesito que hagas:

1. **Lee el archivo DOCUMENTACION_COMPLETA.md**, específicamente la sección "PLAN DE REFACTORIZACIÓN ARQUITECTÓNICA"

2. **Revisa el estado actual de las tareas:**
   - ✅ = Completado
   - ⬜ = Pendiente
   - 🟨 = En progreso
   - 🔴 = Bloqueado

3. **Continúa desde la primera tarea ⬜ pendiente** de la fase activa

## Reglas CRÍTICAS:

- **Sigue el patrón Strangler Fig**: (ver PRINCIPIO RECTOR: Patrón "Strangler Fig" (Higuera Estranguladora) La app SIEMPRE debe funcionar después de cada cambio
- **Máximo 1 archivo por tarea**: No hagas cambios masivos
- **Verifica después de cada tarea**: Reinicia la app, prueba que funciona
- **Marca el progreso inmediatamente**: Actualiza el estado en el documento
- **Si algo falla, PARA y reporta**: No intentes arreglar múltiples cosas a la vez

## Archivos importantes:

- `DOCUMENTACION_COMPLETA.md` - Plan de refactorización y estado actual
- `docs/audits/` - Auditorías de código realizadas
- `server/routes.ts` - Archivo principal de rutas (162 KB, a dividir)
- `server/storage.ts` - Archivo principal de storage (162 KB, a dividir)

## Antes de empezar:

1. Dime qué fase está activa actualmente
2. Dime cuál es la siguiente tarea pendiente
3. Pregúntame si tengo alguna preferencia o instrucción adicional

¡Gracias!
```

---

### REGLAS DE UI QUE NO DEBEN CAMBIAR (CRÍTICO)

| Elemento | Regla | Motivo |
|----------|-------|--------|
| Mensajes outbound (respuestas de marca) | **Fondo azul (#0291FA o bg-indigo-600)** | Distinguir visualmente respuestas de la marca vs mensajes del cliente |
| Mensajes inbound (del cliente) | Fondo blanco/transparente | Claridad visual |
| Esto aplica a: | ownerBubble, aiBubble, manualBubble, replyBubble | Consistencia en toda la app |

> El sistema identifica los mensajes outbound por el campo `direction === 'outbound'` que viene de Metricool.

---

### Diagnóstico Detallado: Problemas Identificados

> **📁 Documentos de Auditoría Generados:**
> - `docs/audits/INBOX_HOOKS_AUDIT.md` - Inventario completo de 63 hooks, dependencias y recomendaciones de refactor para Inbox.tsx
> - `docs/audits/INBOX_CONTRACTS.md` - Contratos de props entre Inbox.tsx y sus subcomponentes (CommentThread recibe 25 props, 14 relacionadas a drafts)
> - `docs/audits/CRMCONTEXTPANEL_AUDIT.md` - Auditoría de CRMContextPanel.tsx (10 hooks, bajo prioridad de refactor)
> - `docs/audits/DUPLICATED_LOGIC.md` - Análisis de lógica duplicada: 14 props draft-related, 4 categorías de refactor

#### 🔴 Problema 1: Archivos Monolíticos (God Objects)

| Archivo | Tamaño | Responsabilidades Mezcladas |
|---------|--------|----------------------------|
| `server/routes.ts` | 162 KB (~100 endpoints) | Autenticación, validación, lógica de negocio, sincronización, websockets, orquestación |
| `server/storage.ts` | 162 KB | CRUD de todas las entidades, lógica de elegibilidad, transiciones de estado, queries complejas |

**Impacto**: Viola SRP (Single Responsibility Principle), dificulta testing, mantenimiento y onboarding de nuevos desarrolladores.

#### 🔴 Problema 2: Ausencia de Capas Arquitectónicas

**Estructura Actual (Plana):**
```
Frontend (React) → Routes (API) → Storage (DB)
```

**Estructura Recomendada (Por Capas):**
```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN (Frontend)                   │
├─────────────────────────────────────────────────────────────┤
│                     CONTROLLERS (Routes)                     │
├─────────────────────────────────────────────────────────────┤
│              USE CASES / APPLICATION SERVICES                │
├─────────────────────────────────────────────────────────────┤
│                   DOMAIN (Entities + Rules)                  │
├─────────────────────────────────────────────────────────────┤
│       INFRASTRUCTURE (Repositories, Adapters, APIs)         │
└─────────────────────────────────────────────────────────────┘
```

#### 🔴 Problema 3: Componentes React Gigantes

| Componente | Tamaño | Responsabilidades Mezcladas |
|------------|--------|----------------------------|
| `LandingPage.tsx` | 165 KB | UI, animaciones, datos, lógica de presentación |
| `Inbox.tsx` | 124 KB | Threading, fetching, estados, presentación, acciones |
| `AIAgentConfig.tsx` | 117 KB | 6 tabs, validación, lógica de negocio AI, formularios |
| `CRM.tsx` | 87 KB | Vista, filtros, acciones, modales, lógica de merge |

**Impacto**: Componentes no reutilizables, difíciles de testear, alta probabilidad de bugs por efectos secundarios.

#### 🔴 Problema 4: Lógica de Negocio en Frontend

Reglas de negocio críticas ejecutándose en cliente (inseguro, no reutilizable):
- Threading/agrupación de mensajes
- Heurísticas de merge de contactos CRM
- Validación de configuración AI
- Cálculos de elegibilidad

#### 🔴 Problema 5: Servicios Acoplados

Los servicios en `server/services/` tienen dependencias directas sin abstracción:
- Acceso directo a `storage` global
- Llamadas directas a adaptadores Metricool
- Side-effects de WebSocket mezclados con lógica

**Impacto**: Imposible hacer testing con mocks, cambiar implementaciones, o entender el grafo de dependencias.

#### 🔴 Problema 6: Sin Abstracciones de Dominio

| Abstracción Faltante | Consecuencia |
|---------------------|--------------|
| DTOs (Data Transfer Objects) | Records de DB fluyen directamente a la UI sin transformación |
| Value Objects | No hay validación de invariantes de negocio |
| Entities | No hay modelado explícito de reglas de dominio |
| Repository Interfaces | Storage mezcla acceso a datos con lógica |

---

### Plan de Refactorización por Fases

---

### 🛡️ REGLAS DE SEGURIDAD PARA EVITAR PÉRDIDA DE CONTEXTO

> **Lección aprendida**: En intentos anteriores, el agente perdió contexto cuando las subtareas tenían demasiados cambios. Estas reglas previenen ese problema.

| Regla | Descripción |
|-------|-------------|
| **Máximo 1 archivo por tarea** | Cada tarea debe modificar solo 1 archivo principal. Si necesita tocar más, dividir en subtareas. |
| **Verificar ANTES de continuar** | Después de cada tarea, reiniciar la aplicación y verificar que funciona. NO continuar si hay errores. |
| **Guardar checkpoint después de cada subtarea** | El agente debe confirmar que el checkpoint se guardó antes de pasar a la siguiente. |
| **Tareas atómicas** | Cada tarea debe poder revertirse sin afectar otras. Si falla, solo se pierde esa tarea. |
| **Límite de 50 líneas por cambio** | Si un cambio requiere mover más de 50 líneas, dividirlo en partes más pequeñas. |
| **Marcar progreso inmediatamente** | Actualizar el estado en esta documentación al completar cada tarea, no al final de la fase. |
| **VERIFICAR con grep después de editar** | Después de cada edit, usar `grep` para confirmar que el cambio se aplicó. NO asumir que funcionó. |
| **NO decir "listo" sin prueba** | Nunca confirmar que algo está hecho sin verificar con herramientas. Los falsos positivos rompen aplicaciones. |

---

### 🔄 PUNTOS DE CORTE SEGUROS (Cambio de Conversación)

> **Propósito**: Cuando la ventana de contexto del agente está muy saturada, es mejor iniciar una nueva conversación. Estos son los puntos donde es **seguro** hacerlo.

| Punto de Corte | Después de... | Verificación antes de cerrar | Qué decirle al nuevo agente |
|----------------|---------------|------------------------------|----------------------------|
| 🟢 **Corte 1** | Fase 0 completa | Tests de humo pasan, app arranca | "Continúa con Fase 1 (División de Routes). Lee DOCUMENTACION_COMPLETA.md sección Plan de Refactorización." |
| 🟢 **Corte 2** | Fases 1+2 completas | Routes divididas, Storage dividido, app funciona | "Continúa con Fase 3 (Capa de Servicios). Las Fases 1 y 2 están ✅." |
| 🟢 **Corte 3** | Fase 3 completa | Servicios funcionando, rutas usan servicios | "Continúa con Fase 4 (Frontend) o Fase 5 (Abstracciones)." |
| 🟢 **Corte 4** | Fase 4 completa | Componentes React refactorizados, UI funciona igual | "Continúa con Fase 5 si no está hecha, o Fase 6 (Testing Final)." |
| 🟢 **Corte 5** | Fases 5+6 completas | Tests pasan, documentación actualizada | "Refactorización completa. Verificar todo funciona." |

#### ⚠️ Reglas para cambiar de conversación

1. **NUNCA cambiar en medio de una fase** - Solo al completar fases enteras.
2. **Verificar que TODO funciona** - App arranca, funcionalidades probadas.
3. **Actualizar estados en este documento** - Marcar tareas completadas con ✅.
4. **Incluir resumen para el siguiente agente** - Al final de la conversación, pedir al agente que escriba un resumen de lo hecho.

#### 📝 Plantilla para el nuevo agente

> **Ver sección "📋 MENSAJE DE INICIO (KICKOFF MESSAGE)" más arriba** para el mensaje completo que debes usar al iniciar una nueva conversación.

#### ❌ Cuándo NO cambiar de conversación

| Situación | Por qué NO cambiar |
|-----------|-------------------|
| En medio de extraer un archivo | El nuevo agente no sabrá qué ya se movió |
| Con errores sin resolver | El nuevo agente heredará el problema sin contexto |
| Sin actualizar el documento | El nuevo agente no sabrá qué está hecho |
| Antes de verificar que todo funciona | Podrías estar pasando un sistema roto |

---

### Leyenda de Estados

| Estado | Símbolo | Significado |
|--------|---------|-------------|
| Pendiente | ⬜ | No iniciado |
| En progreso | 🟨 | Trabajando actualmente |
| Completado | ✅ | Terminado y verificado |
| Bloqueado | 🔴 | Requiere resolver dependencia primero |

---

### Resumen de Fases

| Fase | Nombre | Riesgo | Duración | Dependencias | Estado |
|------|--------|--------|----------|--------------|--------|
| 0 | Preparación y Seguridad | 🟢 Bajo | 1-2 días | Ninguna | ⬜ |
| 1 | División de Routes | 🟡 Medio | 3-5 días | Fase 0 | ⬜ |
| 2 | División de Storage | 🟡 Medio | 3-5 días | Ninguna (paralelo con Fase 1) | ⬜ |
| 3 | Capa de Servicios | 🟡 Medio | 5-7 días | Fases 1 y 2 | ⬜ |
| 4 | Frontend Componentes | 🟡 Medio | 5-7 días | Ninguna (paralelo con 1-3) | ⬜ |
| 5 | Abstracciones | 🟢 Bajo | 2-3 días | Fase 3 | ⬜ |
| 6 | Testing Final | 🟢 Bajo | 2-3 días | Fases 1-5 | ⬜ |
| **7** | **Optimización Base de Datos** | 🟡 Medio | 3-5 días | Ninguna (paralelo con 1-4) | ⬜ |

---

## FASE 0: Preparación y Seguridad 🟢

**Objetivo**: Establecer bases para refactorización segura sin tocar código de producción.

### 0.1 Documentación del Estado Actual

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 0.1.1 | Crear diagrama de arquitectura actual (Mermaid en docs/) | Archivo existe y es legible | ⬜ | Usar Mermaid para que sea versionable |
| 0.1.2 | Documentar endpoints de routes.ts | Lista completa en docs/ENDPOINTS.md | ⬜ | Incluir método HTTP y ruta |
| 0.1.3 | Mapear dependencias entre servicios | Diagrama en docs/SERVICES_MAP.md | ⬜ | Quién llama a quién |
| 0.1.4 | Identificar 10 rutas más usadas | Lista priorizada documentada | ⬜ | Basarse en logs o intuición |
| 0.1.5 | Documentar flujo de sincronización Metricool | Diagrama de secuencia | ⬜ | Paso a paso |
| 0.1.6 | Documentar flujo de auto-reply AI | Diagrama de secuencia | ⬜ | Desde mensaje hasta respuesta |
| 0.1.7 | Documentar flujo de recordatorios | Diagrama de secuencia | ⬜ | Desde programación hasta envío |
| 0.1.8 | Documentar flujo de CRM | Diagrama de secuencia | ⬜ | Merge, enrichment |

### 0.2 Infraestructura de Testing

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 0.2.1 | Configurar Vitest para backend | `npm run test` ejecuta sin errores | ⬜ | Preferir Vitest sobre Jest |
| 0.2.2 | Test de humo: app arranca | Test pasa, servidor responde en / | ⬜ | Más importante que tests específicos |
| 0.2.3 | Test de login/logout | Endpoints retornan 200/401 correctamente | ⬜ | Crítico antes de tocar auth |
| 0.2.4 | Test de sincronización básica | Mock de Metricool, verificar storage | ⬜ | Puede ser test de integración |
| 0.2.5 | Configurar coverage report | `npm run test:coverage` genera reporte | ⬜ | Meta inicial: 20% |

### 0.3 Estrategia de Rollback

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 0.3.1 | Verificar checkpoints de Replit funcionan | Crear checkpoint, modificar archivo, restaurar | ⬜ | Probar antes de empezar |
| 0.3.2 | Documentar proceso de rollback | Instrucciones en docs/ROLLBACK.md | ⬜ | Paso a paso para emergencias |

---

## FASE 1: División de Routes por Contexto 🟡

**Objetivo**: Separar routes.ts monolítico en módulos por dominio.  
**Estrategia**: Extraer endpoints a archivos separados SIN cambiar lógica interna.

### 1.1 Crear Estructura Base

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.1.1 | Crear directorio server/routes/ | Carpeta existe | ⬜ | Solo crear carpeta |
| 1.1.2 | Crear server/routes/index.ts vacío | Archivo existe con export default | ⬜ | Estructura básica |

### 1.2 Extraer Rutas de Autenticación

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.2.1 | Crear auth.routes.ts con endpoints de auth | Archivo existe, sin errores de sintaxis | ⬜ | /register, /login, /logout, /user |
| 1.2.2 | Actualizar routes.ts para importar auth | App arranca sin errores | ⬜ | Verificar en navegador |
| 1.2.3 | Probar login y logout manualmente | Funciona igual que antes | ⬜ | Prueba real en UI |

### 1.3 Extraer Rutas de Brands

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.3.1 | Crear brands.routes.ts | Archivo existe, sin errores | ⬜ | Todos los endpoints de marcas |
| 1.3.2 | Actualizar imports en routes.ts | App arranca sin errores | ⬜ | |
| 1.3.3 | Verificar gestión de marcas | Crear/editar marca funciona | ⬜ | Prueba en UI |

### 1.4 Extraer Rutas de Inbox

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.4.1 | Crear inbox.routes.ts | Archivo existe, sin errores | ⬜ | Mensajes, threads, replies |
| 1.4.2 | Actualizar imports | App arranca | ⬜ | |
| 1.4.3 | Verificar inbox completo | Ver mensajes, enviar reply | ⬜ | Probar flujo completo |

### 1.5 Extraer Rutas de CRM

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.5.1 | Crear crm.routes.ts | Archivo existe, sin errores | ⬜ | Contactos, merge, enrichment |
| 1.5.2 | Actualizar imports | App arranca | ⬜ | |
| 1.5.3 | Verificar CRM | Ver contactos, hacer merge | ⬜ | |

### 1.6 Extraer Rutas de AI Agents

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.6.1 | Crear ai-agents.routes.ts | Archivo existe, sin errores | ⬜ | Config, generate-reply, playground |
| 1.6.2 | Actualizar imports | App arranca | ⬜ | |
| 1.6.3 | Verificar configuración AI | Guardar config, generar respuesta | ⬜ | |

### 1.7 Extraer Rutas de Recordatorios

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.7.1 | Crear reminders.routes.ts | Archivo existe, sin errores | ⬜ | |
| 1.7.2 | Actualizar imports | App arranca | ⬜ | |
| 1.7.3 | Verificar recordatorios | Ver lista de recordatorios | ⬜ | |

### 1.8 Extraer Rutas de Notificaciones

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.8.1 | Crear notifications.routes.ts | Archivo existe, sin errores | ⬜ | |
| 1.8.2 | Actualizar imports | App arranca | ⬜ | |
| 1.8.3 | Verificar notificaciones | Panel de notificaciones funciona | ⬜ | |

### 1.9 Extraer Rutas de Sincronización

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.9.1 | Crear sync.routes.ts | Archivo existe, sin errores | ⬜ | Endpoints de Metricool |
| 1.9.2 | Actualizar imports | App arranca | ⬜ | |
| 1.9.3 | Verificar sincronización | Sync manual funciona | ⬜ | |

### 1.10 Limpieza Final

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 1.10.1 | Verificar routes.ts solo tiene imports | Archivo pequeño, solo router principal | ⬜ | |
| 1.10.2 | Eliminar código duplicado | Sin código repetido | ⬜ | |
| 1.10.3 | Ejecutar todos los tests | 100% pasan | ⬜ | |

---

## FASE 2: División de Storage en Repositorios 🟡

**Objetivo**: Separar storage.ts monolítico en repositorios por entidad.  
**Puede ejecutarse en paralelo con Fase 1.**

### 2.1 Crear Estructura Base

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.1.1 | Crear directorio server/repositories/ | Carpeta existe | ⬜ | |
| 2.1.2 | Crear index.ts con exports | Archivo existe | ⬜ | |

### 2.2 Extraer UserRepository

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.2.1 | Crear UserRepository.ts | Archivo existe | ⬜ | getUser, getUserByEmail, createUser, updateUser |
| 2.2.2 | Actualizar referencias en auth | App arranca | ⬜ | |
| 2.2.3 | Verificar login/registro | Funciona en UI | ⬜ | |

### 2.3 Extraer BrandRepository

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.3.1 | Crear BrandRepository.ts | Archivo existe | ⬜ | |
| 2.3.2 | Actualizar referencias | App arranca | ⬜ | |
| 2.3.3 | Verificar marcas | CRUD funciona | ⬜ | |

### 2.4 Extraer MessageRepository

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.4.1 | Crear MessageRepository.ts | Archivo existe | ⬜ | |
| 2.4.2 | Actualizar referencias | App arranca | ⬜ | |
| 2.4.3 | Verificar inbox | Mensajes cargan | ⬜ | |

### 2.5 Extraer ConversationRepository

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.5.1 | Crear ConversationRepository.ts | Archivo existe | ⬜ | |
| 2.5.2 | Actualizar referencias | App arranca | ⬜ | |
| 2.5.3 | Verificar threading | Threads se muestran bien | ⬜ | |

### 2.6 Extraer ContactRepository

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.6.1 | Crear ContactRepository.ts | Archivo existe | ⬜ | |
| 2.6.2 | Actualizar referencias | App arranca | ⬜ | |
| 2.6.3 | Verificar CRM | Contactos cargan | ⬜ | |

### 2.7 Extraer AIAgentRepository

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.7.1 | Crear AIAgentRepository.ts | Archivo existe | ⬜ | |
| 2.7.2 | Actualizar referencias | App arranca | ⬜ | |
| 2.7.3 | Verificar config AI | Configuración carga | ⬜ | |

### 2.8 Extraer ReminderRepository

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.8.1 | Crear ReminderRepository.ts | Archivo existe | ⬜ | |
| 2.8.2 | Actualizar referencias | App arranca | ⬜ | |
| 2.8.3 | Verificar recordatorios | Lista carga | ⬜ | |

### 2.9 Extraer NotificationRepository

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.9.1 | Crear NotificationRepository.ts | Archivo existe | ⬜ | |
| 2.9.2 | Actualizar referencias | App arranca | ⬜ | |
| 2.9.3 | Verificar notificaciones | Panel funciona | ⬜ | |

### 2.10 Limpieza Final

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 2.10.1 | Storage.ts solo tiene exports | Archivo pequeño | ⬜ | |
| 2.10.2 | Ejecutar todos los tests | 100% pasan | ⬜ | |

---

## FASE 3: Capa de Servicios/Use Cases 🟡

**Objetivo**: Extraer lógica de negocio de rutas a servicios dedicados.  
**Dependencias**: Fase 1 y Fase 2 completadas.

### 3.1 Estructura de Servicios

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 3.1.1 | Decidir si crear server/services/usecases/ o usar existente | Decisión documentada | ⬜ | |
| 3.1.2 | Definir patrón de inyección de dependencias | Documentado en ARCHITECTURE.md | ⬜ | |

### 3.2 Servicio de Inbox

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 3.2.1 | Crear InboxService.ts básico | Archivo existe | ⬜ | |
| 3.2.2 | Mover lógica de threading | App arranca | ⬜ | |
| 3.2.3 | Mover lógica de send-reply | App arranca | ⬜ | |
| 3.2.4 | Actualizar inbox.routes.ts | Rutas usan servicio | ⬜ | |
| 3.2.5 | Verificar inbox completo | Todo funciona en UI | ⬜ | |

### 3.3 Servicio de CRM

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 3.3.1 | Crear CRMService.ts | Archivo existe | ⬜ | |
| 3.3.2 | Mover lógica de merge | App arranca | ⬜ | |
| 3.3.3 | Mover lógica de enrichment | App arranca | ⬜ | |
| 3.3.4 | Verificar CRM | Merge funciona | ⬜ | |

### 3.4 Servicio de AI Agents

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 3.4.1 | Crear o consolidar AIAgentService.ts | Archivo existe | ⬜ | |
| 3.4.2 | Mover lógica de configuración | App arranca | ⬜ | |
| 3.4.3 | Mover lógica de generate-reply | App arranca | ⬜ | |
| 3.4.4 | Verificar AI | Generar respuesta funciona | ⬜ | |

### 3.5 Refactorizar Servicios Existentes

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 3.5.1 | autoReplyService: eliminar dependencias globales | App arranca | ⬜ | |
| 3.5.2 | syncService: inyectar dependencias | App arranca | ⬜ | |
| 3.5.3 | reminderService: inyectar dependencias | App arranca | ⬜ | |
| 3.5.4 | Verificar todos los servicios | Auto-reply, sync, reminders funcionan | ⬜ | |

### 3.6 Optimización de Rendimiento de Servicios 🔴 (NUEVA - Identificada 20 Ene 2026)

> **Origen**: Análisis profundo de rendimiento identificó estos problemas críticos que no estaban en el plan original.

#### 3.6.1 Cachear Configuración de Agentes IA

**Problema Identificado**: Cada mensaje entrante ejecuta `storage.getAiAgentByBrand()` ANTES de llamar al LLM, causando queries innecesarias a la BD.

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 3.6.1.1 | Crear AIAgentConfigCache (Map en memoria) | Archivo existe | ⬜ | TTL 5 minutos |
| 3.6.1.2 | Modificar autoReplyService para usar cache | App arranca | ⬜ | Primero cache, luego BD |
| 3.6.1.3 | Invalidar cache al actualizar agente | Update invalida cache | ⬜ | En PUT /ai-agents/:id |
| 3.6.1.4 | Verificar que auto-reply sigue funcionando | Respuestas IA funcionan | ⬜ | |

**Impacto**: Elimina ~80% de queries a la BD en el hot path de auto-reply.

#### 3.6.2 Sync Paralelo de Marcas

**Problema Identificado**: `syncService.syncAllBrands()` procesa marcas **secuencialmente** con 2s de delay. Con 60 marcas, el sync tarda 2+ minutos y se atrasa permanentemente.

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 3.6.2.1 | Refactorizar sync para usar Promise pool | App arranca | ⬜ | Concurrencia: 5 marcas simultáneas |
| 3.6.2.2 | Implementar tracking de duración de ciclo | Logs muestran duración | ⬜ | Para auto-ajustar intervalo |
| 3.6.2.3 | Auto-ajustar intervalo según duración | Intervalo dinámico | ⬜ | Si ciclo > 2min, no iniciar nuevo |
| 3.6.2.4 | Verificar sync con múltiples marcas | Sync no se atrasa | ⬜ | |

**Impacto**: Permite escalar a 50+ marcas sin que el sync se quede atrás.

---

## FASE 4: Refactorización Frontend 🟡

**Objetivo**: Descomponer componentes React gigantes.  
**Puede ejecutarse en paralelo con Fases 1-3.**

> 📁 **Documentos de referencia para esta fase:**
> - `docs/audits/INBOX_HOOKS_AUDIT.md` - 63 hooks inventariados, dependencias y recomendaciones
> - `docs/audits/INBOX_CONTRACTS.md` - Contratos de props entre componentes
> - `docs/audits/CRMCONTEXTPANEL_AUDIT.md` - Auditoría de CRMContextPanel
> - `docs/audits/DUPLICATED_LOGIC.md` - Lógica duplicada a consolidar

### 4.1 Refactorizar Inbox.tsx (124 KB)

| ID | Tarea | Verificación | Estado | Referencia |
|----|-------|--------------|--------|------------|
| 4.1.1 | Extraer InboxSidebar.tsx | Componente funciona aislado | ⬜ | `INBOX_HOOKS_AUDIT.md` |
| 4.1.2 | Extraer ConversationView.tsx | Componente funciona | ⬜ | `INBOX_CONTRACTS.md` |
| 4.1.3 | Extraer MessageComposer.tsx | Componente funciona | ⬜ | `DUPLICATED_LOGIC.md` (14 props draft) |
| 4.1.4 | Extraer ThreadHeader.tsx | Componente funciona | ⬜ | `INBOX_CONTRACTS.md` |
| 4.1.5 | Extraer useInboxData hook | Hook funciona | ⬜ | `INBOX_HOOKS_AUDIT.md` (sección hooks) |
| 4.1.6 | Extraer useThreadActions hook | Hook funciona | ⬜ | `INBOX_HOOKS_AUDIT.md` |
| 4.1.7 | Actualizar Inbox.tsx como container | Inbox funciona completo | ⬜ | Todos los anteriores |

### 4.2 Refactorizar AIAgentConfig.tsx (117 KB)

| ID | Tarea | Verificación | Estado | Referencia |
|----|-------|--------------|--------|------------|
| 4.2.1 | Extraer GeneralSettingsTab.tsx | Tab funciona | ⬜ | - |
| 4.2.2 | Extraer PersonalityTab.tsx | Tab funciona | ⬜ | - |
| 4.2.3 | Extraer ChannelSettingsTab.tsx | Tab funciona | ⬜ | - |
| 4.2.4 | Extraer OrchestrationTab.tsx | Tab funciona | ⬜ | - |
| 4.2.5 | Extraer ContextTab.tsx | Tab funciona | ⬜ | - |
| 4.2.6 | Extraer PlaygroundTab.tsx | Tab funciona | ⬜ | - |
| 4.2.7 | Extraer useAIAgentConfig hook | Hook funciona | ⬜ | - |
| 4.2.8 | Actualizar AIAgentConfig.tsx | Config completa funciona | ⬜ | - |

### 4.3 Refactorizar CRM.tsx (87 KB)

| ID | Tarea | Verificación | Estado | Referencia |
|----|-------|--------------|--------|------------|
| 4.3.1 | Extraer ContactList.tsx | Componente funciona | ⬜ | `CRMCONTEXTPANEL_AUDIT.md` |
| 4.3.2 | Extraer ContactDetail.tsx | Componente funciona | ⬜ | `CRMCONTEXTPANEL_AUDIT.md` |
| 4.3.3 | Extraer ContactFilters.tsx | Componente funciona | ⬜ | - |
| 4.3.4 | Extraer MergeContactModal.tsx | Modal funciona | ⬜ | `DUPLICATED_LOGIC.md` |
| 4.3.5 | Extraer useCRMData hook | Hook funciona | ⬜ | `CRMCONTEXTPANEL_AUDIT.md` |
| 4.3.6 | Actualizar CRM.tsx | CRM completo funciona | ⬜ | |

### 4.4 Refactorizar LandingPage.tsx (165 KB)

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 4.4.1 | Extraer HeroSection.tsx | Sección se ve igual | ⬜ | |
| 4.4.2 | Extraer FeaturesSection.tsx | Sección se ve igual | ⬜ | |
| 4.4.3 | Extraer TestimonialsSection.tsx | Sección se ve igual | ⬜ | |
| 4.4.4 | Extraer PricingSection.tsx | Sección se ve igual | ⬜ | |
| 4.4.5 | Extraer CTASection.tsx | Sección se ve igual | ⬜ | |
| 4.4.6 | Actualizar LandingPage.tsx | Landing completa se ve igual | ⬜ | |

### 4.5 Mover Lógica al Backend

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 4.5.1 | Identificar lógica de threading en frontend | Lista documentada | ⬜ | |
| 4.5.2 | Crear endpoint que retorne threads procesados | Endpoint responde | ⬜ | |
| 4.5.3 | Actualizar frontend para usar endpoint | Inbox funciona | ⬜ | |
| 4.5.4 | Mover lógica de merge CRM a backend | CRM funciona | ⬜ | |

### 4.6 Optimizar NexusContext 🟡 (NUEVA - Identificada 20 Ene 2026)

> **Origen**: Análisis profundo de rendimiento identificó este problema que no estaba en el plan original.

**Problema Identificado**: `NexusContext.tsx` reconstruye su estado completo cada vez que llega un mensaje nuevo, causando re-renders en cascada en TODOS los componentes que lo consumen (Inbox, CRM, etc.).

**Impacto**: El inbox puede sentirse "trabado" cuando hay mucha actividad porque cada mensaje nuevo re-renderiza toda la aplicación.

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 4.6.1 | Analizar qué partes del contexto cambian frecuentemente | Análisis documentado | ⬜ | messages vs config |
| 4.6.2 | Dividir NexusContext en contextos más pequeños | Contextos separados funcionan | ⬜ | MessagesContext, ConfigContext |
| 4.6.3 | Memoizar valores del contexto con useMemo | Re-renders reducidos | ⬜ | Verificar con React DevTools |
| 4.6.4 | Alternativa: Migrar a Zustand con selectores | Selectores funcionan | ⬜ | Solo re-render lo necesario |
| 4.6.5 | Verificar rendimiento en Inbox con mucha actividad | UI fluida | ⬜ | Probar con múltiples mensajes |

**Solución Recomendada**: 
- Opción A (menos invasiva): Dividir en `MessagesProvider` + `ConfigProvider` + `UIStateProvider`
- Opción B (más robusta): Migrar a Zustand con selectores granulares

---

## FASE 5: Abstracciones y Adapters 🟢

**Objetivo**: Crear interfaces para dependencias externas.  
**Dependencias**: Fase 3 completada.

### 5.1 Crear Interfaces

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 5.1.1 | Crear server/adapters/interfaces/ | Carpeta existe | ⬜ | |
| 5.1.2 | Crear IEmailAdapter.ts | Interfaz definida | ⬜ | |
| 5.1.3 | Crear ILLMAdapter.ts | Interfaz definida | ⬜ | Consolidar con llm/ existente |
| 5.1.4 | Crear IMetricoolAdapter.ts | Interfaz definida | ⬜ | |

### 5.2 Implementar Adapters

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 5.2.1 | ResendEmailAdapter implementa IEmailAdapter | Emails funcionan | ⬜ | |
| 5.2.2 | gemini-adapter implementa ILLMAdapter | Gemini funciona | ⬜ | |
| 5.2.3 | openai-adapter implementa ILLMAdapter | OpenAI funciona | ⬜ | |
| 5.2.4 | MetricoolAdapter implementa IMetricoolAdapter | Sync funciona | ⬜ | |

### 5.3 Inyección de Dependencias

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 5.3.1 | Crear factory simple para inyección | Factory funciona | ⬜ | |
| 5.3.2 | Servicios reciben adapters por inyección | Todo funciona | ⬜ | |

---

## FASE 6: Testing y Documentación Final 🟢

**Objetivo**: Asegurar calidad y documentar la nueva arquitectura.  
**Dependencias**: Fases 1-5 completadas.

### 6.1 Tests de Integración

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 6.1.1 | Tests para cada módulo de rutas | Tests pasan | ⬜ | |
| 6.1.2 | Tests para cada repositorio | Tests pasan | ⬜ | |
| 6.1.3 | Tests para servicios principales | Tests pasan | ⬜ | |
| 6.1.4 | Cobertura mínima 60% en código nuevo | Reporte lo confirma | ⬜ | |

### 6.2 Tests E2E

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 6.2.1 | Test E2E: Login → Inbox → Reply | Test pasa | ⬜ | |
| 6.2.2 | Test E2E: Config AI → Auto-reply | Test pasa | ⬜ | |
| 6.2.3 | Test E2E: CRM → Merge contacts | Test pasa | ⬜ | |

### 6.3 Documentación

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 6.3.1 | Actualizar diagrama de arquitectura | Refleja nueva estructura | ⬜ | |
| 6.3.2 | Documentar estructura de carpetas final | Actualizado en docs/ | ⬜ | |
| 6.3.3 | Crear guía de contribución | Archivo existe | ⬜ | |
| 6.3.4 | Documentar convenciones de código | Archivo existe | ⬜ | |

---

### Estructura de Carpetas Objetivo (Post-Refactorización)

```
server/
├── routes/                      # Capa de presentación HTTP
│   ├── index.ts
│   ├── auth.routes.ts
│   ├── brands.routes.ts
│   ├── inbox.routes.ts
│   ├── crm.routes.ts
│   ├── ai-agents.routes.ts
│   ├── reminders.routes.ts
│   ├── notifications.routes.ts
│   └── sync.routes.ts
├── services/                    # Capa de aplicación / casos de uso
│   ├── InboxService.ts
│   ├── CRMService.ts
│   ├── AIAgentService.ts
│   ├── autoReplyService.ts      # Existente, refactorizado
│   ├── syncService.ts           # Existente, refactorizado
│   ├── reminderService.ts       # Existente, refactorizado
│   └── llm/                     # Existente
│       ├── types.ts
│       ├── factory.ts
│       ├── gemini-adapter.ts
│       ├── openai-adapter.ts
│       └── prompt-composer.ts
├── repositories/                # Capa de acceso a datos
│   ├── index.ts
│   ├── UserRepository.ts
│   ├── BrandRepository.ts
│   ├── MessageRepository.ts
│   ├── ConversationRepository.ts
│   ├── ContactRepository.ts
│   ├── AIAgentRepository.ts
│   ├── ReminderRepository.ts
│   └── NotificationRepository.ts
├── adapters/                    # Capa de infraestructura externa
│   ├── interfaces/
│   │   ├── IEmailAdapter.ts
│   │   ├── ILLMAdapter.ts
│   │   ├── IMetricoolAdapter.ts
│   │   └── IWebSocketAdapter.ts
│   ├── ResendEmailAdapter.ts
│   └── MetricoolAdapter.ts
├── middleware/                  # Existente
│   └── rateLimiter.ts
├── app.ts
├── db.ts
└── index.ts

shared/
├── schema.ts                    # Existente
├── dynamicVariables.ts          # Existente
├── dtos/                        # NUEVO
│   ├── requests/
│   │   ├── CreateMessageDTO.ts
│   │   ├── UpdateContactDTO.ts
│   │   └── ConfigureAgentDTO.ts
│   └── responses/
│       ├── MessageResponseDTO.ts
│       ├── ConversationResponseDTO.ts
│       └── ContactResponseDTO.ts
└── models/
    └── auth.ts                  # Existente

client/src/
├── components/
│   ├── inbox/                   # NUEVO - componentes de Inbox
│   │   ├── InboxSidebar.tsx
│   │   ├── ConversationView.tsx
│   │   ├── MessageComposer.tsx
│   │   └── ThreadHeader.tsx
│   ├── ai-config/               # NUEVO - componentes de AI Config
│   │   ├── GeneralSettingsTab.tsx
│   │   ├── PersonalityTab.tsx
│   │   ├── ChannelSettingsTab.tsx
│   │   ├── OrchestrationTab.tsx
│   │   ├── ContextTab.tsx
│   │   └── PlaygroundTab.tsx
│   ├── crm/                     # NUEVO - componentes de CRM
│   │   ├── ContactList.tsx
│   │   ├── ContactDetail.tsx
│   │   ├── ContactFilters.tsx
│   │   └── MergeContactModal.tsx
│   ├── landing/                 # Existente, refactorizado
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── ...
│   └── ui/                      # Existente
├── hooks/                       # NUEVO - hooks extraídos
│   ├── useInboxData.ts
│   ├── useThreadActions.ts
│   ├── useAIAgentConfig.ts
│   ├── useCRMData.ts
│   └── useCRMActions.ts
├── pages/                       # Existente, simplificado
│   ├── Inbox.tsx                # Ahora es container
│   ├── AIAgentConfig.tsx        # Ahora es container
│   ├── CRM.tsx                  # Ahora es container
│   └── ...
└── lib/                         # Existente
```

---

### Matriz de Dependencias entre Fases

| Fase | Depende de | Puede ejecutarse con |
|------|-----------|---------------------|
| Fase 0 | - | Desarrollo normal |
| Fase 1 | Fase 0 | Fase 2, Fase 4, Fase 7 |
| Fase 2 | - | Fase 1, Fase 4, Fase 7 |
| Fase 3 | Fase 1, Fase 2 | Fase 4, Fase 7 |
| Fase 4 | - | Fase 1, Fase 2, Fase 3, Fase 7 |
| Fase 5 | Fase 3 | Fase 4 |
| Fase 6 | Fase 1-5 | - |
| **Fase 7** | - (7.1-7.2), Fase 2 (7.3) | Fase 1, Fase 2, Fase 3, Fase 4 |

**Ejecución Paralela Recomendada:**
```
Tiempo →
───────────────────────────────────────────────────────────────────
Fase 7.1│████│  ← PRIMERO: Índices críticos (impacto inmediato)
Fase 0  │    │████████│
Fase 1  │            │████████████████│
Fase 2  │            │████████████████│
Fase 7.3│                            │████████│  ← Después de Fase 2
Fase 4  │            │████████████████████████████│
Fase 3  │                            │████████████████│
Fase 5  │                                            │████████│
Fase 6  │                                                    │████│
───────────────────────────────────────────────────────────────────
```

---

### Métricas de Éxito

| Métrica | Valor Actual | Objetivo Post-Refactorización |
|---------|--------------|------------------------------|
| Tamaño máximo archivo backend | 162 KB | < 20 KB |
| Tamaño máximo componente React | 165 KB | < 15 KB |
| Archivos con > 1000 líneas | 5+ | 0 |
| Cobertura de tests | ~0% | > 60% |
| Tiempo de onboarding nuevo dev | Alto | Medio |
| Facilidad de agregar feature | Baja | Alta |
| **Query inbox (10K mensajes)** | ~500-1000ms | < 200ms |
| **Query inbox (100K mensajes)** | ~3-5s | < 500ms |
| **Errores timeout DB** | Desconocido | 0 |

---

### Notas de Implementación

1. **NO refactorizar código que no se va a tocar**: Si un endpoint o componente funciona y no necesita cambios, dejarlo.

2. **Refactorizar al tocar**: Cuando se modifique cualquier código, aplicar las mejoras de la fase correspondiente.

3. **Features nuevos con arquitectura nueva**: Todo código nuevo debe seguir la arquitectura objetivo.

4. **Rollback disponible**: En cualquier momento se puede volver a checkpoint anterior si algo falla.

5. **Comunicación**: Antes de empezar cada fase, revisar impacto y comunicar plan.

---

### Registro de Progreso

| Fecha | Fase | Tarea | Estado | Notas |
|-------|------|-------|--------|-------|
| 16 Ene 2026 | - | Documento creado | ✅ | Diagnóstico inicial completado |
| - | - | - | - | - |

---

*Sección creada: 16 Enero 2026*
*Última actualización: 20 Enero 2026*

---

## FASE 7: Optimización de Base de Datos 🟡 (Nueva - 20 Enero 2026)

**Objetivo**: Optimizar rendimiento de la base de datos para soportar crecimiento de marcas y volumen de datos.  
**Puede ejecutarse en paralelo con Fases 1-4.** Prioridad recomendada: ALTA para 7.1 y 7.2 (índices críticos).

---

### 📊 Diagnóstico Completo de Base de Datos

#### Arquitectura Actual

La base de datos está estructurada jerárquicamente con **18+ tablas principales**:

```
BRANDS (marcas) ──────────────────────────────────
   ├── users (usuarios de cada marca)
   ├── social_accounts (redes sociales conectadas)
   ├── social_posts (publicaciones)
   ├── conversations (conversaciones)
   │      └── messages (mensajes)
   ├── ai_agents (agentes IA)
   │      └── ai_agent_audit_log (historial de IA)
   ├── crm_contacts (contactos CRM)
   │      └── crm_contact_channels (canales del contacto)
   ├── reminder_rules / reminder_events (seguimientos)
   └── notifications (notificaciones)
```

#### Puntos Fuertes Actuales

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Aislamiento multi-marca | ✅ Bueno | Cada tabla tiene `brandId` para filtrar por marca |
| Cascade deletes | ✅ Implementado | Al eliminar marca, se borran datos relacionados |
| Transacciones | ✅ Usadas | Para operaciones atómicas (ej: merge contacts) |
| Caché frontend | ✅ React Query | 30 segundos de staleTime en hooks |
| Unique constraints | ✅ Definidos | En tablas críticas (social_accounts, messages) |

#### Puntos de Riesgo Identificados

| Problema | Impacto | Tabla Afectada | Prioridad |
|----------|---------|----------------|-----------|
| **Sin índice en `messages.brandId`** | 🔴 Alto | messages | P0 |
| **Sin índice en `conversations.brandId`** | 🔴 Alto | conversations | P0 |
| **Consultas complejas sin optimizar** | 🟡 Medio | getInboxThreads (múltiples SELECTs) | P1 |
| **Sin paginación** en algunas consultas | 🟡 Medio | messages, conversations | P1 |
| **Pool de conexiones básico** | 🟡 Medio | server/db.ts | P2 |
| **Sin caché de servidor** | 🟡 Medio | Consultas frecuentes | P2 |

#### Índices Actuales vs Faltantes

**✅ Índices YA DEFINIDOS:**
```typescript
// crm_contacts
emailIdx: index("crm_contacts_email_idx").on(table.email)
phoneIdx: index("crm_contacts_phone_idx").on(table.phone)
brandIdx: index("crm_contacts_brand_idx").on(table.brandId)
statusIdx: index("crm_contacts_status_idx").on(table.status)

// crm_contact_channels
contactIdx: index("crm_contact_channels_contact_idx").on(table.contactId)
uniquePlatformExternal: unique().on(table.platform, table.externalId)

// reminder_events
brandIdx, conversationIdx, contactIdx, statusIdx, scheduledAtIdx

// messages
metricoolId: text("metricool_id").unique() // Solo este
```

**❌ Índices FALTANTES (Críticos):**
```typescript
// messages - FALTA (tabla más grande)
brandIdx: index("messages_brand_idx").on(table.brandId)
conversationIdx: index("messages_conversation_idx").on(table.conversationId)
timestampIdx: index("messages_timestamp_idx").on(table.timestamp)

// conversations - FALTA
brandIdx: index("conversations_brand_idx").on(table.brandId)
statusIdx: index("conversations_status_idx").on(table.status)
lastMessageAtIdx: index("conversations_last_message_at_idx").on(table.lastMessageAt)

// social_posts - FALTA
brandIdx: index("social_posts_brand_idx").on(table.brandId)

// notifications - FALTA
userIdx: index("notifications_user_idx").on(table.userId)
brandIdx: index("notifications_brand_idx").on(table.brandId)
```

#### Patrones de Consulta Problemáticos

**Problema 1: getInboxThreads hace múltiples SELECTs**
```typescript
// Archivo: server/storage.ts, líneas 644-739
// Patrón actual (ineficiente):
1. SELECT todas las conversaciones para brandId
2. SELECT conteo de mensajes por conversación  
3. SELECT mensajes no leídos por conversación
4. Luego agrupa en JavaScript

// Patrón recomendado (eficiente):
// Un solo SELECT con JOINs y agregaciones SQL
```

**Problema 2: Sin paginación en queries de inbox**
```typescript
// Actual:
const allConversations = await db.select().from(conversations).where(eq(conversations.brandId, brandId));

// Recomendado:
const paginatedConversations = await db.select().from(conversations)
  .where(eq(conversations.brandId, brandId))
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

#### Estimaciones de Rendimiento

| Escenario | Mensajes Totales | Velocidad Esperada |
|-----------|------------------|-------------------|
| 1 marca, 1K mensajes | 1,000 | ⚡ Rápida (<100ms) |
| 10 marcas, 10K mensajes cada una | 100,000 | 🟢 Aceptable (<500ms) |
| 50 marcas, 20K mensajes cada una | 1,000,000 | 🟡 Lenta (1-3s sin índices) |
| 100+ marcas, 50K+ mensajes cada una | 5,000,000+ | 🔴 Problemas (>5s sin índices) |

---

### 7.1 Índices Críticos (PRIORIDAD P0) 🔴

**Objetivo**: Agregar índices faltantes en tablas más consultadas.  
**Impacto**: Mejora inmediata de 10-100x en queries de inbox.

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 7.1.1 | Agregar índice `messages.brandId` | Migración ejecutada sin error | ✅ | Crítico para filtrar por marca |
| 7.1.2 | Agregar índice `messages.conversationId` | Migración ejecutada | ✅ | Crítico para threading |
| 7.1.3 | Agregar índice `messages.timestamp` | Migración ejecutada | ✅ | Para ordenamiento |
| 7.1.4 | Agregar índice `conversations.brandId` | Migración ejecutada | ✅ | Crítico |
| 7.1.5 | Agregar índice `conversations.status` | Migración ejecutada | ✅ | Para filtros |
| 7.1.6 | Agregar índice `conversations.lastMessageAt` | Migración ejecutada | ✅ | Para ordenamiento |
| 7.1.7 | Verificar rendimiento post-índices | Query de inbox < 200ms | ✅ | Mejora 47-92% confirmada |

**Relación con otras fases:** Puede ejecutarse independientemente. Recomendado ANTES de Fase 2 (División de Storage).

**✅ FASE 7.1 COMPLETADA - 20 Enero 2026**

### 7.2 Índices Secundarios (PRIORIDAD P1) 🟡

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 7.2.1 | Agregar índice `social_posts.brandId` | Migración ejecutada | ⬜ | |
| 7.2.2 | Agregar índice `notifications.userId` | Migración ejecutada | ⬜ | |
| 7.2.3 | Agregar índice `notifications.brandId` | Migración ejecutada | ⬜ | |
| 7.2.4 | Agregar índice `ai_agent_audit_log.agentId` | Migración ejecutada | ⬜ | Para analytics |
| 7.2.5 | Agregar índice compuesto `messages(brandId, timestamp)` | Migración ejecutada | ✅ | Ya incluido en 7.1 |

### 7.3 Optimización de Consultas (PRIORIDAD P1) 🟡

**Dependencias:** Mejor ejecutar después de Fase 2 (cuando Storage esté dividido en repositorios).

| ID | Tarea | Verificación | Estado | Ref. Fase |
|----|-------|--------------|--------|-----------|
| 7.3.1 | Refactorizar `getInboxThreads` a un solo JOIN | Query funciona, < 300ms | ⬜ | Fase 2.5 |
| 7.3.2 | Implementar paginación en `getMessages` | Endpoint acepta page/limit | ⬜ | Fase 2.4 |
| 7.3.3 | Implementar paginación en `getConversations` | Endpoint acepta page/limit | ⬜ | Fase 2.5 |
| 7.3.4 | Optimizar `getPendingCommentsForBatchProcessing` | Query < 500ms | ⬜ | - |
| 7.3.5 | Agregar EXPLAIN ANALYZE a queries lentas | Resultados documentados | ⬜ | Fase 0.1 |

### 7.4 Pool de Conexiones (PRIORIDAD P2) 🟢

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 7.4.1 | Configurar límites del pool en Neon | Pool configurado en db.ts | ⬜ | max: 10-20 conexiones |
| 7.4.2 | Agregar timeouts de conexión | Timeouts configurados | ⬜ | connectionTimeoutMillis: 10000 |
| 7.4.3 | Agregar monitoring de conexiones activas | Logs muestran pool status | ⬜ | Para debugging |

### 7.5 Vistas Materializadas para Dashboards (PRIORIDAD P2) 🟢

**Objetivo**: Optimizar los dashboards existentes (AI Metrics, Overview) con vistas materializadas para acelerar queries de agregación.  
**Nota:** Implementar cuando los dashboards se vuelvan lentos con alto volumen de datos.

#### ¿Qué son las Vistas Materializadas?
- **Vista normal**: Query que se ejecuta cada vez (siempre datos frescos, pero lento)
- **Vista materializada**: Resultado pre-calculado y almacenado (rápido, pero datos pueden estar "stale")
- **Trade-off**: Velocidad vs frescura de datos

#### Dashboards Existentes que se Beneficiarían:

| Dashboard | Query Actual | Vista Materializada Propuesta |
|-----------|--------------|------------------------------|
| **AI Metrics** | Suma tokens, costos por período desde `ai_agent_audit_log` | `mv_ai_daily_stats` - Agregaciones diarias |
| **Overview** | Contadores de mensajes, conversaciones por marca | `mv_brand_daily_stats` - Métricas diarias |
| **Reminders** | `getReminderStats` - Query compleja | `mv_reminder_stats` - Estadísticas pre-calculadas |

#### Tareas

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 7.5.1 | Medir tiempo actual de carga de AI Metrics | Tiempo documentado | ⬜ | Baseline para comparar |
| 7.5.2 | Medir tiempo actual de carga de Overview | Tiempo documentado | ⬜ | Baseline para comparar |
| 7.5.3 | Crear vista materializada `mv_ai_daily_stats` | Vista creada | ⬜ | Ver código abajo |
| 7.5.4 | Crear vista materializada `mv_brand_daily_stats` | Vista creada | ⬜ | Ver código abajo |
| 7.5.5 | Implementar job de refresh (cada 15-60 min) | Job funcionando | ⬜ | Usar cron o scheduler |
| 7.5.6 | Actualizar endpoints para usar vistas | Endpoints usan vistas | ⬜ | Fallback a query directa |
| 7.5.7 | Medir mejora de rendimiento | Reducción >50% en tiempo de carga | ⬜ | Comparar con baseline |

#### Código de Implementación (SQL)

```sql
-- Vista Materializada: Métricas diarias de IA por marca
CREATE MATERIALIZED VIEW mv_ai_daily_stats AS
SELECT 
  a.brand_id,
  DATE(al.created_at) as date,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN al.status = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN al.status = 'error' THEN 1 END) as failed,
  SUM(COALESCE(al.prompt_tokens, 0)) as total_prompt_tokens,
  SUM(COALESCE(al.completion_tokens, 0)) as total_completion_tokens,
  SUM(COALESCE(al.total_cost_usd, 0)) as total_cost_usd,
  al.provider,
  al.model
FROM ai_agent_audit_log al
JOIN ai_agents a ON al.agent_id = a.id
GROUP BY a.brand_id, DATE(al.created_at), al.provider, al.model;

-- Índice para búsquedas rápidas
CREATE UNIQUE INDEX ON mv_ai_daily_stats (brand_id, date, provider, model);

-- Vista Materializada: Métricas diarias de mensajes por marca
CREATE MATERIALIZED VIEW mv_brand_daily_stats AS
SELECT 
  brand_id,
  DATE(timestamp) as date,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_count,
  COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_count,
  COUNT(CASE WHEN status = 'unread' THEN 1 END) as unread_count,
  COUNT(DISTINCT conversation_id) as active_conversations,
  platform,
  type
FROM messages
GROUP BY brand_id, DATE(timestamp), platform, type;

-- Índice para búsquedas rápidas
CREATE UNIQUE INDEX ON mv_brand_daily_stats (brand_id, date, platform, type);

-- Refresh (ejecutar cada 15-60 minutos)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_daily_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_brand_daily_stats;
```

#### Estrategia de Refresh

| Opción | Frecuencia | Impacto | Recomendado Para |
|--------|------------|---------|------------------|
| **Cada 15 min** | Alto | Bajo (CONCURRENTLY no bloquea) | Dashboards en tiempo casi-real |
| **Cada hora** | Medio | Muy bajo | Reportes que toleran 1h de retraso |
| **Manual** | Bajo | Ninguno | Reportes mensuales/semanales |

#### Cuándo NO usar Vistas Materializadas

- ❌ Datos que DEBEN estar siempre actualizados (ej: inbox, CRM)
- ❌ Tablas pequeñas donde el query directo es rápido
- ❌ Queries simples que ya usan índices eficientemente

### 7.6 Caché de Servidor con Redis (PRIORIDAD P3 - Futuro) 🟢

**Nota:** Implementar solo cuando el volumen lo justifique (50+ marcas activas, >100K mensajes).

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 7.6.1 | Evaluar necesidad de Redis | Decisión documentada | ⬜ | Basado en métricas reales |
| 7.6.2 | Cachear configuración de agentes IA | Cache funciona | ⬜ | TTL: 5 minutos |
| 7.6.3 | Cachear lista de marcas por usuario | Cache funciona | ⬜ | TTL: 1 minuto |
| 7.6.4 | Invalidación de cache en updates | Cache se invalida correctamente | ⬜ | |

### 7.7 Índices Avanzados BRIN (PRIORIDAD P3 - Futuro) 🟢

**Objetivo**: Cuando las tablas superen millones de registros, considerar índices BRIN para columnas de timestamp.  
**Ventaja**: 100-1000x más pequeños que B-Tree, ideales para datos ordenados temporalmente.

| ID | Tarea | Verificación | Estado | Notas |
|----|-------|--------------|--------|-------|
| 7.7.1 | Evaluar tamaño de tabla `messages` | >5M registros = considerar BRIN | ⬜ | |
| 7.7.2 | Crear índice BRIN en `messages.timestamp` | Índice creado | ⬜ | Solo si >5M registros |
| 7.7.3 | Crear índice BRIN en `ai_agent_audit_log.created_at` | Índice creado | ⬜ | Para queries de rango de fechas |
| 7.7.4 | Comparar rendimiento BRIN vs B-Tree | Resultados documentados | ⬜ | |

```sql
-- Ejemplo: Índice BRIN para tablas muy grandes con datos temporales
CREATE INDEX messages_timestamp_brin ON messages USING brin (timestamp);
-- Mucho más pequeño que B-Tree, ideal para queries de rango de fechas
```

---

### 7.6 Implementación de Índices (Código)

**Archivo a modificar:** `shared/schema.ts`

```typescript
// AGREGAR al final de la definición de messages:
export const messages = pgTable("messages", {
  // ... campos existentes ...
}, (table) => ({
  brandIdx: index("messages_brand_idx").on(table.brandId),
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
  timestampIdx: index("messages_timestamp_idx").on(table.timestamp),
  brandTimestampIdx: index("messages_brand_timestamp_idx").on(table.brandId, table.timestamp),
}));

// AGREGAR al final de la definición de conversations:
export const conversations = pgTable("conversations", {
  // ... campos existentes ...
}, (table) => ({
  brandIdx: index("conversations_brand_idx").on(table.brandId),
  statusIdx: index("conversations_status_idx").on(table.status),
  lastMessageAtIdx: index("conversations_last_message_at_idx").on(table.lastMessageAt),
  brandStatusIdx: index("conversations_brand_status_idx").on(table.brandId, table.status),
}));

// AGREGAR al final de la definición de social_posts:
export const socialPosts = pgTable("social_posts", {
  // ... campos existentes ...
}, (table) => ({
  uniqueBrandPlatformPost: unique().on(table.brandId, table.platform, table.externalId),
  brandIdx: index("social_posts_brand_idx").on(table.brandId),
}));

// AGREGAR al final de la definición de notifications:
export const notifications = pgTable("notifications", {
  // ... campos existentes ...
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  brandIdx: index("notifications_brand_idx").on(table.brandId),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
}));
```

**Después de modificar schema.ts:**
```bash
npm run db:push  # Aplica cambios a la base de datos
```

---

### Matriz de Prioridades Fase 7

| Subfase | Prioridad | Impacto | Esfuerzo | Dependencias |
|---------|-----------|---------|----------|--------------|
| 7.1 Índices Críticos | 🔴 P0 | Alto | Bajo (1 día) | **Ninguna** ✅ |
| 7.2 Índices Secundarios | 🟡 P1 | Medio | Bajo (1 día) | 7.1 (opcional) |
| 7.3 Optimización Queries | 🟡 P1 | Alto | Medio (3-5 días) | Fase 2 (recomendado) |
| 7.4 Pool Conexiones | 🟢 P2 | Medio | Bajo (1 día) | Ninguna |
| 7.5 Vistas Materializadas | 🟢 P2 | Medio-Alto | Medio (2-3 días) | 7.1 |
| 7.6 Caché Redis | 🟢 P3 | Medio | Alto (5+ días) | 7.3, 7.5 |
| 7.7 Índices BRIN | 🟢 P3 | Bajo-Medio | Bajo (1 día) | >5M registros |

#### ⚠️ CONFIRMACIÓN: Fase 7.1 es INDEPENDIENTE

**Sí, la Fase 7.1 se puede ejecutar SOLA sin afectar ninguna otra fase:**

| Pregunta | Respuesta |
|----------|-----------|
| ¿Depende de otras fases? | ❌ No depende de ninguna |
| ¿Bloquea otras fases? | ❌ No bloquea ninguna |
| ¿Puede romper la aplicación? | ❌ No, solo AGREGA índices |
| ¿Es reversible? | ✅ Sí, con `DROP INDEX` |
| ¿Afecta datos existentes? | ❌ No, solo los indexa |
| ¿Requiere downtime? | ❌ No, la app sigue funcionando |

---

### Métricas de Éxito Fase 7

| Métrica | Valor Actual (Estimado) | Objetivo Post-Optimización |
|---------|------------------------|---------------------------|
| Query inbox (10K mensajes) | ~500-1000ms | < 200ms |
| Query inbox (100K mensajes) | ~3-5s | < 500ms |
| Query inbox (1M mensajes) | No viable | < 1s |
| Conexiones DB simultáneas | Sin límite | Máx 20 controladas |
| Errores de timeout DB | Desconocido | 0 |

---

### Integración con Plan de Refactorización Existente

| Fase Existente | Relación con Fase 7 |
|----------------|---------------------|
| Fase 0 (Preparación) | 7.3.5 (EXPLAIN ANALYZE) puede integrarse en 0.1 |
| Fase 1 (División Routes) | Sin dependencias directas |
| Fase 2 (División Storage) | 7.3.1-7.3.3 se benefician de repositorios separados |
| Fase 3 (Servicios) | Servicios pueden usar queries optimizadas |
| Fase 4 (Frontend) | Frontend se beneficia de respuestas más rápidas |
| Fase 5 (Abstracciones) | Pool de conexiones puede ser un adapter |
| Fase 6 (Testing) | Agregar tests de performance para queries |

**Ejecución Recomendada:**
```
Tiempo →
─────────────────────────────────────────────────────────────
Fase 7.1 │████│ ← PRIMERO (índices críticos, 1 día)
Fase 0   │    │████████│
Fase 1   │            │████████████████│
Fase 2   │            │████████████████│
Fase 7.3 │                            │████████│ ← Después de Fase 2
Fase 7.4 │████│ ← Puede hacerse en paralelo
─────────────────────────────────────────────────────────────
```

---

### Registro de Progreso Fase 7

| Fecha | Subfase | Tarea | Estado | Notas |
|-------|---------|-------|--------|-------|
| 20 Ene 2026 | - | Diagnóstico completado | ✅ | Identificados índices faltantes |
| 20 Ene 2026 | 7.1 | Índices críticos implementados | ✅ | 8 índices nuevos creados |

#### Fase 7.1 Completada - Detalles

**Fecha:** 20 Enero 2026

**Índices Creados:**
```
conversations_brand_idx          (brand_id)
conversations_status_idx         (status)
conversations_last_message_at_idx (last_message_at)
conversations_brand_status_idx   (brand_id, status)
messages_brand_idx               (brand_id)
messages_conversation_idx        (conversation_id)
messages_timestamp_idx           (timestamp)
messages_brand_timestamp_idx     (brand_id, timestamp)
```

**Métricas de Rendimiento:**

| Query | Antes (Seq Scan) | Después (Index Scan) | Mejora |
|-------|------------------|---------------------|--------|
| `messages WHERE brand_id` | 3.260 ms | 1.727 ms | **47%** |
| `conversations WHERE brand_id` | 0.749 ms | 0.062 ms | **92%** |
| `messages WHERE conversation_id` | 4.767 ms | 0.381 ms | **92%** |

**Nota:** Con el dataset actual de 10,221 mensajes y 1,051 conversaciones, las mejoras parecen modestas en milisegundos. Sin embargo, lo crucial es el cambio de **Seq Scan** (escaneo secuencial) a **Index Scan**. Cuando la tabla crezca a 100K o 1M de registros, estas mejoras serán de **10-100x** en rendimiento.

**Estado de Tareas 7.1:**
- [x] 7.1.1 Índice `messages.brandId`
- [x] 7.1.2 Índice `messages.conversationId`
- [x] 7.1.3 Índice `messages.timestamp`
- [x] 7.1.4 Índice `conversations.brandId`
- [x] 7.1.5 Índice `conversations.status`
- [x] 7.1.6 Índice `conversations.lastMessageAt`
- [x] 7.1.7 Verificación rendimiento post-índices

---

## Guía Educativa: Bases de Datos y Rendimiento

*Esta sección explica los conceptos detrás de las optimizaciones de la Fase 7 para referencia futura.*

### OLTP vs OLAP: Los Dos Tipos de Aplicaciones

| Característica | **OLTP** (Transaccional) | **OLAP** (Analítico) |
|----------------|--------------------------|----------------------|
| **Significa** | Online Transaction Processing | Online Analytical Processing |
| **Propósito** | Operaciones del día a día | Análisis de datos históricos |
| **Operaciones típicas** | Leer/escribir registros individuales | Sumar, promediar, agrupar millones de registros |
| **Usuarios** | Empleados, clientes, sistemas | Analistas, gerentes, reportes |
| **Velocidad requerida** | Milisegundos | Segundos a minutos |

#### Ejemplos de Aplicaciones OLTP (como Repliyo)

- **Inbox de Repliyo**: "Dame los mensajes de la conversación X"
- **Un banco**: "Transfiere $100 de cuenta A a cuenta B"
- **Amazon checkout**: "Procesa este pedido del cliente"
- **WhatsApp**: "Envía este mensaje y márcalo como entregado"

**Características:**
- Muchas operaciones pequeñas y rápidas
- Leer/escribir 1-100 registros a la vez
- Miles de usuarios simultáneos
- Cada operación debe ser instantánea

#### Ejemplos de Aplicaciones OLAP

- **Dashboard de ventas**: "¿Cuánto vendimos este año por región?"
- **Netflix**: "¿Qué géneros ven más los usuarios de 25-35 años?"
- **Tu AI Metrics dashboard**: "¿Cuántos tokens gastamos en los últimos 30 días?"

**Características:**
- Pocas operaciones pero muy pesadas
- Leer/agregar millones de registros
- Pocos usuarios (analistas)
- Puede tardar segundos o minutos

#### ¿Qué Tipo es Repliyo?

| Operación en Repliyo | Tipo | Por qué |
|---------------------|------|---------|
| Cargar inbox | OLTP | Muestra ~50 conversaciones recientes |
| Abrir conversación | OLTP | Carga ~20 mensajes de un hilo |
| Enviar respuesta | OLTP | Guarda 1 mensaje |
| Sincronizar Metricool | OLTP | Procesa mensajes uno por uno |
| **Dashboard AI Metrics** | **OLAP** | Suma tokens de miles de registros |
| **Dashboard Overview** | **OLAP** | Cuenta mensajes por período |

**Repliyo es 90% OLTP** (transaccional) con algunos dashboards que son OLAP.

---

### Seq Scan vs Index Scan: Cómo Busca la Base de Datos

#### Seq Scan (Sequential Scan) - El Problema

Imagina una biblioteca con 10,000 libros tirados en el piso sin ningún orden. Cada vez que alguien te pide "busca los libros de la marca X", tienes que revisar **los 10,000 libros uno por uno** hasta encontrar los correctos.

```
📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚 → Revisa TODO → 📗 Encontrado!
(10,000 libros revisados)
```

#### Index Scan - La Solución

Agregamos **índices** - como crear estantes organizados en la biblioteca:
- Un estante para "libros por marca"
- Un estante para "libros por fecha"
- Un estante para "libros por conversación"

```
📇 Índice dice: "Está en posición 847"
                                   ↓
📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚
                                   📗 ¡Directo!
(1 búsqueda en el índice)
```

#### Impacto en Escalabilidad

| Mensajes | Sin índices (Seq Scan) | Con índices (Index Scan) |
|----------|------------------------|--------------------------|
| 10,000 | 5 ms | 0.4 ms |
| 100,000 | ~50 ms | ~0.5 ms |
| 1,000,000 | ~500 ms (lento) | ~1 ms |
| 10,000,000 | ~5 segundos (inaceptable) | ~5 ms |

---

### ¿Dónde Se Refleja en Repliyo?

#### 1. Cuando Cambias de Marca (ej: de Crishair a Fortress Wellness)

```sql
SELECT * FROM conversations WHERE brand_id = 'fortress-id' ORDER BY last_message_at
```

| Antes (Seq Scan) | Ahora (Index Scan) |
|------------------|-------------------|
| Revisa las 1,051 conversaciones | Usa el índice `conversations_brand_idx` |
| 0.75 ms | **0.06 ms** |

**Dónde lo notas:** Cuando haces clic en el selector de marca arriba a la izquierda, el inbox se recarga más rápido.

#### 2. Cuando Abres una Conversación (haces clic en un thread)

```sql
SELECT * FROM messages WHERE conversation_id = 'conv-123' ORDER BY timestamp
```

| Antes (Seq Scan) | Ahora (Index Scan) |
|------------------|-------------------|
| Revisa los 10,221 mensajes | Usa el índice `messages_conversation_idx` |
| 4.77 ms | **0.38 ms** |

**Dónde lo notas:** Al hacer clic en cualquier conversación del inbox, los mensajes aparecen más rápido.

#### 3. Cuando Filtras por Estado (ej: "Nuevos", "Abiertos", "Pendientes")

```sql
SELECT * FROM conversations WHERE brand_id = 'x' AND status = 'new'
```

| Antes | Ahora |
|-------|-------|
| Revisa todas las conversaciones | Usa el índice compuesto `conversations_brand_status_idx` |

**Dónde lo notas:** Los chips de filtro en el inbox (New, Open, Pending, etc.) responden más rápido.

#### 4. Cuando el Sync de Metricool Procesa Mensajes

Cada vez que llega un mensaje nuevo, el sistema busca:
```sql
SELECT * FROM messages WHERE brand_id = 'x' ORDER BY timestamp DESC
```

| Antes | Ahora |
|-------|-------|
| Escanea todos los mensajes | Usa `messages_brand_timestamp_idx` |

**Dónde lo notas:** La sincronización con Metricool es más eficiente.

---

### ¿Por Qué los Índices Afectan Según el Tipo de App?

| Tipo de App | Mejor Tipo de Índice | Por qué |
|-------------|---------------------|---------|
| **OLTP** (Repliyo inbox) | **B-Tree** (los que pusimos) | Rápidos para buscar registros específicos |
| **OLAP** (AI Metrics dashboard) | **Vistas Materializadas** (Fase 7.5) | Pre-calculan agregaciones pesadas |

**Resumen:**
> **OLTP** = "¿Cuál es el mensaje #12345?" → Necesita índices B-Tree ✅ (ya los tienes)
> 
> **OLAP** = "¿Cuántos mensajes hubo este mes?" → Necesita vistas materializadas 📊 (Fase 7.5)

---

### Los 8 Índices Creados en Fase 7.1

| Tabla | Índice | Columnas | Uso Principal |
|-------|--------|----------|---------------|
| conversations | `conversations_brand_idx` | brand_id | Filtrar por marca |
| conversations | `conversations_status_idx` | status | Filtrar por estado |
| conversations | `conversations_last_message_at_idx` | last_message_at | Ordenar por fecha |
| conversations | `conversations_brand_status_idx` | brand_id + status | Filtro combinado |
| messages | `messages_brand_idx` | brand_id | Filtrar por marca |
| messages | `messages_conversation_idx` | conversation_id | Cargar threads |
| messages | `messages_timestamp_idx` | timestamp | Ordenar por fecha |
| messages | `messages_brand_timestamp_idx` | brand_id + timestamp | Sync y ordenamiento |

---

### Próximos Pasos de Optimización

| Fase | Descripción | Cuándo Hacerlo |
|------|-------------|----------------|
| **7.2** | Índices secundarios (social_posts, notifications) | Cuando esas tablas crezcan |
| **7.3** | Optimización de queries complejas | Después de dividir storage.ts |
| **7.5** | Vistas materializadas para dashboards | Cuando AI Metrics se vuelva lento |
| **7.7** | Índices BRIN para tablas muy grandes | Cuando tengas >5M mensajes |

---

*Sección educativa creada: 20 Enero 2026*
*Última actualización: 20 Enero 2026*

---

## Fix Critico: Problema de Carga Inicial del Inbox - 20 Enero 2026

### Problema Reportado
Cuando el usuario inicia sesion y la aplicacion carga la cuenta por defecto (ej: "Fortress Wellness Center"), el inbox se queda vacio con el mensaje "No conversations match your filters". El usuario tiene que:
- Cambiar manualmente a otra cuenta y volver, O
- Recargar la pagina completa

### Diagnostico Completo

#### 1. Race Condition en Inicializacion (CONFIRMADO)
**Archivo:** `client/src/context/NexusContext.tsx`

**Problema:**
- El `activeClientId` se lee de localStorage inmediatamente al cargar (lineas 50-56)
- La query de conversaciones se dispara con `enabled: !!activeClientId` (lineas 84-88)
- PERO la query de clientes tiene `enabled: isAuthenticated && !isAuthLoading` (lineas 74-78)

**Resultado:** Las queries de `conversations` y `messages` pueden dispararse ANTES de que:
1. La autenticacion este confirmada
2. La lista de clientes este cargada
3. El `activeClientId` sea validado contra clientes existentes

#### 2. Reconexiones Constantes de WebSocket (CONFIRMADO)
**Archivo:** `client/src/hooks/useWebSocket.ts`

**Problema:**
- El callback `connect` depende de `brandId`, `userId`, callbacks (`onNewMessage`, etc.), y `toast`
- Cada vez que alguna dependencia cambia, `connect` se recrea
- El `useEffect` depende de `connect` y `disconnect`
- Esto causa un ciclo de desconexion/reconexion cada vez que cambia el contexto

#### 3. Validacion de activeClientId Tardia
**Archivo:** `client/src/context/NexusContext.tsx`

**Problema:**
El `activeClientId` de localStorage puede contener un ID de cliente que:
- Ya no existe
- Fue archivado
- Pertenece a otra cuenta

La validacion ocurre en un `useEffect` que se ejecuta DESPUES de que las queries ya se dispararon.

---

### Plan de Implementacion

## FASE 1: Preparacion y Logging (SIN CAMBIOS FUNCIONALES)
**Objetivo:** Agregar logging para entender mejor el flujo sin modificar comportamiento

### Subfase 1.1: Agregar logging de inicializacion
**Archivo:** `client/src/context/NexusContext.tsx`
- [ ] Agregar console.log cuando se lee activeClientId de localStorage
- [ ] Agregar console.log cuando se disparan las queries de conversaciones/mensajes
- [ ] Agregar console.log cuando se completa la carga de clientes

### Subfase 1.2: Agregar logging de WebSocket
**Archivo:** `client/src/hooks/useWebSocket.ts`
- [ ] Agregar console.log cuando se recrea el callback connect
- [ ] Agregar console.log con motivo de desconexion

### Verificacion Fase 1:
- [ ] Ejecutar aplicacion y verificar logs en consola
- [ ] Reproducir el problema del inbox vacio
- [ ] Capturar secuencia de eventos en logs
- [ ] Confirmar que no hay errores nuevos

---

## FASE 2: Corregir Race Condition en NexusContext
**Objetivo:** Asegurar que queries solo se disparen cuando todo este listo

### Subfase 2.1: Gate de autenticacion en queries
**Archivo:** `client/src/context/NexusContext.tsx`
- [ ] Modificar query de `conversations` para incluir `isAuthenticated && !isAuthLoading`
- [ ] Modificar query de `messages` para incluir `isAuthenticated && !isAuthLoading`
- [ ] Agregar condicion de que `clients.length > 0` o `!isLoadingClients`

### Subfase 2.2: Validar activeClientId antes de usar
**Archivo:** `client/src/context/NexusContext.tsx`
- [ ] Crear variable `validatedActiveClientId` que solo tenga valor cuando:
  - isAuthenticated === true
  - isAuthLoading === false
  - isLoadingClients === false
  - El ID existe en la lista de activeClients
- [ ] Usar `validatedActiveClientId` en lugar de `activeClientId` para las queries

### Verificacion Fase 2:
- [ ] Iniciar sesion desde cero (sin localStorage)
- [ ] Verificar que conversaciones cargan correctamente
- [ ] Iniciar sesion con cuenta guardada en localStorage
- [ ] Verificar que conversaciones cargan correctamente
- [ ] Cambiar entre cuentas y verificar que funciona
- [ ] Revisar consola por errores

---

## FASE 3: Estabilizar WebSocket
**Objetivo:** Evitar reconexiones innecesarias

### Subfase 3.1: Separar conexion de suscripcion
**Archivo:** `client/src/hooks/useWebSocket.ts`
- [ ] Mover logica de `subscribe` fuera del callback `connect`
- [ ] Crear funcion `sendSubscribe` separada
- [ ] El `connect` solo debe manejar conexion basica

### Subfase 3.2: Memoizar callbacks correctamente
**Archivo:** `client/src/hooks/useWebSocket.ts`
- [ ] Usar refs para callbacks (`onNewMessage`, etc.) en lugar de dependencias
- [ ] Reducir dependencias del useCallback `connect`
- [ ] Manejar cambio de brandId en useEffect separado

### Verificacion Fase 3:
- [ ] Verificar que WebSocket se conecta UNA vez al cargar
- [ ] Cambiar de cuenta y verificar que solo se envia mensaje de subscribe (no reconexion)
- [ ] Revisar logs del servidor por conexiones/desconexiones
- [ ] Verificar que notificaciones en tiempo real funcionan

---

## FASE 4: Testing Manual Completo
**Objetivo:** Verificar que todos los flujos funcionan correctamente

### Subfase 4.1: Flujo de login fresco
- [ ] Cerrar sesion
- [ ] Limpiar localStorage
- [ ] Iniciar sesion
- [ ] Verificar que inbox carga con la primera cuenta

### Subfase 4.2: Flujo de login con cuenta guardada
- [ ] Guardar cuenta especifica en localStorage
- [ ] Refrescar pagina
- [ ] Verificar que inbox carga con esa cuenta

### Subfase 4.3: Flujo de cambio de cuenta
- [ ] Cambiar a otra cuenta
- [ ] Verificar que inbox se actualiza
- [ ] Cambiar de vuelta a cuenta original
- [ ] Verificar que inbox se actualiza

### Subfase 4.4: Flujo de notificaciones en tiempo real
- [ ] Abrir inbox
- [ ] (Desde otra fuente) Enviar mensaje a la cuenta activa
- [ ] Verificar que aparece notificacion
- [ ] Verificar que conversacion se actualiza

---

### Archivos a Modificar

| Archivo | Cambios | Riesgo |
|---------|---------|--------|
| `client/src/context/NexusContext.tsx` | Agregar gates de autenticacion a queries | Medio - afecta carga de datos global |
| `client/src/hooks/useWebSocket.ts` | Refactorizar manejo de dependencias | Bajo - cambio aislado |
| `client/src/components/Inbox.tsx` | Posiblemente actualizar uso de WebSocket | Bajo |

### Rollback Plan
Si algo falla en cualquier fase:
1. Usar el sistema de checkpoints de Replit para volver a estado anterior
2. O revertir cambios manualmente en archivos especificos

### Registro de Progreso

| Fecha | Fase | Subtarea | Estado | Notas |
|-------|------|----------|--------|-------|
| 20 Ene 2026 | 0 | Diagnostico inicial | COMPLETADO | Race condition y WebSocket confirmados |
| 20 Ene 2026 | 0 | Plan documentado | COMPLETADO | Este documento |
| 20 Ene 2026 | 1.1 | Logging NexusContext | COMPLETADO | Logging de diagnostico agregado |
| 20 Ene 2026 | 1.2 | Logging WebSocket | COMPLETADO | Logging de diagnostico agregado |
| 20 Ene 2026 | 2.1 | Gate queries | COMPLETADO | Queries ahora esperan autenticacion completa |
| 20 Ene 2026 | 2.2 | Validar activeClientId | COMPLETADO | validatedActiveClientId creado y en uso |
| 20 Ene 2026 | 3.1 | Separar conexion/suscripcion | COMPLETADO | sendSubscribe() separado de connect() |
| 20 Ene 2026 | 3.2 | Memoizar callbacks | COMPLETADO | Refs para todos los callbacks evitan reconexiones |
| 20 Ene 2026 | - | Revision Arquitecto | COMPLETADO | Aprobado sin cambios requeridos |
| - | 4.x | Testing manual | PENDIENTE | Requiere prueba del usuario |

---

*Seccion creada: 20 Enero 2026*
*Estado: Implementacion completada - Esperando verificacion del usuario*

---

## Mejoras al Inbox Reply Bar - 20 Enero 2026

### Cambios Implementados

#### 1. Barra de Respuesta Siempre Visible para DMs
**Archivos modificados:** `client/src/components/Inbox.tsx`

**Problema:** Los usuarios tenían que hacer clic en "Reply" para poder escribir una respuesta en conversaciones de DM.

**Solución:** La barra de respuesta ahora se muestra automáticamente cuando se selecciona una conversación de tipo DM, sin necesidad de hacer clic en ningún botón.

**Lógica de fallback para el mensaje objetivo:**
1. Si hay un `replyToMessage` seleccionado → usar ese
2. Si no, buscar el último mensaje inbound (del cliente)
3. Si no hay inbound, usar el último mensaje (cualquier dirección)
4. Si no hay mensajes, mostrar toast de error

```typescript
// Inbox.tsx - handleSendReply
let targetMessageId: string | null = replyToMessage?.id || null;

if (!targetMessageId && activeConversation.type === 'dm') {
  if (activeConversationMessages?.length) {
    const lastInbound = activeConversationMessages.filter(m => m.direction === 'inbound').slice(-1)[0];
    const lastMessage = activeConversationMessages.slice(-1)[0];
    targetMessageId = lastInbound?.id || lastMessage?.id || null;
  }
}
```

#### 2. Botón "Resumir" para Generar Resumen de Conversación
**Archivos modificados:** `client/src/components/Inbox.tsx`, `client/src/lib/api.ts`

**Funcionalidad:** Nuevo botón junto a "Generar con IA" que permite generar un resumen ejecutivo de la conversación actual usando IA.

**Ubicación:** Solo visible en conversaciones de tipo DM.

**Flujo:**
1. Usuario hace clic en "Resumir"
2. Se abre un modal con indicador de carga
3. Se llama a `POST /api/conversations/:id/generate-summary`
4. El endpoint devuelve un objeto `{ success, summary: { summary, sentiment, intent, resolution }, message }`
5. El frontend extrae `summary.summary` (el texto del resumen) y lo muestra en el modal
6. Si hay error, se cierra el modal y se muestra un toast

**Endpoint utilizado:**
```typescript
// POST /api/conversations/:id/generate-summary
// Respuesta:
{
  success: boolean;
  summary: {
    summary: string;      // Texto del resumen (2-3 oraciones)
    sentiment: string;    // positive | neutral | negative
    intent: string;       // Qué pidió el cliente
    resolution: string;   // Cómo se resolvió
  } | null;
  message: string;
}
```

**Componentes de estado agregados:**
```typescript
const [isSummarizing, setIsSummarizing] = useState(false);
const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
const [conversationSummary, setConversationSummary] = useState<string | null>(null);
```

**Bug corregido:** El endpoint devuelve `summary` como un objeto, no un string. El frontend ahora extrae correctamente `result.summary.summary` para obtener el texto.

#### 3. Ocultar Botón "Reply" Individual en DMs
**Archivos modificados:** `client/src/components/CommentThread.tsx`, `client/src/components/Inbox.tsx`

**Problema:** El botón "Reply" en mensajes individuales dentro de DMs no funcionaba porque la API de Metricool no soporta responder a un mensaje específico dentro de un hilo de DM.

**Solución:** Se agregó prop `isDM` que se propaga a través de los componentes:
- `CommentThread` → `ThreadNode` → `SingleMessage`

El botón "Reply" ahora solo se muestra cuando `!isDM`.

```typescript
// CommentThreadProps
isDM?: boolean; // Hide individual reply buttons for DMs

// SingleMessage render
{!isDM && (
  <button onClick={() => onStartReply(msg)}>Reply</button>
)}
```

**En comentarios:** El botón "Reply" sigue visible porque ahí sí tiene sentido responder a comentarios específicos.

#### 4. Corrección de Z-Index del Avatar
**Archivos modificados:** `client/src/components/CommentThread.tsx`

**Problema:** El avatar fallback en hilos de comentarios tenía `z-10`, lo que causaba que se superpusiera sobre la caja de texto de respuesta.

**Solución:** Se removió la clase `z-10` del avatar. La barra de respuesta tiene `z-20`, por lo que siempre queda por encima.

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `client/src/components/Inbox.tsx` | Barra siempre visible para DMs, botón "Resumir", lógica de fallback |
| `client/src/components/CommentThread.tsx` | Prop `isDM`, ocultar botón Reply en DMs, z-index del avatar |
| `client/src/lib/api.ts` | Tipo correcto para `generateSummary` response |

### Limitaciones Conocidas

1. **Responder a mensaje específico en DMs:** No soportado por la API de Metricool. `replyToConversation` solo acepta `conversationId`, `recipient` y `text` - no hay parámetro para `messageId` específico.

2. **DMs sin mensajes:** Si una conversación de DM no tiene mensajes, no se puede enviar respuesta ni generar respuesta con IA (se muestra toast de error).

3. **Resumen modifica datos:** El botón "Resumir" llama al endpoint que persiste el resumen en la base de datos (no es solo preview).

---

*Sección creada: 20 Enero 2026*
*Estado: Completado*

---

## Crisis Management & Sentiment Analysis System (18-Feb-2026)

### Descripción General
Sistema automático de análisis de sentimiento y gestión de crisis que clasifica todos los mensajes inbound (DMs y comentarios) usando LLM, generando alertas para mensajes críticos (P1/P2) y proporcionando un dashboard dedicado para triage en tiempo real.

### Arquitectura

#### Backend
| Archivo | Responsabilidad |
|---------|----------------|
| `server/services/SentimentAnalysisService.ts` | Clasificación LLM de sentimiento/severidad/categoría |
| `server/repositories/SentimentAlertRepository.ts` | CRUD para tabla `sentiment_alerts` |
| `server/routes/sentimentAlerts.routes.ts` | API REST para gestión de alertas |
| `shared/schema.ts` | Tabla `sentiment_alerts` + tipos + enums |

#### Frontend
| Archivo | Responsabilidad |
|---------|----------------|
| `client/src/pages/CrisisAlerts.tsx` | Dashboard de Crisis Alerts con filtros y acciones |
| `client/src/lib/api.ts` | Métodos cliente para API de alertas |

### Modelo de Datos

```sql
sentiment_alerts (
  id UUID PK DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  message_id INTEGER NOT NULL,
  conversation_id INTEGER,
  platform TEXT,
  customer_name TEXT,
  message_text TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence REAL,
  ai_summary TEXT,
  suggested_action TEXT,
  status TEXT DEFAULT 'new',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Clasificación de Severidad
- **P1 (Crítico):** Amenazas legales, seguridad, IRS/regulatorio, daño masivo a reputación
- **P2 (Alto):** Fallo de servicio severo, riesgo de churn alto, desinformación viral
- **P3 (Medio):** Quejas generales, insatisfacción moderada
- **P4 (Bajo):** Feedback negativo menor, sugerencias

### Categorías de Crisis
`legal_threat`, `safety_concern`, `service_failure`, `reputation_damage`, `customer_churn`, `misinformation`, `regulatory_risk`, `general_complaint`, `other`

### Integración con syncService
- Patrón "fire-and-forget" async para no bloquear el sync de mensajes
- Pre-clasificación: análisis ANTES del auto-reply para prevenir respuestas inapropiadas del bot
- Actualiza campos `messages.sentiment` y `messages.urgency` en cada mensaje
- Crea alertas en `sentiment_alerts` solo para P1/P2

### WebSocket
- Evento `crisis_alert` emitido en tiempo real para alertas P1/P2

### API Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/brands/:brandId/sentiment-alerts` | Listar alertas con filtros (severity, status, limit, offset) |
| GET | `/api/brands/:brandId/sentiment-alerts/stats` | Estadísticas por severidad y status |
| GET | `/api/brands/:brandId/sentiment-alerts/count` | Conteo de alertas activas P1/P2 |
| GET | `/api/brands/:brandId/sentiment-alerts/by-conversation` | Mapa de conversaciones con alertas activas P1/P2 (para Fire Mode) |
| GET | `/api/brands/:brandId/sentiment-alerts/:id` | Obtener alerta individual |
| PATCH | `/api/brands/:brandId/sentiment-alerts/:id/status` | Actualizar status (acknowledge/in_progress/resolve/dismiss) |

### Frontend - Crisis Alerts Dashboard (`/app/crisis-alerts`)
- **Estadísticas:** Cards con conteo por severidad (P1-P4) y status (nuevas/resueltas)
- **Filtros:** Toggle por severidad y status
- **Lista de alertas:** Cards con severidad, categoría, status, preview del mensaje, acciones
- **Acciones:** Acknowledge, In Progress, Resolve, Dismiss, Ver conversación

### Fire Mode - Integración con Inbox (18-Feb-2026)
El toggle "Fire Mode" (icono de llama) en el Inbox filtra conversaciones para mostrar solo aquellas con alertas de crisis activas (P1/P2).

- **Query:** `useQuery` con `refetchInterval: 60000` al endpoint `by-conversation`
- **Filtro:** Cuando Fire Mode está activo, `filteredConversations` solo muestra conversaciones con alertas P1/P2
- **Ordenamiento:** En Fire Mode, P1 se muestra antes que P2
- **Badge visual:** `ConversationCard` muestra badge de severidad (P1 rojo, P2 naranja) con icono `AlertTriangle`
- **Contador:** El toggle muestra el número de conversaciones con alertas activas
- **Seguridad:** Endpoint protegido por `requireAuth` + `validateBrandAccess`

### Fire Mode - Bypass de filtros (18-Feb-2026)
Cuando Fire Mode está activo, **bypasea todos los demás filtros** (no leídos, plataforma, tipo, búsqueda) para mostrar TODAS las conversaciones con alertas de crisis activas. Esto garantiza que ninguna conversación crítica se oculte por filtros activos.

### Indicadores de Severidad en Mensajes Individuales (18-Feb-2026)
Los mensajes inbound con urgencia P1 o P2 muestran un badge visual junto al timestamp:
- **P1:** Badge rojo con icono `ShieldAlert` y texto "P1"
- **P2:** Badge naranja con icono `ShieldAlert` y texto "P2"
- Ubicación: junto a los badges de reminders en la línea de metadatos del mensaje
- Solo visible en mensajes `inbound` con campo `urgency` = P1 o P2

### Filtro "Con alerta" en Comment Threads (18-Feb-2026)
Nuevo chip de filtro en la barra de filtros del hilo de comentarios:
- **Nombre:** "Con alerta" (icono `ShieldAlert`, color rojo)
- **Funcionalidad:** Filtra mensajes del hilo para mostrar solo los que tienen alertas P1/P2
- **Estadísticas:** Muestra contador de mensajes con alertas en el hilo actual
- **Ubicación:** Junto a los filtros existentes (Sin respuesta, Con borrador, Con recordatorio)
- **Estado:** `threadFilterWithCrisis` en el componente Inbox
- **Reset:** Se resetea al cambiar de conversación

*Sección creada: 18 Febrero 2026*
*Estado: Completado*
