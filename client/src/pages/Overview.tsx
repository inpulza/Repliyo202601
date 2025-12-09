import React, { useState } from 'react';
import { useNexus } from '@/context/NexusContext';
import { useQuery } from '@tanstack/react-query';
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
    Send
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface InboxStats {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  totalConversations: number;
  openConversations: number;
  closedConversations: number;
  uniqueContacts: number;
  avgResponseTimeMs: number | null;
  byPlatform: Record<string, { inbound: number; outbound: number }>;
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
}

const periodOptions = [
  { label: 'Últimos 7 días', value: 7 },
  { label: 'Últimos 14 días', value: 14 },
  { label: 'Últimos 30 días', value: 30 },
];

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

export function Overview() {
  const { activeClient, isLoadingClients } = useNexus();
  const [days, setDays] = useState(7);
  
  const { data: stats, isLoading: isLoadingStats } = useQuery<InboxStats>({
    queryKey: ['/api/inbox-stats', activeClient?.id, days],
    queryFn: async () => {
      if (!activeClient?.id) return null;
      const res = await fetch(`/api/inbox-stats/${activeClient.id}?days=${days}`, {
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
    name: format(new Date(day.date), 'EEE', { locale: es }),
    fullDate: format(new Date(day.date), 'dd MMM', { locale: es }),
    messages: day.inbound,
    response: day.outbound,
  })) || [];

  const selectedPeriod = periodOptions.find(p => p.value === days);

  return (
    <div className="h-full flex flex-col bg-gray-50/50 overflow-y-auto">
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
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
                  {selectedPeriod?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {periodOptions.map(option => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => setDays(option.value)}
                    data-testid={`menu-item-period-${option.value}`}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
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
                        promedio de respuesta
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
      </div>
    </div>
  );
}
