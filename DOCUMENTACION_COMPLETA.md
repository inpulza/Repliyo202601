# Sistema de Gestión de Inbox Social Media con Metricool

## Descripción del Proyecto
Sistema de gestión de mensajes de redes sociales que se integra con Metricool para centralizar y gestionar DMs y comentarios de múltiples marcas/empresas. El sistema permite a usuarios admin y clientes gestionar sus interacciones sociales de forma organizada.

## Estado Actual
- **Fase Actual**: ✅ FASE 4.5 COMPLETADA - Mapeo Completo de Redes Sociales
- **Última Actualización**: 27 de Noviembre 2025
- **Login/Logout**: ✅ Completamente funcional (página de login creada, logout en sidebar)
- **Sistema de Roles**: ✅ Admin vs Client funcionando correctamente
- **Marca de Prueba**: ✅ Impulsa conectada (blogId: 4074962)
- **Sincronización**: ✅ Funcionando correctamente - 145 mensajes (Instagram, LinkedIn, TikTok)
- **UI**: ✅ Inbox muestra mensajes con avatares, nombres, contenido y filtros funcionando
- **Próximo Paso**: Implementar sincronización automática cada 130 segundos

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
5. 🎯 **SIGUIENTE**: Fase 5 - Implementar sincronización automática cada 130 segundos

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

**FASE 5: Sincronización Automática y Respuestas (Próxima)**
1. 🟡 Implementar sincronización automática cada 130 segundos
2. 🟡 Agregar endpoint `POST /api/inbox/reply` para responder mensajes
3. 🟡 Implementar UI para escribir y enviar respuestas

**FASE 6: Características Avanzadas (Futuro)**
4. ⚪ Agregar página de configuración de usuario
5. ⚪ Implementar sistema de notificaciones en tiempo real
6. ⚪ Agregar tests unitarios para MetricoolService
7. ⚪ Implementar rate limiting para API endpoints

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
