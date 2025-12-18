# Sistema de Gestión de Inbox Social Media con Metricool

## Descripción del Proyecto
Sistema de gestión de mensajes de redes sociales que se integra con Metricool para centralizar y gestionar DMs y comentarios de múltiples marcas/empresas. El sistema permite a usuarios admin y clientes gestionar sus interacciones sociales de forma organizada.

## Estado Actual
- **Fase Actual**: ✅ FASE 9 COMPLETADA - Sistema de Notificaciones Central
- **Última Actualización**: 18 de Diciembre 2025
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
- **Smart Digest**: ✅ Notificaciones humanizadas con nombres de autores
- **Deep Links**: ✅ Click en notificación navega a conversación con scroll + highlight
- **Filtros Mejorados**: ✅ Badges muestran solo no leídos, filtro conjunto automático
- **Próximo Paso**: Tests unitarios, rate limiting, dashboard de métricas IA

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
| `{{platform}}` | Red social | `message.platform` |
| `{{brand_name}}` | Nombre de la marca | `brand.name` |
| `{{post_context}}` | Descripción del post original | `socialPost.caption` |
| `{{char_limit}}` | Límite de caracteres | `PLATFORM_LIMITS[platform]` |

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

#### Archivos Modificados:
- `server/routes.ts` - Endpoint `POST /api/ai-agent/:brandId/send-draft/:messageId` (líneas ~2193-2212)

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
