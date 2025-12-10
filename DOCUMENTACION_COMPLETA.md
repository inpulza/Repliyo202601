# Sistema de Gestión de Inbox Social Media con Metricool

## Descripción del Proyecto
Sistema de gestión de mensajes de redes sociales que se integra con Metricool para centralizar y gestionar DMs y comentarios de múltiples marcas/empresas. El sistema permite a usuarios admin y clientes gestionar sus interacciones sociales de forma organizada.

## Estado Actual
- **Fase Actual**: ✅ FASE 8 COMPLETADA - Integración de IA en Inbox
- **Última Actualización**: 9 de Diciembre 2025
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
- **Próximo Paso**: FASE 9 - Características Avanzadas (notificaciones, tests, rate limiting, dashboard métricas)

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

**FASE 9: Características Avanzadas (Próxima)**
- ⚪ Sistema de notificaciones en tiempo real
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

### 3. PENDIENTE: Unificación Visual de Mensajes Enviados

**Problema detectado:** Los mensajes enviados desde Repliyo (tanto manuales como auto-reply) no tienen un estilo visual consistente en todas las plataformas y tipos de mensajes.

**Estado actual:**
- En comentarios: Funciona parcialmente con `isSentFromRepliyo` (bg-gray-800, logo de Repliyo)
- En DMs: No hay diferenciación visual clara entre mensajes del usuario enviados desde la app vs desde la red social

**Campo clave:** `source` en la tabla `messages`:
- `'repliyo'` = mensaje enviado manualmente desde Repliyo
- `'repliyo_auto'` = mensaje enviado automáticamente por IA
- `NULL` o vacío = mensaje sincronizado de redes sociales

**Ver instrucciones en archivo:** `INSTRUCCIONES_UNIFICACION_VISUAL.md`

---

### 3. Cálculo de Tiempo de Respuesta (Prioridad: Baja)

**Problema identificado:** El "Tiempo de Respuesta" en Overview muestra "--" porque solo hay 2 mensajes outbound de 332 totales. El cálculo requiere emparejar mensajes inbound con sus respuestas outbound.

**Datos actuales:**
- 330 mensajes inbound (recibidos)
- 2 mensajes outbound (enviados)
- Sin suficientes datos para calcular promedio significativo

**Solución:** Este problema se resolverá naturalmente cuando se usen más respuestas desde Repliyo. No requiere desarrollo adicional, solo uso del sistema.

---
