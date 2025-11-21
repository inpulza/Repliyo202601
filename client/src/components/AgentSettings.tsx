import React, { useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Bot } from 'lucide-react';

const formSchema = z.object({
  agentName: z.string().min(2, {
    message: "Agent name must be at least 2 characters.",
  }),
  tone: z.enum(['formal', 'casual', 'funny', 'empathetic']),
  businessContext: z.string().min(10, {
    message: "Context must be at least 10 characters.",
  }),
});

export function AgentSettings() {
  const { activeClient, updateClientSettings } = useNexus();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agentName: '',
      tone: 'formal',
      businessContext: '',
    },
  });

  // Reset form when client changes
  useEffect(() => {
    if (activeClient) {
      form.reset({
        agentName: activeClient.settings.agentName,
        tone: activeClient.settings.tone,
        businessContext: activeClient.settings.businessContext,
      });
    }
  }, [activeClient, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (activeClient) {
      updateClientSettings(activeClient.id, values);
    }
  }

  if (!activeClient) return null;

  return (
    <div className="h-full flex flex-col bg-muted/30">
      <header className="h-16 border-b bg-background px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Agent Configuration</h1>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 mb-2">
               <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                 <Bot className="h-7 w-7 text-primary" />
               </div>
               <div>
                  <CardTitle>Brain Configuration: {activeClient.name}</CardTitle>
                  <CardDescription>
                    Customize how the AI represents this specific brand.
                  </CardDescription>
               </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="agentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Identity Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. SupportBot" {...field} />
                        </FormControl>
                        <FormDescription>
                          Internal name for this agent instance.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voice & Tone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                        <FormDescription>
                          Determines the personality of generated responses.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="businessContext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Context & Knowledge Base</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the business, key policies, and what the agent should know..." 
                          className="min-h-[200px] font-mono text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Provide context about the business (e.g., "We sell organic coffee", "No refunds after 30 days").
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" size="lg" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Configuration
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
