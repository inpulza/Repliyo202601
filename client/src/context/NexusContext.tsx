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
  activeClients: Client[];
  conversations: ConversationWithPost[];
  activeConversation: ConversationWithPost | null;
  activeConversationMessages: Message[];
  isLoadingClients: boolean;
  isLoadingConversations: boolean;
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
      const savedId = localStorage.getItem(ACTIVE_BRAND_KEY);
      console.log('[NexusContext] INIT: Read activeClientId from localStorage:', savedId);
      return savedId;
    } catch {
      console.log('[NexusContext] INIT: Failed to read localStorage, returning null');
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
    queryFn: async () => {
      console.log('[NexusContext] QUERY: Fetching clients...');
      const result = await api.clients.getAll();
      console.log('[NexusContext] QUERY: Clients loaded:', result.length, 'clients');
      return result;
    },
    enabled: isAuthenticated && !isAuthLoading,
  });

  const activeClients = React.useMemo(() => {
    return clients.filter(client => client.status !== 'archived');
  }, [clients]);

  const validatedActiveClientId = React.useMemo(() => {
    if (!isAuthenticated || isAuthLoading || isLoadingClients) {
      console.log('[NexusContext] validatedActiveClientId: Auth/clients not ready, returning null', { isAuthenticated, isAuthLoading, isLoadingClients });
      return null;
    }
    if (!activeClientId) {
      console.log('[NexusContext] validatedActiveClientId: No activeClientId set');
      return null;
    }
    const exists = activeClients.some(c => c.id === activeClientId);
    if (!exists) {
      console.log('[NexusContext] validatedActiveClientId: activeClientId not found in activeClients, returning null');
      return null;
    }
    console.log('[NexusContext] validatedActiveClientId: VALID -', activeClientId);
    return activeClientId;
  }, [isAuthenticated, isAuthLoading, isLoadingClients, activeClientId, activeClients]);

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations', validatedActiveClientId],
    queryFn: async () => {
      console.log('[NexusContext] QUERY: Fetching conversations for validatedClientId:', validatedActiveClientId);
      const result = await api.conversations.getAll(validatedActiveClientId || undefined);
      console.log('[NexusContext] QUERY: Conversations loaded:', result.length, 'conversations');
      return result;
    },
    enabled: !!validatedActiveClientId,
  });

  const { data: activeConversationMessages = [], isLoading: isLoadingConversationMessages } = useQuery({
    queryKey: ['conversationMessages', activeConversation?.id],
    queryFn: () => activeConversation ? api.conversations.getMessages(activeConversation.id) : Promise.resolve([]),
    enabled: !!activeConversation?.id,
  });

  React.useEffect(() => {
    console.log('[NexusContext] EFFECT: Checking activeClientId validation | State:', { isAuthenticated, isAuthLoading, activeClientsCount: activeClients.length, isLoadingClients, activeClientId });
    if (isAuthenticated && !isAuthLoading && activeClients.length > 0 && !isLoadingClients) {
      if (activeClientId) {
        const savedClientExists = activeClients.some(c => c.id === activeClientId);
        console.log('[NexusContext] EFFECT: Saved client exists?', savedClientExists);
        if (!savedClientExists) {
          console.log('[NexusContext] EFFECT: Saved client NOT found, switching to first client:', activeClients[0].id);
          setActiveClientId(activeClients[0].id);
        }
      } else {
        console.log('[NexusContext] EFFECT: No activeClientId, setting to first client:', activeClients[0].id);
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
      // Delay mark-as-read to allow frontend to capture unread message IDs first
      setTimeout(() => {
        markConversationAsReadMutation.mutate(conversation.id);
      }, 1500);
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
      activeClients,
      conversations,
      activeConversation,
      activeConversationMessages,
      isLoadingClients,
      isLoadingConversations,
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
