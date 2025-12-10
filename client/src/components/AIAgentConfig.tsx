import React, { useEffect, useState, useMemo } from 'react';
import { useNexus } from '@/context/NexusContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AiAgent, AiAgentAuditLog, SocialAccount } from '@shared/schema';
import { DYNAMIC_VARIABLES } from '@shared/dynamicVariables';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Bot, Settings, MessageSquare, Zap, Shield, History, 
  Play, Save, Loader2, Sparkles, Brain, BookOpen,
  Clock, AlertTriangle, CheckCircle, XCircle, Share2, Variable, Copy,
  ChevronDown, ChevronUp, Filter, RotateCcw, Eye
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MODELS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido y económico)' },
    { value: 'gpt-4o', label: 'GPT-4o (Más potente)' },
    { value: 'gpt-4.1', label: 'GPT-4.1 (Último modelo)' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Potente)' },
  ],
};

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente de atención al cliente profesional y amigable. Tu objetivo es ayudar a los usuarios con sus consultas de manera clara y concisa.

Instrucciones:
- Responde siempre en español
- Mantén un tono profesional pero cercano
- Sé conciso y ve al grano
- Si no sabes algo, admítelo honestamente`;

const PLATFORM_CONFIG = {
  facebook: { name: 'Facebook', icon: FaFacebook, color: 'text-blue-600', charLimit: 2000 },
  instagram: { name: 'Instagram', icon: FaInstagram, color: 'text-pink-600', charLimit: 2200 },
  twitter: { name: 'Twitter/X', icon: FaTwitter, color: 'text-sky-500', charLimit: 280 },
  tiktok: { name: 'TikTok', icon: FaTiktok, color: 'text-gray-900', charLimit: 150 },
  linkedin: { name: 'LinkedIn', icon: FaLinkedin, color: 'text-blue-700', charLimit: 3000 },
  youtube: { name: 'YouTube', icon: FaYoutube, color: 'text-red-600', charLimit: 500 },
};

const DEFAULT_GUARDRAIL = `Restricciones de seguridad:
- No compartas información confidencial de la empresa
- No hagas promesas que no puedas cumplir
- Evita temas políticos, religiosos o controversiales
- Si detectas un cliente muy molesto, sugiere contactar a un agente humano`;

export function AIAgentConfig() {
  const { activeClient, isLoadingClients } = useNexus();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<Partial<AiAgent>>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    knowledgeBase: '',
    guardrailPrompt: DEFAULT_GUARDRAIL,
    autoReplyMode: 'off',
    approvalWorkflow: 'none',
    characterLimitStrategy: 'truncate',
    cooldownSeconds: 0,
    isActive: true,
  });

  const { data: agent, isLoading: isLoadingAgent } = useQuery({
    queryKey: ['aiAgent', activeClient?.id],
    queryFn: () => api.aiAgent.get(activeClient!.id),
    enabled: !!activeClient?.id,
  });

  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['aiAgentAuditLog', activeClient?.id],
    queryFn: () => api.aiAgent.getAuditLog(activeClient!.id, 50),
    enabled: !!activeClient?.id && activeTab === 'history',
  });

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log: AiAgentAuditLog) => {
      if (filterPlatform !== 'all' && log.platform !== filterPlatform) return false;
      if (filterStatus !== 'all' && log.status !== filterStatus) return false;
      return true;
    });
  }, [auditLogs, filterPlatform, filterStatus]);

  const uniquePlatforms = useMemo(() => {
    const platforms = new Set(auditLogs.map((log: AiAgentAuditLog) => log.platform).filter(Boolean));
    return Array.from(platforms) as string[];
  }, [auditLogs]);

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setFilterPlatform('all');
    setFilterStatus('all');
  };

  const getPlatformIcon = (platform: string | null) => {
    if (!platform) return null;
    const config = PLATFORM_CONFIG[platform.toLowerCase() as keyof typeof PLATFORM_CONFIG];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const { data: socialAccounts = [], isLoading: isLoadingSocialAccounts } = useQuery({
    queryKey: ['socialAccounts', activeClient?.id],
    queryFn: () => api.socialAccounts.getByBrand(activeClient!.id),
    enabled: !!activeClient?.id && activeTab === 'platforms',
  });

  const updateSocialAccountMutation = useMutation({
    mutationFn: ({ provider, isActive }: { provider: string; isActive: boolean }) => 
      api.socialAccounts.updateStatus(activeClient!.id, provider, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialAccounts', activeClient?.id] });
      toast({ title: "Actualizado", description: "Estado de la plataforma actualizado." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<AiAgent>) => api.aiAgent.save(activeClient!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiAgent', activeClient?.id] });
      toast({ title: "Configuración Guardada", description: "Los cambios han sido guardados correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        provider: agent.provider || 'openai',
        model: agent.model || 'gpt-4o-mini',
        temperature: agent.temperature || 0.7,
        maxTokens: agent.maxTokens || 500,
        systemPrompt: agent.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        knowledgeBase: agent.knowledgeBase || '',
        guardrailPrompt: agent.guardrailPrompt || DEFAULT_GUARDRAIL,
        autoReplyMode: agent.autoReplyMode || 'off',
        approvalWorkflow: agent.approvalWorkflow || 'none',
        characterLimitStrategy: agent.characterLimitStrategy || 'truncate',
        cooldownSeconds: agent.cooldownSeconds || 0,
        isActive: agent.isActive ?? true,
      });
    }
  }, [agent]);

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleTestPlayground = async () => {
    if (!testMessage.trim()) return;
    setIsTesting(true);
    setTestResponse('');
    
    try {
      const result = await api.aiAgent.testGenerate(activeClient!.id, testMessage.trim(), 'instagram');
      
      if (result.success) {
        setTestResponse(result.reply);
        toast({ 
          title: "Respuesta generada", 
          description: `${result.characterCount} caracteres usando ${result.provider}/${result.model}` 
        });
      } else {
        throw new Error(result.error || "Error desconocido");
      }
    } catch (error: any) {
      const errorMessage = error.message || "No se pudo generar la respuesta de prueba";
      setTestResponse(`Error: ${errorMessage}`);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoadingClients || isLoadingAgent) {
    return (
      <div className="h-full flex items-center justify-center bg-background" data-testid="loading-ai-config">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando configuración del agente...</p>
        </div>
      </div>
    );
  }

  if (!activeClient) {
    return (
      <div className="h-full flex items-center justify-center bg-background" data-testid="no-client-selected">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Selecciona una marca para configurar su agente IA</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden" data-testid="ai-agent-config">
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 relative flex items-center justify-center bg-muted/30 rounded-xl p-2 border border-border shrink-0">
              {activeClient.avatar ? (
                <img 
                  src={activeClient.avatar} 
                  alt={activeClient.name} 
                  className="h-full w-full rounded-lg object-cover"
                  data-testid="brand-avatar"
                />
              ) : (
                <Bot className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground" data-testid="brand-name">
                Agente IA: {activeClient.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Configura cómo responderá la IA a los mensajes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="agent-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-agent-active"
              />
              <Label htmlFor="agent-active" className="text-sm text-muted-foreground">
                {formData.isActive ? 'Activo' : 'Inactivo'}
              </Label>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              variant="outline"
              className="gap-2 shadow-none border-border hover:border-primary hover:text-primary hover:bg-primary/5"
              data-testid="button-save-config"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 bg-background">
          <TabsList className="h-12 bg-transparent gap-1 p-0">
            <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-muted rounded-md px-3" data-testid="tab-general">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-2 data-[state=active]:bg-muted rounded-md px-3" data-testid="tab-prompts">
              <Brain className="h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2 data-[state=active]:bg-muted rounded-md px-3" data-testid="tab-automation">
              <Zap className="h-4 w-4" />
              Automatización
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-2 data-[state=active]:bg-muted rounded-md px-3" data-testid="tab-platforms">
              <Share2 className="h-4 w-4" />
              Plataformas
            </TabsTrigger>
            <TabsTrigger value="playground" className="gap-2 data-[state=active]:bg-muted rounded-md px-3" data-testid="tab-playground">
              <Play className="h-4 w-4" />
              Playground
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-muted rounded-md px-3" data-testid="tab-history">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto">
            <TabsContent value="general" className="mt-0 space-y-6">
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Modelo de IA
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Selecciona el proveedor y modelo que usará el agente para generar respuestas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm">Proveedor</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value) => {
                          const models = MODELS[value as keyof typeof MODELS];
                          setFormData({ 
                            ...formData, 
                            provider: value,
                            model: models[0].value
                          });
                        }}
                      >
                        <SelectTrigger data-testid="select-provider" className="shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="gemini">Google Gemini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Modelo</Label>
                      <Select
                        value={formData.model}
                        onValueChange={(value) => setFormData({ ...formData, model: value })}
                      >
                        <SelectTrigger data-testid="select-model" className="shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS[formData.provider as keyof typeof MODELS]?.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Temperatura: {formData.temperature?.toFixed(1)}</Label>
                        <span className="text-xs text-muted-foreground">
                          {(formData.temperature || 0) < 0.3 ? 'Preciso' : (formData.temperature || 0) > 0.7 ? 'Creativo' : 'Balanceado'}
                        </span>
                      </div>
                      <Slider
                        value={[formData.temperature || 0.7]}
                        min={0}
                        max={1}
                        step={0.1}
                        onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
                        data-testid="slider-temperature"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valores bajos = respuestas más consistentes. Valores altos = más variedad.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tokens Máximos: {formData.maxTokens}</Label>
                      <Slider
                        value={[formData.maxTokens || 500]}
                        min={100}
                        max={2000}
                        step={50}
                        onValueChange={([value]) => setFormData({ ...formData, maxTokens: value })}
                        data-testid="slider-max-tokens"
                      />
                      <p className="text-xs text-muted-foreground">
                        Longitud máxima de las respuestas generadas (~4 caracteres por token)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompts" className="mt-0 space-y-6">
              <Card className="border border-border shadow-none bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Variable className="h-4 w-4 text-muted-foreground" />
                    Variables Dinámicas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Usa estas variables en tus prompts para personalizar las respuestas automáticamente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {DYNAMIC_VARIABLES.map((variable) => (
                      <div
                        key={variable.key}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {variable.placeholder}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(variable.placeholder);
                                toast({ title: "Copiado", description: `${variable.placeholder} copiado al portapapeles` });
                              }}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              data-testid={`button-copy-${variable.key}`}
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">Ej: {variable.example}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    System Prompt
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define la personalidad, tono, estructura de respuesta y ejemplos (Few-Shot). Puedes incluir prompts extensos con múltiples secciones.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={formData.systemPrompt || ''}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    placeholder="## 1. Rol y Objetivo&#10;Eres un asistente de IA que emula a...&#10;&#10;## 2. Estilo y Tono&#10;- Profesional y empático&#10;- Clara y accesible&#10;&#10;## 3. Estructura de Respuesta&#10;1. Saludo personalizado&#10;2. Cuerpo del mensaje&#10;3. Cierre con información de contacto&#10;&#10;## 4. Ejemplos de Casos de Uso&#10;**Caso 1:** ...&#10;**Respuesta:** ..."
                    className="min-h-[400px] font-mono text-sm shadow-none resize-y"
                    style={{ maxHeight: '70vh' }}
                    data-testid="textarea-system-prompt"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(formData.systemPrompt?.length || 0).toLocaleString()} caracteres
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    Knowledge Base
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Información del negocio, FAQs, horarios, políticas que el agente debe conocer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.knowledgeBase || ''}
                    onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
                    placeholder="Horarios de atención: Lunes a Viernes 9:00-18:00..."
                    className="min-h-[180px] font-mono text-sm shadow-none"
                    data-testid="textarea-knowledge-base"
                  />
                </CardContent>
              </Card>

              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Guardrails
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Restricciones de seguridad y límites para las respuestas del agente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.guardrailPrompt || ''}
                    onChange={(e) => setFormData({ ...formData, guardrailPrompt: e.target.value })}
                    placeholder="No compartas información confidencial..."
                    className="min-h-[140px] font-mono text-sm shadow-none"
                    data-testid="textarea-guardrails"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation" className="mt-0 space-y-6">
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    Modo de Respuesta Automática
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Controla cómo el agente procesa los mensajes entrantes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'off', label: 'Desactivado', desc: 'Sin respuestas automáticas', icon: XCircle },
                      { value: 'draft', label: 'Borrador', desc: 'Genera borradores para revisar', icon: MessageSquare },
                      { value: 'auto', label: 'Automático', desc: 'Responde automáticamente', icon: Zap },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, autoReplyMode: mode.value })}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          formData.autoReplyMode === mode.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                        data-testid={`button-mode-${mode.value}`}
                      >
                        <mode.icon className={`h-5 w-5 mb-2 ${
                          formData.autoReplyMode === mode.value ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <div className="font-medium text-sm">{mode.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{mode.desc}</div>
                      </button>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Workflow de Aprobación</Label>
                        <p className="text-xs text-muted-foreground">Requiere revisión humana antes de enviar</p>
                      </div>
                      <Select
                        value={formData.approvalWorkflow}
                        onValueChange={(value) => setFormData({ ...formData, approvalWorkflow: value })}
                      >
                        <SelectTrigger className="w-48 shadow-none" data-testid="select-approval-workflow">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin aprobación</SelectItem>
                          <SelectItem value="human_review">Revisión humana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Estrategia de Límite de Caracteres</Label>
                        <p className="text-xs text-muted-foreground">Qué hacer si la respuesta excede el límite</p>
                      </div>
                      <Select
                        value={formData.characterLimitStrategy}
                        onValueChange={(value) => setFormData({ ...formData, characterLimitStrategy: value })}
                      >
                        <SelectTrigger className="w-48 shadow-none" data-testid="select-char-limit-strategy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="truncate">Truncar</SelectItem>
                          <SelectItem value="summarize">Resumir</SelectItem>
                          <SelectItem value="reject">Rechazar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Cooldown entre respuestas</Label>
                          <p className="text-xs text-muted-foreground">
                            Segundos de espera entre respuestas automáticas
                          </p>
                        </div>
                        <span className="text-sm font-medium">{formData.cooldownSeconds}s</span>
                      </div>
                      <Slider
                        value={[formData.cooldownSeconds || 0]}
                        min={0}
                        max={300}
                        step={10}
                        onValueChange={([value]) => setFormData({ ...formData, cooldownSeconds: value })}
                        data-testid="slider-cooldown"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platforms" className="mt-0 space-y-6">
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    Configuración por Plataforma
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Activa o desactiva el agente IA para cada red social conectada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSocialAccounts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : socialAccounts.length === 0 ? (
                    <div className="text-center py-8">
                      <Share2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No hay cuentas sociales conectadas</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Conecta redes sociales desde la configuración de marca
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {socialAccounts.map((account) => {
                        const config = PLATFORM_CONFIG[account.provider as keyof typeof PLATFORM_CONFIG];
                        if (!config) return null;
                        const Icon = config.icon;
                        
                        return (
                          <div 
                            key={account.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                            data-testid={`platform-card-${account.provider}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-muted/30 border border-border">
                                <Icon className={`h-5 w-5 ${config.color}`} />
                              </div>
                              <div>
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {config.name}
                                  {account.accountName && (
                                    <span className="text-xs text-muted-foreground">
                                      @{account.accountName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Límite: {config.charLimit} caracteres
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge 
                                variant="outline"
                                className={account.isActive 
                                  ? "bg-green-50 text-green-700 border-green-200" 
                                  : "bg-muted text-muted-foreground border-border"
                                }
                              >
                                {account.isActive ? 'IA Activa' : 'IA Inactiva'}
                              </Badge>
                              <Switch
                                checked={account.isActive}
                                onCheckedChange={(checked) => 
                                  updateSocialAccountMutation.mutate({ 
                                    provider: account.provider, 
                                    isActive: checked 
                                  })
                                }
                                disabled={updateSocialAccountMutation.isPending}
                                data-testid={`switch-platform-${account.provider}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Límites de Caracteres por Plataforma
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Referencia de límites de caracteres para respuestas en cada plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <div 
                          key={key}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border"
                          data-testid={`char-limit-${key}`}
                        >
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <div>
                            <div className="text-sm font-medium">{config.name}</div>
                            <div className="text-xs text-muted-foreground">{config.charLimit} chars</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="playground" className="mt-0 space-y-6">
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Play className="h-4 w-4 text-muted-foreground" />
                    Área de Pruebas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Prueba cómo responderá el agente con la configuración actual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Mensaje de prueba</Label>
                    <Textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Escribe un mensaje de prueba como si fueras un cliente..."
                      className="min-h-[100px] shadow-none"
                      data-testid="textarea-test-message"
                    />
                  </div>
                  <Button
                    onClick={handleTestPlayground}
                    disabled={isTesting || !testMessage.trim()}
                    variant="outline"
                    className="gap-2 shadow-none border-border hover:border-primary hover:text-primary hover:bg-primary/5"
                    data-testid="button-test-response"
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generar Respuesta
                  </Button>

                  {testResponse && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Respuesta del Agente</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap" data-testid="text-test-response">{testResponse}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-4">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold">Historial de Actividad</h3>
                    <Badge variant="secondary" className="text-xs">
                      {filteredAuditLogs.length} registros
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Filtros:</span>
                  </div>
                  
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="w-[140px] h-8 text-xs shadow-none" data-testid="filter-platform">
                      <SelectValue placeholder="Plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {uniquePlatforms.map(platform => (
                        <SelectItem key={platform} value={platform}>
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(platform)}
                            <span className="capitalize">{platform}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[130px] h-8 text-xs shadow-none" data-testid="filter-status">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="success">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Exitoso
                        </div>
                      </SelectItem>
                      <SelectItem value="failed">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-3 w-3 text-red-500" />
                          Error
                        </div>
                      </SelectItem>
                      <SelectItem value="draft">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 text-amber-500" />
                          Borrador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {(filterPlatform !== 'all' || filterStatus !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-8 text-xs gap-1"
                      data-testid="button-reset-filters"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>

              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {auditLogs.length === 0 
                      ? "No hay actividad registrada aún" 
                      : "No hay resultados con los filtros seleccionados"}
                  </p>
                  {auditLogs.length > 0 && (
                    <Button variant="link" size="sm" onClick={resetFilters} className="mt-2">
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAuditLogs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id);
                    const hasLongContent = (log.inputContent && log.inputContent.length > 100) || 
                                          (log.outputContent && log.outputContent.length > 150);
                    
                    return (
                      <Card 
                        key={log.id} 
                        className="border border-border shadow-none hover:border-muted-foreground/30 transition-colors"
                        data-testid={`audit-log-${log.id}`}
                      >
                        <CardHeader className="pb-3 pt-4 px-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-muted/50">
                                {log.platform ? getPlatformIcon(log.platform) : <Bot className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <code 
                                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => {
                                      const code = log.shortCode || log.id.slice(0, 8);
                                      navigator.clipboard.writeText(code);
                                      toast({ title: "ID Copiado", description: `${code} copiado al portapapeles` });
                                    }}
                                    title="Clic para copiar ID"
                                    data-testid={`log-code-${log.shortCode || log.id.slice(0, 8)}`}
                                  >
                                    {log.shortCode || log.id.slice(0, 8)}
                                  </code>
                                  <span className="font-medium text-sm">{log.action}</span>
                                  {log.platform && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {log.platform}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(log.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={log.status === 'success' ? 'default' : 'destructive'}
                                className={`text-xs ${log.status === 'success' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                              >
                                {log.status === 'success' ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" /> Exitoso</>
                                ) : (
                                  <><XCircle className="h-3 w-3 mr-1" /> Error</>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="px-4 pb-4 pt-0 space-y-3">
                          {log.inputContent && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Mensaje recibido</Label>
                              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                                <p className="text-sm">
                                  {isExpanded ? log.inputContent : log.inputContent.slice(0, 100)}
                                  {!isExpanded && log.inputContent.length > 100 && '...'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {log.outputContent && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Respuesta generada</Label>
                              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <p className="text-sm">
                                  {isExpanded ? log.outputContent : log.outputContent.slice(0, 150)}
                                  {!isExpanded && log.outputContent.length > 150 && '...'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {log.promptTokens && (
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs font-normal">
                                Prompt: {log.promptTokens} tokens
                              </Badge>
                              <Badge variant="outline" className="text-xs font-normal">
                                Respuesta: {log.completionTokens} tokens
                              </Badge>
                              {log.characterCount && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {log.characterCount} caracteres
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {log.errorReason && (
                            <Alert variant="destructive" className="max-h-32 overflow-y-auto">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle className="text-sm">Error al procesar</AlertTitle>
                              <AlertDescription className="text-xs mt-1 font-mono break-all">
                                {log.errorReason.length > 200 ? (
                                  <>
                                    {isExpanded ? log.errorReason : log.errorReason.slice(0, 200) + '...'}
                                  </>
                                ) : log.errorReason}
                              </AlertDescription>
                              {log.errorReason.length > 200 && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="mt-2 h-6 text-xs">
                                      <Eye className="h-3 w-3 mr-1" /> Ver completo
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Detalle del Error</DialogTitle>
                                    </DialogHeader>
                                    <div className="p-4 bg-muted rounded-lg font-mono text-xs whitespace-pre-wrap break-all">
                                      {log.errorReason}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(log.errorReason || '');
                                        toast({ title: "Copiado", description: "Error copiado al portapapeles" });
                                      }}
                                    >
                                      <Copy className="h-4 w-4 mr-2" /> Copiar error
                                    </Button>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </Alert>
                          )}
                        </CardContent>
                        
                        {hasLongContent && (
                          <CardFooter className="px-4 py-2 border-t border-border bg-muted/20">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLogExpanded(log.id)}
                              className="w-full h-7 text-xs gap-1"
                              data-testid={`button-expand-${log.id}`}
                            >
                              {isExpanded ? (
                                <><ChevronUp className="h-3 w-3" /> Mostrar menos</>
                              ) : (
                                <><ChevronDown className="h-3 w-3" /> Ver contenido completo</>
                              )}
                            </Button>
                          </CardFooter>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
