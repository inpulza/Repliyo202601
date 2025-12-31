import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ReminderRules, ReminderEvent } from '@shared/schema';
import { toast } from '@/hooks/use-toast';

export function useReminderRules(brandId: string | undefined) {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ['reminder-rules', brandId],
    queryFn: () => api.reminders.getRules(brandId!),
    enabled: !!brandId,
    staleTime: 30000,
  });

  const updateRulesMutation = useMutation({
    mutationFn: (rules: Partial<ReminderRules>) => 
      api.reminders.updateRules(brandId!, rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-rules', brandId] });
      toast({
        title: 'Configuración guardada',
        description: 'Los ajustes de recordatorios se han actualizado correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron guardar los cambios.',
        variant: 'destructive',
      });
    },
  });

  const runManualMutation = useMutation({
    mutationFn: () => api.reminders.runManual(brandId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-rules', brandId] });
      toast({
        title: 'Ejecución completada',
        description: `Programados: ${data.scheduled}, Enviados: ${data.sent}${data.errors.length > 0 ? `, Errores: ${data.errors.length}` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo ejecutar el proceso de recordatorios.',
        variant: 'destructive',
      });
    },
  });

  return {
    rules: rulesQuery.data,
    isLoading: rulesQuery.isLoading,
    isError: rulesQuery.isError,
    error: rulesQuery.error,
    updateRules: updateRulesMutation.mutate,
    isUpdating: updateRulesMutation.isPending,
    runManual: runManualMutation.mutate,
    isRunning: runManualMutation.isPending,
  };
}

export function useReminderEvents(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['reminder-events', conversationId],
    queryFn: () => api.reminders.getEventsByConversation(conversationId!),
    enabled: !!conversationId,
    staleTime: 30000,
  });
}

export function useBrandReminderEvents(brandId: string | undefined, options?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['brand-reminder-events', brandId, options],
    queryFn: () => api.reminders.getEventsByBrand(brandId!, options),
    enabled: !!brandId,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useReminderOptOut(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.reminders.optOutConversation(conversationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-events', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      toast({
        title: 'Recordatorios desactivados',
        description: 'No se enviarán más recordatorios a esta conversación.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo desactivar los recordatorios.',
        variant: 'destructive',
      });
    },
  });
}

// Analytics hooks
export type TimeRange = 'today' | '7d' | '30d';

export function useReminderStats(brandId: string | undefined, timeRange: TimeRange = '7d') {
  return useQuery({
    queryKey: ['reminder-stats', brandId, timeRange],
    queryFn: () => api.reminders.getStats(brandId!, timeRange),
    enabled: !!brandId,
    staleTime: 60000,
    refetchInterval: 300000, // 5 minutes
  });
}

export function useReminderTimeline(brandId: string | undefined, timeRange: TimeRange = '7d') {
  return useQuery({
    queryKey: ['reminder-timeline', brandId, timeRange],
    queryFn: () => api.reminders.getTimeline(brandId!, timeRange),
    enabled: !!brandId,
    staleTime: 60000,
    refetchInterval: 300000,
  });
}

export function useReminderFailures(brandId: string | undefined, timeRange: TimeRange = '7d', limit: number = 10) {
  return useQuery({
    queryKey: ['reminder-failures', brandId, timeRange, limit],
    queryFn: () => api.reminders.getFailureReasons(brandId!, timeRange, limit),
    enabled: !!brandId,
    staleTime: 60000,
    refetchInterval: 300000,
  });
}
