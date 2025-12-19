import React, { useEffect, useState } from 'react';
import { useNexus } from '@/context/NexusContext';
import { useForm } from 'react-hook-form';
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
import { Save, Bot, Zap, BookOpen, ArrowRight, Loader2, ChevronRight, User, MessageSquare } from 'lucide-react';
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
      {/* Mobile View */}
      <MobileContainer>
        <MobilePageHeader title="Settings" subtitle={activeClient?.name} />
        
        <MobileSpacer size="sm" />
        
        <MobileSectionDivider title="Agent Identity" />
        <MobileListGroup>
          <MobileListRow
            icon={<Bot className="h-4 w-4 text-indigo-500" />}
            title="Nombre del Agente"
            subtitle={form.watch('agentName') || 'Sin configurar'}
            onClick={() => setMobileSheet('name')}
            testId="mobile-row-agent-name"
          />
          <MobileListRow
            icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
            title="Tono de Voz"
            subtitle={toneLabels[form.watch('tone')] || 'Formal'}
            onClick={() => setMobileSheet('tone')}
            testId="mobile-row-tone"
          />
        </MobileListGroup>
        
        <MobileSpacer size="md" />
        
        <MobileSectionDivider title="Automatización" />
        <MobileListGroup>
          <MobileListRow
            icon={<Zap className="h-4 w-4 text-amber-500" />}
            title="Auto-Draft Responses"
            subtitle="Generar borradores automáticos"
            showChevron={false}
            rightElement={
              <Switch
                checked={form.watch('autoDraft')}
                onCheckedChange={(val) => form.setValue('autoDraft', val)}
              />
            }
            testId="mobile-row-autodraft"
          />
        </MobileListGroup>
        
        <MobileSpacer size="md" />
        
        <MobileSectionDivider title="Base de Conocimiento" />
        <MobileListGroup>
          <MobileListRow
            icon={<BookOpen className="h-4 w-4 text-blue-500" />}
            title="Contexto del Negocio"
            subtitle={form.watch('businessContext') ? (form.watch('businessContext').length > 40 ? form.watch('businessContext').substring(0, 40) + '...' : form.watch('businessContext')) : 'Sin configurar'}
            onClick={() => setMobileSheet('context')}
            testId="mobile-row-context"
          />
        </MobileListGroup>
        
        <MobileSpacer size="lg" />
        
        <div className="md:hidden px-4 pb-4">
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-xl"
            data-testid="mobile-button-save"
          >
            Guardar Cambios
          </Button>
        </div>
      </MobileContainer>

      {/* Mobile Sheets */}
      <Sheet open={mobileSheet === 'name'} onOpenChange={() => setMobileSheet(null)}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl flex flex-col">
          <SheetHeader className="text-left pb-2">
            <SheetTitle>Nombre del Agente</SheetTitle>
          </SheetHeader>
          <div className="flex-1 py-4">
            <Input
              value={form.watch('agentName')}
              onChange={(e) => form.setValue('agentName', e.target.value)}
              placeholder="e.g. SupportBot"
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground mt-2">El nombre que los usuarios verán en el chat</p>
            {form.formState.errors.agentName && (
              <p className="text-xs text-red-500 mt-2">{form.formState.errors.agentName.message}</p>
            )}
          </div>
          <div className="pb-safe pt-2">
            <Button onClick={() => setMobileSheet(null)} className="w-full h-12 bg-black hover:bg-gray-800 rounded-xl">Listo</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === 'tone'} onOpenChange={() => setMobileSheet(null)}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl flex flex-col max-h-[70vh]">
          <SheetHeader className="text-left pb-2">
            <SheetTitle>Tono de Voz</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-2">
            {(['formal', 'casual', 'funny', 'empathetic'] as const).map(tone => (
              <button
                key={tone}
                onClick={() => {
                  form.setValue('tone', tone);
                  setMobileSheet(null);
                }}
                className={`w-full p-4 text-left rounded-xl border transition-colors ${
                  form.watch('tone') === tone 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <p className="font-medium text-foreground">{toneLabels[tone]}</p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === 'context'} onOpenChange={() => setMobileSheet(null)}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl h-[85vh] flex flex-col">
          <SheetHeader className="text-left pb-2">
            <SheetTitle>Contexto del Negocio</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <Textarea
              value={form.watch('businessContext')}
              onChange={(e) => form.setValue('businessContext', e.target.value)}
              placeholder="Describe el negocio, políticas clave, y lo que el agente debería saber..."
              className="min-h-[250px] text-base leading-relaxed"
            />
            <p className="text-xs text-muted-foreground mt-2">La IA usa este contexto para fundamentar sus respuestas (mínimo 10 caracteres)</p>
            {form.formState.errors.businessContext && (
              <p className="text-xs text-red-500 mt-2">{form.formState.errors.businessContext.message}</p>
            )}
          </div>
          <div className="pb-safe pt-2">
            <Button onClick={() => setMobileSheet(null)} className="w-full h-12 bg-black hover:bg-gray-800 rounded-xl">Listo</Button>
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
