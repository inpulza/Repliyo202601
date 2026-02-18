import React from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Send, X, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkDraftActionBarProps {
  selectedCount: number;
  selectableCount: number;
  sendableCount: number;
  isProcessing: boolean;
  isSending: boolean;
  progress: number;
  sendProgress: number;
  completedCount: number;
  sendCompletedCount: number;
  totalCount: number;
  sendTotalCount: number;
  errorCount: number;
  sendErrorCount: number;
  onGenerate: () => void;
  onSend: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCancel: () => void;
  onCancelSend: () => void;
}

export function BulkDraftActionBar({
  selectedCount,
  selectableCount,
  sendableCount,
  isProcessing,
  isSending,
  progress,
  sendProgress,
  completedCount,
  sendCompletedCount,
  totalCount,
  sendTotalCount,
  errorCount,
  sendErrorCount,
  onGenerate,
  onSend,
  onSelectAll,
  onClearSelection,
  onCancel,
  onCancelSend,
}: BulkDraftActionBarProps) {
  const shouldShow = selectedCount > 0 || isProcessing || isSending;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "fixed z-50",
            "bottom-20 md:bottom-6",
            "left-1/2 -translate-x-1/2 md:left-[calc(50%+130px)]",
            "bg-white border border-gray-200 rounded-xl shadow-lg",
            "px-4 py-3 flex items-center gap-3",
            "min-w-[320px] max-w-[560px]"
          )}
          data-testid="bulk-draft-action-bar"
        >
          {isProcessing || isSending ? (
            <>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {isSending ? "Enviando borradores..." : "Generando borradores..."}
                  </span>
                  <span className="text-xs text-gray-500">
                    {isSending ? sendCompletedCount : completedCount} de {isSending ? sendTotalCount : totalCount}
                    {(isSending ? sendErrorCount : errorCount) > 0 && (
                      <span className="text-red-500 ml-1">
                        ({isSending ? sendErrorCount : errorCount} {(isSending ? sendErrorCount : errorCount) === 1 ? 'error' : 'errores'})
                      </span>
                    )}
                  </span>
                </div>
                <Progress value={isSending ? sendProgress : progress} className="h-2" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={isSending ? onCancelSend : onCancel}
                className="text-gray-500 hover:text-gray-700"
                data-testid="button-cancel-bulk"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium text-gray-900">{selectedCount}</span>
                <span className="hidden sm:inline">{selectedCount === 1 ? 'seleccionado' : 'seleccionados'}</span>
              </div>

              {selectedCount < selectableCount && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSelectAll}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs px-2"
                  data-testid="button-select-all"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1" />
                  Todos ({selectableCount})
                </Button>
              )}

              <div className="flex-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-gray-500 hover:text-gray-700"
                data-testid="button-clear-selection"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>

              {sendableCount > 0 && (
                <Button
                  onClick={onSend}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  data-testid="button-bulk-send"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Enviar ({sendableCount})
                </Button>
              )}

              {selectedCount - sendableCount > 0 && (
                <Button
                  onClick={onGenerate}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                  data-testid="button-bulk-generate"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Generar ({selectedCount - sendableCount})
                </Button>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
