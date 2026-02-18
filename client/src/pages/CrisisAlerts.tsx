import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNexus } from '@/context/NexusContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Filter,
  Loader2,
  ExternalLink,
  XCircle,
  AlertOctagon,
  Scale,
  HeartPulse,
  Wrench,
  Users,
  UserMinus,
  Info,
  FileWarning,
  HelpCircle,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; textColor: string }> = {
  P1: { label: 'Crítico', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  P2: { label: 'Alto', color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  P3: { label: 'Medio', color: 'bg-yellow-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  P4: { label: 'Bajo', color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  new: { label: 'Nueva', icon: AlertTriangle, color: 'text-red-500' },
  acknowledged: { label: 'Vista', icon: Eye, color: 'text-blue-500' },
  in_progress: { label: 'En Proceso', icon: Clock, color: 'text-yellow-500' },
  resolved: { label: 'Resuelta', icon: CheckCircle2, color: 'text-green-500' },
  dismissed: { label: 'Descartada', icon: XCircle, color: 'text-gray-400' },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  legal_threat: { label: 'Amenaza Legal', icon: Scale },
  safety_concern: { label: 'Seguridad', icon: HeartPulse },
  service_failure: { label: 'Fallo de Servicio', icon: Wrench },
  reputation_damage: { label: 'Daño Reputacional', icon: AlertOctagon },
  customer_churn: { label: 'Pérdida de Cliente', icon: UserMinus },
  misinformation: { label: 'Desinformación', icon: FileWarning },
  regulatory_risk: { label: 'Riesgo Regulatorio', icon: Scale },
  general_complaint: { label: 'Queja General', icon: MessageSquare },
  other: { label: 'Otro', icon: HelpCircle },
};

export function CrisisAlerts() {
  const { activeClient } = useNexus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(['new', 'acknowledged', 'in_progress']);

  const brandId = activeClient?.id;

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['sentiment-alerts', brandId, severityFilter, statusFilter],
    queryFn: () => api.sentimentAlerts.getByBrand(brandId!, {
      severity: severityFilter.length > 0 ? severityFilter : undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      limit: 100,
    }),
    enabled: !!brandId,
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['sentiment-alerts-stats', brandId],
    queryFn: () => api.sentimentAlerts.getStats(brandId!),
    enabled: !!brandId,
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ alertId, status, notes }: { alertId: string; status: string; notes?: string }) =>
      api.sentimentAlerts.updateStatus(brandId!, alertId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentiment-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sentiment-alerts-stats'] });
      toast({ title: 'Alerta actualizada', description: 'El estado de la alerta ha sido actualizado.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo actualizar la alerta.', variant: 'destructive' });
    },
  });

  const toggleSeverity = (sev: string) => {
    setSeverityFilter(prev =>
      prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]
    );
  };

  const toggleStatus = (st: string) => {
    setStatusFilter(prev =>
      prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]
    );
  };

  const alerts = alertsData?.alerts || [];

  if (!brandId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          Crisis Alerts
        </h1>
        <p className="text-sm text-gray-500 mt-1">Selecciona una marca para ver las alertas</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          Crisis Alerts
        </h1>
        <p className="text-sm text-gray-500 mt-1">Monitoreo de sentimiento y gestión de crisis en mensajes</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <Card data-testid="stat-p1-count">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">P1 Críticas</p>
              <p className="text-2xl font-bold text-red-600">{stats?.bySeverity?.P1 || 0}</p>
            </div>
            <AlertOctagon className="w-5 h-5 text-red-400" />
          </CardContent>
        </Card>
        <Card data-testid="stat-p2-count">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">P2 Altas</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.bySeverity?.P2 || 0}</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </CardContent>
        </Card>
        <Card data-testid="stat-new-count">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Sin Revisar</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.byStatus?.new || 0}</p>
            </div>
            <Clock className="w-5 h-5 text-yellow-400" />
          </CardContent>
        </Card>
        <Card data-testid="stat-resolved-count">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Resueltas</p>
              <p className="text-2xl font-bold text-green-600">{stats?.byStatus?.resolved || 0}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 space-y-3 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 mr-1">Severidad:</span>
          {(['P1', 'P2', 'P3', 'P4'] as const).map(sev => {
            const cfg = SEVERITY_CONFIG[sev];
            const isActive = severityFilter.includes(sev);
            return (
              <button
                key={sev}
                data-testid={`filter-severity-${sev}`}
                onClick={() => toggleSeverity(sev)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? `${cfg.bgColor} ${cfg.textColor} ring-1 ring-current`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {sev} - {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 ml-6 mr-1">Estado:</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const isActive = statusFilter.includes(key);
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                data-testid={`filter-status-${key}`}
                onClick={() => toggleStatus(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                  isActive
                    ? `bg-blue-50 text-blue-700 ring-1 ring-blue-300`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 px-4 space-y-3 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No hay alertas con los filtros seleccionados</p>
              <p className="text-gray-400 text-xs mt-1">Las alertas se generan automáticamente al detectar mensajes críticos</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert: any) => {
            const sevCfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.P4;
            const statusCfg = STATUS_CONFIG[alert.status] || STATUS_CONFIG.new;
            const catCfg = CATEGORY_CONFIG[alert.category] || CATEGORY_CONFIG.other;
            const StatusIcon = statusCfg.icon;
            const CategoryIcon = catCfg.icon;

            return (
              <Card
                key={alert.id}
                data-testid={`alert-card-${alert.id}`}
                className={`border-l-4 ${
                  alert.severity === 'P1' ? 'border-l-red-500' :
                  alert.severity === 'P2' ? 'border-l-orange-500' :
                  alert.severity === 'P3' ? 'border-l-yellow-500' : 'border-l-green-500'
                } ${alert.status === 'new' ? 'bg-red-50/30' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={`${sevCfg.bgColor} ${sevCfg.textColor} text-[10px] px-1.5 py-0`}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          <CategoryIcon className="w-3 h-3" />
                          {catCfg.label}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                        {alert.platform && (
                          <span className="text-[10px] text-gray-400 capitalize">{alert.platform}</span>
                        )}
                      </div>

                      <p className="text-sm text-gray-800 font-medium mb-1">
                        @{alert.messageAuthor}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        "{alert.messagePreview}"
                      </p>

                      {alert.reason && (
                        <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{alert.reason}</span>
                        </p>
                      )}

                      {alert.confidence != null && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                alert.confidence > 0.8 ? 'bg-red-400' :
                                alert.confidence > 0.5 ? 'bg-yellow-400' : 'bg-gray-400'
                              }`}
                              style={{ width: `${(alert.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {Math.round(alert.confidence * 100)}% confianza
                          </span>
                        </div>
                      )}

                      <div className="text-[10px] text-gray-400 mt-2">
                        {alert.createdAt && new Date(alert.createdAt).toLocaleString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      {alert.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`btn-acknowledge-${alert.id}`}
                          className="text-xs h-7"
                          onClick={() => updateStatusMutation.mutate({ alertId: alert.id, status: 'acknowledged' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Revisar
                        </Button>
                      )}
                      {(alert.status === 'new' || alert.status === 'acknowledged') && (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`btn-in-progress-${alert.id}`}
                          className="text-xs h-7"
                          onClick={() => updateStatusMutation.mutate({ alertId: alert.id, status: 'in_progress' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Clock className="w-3 h-3 mr-1" /> En Proceso
                        </Button>
                      )}
                      {alert.status !== 'resolved' && alert.status !== 'dismissed' && (
                        <Button
                          size="sm"
                          variant="default"
                          data-testid={`btn-resolve-${alert.id}`}
                          className="text-xs h-7 bg-green-600 hover:bg-green-700"
                          onClick={() => updateStatusMutation.mutate({ alertId: alert.id, status: 'resolved' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Resolver
                        </Button>
                      )}
                      {alert.status !== 'dismissed' && alert.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`btn-dismiss-${alert.id}`}
                          className="text-xs h-7 text-gray-400"
                          onClick={() => updateStatusMutation.mutate({ alertId: alert.id, status: 'dismissed' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Descartar
                        </Button>
                      )}
                      {alert.conversationId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`btn-go-conversation-${alert.id}`}
                          className="text-xs h-7 text-blue-500"
                          onClick={() => setLocation('/app/inbox')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> Ver
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
