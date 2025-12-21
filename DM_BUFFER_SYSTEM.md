# Sistema de Buffer de DMs - Documentación Completa

## Fecha: 21 Diciembre 2025
## Estado: EN PROGRESO - Buffer implementado, pendiente verificación completa

---

# SECCIÓN 1: EL DILEMA ORIGINAL

## El Problema "Carlos el Ansioso"

Imaginemos que Carlos (nuestro sistema de IA) trabaja en un restaurante:

```
COMPORTAMIENTO ACTUAL (problemático):
Cliente: "Hola" 
→ Carlos CORRE a la cocina, prepara respuesta, la entrega
Cliente: "tengo una pregunta"
→ Carlos CORRE otra vez a la cocina...
Cliente: "es sobre mis taxes"
→ Carlos CORRE otra vez...
Cliente: "¿pueden ayudarme?"
→ Carlos CORRE otra vez...

Resultado: 4 respuestas fragmentadas, spam, costos x4
```

```
COMPORTAMIENTO DESEADO (Carlos relajado):
Cliente: "Hola"
Carlos: (espera, el cliente está escribiendo...)
Cliente: "tengo una pregunta"
Carlos: (sigue esperando...)
Cliente: "es sobre mis taxes"
Carlos: (sigue esperando...)
Cliente: "¿pueden ayudarme?"
Carlos: (han pasado 45 segundos sin más mensajes)
Carlos: (AHORA va a la cocina con TODO el contexto)
→ UNA respuesta que aborda todos los puntos
```

## Problemas Identificados

| Problema | Descripción |
|----------|-------------|
| Respuestas fragmentadas | IA responde a cada mensaje individualmente |
| Spam hacia el usuario | 4 DMs rápidos = 4 respuestas de IA |
| Costos excesivos | 4x tokens de IA por lo que debería ser 1 llamada |
| Interrupción | IA responde antes de que el usuario termine de escribir |
| Cooldown global | Si respondo a Juan, María también queda bloqueada |

---

# SECCIÓN 2: LA SOLUCIÓN IMPLEMENTADA

## Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE DM CON BUFFER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. METRICOOL API                                                           │
│     └── Entrega DMs nuevos con flag isNew=true                              │
│                              ↓                                              │
│  2. SYNC SERVICE (server/services/syncService.ts)                           │
│     └── Sincroniza cada 2 minutos                                           │
│     └── Guarda mensajes en BD con flags isNew/isReallyNew                   │
│     └── Detecta si es DM entrante nuevo                                     │
│     └── Llama a autoReplyService.processNewMessageWithBuffering()           │
│                              ↓                                              │
│  3. AUTO REPLY SERVICE (server/services/autoReplyService.ts)                │
│     └── Lee configuración del agente desde BD:                              │
│         ┌──────────────────────────────────────────────────────────┐        │
│         │ agent.dmBatchDelaySeconds (ej: 45 segundos)              │        │
│         │ agent.dmReplyMode ('auto', 'batch', 'first_only')        │        │
│         │ agent.cooldownPerConversation                            │        │
│         └──────────────────────────────────────────────────────────┘        │
│     └── Calcula delay: bufferDelayMs = agent.dmBatchDelaySeconds * 1000     │
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
│  5. PROMPT COMPOSER (server/services/llm/prompt-composer.ts)                │
│     └── Construye contexto con variables dinámicas:                         │
│         - {{is_dm}}, {{message_type}}                                       │
│         - {{time_since_last_interaction}}                                   │
│         - {{relationship_status}} (new/active/reengagement)                 │
│     └── Incluye "Ficha de Situación" en el prompt                           │
│                              ↓                                              │
│  6. AI REPLY GENERATOR (server/services/aiReplyGenerator.ts)                │
│     └── Recibe contexto con TODOS los mensajes acumulados                   │
│     └── Genera UNA respuesta que aborda todos los puntos                    │
│                              ↓                                              │
│  7. METRICOOL API                                                           │
│     └── Envía la respuesta única al usuario                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SECCIÓN 3: CONFIGURACIÓN EN BASE DE DATOS

## Tabla: `ai_agents`

Cada marca tiene UN agente de IA con estos campos configurables:

| Columna | Tipo | Descripción | Default | Ejemplo BO Trust |
|---------|------|-------------|---------|------------------|
| `dm_batch_delay_seconds` | integer | Segundos a esperar antes de responder | 15 | **45** |
| `dm_reply_mode` | text | Modo de respuesta | 'auto' | 'auto' |
| `cooldown_per_conversation` | integer | Segundos mínimos entre respuestas | 300 | 300 |
| `is_active` | boolean | Si el agente está activo | true | true |
| `sync_enabled` | boolean | Si responde automáticamente | true | true |

### Modos de Respuesta (dm_reply_mode)

| Modo | Comportamiento |
|------|----------------|
| `auto` | Buffer + respuesta automática después del delay |
| `batch` | Acumula mensajes pero no responde automáticamente |
| `first_only` | Responde solo al primer mensaje, luego espera que el usuario responda |

### Marca de Prueba Actual

```sql
-- BO Trust (@bo_trust_service)
brand_id: 866600f9-4c0e-4d5e-b9d4-62fc9113426b
dm_batch_delay_seconds: 45
dm_reply_mode: auto
is_active: true
sync_enabled: true
```

---

# SECCIÓN 4: ESTADO ACTUAL - ¿QUÉ SE HA HECHO?

## ✅ COMPLETADO

| Componente | Archivo | Estado |
|------------|---------|--------|
| Schema de BD | `shared/schema.ts` | ✅ Columnas `dmBatchDelaySeconds`, `dmReplyMode`, `cooldownPerConversation` agregadas |
| Storage | `server/storage.ts` | ✅ CRUD actualizado para leer/escribir nuevos campos |
| DM Buffer Service | `server/services/dmBufferService.ts` | ✅ Lógica de Map + setTimeout implementada |
| Auto Reply Service | `server/services/autoReplyService.ts` | ✅ Lee `agent.dmBatchDelaySeconds` desde BD |
| Configuración BD | Tabla ai_agents | ✅ BO Trust configurado con 45s |
| Migración | Drizzle | ✅ Columnas aplicadas a la BD |

## Código Clave Implementado

### autoReplyService.ts (Lee delay de BD)
```typescript
// Línea ~51
const bufferDelayMs = (agent.dmBatchDelaySeconds ?? 15) * 1000;

log(`[AutoReply] 🔵 DM DETECTED - Activating Buffer. 
     ConversationId: ${conversation.id}, 
     BufferDelay: ${bufferDelayMs}ms (from DB: ${agent.dmBatchDelaySeconds}s)`, "sync");
```

### dmBufferService.ts (Lógica del buffer)
```typescript
class DmBufferService {
  private buffers: Map<string, BufferEntry> = new Map();
  private defaultDelayMs: number = 15000;

  async bufferMessage(
    message: Message,
    conversation: Conversation,
    brand: Brand,
    processCallback: (messages: BufferedMessage[]) => Promise<void>,
    delayMs?: number  // ← Este valor viene de agent.dmBatchDelaySeconds * 1000
  ): Promise<void> {
    const delay = delayMs || this.defaultDelayMs;
    
    // Si ya hay buffer para esta conversación:
    // - Añade mensaje
    // - REINICIA el timer
    
    // Cuando timer expira → flushBuffer() → callback con todos los mensajes
  }
}
```

---

# SECCIÓN 5: ¿QUÉ FALTA POR HACER?

## 🔶 PENDIENTE DE VERIFICACIÓN

| Tarea | Descripción | Prioridad |
|-------|-------------|-----------|
| Test con DMs reales | Enviar múltiples DMs y verificar que el buffer acumula correctamente | ALTA |
| Verificar logs | Confirmar que aparece "DM DETECTED", "BufferDelay: 45000ms" en logs | ALTA |
| Test de timer | Verificar que el timer se reinicia con cada nuevo mensaje | ALTA |

## 🔴 NO IMPLEMENTADO AÚN (Próximas fases)

| Tarea | Descripción | Archivo afectado |
|-------|-------------|------------------|
| Variables dinámicas | `{{is_dm}}`, `{{time_since_last_interaction}}`, `{{relationship_status}}` | `prompt-composer.ts` |
| Ficha de Situación | Bloque de contexto inyectado al prompt con estado de la conversación | `prompt-composer.ts` |
| Self-Correction | Validación post-generación para evitar saludos en conversaciones activas | `aiReplyGenerator.ts` |
| Cooldown por conversación | Cada DM tiene su propio cooldown (no global) | `autoReplyService.ts` |

---

# SECCIÓN 6: ¿QUÉ NO DEBEMOS HACER?

## ❌ ERRORES A EVITAR

1. **NO usar Redis/Bull** - Es overkill para esto. Map + setTimeout es suficiente.

2. **NO cambiar el marcado de mensajes leídos** - El problema de "mensajes marcados como leídos" es un tema de UI, no del buffer. El buffer funciona correctamente si los mensajes llegan con `isNew=true`.

3. **NO modificar el sync de Metricool** - El sync funciona bien, trae los mensajes correctamente.

4. **NO implementar todo a la vez** - Seguir las fases en orden.

5. **NO ignorar los logs** - Los logs son la única forma de verificar que el sistema funciona.

---

# SECCIÓN 7: ¿QUÉ SÍ DEBEMOS HACER?

## ✅ ACCIONES CORRECTAS

1. **Probar el buffer con DMs reales**
   - Enviar 4 mensajes rápidos a @bo_trust_service
   - Esperar que Metricool los sincronice
   - Verificar que el sistema espera 45s antes de responder
   - Verificar que responde UNA vez a todo

2. **Verificar logs específicos**
   ```
   [AutoReply] 🔵 DM DETECTED - BufferDelay: 45000ms (from DB: 45s)
   [DmBuffer] Buffering DM from usuario123 in conversation abc-123
   [DmBuffer] Timer reset for conversation abc-123
   [DmBuffer] Flushing 4 messages for conversation abc-123
   ```

3. **Ajustar delay según necesidades del cliente**
   ```sql
   UPDATE ai_agents 
   SET dm_batch_delay_seconds = 60 
   WHERE brand_id = '866600f9-...';
   ```

4. **Después de verificar el buffer, implementar variables dinámicas**

---

# SECCIÓN 8: PLAN DE IMPLEMENTACIÓN POR FASES

## Fase 1: Buffer Básico ✅ (ACTUAL)
- [x] Columnas en BD (`dm_batch_delay_seconds`, etc.)
- [x] `dmBufferService.ts` con Map + setTimeout
- [x] `autoReplyService.ts` lee delay de BD
- [ ] **Verificación con DMs reales** ← AQUÍ ESTAMOS

## Fase 2: Variables Dinámicas (PRÓXIMA)
- [ ] Agregar `{{is_dm}}`, `{{message_type}}`
- [ ] Agregar `{{time_since_last_interaction}}`
- [ ] Agregar `{{relationship_status}}` (new/active/reengagement)
- [ ] Actualizar `prompt-composer.ts`

## Fase 3: Ficha de Situación
- [ ] Calcular `conversationDepth`, `messagesLastHour`
- [ ] Generar `situationInstructions` automáticas
- [ ] Inyectar bloque [SITUACIÓN_ACTUAL] en el prompt

## Fase 4: Mejoras de Prompt
- [ ] Agregar sección "MODO DM" al systemPrompt
- [ ] Agregar reglas "FLOW DE DMs" al guardrailPrompt
- [ ] Agregar ejemplos de DMs naturales al knowledgeBase

## Fase 5: Cooldown por Conversación
- [ ] Guardar `lastReplyAt` por conversación
- [ ] Cada DM tiene su propio timer
- [ ] Comentarios pueden seguir con cooldown global

---

# SECCIÓN 9: ARCHIVOS CLAVE

| Archivo | Función |
|---------|---------|
| `shared/schema.ts` | Define columnas en tabla `aiAgents` |
| `server/storage.ts` | CRUD para leer/escribir configuración del agente |
| `server/services/syncService.ts` | Sincroniza DMs de Metricool, detecta mensajes nuevos |
| `server/services/autoReplyService.ts` | Lee config de BD, decide buffer delay, llama al buffer |
| `server/services/dmBufferService.ts` | Implementa lógica de acumulación y timer |
| `server/services/llm/prompt-composer.ts` | Construye el prompt con variables dinámicas |
| `server/services/aiReplyGenerator.ts` | Genera respuesta IA |

---

# SECCIÓN 10: CÓMO PROBAR

1. **Enviar DMs de prueba** a @bo_trust_service (4 mensajes rápidos)
2. **Esperar 2-5 minutos** para que Metricool sincronice
3. **Revisar logs** buscando:
   - `DM DETECTED`
   - `BufferDelay: 45000ms`
   - `Buffering DM`
   - `Flushing X messages`
4. **Verificar respuesta** - Debe ser UNA sola respuesta después de 45s

---

# SECCIÓN 11: NOTAS IMPORTANTES

- El timer se **REINICIA** cada vez que llega un nuevo mensaje del usuario
- Si el usuario envía mensajes cada 30s y el delay es 45s, nunca se enviará respuesta hasta que pare por 45s
- El campo `cooldown_per_conversation` es **ADICIONAL** al buffer delay
- Si `sync_enabled = false`, el agente NO responderá automáticamente
- El buffer está en memoria (Map), si el servidor reinicia se pierde pero no es problema grave
