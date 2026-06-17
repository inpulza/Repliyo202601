# WhatsApp AI Agent PRD + Sprint Plan

**Fecha:** 2026-06-17  
**Producto:** Repliyo WhatsApp agent via Zernio  
**Owner:** Jordan / Inpulza  
**Estado:** Draft operativo para ejecucion por PRs pequenos y revisables.

---

## 1. En cristiano

Ya tenemos la tuberia tecnica para leer WhatsApp desde Zernio y meterlo en el Inbox de Repliyo. El objetivo ahora es convertir eso en un producto real: que Repliyo pueda entender el historial, cualificar leads, ayudar con soporte, generar borradores buenos y, mas adelante, responder automaticamente con controles claros.

La prioridad no es "que conteste rapido" a cualquier costo. La prioridad es que no se equivoque de cliente, no responda fuera de contexto, no mande mensajes fuera de reglas de WhatsApp y que Jordan pueda apagarlo por marca, canal o conversacion.

---

## 2. Estado actual

### Ya hecho

- Zernio WhatsApp adapter lee conversaciones y mensajes reales.
- Observer read-only integrado al sync de Repliyo.
- Gating: `ZERNIO_OBSERVER_ENABLED=1`, blogId Inpulza `4074962`, provider `WHATSAPP` activo.
- Mensajes WhatsApp entran con `source='zernio_sync'`.
- Dedupe namespaced: `zernio:<scope>:<conversation>:<message>`.
- Read-only blindado: no auto-reply, no reminders, no endpoints de envio.
- Fix P1 integrado: `upsertMessage` idempotente sobre `metricool_id`, evitando que dos syncs simultaneos tumben conversaciones.
- Handoff live test: `docs/zernio/WHATSAPP_OBSERVER_SPRINT_HANDOFF.md`.

### No asumir como hecho

- Produccion puede estar apagada o parcialmente activada segun Replit. Antes de cualquier siguiente prueba live, verificar estado real de:
  - `ZERNIO_OBSERVER_ENABLED`
  - social account `WHATSAPP` de Inpulza con `is_active=true`
  - logs de primer sync
  - `0` mensajes enviados por Repliyo

---

## 3. Reglas externas que condicionan el producto

WhatsApp no es un canal libre igual que un chat interno. El diseno del agente debe respetar estas reglas:

- Cuando el usuario escribe al negocio, se abre una ventana de servicio de 24 horas. Dentro de esa ventana se pueden mandar mensajes de servicio/free-form.
- Fuera de esa ventana, los mensajes proactivos requieren plantillas aprobadas.
- Las categorias de mensajes relevantes son Marketing, Utility, Authentication y Service.
- WhatsApp cobra por mensaje entregado segun pais y categoria; los mensajes de servicio responden a consultas entrantes y la ventana se resetea con cada mensaje del usuario.
- Webhooks/recepcion de mensajes son el camino correcto a futuro para tiempo real, pero hoy estamos con observer/polling via Zernio.

Fuentes oficiales:

- WhatsApp Business Platform Pricing: https://whatsappbusiness.com/products/platform-pricing/
- Meta - Service messages / send messages: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
- Meta - Template fundamentals: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
- Meta - Webhooks overview: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview/
- Meta - Webhooks messages reference: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/

---

## 4. Vision del producto

Repliyo debe manejar WhatsApp como un canal de ventas y soporte con tres niveles:

1. **Observer:** trae mensajes, historial y contexto. No responde.
2. **Copilot:** genera borradores y recomendaciones. Humano aprueba.
3. **Agent:** responde automaticamente dentro de reglas, con apagado por marca/canal/conversacion y escalamiento humano.

El primer caso de uso es Inpulza, numero `+1 786-434-6163`, blogId `4074962`. La arquitectura debe quedar lista para multiples clientes, cada uno con su propio WhatsApp/account mapping, prompts, variables, reglas y permisos.

---

## 5. Casos de uso principales

### 5.1 Lead qualification

Objetivo: convertir conversaciones de WhatsApp en leads organizados, con contexto y siguiente accion clara.

El agente debe detectar:

- Servicio de interes.
- Ciudad/zona.
- Urgencia.
- Presupuesto aproximado si aplica.
- Tipo de negocio.
- Fuente/campana si viene de anuncio o landing.
- Nivel de intencion: frio, interesado, caliente, listo para llamada.
- Datos faltantes necesarios para avanzar.

Salida esperada:

- Borrador o respuesta enviada.
- Actualizacion de CRM/contacto.
- Tags o campos: `service_interest`, `lead_stage`, `urgency`, `location`, `source_campaign`, `next_step`.
- Escalamiento si pide precio complejo, contrato, reclamo, humano, o informacion sensible.

### 5.2 Customer support

Objetivo: responder dudas frecuentes sin inventar.

Debe poder:

- Contestar con informacion aprobada del brand.
- Pedir datos faltantes.
- Reconocer cuando no sabe.
- Pasar a humano.
- Evitar promesas comerciales no autorizadas.

### 5.3 Campaign handling

Objetivo: manejar trafico de Ads/campanas que escribe al WhatsApp.

Debe poder:

- Leer contexto de campana cuando exista.
- Mantener respuestas alineadas al offer/ad.
- No iniciar marketing outbound fuera de la ventana de 24h salvo con template aprobada.
- Registrar la campaña como fuente del lead.

### 5.4 Human handoff

Objetivo: que Jordan o el equipo puedan tomar control sin pelear con el bot.

Debe existir:

- Pausa por conversacion.
- Pausa por canal.
- Pausa por marca.
- Modo "draft only".
- Modo "auto-send permitido".
- Razones de bloqueo visibles.

---

## 6. Principios no negociables

- **No auto-send hasta que drafts tengan calidad validada.**
- **No enviar fuera de ventana de 24h sin template aprobada.**
- **No typing/read receipts por accidente.**
- **No mezclar clientes:** cada `blogId`/`accountId` debe estar aislado.
- **No mezclar canales:** WhatsApp Zernio debe identificarse por `source='zernio_sync'`, no solo por `platform='whatsapp'`.
- **Todo envio debe quedar auditado:** quien/que lo genero, prompt, modelo, mensaje origen, modo, canal, resultado.
- **Cada decision automatica debe tener rollback:** apagar global, apagar canal, apagar conversacion.
- **El LLM no debe inventar precios, disponibilidad, promesas legales, medicas o financieras.**

---

## 7. Variables de canal y marca

### Variables por marca

- Nombre de marca.
- Idiomas permitidos.
- Tono.
- Servicios.
- Areas atendidas.
- Horario.
- Link de llamada/booking.
- Politica de precios.
- Preguntas de cualificacion.
- Reglas de escalamiento.
- Frases prohibidas.
- Fuentes de conocimiento permitidas.

### Variables por canal WhatsApp

- `observerEnabled`
- `draftEnabled`
- `manualSendEnabled`
- `autoSendEnabled`
- `serviceWindowHours` default 24.
- `humanDelaySecondsMin/Max`
- `maxAutoMessagesPerConversation`
- `businessHoursOnly`
- `campaignMode`
- `templateSendAllowed`
- `readReceiptAllowed` default false.
- `typingIndicatorAllowed` default false.
- `allowMediaUnderstanding`

### Variables por conversacion

- `automationMode`: `off | observer | draft | manual_approval | auto`
- `pausedReason`
- `assignedTo`
- `leadStage`
- `qualificationStatus`
- `lastHumanMessageAt`
- `lastCustomerMessageAt`
- `serviceWindowExpiresAt`
- `sourceCampaign`
- `allowedNextActions`

---

## 8. Sprints propuestos

### Sprint 0 - Produccion observer controlado

**Objetivo:** confirmar que produccion lee WhatsApp sin enviar nada.

PRs: ninguno obligatorio si ya esta desplegado; es operacion controlada.

Checklist:

- `ZERNIO_OBSERVER_ENABLED=1` en produccion.
- `WHATSAPP` activo solo para Inpulza.
- Mandar mensajes de prueba personal -> trabajo.
- Confirmar entrada al Inbox.
- Confirmar `source='zernio_sync'`.
- Confirmar `0` mensajes con `source IN ('repliyo_auto','manual','reminder_service')` o `internal_origin` de envio.

Exit criteria:

- Primer ciclo live verificado.
- Sin envios.
- Sin duplicados.
- Sin errores de sync.

### Sprint 1 - Safety hardening antes de enviar

**Objetivo:** quitar acoplamientos peligrosos y preparar multi-cliente.

PRs sugeridos:

1. Cambiar guards read-only de `platform === 'whatsapp'` a `source === 'zernio_sync'` o helper equivalente.
2. Normalizar provider enum/settings para incluir `whatsapp` sin hacks.
3. Log/observabilidad de imported/skipped/deduped por brand/canal.

Exit criteria:

- Si algun dia existe WhatsApp via Metricool, no queda bloqueado por accidente.
- Zernio WhatsApp sigue read-only.
- Logs dicen cuantas conversaciones/mensajes entraron y cuantos se omitieron por dedupe.

### Sprint 2 - Historial y contexto

**Objetivo:** que el futuro LLM no responda mirando solo el ultimo mensaje.

PRs sugeridos:

1. Paginacion de conversaciones y mensajes en Zernio (`cursor`, `limit`, `hasMore`).
2. Decision de importar `active`, `archived` o ambos.
3. Resumen por conversacion WhatsApp usando `conversationUserSummaries` o una tabla dedicada.
4. Ventana de contexto: ultimos N mensajes + resumen persistido + datos CRM.

Exit criteria:

- Cada conversacion tiene contexto suficiente.
- No se exceden limites de tokens.
- El resumen se actualiza sin mezclar conversaciones.

### Sprint 3 - Controles de activacion

**Objetivo:** poder prender/apagar sin tocar DB ni secrets.

PRs sugeridos:

1. UI/API para activar provider `WHATSAPP` por marca.
2. Toggle por canal: observer/draft/manual/auto.
3. Toggle por conversacion: paused/manual only/auto allowed.
4. Banner visible en Inbox: "WhatsApp read-only", "draft mode", "auto mode".

Exit criteria:

- Jordan puede pausar una conversacion desde UI.
- Admin puede activar/desactivar WhatsApp para Inpulza sin SQL manual.
- El estado actual de automatizacion se ve antes de responder.

### Sprint 4 - LLM draft-only para WhatsApp

**Objetivo:** empezar a usar IA sin enviar automaticamente.

PRs sugeridos:

1. Prompt WhatsApp dedicado con reglas de cualificacion/soporte.
2. Variables de canal y marca disponibles en el prompt.
3. Draft generator para WhatsApp permitido, send bloqueado.
4. Audit log de drafts.
5. Evaluacion manual de 20-30 conversaciones reales.

Exit criteria:

- El agente genera borradores utiles.
- No envia nada.
- Jordan puede editar/aprobar manualmente desde UI cuando habilitemos envio.
- El prompt pregunta datos faltantes y escala cuando no sabe.

### Sprint 5 - Manual send y aprobacion humana

**Objetivo:** que Repliyo pueda enviar por WhatsApp, pero solo con click humano.

PRs sugeridos:

1. Implementar `replyToConversation` Zernio para WhatsApp.
2. Habilitar `send-draft` solo si:
   - source/canal permitido,
   - conversacion no pausada,
   - dentro de ventana de 24h o usando template aprobada,
   - usuario tiene permiso.
3. Guardar outbound en DB con `source='manual'`, `internal_origin='manual'`.
4. Confirmar delivery/status si Zernio lo expone.

Exit criteria:

- Jordan envia una respuesta manual desde Repliyo a su WhatsApp personal.
- DB registra outbound correctamente.
- No se usan typing/read receipts salvo configuracion explicita.

### Sprint 6 - Auto-send limitado

**Objetivo:** automatizar solo casos seguros.

PRs sugeridos:

1. Modo auto por conversacion/canal, default off.
2. Clasificador de intencion/riesgo antes de responder.
3. Reglas de auto-respuesta:
   - Solo dentro de 24h.
   - Max mensajes por conversacion.
   - Delay humano.
   - Escalamiento si hay duda.
4. Kill switch global.
5. Dashboard de mensajes enviados por IA.

Exit criteria:

- Auto-send probado solo con numero de Jordan.
- Logs/audit completos.
- Cero respuestas fuera de politica.

### Sprint 7 - Campanas y templates

**Objetivo:** soportar re-engagement y campanas sin violar reglas de WhatsApp.

PRs sugeridos:

1. Registro de templates aprobadas por marca/canal.
2. Seleccion de template para fuera de ventana.
3. Mapeo de campaign/ad source a prompt.
4. Consent/opt-out fields.
5. Reporting de conversion y conversaciones por campana.

Exit criteria:

- No se manda outbound proactivo sin template/consent.
- Campanas quedan trazadas a leads y conversaciones.

### Sprint 8 - Multi-cliente / Easy Connect

**Objetivo:** escalar de Inpulza a clientes.

PRs sugeridos:

1. UI de mappings `blogId -> Zernio accountId`.
2. Validacion de conexion por cliente.
3. Health check por cuenta.
4. Onboarding checklist por marca.
5. Roles/permisos.

Exit criteria:

- Se puede conectar un segundo numero sin tocar codigo.
- Cada cliente ve solo su WhatsApp.
- Fallos de una cuenta no afectan a otras.

---

## 9. Orden recomendado inmediato

1. Completar/verificar Sprint 0 en produccion con Inpulza.
2. PR Sprint 1.1: guards por `source='zernio_sync'`.
3. PR Sprint 1.3: observabilidad imported/skipped/deduped.
4. PR Sprint 2.1: paginacion de mensajes/conversaciones.
5. PR Sprint 3: controles UI/API de canal y conversacion.
6. PR Sprint 4: drafts WhatsApp con prompt y variables.

Este orden permite avanzar rapido sin saltar directamente a auto-send.

---

## 10. Preguntas para cerrar alcance con Jordan

### Cualificacion

- Que servicios debe vender/cualificar Inpulza por WhatsApp?
- Que datos minimos necesita antes de pasar a llamada?
- Que preguntas debe hacer el bot y en que orden?
- Que respuestas indican "lead caliente"?
- Que respuesta debe dar si preguntan precio?

### Soporte

- Que dudas frecuentes puede contestar?
- Que temas debe escalar siempre a Jordan?
- En que idioma debe responder si el cliente mezcla ingles/espanol?

### Campanas

- Que campanas estan activas y que oferta promete cada una?
- Que UTM/source/campaign data llega hoy a Repliyo?
- Hay templates aprobadas en Meta/Zernio?
- Queremos solo responder entrantes o tambien reactivar leads?

### Riesgo

- Que frases/promesas estan prohibidas?
- Que datos personales no debe pedir?
- Cuando debe parar y decir "te paso con un humano"?

---

## 11. Definicion de "listo" antes de auto-send real

No activar auto-send para clientes hasta que se cumpla todo:

- 50+ drafts revisados con tasa alta de aceptacion.
- Prompt por marca aprobado.
- Variables de canal configuradas.
- Toggle por conversacion funcionando.
- Kill switch probado.
- Auditoria de envios funcionando.
- Ventana de 24h/template guard implementado.
- Prueba live con numero de Jordan exitosa.

---

## 12. Links internos

- `docs/zernio/WHATSAPP_OBSERVER_SPRINT_HANDOFF.md`
- `docs/zernio/OBSERVER_INTEGRATION_PLAN.md`
- `docs/zernio/ZERNIO_API_REFERENCE.md`
- `.agents/memory/zernio-whatsapp-observer.md`

