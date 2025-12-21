# Sistema de Buffer de DMs - Documentación Técnica

## Fecha: 21 Diciembre 2025
## Estado: Implementado, pendiente de verificación

---

## 1. EL PROBLEMA

Cuando un usuario envía múltiples DMs rápidamente a una cuenta de Instagram/Facebook:

```
Usuario envía:
- "Hola" (14:00:01)
- "Tengo una pregunta" (14:00:03)
- "Es sobre precios" (14:00:05)
- "Gracias" (14:00:08)
```

**Comportamiento anterior (problemático):**
El sistema de IA respondía 4 veces individualmente, generando:
- Respuestas fragmentadas que confunden al usuario
- Spam hacia el cliente
- Uso excesivo de tokens de IA (4x el costo)
- Mala experiencia de usuario

**Comportamiento deseado:**
El sistema debe ESPERAR un tiempo configurable, ACUMULAR todos los mensajes, y enviar UNA SOLA respuesta que aborde todos los puntos.

---

## 2. LA SOLUCIÓN IMPLEMENTADA

### Arquitectura del Buffer

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE DM CON BUFFER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. METRICOOL API                                                           │
│     └── Entrega DMs nuevos con flag isNew=true                              │
│                              ↓                                              │
│  2. SYNC SERVICE (server/services/syncService.ts)                           │
│     └── Sincroniza y guarda mensajes en BD                                  │
│     └── Detecta si es DM entrante nuevo                                     │
│     └── Llama a autoReplyService.processNewMessageWithBuffering()           │
│                              ↓                                              │
│  3. AUTO REPLY SERVICE (server/services/autoReplyService.ts)                │
│     └── Lee configuración del agente desde BD:                              │
│         - agent.dmBatchDelaySeconds (ej: 45 segundos)                       │
│         - agent.dmReplyMode ('auto', 'batch', 'first_only')                 │
│         - agent.cooldownPerConversation                                     │
│     └── Pasa el mensaje al buffer con el delay configurado                  │
│                              ↓                                              │
│  4. DM BUFFER SERVICE (server/services/dmBufferService.ts)                  │
│     └── Almacena mensaje en Map<conversationId, BufferEntry>                │
│     └── Inicia timer de X segundos (ej: 45s)                                │
│     └── Si llegan más DMs del mismo usuario:                                │
│         - Los acumula en el mismo buffer                                    │
│         - REINICIA el timer (vuelve a esperar 45s)                          │
│     └── Cuando el timer expira sin nuevos mensajes:                         │
│         - Ejecuta flushBuffer()                                             │
│         - Junta todos los mensajes en uno consolidado                       │
│                              ↓                                              │
│  5. AI REPLY GENERATOR (server/services/aiReplyGenerator.ts)                │
│     └── Recibe contexto con TODOS los mensajes acumulados                   │
│     └── Genera UNA respuesta que aborda todos los puntos                    │
│                              ↓                                              │
│  6. METRICOOL API                                                           │
│     └── Envía la respuesta única al usuario                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CONFIGURACIÓN EN BASE DE DATOS

### Tabla: `ai_agents`

Cada marca tiene UN agente de IA configurado con estos campos:

| Columna | Tipo | Descripción | Default |
|---------|------|-------------|---------|
| `dm_batch_delay_seconds` | integer | Segundos a esperar antes de responder | 15 |
| `dm_reply_mode` | text | Modo: 'auto', 'batch', 'first_only' | 'auto' |
| `cooldown_per_conversation` | integer | Segundos mínimos entre respuestas | 300 |
| `is_active` | boolean | Si el agente está activo | true |
| `sync_enabled` | boolean | Si responde automáticamente | true |

### Ejemplo: Configuración de BO Trust
```sql
SELECT brand_id, dm_batch_delay_seconds, dm_reply_mode, is_active, sync_enabled
FROM ai_agents 
WHERE brand_id = '866600f9-4c0e-4d5e-b9d4-62fc9113426b';

-- Resultado:
-- dm_batch_delay_seconds: 45
-- dm_reply_mode: auto
-- is_active: true
-- sync_enabled: true
```

---

## 4. CÓDIGO CLAVE

### autoReplyService.ts - Lectura de configuración desde BD

```typescript
// Línea ~51 en server/services/autoReplyService.ts
const bufferDelayMs = (agent.dmBatchDelaySeconds ?? 15) * 1000;

log(`[AutoReply] 🔵 DM DETECTED - Activating Buffer. 
     ConversationId: ${conversation.id}, 
     BufferDelay: ${bufferDelayMs}ms (from DB: ${agent.dmBatchDelaySeconds}s)`, "sync");
```

### dmBufferService.ts - Lógica del buffer

```typescript
// Almacena mensajes y maneja el timer
async bufferMessage(
  message: Message,
  conversation: Conversation,
  brand: Brand,
  processCallback: (messages: BufferedMessage[]) => Promise<void>,
  delayMs?: number  // ← Este valor viene de agent.dmBatchDelaySeconds * 1000
): Promise<void> {
  const delay = delayMs || this.defaultDelayMs; // Default: 15000ms

  // Si ya hay buffer para esta conversación, añade mensaje y reinicia timer
  // Si no, crea nuevo buffer con timer
  
  // Cuando timer expira → flushBuffer() → callback con todos los mensajes
}
```

---

## 5. VERIFICACIÓN EN LOGS

Cuando el sistema detecta un DM nuevo y activa el buffer, deberías ver:

```
[AutoReply] 🔵 DM DETECTED - Activating Buffer. 
  ConversationId: abc-123, 
  Agent autoReplyMode: auto, 
  BufferDelay: 45000ms (from DB: 45s)

[DmBuffer] Buffering DM from usuario123 in conversation abc-123
[DmBuffer] Timer reset for conversation abc-123  ← Si llegan más mensajes
[DmBuffer] Flushing 4 messages for conversation abc-123  ← Cuando expira timer
```

---

## 6. ARCHIVOS INVOLUCRADOS

| Archivo | Responsabilidad |
|---------|-----------------|
| `shared/schema.ts` | Define columnas `dmBatchDelaySeconds`, `dmReplyMode`, `cooldownPerConversation` en tabla `aiAgents` |
| `server/storage.ts` | CRUD para leer/escribir configuración del agente |
| `server/services/syncService.ts` | Sincroniza DMs de Metricool y dispara procesamiento |
| `server/services/autoReplyService.ts` | Lee config de BD, decide si usar buffer, pasa delay al buffer |
| `server/services/dmBufferService.ts` | Implementa lógica de acumulación y timer |
| `server/services/aiReplyGenerator.ts` | Genera respuesta IA con contexto de mensajes acumulados |

---

## 7. PRÓXIMOS PASOS PARA TESTING

1. **Enviar múltiples DMs** a una cuenta configurada (ej: @bo_trust_service con 45s delay)
2. **Verificar logs** para ver mensajes "DM DETECTED", "Buffering", "Flushing"
3. **Confirmar** que el AI responde UNA vez después del tiempo configurado
4. **Ajustar** el valor de `dm_batch_delay_seconds` en la BD según necesidades del cliente

---

## 8. NOTAS IMPORTANTES

- El timer se REINICIA cada vez que llega un nuevo mensaje del usuario
- Esto significa: si el usuario envía mensajes cada 30 segundos y el delay es 45s, nunca se enviará respuesta hasta que pare por 45s
- El campo `cooldown_per_conversation` es ADICIONAL al buffer delay - previene respuestas muy frecuentes en la misma conversación
- Si `sync_enabled = false`, el agente NO responderá automáticamente aunque el buffer funcione
