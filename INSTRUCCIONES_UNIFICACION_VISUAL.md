# Instrucciones para Unificación Visual de Mensajes Enviados desde Repliyo

## Contexto del Problema

Actualmente hay inconsistencia visual en cómo se muestran los mensajes enviados desde Repliyo (nuestra plataforma) vs mensajes sincronizados de las redes sociales. El usuario necesita identificar rápidamente qué mensajes fueron enviados desde nuestra app.

## Estado Actual del Código

### Campo `source` en la tabla `messages` (shared/schema.ts)
```typescript
source: text("source"), // Valores: 'repliyo' | 'repliyo_auto' | null
```
- `'repliyo'` = Mensaje enviado **manualmente** por el usuario desde Repliyo
- `'repliyo_auto'` = Mensaje enviado **automáticamente** por el agente IA
- `null` o vacío = Mensaje sincronizado de la red social (Instagram, Facebook, etc.)

### Implementación Parcial Existente (client/src/components/Inbox.tsx)

**Líneas 888-891:**
```typescript
// Check if message was sent from Repliyo using the source field
const isSentFromRepliyo = (msg as any).source === 'repliyo';
```

**Líneas 944-951 (Burbuja del mensaje):**
```typescript
<div className={cn(
    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative rounded-tl-none",
    isSentFromRepliyo 
      ? "bg-gray-800 text-white"    // DARK background for Repliyo messages
      : isOwner 
        ? "bg-gray-600 text-white"  // Lighter dark for owner (brand) messages
        : styles.bubble             // Platform-specific style for customer messages
)}>
```

**Líneas 955-963 (Indicador "Enviado desde Repliyo"):**
```typescript
{isSentFromRepliyo && (
  <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5 text-[10px] text-gray-400">
    <Send className="h-2.5 w-2.5" />
    <span>Enviado desde Repliyo</span>
  </div>
)}
```

**Líneas 907-911 (Avatar muestra logo de Repliyo):**
```typescript
<AvatarImage 
  src={isSentFromRepliyo ? repliyoLogo : (msg.authorAvatar || undefined)} 
  alt={isSentFromRepliyo ? "Repliyo" : msg.author} 
/>
```

## Problemas Identificados

### 1. Solo detecta `source === 'repliyo'`, NO incluye `'repliyo_auto'`
Los mensajes enviados por IA automática NO se muestran con el estilo de Repliyo.

**Corrección necesaria (línea 891):**
```typescript
const isSentFromRepliyo = (msg as any).source === 'repliyo' || (msg as any).source === 'repliyo_auto';
```

O mejor:
```typescript
const isSentFromRepliyo = ['repliyo', 'repliyo_auto'].includes((msg as any).source);
```

### 2. Diferenciar visualmente entre manual y automático
El usuario quiere saber si un mensaje lo envió él manualmente o si lo envió la IA.

**Propuesta:**
- `source === 'repliyo'`: Badge "Enviado desde Repliyo"
- `source === 'repliyo_auto'`: Badge "Respondido con IA" (con icono de robot/sparkle)

### 3. Aplicar en TODAS las vistas donde se muestran mensajes
Verificar que el estilo se aplique consistentemente en:
- Vista de DMs (conversaciones privadas)
- Vista de Comentarios públicos
- Vista de Reviews (si existe)
- Panel de detalle de mensaje
- Cualquier otra vista que muestre mensajes

## Estilos Recomendados (Mejores Prácticas de la Industria)

### Para mensajes enviados desde Repliyo (Manual)
```css
/* Burbuja */
background: #1f2937; /* gray-800 */
color: white;
border-radius: 18px 18px 4px 18px; /* Esquina bottom-left más pequeña */

/* Badge */
.badge-repliyo {
  background: rgba(99, 102, 241, 0.1); /* indigo-500/10 */
  color: #818cf8; /* indigo-400 */
  border: 1px dashed rgba(99, 102, 241, 0.3);
}
```

### Para mensajes enviados por IA (Auto)
```css
/* Burbuja - con gradiente sutil para distinguir */
background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); /* indigo to violet */
color: white;

/* O alternativa más sutil */
background: #1f2937;
border: 2px solid rgba(139, 92, 246, 0.4); /* violet border */

/* Badge con icono de robot */
.badge-ai {
  background: rgba(139, 92, 246, 0.15); /* violet-500/15 */
  color: #a78bfa; /* violet-400 */
  display: flex;
  align-items: center;
  gap: 4px;
}
/* Incluir icono: <Bot className="h-3 w-3" /> o <Sparkles /> */
```

## Archivos a Modificar

### 1. `client/src/components/Inbox.tsx`
- Línea ~891: Actualizar condición `isSentFromRepliyo` para incluir 'repliyo_auto'
- Líneas ~944-951: Mantener o mejorar el estilo de burbuja
- Líneas ~955-963: Diferenciar el badge según source
- Verificar que se aplique en todas las secciones de renderizado de mensajes

### 2. `client/src/components/ConversationCard.tsx` (si aplica)
- Verificar si muestra preview de mensajes y aplicar indicador visual

### 3. Posiblemente crear componentes reutilizables:
```typescript
// Propuesta de componente
function MessageSourceBadge({ source }: { source: string | null }) {
  if (!source || !['repliyo', 'repliyo_auto'].includes(source)) return null;
  
  const isAuto = source === 'repliyo_auto';
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full",
      isAuto 
        ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
        : "bg-indigo-500/10 text-indigo-400 border border-dashed border-indigo-500/30"
    )}>
      {isAuto ? <Bot className="h-3 w-3" /> : <Send className="h-2.5 w-2.5" />}
      <span>{isAuto ? "Respondido con IA" : "Enviado desde Repliyo"}</span>
    </div>
  );
}
```

## Datos de Prueba para Verificación

### Verificar con SQL:
```sql
-- Ver distribución de source en mensajes
SELECT source, COUNT(*) as total 
FROM messages 
WHERE source IS NOT NULL 
GROUP BY source;

-- Ver mensajes enviados desde Repliyo
SELECT id, platform, type, direction, source, content, created_at
FROM messages 
WHERE source IN ('repliyo', 'repliyo_auto')
ORDER BY created_at DESC
LIMIT 20;
```

### Tipos de mensajes a probar:
1. DM enviado manualmente desde Repliyo (Instagram)
2. DM auto-reply por IA (Instagram)
3. Comentario respondido manualmente (TikTok, YouTube)
4. Comentario auto-reply por IA
5. Mensajes sincronizados de red social (sin source)

## Estilos por Plataforma (getPlatformStyles)

El archivo `Inbox.tsx` ya tiene estilos específicos por plataforma (líneas 72-139).
El `replyBubble` de cada plataforma se puede usar como base para mensajes outbound de la marca, pero los mensajes de Repliyo deben tener un estilo ADICIONAL/DIFERENTE que los identifique.

**Plataformas soportadas:**
- WhatsApp: bg-[#25D366] (verde)
- Facebook: bg-[#1877F2] (azul)
- Instagram: gradient rosa/púrpura/naranja
- LinkedIn: bg-[#0A66C2] (azul LinkedIn)
- YouTube: bg-red-500 (rojo)
- TikTok: bg-[#121212] (negro)
- Google Business: bg-[#4285f4] (azul Google)

**Recomendación:** Los mensajes de Repliyo podrían mantener un estilo neutro (gray-800) que sea consistente en TODAS las plataformas, para que el usuario reconozca inmediatamente "esto lo envié yo desde la app".

## Criterios de Éxito

1. [ ] Mensajes con `source='repliyo'` muestran estilo distintivo con badge "Enviado desde Repliyo"
2. [ ] Mensajes con `source='repliyo_auto'` muestran estilo distintivo con badge "Respondido con IA" + icono de bot
3. [ ] Avatar muestra logo de Repliyo para ambos tipos
4. [ ] El estilo es consistente en DMs, Comentarios, y cualquier otra vista
5. [ ] Mensajes sincronizados de redes sociales (source=null) mantienen su estilo actual
6. [ ] Los mensajes outbound de la marca enviados desde la red social (no desde Repliyo) tienen un estilo diferente (más claro/sutil)

## Recursos

- Logo de Repliyo: `client/src/assets/repliyo-logo.jpg` (ya importado en Inbox.tsx línea 67)
- Iconos disponibles: lucide-react (Send, Bot, Sparkles, MessageCircle, etc.)
- UI Components: Radix UI (Badge, Avatar, etc.)

## Notas Adicionales

- El campo `direction` indica si el mensaje es inbound (recibido) u outbound (enviado)
- El campo `source` indica DESDE DÓNDE fue enviado (Repliyo, IA, o red social)
- Un mensaje puede ser `direction='outbound'` pero `source=null` si fue enviado desde Instagram directamente
- Los estilos deben respetar los existentes para mantener la consistencia de la UI
