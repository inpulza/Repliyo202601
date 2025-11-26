# Sistema de Gestión de Inbox Social Media con Metricool

## Descripción del Proyecto
Sistema de gestión de mensajes de redes sociales que se integra con Metricool para centralizar y gestionar DMs y comentarios de múltiples marcas/empresas. El sistema permite a usuarios admin y clientes gestionar sus interacciones sociales de forma organizada.

## Estado Actual
- **Fase Actual**: ✅ Fase 1 COMPLETADA - Lista para Fase 2
- **Última Actualización**: 26 de Noviembre 2025
- **Frontend**: Diseño UI completo en componente Inbox (errores TypeScript se resolverán en Fase 3)
- **Backend**: ✅ Arquitectura multi-tenant completa con autenticación y seguridad implementada

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

### FASE 2: El Servicio de Conexión (Metricool Connector) (PENDIENTE)
**Objetivo:** Enseñar al backend a "hablar" con Metricool.

#### Tareas:
1. **Crear `MetricoolService`:**
   - Configurar clase/módulo que acepte `metricoolToken` y tenga métodos para llamar endpoints
   
2. **Integrar Endpoints de Metricool:**
   - Implementar `getBrands(token)` usando `/api/admin/simpleProfiles`
   - Implementar `getConversations(token, provider)` usando `/api/v2/inbox/conversations`
   - Implementar `getComments(token, provider)` usando `/api/v2/inbox/post-comments`

3. **Lógica de Sincronización (Sync):**
   - Crear endpoint `POST /api/sync-brand/:brandId`
   - Al llamarlo, el backend debe:
     1. Buscar el token de la marca en la DB
     2. Llamar a Metricool y bajar los últimos mensajes
     3. Guardarlos ("Upsert") en base de datos local asociados a ese `brandId`

**Prueba de éxito Fase 2:**
- Poner un Token real en la DB
- Disparar el Sync
- Ver que la tabla `messages` se llena con datos reales de Metricool

---

### FASE 3: Exponer Datos al Frontend (PENDIENTE)
**Objetivo:** Que el diseño UI muestre datos reales.

#### Tareas:
1. **API Endpoints para el Cliente:**
   - `GET /api/inbox`: Devuelve mensajes de la DB (filtrados por marca del usuario logueado)
   - `POST /api/inbox/reply`: (Futuro) Para responder

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
1. Completar Fase 1: Base de datos + Autenticación
2. Probar que la seguridad por roles funciona correctamente
3. Dejar frontend con errores TypeScript hasta conectar con backend real

---

## Archivos Importantes

### Backend
- `server/app.ts` - Express app setup
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Interface de storage + implementación DB
- `server/db.ts` - Conexión PostgreSQL
- `shared/schema.ts` - Schema de Drizzle ORM + tipos Zod

### Frontend
- `client/src/components/Inbox.tsx` - Componente principal (24 errores TypeScript pendientes)
- `client/src/App.tsx` - Routing principal

---

## Próximos Pasos
1. ✅ Crear replit.md con toda la información
2. ✅ Implementar Fase 1 completa
3. ✅ Testing de seguridad multi-tenant
4. ⏳ **SIGUIENTE: Fase 2 - Integración con Metricool API**
5. ⏳ Fase 3: Conectar frontend con backend real

---

## Notas de Desarrollo
- ✅ Tabla `clients` renombrada a `brands` exitosamente
- Los errores TypeScript en Inbox.tsx se resolverán en Fase 3 al conectar con backend real
- Importante: Un usuario de Metricool puede tener múltiples brands (blogIds)
- **Creación de Admins**: Solo manual en base de datos (por seguridad)
  ```sql
  INSERT INTO users (id, email, password, name, role, brand_id)
  VALUES (gen_random_uuid(), 'admin@example.com', 'hashed_password', 'Admin Name', 'admin', NULL);
  ```
- **Arquitectura Multi-tenant**: Cada cliente (client user) está asociado a una única brand
- **Seguridad**: Todas las rutas API están protegidas con autenticación y validación de roles
