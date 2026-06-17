# WhatsApp (Zernio) Observer — Handoff para CodeX

**Fecha:** 2026-06-17
**Autor:** Replit Agent (sesión supervisada con el dueño del proyecto)
**Estado:** Observer de solo-lectura **verificado en vivo** en desarrollo. Pendiente decidir producción y varios fixes.
**Brand de prueba:** Inpulza — `brand_id = 72307812-2edb-43a6-884b-e19f1a9cf200`, `metricoolBlogId = 4074962`.

---

## 1. Objetivo de la sesión

Activar de forma **supervisada y en vivo** el observer de WhatsApp (canal Zernio) que el PR previo dejó cableado pero **dormido**, usando el brand Inpulza como conejillo de indias. Requisito absoluto: **solo lectura** — el sistema importa las conversaciones de WhatsApp al Inbox de Repliyo pero **no envía nada** (ni auto-replies, ni recordatorios, ni respuestas manuales).

---

## 2. Cómo está construido el observer (estado actual del código)

### 2.1 Flujo
El observer está enganchado al ciclo de sync existente (`syncService.syncBrand`):

```
syncBrand(brand)
  ├─ metricoolInboxData  = channelAdapter.getAllInboxData(...)        // Metricool normal
  ├─ whatsappInboxData   = getWhatsAppInboxData(brand, blogId, providers)  // Zernio WhatsApp
  ├─ inboxData = mergeInboxData(metricool, whatsapp)
  └─ for conv in inboxData.conversations:  upsertConversation + upsertMessage
```

El adaptador es `server/services/channels/zernioWhatsAppAdapter.ts`. Reusa `upsertConversation` / `upsertMessage` de `storage.ts`, por lo que las conversaciones de WhatsApp aparecen en el Inbox como cualquier otra.

### 2.2 Gating — son **3 candados**, no 2
Para que `getWhatsAppInboxData()` devuelva datos deben cumplirse **las tres**:

1. **Env:** `ZERNIO_OBSERVER_ENABLED=1`.
2. **BlogId match:** `brand.metricoolBlogId === '4074962'` (Inpulza). Override con `ZERNIO_WHATSAPP_BLOG_ID`.
3. **Provider activo:** el brand debe tener una fila en `social_accounts` con `provider='WHATSAPP'` e `is_active=true`. `getActiveProviders()` solo devuelve providers activos; si WhatsApp no está, `getWhatsAppInboxData` **devuelve vacío en silencio** (sin logs ni error).

> ⚠️ El candado #3 fue el que nos frenó al inicio: el flag estaba puesto pero "no pasaba nada" porque WhatsApp no estaba como provider activo.

### 2.3 Activación en 2 pasos (por diseño)
El endpoint `POST /api/brands/:id/social-accounts/refresh` detecta WhatsApp vía Zernio (solo cuando flag + blogId coinciden) pero lo inserta con **`isActive=false`**. Hace falta un **segundo paso manual** (encenderlo en UI o `UPDATE social_accounts SET is_active=true`). Hasta entonces el observer sigue dormido aunque el flag esté en 1.

### 2.4 Garantía de solo-lectura (4 rutas de envío bloqueadas)
La no-emisión se fuerza en 4 puntos, todos chequeando `platform === 'whatsapp'`:
- **auto-reply** → se omite (log: `auto-reply disabled for read-only mode`).
- **recordatorios / follow-ups** → se omiten / cancelan.
- **2 endpoints de respuesta manual** → devuelven `400` para WhatsApp.

### 2.5 Dedupe
Los mensajes de WhatsApp usan:
- `metricoolId = zernio:<scope>:<convId>:<msgId>` (namespaced — nunca colisiona con IDs reales de Metricool).
- `source = 'zernio_sync'` (los mantiene fuera del path de reconciliación de Metricool).

`upsertMessage` solo deduplica cuando `metricoolId` está presente.

---

## 3. Qué hicimos en esta sesión

1. **Activé el flag SOLO en desarrollo** (no toqué producción): `ZERNIO_OBSERVER_ENABLED=1`.
2. **Activé WhatsApp como provider de Inpulza:** inserté la fila `social_accounts (provider='WHATSAPP', is_active=true)` para el brand.
3. **Forcé un sync** porque el ciclo automático casi nunca llega a Inpulza (ver §5).
4. **Prueba en vivo PASÓ:** logs mostraron `imported … WhatsApp conversations from Zernio` + `auto-reply disabled for read-only mode`.
5. **Puesta al día (catch-up):** un primer sync manual chocó con el ciclo automático y se perdieron 3 conversaciones (ver §4.1). Hice una importación limpia aislada solo a WhatsApp y entraron las 6.

### 3.1 Resultado final verificado en DB (Inpulza)
| Conversación | Teléfono | En Inbox |
|---|---|---|
| Jordan | 34663598814 | ✅ |
| Tecnoclick | 573004580185 | ✅ |
| EstateDocPrep.com | 18052906044 | ✅ |
| Jonathan Acuña Doctor AI | 13234238560 | ✅ |
| Talena | 17864619805 | ✅ |
| 14436310058 | 14436310058 | ✅ |

- **15** mensajes inbound + **38** outbound, **todos `source='zernio_sync'`**.
- **0** mensajes generados o enviados por Repliyo (verificado: `source IN ('repliyo_auto','manual')` o `internal_origin IN ('ai','manual','meta_private_reply')` = 0).
- Zernio reporta **6 conversaciones activas, 0 archivadas** → el adaptador las trae todas.

---

## 4. Hallazgos / bugs descubiertos

### 4.1 🐛 (P1) Race condition en `upsertMessage` revierte conversaciones enteras
Cuando **dos** procesos sincronizan el **mismo brand a la vez** (p.ej. el ciclo automático + un sync manual), ambos insertan los mismos mensajes y chocan con la constraint `messages_metricool_id_unique`. El error de clave duplicada **revierte la transacción**, y se pierde **la conversación completa**, no solo el mensaje duplicado. Así perdimos 3 de 6 conversaciones en el primer intento.

**Fix propuesto:** hacer `upsertMessage` idempotente de verdad con `onConflictDoNothing` (o `onConflictDoUpdate`) sobre `metricool_id`, en vez de dejar que la constraint lance y reviente la transacción que contiene el upsert de la conversación. También conviene separar el upsert de conversación del de mensaje para que un mensaje fallido no tumbe la conversación.

### 4.2 ⚙️ (P2) El ciclo automático casi nunca llega a Inpulza en desarrollo
El sync procesa los ~10 brands **en secuencia**. El brand `1e13d4a8` (solidaridadsinfronteras) tiene un **volumen enorme** de comentarios y se come varios minutos, y el **dev server se reinicia solo** (quirk de Vite: un `customLogger.error` llama `process.exit(1)`), reseteando el ciclo desde el brand 1 antes de alcanzar a Inpulza. En la práctica, en desarrollo los mensajes nuevos de WhatsApp pueden tardar o requerir un empujón.

**Fix propuesto:** scheduling por-brand independiente / con prioridad, o desacoplar los brands pesados; e investigar el reinicio del dev server por Vite.

### 4.3 🔒 (P2) Los guards de solo-lectura dependen de `platform === 'whatsapp'`, no del `source`
Hoy es correcto porque ningún brand usa WhatsApp vía Metricool (WhatsApp Business). Pero si algún día se conecta WhatsApp por Metricool, **esos mensajes también serían tratados como solo-lectura** y bloqueados silenciosamente del envío.

**Fix propuesto:** cuando exista WhatsApp por Metricool, cambiar los guards a chequear `source` (`zernio_sync`) en vez del nombre de plataforma.

### 4.4 📥 (P3) El adaptador solo trae `status='active'`
`getOpenConversations()` pide `status: "active"` con `limit: 50`, `sortOrder: "desc"`. Las conversaciones **archivadas** en Zernio quedan fuera. Hoy hay 0 archivadas, así que no afecta, pero conviene documentarlo y decidir si se quieren importar archivadas y/o paginar > 50.

### 4.5 🐢 (P3) `syncBrandById` (full sync) es lento para brands pesados
Un full sync de ciertos brands supera los 120s. Relevante para cualquier herramienta de operación/manual que dispare syncs por brand (timeouts).

### 4.6 🧰 (menor) Activación poco descubrible
El flujo de 2 pasos (§2.3) no tiene UI clara para "encender" WhatsApp tras el refresh. Hoy requiere intervención en DB o conocer el toggle exacto.

---

## 5. Estado actual (dev vs producción)

| | Desarrollo | Producción (app publicada) |
|---|---|---|
| `ZERNIO_OBSERVER_ENABLED` | **=1 (activo)** | **no seteado** |
| WhatsApp provider activo (Inpulza) | ✅ sí | (depende de su DB de prod) |
| ¿Importa WhatsApp automáticamente? | Sí, pero irregular (§4.2) | **No** — flag apagado |

**Conclusión operativa:** para operación normal, los mensajes nuevos se importan **solos** (no hace falta re-sync manual). El re-sync manual de hoy fue una puesta al día única por el bug §4.1. **En la app publicada todavía NO sincroniza WhatsApp** hasta encender el flag en producción (requiere aprobación del dueño — es un entorno real).

---

## 6. Propuesta de próximo sprint (priorizada)

**P1 — Robustez de datos**
- [ ] `upsertMessage`: `onConflictDoNothing` sobre `metricool_id` + separar upsert de conversación/mensaje, para que un duplicado nunca reviente una conversación (§4.1).
- [ ] (Decisión de negocio) Encender el observer en **producción** si se quiere WhatsApp en vivo en la app publicada (§5).

**P2 — Confiabilidad del scheduler**
- [ ] Scheduling por-brand independiente / con prioridad, o desacoplar brands pesados (SSF) para que Inpulza (y futuros brands) se sincronicen de forma predecible (§4.2).
- [ ] Investigar/mitigar el reinicio del dev server por Vite (`process.exit(1)`) que resetea el ciclo.
- [ ] Migrar los guards de solo-lectura a chequear `source` en vez de `platform` (§4.3).

**P3 — Cobertura y operación**
- [ ] Adaptador: paginación > 50 y decisión sobre conversaciones archivadas (§4.4).
- [ ] UI para encender/apagar el provider WhatsApp tras el refresh (§4.6).
- [ ] Observabilidad: contar importadas vs. omitidas por dedupe en cada ciclo.

---

## 7. Referencias de código

- `server/services/syncService.ts` — `syncBrand` (merge + loop de upsert, rama WhatsApp ~L323-441), `getWhatsAppInboxData` (~L930), `syncBrandById` (~L1357).
- `server/services/channels/zernioWhatsAppAdapter.ts` — adaptador Zernio (solo `status=active`, `limit=50`).
- `server/routes.ts` — `POST /api/brands/:id/social-accounts/refresh` (inserta WhatsApp `isActive=false`), `POST /api/sync-brand/:brandId` (requiere auth), bloqueos `400` de respuesta manual para WhatsApp.
- `server/storage.ts` — `getActiveProviders` (solo `is_active=true`), `upsertSocialAccount`, `upsertMessage`, `messageExistsGlobally`.
- `docs/zernio/OBSERVER_INTEGRATION_PLAN.md`, `docs/zernio/ZERNIO_API_REFERENCE.md` — contexto previo.

---

## 8. Notas de entorno
- Secrets en uso: `ZERNIO_API_TOKEN`, `ZERNIO_WHATSAPP_ACCOUNT_ID` (+ default `ZERNIO_WHATSAPP_BLOG_ID=4074962`).
- API Zernio: parámetros camelCase (`accountId`, `sortOrder`), `status=active|archived`.
- El flag `ZERNIO_OBSERVER_ENABLED` está **dev-only**; no tocar producción sin aprobación.
