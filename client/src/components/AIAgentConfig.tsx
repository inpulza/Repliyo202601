import React, { useEffect, useState } from 'react';
import { useNexus } from '@/context/NexusContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AiAgent, AiAgentAuditLog } from '@shared/schema';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  Bot, Settings, MessageSquare, Zap, Shield, History, 
  Play, Save, Loader2, Sparkles, Brain, BookOpen,
  Clock, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
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
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTestResponse(`Esta es una respuesta de prueba basada en tu configuración actual.

El mensaje que enviaste fue: "${testMessage}"

En producción, esta respuesta sería generada por ${formData.provider === 'openai' ? 'OpenAI' : 'Gemini'} usando el modelo ${formData.model}.`);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo generar la respuesta de prueba", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoadingClients || isLoadingAgent) {
    return (
      <div className="h-full flex items-center justify-center bg-white" data-testid="loading-ai-config">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground">Cargando configuración del agente...</p>
        </div>
      </div>
    );
  }

  if (!activeClient) {
    return (
      <div className="h-full flex items-center justify-center bg-white" data-testid="no-client-selected">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-muted-foreground">Selecciona una marca para configurar su agente IA</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden" data-testid="ai-agent-config">
      <div className="border-b bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeClient.avatar ? (
              <img 
                src={activeClient.avatar} 
                alt={activeClient.name} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                data-testid="brand-avatar"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Bot className="h-5 w-5 text-indigo-600" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900" data-testid="brand-name">
                Agente IA: {activeClient.name}
              </h1>
              <p className="text-sm text-gray-500">
                Configura cómo responderá la IA a los mensajes de esta marca
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="agent-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-agent-active"
              />
              <Label htmlFor="agent-active" className="text-sm">
                {formData.isActive ? 'Activo' : 'Inactivo'}
              </Label>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="gap-2"
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
        <div className="border-b px-6">
          <TabsList className="h-12 bg-transparent gap-1">
            <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-indigo-50" data-testid="tab-general">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-2 data-[state=active]:bg-indigo-50" data-testid="tab-prompts">
              <Brain className="h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2 data-[state=active]:bg-indigo-50" data-testid="tab-automation">
              <Zap className="h-4 w-4" />
              Automatización
            </TabsTrigger>
            <TabsTrigger value="playground" className="gap-2 data-[state=active]:bg-indigo-50" data-testid="tab-playground">
              <Play className="h-4 w-4" />
              Playground
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-indigo-50" data-testid="tab-history">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto">
            <TabsContent value="general" className="mt-0 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      Modelo de IA
                    </CardTitle>
                    <CardDescription>
                      Selecciona el proveedor y modelo que usará el agente para generar respuestas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Proveedor</Label>
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
                          <SelectTrigger data-testid="select-provider">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="gemini">Google Gemini</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Modelo</Label>
                        <Select
                          value={formData.model}
                          onValueChange={(value) => setFormData({ ...formData, model: value })}
                        >
                          <SelectTrigger data-testid="select-model">
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
                          <Label>Temperatura: {formData.temperature?.toFixed(1)}</Label>
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
                        <Label>Tokens Máximos: {formData.maxTokens}</Label>
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
              </motion.div>
            </TabsContent>

            <TabsContent value="prompts" className="mt-0 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      System Prompt
                    </CardTitle>
                    <CardDescription>
                      Define la personalidad, tono y comportamiento del agente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.systemPrompt || ''}
                      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                      placeholder="Eres un asistente de atención al cliente..."
                      className="min-h-[200px] font-mono text-sm"
                      data-testid="textarea-system-prompt"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-500" />
                      Knowledge Base
                    </CardTitle>
                    <CardDescription>
                      Información del negocio, FAQs, horarios, políticas que el agente debe conocer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.knowledgeBase || ''}
                      onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
                      placeholder="Horarios de atención: Lunes a Viernes 9:00-18:00..."
                      className="min-h-[200px] font-mono text-sm"
                      data-testid="textarea-knowledge-base"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      Guardrails
                    </CardTitle>
                    <CardDescription>
                      Restricciones de seguridad y límites para las respuestas del agente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.guardrailPrompt || ''}
                      onChange={(e) => setFormData({ ...formData, guardrailPrompt: e.target.value })}
                      placeholder="No compartas información confidencial..."
                      className="min-h-[150px] font-mono text-sm"
                      data-testid="textarea-guardrails"
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="automation" className="mt-0 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Modo de Respuesta Automática
                    </CardTitle>
                    <CardDescription>
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
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            formData.autoReplyMode === mode.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          data-testid={`button-mode-${mode.value}`}
                        >
                          <mode.icon className={`h-6 w-6 mb-2 ${
                            formData.autoReplyMode === mode.value ? 'text-indigo-600' : 'text-gray-400'
                          }`} />
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-xs text-muted-foreground">{mode.desc}</div>
                        </button>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Workflow de Aprobación</Label>
                          <p className="text-xs text-muted-foreground">Requiere revisión humana antes de enviar</p>
                        </div>
                        <Select
                          value={formData.approvalWorkflow}
                          onValueChange={(value) => setFormData({ ...formData, approvalWorkflow: value })}
                        >
                          <SelectTrigger className="w-48" data-testid="select-approval-workflow">
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
                          <Label>Estrategia de Límite de Caracteres</Label>
                          <p className="text-xs text-muted-foreground">Qué hacer si la respuesta excede el límite</p>
                        </div>
                        <Select
                          value={formData.characterLimitStrategy}
                          onValueChange={(value) => setFormData({ ...formData, characterLimitStrategy: value })}
                        >
                          <SelectTrigger className="w-48" data-testid="select-char-limit-strategy">
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
                            <Label>Cooldown entre respuestas</Label>
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
              </motion.div>
            </TabsContent>

            <TabsContent value="playground" className="mt-0 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-green-500" />
                      Área de Pruebas
                    </CardTitle>
                    <CardDescription>
                      Prueba cómo responderá el agente con la configuración actual
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mensaje de prueba</Label>
                      <Textarea
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Escribe un mensaje de prueba como si fueras un cliente..."
                        className="min-h-[100px]"
                        data-testid="textarea-test-message"
                      />
                    </div>
                    <Button
                      onClick={handleTestPlayground}
                      disabled={isTesting || !testMessage.trim()}
                      className="gap-2"
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
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-4 w-4 text-indigo-600" />
                          <span className="text-sm font-medium">Respuesta del Agente</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" data-testid="text-test-response">{testResponse}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-purple-500" />
                      Historial de Actividad
                    </CardTitle>
                    <CardDescription>
                      Registro de todas las respuestas generadas por el agente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAudit ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-muted-foreground">No hay actividad registrada aún</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            data-testid={`audit-log-${log.id}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {log.status === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="font-medium text-sm">{log.action}</span>
                                {log.platform && (
                                  <Badge variant="outline" className="text-xs">{log.platform}</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.createdAt), "d MMM HH:mm", { locale: es })}
                              </span>
                            </div>
                            {log.inputContent && (
                              <div className="text-xs text-gray-600 mb-1">
                                <strong>Entrada:</strong> {log.inputContent.slice(0, 100)}...
                              </div>
                            )}
                            {log.outputContent && (
                              <div className="text-xs text-gray-600">
                                <strong>Respuesta:</strong> {log.outputContent.slice(0, 150)}...
                              </div>
                            )}
                            {log.promptTokens && (
                              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                                <span>Tokens prompt: {log.promptTokens}</span>
                                <span>Tokens respuesta: {log.completionTokens}</span>
                                {log.characterCount && <span>Caracteres: {log.characterCount}</span>}
                              </div>
                            )}
                            {log.errorReason && (
                              <div className="mt-2 text-xs text-red-600">
                                Error: {log.errorReason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
