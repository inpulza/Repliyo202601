import React, { useState } from 'react';
import { useNexus } from '@/context/NexusContext';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/authenticatedApiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    BarChart3, 
    ArrowUpRight, 
    ArrowDownRight,
    MessageSquare, 
    Clock, 
    Smile, 
    Users,
    Calendar,
    Loader2,
    Inbox,
    Send,
    ChevronDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MobilePageHeader, 
  MobileStatCard, 
  MobileStatGrid, 
  MobileCard, 
  MobileCardHeader,
  MobileSpacer,
  MobileContainer,
  MobileSectionDivider
} from '@/components/ui/mobile-primitives';

interface InboxStats {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  totalConversations: number;
  openConversations: number;
  closedConversations: number;
  uniqueContacts: number;
  avgResponseTimeMs: number | null;
  responseSamples: number;
  byPlatform: Record<string, {
    inbound: number;
    outbound: number;
    avgResponseTimeMs: number | null;
    responseSamples: number;
  }>;
  bySentiment: Record<string, number>;
  dailyStats: Array<{ date: string; inbound: number; outbound: number }>;
  recentActivity: Array<{
    id: string;
    type: 'message' | 'reply';
    author: string;
    content: string;
    platform: string;
    timestamp: string;
  }>;
  period: { label: string; from: string | null; to: string };
}

const periodOptions = [
  { label: 'Últimos 7 días', value: '7' },
  { label: 'Últimos 14 días', value: '14' },
  { label: 'Últimos 30 días', value: '30' },
  { label: 'Últimos 60 días', value: '60' },
  { label: 'Últimos 90 días', value: '90' },
  { label: 'Últimos 365 días', value: '365' },
  { label: 'Histórico completo', value: 'all' },
];

type MetricsPeriod =
  | { mode: 'preset'; value: string }
  | { mode: 'custom'; from: string; to: string };

function formatResponseTime(ms: number | null): string {
  if (ms === null) return '--';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function calculateSentimentScore(bySentiment: Record<string, number>): number | null {
  const positive = bySentiment['positive'] || 0;
  const neutral = bySentiment['neutral'] || 0;
  const negative = bySentiment['negative'] || 0;
  const total = positive + neutral + negative;
  
  if (total === 0) return null;
  return Math.round(((positive + neutral * 0.5) / total) * 100);
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    instagram: '📷',
    facebook: '📘',
    twitter: '🐦',
    whatsapp: '💬',
    email: '📧',
  };
  return icons[platform.toLowerCase()] || '💬';
}

function formatPlatformName(platform: string): string {
  const names: Record<string, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    twitter: 'X / Twitter',
    whatsapp: 'WhatsApp',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    'google-business': 'Google Business',
    email: 'Email',
    unknown: 'Sin identificar',
  };
  return names[platform.toLowerCase()] || platform;
}

export function Overview() {
  const { activeClient, isLoadingClients } = useNexus();
  const [period, setPeriod] = useState<MetricsPeriod>({ mode: 'preset', value: '7' });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const periodQuery = period.mode === 'custom'
    ? `from=${period.from}&to=${period.to}`
    : period.value === 'all' ? 'range=all' : `days=${period.value}`;
  
  const { data: stats, isLoading: isLoadingStats } = useQuery<InboxStats>({
    queryKey: ['/api/inbox-stats', activeClient?.id, periodQuery],
    queryFn: async () => {
      if (!activeClient?.id) return null;
      const res = await apiFetch(`/api/inbox-stats/${activeClient.id}?${periodQuery}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!activeClient?.id,
  });

  const isLoading = isLoadingClients || isLoadingStats;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const sentimentScore = stats ? calculateSentimentScore(stats.bySentiment) : null;
  
  const chartData = stats?.dailyStats.map(day => ({
    name: format(
      new Date(`${day.date}T12:00:00`),
      stats.dailyStats.length > 365 ? 'MMM yy' : stats.dailyStats.length > 14 ? 'dd MMM' : 'EEE',
      { locale: es },
    ),
    fullDate: format(new Date(`${day.date}T12:00:00`), 'dd MMM yyyy', { locale: es }),
    messages: day.inbound,
    response: day.outbound,
  })) || [];

  const selectedPeriodLabel = period.mode === 'custom'
    ? `${format(new Date(`${period.from}T12:00:00`), 'dd MMM', { locale: es })} – ${format(new Date(`${period.to}T12:00:00`), 'dd MMM', { locale: es })}`
    : periodOptions.find(option => option.value === period.value)?.label;

  const applyCustomRange = () => {
    if (!customFrom || !customTo || customTo < customFrom || customRangeTooLong) return;
    setPeriod({ mode: 'custom', from: customFrom, to: customTo });
    setIsCustomOpen(false);
  };

  const customRangeDays = customFrom && customTo
    ? Math.floor((new Date(`${customTo}T00:00:00`).getTime() - new Date(`${customFrom}T00:00:00`).getTime()) / 86400000) + 1
    : 0;
  const customRangeTooLong = customRangeDays > 366;

  const periodSelector = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 text-xs" data-testid="button-period-selector-mobile">
          {selectedPeriodLabel?.replace('Últimos ', '')}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {periodOptions.map(option => (
          <DropdownMenuItem 
            key={option.value}
            onClick={() => setPeriod({ mode: 'preset', value: option.value })}
            data-testid={`menu-item-period-mobile-${option.value}`}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setIsCustomOpen(true)} data-testid="menu-item-period-mobile-custom">
          Fechas personalizadas…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const customDatePopover = (
    <Dialog open={isCustomOpen} onOpenChange={setIsCustomOpen}>
      <DialogContent className="sm:max-w-sm" data-testid="dialog-custom-period">
        <DialogHeader>
          <DialogTitle>Rango personalizado</DialogTitle>
          <DialogDescription>Selecciona hasta 366 días por consulta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1 text-xs font-medium">
            <span>Desde</span>
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="input-period-from"
            />
          </label>
          <label className="block space-y-1 text-xs font-medium">
            <span>Hasta</span>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(event) => setCustomTo(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="input-period-to"
            />
          </label>
          {customRangeTooLong && (
            <p className="text-xs text-red-600" role="alert">El rango no puede superar 366 días.</p>
          )}
          <Button
            className="w-full"
            onClick={applyCustomRange}
            disabled={!customFrom || !customTo || customTo < customFrom || customRangeTooLong}
            data-testid="button-apply-custom-period"
          >
            Aplicar rango
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50/50 overflow-y-auto">
      {/* Mobile View */}
      {customDatePopover}
      <MobileContainer>
        <MobilePageHeader 
          title="Overview" 
          subtitle={activeClient?.name}
          rightElement={periodSelector}
        />
        
        <MobileSpacer size="md" />
        
        <MobileStatGrid columns={2}>
          <MobileStatCard
            icon={<MessageSquare className="h-4 w-4" />}
            iconColor="text-indigo-500"
            label="Mensajes"
            value={(stats?.totalMessages ?? 0).toLocaleString()}
            subtitle={`${stats?.inboundMessages || 0} recibidos`}
            testId="mobile-stat-messages"
          />
          <MobileStatCard
            icon={<Clock className="h-4 w-4" />}
            iconColor="text-amber-500"
            label="Tiempo Resp."
            value={formatResponseTime(stats?.avgResponseTimeMs ?? null)}
            subtitle="promedio"
            testId="mobile-stat-response-time"
          />
          <MobileStatCard
            icon={<Smile className="h-4 w-4" />}
            iconColor="text-emerald-500"
            label="Sentimiento"
            value={sentimentScore !== null ? `${sentimentScore}%` : '--'}
            subtitle={`${stats?.bySentiment?.['positive'] || 0} positivos`}
            testId="mobile-stat-sentiment"
          />
          <MobileStatCard
            icon={<Users className="h-4 w-4" />}
            iconColor="text-blue-500"
            label="Contactos"
            value={(stats?.uniqueContacts ?? 0).toLocaleString()}
            subtitle={`${stats?.openConversations || 0} activas`}
            testId="mobile-stat-contacts"
          />
        </MobileStatGrid>
        
        <MobileSpacer size="lg" />

        <MobileSectionDivider title="Mensajes por red social" />
        <div className="md:hidden bg-background divide-y divide-border">
          {Object.entries(stats?.byPlatform ?? {}).map(([platform, platformStats]) => (
            <div key={platform} className="flex items-center gap-3 px-4 py-3" data-testid={`mobile-platform-${platform}`}>
              <span className="text-lg" aria-hidden="true">{getPlatformIcon(platform)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{formatPlatformName(platform)}</p>
                <p className="text-xs text-muted-foreground">
                  {platformStats.inbound} recibidos · {platformStats.outbound} enviados
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatResponseTime(platformStats.avgResponseTimeMs)}</p>
                <p className="text-[10px] text-muted-foreground">respuesta media</p>
              </div>
            </div>
          ))}
        </div>

        <MobileSpacer size="lg" />
        
        <div className="md:hidden px-4">
          <MobileCard noPadding>
            <div className="p-4 border-b border-border">
              <MobileCardHeader 
                title="Volumen de Mensajes" 
                icon={<BarChart3 className="h-4 w-4" />}
              />
            </div>
            <div className="h-[200px] p-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMessagesMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      minTickGap={28}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="messages" 
                      name="Recibidos"
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorMessagesMobile)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos disponibles
                </div>
              )}
            </div>
          </MobileCard>
        </div>
        
        <MobileSpacer size="lg" />
        
        <MobileSectionDivider title="Actividad Reciente" />
        
        <div className="md:hidden bg-background">
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            stats.recentActivity.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0" data-testid={`mobile-activity-${item.id}`}>
                <Avatar className="h-8 w-8 border shrink-0">
                  <AvatarFallback className="text-xs">
                    {getPlatformIcon(item.platform)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.author}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No hay actividad reciente
            </div>
          )}
        </div>
      </MobileContainer>

      {/* Desktop View */}
      <div className="hidden md:block p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Overview</h1>
            <p className="text-gray-500 mt-1">
              Resumen de actividad de <span className="font-medium text-gray-900">{activeClient?.name || 'tu workspace'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-period-selector">
                  <Calendar className="h-4 w-4" />
                  {selectedPeriodLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {periodOptions.map(option => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => setPeriod({ mode: 'preset', value: option.value })}
                    data-testid={`menu-item-period-${option.value}`}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsCustomOpen(true)} data-testid="menu-item-period-custom">
                  Fechas personalizadas…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="button-download-report">
                <BarChart3 className="h-4 w-4" />
                Descargar Reporte
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Messages */}
            <Card data-testid="card-total-messages">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mensajes Totales</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-messages">
                      {(stats?.totalMessages ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span className="flex items-center gap-1">
                          <Inbox className="h-3 w-3 text-indigo-500" />
                          {stats?.inboundMessages || 0} recibidos
                        </span>
                        <span className="mx-1">•</span>
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3 text-emerald-500" />
                          {stats?.outboundMessages || 0} enviados
                        </span>
                    </p>
                </CardContent>
            </Card>

            {/* Response Time */}
            <Card data-testid="card-response-time">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tiempo de Respuesta</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-response-time">
                      {formatResponseTime(stats?.avgResponseTimeMs ?? null)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        promedio de primera respuesta · {stats?.responseSamples || 0} conversaciones respondidas
                    </p>
                </CardContent>
            </Card>

            {/* Sentiment Score */}
            <Card data-testid="card-sentiment-score">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sentimiento</CardTitle>
                    <Smile className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-sentiment-score">
                      {sentimentScore !== null ? `${sentimentScore}%` : '--'}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        {stats?.bySentiment && (
                          <>
                            <span className="text-emerald-600">{stats.bySentiment['positive'] || 0} positivos</span>
                            <span className="mx-1">•</span>
                            <span className="text-red-500">{stats.bySentiment['negative'] || 0} negativos</span>
                          </>
                        )}
                    </p>
                </CardContent>
            </Card>

             {/* Active Contacts */}
             <Card data-testid="card-active-contacts">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Contactos Activos</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-active-contacts">
                      {(stats?.uniqueContacts ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span>{stats?.openConversations || 0} conversaciones abiertas</span>
                    </p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
            {/* Main Chart */}
            <Card className="col-span-4" data-testid="card-message-volume-chart">
                <CardHeader>
                    <CardTitle>Volumen de Mensajes</CardTitle>
                    <CardDescription>Mensajes recibidos vs enviados en el tiempo</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[300px] w-full">
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                  <XAxis 
                                      dataKey="name" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fill: '#6b7280', fontSize: 12 }}
                                      dy={10}
                                      minTickGap={32}
                                  />
                                  <YAxis 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fill: '#6b7280', fontSize: 12 }}
                                  />
                                  <Tooltip 
                                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                                  />
                                  <Area 
                                      type="monotone" 
                                      dataKey="messages" 
                                      name="Recibidos"
                                      stroke="#6366f1" 
                                      strokeWidth={2}
                                      fillOpacity={1} 
                                      fill="url(#colorMessages)" 
                                  />
                                  <Area 
                                      type="monotone" 
                                      dataKey="response" 
                                      name="Enviados"
                                      stroke="#10b981" 
                                      strokeWidth={2}
                                      fillOpacity={1} 
                                      fill="url(#colorResponse)" 
                                  />
                              </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            No hay datos disponibles para este período
                          </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity / Feed */}
            <Card className="col-span-3" data-testid="card-recent-activity">
                <CardHeader>
                    <CardTitle>Actividad Reciente</CardTitle>
                    <CardDescription>Últimos mensajes del inbox</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                          stats.recentActivity.slice(0, 5).map((item) => (
                            <div key={item.id} className="flex items-start gap-4" data-testid={`activity-item-${item.id}`}>
                                <Avatar className="h-9 w-9 border">
                                    <AvatarFallback className="text-xs font-medium">
                                      {getPlatformIcon(item.platform)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none">
                                        <span className="text-indigo-600">{item.author}</span>
                                        {' '}
                                        <span className="text-gray-500">
                                          {item.type === 'message' ? 'envió' : 'respondió'}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-700 truncate">{item.content}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: es })}
                                    </p>
                                </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No hay actividad reciente
                          </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card data-testid="card-platform-breakdown">
          <CardHeader>
            <CardTitle>Mensajes por red social</CardTitle>
            <CardDescription>Entrantes, respuestas y primera respuesta media en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Red social</th>
                    <th className="pb-3 text-right font-medium">Entrantes</th>
                    <th className="pb-3 text-right font-medium">Respuestas</th>
                    <th className="pb-3 text-right font-medium">Primera respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats?.byPlatform ?? {}).map(([platform, platformStats]) => (
                    <tr key={platform} className="border-b last:border-0" data-testid={`platform-row-${platform}`}>
                      <td className="py-3 font-medium">
                        <span className="mr-2" aria-hidden="true">{getPlatformIcon(platform)}</span>
                        {formatPlatformName(platform)}
                      </td>
                      <td className="py-3 text-right tabular-nums">{platformStats.inbound.toLocaleString()}</td>
                      <td className="py-3 text-right tabular-nums">{platformStats.outbound.toLocaleString()}</td>
                      <td className="py-3 text-right tabular-nums">
                        {formatResponseTime(platformStats.avgResponseTimeMs)}
                        <span className="ml-1 text-xs text-muted-foreground">({platformStats.responseSamples})</span>
                      </td>
                    </tr>
                  ))}
                  {Object.keys(stats?.byPlatform ?? {}).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No hay mensajes en este período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
