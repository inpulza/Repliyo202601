import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { DraftStatus } from './useBulkDraftQueue';

interface UseBulkSendQueueOptions {
  brandId: string;
  maxConcurrency?: number;
  onComplete?: (results: { successCount: number; errorCount: number; errors: string[] }) => void;
  onMessageComplete?: (messageId: string, success: boolean) => void;
}

interface UseBulkSendQueueResult {
  enqueueMany: (messageIds: string[]) => void;
  cancel: () => void;
  statusById: Map<string, DraftStatus>;
  isProcessing: boolean;
  completedCount: number;
  errorCount: number;
  totalCount: number;
  progress: number;
}

export function useBulkSendQueue({
  brandId,
  maxConcurrency = 2,
  onComplete,
  onMessageComplete,
}: UseBulkSendQueueOptions): UseBulkSendQueueResult {
  const { toast } = useToast();
  const [statusById, setStatusById] = useState<Map<string, DraftStatus>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const queueRef = useRef<string[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());
  const errorsRef = useRef<string[]>([]);
  const cancelledRef = useRef(false);
  const successCountRef = useRef(0);

  const updateStatus = useCallback((messageId: string, status: DraftStatus) => {
    setStatusById(prev => {
      const next = new Map(prev);
      next.set(messageId, status);
      return next;
    });
  }, []);

  const processNext = useCallback(async () => {
    if (cancelledRef.current) return;
    if (queueRef.current.length === 0) {
      if (inFlightRef.current.size === 0) {
        setIsProcessing(false);
        const finalSuccessCount = successCountRef.current;
        const finalErrorCount = errorsRef.current.length;

        toast({
          title: finalErrorCount === 0 ? "Borradores enviados" : "Envío completado con errores",
          description: finalErrorCount === 0
            ? `${finalSuccessCount} ${finalSuccessCount === 1 ? 'borrador enviado' : 'borradores enviados'} exitosamente`
            : `${finalSuccessCount} enviados, ${finalErrorCount} ${finalErrorCount === 1 ? 'error' : 'errores'}`,
          variant: finalErrorCount === 0 ? "default" : "destructive",
        });

        onComplete?.({
          successCount: finalSuccessCount,
          errorCount: finalErrorCount,
          errors: errorsRef.current,
        });
      }
      return;
    }

    while (inFlightRef.current.size < maxConcurrency && queueRef.current.length > 0 && !cancelledRef.current) {
      const messageId = queueRef.current.shift()!;
      inFlightRef.current.add(messageId);
      updateStatus(messageId, 'running');

      (async () => {
        try {
          await api.aiAgent.sendDraft(brandId, messageId);
          updateStatus(messageId, 'success');
          successCountRef.current += 1;
          setCompletedCount(prev => prev + 1);
          onMessageComplete?.(messageId, true);
        } catch (error: any) {
          const errorMsg = error.message || 'Error desconocido';
          updateStatus(messageId, 'error');
          errorsRef.current.push(`${messageId}: ${errorMsg}`);
          setErrorCount(prev => prev + 1);
          setCompletedCount(prev => prev + 1);
          onMessageComplete?.(messageId, false);
        } finally {
          inFlightRef.current.delete(messageId);
          processNext();
        }
      })();
    }
  }, [brandId, maxConcurrency, onComplete, onMessageComplete, updateStatus, toast]);

  const enqueueMany = useCallback((messageIds: string[]) => {
    if (messageIds.length === 0) return;

    cancelledRef.current = false;
    errorsRef.current = [];
    successCountRef.current = 0;
    queueRef.current = [...messageIds];
    inFlightRef.current.clear();

    const newStatusMap = new Map<string, DraftStatus>();
    messageIds.forEach(id => newStatusMap.set(id, 'queued'));
    setStatusById(newStatusMap);

    setTotalCount(messageIds.length);
    setCompletedCount(0);
    setErrorCount(0);
    setIsProcessing(true);

    toast({
      title: "Enviando borradores...",
      description: `Enviando ${messageIds.length} ${messageIds.length === 1 ? 'borrador' : 'borradores'}`,
    });

    processNext();
  }, [processNext, toast]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    queueRef.current = [];
    setIsProcessing(false);

    toast({
      title: "Envío cancelado",
      description: "El envío de borradores fue cancelado",
    });
  }, [toast]);

  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    enqueueMany,
    cancel,
    statusById,
    isProcessing,
    completedCount,
    errorCount,
    totalCount,
    progress,
  };
}
