# Documentación Completa - Plan de Mejoras Repliyo

## Resumen Ejecutivo

Este documento contiene el plan de mejora técnica para el proyecto Repliyo (Social Media Inbox Management System), organizado en 3 fases principales con subfases y tareas específicas.

### Diagnóstico Actual (Enero 2026)

| Área | Puntuación | Estado |
|------|------------|--------|
| Componentes | 7/10 | UI reutilizable, pero componentes principales con lógica mezclada |
| Arquitectura | 8.5/10 | Híbrido layered/ports-adapters apropiado para SaaS |
| Testing | 4/10 | No existe, pero es recuperable gracias a la arquitectura |

### Justificación del Orden de Fases

**¿Por qué Componentes → Arquitectura → Testing?**

Aunque normalmente Testing-first reduce riesgos, en este proyecto el tamaño extremo y el estado entrelazado de componentes como Inbox (2,389 líneas) y CRMContextPanel hacen que los refactors de componentes sean **prerrequisito** para tener tests confiables. Si intentamos testear primero, los tests serían frágiles y cambiarían constantemente.

---

## FASE 1: COMPONENTES
**Objetivo:** Separar lógica de presentación, mejorar reutilización y preparar para testing
**Riesgo actual:** Componentes pesados dificultan mantenimiento y testing
**Duración estimada:** 2-3 semanas

### Subfase 1.1: Auditoría y Mapeo de Componentes Críticos

**Objetivo:** Entender qué lógica hay en cada componente antes de mover código

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 1.1.1 | Inventariar todos los `useState` y `useEffect` en Inbox.tsx | Lista completa de 25+ estados documentada |
| 1.1.2 | Identificar dependencias entre estados (cuáles se afectan mutuamente) | Diagrama de dependencias |
| 1.1.3 | Mapear props contracts entre Inbox → subcomponentes | Documentar tipos esperados |
| 1.1.4 | Repetir auditoría para CRMContextPanel.tsx | Mismo entregable |
| 1.1.5 | Identificar lógica duplicada entre componentes | Lista de candidatos a hooks |

### Subfase 1.2: Extracción de Lógica a Hooks y Servicios

**Objetivo:** Mover orquestación de datos fuera de componentes hacia hooks reutilizables

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 1.2.1 | Crear `useConversationState` - manejo de conversación activa | Hook funcional sin romper UI |
| 1.2.2 | Crear `useDraftManagement` - lógica de borradores IA | Separar de Inbox.tsx |
| 1.2.3 | Crear `useMessageSync` - sincronización y WebSocket | Reutilizable en otros componentes |
| 1.2.4 | Crear `useCRMPanel` - lógica del panel CRM | Separar de CRMContextPanel |
| 1.2.5 | Refactorizar NexusContext para exponer menos estado raw | Interfaz más limpia |
| 1.2.6 | Validar que la UI funciona igual después de cada extracción | Tests manuales pasan |

### Subfase 1.3: Estabilización de Interfaces de Usuario

**Objetivo:** Preparar componentes para testing automatizado

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 1.3.1 | Auditar `data-testid` existentes, documentar patrón | Convención establecida |
| 1.3.2 | Agregar `data-testid` faltantes en elementos interactivos | 100% cobertura en Inbox |
| 1.3.3 | Agregar `data-testid` en elementos de datos dinámicos | 100% cobertura en CRM Panel |
| 1.3.4 | Verificar accesibilidad básica (ARIA labels críticos) | Principales controles accesibles |

### Subfase 1.4: Guardrails y Observabilidad

**Objetivo:** Proteger refactors con feature flags y monitoreo

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 1.4.1 | Implementar sistema simple de feature flags | Toggle para nuevos hooks |
| 1.4.2 | Agregar logging en hooks críticos | Errores visibles en consola |
| 1.4.3 | Crear checklist de validación pre-deploy | Documento de QA |

---

## FASE 2: ARQUITECTURA
**Objetivo:** Modularizar backend para mantenibilidad y testability
**Riesgo actual:** storage.ts y routes.ts son archivos muy grandes
**Duración estimada:** 2-3 semanas

### Subfase 2.1: Modularización de Storage

**Objetivo:** Dividir storage.ts (4,310 líneas) en adaptadores por dominio

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 2.1.1 | Crear `storage/brandAdapter.ts` - métodos de brands | Migrar 10-15 métodos |
| 2.1.2 | Crear `storage/conversationAdapter.ts` | Migrar métodos de conversations |
| 2.1.3 | Crear `storage/messageAdapter.ts` | Migrar métodos de messages |
| 2.1.4 | Crear `storage/crmAdapter.ts` | Migrar métodos CRM (contacts, channels, limbo) |
| 2.1.5 | Crear `storage/reminderAdapter.ts` | Migrar métodos de reminders |
| 2.1.6 | Crear `storage/aiAdapter.ts` | Migrar métodos de AI agents y audit |
| 2.1.7 | Mantener `storage.ts` como facade que re-exporta | Compatibilidad hacia atrás |
| 2.1.8 | Extraer helpers comunes (paginación, errores) | `storage/helpers.ts` |

### Subfase 2.2: Codificación de Workflows Cross-Service

**Objetivo:** Formalizar flujos complejos (sync → CRM → reminders) en orquestadores

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 2.2.1 | Documentar flujo sync → CRM routing → reminder scheduling | Diagrama de secuencia |
| 2.2.2 | Crear `orchestrators/inboundMessageOrchestrator.ts` | Centralizar flujo de mensaje entrante |
| 2.2.3 | Definir interfaces claras entre servicios | Contratos TypeScript |
| 2.2.4 | Implementar circuit breaker para APIs externas (Metricool) | Resiliencia mejorada |

### Subfase 2.3: Reorganización de Routes

**Objetivo:** Dividir routes.ts (4,172 líneas) y mejorar validación

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 2.3.1 | Crear `routes/authRoutes.ts` | Migrar rutas de autenticación |
| 2.3.2 | Crear `routes/brandRoutes.ts` | Migrar rutas de brands |
| 2.3.3 | Crear `routes/conversationRoutes.ts` | Migrar rutas de inbox |
| 2.3.4 | Crear `routes/crmRoutes.ts` | Migrar rutas CRM |
| 2.3.5 | Crear `routes/reminderRoutes.ts` | Migrar rutas de reminders |
| 2.3.6 | Estandarizar validación Zod en middleware | Reducir código repetitivo |
| 2.3.7 | Mantener `routes.ts` como registro central | Compatibilidad |

---

## FASE 3: TESTING
**Objetivo:** Establecer suite de tests para prevenir regresiones
**Riesgo actual:** Cambios pueden romper funcionalidad sin detectarlo
**Duración estimada:** 2-3 semanas

### Subfase 3.1: Configuración de Infraestructura de Testing

**Objetivo:** Preparar herramientas y base de datos de pruebas

| Tarea | Descripción | Criterio de Éxito |
|-------|-------------|-------------------|
| 3.1.1 | Elegir framework: Vitest (recomendado) o Jest | Decisión documentada |
| 3.1.2 | Configurar `vitest.config.ts` | Tests ejecutan sin errores |
| 3.1.3 | Configurar base de datos PostgreSQL de pruebas | Conexión funcional |
| 3.1.4 | Crear fixtures/seeds para datos de prueba | Brands, users, conversations de prueba |
| 3.1.5 | Configurar mocks para APIs externas (Metricool, OpenAI) | Mocks funcionales |
| 3.1.6 | Configurar coverage reports | Reporte generado |

### Subfase 3.2: Tests Unitarios de Servicios Críticos

**Objetivo:** Cubrir lógica de negocio más riesgosa

| Tarea | Descripción | Prioridad |
|-------|-------------|-----------|
| 3.2.1 | Tests para storage adapters (CRUD básico) | ALTA |
| 3.2.2 | Tests para `crmTrafficController` (routing lógica) | ALTA |
| 3.2.3 | Tests para `reminderService` (scheduling, eligibility) | ALTA |
| 3.2.4 | Tests para `syncService` (manejo de errores, cooldowns) | ALTA |
| 3.2.5 | Tests para `thankYouDetector` (detección de cierre) | MEDIA |
| 3.2.6 | Tests para `conversationLifecycleService` | MEDIA |
| 3.2.7 | Tests para helpers de schema (getEffectiveChannelSettings) | BAJA |

### Subfase 3.3: Tests de Integración y Regresión

**Objetivo:** Validar flujos end-to-end críticos

| Tarea | Descripción | Prioridad |
|-------|-------------|-----------|
| 3.3.1 | Test de integración: autenticación (login/logout/session) | ALTA |
| 3.3.2 | Test de integración: fetch de inbox (conversations + messages) | ALTA |
| 3.3.3 | Test de integración: ciclo de vida de reminder | ALTA |
| 3.3.4 | Test de integración: CRM contact creation con channel | MEDIA |
| 3.3.5 | Test de integración: merge de contactos | MEDIA |
| 3.3.6 | Configurar CI para ejecutar tests en cada push | ALTA |
| 3.3.7 | Establecer umbral mínimo de coverage (ej: 40% inicial) | MEDIA |

---

## Matriz de Dependencias entre Fases

```
FASE 1 (Componentes)
    │
    ├─► Subfase 1.2 depende de Subfase 1.1
    │
    └─► Subfase 1.3 puede ejecutarse en paralelo con 1.2
    
FASE 2 (Arquitectura)
    │
    ├─► Puede comenzar después de Subfase 1.2
    │
    └─► Subfase 2.2 depende de Subfase 2.1
    
FASE 3 (Testing)
    │
    ├─► Subfase 3.1 puede comenzar en paralelo con Fase 2
    │
    └─► Subfases 3.2 y 3.3 dependen de Fases 1 y 2 completadas
```

---

## Estimación de Esfuerzo Total

| Fase | Subfases | Tareas | Duración Estimada |
|------|----------|--------|-------------------|
| Fase 1: Componentes | 4 | 18 | 2-3 semanas |
| Fase 2: Arquitectura | 3 | 19 | 2-3 semanas |
| Fase 3: Testing | 3 | 17 | 2-3 semanas |
| **TOTAL** | **10** | **54** | **6-9 semanas** |

---

## Principios de Implementación

1. **No romper producción:** Cada cambio debe ser backwards-compatible
2. **Commits pequeños:** Una tarea = un commit verificable
3. **Feature flags:** Usar toggles para activar/desactivar refactors
4. **Validación continua:** Probar manualmente después de cada subfase
5. **Documentar decisiones:** Actualizar este documento con cambios

---

## Notas Importantes

- **storage.ts mantiene compatibilidad:** Al modularizar, storage.ts se convierte en "facade" que re-exporta, evitando romper imports existentes
- **routes.ts mantiene registro central:** Similar al storage, routes.ts registra las rutas modulares
- **Testing gradual:** Comenzar con 40% coverage y aumentar progresivamente
- **Priorizar servicios críticos:** sync, CRM routing, reminders son los más riesgosos

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
- Trigger: botón de icono Variable en el header de cada prompt card
- Filtrado en tiempo real con Command (cmdk)
- Muestra placeholder + descripción para cada variable

**2. PromptEditor (`client/src/components/PromptEditor.tsx`)**
- Reemplazo del Textarea estándar con visualización de blue chips
- Overlay para resaltar variables `{{variable}}` con estilo píldora
- Mantiene funcionalidad de textarea nativa (cursor, selección, scroll)
- Refs para inserción de variables en posición del cursor

### Integración en AIAgentConfig

```tsx
// Header de cada prompt card ahora incluye:
<VariablePicker 
  onSelectVariable={(placeholder) => insertVariableAtCursor(systemPromptRef, 'systemPrompt', placeholder)} 
/>

// Textarea reemplazado por:
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

### Beneficios UX
- **Reducción de espacio:** Eliminado el panel grande de "Variables Dinámicas"
- **Inserción contextual:** Variables se insertan donde está el cursor
- **Visualización clara:** Blue chips resaltan visualmente las variables en el prompt
- **Búsqueda rápida:** Filtrado instantáneo en el popover

### Archivos Modificados
- `client/src/components/AIAgentConfig.tsx` - Integración de componentes
- `shared/dynamicVariables.ts` - Agregadas nuevas variables (interaction_mode, reminder_number)

### Archivos Creados
- `client/src/components/VariablePicker.tsx`
- `client/src/components/PromptEditor.tsx`

---

*Documento creado: Enero 2026*
*Última actualización: 8 Enero 2026*
