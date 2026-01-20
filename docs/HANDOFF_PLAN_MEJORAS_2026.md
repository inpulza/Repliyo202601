# HANDOFF: Plan de Mejoras Técnicas 2026 - Repliyo

**Fecha:** 20 Enero 2026  
**Estado:** Fase 1.2 en progreso, app funcionando pero requiere validación  
**Prioridad:** Alta - Refactorización crítica del frontend

---

## 1. CONTEXTO DEL PROYECTO

### 1.1 ¿Qué es Repliyo?

Repliyo es un sistema de gestión de inbox de redes sociales integrado con Metricool. Permite:
- Recibir mensajes de Instagram, Facebook, TikTok, YouTube, Twitter, LinkedIn, WhatsApp
- Responder automáticamente con IA o manualmente
- Gestionar un CRM de contactos
- Programar recordatorios automáticos
- Ver estadísticas y métricas de IA

### 1.2 El Problema Técnico

Los componentes principales del frontend crecieron sin control:

| Archivo | Líneas | Hooks | Estado |
|---------|--------|-------|--------|
| `Inbox.tsx` | 2,700+ | 63 | Muy complejo, prop drilling severo |
| `CommentThread.tsx` | 1,283 | - | Recibe 25 props de Inbox |
| `routes.ts` (backend) | 6,000+ | - | Monolítico |
| `storage.ts` (backend) | 4,000+ | - | Monolítico |

**Síntomas:**
- Prop drilling de 14+ props de drafts de Inbox → CommentThread → SingleMessage → DraftCard
- Lógica duplicada (iconos de plataforma, formateo de fechas) en 7+ archivos
- Difícil de mantener y debuggear
- Cambios pequeños pueden romper funcionalidad no relacionada

---

## 2. ESTRATEGIA: STRANGLER FIG PATTERN

### 2.1 ¿Por qué Strangler Fig?

El patrón "Strangler Fig" (higo estrangulador) es una técnica de refactorización gradual:

1. **NO reescribir desde cero** - El código actual funciona y tiene lógica de negocio probada
2. **Crear nuevos componentes/hooks al lado** del código viejo
3. **Migrar gradualmente** el consumo hacia el código nuevo
4. **Eliminar código viejo** solo cuando el nuevo esté 100% validado

### 2.2 Regla de Oro

> "El código nuevo SIEMPRE debe seguir la arquitectura correcta.  
> El código viejo solo se toca si es absolutamente necesario."

---

## 3. PLAN DE FASES

### Fase 1: Auditoría y Hooks de Inbox (EN PROGRESO)

| Sub-fase | Descripción | Estado |
|----------|-------------|--------|
| 1.1 | Auditoría completa de hooks y dependencias | ✅ Completado |
| 1.2 | Creación de hooks personalizados | 🔸 En progreso |
| 1.3 | Validación y pruebas | ⬜ Pendiente |

### Fase 2: Refactor de CommentThread (PENDIENTE)

| Sub-fase | Descripción | Estado |
|----------|-------------|--------|
| 2.1 | Eliminar prop drilling usando hooks creados en 1.2 | ⬜ Pendiente |
| 2.2 | Extraer subcomponentes (AudioPlayer, SentimentIndicator) | ⬜ Pendiente |
| 2.3 | Reducir CommentThread de 25 props a ~11 props | ⬜ Pendiente |

### Fase 3: Arquitectura Backend (PENDIENTE)

| Sub-fase | Descripción | Estado |
|----------|-------------|--------|
| 3.1 | Crear estructura de rutas modular (`server/routes/*.routes.ts`) | ⬜ Pendiente |
| 3.2 | Crear repositorios (`server/repositories/*.ts`) | ⬜ Pendiente |
| 3.3 | Migrar gradualmente endpoints de `routes.ts` | ⬜ Pendiente |

---

## 4. DETALLE DE FASE 1.2 - HOOKS PERSONALIZADOS

### 4.1 Hooks a Crear

| Hook | Propósito | Estado | Archivo |
|------|-----------|--------|---------|
| `useDraftManagement` | Gestión de borradores (10 estados, 7 callbacks) | ✅ Creado + Integrado | `hooks/useDraftManagement.ts` |
| `useInboxFilters` | Filtros de lista + thread (10 estados) | ✅ Creado + Integrado | `hooks/useInboxFilters.ts` |
| `useUnreadTracking` | Seguimiento de mensajes no leídos (2 estados) | ✅ Creado + Integrado | `hooks/useUnreadTracking.ts` |
| `useConversationLifecycle` | Estados de conversación (2 estados) | ⬜ Pendiente | - |
| `useSyncStatus` | Estado de sincronización (3 estados) | ⬜ Pendiente | - |
| `useDeepLink` | Deep links y navegación (3 estados) | ⬜ Pendiente | - |

### 4.2 Utilidades Creadas

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `components/ui/PlatformIcon.tsx` | Iconos de plataforma centralizados | 🔸 Creado, uso opcional |
| `lib/date-utils.ts` | Formateo de fechas con locale español | 🔸 Creado, uso opcional |

### 4.3 Estado Actual de Integración

**useDraftManagement** (✅ Integrado en Inbox.tsx línea ~200):
```typescript
const draftManagement = useDraftManagement(
  activeConversation?.id || '',
  activeClientId || '',
  activeConversation
);
const {
  isEditing, setIsEditing,
  replyToMessage, setReplyToMessage,
  replyText, setReplyText,
  // ... todos los estados y callbacks de drafts
} = draftManagement;
```

**useInboxFilters** (✅ Integrado en Inbox.tsx línea ~450):
```typescript
const inboxFilters = useInboxFilters();
const {
  searchQuery, setSearchQuery,
  intentFilter, setIntentFilter,
  platformFilter, setPlatformFilter,
  // ... todos los filtros
} = inboxFilters;
```

**useUnreadTracking** (✅ Integrado en Inbox.tsx línea ~218):
```typescript
const unreadTracking = useUnreadTracking({
  activeConversation,
  activeConversationMessages,
  conversations,
});
const { unreadMessageIds, clearUnreadMessage: handleUnreadSeen } = unreadTracking;
```

---

## 5. DOCUMENTACIÓN DE AUDITORÍA

### 5.1 Archivos de Auditoría (LEER OBLIGATORIAMENTE)

| Archivo | Contenido |
|---------|-----------|
| `docs/audits/INBOX_HOOKS_AUDIT.md` | Inventario de 63 hooks de Inbox.tsx, diagrama de dependencias, tabla de progreso |
| `docs/audits/INBOX_CONTRACTS.md` | Mapeo de 25 props que pasan de Inbox → CommentThread |
| `docs/audits/DUPLICATED_LOGIC.md` | 4 categorías de lógica duplicada identificadas |
| `docs/audits/CRMCONTEXTPANEL_AUDIT.md` | Auditoría de CRMContextPanel (bien estructurado, NO requiere refactor) |

### 5.2 Tabla de Progreso en INBOX_HOOKS_AUDIT.md

**IMPORTANTE:** Mantener actualizada la tabla de progreso en `docs/audits/INBOX_HOOKS_AUDIT.md` líneas 16-40. Esta es la fuente de verdad del estado de los hooks.

---

## 6. REGLAS CRÍTICAS DE UI (NO CAMBIAR)

### 6.1 Estilos de Mensajes

| Tipo | Fondo | Texto | Piquito |
|------|-------|-------|---------|
| **Outbound (respuesta de marca)** | Azul `#0291FA` | Blanco | Esquina superior IZQUIERDA |
| **Inbound (mensaje del cliente)** | Blanco | Gris | Esquina superior IZQUIERDA |

**Aplica a:** `ownerBubble`, `aiBubble`, `manualBubble`, `replyBubble` en Inbox.tsx y CommentThread.tsx

### 6.2 WebSocket

- La conexión WebSocket DEBE mantenerse estable
- No modificar `useWebSocket.ts` sin pruebas exhaustivas
- Los reconectos automáticos cada 5 segundos son normales

---

## 7. PROBLEMAS CONOCIDOS

### 7.1 Errores de TypeScript Pre-existentes

El proyecto tiene errores de TypeScript en:
- `CRMContextPanel.tsx` (type 'unknown')
- `LandingPage.tsx` (props faltantes)
- `LanguageContext.tsx` (tipos incompatibles)
- `storage.ts` (múltiples errores de tipo)

**NOTA:** Vite compila a pesar de estos errores. NO son causados por la Fase 1.2.

### 7.2 Sesión de Usuario

- La sesión puede expirar y mostrar página de login
- Si el usuario ve "pantalla en blanco", verificar logs del navegador
- Error 401 = sesión expirada, el usuario debe re-autenticarse

---

## 8. SIGUIENTE PASO INMEDIATO

### 8.1 Tarea Prioritaria: Validar Fase 1.2

1. **Verificar que la app funciona:**
   - Iniciar sesión
   - Navegar a `/app/inbox`
   - Seleccionar una conversación
   - Verificar que los drafts funcionan (generar, editar, enviar)
   - Verificar que los filtros funcionan

2. **Si hay errores:**
   - Revisar logs del navegador (F12 → Console)
   - Revisar logs del servidor (`refresh_all_logs`)
   - Comparar con código pre-Fase 1.2 si es necesario

3. **Si todo funciona:**
   - Marcar Fase 1.2 como completada en `INBOX_HOOKS_AUDIT.md`
   - Continuar con `useUnreadTracking` (integrar o eliminar)
   - Planificar Fase 2 (refactor de CommentThread)

### 8.2 Comando para Verificar Estado

```bash
# Ver estado de la app
curl -s http://localhost:5000/app/inbox -o /dev/null -w "%{http_code}"
# Esperado: 200

# Ver errores de TypeScript
npx tsc --noEmit 2>&1 | head -20

# Ver logs recientes
cat /tmp/logs/browser_console_*.log | tail -50
```

---

## 9. ESTRUCTURA DE ARCHIVOS RELEVANTES

```
client/src/
├── components/
│   ├── Inbox.tsx              # 2700+ líneas - COMPONENTE PRINCIPAL
│   ├── CommentThread.tsx      # 1283 líneas - Recibe 25 props
│   ├── CRMContextPanel.tsx    # 729 líneas - Bien estructurado
│   └── ui/
│       └── PlatformIcon.tsx   # NUEVO - Iconos centralizados
├── hooks/
│   ├── useDraftManagement.ts  # NUEVO - 10 estados de drafts
│   ├── useInboxFilters.ts     # NUEVO - 10 estados de filtros
│   ├── useUnreadTracking.ts   # NUEVO - NO INTEGRADO
│   └── useBulkDraftQueue.ts   # Existente - Cola de drafts bulk
├── lib/
│   ├── date-utils.ts          # NUEVO - Formateo de fechas
│   └── types.ts               # Tipos Platform, MessageType, Intent

docs/
├── audits/
│   ├── INBOX_HOOKS_AUDIT.md   # LEER PRIMERO - Tabla de progreso
│   ├── INBOX_CONTRACTS.md     # Props de CommentThread
│   ├── DUPLICATED_LOGIC.md    # Lógica duplicada identificada
│   └── CRMCONTEXTPANEL_AUDIT.md
└── HANDOFF_PLAN_MEJORAS_2026.md  # ESTE DOCUMENTO
```

---

## 10. CHECKLIST DE HANDOFF

Antes de continuar, el próximo agente debe:

- [ ] Leer este documento completo
- [ ] Leer `docs/audits/INBOX_HOOKS_AUDIT.md` (tabla de progreso)
- [ ] Verificar que la app carga correctamente (`/app/inbox`)
- [ ] Revisar si hay errores en logs del navegador
- [ ] Entender la estrategia Strangler Fig (NO reescribir, migrar gradualmente)
- [ ] Conocer las reglas de UI (mensajes azul=outbound, blanco=inbound)

---

## 11. CONTACTO Y RECURSOS

- **replit.md:** Contiene arquitectura general del proyecto
- **Strangler Fig Pattern:** https://martinfowler.com/bliki/StranglerFigApplication.html
- **Metricool API:** Documentación interna en el proyecto

---

**FIN DEL HANDOFF**

*Última actualización: 20 Enero 2026 12:55 UTC*
