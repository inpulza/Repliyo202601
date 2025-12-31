import React, { useState, useEffect } from 'react';
import { useReminderRules, useBrandReminderEvents, useReminderStats, useReminderTimeline, useReminderFailures, type TimeRange } from '@/hooks/useReminderRules';
import type { ReminderRules, ReminderEvent } from '@shared/schema';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from '@/hooks/use-toast';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Bell, Clock, MessageSquare, Mail, Settings, 
  Save, Loader2, Play, AlertTriangle, Info, Zap, History,
  CheckCircle, XCircle, Clock3, RefreshCw, TrendingUp,
  BarChart3, Target, BellOff, Timer
} from 'lucide-react';

interface ReminderSettingsFormProps {
  brandId: string;
}

const DEFAULT_RULES: Partial<ReminderRules> = {
  enabled: false,
  delayHours1: 24,
  delayHours2: 48,
  maxReminders: 2,
  dailyBrandCap: 50,
  useAiContent: true,
  templateText: '',
  applyToDms: true,
  applyToComments: false,
  autoCloseAfterMaxReminders: true,
  autoCloseDelayHours: 48,
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Enviado</Badge>;
    case 'scheduled':
      return <Badge variant="secondary"><Clock3 className="h-3 w-3 mr-1" />Programado</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallido</Badge>;
    case 'cancelled':
      return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function ReminderSettingsForm({ brandId }: ReminderSettingsFormProps) {
  const { rules, isLoading, updateRules, isUpdating, runManual, isRunning } = useReminderRules(brandId);
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useBrandReminderEvents(brandId, { limit: 25 });
  const [formData, setFormData] = useState<Partial<ReminderRules>>(DEFAULT_RULES);
  const [hasChanges, setHasChanges] = useState(false);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<TimeRange>('7d');

  // Analytics hooks
  const { data: stats, isLoading: statsLoading } = useReminderStats(brandId, analyticsTimeRange);
  const { data: timeline, isLoading: timelineLoading } = useReminderTimeline(brandId, analyticsTimeRange);
  const { data: failures, isLoading: failuresLoading } = useReminderFailures(brandId, analyticsTimeRange);

  useEffect(() => {
    if (rules) {
      setFormData({
        enabled: rules.enabled ?? false,
        delayHours1: rules.delayHours1 ?? 24,
        delayHours2: rules.delayHours2 ?? 48,
        maxReminders: rules.maxReminders ?? 2,
        dailyBrandCap: rules.dailyBrandCap ?? 50,
        useAiContent: rules.useAiContent ?? true,
        templateText: rules.templateText ?? '',
        applyToDms: rules.applyToDms ?? true,
        applyToComments: rules.applyToComments ?? false,
        autoCloseAfterMaxReminders: rules.autoCloseAfterMaxReminders ?? true,
        autoCloseDelayHours: rules.autoCloseDelayHours ?? 48,
      });
      setHasChanges(false);
    }
  }, [rules]);

  const handleChange = (field: keyof ReminderRules, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateRules(formData);
    setHasChanges(false);
  };

  const handleRunManual = () => {
    runManual();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="loading-reminder-settings">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reminder-settings-form">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Recordatorios Automáticos</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="enabled" className="text-sm">Activar sistema</Label>
                <Switch
                  id="enabled"
                  checked={formData.enabled || false}
                  onCheckedChange={(checked) => handleChange('enabled', checked)}
                  data-testid="switch-enabled"
                />
              </div>
            </div>
          </div>
          <CardDescription>
            Envía recordatorios personalizados a clientes inactivos para re-engancharlos en la conversación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!formData.enabled && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                El sistema de recordatorios está desactivado. Actívalo para empezar a enviar seguimientos automáticos.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Canales de Aplicación
              </h3>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="applyToDms" className="font-normal">Mensajes Directos (DMs)</Label>
                  <p className="text-xs text-muted-foreground">Enviar recordatorios en conversaciones de DM</p>
                </div>
                <Switch
                  id="applyToDms"
                  checked={formData.applyToDms || false}
                  onCheckedChange={(checked) => handleChange('applyToDms', checked)}
                  data-testid="switch-apply-dms"
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="applyToComments" className="font-normal">Comentarios</Label>
                  <p className="text-xs text-muted-foreground">Responder a comentarios sin respuesta</p>
                </div>
                <Switch
                  id="applyToComments"
                  checked={formData.applyToComments || false}
                  onCheckedChange={(checked) => handleChange('applyToComments', checked)}
                  data-testid="switch-apply-comments"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tiempos de Espera
              </h3>

              <div className="space-y-2">
                <Label htmlFor="delayHours1">Primer recordatorio (horas)</Label>
                <Input
                  id="delayHours1"
                  type="number"
                  min={1}
                  max={168}
                  value={formData.delayHours1 || 24}
                  onChange={(e) => handleChange('delayHours1', parseInt(e.target.value) || 24)}
                  data-testid="input-delay-hours-1"
                />
                <p className="text-xs text-muted-foreground">
                  Horas de inactividad antes de enviar el primer recordatorio
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delayHours2">Segundo recordatorio (horas)</Label>
                <Input
                  id="delayHours2"
                  type="number"
                  min={1}
                  max={336}
                  value={formData.delayHours2 || 48}
                  onChange={(e) => handleChange('delayHours2', parseInt(e.target.value) || 48)}
                  data-testid="input-delay-hours-2"
                />
                <p className="text-xs text-muted-foreground">
                  Horas desde el primer recordatorio antes de enviar el segundo
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Límites
              </h3>

              <div className="space-y-2">
                <Label htmlFor="maxReminders">Máximo de recordatorios</Label>
                <Input
                  id="maxReminders"
                  type="number"
                  min={1}
                  max={3}
                  value={formData.maxReminders || 2}
                  onChange={(e) => handleChange('maxReminders', parseInt(e.target.value) || 2)}
                  data-testid="input-max-reminders"
                />
                <p className="text-xs text-muted-foreground">
                  Número máximo de recordatorios por conversación (1-3)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyBrandCap">Límite diario por marca</Label>
                <Input
                  id="dailyBrandCap"
                  type="number"
                  min={1}
                  max={500}
                  value={formData.dailyBrandCap || 50}
                  onChange={(e) => handleChange('dailyBrandCap', parseInt(e.target.value) || 50)}
                  data-testid="input-daily-cap"
                />
                <p className="text-xs text-muted-foreground">
                  Máximo de recordatorios enviados por día
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Cierre Automático
              </h3>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="autoCloseAfterMaxReminders" className="font-normal">
                    Cerrar tras agotar recordatorios
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cerrar automáticamente conversaciones sin respuesta
                  </p>
                </div>
                <Switch
                  id="autoCloseAfterMaxReminders"
                  checked={formData.autoCloseAfterMaxReminders || false}
                  onCheckedChange={(checked) => handleChange('autoCloseAfterMaxReminders', checked)}
                  data-testid="switch-auto-close"
                />
              </div>

              {formData.autoCloseAfterMaxReminders && (
                <div className="space-y-2">
                  <Label htmlFor="autoCloseDelayHours">Horas antes de cerrar</Label>
                  <Input
                    id="autoCloseDelayHours"
                    type="number"
                    min={1}
                    max={168}
                    value={formData.autoCloseDelayHours || 48}
                    onChange={(e) => handleChange('autoCloseDelayHours', parseInt(e.target.value) || 48)}
                    data-testid="input-auto-close-delay"
                  />
                  <p className="text-xs text-muted-foreground">
                    Horas adicionales de espera después del último recordatorio
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contenido del Mensaje
            </h3>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="useAiContent" className="font-normal">Usar IA para generar contenido</Label>
                <p className="text-xs text-muted-foreground">
                  La IA creará mensajes personalizados basados en el contexto de la conversación
                </p>
              </div>
              <Switch
                id="useAiContent"
                checked={formData.useAiContent || false}
                onCheckedChange={(checked) => handleChange('useAiContent', checked)}
                data-testid="switch-use-ai"
              />
            </div>

            {!formData.useAiContent && (
              <div className="space-y-2">
                <Label htmlFor="templateText">Plantilla de mensaje</Label>
                <Textarea
                  id="templateText"
                  placeholder="Hola {name}, queríamos saber si tienes alguna pregunta sobre {lastTopic}..."
                  value={formData.templateText || ''}
                  onChange={(e) => handleChange('templateText', e.target.value)}
                  rows={4}
                  data-testid="textarea-template"
                />
                <p className="text-xs text-muted-foreground">
                  Variables disponibles: {'{name}'}, {'{lastTopic}'}, {'{serviceInterest}'}
                </p>
              </div>
            )}
          </div>

          {formData.maxReminders === 1 && formData.delayHours2 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Solo enviarás 1 recordatorio. El delay del segundo recordatorio no se utilizará.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleRunManual}
          disabled={isRunning || !formData.enabled}
          data-testid="button-run-manual"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ejecutando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Ejecutar Ahora
            </>
          )}
        </Button>

        <Button
          onClick={handleSave}
          disabled={isUpdating || !hasChanges}
          data-testid="button-save"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {/* Analytics Dashboard */}
      <Card data-testid="analytics-dashboard">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Métricas de Recordatorios</CardTitle>
            </div>
            <Tabs value={analyticsTimeRange} onValueChange={(v) => setAnalyticsTimeRange(v as TimeRange)}>
              <TabsList className="h-8">
                <TabsTrigger value="today" className="text-xs px-2">Hoy</TabsTrigger>
                <TabsTrigger value="7d" className="text-xs px-2">7 días</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs px-2">30 días</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription>
            Rendimiento y efectividad de los recordatorios automáticos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg" data-testid="kpi-sent">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-xs">Enviados</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalSent}</p>
                </div>
                
                <div className="p-4 border rounded-lg" data-testid="kpi-conversion">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className="text-xs">Conversiones</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.conversionCount}</p>
                  <p className="text-xs text-muted-foreground">{stats.conversionRate}% tasa</p>
                </div>

                <div className="p-4 border rounded-lg" data-testid="kpi-response-time">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Timer className="h-4 w-4 text-amber-500" />
                    <span className="text-xs">Tiempo Resp.</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {stats.avgResponseMinutes ? `${stats.avgResponseMinutes}m` : '-'}
                  </p>
                </div>

                <div className="p-4 border rounded-lg" data-testid="kpi-failed">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs">Fallidos</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalFailed}</p>
                </div>
              </div>

              {/* Daily Cap Progress */}
              <div className="p-4 border rounded-lg space-y-2" data-testid="daily-cap">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Cuota Diaria
                  </span>
                  <span className="font-medium">{stats.dailyCapUsage} / {stats.dailyCapLimit}</span>
                </div>
                <Progress 
                  value={(stats.dailyCapUsage / stats.dailyCapLimit) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {stats.dailyCapLimit - stats.dailyCapUsage} recordatorios restantes hoy
                </p>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="status-summary">
                <div className="flex items-center gap-2 p-2 border rounded text-sm">
                  <Clock3 className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Programados:</span>
                  <span className="font-medium">{stats.totalScheduled}</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded text-sm">
                  <XCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-muted-foreground">Cancelados:</span>
                  <span className="font-medium">{stats.totalCancelled}</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded text-sm">
                  <BellOff className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">Opt-out:</span>
                  <span className="font-medium">{stats.totalOptedOut}</span>
                </div>
              </div>

              {/* Failure Reasons (if any) */}
              {failures && failures.length > 0 && (
                <div className="space-y-2" data-testid="failure-reasons">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Razones de Fallo
                  </h4>
                  <div className="space-y-1">
                    {failures.slice(0, 5).map((failure, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                        <span className="text-red-700 truncate flex-1">{failure.reason}</span>
                        <Badge variant="destructive" className="ml-2">{failure.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay datos de métricas disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>Historial de Recordatorios</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchEvents()}
              disabled={eventsLoading}
              data-testid="button-refresh-events"
            >
              <RefreshCw className={`h-4 w-4 ${eventsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>
            Últimos recordatorios enviados y programados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !events || events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-events">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay recordatorios registrados todavía</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto" data-testid="events-list">
              {events.map((event: ReminderEvent) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`event-row-${event.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(event.status)}
                      <span className="text-sm font-medium truncate">
                        Recordatorio #{event.reminderNumber}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {event.messageText ? event.messageText.substring(0, 60) + '...' : 'Sin mensaje'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {event.sentAt ? (
                      <div>
                        <p>Enviado:</p>
                        <p>{format(new Date(event.sentAt), 'dd MMM HH:mm', { locale: es })}</p>
                      </div>
                    ) : event.scheduledFor ? (
                      <div>
                        <p>Programado:</p>
                        <p>{format(new Date(event.scheduledFor), 'dd MMM HH:mm', { locale: es })}</p>
                      </div>
                    ) : (
                      <p>{format(new Date(event.createdAt), 'dd MMM HH:mm', { locale: es })}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
