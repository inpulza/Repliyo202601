# Investigación Técnica: Arquitectura Respond.io v2.0

## Resumen del Documento

**Fuente**: `Investigación_Técnica_Respond.io_CRM_1767175751422.pdf`  
**Fecha**: 28 Diciembre 2025  
**Propósito**: "Biblia de Ingeniería" para desarrollo de Beta CRM

---

## 1. Orquestación de Agentes de IA

### 1.1 Arquitectura del Prompt del Sistema

El agente de IA de Respond.io tiene 5 componentes estructurados en `ai_agent_configs`:

| Componente | Descripción | Implementación |
|------------|-------------|----------------|
| **Role & Style** | Persona del agente (tono, reglas lingüísticas) | `system_prompt` inicial |
| **Context** | Grounding (quién es la empresa, quién es el cliente) | Inyección dinámica de datos |
| **Flow** | Guía heurística en lenguaje natural (Chain of Thought) | Campo de texto concatenado al prompt |
| **Boundaries** | Restricciones negativas (qué NO hacer) | Filtro de salida |
| **Knowledge Sources** | Datos via RAG (PDFs, URLs, tablas) | Búsqueda vectorial en tiempo real |

### 1.2 Límite de Contexto (Crítico)

> **Los agentes de IA solo pueden resumir/considerar los últimos 20 mensajes de una conversación.**

**Razón**: Optimización de ventana de contexto del LLM (latencia y costos).

**Implementación recomendada**:
- "Ventana deslizante" de memoria a corto plazo
- NO enviar todo el historial de años al LLM
- Truncar a últimos N mensajes (N=20 validado por Respond.io)
- Alternativa: "Resumen progresivo" (resumen actualizado + mensajes recientes en crudo)

### 1.3 Function Calling (Acciones del Agente)

Las acciones que el agente puede ejecutar:

| Acción | Descripción | Restricción |
|--------|-------------|-------------|
| **Close Conversation** | Cambio de estado `open` → `closed` + Closing Note | Solo categorías preexistentes |
| **Assign to Team/Agent** | Handoff a humano | Round Robin o Least Open Conversation |
| **Trigger Workflows** | Disparar flujo con `!nombre_flujo` | Solo Workflows publicados |

**Restricción de Workflows**: Las variables NO se pasan automáticamente del Agente al Workflow. El Workflow debe ser autosuficiente.

### 1.4 Lógica de Handoff (Traspaso Humano-IA)

**Problema histórico**: Bot y humano hablando al mismo tiempo.

**Solución (Prevención de Interferencia)**:

```typescript
// Flag en conversación
conversation.ai_active = true | false

// Cuando se ejecuta assign_to_user/assign_to_team:
SET ai_active = false  // Atómicamente

// Orquestador verifica ANTES de invocar LLM:
if (!conversation.ai_active) {
  // Enrutar directo al Inbox del agente humano
  // NO invocar LLM (ahorro de costos, evita respuestas fantasma)
}
```

**Flujo de Decisión Lógica**:
1. Mensaje entrante
2. ¿Conversación asignada a humano? → SÍ → Pasar al Inbox (Fin)
3. Recuperar contexto (RAG)
4. Generar respuesta (LLM)
5. ¿Modelo solicita acción?
   - Si Close: `UPDATE conversation SET status='closed'`. Generar resumen.
   - Si Handoff: Algoritmo de asignación. `SET ai_active=false`
   - Si Workflow: Disparar evento
   - Si Reply: Enviar texto al usuario

---

## 2. Mini CRM y Captura de Datos

### 2.1 Modelo de Datos del Contacto

**Campos Base Obligatorios**:
- `id`: UUID o BigInt
- `firstName` / `lastName`
- `language`: ISO 639-1 (determina idioma de notificaciones)
- `created_at`: Timestamp Unix
- `profilePic`: URL
- `countryCode`: ISO 3166-1 alpha-2

**Campos de Identidad**:
- `phone`: Formato E.164 estricto (`+34600123456`)
- `email`: Con validación
- `identifier`: Polimórfico (referencia por id, email o phone)

**Campos Extendidos**:
- `custom_fields`: JSONB (flexibilidad sin migraciones)

**Cardinalidades**:
- Contact 1:N Channels
- Contact 1:N Messages
- Contact 1:N Tags

### 2.2 Identity Merging (Fusión de Identidades)

**Algoritmo de Detección**: Coincidencias exactas en `email` o `phone`.

**Lógica de Fusión**:
1. **Selección de Maestro**: Elegir Primary vs Secondary
2. **Resolución de Conflictos**: Si valores diferentes, solicitar al agente
3. **Consolidación**: `UPDATE... SET contact_id = primary_id` para todos los canales, mensajes, eventos
4. **Limpieza**: Soft delete del secundario
5. **Exclusiones**: Contactos bloqueados no aparecen en sugerencias

**Reversibilidad**: 
- Operación atómica (ROLLBACK si falla)
- Opción "Deshacer" (Soft Delete + merge_log)
- Periodo de gracia: 10-15 minutos

### 2.3 Flujo "Comentario → Contacto" (Facebook Private Replies)

```
1. Usuario comenta en publicación de Facebook
2. Sistema envía Private Reply automático via Messenger
3. ESTADO "LIMBO": Usuario NO es contacto todavía (solo PSID temporal)
4. HANDSHAKE: Usuario responde al mensaje privado
5. Meta entrega perfil completo → Se crea Contact oficial
```

**Regla Crítica**: No crear contactos "basura" de comentarios. Usar **Lazy Creation** hasta interacción bidireccional confirmada.

---

## 3. Gestión del Ciclo de Vida de la Conversación

### 3.1 Máquina de Estados

| Estado | Descripción | SLA |
|--------|-------------|-----|
| **Open** | Activa, requiere atención (Unassigned o Assigned) | Tiempo contabilizado |
| **Closed** | Concluida, no en colas activas | - |
| **Snoozed/Pending** | Limbo técnico via Wait Step en workflows | Pausado |

### 3.2 Patrón Auto-Close (Via Workflows)

El cierre automático NO es configuración global, sino **Workflow configurable**:

```
1. Trigger: Conversation Opened / New Message
2. Wait Step: Suspensión por X tiempo (20 min, 24h, etc.)
   ├── INTERRUMPIBLE: Si nuevo mensaje, reiniciar timer o cancelar flujo
3. Close Conversation (si timer expira sin interrupción)
4. (Opcional) Añadir Closing Note automática / Resumen IA
```

### 3.3 REGLA DE HIERRO: Reapertura (Crítico)

> **Un Agente de IA NO puede reabrir una conversación cerrada.**

**Justificación**: Prevenir bucles infinitos:
```
Cierre → Mensaje "Gracias" al cliente → 
IA interpreta como nueva interacción → Reabre →
IA responde "De nada" → Cierre de nuevo → Loop infinito
```

**Quién PUEDE reabrir**:
- ✅ Nuevo mensaje **entrante del cliente** (inbound)
- ✅ Acción manual de agente humano
- ❌ Agente de IA

**Implementación**: Restricción en lógica de negocio o triggers de BD.

### 3.4 Threading y Ventanas de Mensajería

| Canal | Ventana | Fuera de Ventana |
|-------|---------|------------------|
| **WhatsApp Business** | 24h desde último mensaje cliente | Solo Template Messages pre-aprobados |
| **Facebook Messenger** | 24h (extendible a 7 días con Human Agent Tag) | Bloqueo |

**Implementación UI**:
```typescript
if (last_customer_message_at > 24_hours) {
  // Bloquear input de texto libre
  // Mostrar selector de plantillas
}
```

### 3.5 Resúmenes de Cierre con IA

- **Límite de contexto para resumen**: Hasta 100 mensajes
- **Límite para agente conversacional**: 20 mensajes
- **Persistencia**: Guardar en `closing_note` o `summary` en tabla conversations
- **Propósito**: "Speed to Context" - 3 líneas vs leer 100 mensajes

---

## 4. API y Webhooks

### 4.1 Diseño RESTful

- **Base URL**: `https://api.respond.io/v2`
- **Autenticación**: Bearer Token (`Authorization: Bearer <token>`)
- **Tokens**: Hasta 10 por workspace, revocables

### 4.2 Rate Limiting

- **Límite**: 5 solicitudes/segundo por método
- **Error**: HTTP 429 Too Many Requests
- **Headers obligatorios**:
  - `Retry-After`: Segundos a esperar
  - `X-RateLimit-Limit`: Límite total
  - `X-RateLimit-Remaining`: Restantes

**Implementación**: Middleware Redis con Token Bucket o Leaky Bucket.

### 4.3 Endpoints Críticos

**Envío de Mensajes**: `POST /contact/{identifier}/message`
- `{identifier}` flexible: `id:123`, `email:...`, `phone:+34...`
- Sin `channelId` → "Last Interacted Channel"

**Gestión de Contactos**: `POST /contact`, `GET /contact/list`
- Paginación por cursor (NO offset)
- `custom_fields`, `tags`, `assignee` en creación

### 4.4 Webhooks Entrantes

- **Payload Agnóstico**: Acepta cualquier JSON
- **Mapeo de Variables**: JSONPath (`$.customer.email`, `$.order_id`)
- **UI**: Explorar JSON de prueba y seleccionar campos con clic

---

## 5. Recomendaciones Clave para Implementación

### 5.1 Identidad Flexible
> **NUNCA usar teléfono/email como PRIMARY KEY.** Usar UUID interno agnóstico.

### 5.2 Campos Dinámicos
> Usar columna **JSONB indexada** para `custom_fields` (sin migraciones por campo nuevo).

### 5.3 Lazy Creation
> Diferir creación de contacto hasta **handshake bidireccional** (evita contactos incontactables).

### 5.4 Ventana Deslizante
> Truncar historial a **20 mensajes** para LLM. No enviar años de historial.

### 5.5 Flag ai_active
> Verificar flag ANTES de invocar LLM para prevenir interferencia bot-humano.

---

## Referencias

- **PDF Original**: `docs/knowledge-base/Investigación_Técnica_Respond.io_CRM_1767175751422.pdf`
- **PRD Lifecycle**: Sección `PRD-LIFECYCLE` en `DOCUMENTACION_COMPLETA.md`
- **Knowledge Base**: `docs/knowledge-base/CONVERSATION_LIFECYCLE_MANAGEMENT.md`

---

*Última actualización: 31 Diciembre 2024*
