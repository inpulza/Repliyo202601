import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNexus } from '@/context/NexusContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart3, 
  Bot,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  Cpu,
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
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MobilePageHeader,
  MobileStatCard,
  MobileStatGrid,
  MobileCard,
  MobileCardHeader,
  MobileSpacer,
  MobileContainer,
  MobileSectionDivider,
  MobileListRow,
  MobileListGroup
} from '@/components/ui/mobile-primitives';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AiMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
  totalPromptCostUsd: number;
  totalCompletionCostUsd: number;
  byPlatform: Record<string, number>;
  byAction: Record<string, number>;
  byModel: Record<string, { count: number; tokens: number; costUsd: number }>;
  dailyStats: Array<{ date: string; count: number; tokens: number; costUsd: number }>;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export function AiMetrics() {
  const { activeClient, isLoadingClients } = useNexus();
  const [days, setDays] = React.useState('30');

  const { data: metrics, isLoading, error } = useQuery<AiMetrics>({
    queryKey: ['ai-metrics', activeClient?.id, days],
    queryFn: async () => {
      if (!activeClient?.id) return null;
      const response = await fetch(`/api/ai-agent/${activeClient.id}/metrics?days=${days}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
    enabled: !!activeClient?.id,
  });

  if (isLoadingClients) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!activeClient) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Selecciona una marca</h2>
          <p className="text-gray-500 mt-2">Elige una marca para ver las métricas de IA</p>
        </div>
      </div>
    );
  }

  const platformData = metrics ? Object.entries(metrics.byPlatform).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  })) : [];

  const actionData = metrics ? Object.entries(metrics.byAction).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value
  })) : [];

  const successRate = metrics && metrics.totalRequests > 0 
    ? ((metrics.successCount / metrics.totalRequests) * 100).toFixed(1) 
    : '0';

  const periodOptions = [
    { label: '7 días', value: '7' },
    { label: '14 días', value: '14' },
    { label: '30 días', value: '30' },
    { label: '60 días', value: '60' },
    { label: '90 días', value: '90' },
  ];

  const periodSelector = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 text-xs" data-testid="button-period-selector-mobile">
          {periodOptions.find(p => p.value === days)?.label || '30 días'}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {periodOptions.map(option => (
          <DropdownMenuItem 
            key={option.value}
            onClick={() => setDays(option.value)}
          >
            Últimos {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50/50 overflow-y-auto">
      {/* Mobile View */}
      <MobileContainer>
        <MobilePageHeader 
          title="Métricas de IA" 
          subtitle={activeClient.name}
          rightElement={periodSelector}
        />
        
        {isLoading ? (
          <div className="md:hidden flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="md:hidden p-4 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Error al cargar métricas</p>
          </div>
        ) : metrics && metrics.totalRequests === 0 ? (
          <div className="md:hidden p-8 text-center">
            <Bot className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Sin datos de IA</p>
            <p className="text-xs text-muted-foreground mt-1">No hay solicitudes en los últimos {days} días</p>
          </div>
        ) : (
          <>
            <MobileSpacer size="md" />
            
            <MobileStatGrid columns={2}>
              <MobileStatCard
                icon={<Activity className="h-4 w-4" />}
                iconColor="text-indigo-500"
                label="Solicitudes"
                value={(metrics?.totalRequests || 0).toLocaleString()}
                testId="mobile-stat-requests"
              />
              <MobileStatCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                iconColor="text-green-500"
                label="Tasa Éxito"
                value={`${successRate}%`}
                subtitle={`${metrics?.errorCount || 0} errores`}
                testId="mobile-stat-success"
              />
              <MobileStatCard
                icon={<Zap className="h-4 w-4" />}
                iconColor="text-yellow-500"
                label="Tokens"
                value={(metrics?.totalTokens || 0).toLocaleString()}
                testId="mobile-stat-tokens"
              />
              <MobileStatCard
                icon={<DollarSign className="h-4 w-4" />}
                iconColor="text-green-600"
                label="Gasto Total"
                value={`$${metrics?.totalCostUsd?.toFixed(4) || '0.00'}`}
                testId="mobile-stat-cost"
              />
            </MobileStatGrid>
            
            <MobileSpacer size="lg" />
            
            <div className="md:hidden px-4">
              <MobileCard noPadding>
                <div className="p-4 border-b border-border">
                  <MobileCardHeader 
                    title="Actividad Diaria" 
                    icon={<BarChart3 className="h-4 w-4" />}
                  />
                </div>
                <div className="h-[180px] p-2">
                  {metrics && metrics.dailyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 9 }}
                          tickFormatter={(value) => {
                            const d = new Date(value);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          name="Solicitudes"
                          stroke="#6366f1" 
                          fill="#6366f1" 
                          fillOpacity={0.2} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Sin datos
                    </div>
                  )}
                </div>
              </MobileCard>
            </div>
            
            <MobileSpacer size="lg" />
            
            {metrics?.byModel && Object.keys(metrics.byModel).length > 0 && (
              <>
                <MobileSectionDivider title="Uso por Modelo" />
                <MobileListGroup>
                  {Object.entries(metrics.byModel)
                    .sort(([, a], [, b]) => b.costUsd - a.costUsd)
                    .map(([model, data]) => (
                      <MobileListRow
                        key={model}
                        icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
                        title={model}
                        subtitle={`${data.count.toLocaleString()} solicitudes • ${data.tokens.toLocaleString()} tokens`}
                        rightText={`$${data.costUsd.toFixed(4)}`}
                        showChevron={false}
                        testId={`mobile-model-${model}`}
                      />
                    ))}
                </MobileListGroup>
              </>
            )}
          </>
        )}
      </MobileContainer>

      {/* Desktop View */}
      <div className="hidden md:block p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900" data-testid="text-page-title">
              Métricas de IA
            </h1>
            <p className="text-gray-500 mt-1">
              Estadísticas de uso del agente IA para <span className="font-medium text-gray-900">{activeClient.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[180px]" data-testid="select-days-range">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="14">Últimos 14 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="60">Últimos 60 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">Error al cargar las métricas</p>
            </CardContent>
          </Card>
        ) : metrics && metrics.totalRequests === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Sin datos de IA</h3>
              <p className="text-gray-500 mt-2">
                No hay solicitudes de IA registradas en los últimos {days} días.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Configura y activa el agente IA para empezar a generar métricas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-total-requests">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Solicitudes</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-requests">
                    {metrics?.totalRequests.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    En los últimos {days} días
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-success-rate">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-success-rate">
                    {successRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.successCount || 0} exitosas, {metrics?.errorCount || 0} errores
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-tokens">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tokens Usados</CardTitle>
                  <Zap className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-tokens">
                    {metrics?.totalTokens.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tokens de entrada y salida
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-avg-tokens">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Promedio por Solicitud</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-tokens">
                    {metrics && metrics.totalRequests > 0 
                      ? Math.round(metrics.totalTokens / metrics.totalRequests).toLocaleString() 
                      : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tokens por solicitud
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tarjetas de Costos */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-total-cost" className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-800">Gasto Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700" data-testid="text-total-cost">
                    ${metrics?.totalCostUsd?.toFixed(4) || '0.0000'}
                  </div>
                  <p className="text-xs text-green-600">
                    USD en los últimos {days} días
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-prompt-cost">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Costo Entrada</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600" data-testid="text-prompt-cost">
                    ${metrics?.totalPromptCostUsd?.toFixed(4) || '0.0000'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.totalPromptTokens?.toLocaleString() || 0} tokens de entrada
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-completion-cost">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Costo Salida</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600" data-testid="text-completion-cost">
                    ${metrics?.totalCompletionCostUsd?.toFixed(4) || '0.0000'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.totalCompletionTokens?.toLocaleString() || 0} tokens de salida
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-avg-cost">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Costo Promedio</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-cost">
                    ${metrics && metrics.totalRequests > 0 
                      ? (metrics.totalCostUsd / metrics.totalRequests).toFixed(6) 
                      : '0.000000'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    USD por solicitud
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card data-testid="card-daily-chart">
                <CardHeader>
                  <CardTitle>Actividad Diaria</CardTitle>
                  <CardDescription>Solicitudes y tokens por día</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {metrics && metrics.dailyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => {
                              const d = new Date(value);
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            name="Solicitudes"
                            stroke="#6366f1" 
                            fill="#6366f1" 
                            fillOpacity={0.2} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        Sin datos disponibles
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-tokens-chart">
                <CardHeader>
                  <CardTitle>Consumo de Tokens</CardTitle>
                  <CardDescription>Tokens usados por día</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {metrics && metrics.dailyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => {
                              const d = new Date(value);
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                          />
                          <Bar 
                            dataKey="tokens" 
                            name="Tokens"
                            fill="#8b5cf6" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        Sin datos disponibles
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfica de Costos Diarios */}
            <Card data-testid="card-daily-cost-chart">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Gasto Diario
                </CardTitle>
                <CardDescription>Costo en USD por día</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {metrics && metrics.dailyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.dailyStats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            const d = new Date(value);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }} 
                          tickFormatter={(value) => `$${value.toFixed(4)}`}
                        />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                          formatter={(value: number) => [`$${value.toFixed(6)}`, 'Costo']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="costUsd" 
                          name="Costo USD"
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.3} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Sin datos de costos disponibles
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Uso por Modelo */}
            {metrics?.byModel && Object.keys(metrics.byModel).length > 0 && (
              <Card data-testid="card-model-usage">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Uso por Modelo
                  </CardTitle>
                  <CardDescription>Desglose de solicitudes, tokens y costos por modelo de IA</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium text-gray-600">Modelo</th>
                          <th className="text-right py-3 px-2 font-medium text-gray-600">Solicitudes</th>
                          <th className="text-right py-3 px-2 font-medium text-gray-600">Tokens</th>
                          <th className="text-right py-3 px-2 font-medium text-gray-600">Costo USD</th>
                          <th className="text-right py-3 px-2 font-medium text-gray-600">Costo/Solicitud</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(metrics.byModel)
                          .sort(([, a], [, b]) => b.costUsd - a.costUsd)
                          .map(([model, data]) => (
                            <tr key={model} className="border-b hover:bg-gray-50" data-testid={`row-model-${model}`}>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {model}
                                  </Badge>
                                </div>
                              </td>
                              <td className="text-right py-3 px-2 font-medium">
                                {data.count.toLocaleString()}
                              </td>
                              <td className="text-right py-3 px-2 text-gray-600">
                                {data.tokens.toLocaleString()}
                              </td>
                              <td className="text-right py-3 px-2 text-green-600 font-medium">
                                ${data.costUsd.toFixed(4)}
                              </td>
                              <td className="text-right py-3 px-2 text-gray-500">
                                ${data.count > 0 ? (data.costUsd / data.count).toFixed(6) : '0.000000'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-medium">
                          <td className="py-3 px-2">Total</td>
                          <td className="text-right py-3 px-2">{metrics.totalRequests.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{metrics.totalTokens.toLocaleString()}</td>
                          <td className="text-right py-3 px-2 text-green-700">${metrics.totalCostUsd.toFixed(4)}</td>
                          <td className="text-right py-3 px-2 text-gray-600">
                            ${metrics.totalRequests > 0 ? (metrics.totalCostUsd / metrics.totalRequests).toFixed(6) : '0.000000'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Card data-testid="card-platform-distribution">
                <CardHeader>
                  <CardTitle>Distribución por Plataforma</CardTitle>
                  <CardDescription>Solicitudes de IA por red social</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {platformData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={platformData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {platformData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        Sin datos de plataforma
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-action-distribution">
                <CardHeader>
                  <CardTitle>Tipos de Acción</CardTitle>
                  <CardDescription>Distribución de acciones del agente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {actionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={actionData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                          <Tooltip />
                          <Bar dataKey="value" name="Solicitudes" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        Sin datos de acciones
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
