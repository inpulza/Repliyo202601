import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useBulkDraftQueue, type DraftStatus } from '@/hooks/useBulkDraftQueue';

interface DraftOverride {
  aiSuggestedReply: string | null;
  aiReplyStatus: string;
  draftWasEdited: boolean;
}

interface BulkQueueResults {
  successCount: number;
  errorCount: number;
  errors: string[];
}

interface UseDraftManagementOptions {
  brandId: string;
  conversationId?: string;
  onRefreshFeed?: () => void | Promise<void>;
  onBulkComplete?: (results: BulkQueueResults) => void;
  onBulkMessageComplete?: (messageId: string, success: boolean) => void;
}

interface UseDraftManagementResult {
  generatingDraftIds: Set<string>;
  editingDraftId: string | null;
  editingDraftText: string;
  showRegenerateConfirm: string | null;
  localDraftOverrides: Map<string, DraftOverride>;
  bulkQueueStatusById: Map<string, DraftStatus>;
  bulkQueue: {
    isProcessing: boolean;
    progress: number;
    completedCount: number;
    totalCount: number;
    errorCount: number;
    enqueueMany: (messageIds: string[]) => void;
    cancel: () => void;
  };
  handleGenerateDraft: (messageId: string) => Promise<void>;
  handleRegenerateDraft: (messageId: string, confirmOverwrite?: boolean) => Promise<void>;
  handleSaveDraftEdit: (messageId: string) => Promise<void>;
  handleDiscardDraft: (messageId: string) => Promise<void>;
  handleSendDraft: (messageId: string, draft: string) => Promise<void>;
  startEditingDraft: (messageId: string, currentDraft: string) => void;
  cancelEditingDraft: () => void;
  setEditingDraftText: (text: string) => void;
  setShowRegenerateConfirm: (id: string | null) => void;
  getMessageWithOverrides: <T extends { id: string }>(msg: T) => T & { aiSuggestedReply?: string | null; aiReplyStatus?: string | null; draftWasEdited?: boolean };
  clearOverrides: () => void;
}

export function useDraftManagement({
  brandId,
  conversationId,
  onRefreshFeed,
  onBulkComplete,
  onBulkMessageComplete,
}: UseDraftManagementOptions): UseDraftManagementResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [generatingDraftIds, setGeneratingDraftIds] = useState<Set<string>>(new Set());
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftText, setEditingDraftText] = useState('');
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState<string | null>(null);
  const [localDraftOverrides, setLocalDraftOverrides] = useState<Map<string, DraftOverride>>(new Map());

  const bulkDraftQueue = useBulkDraftQueue({
    brandId,
    maxConcurrency: 3,
    onComplete: (results) => {
      queryClient.invalidateQueries({ queryKey: ['conversationMessages'] });
      onBulkComplete?.(results);
    },
    onMessageComplete: onBulkMessageComplete,
  });

  const invalidateConversationMessages = useCallback(() => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: ['conversationMessages', conversationId] });
    }
  }, [queryClient, conversationId]);

  const refreshAndClearOverride = useCallback(async (messageId: string) => {
    if (onRefreshFeed) {
      await onRefreshFeed();
    }
    setLocalDraftOverrides(prev => {
      const next = new Map(prev);
      next.delete(messageId);
      return next;
    });
    invalidateConversationMessages();
  }, [onRefreshFeed, invalidateConversationMessages]);

  const handleGenerateDraft = useCallback(async (messageId: string) => {
    if (!brandId || generatingDraftIds.has(messageId)) return;

    setGeneratingDraftIds(prev => new Set(prev).add(messageId));
    try {
      const result = await api.aiAgent.generateDraft(brandId, messageId);
      if (result.success && result.draft) {
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.set(messageId, {
            aiSuggestedReply: result.draft,
            aiReplyStatus: 'drafted',
            draftWasEdited: false,
          });
          return next;
        });

        toast({
          title: "Borrador generado",
          description: `${result.characterCount} caracteres`,
        });

        await refreshAndClearOverride(messageId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el borrador",
        variant: "destructive",
      });
    } finally {
      setGeneratingDraftIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }, [brandId, generatingDraftIds, toast, refreshAndClearOverride]);

  const handleRegenerateDraft = useCallback(async (messageId: string, confirmOverwrite: boolean = false) => {
    if (!brandId) return;

    setGeneratingDraftIds(prev => new Set(prev).add(messageId));
    try {
      const result = await api.aiAgent.regenerateDraft(brandId, messageId, confirmOverwrite);

      if (result.requiresConfirmation) {
        setShowRegenerateConfirm(messageId);
        setGeneratingDraftIds(prev => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
        return;
      }

      setShowRegenerateConfirm(null);
      if (result.success && result.draft) {
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.set(messageId, {
            aiSuggestedReply: result.draft,
            aiReplyStatus: 'drafted',
            draftWasEdited: false,
          });
          return next;
        });

        toast({ title: "Borrador regenerado" });

        await refreshAndClearOverride(messageId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo regenerar el borrador",
        variant: "destructive",
      });
    } finally {
      setGeneratingDraftIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }, [brandId, toast, refreshAndClearOverride]);

  const handleSaveDraftEdit = useCallback(async (messageId: string) => {
    if (!brandId || !editingDraftText.trim()) return;

    try {
      await api.aiAgent.updateDraft(brandId, messageId, editingDraftText.trim());

      setLocalDraftOverrides(prev => {
        const next = new Map(prev);
        next.set(messageId, {
          aiSuggestedReply: editingDraftText.trim(),
          aiReplyStatus: 'edited',
          draftWasEdited: true,
        });
        return next;
      });

      setEditingDraftId(null);
      setEditingDraftText('');
      toast({ title: "Borrador guardado" });

      await refreshAndClearOverride(messageId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el borrador",
        variant: "destructive",
      });
    }
  }, [brandId, editingDraftText, toast, refreshAndClearOverride]);

  const handleDiscardDraft = useCallback(async (messageId: string) => {
    if (!brandId) return;

    try {
      await api.aiAgent.discardDraft(brandId, messageId);

      setLocalDraftOverrides(prev => {
        const next = new Map(prev);
        next.set(messageId, {
          aiSuggestedReply: '',
          aiReplyStatus: 'none',
          draftWasEdited: false,
        });
        return next;
      });

      toast({ title: "Borrador descartado" });

      await refreshAndClearOverride(messageId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo descartar el borrador",
        variant: "destructive",
      });
    }
  }, [brandId, toast, refreshAndClearOverride]);

  const handleSendDraft = useCallback(async (messageId: string, draft: string) => {
    if (!brandId || !draft.trim()) return;

    try {
      const result = await api.aiAgent.sendDraft(brandId, messageId);

      if (result.success) {
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.set(messageId, {
            aiSuggestedReply: null,
            aiReplyStatus: 'sent',
            draftWasEdited: false,
          });
          return next;
        });

        toast({ title: "Respuesta enviada", description: "La respuesta se publicó en la red social" });

        await refreshAndClearOverride(messageId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la respuesta",
        variant: "destructive",
      });
    }
  }, [brandId, toast, refreshAndClearOverride]);

  const startEditingDraft = useCallback((messageId: string, currentDraft: string) => {
    setEditingDraftId(messageId);
    setEditingDraftText(currentDraft);
  }, []);

  const cancelEditingDraft = useCallback(() => {
    setEditingDraftId(null);
    setEditingDraftText('');
  }, []);

  const clearOverrides = useCallback(() => {
    setLocalDraftOverrides(new Map());
    setEditingDraftId(null);
    setEditingDraftText('');
  }, []);

  const getMessageWithOverrides = useCallback(<T extends { id: string }>(msg: T): T & { aiSuggestedReply?: string | null; aiReplyStatus?: string | null; draftWasEdited?: boolean } => {
    const override = localDraftOverrides.get(msg.id);
    if (override) {
      return {
        ...msg,
        aiSuggestedReply: override.aiSuggestedReply,
        aiReplyStatus: override.aiReplyStatus,
        draftWasEdited: override.draftWasEdited,
      };
    }
    return msg;
  }, [localDraftOverrides]);

  return {
    generatingDraftIds,
    editingDraftId,
    editingDraftText,
    showRegenerateConfirm,
    localDraftOverrides,
    bulkQueueStatusById: bulkDraftQueue.statusById,
    bulkQueue: {
      isProcessing: bulkDraftQueue.isProcessing,
      progress: bulkDraftQueue.progress,
      completedCount: bulkDraftQueue.completedCount,
      totalCount: bulkDraftQueue.totalCount,
      errorCount: bulkDraftQueue.errorCount,
      enqueueMany: bulkDraftQueue.enqueueMany,
      cancel: bulkDraftQueue.cancel,
    },
    handleGenerateDraft,
    handleRegenerateDraft,
    handleSaveDraftEdit,
    handleDiscardDraft,
    handleSendDraft,
    startEditingDraft,
    cancelEditingDraft,
    setEditingDraftText,
    setShowRegenerateConfirm,
    getMessageWithOverrides,
    clearOverrides,
  };
}
