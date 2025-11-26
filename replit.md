# Sistema de Gestión de Inbox Social Media con Metricool

## Descripción del Proyecto
Sistema de gestión de mensajes de redes sociales que se integra con Metricool para centralizar y gestionar DMs y comentarios de múltiples marcas/empresas. El sistema permite a usuarios admin y clientes gestionar sus interacciones sociales de forma organizada.

## Estado Actual
- **Fase Actual**: ✅ FASE 4 COMPLETADA - Refinamiento de Sincronización y UI
- **Última Actualización**: 26 de Noviembre 2025
- **Login/Logout**: ✅ Completamente funcional (página de login creada, logout en sidebar)
- **Sistema de Roles**: ✅ Admin vs Client funcionando correctamente
- **Marca de Prueba**: ✅ Impulsa conectada (blogId: 4074962)
- **Sincronización**: ✅ Funcionando correctamente - 2 mensajes de LinkedIn con datos completos
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
- Importante: Un usuario de Metricool puede tener múltiples brands (blogIds)
- **Creación de Admins**: Solo manual en base de datos (por seguridad)
  ```sql
  INSERT INTO users (id, email, password, name, role, brand_id)
  VALUES (gen_random_uuid(), 'admin@example.com', 'hashed_password', 'Admin Name', 'admin', NULL);
  ```
- **Arquitectura Multi-tenant**: Cada cliente (client user) está asociado a una única brand
- **Seguridad**: Todas las rutas API están protegidas con autenticación y validación de roles
