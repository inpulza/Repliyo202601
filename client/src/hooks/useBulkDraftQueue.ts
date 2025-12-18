import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

export type BulkDraftStatus = 'idle' | 'processing' | 'completed' | 'cancelled';

export interface BulkDraftResult {
  messageId: string;
  success: boolean;
  error?: string;
  draft?: string;
  characterCount?: number;
}

interface UseBulkDraftQueueOptions {
  onMessageComplete?: (result: BulkDraftResult) => void;
  onAllComplete?: (results: BulkDraftResult[]) => void;
  onProgress?: (current: number, total: number) => void;
}

interface UseBulkDraftQueueReturn {
  status: BulkDraftStatus;
  results: BulkDraftResult[];
  currentIndex: number;
  totalCount: number;
  currentMessageId: string | null;
  successCount: number;
  errorCount: number;
  startQueue: (brandId: string, messageIds: string[]) => Promise<void>;
  cancelQueue: () => void;
  resetQueue: () => void;
}

export function useBulkDraftQueue(options: UseBulkDraftQueueOptions = {}): UseBulkDraftQueueReturn {
  const { onMessageComplete, onAllComplete, onProgress } = options;
  
  const [status, setStatus] = useState<BulkDraftStatus>('idle');
  const [results, setResults] = useState<BulkDraftResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  
  const cancelledRef = useRef(false);

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  const startQueue = useCallback(async (brandId: string, messageIds: string[]) => {
    if (messageIds.length === 0) return;
    
    cancelledRef.current = false;
    setStatus('processing');
    setResults([]);
    setCurrentIndex(0);
    setTotalCount(messageIds.length);
    
    const allResults: BulkDraftResult[] = [];
    
    for (let i = 0; i < messageIds.length; i++) {
      if (cancelledRef.current) {
        setStatus('cancelled');
        break;
      }
      
      const messageId = messageIds[i];
      setCurrentIndex(i);
      setCurrentMessageId(messageId);
      onProgress?.(i + 1, messageIds.length);
      
      let result: BulkDraftResult;
      
      try {
        const response = await api.aiAgent.generateDraft(brandId, messageId);
        
        if (response.success && response.draft) {
          result = {
            messageId,
            success: true,
            draft: response.draft,
            characterCount: response.characterCount,
          };
        } else {
          result = {
            messageId,
            success: false,
            error: 'No draft generated',
          };
        }
      } catch (error: any) {
        result = {
          messageId,
          success: false,
          error: error.message || 'Unknown error',
        };
      }
      
      allResults.push(result);
      setResults([...allResults]);
      onMessageComplete?.(result);
      
      if (i < messageIds.length - 1 && !cancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setCurrentMessageId(null);
    
    if (!cancelledRef.current) {
      setStatus('completed');
      onAllComplete?.(allResults);
    }
  }, [onMessageComplete, onAllComplete, onProgress]);

  const cancelQueue = useCallback(() => {
    cancelledRef.current = true;
    setStatus('cancelled');
    setCurrentMessageId(null);
  }, []);

  const resetQueue = useCallback(() => {
    cancelledRef.current = false;
    setStatus('idle');
    setResults([]);
    setCurrentIndex(0);
    setTotalCount(0);
    setCurrentMessageId(null);
  }, []);

  return {
    status,
    results,
    currentIndex,
    totalCount,
    currentMessageId,
    successCount,
    errorCount,
    startQueue,
    cancelQueue,
    resetQueue,
  };
}
