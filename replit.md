# Sistema de Gestión de Inbox Social Media con Metricool

## Documentación

| Documento | Descripción |
|-----------|-------------|
| `DOCUMENTACION_COMPLETA.md` | Historial completo de desarrollo, fases, y arquitectura general |
| `DM_BUFFER_SYSTEM.md` | Sistema de Buffer de DMs para evitar respuestas múltiples de IA |

---

## Estado Actual (21 Dic 2025)

### Sistema de Buffer de DMs
- **Problema:** Cuando usuario envía 4 DMs rápidos, la IA respondía 4 veces
- **Solución:** Buffer que acumula mensajes y responde UNA vez
- **Configuración:** Tabla `ai_agents` con campos:
  - `dm_batch_delay_seconds` - Tiempo de espera (ej: 45s para BO Trust)
  - `dm_reply_mode` - Modo: auto, batch, first_only
  - `cooldown_per_conversation` - Cooldown entre respuestas

### Flujo del Buffer
```
Metricool → syncService → autoReplyService → dmBufferService → AI → Respuesta
                              ↑
                     Lee config de BD:
                     agent.dmBatchDelaySeconds
```

### Marca de Prueba
- **BO Trust** (@bo_trust_service)
- brand_id: `866600f9-4c0e-4d5e-b9d4-62fc9113426b`
- dm_batch_delay_seconds: 45

---

## Archivos Clave

| Archivo | Función |
|---------|---------|
| `server/services/autoReplyService.ts` | Lee config BD, decide buffer delay |
| `server/services/dmBufferService.ts` | Acumula mensajes, maneja timer |
| `server/services/syncService.ts` | Sincroniza DMs de Metricool |
| `shared/schema.ts` | Define columnas en tabla aiAgents |
