import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNexus } from '@/context/NexusContext';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Bot, Zap, BookOpen, ArrowRight, Loader2, ChevronRight, User, MessageSquare, Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  MobilePageHeader,
  MobileListRow,
  MobileListGroup,
  MobileSectionDivider,
  MobileContainer,
  MobileSpacer
} from '@/components/ui/mobile-primitives';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const formSchema = z.object({
  agentName: z.string().min(2, {
    message: "Agent name must be at least 2 characters.",
  }),
  tone: z.enum(['formal', 'casual', 'funny', 'empathetic']),
  businessContext: z.string().min(10, {
    message: "Context must be at least 10 characters.",
  }),
  autoDraft: z.boolean().default(true),
});

export function AgentSettings() {
  const { activeClient, updateClientSettings, isLoadingClients } = useNexus();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agentName: '',
      tone: 'formal',
      businessContext: '',
      autoDraft: true,
    },
  });

  // Reset form when client changes
  useEffect(() => {
    if (activeClient) {
      form.reset({
        agentName: activeClient.agentName || '',
        tone: (activeClient.tone || 'formal') as 'formal' | 'casual' | 'funny' | 'empathetic',
        businessContext: activeClient.businessContext || '',
        autoDraft: true, // Mock field for UI
      });
    }
  }, [activeClient, form]);

  if (isLoadingClients) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (!activeClient) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">No hay marca seleccionada</p>
      </div>
    );
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (activeClient) {
      updateClientSettings(activeClient.id, {
         agentName: values.agentName,
         tone: values.tone,
         businessContext: values.businessContext
      });
    }
  }

  if (!activeClient) return null;

  const [mobileSheet, setMobileSheet] = useState<'name' | 'tone' | 'context' | null>(null);
  
  const toneLabels: Record<string, string> = {
    'formal': 'Formal & Professional',
    'casual': 'Casual & Friendly', 
    'funny': 'Humorous & Witty',
    'empathetic': 'Empathetic & Supportive'
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Mobile View - Instagram Style */}
      <div className="md:hidden flex flex-col min-h-full bg-white">
        {/* Instagram-style sticky header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="flex items-center justify-center h-11 relative">
            <h1 className="text-base font-semibold text-gray-900">Configuración</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Brand indicator */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500">{activeClient?.name}</p>
          </div>

          {/* AGENTE section */}
          <div className="pt-6 pb-2 px-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Agente</p>
          </div>
          <div className="bg-white">
            <button
              onClick={() => setMobileSheet('name')}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
              data-testid="mobile-row-agent-name"
            >
              <span className="text-[15px] text-gray-900">Nombre</span>
              <div className="flex items-center gap-2">
                <span className="text-[15px] text-gray-400">{form.watch('agentName') || 'Agregar'}</span>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </button>
            <button
              onClick={() => setMobileSheet('tone')}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
              data-testid="mobile-row-tone"
            >
              <span className="text-[15px] text-gray-900">Tono de voz</span>
              <div className="flex items-center gap-2">
                <span className="text-[15px] text-gray-400">{toneLabels[form.watch('tone')]?.split(' ')[0] || 'Formal'}</span>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </button>
          </div>

          {/* AUTOMATIZACIÓN section */}
          <div className="pt-8 pb-2 px-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Automatización</p>
          </div>
          <div className="bg-white">
            <div className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div className="flex-1">
                <span className="text-[15px] text-gray-900">Auto-borrador</span>
                <p className="text-xs text-gray-400 mt-0.5">Generar respuestas automáticamente</p>
              </div>
              <Switch
                checked={form.watch('autoDraft')}
                onCheckedChange={(val) => form.setValue('autoDraft', val)}
              />
            </div>
          </div>

          {/* CONOCIMIENTO section */}
          <div className="pt-8 pb-2 px-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Conocimiento</p>
          </div>
          <div className="bg-white">
            <button
              onClick={() => setMobileSheet('context')}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
              data-testid="mobile-row-context"
            >
              <div className="flex-1 text-left">
                <span className="text-[15px] text-gray-900">Contexto del negocio</span>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                  {form.watch('businessContext') 
                    ? (form.watch('businessContext').length > 50 
                        ? form.watch('businessContext').substring(0, 50) + '...' 
                        : form.watch('businessContext'))
                    : 'Toca para agregar información'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 ml-2" />
            </button>
          </div>

          {/* Spacer for bottom button */}
          <div className="h-24" />
        </div>

        {/* Sticky bottom save button */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-100 p-4 pb-safe">
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            className="w-full h-11 bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold rounded-lg text-sm"
            data-testid="mobile-button-save"
          >
            Guardar
          </Button>
        </div>
      </div>

      {/* Mobile Sheets - Instagram Style */}
      <Sheet open={mobileSheet === 'name'} onOpenChange={() => setMobileSheet(null)}>
        <SheetContent side="bottom" className="md:hidden rounded-t-3xl p-0">
          {/* Sheet header */}
          <div className="flex items-center justify-center h-12 border-b border-gray-100 relative">
            <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4">
              <button onClick={() => setMobileSheet(null)} className="text-[15px] text-gray-500">
                Cancelar
              </button>
            </div>
            <span className="text-base font-semibold text-gray-900">Nombre</span>
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-4">
              <button onClick={() => setMobileSheet(null)} className="text-[15px] font-semibold text-[#0095F6]">
                Listo
              </button>
            </div>
          </div>
          <div className="p-4">
            <Input
              value={form.watch('agentName')}
              onChange={(e) => form.setValue('agentName', e.target.value)}
              placeholder="Nombre del agente"
              className="h-11 text-[15px] border-gray-200 focus:border-gray-400 focus:ring-0"
            />
            <p className="text-xs text-gray-400 mt-3">El nombre que los usuarios verán en las respuestas.</p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === 'tone'} onOpenChange={() => setMobileSheet(null)}>
        <SheetContent side="bottom" className="md:hidden rounded-t-3xl p-0 max-h-[60vh]">
          {/* Sheet header */}
          <div className="flex items-center justify-center h-12 border-b border-gray-100">
            <span className="text-base font-semibold text-gray-900">Tono de voz</span>
          </div>
          <div className="overflow-y-auto">
            {(['formal', 'casual', 'funny', 'empathetic'] as const).map((tone, idx) => (
              <button
                key={tone}
                onClick={() => {
                  form.setValue('tone', tone);
                  setMobileSheet(null);
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 active:bg-gray-50`}
              >
                <span className="text-[15px] text-gray-900">{toneLabels[tone]}</span>
                {form.watch('tone') === tone && (
                  <svg className="h-5 w-5 text-[#0095F6]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === 'context'} onOpenChange={() => setMobileSheet(null)}>
        <SheetContent side="bottom" className="md:hidden rounded-t-3xl p-0 h-[90vh] flex flex-col">
          {/* Sheet header */}
          <div className="flex items-center justify-center h-12 border-b border-gray-100 relative shrink-0">
            <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4">
              <button onClick={() => setMobileSheet(null)} className="text-[15px] text-gray-500">
                Cancelar
              </button>
            </div>
            <span className="text-base font-semibold text-gray-900">Contexto</span>
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-4">
              <button onClick={() => setMobileSheet(null)} className="text-[15px] font-semibold text-[#0095F6]">
                Listo
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <Textarea
              value={form.watch('businessContext')}
              onChange={(e) => form.setValue('businessContext', e.target.value)}
              placeholder="Describe tu negocio, productos, políticas de atención, horarios, y cualquier información que el agente deba conocer para responder correctamente..."
              className="min-h-[300px] text-[15px] leading-relaxed border-gray-200 focus:border-gray-400 focus:ring-0 resize-none"
            />
            <p className="text-xs text-gray-400 mt-3">La IA usará esta información para fundamentar sus respuestas.</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop View */}
      <div className="hidden md:block py-10 px-8 max-w-4xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Settings</h1>
          <p className="text-muted-foreground text-lg mb-8">Manage your AI agent's personality and knowledge base.</p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Section 1: Identity */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-6"
            >
               <div className="flex items-center gap-2 pb-2 border-b">
                  <Bot className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Agent Identity</h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="agentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. SupportBot" 
                            {...field} 
                            className="bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-11"
                          />
                        </FormControl>
                        <FormDescription>The name users will see in chat.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Tone of Voice</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary h-11">
                              <SelectValue placeholder="Select a tone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="formal">Formal & Professional</SelectItem>
                            <SelectItem value="casual">Casual & Friendly</SelectItem>
                            <SelectItem value="funny">Humorous & Witty</SelectItem>
                            <SelectItem value="empathetic">Empathetic & Supportive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Defines the personality for responses.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>
            </motion.div>

            {/* Section 2: Capabilities */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.2 }}
               className="space-y-6"
            >
               <div className="flex items-center gap-2 pb-2 border-b mt-8">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <h2 className="font-semibold text-lg">Automation</h2>
               </div>

               <FormField
                  control={form.control}
                  name="autoDraft"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-gray-50/50">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Auto-Draft Responses</FormLabel>
                        <FormDescription>
                          Automatically generate draft responses for new incoming messages.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </motion.div>

            {/* Section 2.5: Conversation Lifecycle */}
            <LifecycleSettingsSection brandId={activeClient.id} />

            {/* Section 3: Knowledge */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.3 }}
               className="space-y-6"
            >
               <div className="flex items-center gap-2 pb-2 border-b mt-8">
                  <BookOpen className="h-5 w-5 text-indigo-500" />
                  <h2 className="font-semibold text-lg">Knowledge Base</h2>
               </div>

               <FormField
                  control={form.control}
                  name="businessContext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Business Context</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the business, key policies, and what the agent should know..." 
                          className="min-h-[200px] font-mono text-sm bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all p-4 leading-relaxed"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        The AI uses this context to ground its responses in reality.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </motion.div>

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.5 }}
               className="flex justify-end pt-6"
            >
              <Button type="submit" size="lg" className="gap-2 bg-black hover:bg-gray-800 text-white rounded-full px-8 h-12 shadow-lg shadow-gray-200">
                Save Changes
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </form>
        </Form>
      </div>
    </div>
  );
}

function LifecycleSettingsSection({ brandId }: { brandId: string }) {
  const queryClient = useQueryClient();
  const [gracePeriod, setGracePeriod] = useState(24);
  const [autoSummary, setAutoSummary] = useState(true);
  const [csatEnabled, setCsatEnabled] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['lifecycleSettings', brandId],
    queryFn: () => api.lifecycle.getSettings(brandId),
    enabled: !!brandId,
  });

  useEffect(() => {
    if (settings) {
      setGracePeriod(settings.solvedToClosedHours);
      setAutoSummary(settings.autoGenerateSummary);
      setCsatEnabled(settings.csatSurveyEnabled ?? false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (newSettings: { solvedToClosedHours?: number; autoGenerateSummary?: boolean; csatSurveyEnabled?: boolean }) =>
      api.lifecycle.updateSettings(brandId, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycleSettings', brandId] });
      toast.success('Lifecycle settings updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });

  const handleGracePeriodChange = (value: string) => {
    const hours = parseInt(value, 10);
    setGracePeriod(hours);
    mutation.mutate({ solvedToClosedHours: hours });
  };

  const handleAutoSummaryChange = (checked: boolean) => {
    setAutoSummary(checked);
    mutation.mutate({ autoGenerateSummary: checked });
  };

  const handleCsatChange = (checked: boolean) => {
    setCsatEnabled(checked);
    mutation.mutate({ csatSurveyEnabled: checked });
  };

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-2 pb-2 border-b mt-8">
          <Clock className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-lg">Conversation Lifecycle</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-2 pb-2 border-b mt-8">
        <Clock className="h-5 w-5 text-purple-500" />
        <h2 className="font-semibold text-lg">Conversation Lifecycle</h2>
      </div>

      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-gray-50/50">
          <div className="space-y-0.5">
            <label className="text-base font-medium">Auto-Close Timer</label>
            <p className="text-sm text-muted-foreground">
              Time after a conversation is marked "Solved" before it auto-closes permanently (max 28 days).
            </p>
          </div>
          <Select 
            value={gracePeriod.toString()} 
            onValueChange={handleGracePeriodChange}
            disabled={mutation.isPending}
          >
            <SelectTrigger className="w-36" data-testid="select-grace-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="12">12 hours</SelectItem>
              <SelectItem value="24">1 day</SelectItem>
              <SelectItem value="48">2 days</SelectItem>
              <SelectItem value="72">3 days</SelectItem>
              <SelectItem value="96">4 days</SelectItem>
              <SelectItem value="168">7 days</SelectItem>
              <SelectItem value="336">14 days</SelectItem>
              <SelectItem value="504">21 days</SelectItem>
              <SelectItem value="672">28 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-gray-50/50">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <label className="text-base font-medium">AI Closing Summary</label>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically generate an AI summary when marking conversations as Solved.
            </p>
          </div>
          <Switch
            checked={autoSummary}
            onCheckedChange={handleAutoSummaryChange}
            disabled={mutation.isPending}
            data-testid="switch-auto-summary"
          />
        </div>

        <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-gray-50/50">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <label className="text-base font-medium">CSAT Survey</label>
            </div>
            <p className="text-sm text-muted-foreground">
              Send a satisfaction survey after conversations are closed. Channels "thank you" messages into actionable feedback.
            </p>
          </div>
          <Switch
            checked={csatEnabled}
            onCheckedChange={handleCsatChange}
            disabled={mutation.isPending}
            data-testid="switch-csat-survey"
          />
        </div>
      </div>
    </motion.div>
  );
}
