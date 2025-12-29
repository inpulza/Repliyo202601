# Sistema de Gestión de Inbox Social Media con Metricool

## Documentación

| Documento | Descripción |
|-----------|-------------|
| `DOCUMENTACION_COMPLETA.md` | Historial completo de desarrollo, fases, y arquitectura general |
| `DM_BUFFER_SYSTEM.md` | Sistema de Buffer de DMs para evitar respuestas múltiples de IA |

---

## Estado Actual (29 Dic 2025)

### Context View - Vista Unificada de Historial ✅ NUEVO (29 Dic 2025)
Nueva funcionalidad que permite ver todo el historial de un contacto desde el CRM:

**Endpoint Timeline:**
- `GET /api/crm/contacts/:id/timeline?limit=100&offset=0`
- Fusiona mensajes de TODOS los canales vinculados al contacto
- Ordenados cronológicamente (más recientes primero)
- Retorna `mostRecentConversationId` para navegación al inbox

**Slide-over con Tabs:**
- **Perfil**: Vista actual con datos, canales conectados, campos personalizados
- **Historial**: Burbujas de chat con todos los mensajes del contacto
  - Inbound (cliente) alineados a la izquierda
  - Outbound (marca) alineados a la derecha
  - Icono de plataforma por mensaje

**Botón "Abrir en Inbox":**
- Navega a la conversación más reciente del contacto
- Estado de loading mientras carga el timeline
- Toast de error si no hay conversaciones

### Módulo CRM Completo ✅ (29 Dic 2025)
Sistema CRM integrado inspirado en Respond.io para gestión de contactos multi-plataforma.

**Fase 1 - Base de Datos:**
- 3 tablas: `crm_contacts`, `crm_contact_channels`, `crm_contact_limbo`
- UUIDs como PKs para fusión futura de identidades
- JSONB `customFields` para datos dinámicos extraídos por IA
- 20+ métodos de storage con aislamiento multi-tenant

**Fase 2 - Traffic Controller:**
- Enrutamiento automático: DMs → crear contactos, Comentarios → limbo
- Integrado en syncService durante sincronización de Metricool
- Patrón "lazy creation" - contactos solo después de handshake DM

**Fase 3 - Function Calling para IA:**
- 4 funciones CRM: `update_contact`, `set_custom_field`, `update_status`, `update_lifecycle`
- Extracción automática de datos (email, teléfono, ciudad) durante conversaciones
- Prompt-based function calling compatible con OpenAI y Gemini
- Ejecución de acciones CRM antes de enviar respuesta

**Fase 4 - API Endpoints:**
| Endpoint | Descripción |
|----------|-------------|
| `GET /api/crm/contacts` | Listar contactos de una marca |
| `GET /api/crm/contacts/:id` | Detalle con canales asociados |
| `POST /api/crm/contacts` | Crear nuevo contacto |
| `PUT /api/crm/contacts/:id` | Actualizar contacto |
| `DELETE /api/crm/contacts/:id` | Archivar contacto (soft delete) |
| `GET /api/crm/contacts/:id/channels` | Canales sociales del contacto |
| `GET /api/crm/contacts/:id/conversations` | Historial de conversaciones |
| `PUT /api/crm/contacts/:id/custom-field` | Actualizar campo personalizado |
| `GET /api/crm/limbo` | Entradas en limbo (comentaristas) |
| `POST /api/crm/limbo/:id/promote` | Promover limbo a contacto |

**Archivos CRM clave:**
- `shared/schema.ts` - Tablas y tipos CRM
- `server/storage.ts` - Métodos de persistencia CRM
- `server/services/crmTrafficController.ts` - Enrutamiento DM/comentarios
- `server/services/llm/crm-functions.ts` - Ejecutor de funciones IA
- `server/services/llm/prompt-composer.ts` - Prompt con instrucciones CRM

---

### SummaryService Refactorizado ✅ (29 Dic 2025)
- **Problema:** SummaryService usaba Gemini hardcodeado, ignorando la configuración del agente
- **Solución:** Ahora usa `createLLMProvider` con el mismo patrón que autoReplyService
- **Cambios:**
  - Se agregó método `generateRawCompletion` a la interfaz `LLMProvider`
  - Implementado en `OpenAIAdapter` y `GeminiAdapter`
  - `triggerSummaryUpdateAsync` ahora recibe `brandId` como tercer parámetro
  - Respeta `platformSettings.openaiApiKey/geminiApiKey` del agente

### Instrucciones de Saludo Simplificadas ✅ NUEVO (29 Dic 2025)
- **Problema:** Las instrucciones hardcodeadas en prompt-composer sobrescribían los guardrails del usuario
- **Solución:** `buildDynamicPersonalityRules()` ahora solo proporciona datos de contexto:
  - Tiempo desde última interacción
  - Profundidad de conversación
  - Estado de relación (new/active/reengagement)
  - Nombre detectado
- El prompt personalizado del usuario (guardrails) define la lógica de saludo
- Variables disponibles: `{{time_since_last_interaction}}`, `{{relationship_status}}`, `{{first_name}}`

---

## Estado Anterior (21 Dic 2025)

### Sistema de Buffer de DMs ✅ FUNCIONANDO
- **Problema:** Cuando usuario envía 4 DMs rápidos, la IA respondía 4 veces
- **Solución:** Buffer que acumula mensajes y responde UNA vez
- **Configuración:** Tabla `ai_agents` con campos:
  - `dm_batch_delay_seconds` - Tiempo de espera (ej: 45s para BO Trust)
  - `dm_reply_mode` - Modo: auto, batch, first_only

### Cooldown por Conversación ✅ IMPLEMENTADO
- **Problema anterior:** Cooldown bloqueaba TODA la marca (todas las redes y conversaciones)
- **Solución:** Cada conversación tiene su propio cooldown independiente
- **Configuración:** Tabla `ai_agents` campo `cooldown_per_conversation` (true = por conversación, false = global)
- **Datos:** Tabla `conversations` campo `last_ai_reply_at` guarda timestamp por conversación

**Ejemplo del comportamiento:**
```
Responde a Juan en Instagram → Solo Juan entra en cooldown
María en Facebook → Recibe respuesta normal ✅
Pedro en TikTok → Recibe respuesta normal ✅
```

### Variables Dinámicas de Personalidad ✅ IMPLEMENTADO
El LLM ahora ajusta su tono automáticamente según el contexto:

| Variable | Uso |
|----------|-----|
| `{{is_dm}}` | true/false - Si es DM o comentario |
| `{{first_name}}` | Primer nombre extraído del author (ej: "María") |
| `{{time_since_last_interaction}}` | Minutos desde última respuesta |
| `{{relationship_status}}` | new / active / reengagement |

**Extracción inteligente de primer nombre:**
- `María González Pérez` → `María` (nombres de display)
- `maria_perez_1985` → `María` (usernames)
- `CarlosGomez` → `Carlos` (CamelCase)
- `user12345` → (vacío, no es nombre)

**Lógica condicional en `buildDynamicPersonalityRules()`:**
```
SI (DM + conversación activa < 60 min):
   ❌ PROHIBIDO saludar → Ve directo al grano
SI (DM + reengagement + nombre detectado):
   ✅ "Hola de nuevo, María"
SI (DM nueva + nombre detectado):
   ✅ "Hola, María, ¿en qué puedo ayudarte?"
SI (Comentario + nombre):
   📢 "Hola, Juan, te esperamos en DM 📩"
```

### Configuración por Canal Social ✅ NUEVO (21 Dic 2025)
Cada red social puede tener su propia configuración de buffer y cooldown:
- **platformSettings**: Campo JSON en tabla `ai_agents` con overrides por canal
- **Función `getEffectiveChannelSettings()`**: Merge de defaults + overrides
- **Validación de platform**: `normalizeProvider()` valida contra enum

**Ejemplo de platformSettings:**
```json
{
  "instagram": { "bufferDelaySeconds": 60, "cooldownSeconds": 10 },
  "tiktok": { "bufferDelaySeconds": 30 }
}
```

### Consolidación UI Completada ✅ (21 Dic 2025)
**Pestaña "Automatización"** ahora solo contiene:
- Modo de respuesta (Desactivado / Automático)
- Estrategia de límite de caracteres

**Pestaña "Orquestación"** centraliza TODOS los tiempos:
- Toggle "Cooldown entre respuestas" (master switch)
  - Slider "Segundos de cooldown" (0-60s, default 30s)
  - Slider "Variación aleatoria" (±0-30s)
  - Toggle "Cooldown por conversación"
- Slider "Buffer de DMs" (5-120s, default 50s)
- Select "Modo de respuesta DMs" (default: batch)
- Collapsibles por red social para overrides personalizados
- Botón "Restaurar valores base" para eliminar overrides

**Defaults para marcas nuevas:**
- cooldownEnabled: true
- cooldownSeconds: 30s
- cooldownPerConversation: true
- dmBatchDelaySeconds: 50s
- dmReplyMode: batch

### Normalización de Providers ✅ CORREGIDO (21 Dic 2025)
- **Problema:** Providers venían en formatos variados (ej: "google-business", "Instagram")
- **Solución frontend:** `normalizeProviderKey()` mapea a claves de PLATFORM_CONFIG
- **Redes soportadas:** facebook, instagram, twitter, tiktok, linkedin, youtube, google (Business)

### Flujo Completo
```
Metricool → syncService → autoReplyService → dmBufferService → AI
                              ↑                      ↓
                     normalizeProvider()     getEffectiveChannelSettings()
                     valida platform         merge defaults + overrides
```

### Marca de Prueba
- **BO Trust** (@bo_trust_service)
- brand_id: `866600f9-4c0e-4d5e-b9d4-62fc9113426b`
- dm_batch_delay_seconds: 45

---

## Archivos Clave

| Archivo | Función |
|---------|---------|
| `server/services/llm/prompt-composer.ts` | `buildDynamicPersonalityRules()` - Reglas SI/SINO |
| `server/services/autoReplyService.ts` | Lee config BD, `normalizeProvider()`, `getEffectiveChannelSettings()` |
| `server/services/dmBufferService.ts` | Acumula mensajes, maneja timer |
| `server/services/syncService.ts` | Sincroniza DMs de Metricool |
| `shared/schema.ts` | Define columnas, schemas Zod, `getEffectiveChannelSettings()` |
| `client/src/components/AIAgentConfig.tsx` | UI de configuración con pestaña "Orquestación" |
