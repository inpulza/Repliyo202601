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

FASE 4 (Autenticación Social) ← NUEVA
    │
    ├─► Puede comenzar INDEPENDIENTE de Fases 1-3
    │
    ├─► Subfase 4.2 depende de Subfase 4.1
    │
    ├─► Subfase 4.3 depende de Subfase 4.2
    │
    ├─► Subfase 4.4 puede ejecutarse en paralelo con 4.3
    │
    ├─► Subfase 4.5 depende de Subfases 4.3 y 4.4
    │
    └─► Subfase 4.7 (Testing) depende de todas las anteriores
```

---

## Estimación de Esfuerzo Total

| Fase | Subfases | Tareas | Duración Estimada |
|------|----------|--------|-------------------|
| Fase 1: Componentes | 4 | 18 | 2-3 semanas |
| Fase 2: Arquitectura | 3 | 19 | 2-3 semanas |
| Fase 3: Testing | 3 | 17 | 2-3 semanas |
| Fase 4: Autenticación Social | 7 | 44 | 1-2 semanas |
| **TOTAL** | **17** | **98** | **7-11 semanas** |

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
| 4.1.0 | **DECISIÓN:** Definir estrategia de integración - ¿Adaptar tabla `users` existente o usar tabla de Replit Auth por separado? | Decisión documentada | ⬜ |
| 4.1.1 | Exportar schema de auth desde `shared/models/auth.ts` (si se crea nuevo) | Schema accesible en `shared/schema.ts` | ⬜ |
| 4.1.2 | ~~Crear tabla `sessions`~~ → **YA EXISTE** en `server/sessionStore.ts` - Verificar compatibilidad con Replit Auth | Sesiones funcionan con ambos sistemas | ✅ |
| 4.1.3a | **CRÍTICO:** Cambiar campo `password` de `notNull()` a nullable en `shared/schema.ts` | Campo permite NULL | ⬜ |
| 4.1.3b | Agregar campos: `replitId` (varchar, nullable, unique), `profileImageUrl` (text, nullable), `authProvider` (text, default 'local') | Migración ejecutada sin errores | ⬜ |
| 4.1.4 | Ejecutar `npm run db:push` para aplicar cambios | Base de datos actualizada | ⬜ |
| 4.1.5 | Verificar que usuarios existentes mantienen acceso (query: `SELECT * FROM users WHERE password IS NOT NULL`) | Usuarios legacy funcionan | ⬜ |
| 4.1.6 | Actualizar valor `authProvider='local'` para todos los usuarios existentes | Migración de datos | ⬜ |

### Subfase 4.2: Integración del Módulo Replit Auth

**Objetivo:** Instalar y configurar Replit Auth en el servidor

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.2.1 | Agregar blueprint `javascript_log_in_with_replit` al proyecto | Archivos de integración creados en `server/replit_integrations/auth/` | ⬜ |
| 4.2.2 | Configurar `setupAuth(app)` en `server/app.ts` ANTES de `registerRoutes(app)` | Auth inicializado correctamente | ⬜ |
| 4.2.3 | Registrar rutas con `registerAuthRoutes(app)` - **NOTA:** Esto crea `/api/login` (nuevo), NO conflicta con `/api/auth/login` (existente) | Ambas rutas disponibles | ⬜ |
| 4.2.4 | ~~Verificar SESSION_SECRET~~ → **YA EXISTE** en `sessionStore.ts` | Variable ya configurada | ✅ |
| 4.2.5 | Adaptar módulo Replit Auth para usar `sessionStore` existente en lugar de crear nuevo | Una sola configuración de sesión | ⬜ |
| 4.2.6 | Probar flujo de login OAuth en desarrollo | Usuario puede autenticarse con Google | ⬜ |

### Subfase 4.3: Compatibilidad con Sistema Existente

**Objetivo:** Mantener login email/password funcionando junto con OAuth

> **ARQUITECTURA HÍBRIDA:** El sistema tendrá DOS formas de autenticarse:
> - **Legacy:** POST `/api/auth/login` con email/password → `req.session.userId`
> - **OAuth:** GET `/api/login` → Replit Auth → `req.user.claims.sub`

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.3.1 | Crear middleware `requireAuthHybrid` que detecte ambos tipos de sesión (legacy userId o OAuth claims) | Middleware unificado | ⬜ |
| 4.3.2 | Modificar `storage.ts` - crear función `getUserByReplitId(replitId)` | Función implementada | ⬜ |
| 4.3.3 | Modificar `storage.ts` - crear función `upsertUserFromOAuth(claims)` que busque por email primero | Función implementada | ⬜ |
| 4.3.4 | Implementar lógica de "merge": si OAuth email = email existente → vincular `replitId` a cuenta existente | Cuentas se vinculan automáticamente | ⬜ |
| 4.3.5 | Mantener rutas `/api/auth/login` y `/api/auth/logout` existentes SIN modificar | Login legacy funciona | ⬜ |
| 4.3.6 | Actualizar middleware `requireAuth` para soportar ambos formatos de sesión | Rutas protegidas funcionan con ambos auth | ⬜ |
| 4.3.7 | Asegurar que `filterByBrand` funciona con usuarios OAuth (verificar `brandId`) | Aislamiento mantiene | ⬜ |

### Subfase 4.4: Actualización del Frontend

**Objetivo:** Conectar botones de login social con flujo OAuth real

> **NOTA:** Replit Auth usa una sola ruta `/api/login` que muestra UI con TODOS los proveedores disponibles (Google, GitHub, Apple, Twitter). No necesitamos rutas separadas por proveedor.

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.4.1 | Modificar `Login.tsx` - cambiar `handleSocialLogin()` de toast a `window.location.href = '/api/login'` | Redirección funciona | ⬜ |
| 4.4.2 | Reemplazar botón Facebook por Twitter (X) - cambiar icono y texto | UI actualizada | ⬜ |
| 4.4.3 | Decidir: ¿Mantener 4 botones separados o usar 1 botón "Login con Replit"? | Decisión tomada | ⬜ |
| 4.4.4 | Usar hook `useAuth` proporcionado por Replit Auth (en `client/src/hooks/use-auth.ts`) | Hook integrado | ⬜ |
| 4.4.5 | Agregar manejo de error 401 con redirección usando `isUnauthorizedError` de Replit Auth | UX mejorada | ⬜ |
| 4.4.6 | Mostrar `profileImageUrl` del usuario en header/navbar si viene de OAuth | Avatar visible | ⬜ |
| 4.4.7 | Actualizar componente que muestra usuario actual para soportar ambos tipos de auth | UI funciona con legacy y OAuth | ⬜ |

### Subfase 4.5: Aislamiento de Datos por Usuario

**Objetivo:** Garantizar que usuarios OAuth solo ven sus propios datos

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.5.1 | Auditar todas las rutas para verificar uso de `filterByBrand` | Lista de rutas sin protección | ⬜ |
| 4.5.2 | Agregar middleware de autorización a rutas faltantes | 100% rutas protegidas | ⬜ |
| 4.5.3 | Implementar verificación de `brandId` en WebSocket connections | WS protegido | ⬜ |
| 4.5.4 | Test manual: crear 2 usuarios diferentes y verificar aislamiento | Datos aislados correctamente | ⬜ |
| 4.5.5 | Documentar políticas de acceso por rol | Documento actualizado | ⬜ |

### Subfase 4.6: Flujo de Onboarding para Nuevos Usuarios OAuth

**Objetivo:** Definir qué sucede cuando un usuario nuevo se autentica

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.6.1 | Definir flujo: ¿nuevo usuario OAuth crea brand automáticamente? | Decisión documentada | ⬜ |
| 4.6.2 | Implementar página de "Completar Perfil" si falta brandId | Redirect a onboarding | ⬜ |
| 4.6.3 | Opción A: Admin asigna brand manualmente después del registro | Implementar si aplica | ⬜ |
| 4.6.4 | Opción B: Usuario crea su propia brand al registrarse | Implementar si aplica | ⬜ |
| 4.6.5 | Enviar notificación a admin cuando nuevo usuario se registra | Notificación creada | ⬜ |

### Subfase 4.7: Testing y Validación de Seguridad

**Objetivo:** Verificar que la implementación es segura

| Tarea | Descripción | Criterio de Éxito | Estado |
|-------|-------------|-------------------|--------|
| 4.7.1 | Test: Usuario A no puede ver mensajes de Usuario B | Aislamiento verificado | ⬜ |
| 4.7.2 | Test: Usuario client no puede acceder a rutas admin | Roles funcionan | ⬜ |
| 4.7.3 | Test: Sesión expira correctamente después de logout | Sesión destruida | ⬜ |
| 4.7.4 | Test: Token de sesión no se puede falsificar | Seguridad verificada | ⬜ |
| 4.7.5 | Test: Usuarios existentes pueden seguir usando email/password | Compatibilidad | ⬜ |
| 4.7.6 | Documentar resultados de tests de seguridad | Documento actualizado | ⬜ |

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

*Documento creado: Enero 2026*
*Última actualización: 10 Enero 2026 - Fase 4 revisada con notas de compatibilidad, riesgos y orden de ejecución*
