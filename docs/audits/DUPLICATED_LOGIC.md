# Análisis de Lógica Duplicada entre Componentes

**Fecha:** 20 Enero 2026  
**Tarea:** 1.1.5 del Plan de Mejoras Técnicas 2026

---

## 1. Resumen Ejecutivo

Se identificaron **4 categorías principales** de lógica duplicada o candidata a extracción:

| Categoría | Archivos Afectados | Prioridad | Acción Recomendada | Estado |
|-----------|--------------------|-----------|--------------------|--------|
| Draft Management (14 props) | 2 (Inbox, CommentThread) | 🔴 Alta | Extraer a `useDraftManagement` | ⬜ Pendiente |
| Platform Icons | 7 | 🟡 Media | Crear `PlatformIcon` component | ⬜ Pendiente |
| Formateo de Fechas | 7 | 🟢 Baja | Crear `formatTimeAgo` util | ⬜ Pendiente |
| Unread Tracking | 2 (Inbox, CommentThread) | 🟡 Media | Incluir en contexto de conversación | ⬜ Pendiente |

---

## 2. Categoría 1: Draft Management (🔴 Alta Prioridad)

### 2.1 Problema

La lógica de gestión de borradores está definida en `Inbox.tsx` pero se pasa como **14 props draft-related** a `CommentThread.tsx` (de un total de 25 props - ver INBOX_CONTRACTS.md).

### 2.2 Archivos Afectados

| Archivo | Rol | LOC de Lógica |
|---------|-----|---------------|
| `Inbox.tsx` | Definición de estados y handlers | ~200 líneas |
| `CommentThread.tsx` | Recibe props, las pasa a SingleMessage/DraftCard | ~50 líneas (boilerplate) |

### 2.3 Conteo Exacto de Props Pasadas a CommentThread

**Total: 25 props** (conteo directo del código L2006-2032)

**Props Draft-Related (14 props - candidatas a extracción):**

| Prop | Tipo | Línea Origen |
|------|------|--------------|
| `generatingDraftIds` | Estado (Set) | L208 |
| `editingDraftId` | Estado | L209 |
| `editingDraftText` | Estado | L210 |
| `setEditingDraftText` | Setter | L210 |
| `showRegenerateConfirm` | Estado | L211 |
| `setShowRegenerateConfirm` | Setter | L211 |
| `onGenerateDraft` | Callback | L954 handleGenerateDraft |
| `startEditingDraft` | Callback | L1175 |
| `cancelEditingDraft` | Callback | L1180 |
| `handleSaveDraftEdit` | Callback | L1062 |
| `handleDiscardDraft` | Callback | L1100 |
| `handleRegenerateDraft` | Callback | L1003 |
| `handleSendDraft` | Callback | L1130 |
| `bulkQueueStatusById` | Estado (Map) | useBulkDraftQueue |

**Props Selection/Bulk (3 props):**
- `selectionEnabled`, `selectedMessageIds`, `onToggleSelection`

**Props Unread (2 props):**
- `unreadMessageIds`, `onUnreadSeen`

**Props UI/Display (4 props):**
- `messages`, `platformStyles`, `highlightedMessageId`, `onStartReply`

**Componentes Pass-through (2 props):**
- `AudioPlayer`, `SentimentIndicator`

**Nota:** `localDraftOverrides` (L212) NO se pasa a CommentThread - se usa internamente en Inbox.tsx para merge con mensajes

### 2.4 Solución Propuesta

```typescript
// client/src/hooks/useDraftManagement.ts
export function useDraftManagement(conversationId: string, brandId: string) {
  // Estados UI de edición (4 estados)
  const [generatingDraftIds, setGeneratingDraftIds] = useState<Set<string>>(new Set());
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftText, setEditingDraftText] = useState('');
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState<string | null>(null);
  
  // Bulk queue (reutiliza hook existente)
  const bulkDraftQueue = useBulkDraftQueue(conversationId, brandId);
  
  // Callbacks de draft (7 callbacks)
  const generateDraft = useCallback(async (messageId: string) => { /* ... */ }, []);
  const regenerateDraft = useCallback(async (messageId: string, force?: boolean) => { /* ... */ }, []);
  const saveDraftEdit = useCallback(async (messageId: string) => { /* ... */ }, []);
  const discardDraft = useCallback(async (messageId: string) => { /* ... */ }, []);
  const sendDraft = useCallback(async (messageId: string, content: string) => { /* ... */ }, []);
  const startEditing = useCallback((messageId: string, content: string) => { /* ... */ }, []);
  const cancelEditing = useCallback(() => { /* ... */ }, []);
  
  return {
    // Mapeo exacto a las 14 props draft-related de CommentThread:
    generatingDraftIds,        // prop 1
    editingDraftId,            // prop 2
    editingDraftText,          // prop 3
    setEditingDraftText,       // prop 4 (setter expuesto)
    showRegenerateConfirm,     // prop 5
    setShowRegenerateConfirm,  // prop 6
    onGenerateDraft: generateDraft,     // prop 7
    startEditingDraft: startEditing,    // prop 8
    cancelEditingDraft: cancelEditing,  // prop 9
    handleSaveDraftEdit: saveDraftEdit, // prop 10
    handleDiscardDraft: discardDraft,   // prop 11
    handleRegenerateDraft: regenerateDraft, // prop 12
    handleSendDraft: sendDraft,         // prop 13
    bulkQueueStatusById: bulkDraftQueue.statusById, // prop 14
  };
}
```

**Beneficio:** Reducir exactamente 14 props draft-related en CommentThread → 0 props (hook consumido directamente por CommentThread)

**Props restantes después del refactor (11 props):**
- Selection: 3 props (`selectionEnabled`, `selectedMessageIds`, `onToggleSelection`)
- Unread: 2 props (`unreadMessageIds`, `onUnreadSeen`)
- UI/Display: 4 props (`messages`, `platformStyles`, `highlightedMessageId`, `onStartReply`)
- Components: 2 props (`AudioPlayer`, `SentimentIndicator`)

---

## 3. Categoría 2: Platform Icons (🟡 Media Prioridad)

### 3.1 Problema

Los iconos de plataforma (FaInstagram, FaFacebook, etc.) se importan y usan de forma repetitiva en 7 componentes diferentes.

### 3.2 Archivos Afectados

| Archivo | Uso |
|---------|-----|
| `Inbox.tsx` | Múltiples usos en UI |
| `ConversationCard.tsx` | PlatformIcon interno |
| `CRMContextPanel.tsx` | getPlatformIcon helper |
| `NotificationCenter.tsx` | Iconos en notificaciones |
| `AIAgentConfig.tsx` | Configuración de agentes |
| `BrandImportWizard.tsx` | Wizard de importación |
| `ReminderSettingsForm.tsx` | Settings |

### 3.3 Patrones Encontrados

**Patrón A (ConversationCard):**
```typescript
function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const icons: Record<Platform, React.ReactNode> = {
    instagram: <FaInstagram className={cn(className, "text-pink-600")} />,
    facebook: <FaFacebook className={cn(className, "text-blue-600")} />,
    // ...
  };
  return <>{icons[platform] || <MessageCircle className={className} />}</>;
}
```

**Patrón B (CRMContextPanel):**
```typescript
const getPlatformIcon = (platform: string) => {
  const iconClass = "h-4 w-4";
  switch (platformLower) {
    case 'instagram': return <FaInstagram className={cn(iconClass, "text-pink-500")} />;
    // ...
  }
};
```

### 3.4 Solución Propuesta

**Consideración especial:** Ya existe `GoogleBusinessIcon` en `client/src/components/GoogleBusinessIcon.tsx` que es un SVG custom (no de react-icons). Este componente debe mantenerse y ser referenciado desde el componente unificado.

```typescript
// client/src/components/ui/platform-icon.tsx
import { cn } from '@/lib/utils';
import type { Platform } from '@/lib/types';
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaTwitter, FaLinkedin, FaWhatsapp } from 'react-icons/fa';
import { GoogleBusinessIcon } from '../GoogleBusinessIcon'; // SVG custom existente
import { MessageCircle } from 'lucide-react';

interface PlatformIconProps {
  platform: Platform;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4', 
  lg: 'h-5 w-5',
};

const platformColors: Record<Platform, string> = {
  instagram: 'text-pink-500',
  facebook: 'text-blue-600',
  tiktok: 'text-gray-900',
  youtube: 'text-red-600',
  twitter: 'text-sky-500',
  linkedin: 'text-blue-700',
  whatsapp: 'text-green-500',
  'google-business': 'text-blue-500', // Mantiene color actual
};

export function PlatformIcon({ platform, size = 'md', className }: PlatformIconProps) {
  const sizeClass = sizeClasses[size];
  const colorClass = platformColors[platform] || 'text-gray-500';
  
  // Caso especial: GoogleBusinessIcon es SVG custom
  if (platform === 'google-business') {
    return <GoogleBusinessIcon className={cn(sizeClass, colorClass, className)} />;
  }
  
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    instagram: FaInstagram,
    facebook: FaFacebook,
    tiktok: FaTiktok,
    youtube: FaYoutube,
    twitter: FaTwitter,
    linkedin: FaLinkedin,
    whatsapp: FaWhatsapp,
  };
  
  const Icon = iconMap[platform] || MessageCircle;
  return <Icon className={cn(sizeClass, colorClass, className)} />;
}
```

**Beneficio:** Un solo componente centralizado, colores consistentes, mantiene GoogleBusinessIcon existente

---

## 4. Categoría 3: Formateo de Fechas (🟢 Baja Prioridad)

### 4.1 Problema

`formatDistanceToNow` de date-fns se importa y configura en 7+ archivos con la misma configuración.

### 4.2 Archivos Afectados

- `Inbox.tsx`
- `ConversationCard.tsx`
- `ConversationTimeline.tsx`
- `CRMContextPanel.tsx`
- `NotificationCenter.tsx`
- `ReminderSettingsForm.tsx`
- `AIAgentConfig.tsx`

### 4.3 Patrón Repetido

```typescript
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Uso:
formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: es })
```

### 4.4 Solución Propuesta

```typescript
// client/src/lib/date-utils.ts
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function shortDate(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: es });
}
```

**Beneficio:** Configuración de locale centralizada, fácil cambio de idioma

---

## 5. Categoría 4: Unread Message Tracking (🟡 Media Prioridad)

### 5.1 Problema

La lógica de tracking de mensajes no leídos es prop drilling entre 2 archivos:

| Archivo | Responsabilidad |
|---------|-----------------|
| `Inbox.tsx` | Estado `unreadMessageIds`, callback `handleUnreadSeen` (L219, L304) |
| `CommentThread.tsx` | Recibe props `unreadMessageIds` y `onUnreadSeen`, pasa a SingleMessage |

**Nota:** `NotificationCenter.tsx` tiene lógica de notificaciones no leídas que es semánticamente diferente (badges de notificación a nivel de sistema, no mensajes individuales). NO debe consolidarse con el tracking de mensajes.

### 5.2 Análisis

Este es otro caso de prop drilling similar a draft management. Las props `unreadMessageIds` y `onUnreadSeen` pasan de Inbox → CommentThread → SingleMessage.

### 5.3 Solución Propuesta

Incluir en el hook `useDraftManagement` o en un contexto de conversación:

```typescript
// Opción A: Extender useDraftManagement para incluir unread tracking
// Opción B: Crear contexto ConversationContext que incluya ambos

interface ConversationContextValue {
  // Draft management
  draftState: DraftManagementState;
  // Unread tracking
  unreadMessageIds: Set<string>;
  markAsSeen: (messageId: string) => void;
}
```

**Beneficio:** Reducir 2 props adicionales de CommentThread

---

## 6. Hooks Personalizados Existentes

Para referencia, estos hooks ya existen en el proyecto:

| Hook | Archivo | Propósito |
|------|---------|-----------|
| `useAuth` | `use-auth.ts` | Autenticación |
| `useBulkDraftQueue` | `useBulkDraftQueue.ts` | Cola de borradores bulk |
| `useReminderRules` | `useReminderRules.ts` | Reglas de recordatorios |
| `useToast` | `use-toast.ts` | Sistema de toasts |
| `useWebSocket` | `useWebSocket.ts` | Conexión WebSocket |

---

## 7. Priorización de Refactors

### Fase 1.2.1 (Próximo Sprint)

| Tarea | Impacto | Esfuerzo | Archivos Afectados |
|-------|---------|----------|-------------------|
| Crear `useDraftManagement` | 🔴 Alto | Medio | 2 (Inbox, CommentThread) |

### Fase 1.2.2 (Backlog)

| Tarea | Impacto | Esfuerzo | Archivos Afectados |
|-------|---------|----------|-------------------|
| Crear `PlatformIcon` | 🟡 Medio | Bajo | 7 |
| Crear `date-utils.ts` | 🟢 Bajo | Bajo | 7 |
| Crear `useUnreadTracking` | 🟡 Medio | Bajo | 2 (Inbox, CommentThread) |

---

## 8. Conclusión

La lógica duplicada más crítica es el **Draft Management**, que requiere 14 props draft-related para pasar de Inbox a CommentThread. Este debe ser el primer candidato para extracción a hook, reduciendo 25 props a 11.

Las otras categorías (Platform Icons, Date Formatting) son mejoras de calidad de código pero no bloquean el funcionamiento ni causan bugs.
