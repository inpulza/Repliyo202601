# Sistema de Gestión de Inbox Social Media con Metricool

## Descripción del Proyecto
Sistema de gestión de mensajes de redes sociales que se integra con Metricool para centralizar y gestionar DMs y comentarios de múltiples marcas/empresas. El sistema permite a usuarios admin y clientes gestionar sus interacciones sociales de forma organizada.

## Estado Actual
- **Fase Actual**: Preparando implementación de Fase 1
- **Última Actualización**: 26 de Noviembre 2025
- **Frontend**: Diseño UI completo en componente Inbox (tiene 24 errores TypeScript pendientes de resolver después de conectar backend)
- **Backend**: Estructura básica creada, pendiente de refactorizar según nuevo schema

---

## PRD Técnico Completo

### FASE 1: Arquitectura de Datos & Autenticación (EN PROGRESO)
**Objetivo:** Que existan usuarios y que cada uno vea solo lo suyo.

#### Tareas:
1. **Database Schema (PostgreSQL):**
   - Crear tabla `brands` (almacena `metricoolToken`, `blogId`, `userId`, nombre de la empresa)
   - Crear tabla `users` con columna `role` ('admin', 'client') y `brandId` (Foreign Key)
   - Adaptar tabla `messages` con `brandId` obligatorio en lugar de `clientId`

2. **Middleware de Autenticación:**
   - Implementar Login (Session-based)
   - **Middleware de Seguridad:** Crear función que proteja las rutas:
     - Si `User.role === 'admin'`: Acceso total
     - Si `User.role === 'client'`: Forzar filtro `WHERE brandId = User.brandId` en todas las consultas

**Prueba de éxito Fase 1:**
- Crear 2 usuarios de marcas diferentes
- Loguearse con Usuario A y verificar que NO puede ver datos creados manualmente para la Marca B

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
2. ⏳ Implementar Fase 1 completa
3. ⏳ Testing de seguridad multi-tenant
4. ⏳ Fase 2: Integración con Metricool API
5. ⏳ Fase 3: Conectar frontend con backend real

---

## Notas de Desarrollo
- La tabla `clients` será renombrada a `brands` en Fase 1
- Los errores TypeScript en Inbox.tsx se resolverán después de adaptar el backend
- Importante: Un usuario de Metricool puede tener múltiples brands (blogIds)
