import React from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkDraftActionBarProps {
  selectedCount: number;
  isProcessing: boolean;
  progress: number;
  completedCount: number;
  totalCount: number;
  errorCount: number;
  onGenerate: () => void;
  onClearSelection: () => void;
  onCancel: () => void;
}

export function BulkDraftActionBar({
  selectedCount,
  isProcessing,
  progress,
  completedCount,
  totalCount,
  errorCount,
  onGenerate,
  onClearSelection,
  onCancel,
}: BulkDraftActionBarProps) {
  const shouldShow = selectedCount > 0 || isProcessing;

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
            "px-4 py-3 flex items-center gap-4",
            "min-w-[320px] max-w-[500px]"
          )}
          data-testid="bulk-draft-action-bar"
        >
          {isProcessing ? (
            <>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Generando borradores...
                  </span>
                  <span className="text-xs text-gray-500">
                    {completedCount} de {totalCount}
                    {errorCount > 0 && (
                      <span className="text-red-500 ml-1">
                        ({errorCount} {errorCount === 1 ? 'error' : 'errores'})
                      </span>
                    )}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
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
                <span>{selectedCount === 1 ? 'mensaje seleccionado' : 'mensajes seleccionados'}</span>
              </div>
              
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
              
              <Button
                onClick={onGenerate}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                data-testid="button-bulk-generate"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Borradores ({selectedCount})
              </Button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
