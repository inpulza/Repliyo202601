# Sistema de Gestión de Inbox Social Media con Metricool

## Documentación

| Documento | Descripción |
|-----------|-------------|
| `DOCUMENTACION_COMPLETA.md` | Historial completo de desarrollo, fases, y arquitectura general |
| `DM_BUFFER_SYSTEM.md` | Sistema de Buffer de DMs para evitar respuestas múltiples de IA |

---

## Estado Actual (21 Dic 2025)

### Sistema de Buffer de DMs ✅ FUNCIONANDO
- **Problema:** Cuando usuario envía 4 DMs rápidos, la IA respondía 4 veces
- **Solución:** Buffer que acumula mensajes y responde UNA vez
- **Configuración:** Tabla `ai_agents` con campos:
  - `dm_batch_delay_seconds` - Tiempo de espera (ej: 45s para BO Trust)
  - `dm_reply_mode` - Modo: auto, batch, first_only

### Cooldown por Conversación ✅ IMPLEMENTADO
- **Problema anterior:** Cooldown bloqueaba TODA la marca (todas las redes y conversaciones)
- **Solución:** Cada conversación tiene su propio cooldown independiente
- **Configuración:** Tabla `ai_agents` campo `cooldown_per_conversation` (true = por conversación, false = global)
- **Datos:** Tabla `conversations` campo `last_ai_reply_at` guarda timestamp por conversación

**Ejemplo del comportamiento:**
```
Responde a Juan en Instagram → Solo Juan entra en cooldown
María en Facebook → Recibe respuesta normal ✅
Pedro en TikTok → Recibe respuesta normal ✅
```

### Variables Dinámicas de Personalidad ✅ IMPLEMENTADO
El LLM ahora ajusta su tono automáticamente según el contexto:

| Variable | Uso |
|----------|-----|
| `{{is_dm}}` | true/false - Si es DM o comentario |
| `{{time_since_last_interaction}}` | Minutos desde última respuesta |
| `{{relationship_status}}` | new / active / reengagement |

**Lógica condicional en `buildDynamicPersonalityRules()`:**
```
SI (DM + conversación activa < 60 min):
   ❌ PROHIBIDO saludar → Ve directo al grano
SI (DM + reengagement):
   ✅ Saludo breve permitido
SI (Comentario):
   📢 Modo breve con CTA
```

### Configuración por Canal Social ✅ NUEVO (21 Dic 2025)
Cada red social puede tener su propia configuración de buffer y cooldown:
- **platformSettings**: Campo JSON en tabla `ai_agents` con overrides por canal
- **Función `getEffectiveChannelSettings()`**: Merge de defaults + overrides
- **Validación de platform**: `normalizeProvider()` valida contra enum

**Ejemplo de platformSettings:**
```json
{
  "instagram": { "bufferDelaySeconds": 60, "cooldownSeconds": 10 },
  "tiktok": { "bufferDelaySeconds": 30 }
}
```

### Nueva Pestaña UI "Orquestación" ✅ IMPLEMENTADA
En Agent Settings, nueva pestaña con:
- Toggle "Cooldown por conversación"
- Slider "Buffer de DMs" (5-120s)
- Select "Modo de respuesta DMs"
- Collapsibles por red social para overrides personalizados

### Flujo Completo
```
Metricool → syncService → autoReplyService → dmBufferService → AI
                              ↑                      ↓
                     normalizeProvider()     getEffectiveChannelSettings()
                     valida platform         merge defaults + overrides
```

### Marca de Prueba
- **BO Trust** (@bo_trust_service)
- brand_id: `866600f9-4c0e-4d5e-b9d4-62fc9113426b`
- dm_batch_delay_seconds: 45

---

## Archivos Clave

| Archivo | Función |
|---------|---------|
| `server/services/llm/prompt-composer.ts` | `buildDynamicPersonalityRules()` - Reglas SI/SINO |
| `server/services/autoReplyService.ts` | Lee config BD, `normalizeProvider()`, `getEffectiveChannelSettings()` |
| `server/services/dmBufferService.ts` | Acumula mensajes, maneja timer |
| `server/services/syncService.ts` | Sincroniza DMs de Metricool |
| `shared/schema.ts` | Define columnas, schemas Zod, `getEffectiveChannelSettings()` |
| `client/src/components/AIAgentConfig.tsx` | UI de configuración con pestaña "Orquestación" |
