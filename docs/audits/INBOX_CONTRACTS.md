# Contratos de Props - Inbox.tsx → Subcomponentes

**Fecha:** 20 Enero 2026  
**Archivo fuente:** `client/src/components/Inbox.tsx`  
**Tarea:** 1.1.3 del Plan de Mejoras Técnicas 2026

---

## Resumen Ejecutivo

Inbox.tsx pasa props a **4 subcomponentes principales**. El análisis revela:
- **CommentThread** es el componente con más prop drilling (25 props)
- **CRMContextPanel** tiene interfaz limpia (8 props)
- **ConversationCard** y **BulkDraftActionBar** son simples (4-9 props)

### Indicadores de Prop Drilling

| Componente | Total Props | Props de Datos | Props Callbacks | Props Pass-through | Severidad | Estado Refactor |
|------------|-------------|----------------|-----------------|-------------------|-----------|-----------------|
| CommentThread | 25 | 11 | 12 | 2 (componentes) | 🔴 Alta | ⬜ Pendiente |
| BulkDraftActionBar | 9 | 6 | 3 | 0 | 🟢 Baja | ➖ No requiere |
| CRMContextPanel | 8 | 5 | 2 | 0 | 🟢 Baja | ➖ No requiere |
| ConversationCard | 4 | 2 | 1 | 0 | 🟢 Baja | ➖ No requiere |

---

## 1. CommentThread (🔴 Prop Drilling Crítico)

**Ubicación:** `client/src/components/CommentThread.tsx` (1,283 líneas)  
**Uso en Inbox:** Línea 2006-2032

### 1.1 Interface Completa

```typescript
interface CommentThreadProps {
  // === DATOS (11 props) ===
  messages: Message[];
  platformStyles: {
    userBubble: string;
    ownerBubble: string;
    aiBubble: string;
    manualBubble: string;
    draftCard: { bg: string; border: string; accent: string; iconBg: string };
    badge: string;
    commentBadge: string;
  };
  generatingDraftIds: Set<string>;
  editingDraftId: string | null;
  editingDraftText: string;
  showRegenerateConfirm: string | null;
  highlightedMessageId?: string | null;
  selectionEnabled?: boolean;
  selectedMessageIds?: Set<string>;
  bulkQueueStatusById?: Map<string, DraftStatus>;
  unreadMessageIds?: Set<string>;

  // === CALLBACKS (12 props) ===
  onStartReply: (message: Message) => void;
  onGenerateDraft: (messageId: string) => void;
  setEditingDraftText: (text: string) => void;
  startEditingDraft: (messageId: string, content: string) => void;
  cancelEditingDraft: () => void;
  handleSaveDraftEdit: (messageId: string) => void;
  handleDiscardDraft: (messageId: string) => void;
  handleRegenerateDraft: (messageId: string, force?: boolean) => void;
  handleSendDraft: (messageId: string, content: string) => void;
  setShowRegenerateConfirm: (id: string | null) => void;
  onToggleSelection?: (messageId: string) => void;
  onUnreadSeen?: (messageId: string) => void;

  // === COMPONENTES PASS-THROUGH (2 props) ===
  AudioPlayer: React.ComponentType<{ src: string; transcription?: string; isOutbound?: boolean }>;
  SentimentIndicator: React.ComponentType<{ sentiment: Sentiment }>;
}
```

### 1.2 Mapeo Completo de Props a Origen en Inbox.tsx

#### Props de Datos (11)

| Prop | Origen en Inbox.tsx | Tipo de Dependencia |
|------|---------------------|---------------------|
| `messages` | `filteredThreadMessages` (useMemo L792) | Derivado |
| `platformStyles` | `getPlatformStyles()` función helper | Calculado |
| `generatingDraftIds` | `useState` L208 | Estado directo |
| `editingDraftId` | `useState` L209 | Estado directo |
| `editingDraftText` | `useState` L210 | Estado directo |
| `showRegenerateConfirm` | `useState` L211 | Estado directo |
| `highlightedMessageId` | `useState` L461 | Estado directo |
| `selectionEnabled` | `useState` L215 | Estado directo |
| `selectedMessageIds` | `useState` L216 | Estado directo |
| `bulkQueueStatusById` | `useBulkDraftQueue().statusById` | Hook externo |
| `unreadMessageIds` | `useState` L219 | Estado directo |

#### Props Callbacks (12)

| Prop | Handler en Inbox.tsx | Línea Definición | Descripción |
|------|---------------------|------------------|-------------|
| `onStartReply` | `handleStartReply` | L869 | Inicia composición de reply manual |
| `onGenerateDraft` | `handleGenerateDraft` | L954 | Genera draft IA para un mensaje |
| `setEditingDraftText` | Setter de `useState` | L210 | Actualiza texto del draft en edición |
| `startEditingDraft` | `startEditingDraft` | L1175 | Abre editor de draft con contenido actual |
| `cancelEditingDraft` | `cancelEditingDraft` | L1180 | Cancela edición sin guardar |
| `handleSaveDraftEdit` | `handleSaveDraftEdit` | L1062 | Guarda cambios del draft editado |
| `handleDiscardDraft` | `handleDiscardDraft` | L1100 | Descarta draft y limpia estado |
| `handleRegenerateDraft` | `handleRegenerateDraft` | L1003 | Regenera draft IA (con confirmación) |
| `handleSendDraft` | `handleSendDraft` | L1130 | Envía draft a Metricool |
| `setShowRegenerateConfirm` | Setter de `useState` | L211 | Controla modal de confirmación |
| `onToggleSelection` | `handleToggleSelection` | L282 | Toggle selección para bulk actions |
| `onUnreadSeen` | `handleUnreadSeen` (useCallback) | L304 | Marca mensaje como visto después de 6s |

#### Props Componentes Pass-through (2)

| Prop | Componente | Definido en | Notas |
|------|------------|-------------|-------|
| `AudioPlayer` | `AudioPlayer` | Inbox.tsx L2398 | Componente interno, debería extraerse |
| `SentimentIndicator` | `SentimentIndicator` | Inbox.tsx L2530 | Componente interno, debería extraerse |

### 1.3 Análisis de Prop Drilling

**Problema:** 12 callbacks pasan de Inbox.tsx → CommentThread → componentes internos (SingleMessage, DraftCard, ThreadNode). Esto es un claro caso de prop drilling.

**Patrón detectado:**
```
Inbox.tsx → CommentThread → SingleMessage → DraftCard
   └── handleSaveDraftEdit ────────────────────────→
   └── handleDiscardDraft ─────────────────────────→
   └── handleRegenerateDraft ──────────────────────→
   └── handleSendDraft ────────────────────────────→
   └── startEditingDraft ──────────────────────────→
   └── cancelEditingDraft ─────────────────────────→
```

**Recomendación:** Extraer a hook `useDraftManagement` que proporcione:
- Estados: `generatingDraftIds`, `editingDraftId`, `editingDraftText`, `showRegenerateConfirm` (4)
- Callbacks: Todos los handlers de draft (8: generate, regenerate, save, discard, send, startEdit, cancelEdit, setShowConfirm)
- Reducción estimada: 12 props de callback → hook consumido directamente por CommentThread

---

## 2. BulkDraftActionBar (🟢 Interfaz Limpia)

**Ubicación:** `client/src/components/BulkDraftActionBar.tsx` (115 líneas)  
**Uso en Inbox:** Línea 2074-2084

### 2.1 Interface Completa

```typescript
interface BulkDraftActionBarProps {
  // === DATOS (6 props) ===
  selectedCount: number;
  isProcessing: boolean;
  progress: number;
  completedCount: number;
  totalCount: number;
  errorCount: number;

  // === CALLBACKS (3 props) ===
  onGenerate: () => void;
  onClearSelection: () => void;
  onCancel: () => void;
}
```

### 2.2 Mapeo de Props a Estado de Inbox.tsx

| Prop | Origen en Inbox.tsx | Tipo de Dependencia |
|------|---------------------|---------------------|
| `selectedCount` | `selectedMessageIds.size` | Derivado de estado |
| `isProcessing` | `bulkDraftQueue.isProcessing` | Hook externo |
| `progress` | `bulkDraftQueue.progress` | Hook externo |
| `completedCount` | `bulkDraftQueue.completedCount` | Hook externo |
| `totalCount` | `bulkDraftQueue.totalCount` | Hook externo |
| `errorCount` | `bulkDraftQueue.errorCount` | Hook externo |
| `onGenerate` | `handleBulkGenerate` | Handler local |
| `onClearSelection` | `handleClearSelection` | Handler local |
| `onCancel` | `bulkDraftQueue.cancel` | Hook externo |

### 2.3 Análisis

**Estado:** ✅ Interfaz bien diseñada
- 5 de 6 props de datos vienen directamente de `useBulkDraftQueue` hook
- Solo `selectedCount` es derivado de estado local
- No hay prop drilling significativo

---

## 3. CRMContextPanel (🟢 Interfaz Limpia)

**Ubicación:** `client/src/components/CRMContextPanel.tsx` (730 líneas)  
**Uso en Inbox:** Línea 2212-2223

### 3.1 Interface Completa

```typescript
interface CRMContextPanelProps {
  // === DATOS (5 props) ===
  crmContact?: CrmContact;
  crmChannels?: CrmContactChannel[];
  isLoadingContact?: boolean;
  conversation?: Conversation | null;
  brandId: string;

  // === UI STATE (1 prop) ===
  isOpen: boolean;

  // === CALLBACKS (2 props) ===
  onClose: () => void;
  onContactCreated?: () => void;
}
```

### 3.2 Mapeo de Props a Estado de Inbox.tsx

| Prop | Origen en Inbox.tsx | Tipo de Dependencia |
|------|---------------------|---------------------|
| `crmContact` | `crmContactData?.contact` | Query (useQuery) |
| `crmChannels` | `crmContactData?.channels` | Query (useQuery) |
| `isLoadingContact` | `isLoadingCrmContact` | Query loading state |
| `conversation` | `activeConversation` | NexusContext |
| `brandId` | `activeClientId \|\| ''` | NexusContext |
| `isOpen` | `isCRMOpen` (useState L457) | Estado local |
| `onClose` | `() => setIsCRMOpen(false)` | Setter inline |
| `onContactCreated` | Invalidate queries callback | Handler inline |

### 3.3 Análisis

**Estado:** ✅ Interfaz bien diseñada
- Datos vienen de queries, no de estado local
- Callbacks son simples (toggle state, invalidate queries)
- No hay prop drilling

---

## 4. ConversationCard (🟢 Interfaz Mínima)

**Ubicación:** `client/src/components/ConversationCard.tsx` (200 líneas)  
**Uso en Inbox:** Línea 1544-1549

### 4.1 Interface Completa

```typescript
interface ConversationCardProps {
  conversation: ConversationWithPost;
  isSelected: boolean;
  onClick: () => void;
  isHighlighted?: boolean;
}
```

### 4.2 Mapeo de Props a Estado de Inbox.tsx

| Prop | Origen en Inbox.tsx | Tipo de Dependencia |
|------|---------------------|---------------------|
| `conversation` | `conv` (iteración de `filteredConversations`) | Derivado |
| `isSelected` | `activeConversation?.id === conv.id` | Comparación |
| `onClick` | `() => setActiveConversation(conv)` | Setter inline |
| `isHighlighted` | `highlightedConversationId === conv.id` | Comparación |

### 4.3 Análisis

**Estado:** ✅ Interfaz óptima
- Solo 4 props, todas necesarias
- No hay prop drilling
- Componente stateless puro

---

## 5. Subcomponentes Internos de Inbox.tsx

Además de los componentes importados, Inbox.tsx define componentes internos:

### 5.1 MessageCard (Líneas 2230-2320)

```typescript
function MessageCard({ 
  message, 
  isSelected, 
  onClick, 
  onOpenCRM 
}: { 
  message: Message; 
  isSelected: boolean; 
  onClick: () => void; 
  onOpenCRM?: () => void;
})
```

**Nota:** Definido dentro de Inbox.tsx, no es importado.

### 5.2 AudioPlayer (Líneas 2398-2530)

```typescript
function AudioPlayer({ src, transcription, isOutbound }: { 
  src: string; 
  transcription?: string; 
  isOutbound?: boolean;
})
```

**Nota:** Definido dentro de Inbox.tsx, pasado como prop a CommentThread.

### 5.3 SentimentIndicator (Líneas 2530-2630)

```typescript
function SentimentIndicator({ sentiment }: { sentiment: Sentiment })
```

**Nota:** Definido dentro de Inbox.tsx, pasado como prop a CommentThread.

---

## 6. Resumen de Acciones de Refactor

### Prioridad ALTA: CommentThread

| Acción | Props Afectadas | Reducción |
|--------|-----------------|-----------|
| Crear `useDraftManagement` | 4 estados + 8 callbacks de draft | -12 props |
| Mover AudioPlayer a archivo separado | 1 prop componente | Limpieza |
| Mover SentimentIndicator a archivo separado | 1 prop componente | Limpieza |

**Resultado esperado:** CommentThread pasaría de 25 props a ~11 props (si usa hook internamente)

### Prioridad MEDIA: Inbox.tsx

| Acción | Beneficio |
|--------|-----------|
| Extraer MessageCard a archivo separado | Reduce LOC de Inbox.tsx |
| Extraer AudioPlayer a archivo separado | Reduce LOC, reutilizable |
| Extraer SentimentIndicator a archivo separado | Reduce LOC, reutilizable |

### Sin Cambios Necesarios

- **ConversationCard:** Interfaz óptima
- **BulkDraftActionBar:** Interfaz bien diseñada
- **CRMContextPanel:** Interfaz limpia

---

## 7. Diagrama de Flujo de Props

```
                              Inbox.tsx
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
  ConversationCard          CommentThread            CRMContextPanel
    (4 props)                 (25 props)                (8 props)
        │                         │                         │
        │                         │                         │
        │                    ┌────┴────┬──────────┐         │
        │                    │         │          │         │
        │                    ▼         ▼          ▼         │
        │              SingleMessage DraftCard ThreadNode   │
        │               (17 props)  (12 props) (recursivo)  │
        │                                                   │
        ▼                                                   ▼
  filteredConversations                              crmContactData
   (NexusContext +                                   (useQuery)
    local filters)

                    BulkDraftActionBar
                       (9 props)
                           │
                           ▼
                   useBulkDraftQueue
                   (hook externo)
```

---

## Notas Adicionales

- Los números de línea son aproximados y pueden cambiar con ediciones futuras
- Este documento debe actualizarse después de cada refactorización de Fase 1.2
- Ver `INBOX_HOOKS_AUDIT.md` para detalle de los estados que generan estas props
