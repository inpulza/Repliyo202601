# Investigación: Congelamiento de Aplicación y Entorno

## What & Why
Investigación a fondo del congelamiento total (freeze) que experimenta el usuario por 20-30 segundos, afectando tanto Repliyo como el entorno de Replit completo. El objetivo es documentar todas las causas raíz identificadas y proporcionar un plan de refactorización seguro, considerando que el proyecto está en producción sin tests unitarios ni de integración.

## Contexto Crítico
- **Proyecto en producción** con usuarios activos y datos reales.
- **Sin tests unitarios ni de integración** — cualquier refactorización debe ser incremental y verificable manualmente.
- **El freeze afecta al navegador completo** (no solo la app), lo que indica saturación del hilo principal del navegador.

## Done looks like
Este documento sirve como referencia técnica para que un agente ejecutor pueda implementar las optimizaciones de forma segura e incremental. No es una tarea de implementación en sí misma.

---

## Hallazgos de la Investigación

### Causa Raíz #1: Cascada de Invalidaciones de Queries (CRÍTICA)

**Archivos afectados:**
- `client/src/components/Inbox.tsx` (líneas 205-212, 250, 278, 420-421, 484-485, 1055, 1104, 1180, 1290, 1348, 1395, 1433, 1470)
- `client/src/context/NexusContext.tsx` (líneas 192, 203, 216-217, 278, 298-300, 357-359)
- `client/src/hooks/useWebSocket.ts`

**Problema:**
Cada vez que llega un mensaje nuevo por WebSocket, se disparan entre 6 y 12 llamadas `invalidateQueries` simultáneas. Esto causa:
1. Múltiples peticiones HTTP al servidor en paralelo.
2. Cada respuesta provoca un re-render de los componentes que consumen esas queries.
3. Si llegan varios mensajes durante un ciclo de sync (cada 2 minutos), el efecto se multiplica exponencialmente.

**Evidencia en logs:**
El servidor procesa decenas de DMs por segundo durante un ciclo de sync. Cada DM genera una notificación WebSocket que dispara la cascada en el frontend.

**Impacto estimado:** Alto — esta es probablemente la causa principal del freeze.

---

### Causa Raíz #2: Componentes Monolíticos sin Aislamiento de Renders (ALTA)

**Archivos afectados:**
- `client/src/components/Inbox.tsx` — 3,215 líneas
- `client/src/components/landing/LandingPage.tsx` — 4,191 líneas
- `client/src/components/AIAgentConfig.tsx` — 3,170 líneas

**Problema:**
Estos componentes gigantes manejan docenas de estados y hooks en un solo archivo. Cuando cualquier estado cambia (un filtro, un toggle, un mensaje nuevo), todo el componente se reconcilia, incluyendo cálculos derivados pesados como `buildMessageTree`, filtrado de hilos, y conteos de no leídos.

**Agravante en LandingPage.tsx:**
Contiene **56 llamadas a setInterval/setTimeout** para animaciones GSAP y framer-motion. Estos timers corren constantemente y compiten por el hilo principal del navegador. Si el usuario tiene esta página abierta en otra pestaña o la visitó recientemente, los timers pueden seguir ejecutándose.

**Impacto estimado:** Alto — contribuye directamente a la saturación del hilo principal.

---

### Causa Raíz #3: Contexto Monolítico (NexusContext) (MEDIA-ALTA)

**Archivo afectado:**
- `client/src/context/NexusContext.tsx` — 402 líneas

**Problema:**
`NexusContext` agrupa datos dispares (clients, conversations, messages, activeClientId, etc.) en un solo Provider. Cuando se actualiza cualquier propiedad (como `activeConversationMessages` que cambia frecuentemente durante sync), **todos los componentes** que consumen `useNexus()` se re-renderizan, incluso si solo necesitan `activeClientId`.

**Impacto estimado:** Medio-Alto — amplifica el efecto de las causas #1 y #2.

---

### Causa Raíz #4: Polling Agresivo Concurrente (MEDIA)

**Archivos afectados:**
- `client/src/components/Inbox.tsx` — `refetchInterval: 30000` (sync status), `refetchInterval: 60000` (otra query)
- `client/src/pages/CrisisAlerts.tsx` — 2 queries con `refetchInterval: 30000`
- `client/src/components/NotificationCenter.tsx` — `refetchInterval: 30000`
- `client/src/hooks/useReminderRules.ts` — `refetchInterval: 60000` y 3 queries con `refetchInterval: 300000`
- `client/src/lib/queryClient.ts` — `refetchOnWindowFocus: true` como default global

**Problema:**
Hay 7+ queries con polling activo corriendo simultáneamente. Cada ciclo de 30s genera múltiples peticiones HTTP, respuestas JSON que deben parsearse, y posibles re-renders si los datos cambiaron. Combinado con `refetchOnWindowFocus: true`, al volver a la pestaña se disparan TODAS las queries de golpe.

**Impacto estimado:** Medio — contribuye a la carga general pero no es la causa principal por sí sola.

---

### Causa Raíz #5: Procesamiento Pesado del Backend durante Sync (MEDIA)

**Archivos afectados:**
- `server/services/syncService.ts` — 1,391 líneas
- `server/storage.ts` — 4,609 líneas

**Problema:**
El SyncService corre cada 2 minutos y procesa TODAS las marcas activas secuencialmente. Por cada marca:
1. Llama a la API de Metricool para DMs y comentarios de cada proveedor social.
2. Hace upsert de cada conversación y mensaje en la base de datos.
3. Ejecuta análisis de sentimiento, routing CRM, y auto-reply para mensajes nuevos.
4. Envía notificaciones WebSocket por cada mensaje nuevo (lo que amplifica Causa #1).

Como las marcas se procesan una tras otra con solo 2s de delay, un ciclo completo puede tomar bastante tiempo y generar una ráfaga continua de actividad.

**Sub-problema: Queries SQL pesadas**
- `getConversationsEligibleForReminder` (storage.ts ~línea 3733) usa CTEs con MAX y GROUP BY sobre la tabla `messages`. Sin índices específicos, esta query se degrada con el volumen de datos.
- `getReminderStats` (storage.ts ~línea 3824) hace múltiples COUNT y AVG.

**Impacto en el freeze:** Medio — el backend responde más lento durante sync, haciendo que las queries del polling y las invalidaciones tarden más, lo cual mantiene al frontend ocupado esperando.

---

### Causa Raíz #6: Verificación de Auth Bloqueante (BAJA)

**Archivo afectado:**
- `client/src/context/AuthContext.tsx` (líneas 27, 63, 82, 86, 92, 96-101)

**Problema:**
La función `checkAuth` se ejecuta en los eventos `pageshow` y `visibilitychange`. Al volver a la pestaña, esto añade una petición de red bloqueante antes de que la UI responda.

**Impacto estimado:** Bajo — contribuye marginalmente al problema.

---

## Plan de Refactorización Segura (Sin Tests)

### Principios de Seguridad
1. **Cambios atómicos:** Cada cambio debe ser una unidad independiente que se pueda revertir.
2. **Verificación manual:** Después de cada cambio, verificar manualmente que el inbox, las notificaciones, y el sync siguen funcionando.
3. **Feature flags:** Donde sea posible, usar variables de configuración para activar/desactivar las optimizaciones.
4. **Sin cambios de lógica de negocio:** Solo optimizar rendimiento, nunca alterar qué datos se muestran o cómo se procesan.
5. **Orden de riesgo:** Empezar por los cambios de menor riesgo y mayor impacto.

### Fase 1: Cambios de Bajo Riesgo / Alto Impacto (Prioridad Inmediata)

#### 1.1 Debounce de invalidaciones WebSocket
- **Qué:** Agrupar las múltiples `invalidateQueries` que se disparan por cada mensaje WebSocket en un solo batch con un debounce de 1-2 segundos.
- **Dónde:** `client/src/hooks/useWebSocket.ts` y `client/src/context/NexusContext.tsx`
- **Riesgo:** Muy bajo — solo retrasa las actualizaciones 1-2 segundos, no cambia qué datos se muestran.
- **Impacto:** Alto — reduce la cascada de peticiones de red drásticamente.
- **Verificación:** Enviar un DM de prueba y confirmar que aparece en el inbox en <3 segundos.

#### 1.2 Reducir frecuencia de polling
- **Qué:** Cambiar los `refetchInterval` de 30s a 60-120s en queries no críticas (sync status, notificaciones, alertas). Desactivar `refetchOnWindowFocus` para queries que ya reciben datos por WebSocket.
- **Dónde:** `client/src/components/Inbox.tsx`, `client/src/pages/CrisisAlerts.tsx`, `client/src/components/NotificationCenter.tsx`
- **Riesgo:** Muy bajo — la información se actualiza un poco más lento, pero el WebSocket ya entrega datos en tiempo real.
- **Impacto:** Medio — reduce la carga constante de peticiones de red.
- **Verificación:** Confirmar que las notificaciones y alertas siguen apareciendo (con un ligero delay aceptable).

#### 1.3 Agregar staleTime a queries frecuentes — ✅ YA IMPLEMENTADO
- **Estado:** El `queryClient.ts` ya tiene `staleTime: 30000` como default global (línea 50).
- **Nota:** No requiere cambios adicionales. Si alguna query individual lo necesita más alto, se puede configurar por query.

### Fase 2: Cambios de Riesgo Moderado / Alto Impacto

#### 2.1 Separar el NexusContext en contextos granulares
- **Qué:** Dividir NexusContext en 2-3 contextos separados: `ClientContext` (marca activa), `ConversationContext` (datos de conversación), `UIContext` (estados de interfaz).
- **Dónde:** `client/src/context/NexusContext.tsx` → crear nuevos archivos de contexto.
- **Riesgo:** Moderado — requiere actualizar todos los componentes que usan `useNexus()`.
- **Impacto:** Alto — reduce drásticamente los re-renders innecesarios.
- **Verificación:** Recorrer todas las secciones de la app (inbox, CRM, configuración, alertas) y confirmar funcionalidad completa.
- **Alternativa de menor riesgo:** Usar `useMemo` selectivo dentro del contexto actual para que los consumidores solo se suscriban a las partes que necesitan (patrón de context selector).

#### 2.2 Extraer sub-componentes del Inbox
- **Qué:** Extraer las secciones lógicas del Inbox en componentes hijos memoizados: `ConversationList`, `MessagePanel`, `ConversationFilters`, `MessageComposer`.
- **Dónde:** `client/src/components/Inbox.tsx` → crear sub-componentes en `client/src/components/inbox/`.
- **Riesgo:** Moderado — es refactorización pura (sin cambio de lógica), pero el archivo es grande y complejo.
- **Impacto:** Alto — permite que cuando llegue un mensaje, solo se re-renderice el panel de mensajes, no toda la lista de conversaciones ni los filtros.
- **Verificación:** Probar todos los flujos del inbox: filtrar, buscar, seleccionar conversación, enviar mensaje, recibir mensaje, acciones masivas.

### Fase 3: Cambios de Mayor Riesgo / Impacto Estructural

#### 3.1 Optimizar el ciclo de sync del backend
- **Qué:** Implementar sync incremental — solo procesar mensajes nuevos desde el último timestamp sincronizado, en lugar de recorrer todo el historial cada ciclo.
- **Dónde:** `server/services/syncService.ts`
- **Riesgo:** Alto — cambia la lógica central de sincronización.
- **Impacto:** Alto — reduce drásticamente la carga del servidor y la cantidad de notificaciones WebSocket generadas.
- **Verificación:** Monitorear los logs de sync durante varios ciclos y confirmar que los mensajes nuevos siguen llegando correctamente.

#### 3.2 Rate-limiting de notificaciones WebSocket del servidor
- **Qué:** Agrupar las notificaciones WebSocket del servidor: en lugar de enviar una por cada mensaje procesado, acumular durante el ciclo de sync y enviar un solo evento "batch_update" al final.
- **Dónde:** `server/services/syncService.ts`, servicio de WebSocket del servidor.
- **Riesgo:** Moderado-Alto — cambia el flujo de notificaciones en tiempo real.
- **Impacto:** Alto — elimina la ráfaga de eventos que dispara la cascada en el frontend.
- **Verificación:** Confirmar que los mensajes nuevos aparecen después de cada ciclo de sync (con un delay máximo de ~2 minutos).

#### 3.3 Optimización de LandingPage
- **Qué:** Implementar lazy loading de las animaciones — solo inicializar timers cuando las secciones son visibles (IntersectionObserver). Limpiar timers correctamente al desmontar.
- **Dónde:** `client/src/components/landing/LandingPage.tsx`
- **Riesgo:** Moderado — las animaciones podrían verse diferentes si no se inicializan correctamente.
- **Impacto:** Medio — libera recursos del navegador cuando el usuario no está en la landing page.
- **Verificación:** Visitar la landing page y confirmar que todas las animaciones se ven correctas.

---

## Manual Verification Checklist

Before and after each phase, verify these critical flows:

### Inbox Flow
- [ ] Open inbox — conversation list loads correctly
- [ ] Select a conversation — messages load
- [ ] Send a reply — message appears in thread
- [ ] Receive a new DM (via sync) — notification appears, conversation updates
- [ ] Filter conversations — filters work correctly
- [ ] Search conversations — search works
- [ ] Bulk draft generation — drafts generate for selected messages
- [ ] Bulk send — messages send correctly
- [ ] Private reply button — works on Facebook comments

### Notifications Flow
- [ ] Bell icon shows unread count
- [ ] Clicking opens notification panel
- [ ] Mark as read works
- [ ] Mark all as read works

### Crisis Alerts Flow
- [ ] Alert cards display correctly
- [ ] Filter by severity works
- [ ] Filter by status works
- [ ] Acknowledge/resolve/dismiss actions work

### Sync Flow
- [ ] Manual sync triggers correctly
- [ ] Auto sync runs every 2 minutes
- [ ] New messages from social platforms appear
- [ ] No duplicate messages after sync

---

## Métricas para Medir Progreso
Antes de empezar cualquier cambio, registrar baseline:
1. **Network tab del navegador:** Cantidad de peticiones por minuto estando en el inbox.
2. **Performance tab:** Duración de "Long Tasks" (tareas que bloquean el hilo principal >50ms).
3. **Memory tab:** Uso de memoria del heap de JavaScript.
4. **Logs del servidor:** Cantidad de mensajes procesados por ciclo de sync.

Después de cada fase, repetir las mismas mediciones y comparar.

---

## Verificación de Código (Code Review)

Todos los hallazgos fueron verificados contra el código fuente actual. Correcciones aplicadas:

1. **Causa #1 — CONFIRMADA:** Inbox.tsx tiene 21 llamadas `invalidateQueries` (líneas verificadas). El handler WebSocket (líneas 204-212) dispara 6 invalidaciones por cada evento `new_message` o `crisis_alert`.

2. **Causa #2 — CONFIRMADA:** Conteos exactos verificados: Inbox.tsx (3,215 líneas), LandingPage.tsx (4,191 líneas), AIAgentConfig.tsx (3,170 líneas). LandingPage tiene exactamente 56 referencias a setInterval/setTimeout.

3. **Causa #3 — CONFIRMADA:** NexusContext.tsx tiene 402 líneas con un solo Provider que expone 20+ propiedades.

4. **Causa #4 — CONFIRMADA:** 8 queries con polling activo verificadas:
   - Inbox.tsx: `refetchInterval: 30000` (sync status), `refetchInterval: 60000` (crisis alerts by conversation)
   - CrisisAlerts.tsx: 2× `refetchInterval: 30000`
   - NotificationCenter.tsx: `refetchInterval: 30000`
   - useReminderRules.ts: `refetchInterval: 60000` + 3× `refetchInterval: 300000`

5. **Causa #5 — CONFIRMADA con corrección:** syncService.ts tiene 1,391 líneas (no 1,388), storage.ts tiene 4,609 líneas (no 4,484).

6. **Causa #6 — CORREGIDA:** El archivo correcto es `client/src/context/AuthContext.tsx`, no `client/src/lib/auth-utils.ts` (que existe pero no contiene la lógica de `checkAuth`/`pageshow`/`visibilitychange`).

7. **Fase 1.3 — YA IMPLEMENTADA:** `queryClient.ts` ya tiene `staleTime: 30000` como default global.

## Relevant files
- `client/src/hooks/useWebSocket.ts`
- `client/src/context/NexusContext.tsx`
- `client/src/context/AuthContext.tsx`
- `client/src/components/Inbox.tsx`
- `client/src/components/landing/LandingPage.tsx`
- `client/src/components/AIAgentConfig.tsx`
- `client/src/pages/CrisisAlerts.tsx`
- `client/src/components/NotificationCenter.tsx`
- `client/src/hooks/useReminderRules.ts`
- `client/src/lib/queryClient.ts`
- `server/services/syncService.ts`
- `server/storage.ts`
