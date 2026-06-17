# Zernio WhatsApp Observer — Brief de integración (read-only)

> Revisión de arquitectura del `syncService` para el PR del observer read-only.
> Autor: agente Replit. Fecha: 2026-06-17. Para: Codex.
> Scope estricto: sincronizar conversaciones WhatsApp de Zernio → Inbox de Repliyo, **solo blogId=4074962 (Inpulza)**, sin enviar, sin marcar leído, sin typing, sin webhooks, **sin auto-reply**. Metricool intacto.

## Mapa del sync actual (verificado en código)

- **Loop principal:** `SyncService.start()` → cada 2 min (`SYNC_INTERVAL_MS=120000`) llama a `syncAllBrands()`, que itera `storage.getActiveBrands()` con 2s de jitter entre marcas.
- **Por marca:** `syncBrand(brandId, brandName, token, blogId, userId)` (`server/services/syncService.ts:143`):
  1. `storage.getActiveProviders(brandId)`.
  2. **Hardcodea Metricool**: `createDefaultChannelAdapter({credentials})` (`:161`) → `getAllInboxData(blogId, activeProviders)` (`:168`).
  3. Loop inline sobre `inboxData.conversations` (DMs, `:177`) y luego `inboxData.comments` (~`:507`), persistiendo con `storage.upsertConversation` / `storage.upsertMessage`, todo scoped por `brandId`.
- **Registry** (`server/services/channels/registry.ts`): ya tiene `createChannelAdapter(ZERNIO_WHATSAPP_PROVIDER_ID, { zernioWhatsApp })`. El adapter Zernio ya mapea a los tipos compartidos (`mapConversation`/`mapMessage`) y `getAllInboxData` solo hace GET conversations + GET messages (read-only).
- **Resolución de marca:** `storage.getBrandByBlogId(blogId)`; blogId=4074962 = Inpulza.

## ⚠️ El riesgo nº1: el loop de persistencia dispara side-effects

Dentro del loop de DMs de `syncBrand`, por cada **nuevo entrante** se ejecuta:
- `:499` `this.triggerAutoReply(brandId, savedMessage, conversationRecord)` → **enviaría respuesta automática**.
- `:424` contact enrichment (interno, seguro).
- `:490` `websocketService.notifyNewMessage(...)` (interno/UI, seguro).
- En comments: `:719` `triggerAutoReply` y `:727` `triggerAutoPrivateReply` (Facebook).

**Conclusión:** NO se puede reutilizar el loop tal cual para Zernio. Hay que reutilizar la **persistencia** pero **saltar** `triggerAutoReply` (y cualquier private reply) para el feed observer.

## Costura recomendada (menos invasiva, Metricool intacto)

1. **Extraer** el cuerpo del loop de conversaciones DM (`:177`–~`:505`) a un método privado reutilizable, p.ej.:
   ```
   private async persistConversations(
     brandId, brandName, conversations,
     opts: { enableAutoReply: boolean; source: string }
   ): Promise<{ savedCount, newInboundCount, ... }>
   ```
   - Metricool lo llama con `{ enableAutoReply: true, source: 'metricool_sync' }` → **comportamiento byte-idéntico** al actual (es un puro `extract method`).
   - El observer Zernio lo llama con `{ enableAutoReply: false, source: 'zernio_sync' }`.
   - El `triggerAutoReply` (y `triggerAutoPrivateReply`) quedan **dentro de un `if (opts.enableAutoReply)`**.
   - WebSocket notify y enrichment SÍ se mantienen (son internos, no envían nada al cliente).

2. **Feed Zernio gateado**, después del bloque Metricool en `syncBrand`:
   ```
   if (ZERNIO_OBSERVER_ENABLED && blogId === '4074962') {
     const zernio = createChannelAdapter(ZERNIO_WHATSAPP_PROVIDER_ID, { zernioWhatsApp: {...} });
     const zernioInbox = await zernio.getAllInboxData(blogId, ['whatsapp']);
     await this.persistConversations(brandId, brandName, zernioInbox.conversations,
       { enableAutoReply: false, source: 'zernio_sync' });
   }
   ```
   - **No tocar** la llamada `createDefaultChannelAdapter` de Metricool.
   - Solo conversaciones (DMs); WhatsApp no tiene `comments`.

## Requisitos de corrección OBLIGATORIOS

1. **Dedupe (crítico):** `upsertMessage` solo deduplica si `insertMessage.metricoolId` está seteado (`storage.ts:1017`); sin él → `createMessage` directo = **duplicados cada 2 min**. Además `messageExistsGlobally(metricoolId)` (`:984`) decide "nuevo entrante". → Setear `metricoolId` con el id estable de Zernio **namespaced**, p.ej. `zernio:<wamid>` (el `id` que ya produce `mapMessage`, adapter `:269`). El namespace evita colisión con ids reales de Metricool.
2. **`source: 'zernio_sync'`** (NO `metricool_sync`): la lógica de reconciliación (`storage.ts:1065`) solo actúa sobre `metricool_sync`/outbound; un source distinto la mantiene fuera.
3. **`platform: 'whatsapp'`**, `direction` desde `isOutboundMessage` (ya en el adapter).
4. **Gating estricto:** solo blogId=4074962, detrás de flag de entorno (`ZERNIO_OBSERVER_ENABLED`). Ninguna otra marca.
5. **Read-only de verdad:** solo `getAllInboxData`. NO llamar `replyToConversation`, `sendTypingIndicator`, read receipts, webhooks ni private replies.
6. Ship con smoke (adapter + un smoke del nuevo feed) + build verde.

## Qué NO hacer en este PR
- No tocar Metricool (solo extraer, no modificar su comportamiento).
- No webhooks, no auto-send, no manual-approval UI (eso es fase posterior).
- No habilitar el flag por defecto en otras marcas.
