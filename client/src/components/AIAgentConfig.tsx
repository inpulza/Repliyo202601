import React, { useEffect, useState, useMemo } from 'react';
import { useNexus } from '@/context/NexusContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AiAgent, AiAgentAuditLog, SocialAccount, PlaygroundTemplate } from '@shared/schema';
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
  ChevronDown, ChevronUp, Filter, RotateCcw, Eye, Info, Pencil, X,
  FileText, Plus, Trash2, Tag
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaYoutube, FaGoogle } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MODELS = {
  openai: [
    { value: 'gpt-5.1', label: 'GPT-5.1 (Más potente)', tier: 'premium' },
    { value: 'gpt-5', label: 'GPT-5', tier: 'premium' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini', tier: 'standard' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano (Económico)', tier: 'economy' },
    { value: 'gpt-4.1', label: 'GPT-4.1', tier: 'standard' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', tier: 'economy' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (Muy económico)', tier: 'economy' },
    { value: 'gpt-4o', label: 'GPT-4o', tier: 'standard' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)', tier: 'economy' },
    { value: 'o4-mini', label: 'O4 Mini (Razonamiento)', tier: 'standard' },
    { value: 'o3', label: 'O3 (Razonamiento avanzado)', tier: 'premium' },
    { value: 'o3-mini', label: 'O3 Mini (Razonamiento)', tier: 'standard' },
  ],
  gemini: [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Más potente)', tier: 'premium' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Razonamiento)', tier: 'standard' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)', tier: 'economy' },
  ],
};

const TRANSCRIPTION_PROVIDERS = [
  { value: 'gemini', label: 'Gemini', description: 'Usa el modelo Gemini configurado para transcribir audio', requiresOwnKey: false },
  { value: 'openai', label: 'OpenAI Whisper', description: 'Usa tu API key de OpenAI para transcripción', requiresOwnKey: true },
];

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
  google: { name: 'Google Business', icon: FaGoogle, color: 'text-red-500', charLimit: 1500 },
};

function normalizeProviderKey(provider: string): keyof typeof PLATFORM_CONFIG | null {
  const normalized = provider.toLowerCase().replace(/-/g, '_');
  if (normalized in PLATFORM_CONFIG) return normalized as keyof typeof PLATFORM_CONFIG;
  if (normalized === 'google_business' || normalized === 'gmb') return 'google';
  if (normalized === 'x') return 'twitter';
  const baseProvider = normalized.split('_')[0];
  if (baseProvider in PLATFORM_CONFIG) return baseProvider as keyof typeof PLATFORM_CONFIG;
  return null;
}

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
  
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    field: 'systemPrompt' | 'knowledgeBase' | 'guardrailPrompt' | null;
    title: string;
    value: string;
  }>({ isOpen: false, field: null, title: '', value: '' });

  const [saveAsTemplateModal, setSaveAsTemplateModal] = useState<{
    isOpen: boolean;
    content: string;
    title: string;
    category: string;
  }>({ isOpen: false, content: '', title: '', category: 'general' });

  const [editTemplateModal, setEditTemplateModal] = useState<{
    isOpen: boolean;
    id: string;
    content: string;
    title: string;
    category: string;
  }>({ isOpen: false, id: '', content: '', title: '', category: 'general' });

  const openEditModal = (field: 'systemPrompt' | 'knowledgeBase' | 'guardrailPrompt', title: string) => {
    setEditModal({
      isOpen: true,
      field,
      title,
      value: formData[field] || '',
    });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, field: null, title: '', value: '' });
  };

  const saveEditModal = () => {
    if (editModal.field) {
      setFormData({ ...formData, [editModal.field]: editModal.value });
      toast({ title: "Actualizado", description: `${editModal.title} actualizado. Recuerda guardar los cambios.` });
    }
    closeEditModal();
  };

  const [formData, setFormData] = useState<Partial<AiAgent>>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    transcriptionProvider: 'gemini',
    temperature: 0.7,
    maxTokens: 500,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    knowledgeBase: '',
    guardrailPrompt: DEFAULT_GUARDRAIL,
    autoReplyMode: 'off',
    characterLimitStrategy: 'reject',
    cooldownEnabled: true,
    cooldownSeconds: 30,
    cooldownRandomness: 0,
    cooldownPerConversation: true,
    dmBatchDelaySeconds: 50,
    dmReplyMode: 'batch',
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

  // Templates state and queries
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ category: 'general', title: '', content: '' });
  
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['playgroundTemplates', activeClient?.id, templateCategory],
    queryFn: () => api.templates.getAll(activeClient!.id, templateCategory),
    enabled: !!activeClient?.id && activeTab === 'playground',
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: { category: string; title: string; content: string }) => 
      api.templates.create(activeClient!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playgroundTemplates', activeClient?.id] });
      setShowNewTemplateForm(false);
      setNewTemplate({ category: 'general', title: '', content: '' });
      toast({ title: "Plantilla creada", description: "La plantilla se ha guardado correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => api.templates.delete(activeClient!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playgroundTemplates', activeClient?.id] });
      toast({ title: "Plantilla eliminada", description: "La plantilla se ha eliminado." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const incrementUsageMutation = useMutation({
    mutationFn: (id: string) => api.templates.incrementUsage(activeClient!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playgroundTemplates', activeClient?.id] });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: { id: string; category: string; title: string; content: string }) => 
      api.templates.update(activeClient!.id, data.id, { category: data.category, title: data.title, content: data.content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playgroundTemplates', activeClient?.id] });
      setEditTemplateModal({ isOpen: false, id: '', content: '', title: '', category: 'general' });
      toast({ title: "Plantilla actualizada", description: "Los cambios se han guardado correctamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyTemplate = async (template: PlaygroundTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      incrementUsageMutation.mutate(template.id);
      toast({ title: "Copiado", description: "Respuesta copiada al portapapeles." });
    } catch (err) {
      toast({ title: "Error", description: "No se pudo copiar al portapapeles.", variant: "destructive" });
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'informacional': 'Información',
      'comercial': 'Comercial',
      'soporte': 'Soporte',
      'general': 'General'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'informacional': 'bg-blue-100 text-blue-700 border-blue-200',
      'comercial': 'bg-green-100 text-green-700 border-green-200',
      'soporte': 'bg-amber-100 text-amber-700 border-amber-200',
      'general': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[category] || colors['general'];
  };

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
    const providerKey = normalizeProviderKey(platform);
    if (!providerKey) return null;
    const config = PLATFORM_CONFIG[providerKey];
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const { data: socialAccounts = [], isLoading: isLoadingSocialAccounts } = useQuery({
    queryKey: ['socialAccounts', activeClient?.id],
    queryFn: () => api.socialAccounts.getByBrand(activeClient!.id),
    enabled: !!activeClient?.id && (activeTab === 'platforms' || activeTab === 'orchestration'),
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
        transcriptionProvider: agent.transcriptionProvider || 'gemini',
        temperature: agent.temperature || 0.7,
        maxTokens: agent.maxTokens || 500,
        systemPrompt: agent.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        knowledgeBase: agent.knowledgeBase || '',
        guardrailPrompt: agent.guardrailPrompt || DEFAULT_GUARDRAIL,
        autoReplyMode: agent.autoReplyMode || 'off',
        characterLimitStrategy: agent.characterLimitStrategy || 'reject',
        cooldownEnabled: agent.cooldownEnabled ?? false,
        cooldownSeconds: agent.cooldownSeconds || 0,
        cooldownRandomness: agent.cooldownRandomness || 0,
        cooldownPerConversation: agent.cooldownPerConversation ?? true,
        dmBatchDelaySeconds: agent.dmBatchDelaySeconds || 30,
        dmReplyMode: agent.dmReplyMode || 'batch',
        platformSettings: agent.platformSettings || undefined,
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
      {/* Header - Responsive */}
      <div className="border-b bg-background px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand info */}
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
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-xl font-semibold tracking-tight text-foreground truncate" data-testid="brand-name">
                Agente IA: {activeClient.name}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                Configura cómo responderá la IA a los mensajes
              </p>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="agent-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-agent-active"
              />
              <Label htmlFor="agent-active" className="text-xs md:text-sm text-muted-foreground">
                {formData.isActive ? 'Activo' : 'Inactivo'}
              </Label>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              variant="outline"
              size="sm"
              className="gap-2 shadow-none border-border hover:border-primary hover:text-primary hover:bg-primary/5"
              data-testid="button-save-config"
              aria-label="Guardar configuración"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Guardar</span>
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs - Horizontal scroll on mobile */}
        <div className="border-b bg-background overflow-x-auto">
          <div className="px-4 md:px-6 min-w-max">
            <TabsList className="h-11 md:h-12 bg-transparent gap-0.5 md:gap-1 p-0">
              <TabsTrigger value="general" className="gap-1.5 md:gap-2 data-[state=active]:bg-muted rounded-md px-2.5 md:px-3 text-xs md:text-sm" data-testid="tab-general">
                <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="prompts" className="gap-1.5 md:gap-2 data-[state=active]:bg-muted rounded-md px-2.5 md:px-3 text-xs md:text-sm" data-testid="tab-prompts">
                <Brain className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Prompts
              </TabsTrigger>
              <TabsTrigger value="automation" className="gap-1.5 md:gap-2 data-[state=active]:bg-muted rounded-md px-2.5 md:px-3 text-xs md:text-sm" data-testid="tab-automation">
                <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Automatización</span>
                <span className="sm:hidden">Auto</span>
              </TabsTrigger>
              <TabsTrigger value="platforms" className="gap-1.5 md:gap-2 data-[state=active]:bg-muted rounded-md px-2.5 md:px-3 text-xs md:text-sm" data-testid="tab-platforms">
                <Share2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Plataformas</span>
                <span className="sm:hidden">Redes</span>
              </TabsTrigger>
              <TabsTrigger value="orchestration" className="gap-1.5 md:gap-2 data-[state=active]:bg-muted rounded-md px-2.5 md:px-3 text-xs md:text-sm" data-testid="tab-orchestration">
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Orquestación</span>
                <span className="sm:hidden">Tiempo</span>
              </TabsTrigger>
              <TabsTrigger value="playground" className="gap-1.5 md:gap-2 data-[state=active]:bg-muted rounded-md px-2.5 md:px-3 text-xs md:text-sm" data-testid="tab-playground">
                <Play className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Playground</span>
                <span className="sm:hidden">Test</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 md:gap-2 data-[state=active]:bg-muted rounded-md px-2.5 md:px-3 text-xs md:text-sm" data-testid="tab-history">
                <History className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Historial</span>
                <span className="sm:hidden">Hist</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 max-w-4xl mx-auto">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <Label className="text-sm">Transcripción de Audio</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Proveedor para transcribir mensajes de voz
                        </p>
                      </div>
                      <Select
                        value={formData.transcriptionProvider || 'gemini'}
                        onValueChange={(value) => setFormData({ ...formData, transcriptionProvider: value })}
                      >
                        <SelectTrigger data-testid="select-transcription" className="w-full sm:w-48 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSCRIPTION_PROVIDERS.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <p className={`text-xs ${formData.transcriptionProvider === 'openai' ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {formData.transcriptionProvider === 'openai' 
                        ? 'OpenAI Whisper utiliza tu API key configurada (OPENAI_API_KEY).'
                        : 'Gemini usa el modelo de respuestas configurado para transcribir audio (2.5 Flash, 2.5 Pro, o 3 Pro).'
                      }
                    </p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      System Prompt
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal('systemPrompt', 'System Prompt')}
                        className="h-8 gap-2 text-xs"
                        data-testid="button-edit-system-prompt"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (formData.systemPrompt) {
                            navigator.clipboard.writeText(formData.systemPrompt);
                            toast({ title: "Copiado", description: "System Prompt copiado al portapapeles" });
                          }
                        }}
                        disabled={!formData.systemPrompt}
                        className="h-8 gap-2 text-xs"
                        data-testid="button-copy-system-prompt"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </Button>
                    </div>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      Knowledge Base
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal('knowledgeBase', 'Knowledge Base')}
                        className="h-8 gap-2 text-xs"
                        data-testid="button-edit-knowledge-base"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (formData.knowledgeBase) {
                            navigator.clipboard.writeText(formData.knowledgeBase);
                            toast({ title: "Copiado", description: "Knowledge Base copiado al portapapeles" });
                          }
                        }}
                        disabled={!formData.knowledgeBase}
                        className="h-8 gap-2 text-xs"
                        data-testid="button-copy-knowledge-base"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </Button>
                    </div>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Guardrails
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal('guardrailPrompt', 'Guardrails')}
                        className="h-8 gap-2 text-xs"
                        data-testid="button-edit-guardrails"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (formData.guardrailPrompt) {
                            navigator.clipboard.writeText(formData.guardrailPrompt);
                            toast({ title: "Copiado", description: "Guardrails copiado al portapapeles" });
                          }
                        }}
                        disabled={!formData.guardrailPrompt}
                        className="h-8 gap-2 text-xs"
                        data-testid="button-copy-guardrails"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </Button>
                    </div>
                  </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {[
                      { value: 'off', label: 'Desactivado', desc: 'Sin respuestas automáticas', icon: XCircle },
                      { value: 'auto', label: 'Automático', desc: 'Responde automáticamente', icon: Zap },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, autoReplyMode: mode.value })}
                        className={`p-3 md:p-4 rounded-lg border text-left transition-all ${
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <Label className="text-sm">Estrategia de Límite de Caracteres</Label>
                        <p className="text-xs text-muted-foreground">Qué hacer si la respuesta excede el límite de la plataforma</p>
                      </div>
                      <Select
                        value={formData.characterLimitStrategy}
                        onValueChange={(value) => setFormData({ ...formData, characterLimitStrategy: value })}
                      >
                        <SelectTrigger className="w-full sm:w-48 shadow-none" data-testid="select-char-limit-strategy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summarize">Resumir con IA</SelectItem>
                          <SelectItem value="reject">Rechazar y registrar error</SelectItem>
                        </SelectContent>
                      </Select>
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
                        const providerKey = normalizeProviderKey(account.provider);
                        if (!providerKey) return null;
                        const config = PLATFORM_CONFIG[providerKey];
                        const Icon = config.icon;
                        
                        return (
                          <div 
                            key={account.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors gap-3"
                            data-testid={`platform-card-${providerKey}`}
                          >
                            <div className="flex items-center gap-3 md:gap-4">
                              <div className="p-2 rounded-lg bg-muted/30 border border-border shrink-0">
                                <Icon className={`h-5 w-5 ${config.color}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                                  {config.name}
                                  {account.accountName && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      @{account.accountName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Límite: {config.charLimit} caracteres
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 ml-11 sm:ml-0">
                              <Badge 
                                variant="outline"
                                className={`text-xs ${account.isActive 
                                  ? "bg-green-50 text-green-700 border-green-200" 
                                  : "bg-muted text-muted-foreground border-border"
                                }`}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
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

            <TabsContent value="orchestration" className="mt-0 space-y-6">
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Orquestación de Respuestas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configura los tiempos de espera antes de responder para dar una experiencia más natural
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Cooldown entre respuestas</Label>
                        <p className="text-xs text-muted-foreground">
                          Tiempo de espera después de responder antes de poder responder de nuevo
                        </p>
                      </div>
                      <Switch
                        checked={formData.cooldownEnabled || false}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, cooldownEnabled: checked }))}
                        data-testid="switch-cooldown-enabled"
                      />
                    </div>

                    {formData.cooldownEnabled && (
                      <div className="space-y-4 pl-4 border-l-2 border-border">
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <Label className="text-sm">Segundos de cooldown</Label>
                            <span className="text-sm font-medium">{formData.cooldownSeconds || 0}s</span>
                          </div>
                          <Slider
                            value={[formData.cooldownSeconds || 0]}
                            min={0}
                            max={60}
                            step={1}
                            onValueChange={([value]) => setFormData(prev => ({ ...prev, cooldownSeconds: value }))}
                            data-testid="slider-cooldown"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                              <Label className="text-sm">Variación aleatoria</Label>
                              <p className="text-xs text-muted-foreground">
                                Añade ±{formData.cooldownRandomness || 0}s para parecer más humano
                              </p>
                            </div>
                            <span className="text-sm font-medium">±{formData.cooldownRandomness || 0}s</span>
                          </div>
                          <Slider
                            value={[formData.cooldownRandomness || 0]}
                            min={0}
                            max={30}
                            step={1}
                            onValueChange={([value]) => setFormData(prev => ({ ...prev, cooldownRandomness: value }))}
                            data-testid="slider-cooldown-randomness"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div>
                            <Label className="text-sm">Cooldown por conversación</Label>
                            <p className="text-xs text-muted-foreground">
                              Cada conversación tiene su propio cooldown independiente
                            </p>
                          </div>
                          <Switch
                            checked={formData.cooldownPerConversation || false}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, cooldownPerConversation: checked }))}
                            data-testid="switch-cooldown-per-conversation"
                          />
                        </div>
                        
                        <Alert className="border-border">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {formData.cooldownPerConversation 
                              ? "Cada usuario puede recibir respuestas independientemente - responder a Juan no afecta a María"
                              : "El cooldown es global - responder a cualquier usuario bloquea respuestas a todos"
                            }
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Buffer de DMs</Label>
                      <p className="text-xs text-muted-foreground">
                        Tiempo de espera para acumular mensajes consecutivos en DMs
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <Label className="text-sm">Segundos de buffer (base)</Label>
                        <span className="text-sm font-medium">{formData.dmBatchDelaySeconds || 30}s</span>
                      </div>
                      <Slider
                        value={[formData.dmBatchDelaySeconds || 30]}
                        min={5}
                        max={120}
                        step={5}
                        onValueChange={([value]) => setFormData({ ...formData, dmBatchDelaySeconds: value })}
                        data-testid="slider-dm-buffer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Cuando el usuario envía varios mensajes seguidos en DM, el agente espera {formData.dmBatchDelaySeconds || 30}s 
                        para acumularlos y responder una sola vez
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="text-sm flex items-center gap-2">
                      Modo de respuesta en DMs
                    </Label>
                    <Select
                      value={formData.dmReplyMode || 'batch'}
                      onValueChange={(value) => setFormData({ ...formData, dmReplyMode: value })}
                    >
                      <SelectTrigger className="w-full shadow-none" data-testid="select-dm-reply-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático - Sin buffer (responde inmediatamente)</SelectItem>
                        <SelectItem value="batch">Buffer - Acumula mensajes antes de responder</SelectItem>
                        <SelectItem value="first_only">Solo primero - Responde al primer mensaje, ignora resto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    Configuración por Red Social
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Sobrescribe los tiempos de espera para redes sociales específicas. Si no se configura, usa los valores base.
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
                        Conecta redes sociales para configurar tiempos específicos
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {socialAccounts.map((account) => {
                        const providerKey = normalizeProviderKey(account.provider);
                        if (!providerKey) return null;
                        const config = PLATFORM_CONFIG[providerKey];
                        const Icon = config.icon;
                        const provider = providerKey;
                        const platformSettings = (formData.platformSettings as Record<string, any>) || {};
                        const channelSettings = platformSettings[provider] || {};
                        const hasOverride = Object.keys(channelSettings).length > 0;
                        
                        return (
                          <Collapsible key={account.id}>
                            <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted/30 border border-border">
                                  <Icon className={`h-5 w-5 ${config.color}`} />
                                </div>
                                <div>
                                  <div className="font-medium text-sm flex items-center gap-2">
                                    {config.name}
                                    {hasOverride && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        Personalizado
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {hasOverride 
                                      ? `Buffer: ${channelSettings.bufferDelaySeconds || formData.dmBatchDelaySeconds || 30}s, Cooldown: ${channelSettings.cooldownSeconds ?? formData.cooldownSeconds ?? 0}s`
                                      : 'Usando configuración base'
                                    }
                                  </div>
                                </div>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-2" data-testid={`toggle-channel-${provider}`}>
                                  <Pencil className="h-4 w-4" />
                                  <span className="hidden sm:inline">Configurar</span>
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent className="pt-3 pl-4 border-l-2 border-border ml-6 space-y-4">
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <Label className="text-sm">Buffer de DMs (segundos)</Label>
                                  <span className="text-sm font-medium">
                                    {channelSettings.bufferDelaySeconds ?? formData.dmBatchDelaySeconds ?? 30}s
                                  </span>
                                </div>
                                <Slider
                                  value={[channelSettings.bufferDelaySeconds ?? formData.dmBatchDelaySeconds ?? 30]}
                                  min={5}
                                  max={120}
                                  step={5}
                                  onValueChange={([value]) => {
                                    const newSettings = {
                                      ...platformSettings,
                                      [provider]: { ...channelSettings, bufferDelaySeconds: value }
                                    };
                                    setFormData({ ...formData, platformSettings: newSettings });
                                  }}
                                  data-testid={`slider-buffer-${provider}`}
                                />
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <Label className="text-sm">Cooldown (segundos)</Label>
                                  <span className="text-sm font-medium">
                                    {channelSettings.cooldownSeconds ?? formData.cooldownSeconds ?? 0}s
                                  </span>
                                </div>
                                <Slider
                                  value={[channelSettings.cooldownSeconds ?? formData.cooldownSeconds ?? 0]}
                                  min={0}
                                  max={60}
                                  step={1}
                                  onValueChange={([value]) => {
                                    const newSettings = {
                                      ...platformSettings,
                                      [provider]: { ...channelSettings, cooldownSeconds: value }
                                    };
                                    setFormData({ ...formData, platformSettings: newSettings });
                                  }}
                                  data-testid={`slider-cooldown-${provider}`}
                                />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-sm">Cooldown por conversación</Label>
                                  <p className="text-xs text-muted-foreground">
                                    Sobrescribir configuración base
                                  </p>
                                </div>
                                <Switch
                                  checked={channelSettings.cooldownPerConversation ?? formData.cooldownPerConversation ?? true}
                                  onCheckedChange={(checked) => {
                                    const newSettings = {
                                      ...platformSettings,
                                      [provider]: { ...channelSettings, cooldownPerConversation: checked }
                                    };
                                    setFormData({ ...formData, platformSettings: newSettings });
                                  }}
                                  data-testid={`switch-cooldown-per-conv-${provider}`}
                                />
                              </div>
                              
                              {hasOverride && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    setFormData(prev => {
                                      const currentSettings = (prev.platformSettings as Record<string, any>) || {};
                                      const { [provider]: _, ...rest } = currentSettings;
                                      return { 
                                        ...prev, 
                                        platformSettings: Object.keys(rest).length > 0 ? rest : null 
                                      };
                                    });
                                  }}
                                  data-testid={`button-reset-${provider}`}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restaurar valores base
                                </Button>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Respuesta del Agente</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-primary"
                          onClick={() => setSaveAsTemplateModal({
                            isOpen: true,
                            content: testResponse,
                            title: '',
                            category: 'general'
                          })}
                          data-testid="button-save-response-as-template"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          <span className="text-xs">Guardar como plantilla</span>
                        </Button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap" data-testid="text-test-response">{testResponse}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Templates Section */}
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Plantillas de Respuestas
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Respuestas pre-escritas para copiar y pegar rápidamente
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewTemplateForm(!showNewTemplateForm)}
                      className="gap-1 shadow-none"
                      data-testid="button-add-template"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nueva</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Category filters */}
                  <div className="flex flex-wrap gap-2">
                    {['all', 'informacional', 'comercial', 'soporte', 'general'].map((cat) => (
                      <Button
                        key={cat}
                        variant={templateCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTemplateCategory(cat)}
                        className={`text-xs h-7 ${templateCategory === cat ? '' : 'shadow-none'}`}
                        data-testid={`filter-category-${cat}`}
                      >
                        {cat === 'all' ? 'Todas' : getCategoryLabel(cat)}
                      </Button>
                    ))}
                  </div>

                  {/* New template form */}
                  {showNewTemplateForm && (
                    <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Título</Label>
                          <Input
                            value={newTemplate.title}
                            onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                            placeholder="Ej: Respuesta a consulta de precios"
                            className="h-8 text-sm shadow-none"
                            data-testid="input-template-title"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Categoría</Label>
                          <Select
                            value={newTemplate.category}
                            onValueChange={(val) => setNewTemplate({ ...newTemplate, category: val })}
                          >
                            <SelectTrigger className="h-8 text-sm shadow-none" data-testid="select-template-category">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="informacional">Información</SelectItem>
                              <SelectItem value="comercial">Comercial</SelectItem>
                              <SelectItem value="soporte">Soporte</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Contenido</Label>
                        <Textarea
                          value={newTemplate.content}
                          onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                          placeholder="Escribe la respuesta que quieres guardar como plantilla..."
                          className="min-h-[80px] text-sm shadow-none"
                          data-testid="textarea-template-content"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowNewTemplateForm(false);
                            setNewTemplate({ category: 'general', title: '', content: '' });
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => createTemplateMutation.mutate(newTemplate)}
                          disabled={!newTemplate.title.trim() || !newTemplate.content.trim() || createTemplateMutation.isPending}
                          data-testid="button-save-template"
                        >
                          {createTemplateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Guardar'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Templates list */}
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {templateCategory === 'all' 
                          ? 'No hay plantillas guardadas' 
                          : `No hay plantillas de tipo "${getCategoryLabel(templateCategory)}"`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Crea tu primera plantilla para responder más rápido
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="group p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                          data-testid={`template-card-${template.id}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] shrink-0 ${getCategoryColor(template.category)}`}
                              >
                                {getCategoryLabel(template.category)}
                              </Badge>
                              <span className="text-sm font-medium truncate">{template.title}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleCopyTemplate(template)}
                                data-testid={`button-copy-template-${template.id}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditTemplateModal({
                                  isOpen: true,
                                  id: template.id,
                                  title: template.title,
                                  category: template.category,
                                  content: template.content
                                })}
                                data-testid={`button-edit-template-${template.id}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteTemplateMutation.mutate(template.id)}
                                data-testid={`button-delete-template-${template.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{template.content}</p>
                          {template.usageCount > 0 && (
                            <p className="text-[10px] text-muted-foreground/60 mt-2">
                              Usado {template.usageCount} {template.usageCount === 1 ? 'vez' : 'veces'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-4">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-3 md:pb-4 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm md:text-base font-semibold">Historial de Actividad</h3>
                    <Badge variant="secondary" className="text-xs">
                      {filteredAuditLogs.length}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <div className="hidden sm:flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Filtros:</span>
                  </div>
                  
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs shadow-none" data-testid="filter-platform">
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
                    <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs shadow-none" data-testid="filter-status">
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
                        <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-4 px-3 md:px-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex items-start gap-2 md:gap-3">
                              <div className="p-1.5 md:p-2 rounded-lg bg-muted/50 shrink-0">
                                {log.platform ? getPlatformIcon(log.platform) : <Bot className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                  <code 
                                    className="px-1.5 md:px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono text-[10px] md:text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
                                  <span className="font-medium text-xs md:text-sm">{log.action}</span>
                                  {log.platform && (
                                    <Badge variant="outline" className="text-[10px] md:text-xs capitalize">
                                      {log.platform}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[10px] md:text-xs text-muted-foreground">
                                  {format(new Date(log.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-8 sm:ml-0">
                              <Badge 
                                variant={log.status === 'success' ? 'default' : 'destructive'}
                                className={`text-[10px] md:text-xs ${log.status === 'success' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                              >
                                {log.status === 'success' ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" /> <span className="hidden sm:inline">Exitoso</span><span className="sm:hidden">OK</span></>
                                ) : (
                                  <><XCircle className="h-3 w-3 mr-1" /> Error</>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="px-3 md:px-4 pb-3 md:pb-4 pt-0 space-y-2 md:space-y-3">
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

      {/* Modal de edición a pantalla completa - Responsive */}
      <Dialog open={editModal.isOpen} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="max-w-4xl w-[95vw] md:w-[90vw] h-[90vh] md:h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-4 md:px-6 py-3 md:py-4 border-b shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-sm md:text-base">
                {editModal.field === 'systemPrompt' && <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />}
                {editModal.field === 'knowledgeBase' && <BookOpen className="h-4 w-4 md:h-5 md:w-5" />}
                {editModal.field === 'guardrailPrompt' && <Shield className="h-4 w-4 md:h-5 md:w-5" />}
                <span className="hidden sm:inline">Editar</span> {editModal.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(editModal.value);
                    toast({ title: "Copiado", description: `${editModal.title} copiado al portapapeles` });
                  }}
                  className="gap-1.5 md:gap-2 h-8"
                  data-testid="button-modal-copy"
                >
                  <Copy className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Copiar</span>
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 p-3 md:p-6 overflow-hidden">
            <Textarea
              value={editModal.value}
              onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
              className="w-full h-full font-mono text-xs md:text-sm resize-none"
              style={{ minHeight: '100%' }}
              data-testid="textarea-modal-edit"
            />
          </div>
          <div className="px-3 md:px-6 py-3 md:py-4 border-t flex items-center justify-between shrink-0 bg-muted/30 gap-2">
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {editModal.value.length.toLocaleString()} <span className="hidden sm:inline">caracteres</span><span className="sm:hidden">chars</span>
            </p>
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={closeEditModal}
                data-testid="button-modal-cancel"
                aria-label="Cancelar edición"
              >
                <span className="hidden sm:inline">Cancelar</span>
                <X className="h-4 w-4 sm:hidden" aria-hidden="true" />
              </Button>
              <Button
                onClick={saveEditModal}
                size="sm"
                className="gap-1.5 md:gap-2"
                data-testid="button-modal-save"
                aria-label="Guardar cambios"
              >
                <Save className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Aplicar Cambios</span>
                <span className="sm:hidden">Guardar</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de editar plantilla */}
      <Dialog open={editTemplateModal.isOpen} onOpenChange={(open) => !open && setEditTemplateModal({ isOpen: false, id: '', content: '', title: '', category: 'general' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Plantilla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Título</Label>
              <Input
                value={editTemplateModal.title}
                onChange={(e) => setEditTemplateModal({ ...editTemplateModal, title: e.target.value })}
                data-testid="input-edit-template-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Categoría</Label>
              <Select
                value={editTemplateModal.category}
                onValueChange={(val) => setEditTemplateModal({ ...editTemplateModal, category: val })}
              >
                <SelectTrigger data-testid="select-edit-template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informacional">Información</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="soporte">Soporte</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Contenido</Label>
              <Textarea
                value={editTemplateModal.content}
                onChange={(e) => setEditTemplateModal({ ...editTemplateModal, content: e.target.value })}
                className="min-h-[100px] text-sm"
                data-testid="textarea-edit-template-content"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditTemplateModal({ isOpen: false, id: '', content: '', title: '', category: 'general' })}
              data-testid="button-cancel-edit-template"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!editTemplateModal.title.trim() || !editTemplateModal.content.trim()) {
                  toast({ title: "Error", description: "Título y contenido son obligatorios.", variant: "destructive" });
                  return;
                }
                updateTemplateMutation.mutate({
                  id: editTemplateModal.id,
                  title: editTemplateModal.title.trim(),
                  category: editTemplateModal.category,
                  content: editTemplateModal.content.trim(),
                });
              }}
              disabled={updateTemplateMutation.isPending}
              data-testid="button-confirm-edit-template"
            >
              {updateTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de guardar respuesta como plantilla */}
      <Dialog open={saveAsTemplateModal.isOpen} onOpenChange={(open) => !open && setSaveAsTemplateModal({ isOpen: false, content: '', title: '', category: 'general' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Guardar como Plantilla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Título</Label>
              <Input
                value={saveAsTemplateModal.title}
                onChange={(e) => setSaveAsTemplateModal({ ...saveAsTemplateModal, title: e.target.value })}
                placeholder="Ej: Respuesta a consulta de precios"
                data-testid="input-save-template-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Categoría</Label>
              <Select
                value={saveAsTemplateModal.category}
                onValueChange={(val) => setSaveAsTemplateModal({ ...saveAsTemplateModal, category: val })}
              >
                <SelectTrigger data-testid="select-save-template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informacional">Información</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="soporte">Soporte</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Contenido</Label>
              <Textarea
                value={saveAsTemplateModal.content}
                onChange={(e) => setSaveAsTemplateModal({ ...saveAsTemplateModal, content: e.target.value })}
                className="min-h-[100px] text-sm"
                data-testid="textarea-save-template-content"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSaveAsTemplateModal({ isOpen: false, content: '', title: '', category: 'general' })}
              data-testid="button-cancel-save-template"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!saveAsTemplateModal.title.trim() || !saveAsTemplateModal.content.trim()) {
                  toast({ title: "Error", description: "Título y contenido son obligatorios.", variant: "destructive" });
                  return;
                }
                createTemplateMutation.mutate({
                  title: saveAsTemplateModal.title.trim(),
                  category: saveAsTemplateModal.category,
                  content: saveAsTemplateModal.content.trim(),
                });
                setSaveAsTemplateModal({ isOpen: false, content: '', title: '', category: 'general' });
              }}
              disabled={createTemplateMutation.isPending}
              data-testid="button-confirm-save-template"
            >
              {createTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Plantilla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
