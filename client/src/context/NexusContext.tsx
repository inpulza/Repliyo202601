import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { api, type DetectedProvider } from '@/lib/api';
import type { Client, Message, Conversation, SocialPost } from '@shared/schema';
import { useAuth } from './AuthContext';

interface ClientSettings {
  agentName: string;
  tone: string;
  businessContext: string;
}

export type ConversationWithPost = Conversation & { socialPost: SocialPost | null };

interface NexusContextType {
  activeClientId: string | null;
  activeClient: Client | undefined;
  clients: Client[];
  conversations: ConversationWithPost[];
  activeConversation: ConversationWithPost | null;
  activeConversationMessages: Message[];
  messages: Message[];
  isLoadingClients: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isLoadingConversationMessages: boolean;
  setActiveClientId: (id: string) => void;
  setActiveConversation: (conversation: ConversationWithPost | null) => void;
  markConversationAsRead: (conversationId: string) => void;
  updateClientSettings: (clientId: string, settings: ClientSettings) => void;
  updateMessageDraft: (messageId: string, draft: string) => void;
  approveMessage: (messageId: string) => void;
  refreshFeed: () => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  metricoolBrands: any[];
  isLoadingMetricool: boolean;
  fetchMetricoolBrands: () => Promise<void>;
  importMetricoolBrand: (brandId: string, detectedProviders?: DetectedProvider[], selectedProviders?: string[]) => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

const ACTIVE_BRAND_KEY = 'repliyo_active_brand_id';

export const NexusProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [activeClientId, setActiveClientIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_BRAND_KEY);
    } catch {
      return null;
    }
  });
  const [activeConversation, setActiveConversationState] = useState<ConversationWithPost | null>(null);
  const [metricoolBrands, setMetricoolBrands] = useState<any[]>([]);
  const [isLoadingMetricool, setIsLoadingMetricool] = useState(false);

  const setActiveClientId = React.useCallback((id: string | null) => {
    setActiveClientIdState(id);
    try {
      if (id) {
        localStorage.setItem(ACTIVE_BRAND_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_BRAND_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist active brand to localStorage:', e);
    }
  }, []);

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: api.clients.getAll,
    enabled: isAuthenticated && !isAuthLoading,
  });

  const activeClients = React.useMemo(() => {
    return clients.filter(client => client.status !== 'archived');
  }, [clients]);

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations', activeClientId],
    queryFn: () => api.conversations.getAll(activeClientId || undefined),
    enabled: !!activeClientId,
  });

  const { data: activeConversationMessages = [], isLoading: isLoadingConversationMessages } = useQuery({
    queryKey: ['conversationMessages', activeConversation?.id],
    queryFn: () => activeConversation ? api.conversations.getMessages(activeConversation.id) : Promise.resolve([]),
    enabled: !!activeConversation?.id,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', activeClientId],
    queryFn: () => api.messages.getAll(activeClientId || undefined),
    enabled: !!activeClientId,
  });

  React.useEffect(() => {
    if (isAuthenticated && !isAuthLoading && activeClients.length > 0 && !isLoadingClients) {
      if (activeClientId) {
        const savedClientExists = activeClients.some(c => c.id === activeClientId);
        if (!savedClientExists) {
          setActiveClientId(activeClients[0].id);
        }
      } else {
        setActiveClientId(activeClients[0].id);
      }
    }
  }, [isAuthenticated, isAuthLoading, activeClients, activeClientId, isLoadingClients, setActiveClientId]);

  const activeClient = React.useMemo(
    () => clients.find(c => c.id === activeClientId),
    [clients, activeClientId]
  );

  const handleSetActiveClientId = React.useCallback((id: string) => {
    const client = clients.find(c => c.id === id);
    if (client && client.status === 'archived') {
      toast({
        title: "Marca Archivada",
        description: "Esta marca ha sido archivada y no está disponible.",
        variant: "destructive"
      });
      return;
    }
    if (id !== activeClientId) {
      setActiveConversationState(null);
      queryClient.removeQueries({ queryKey: ['conversations', activeClientId] });
      queryClient.removeQueries({ queryKey: ['messages', activeClientId] });
      queryClient.removeQueries({ queryKey: ['conversationMessages'] });
    }
    setActiveClientId(id);
  }, [clients, activeClientId, setActiveClientId, queryClient]);

  const setActiveConversation = (conversation: ConversationWithPost | null) => {
    setActiveConversationState(conversation);
    if (conversation && conversation.unreadCount && conversation.unreadCount > 0) {
      markConversationAsReadMutation.mutate(conversation.id);
    }
  };

  const markConversationAsReadMutation = useMutation({
    mutationFn: api.conversations.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const markConversationAsRead = (conversationId: string) => {
    markConversationAsReadMutation.mutate(conversationId);
  };

  const createClientMutation = useMutation({
    mutationFn: api.clients.create,
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setActiveClientId(newClient.id);
      toast({
        title: "Client Added",
        description: `${newClient.name} has been added to your workspace.`,
      });
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Message> }) =>
      api.messages.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversationMessages'] });
    },
  });

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    createClientMutation.mutate(client);
  };

  const fetchMetricoolBrands = async () => {
    setIsLoadingMetricool(true);
    try {
      const brands = await api.metricool.getBrands();
      setMetricoolBrands(brands);
      toast({
        title: "Marcas Cargadas",
        description: `Se encontraron ${brands.length} marca(s) en Metricool.`,
      });
    } catch (error: any) {
      console.error('Error fetching Metricool brands:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las marcas de Metricool.",
        variant: "destructive"
      });
      setMetricoolBrands([]);
    } finally {
      setIsLoadingMetricool(false);
    }
  };

  const importMetricoolBrand = async (brandId: string, detectedProviders?: DetectedProvider[], selectedProviders?: string[]) => {
    const brandToImport = metricoolBrands.find(b => b.blogId === brandId || b.id === brandId);
    if (!brandToImport) return;

    if (clients.some(c => c.metricoolBlogId === brandToImport.blogId)) {
       toast({
        title: "Ya Conectado",
        description: "Esta marca ya está en tu workspace.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Importando Marca",
        description: "Guardando marca en la base de datos...",
      });

      const providersToUse = detectedProviders || brandToImport.detectedProviders || [];
      const selectedToUse = selectedProviders || providersToUse.map((p: DetectedProvider) => p.provider);

      const importedBrand = await api.metricool.importBrand({
        ...brandToImport,
        agentName: `${brandToImport.name.split(' ')[0]}Bot`,
        tone: 'casual',
        businessContext: `Official account for ${brandToImport.name}.`,
        detectedProviders: providersToUse,
        selectedProviders: selectedToUse,
      });

      queryClient.invalidateQueries({ queryKey: ['clients'] });

      const activeCount = selectedToUse.length;
      const totalCount = providersToUse.length;
      
      toast({
        title: "Marca Importada",
        description: `${importedBrand.name} agregado con ${activeCount}/${totalCount} redes activas.`,
      });

      setActiveClientId(importedBrand.id);

      if (activeCount > 0) {
        toast({
          title: "Sincronizando Mensajes",
          description: "Descargando DMs y comentarios de las redes activas...",
        });

        await api.metricool.syncBrand(importedBrand.id);

        queryClient.invalidateQueries({ queryKey: ['messages', importedBrand.id] });
        queryClient.invalidateQueries({ queryKey: ['conversations', importedBrand.id] });
        queryClient.invalidateQueries({ queryKey: ['conversationMessages'] });
        
        toast({
          title: "¡Sincronización Completada!",
          description: "Los mensajes de las redes activas han sido importados.",
        });
      } else {
        toast({
          title: "Sin Redes Activas",
          description: "No se seleccionaron redes para sincronizar. Puedes activarlas en la configuración.",
        });
      }

    } catch (error: any) {
      console.error('Error importing brand:', error);
      toast({
        title: "Error al Importar",
        description: error.message || "No se pudo importar la marca.",
        variant: "destructive"
      });
    }
  };

  const updateClientSettings = (clientId: string, newSettings: ClientSettings) => {
    toast({
      title: "Settings Saved",
      description: `Updated agent configuration for ${clients.find(c => c.id === clientId)?.name}`,
    });
  };

  const updateMessageDraft = (messageId: string, draft: string) => {
    updateMessageMutation.mutate({
      id: messageId,
      data: { draftResponse: draft }
    });
  };

  const approveMessage = (messageId: string) => {
    updateMessageMutation.mutate({
      id: messageId,
      data: { status: 'approved' }
    });
    
    setTimeout(() => {
      updateMessageMutation.mutate({
        id: messageId,
        data: { status: 'sent' }
      });
      toast({
        title: "Message Sent",
        description: "Response has been published to the platform.",
      });
    }, 1500);
  };

  const refreshFeed = () => {
    if (activeClientId) {
      queryClient.invalidateQueries({ queryKey: ['messages', activeClientId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', activeClientId] });
      queryClient.invalidateQueries({ queryKey: ['conversationMessages'] });
    }
    toast({ title: "Feed Refreshed", description: "Checking for new messages..." });
  };

  return (
    <NexusContext.Provider value={{
      activeClientId,
      activeClient,
      clients,
      conversations,
      activeConversation,
      activeConversationMessages,
      messages,
      isLoadingClients,
      isLoadingConversations,
      isLoadingMessages,
      isLoadingConversationMessages,
      setActiveClientId: handleSetActiveClientId,
      setActiveConversation,
      markConversationAsRead,
      updateClientSettings,
      updateMessageDraft,
      approveMessage,
      refreshFeed,
      addClient,
      metricoolBrands,
      isLoadingMetricool,
      fetchMetricoolBrands,
      importMetricoolBrand
    }}>
      {children}
    </NexusContext.Provider>
  );
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (context === undefined) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
};
