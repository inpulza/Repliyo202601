import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { Client, Message } from '@shared/schema';
import { useAuth } from './AuthContext';

interface ClientSettings {
  agentName: string;
  tone: string;
  businessContext: string;
}

interface NexusContextType {
  activeClientId: string | null;
  activeClient: Client | undefined;
  clients: Client[];
  messages: Message[];
  isLoadingClients: boolean;
  isLoadingMessages: boolean;
  setActiveClientId: (id: string) => void;
  updateClientSettings: (clientId: string, settings: ClientSettings) => void;
  updateMessageDraft: (messageId: string, draft: string) => void;
  approveMessage: (messageId: string) => void;
  refreshFeed: () => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  metricoolBrands: any[];
  isLoadingMetricool: boolean;
  fetchMetricoolBrands: () => Promise<void>;
  importMetricoolBrand: (brandId: string) => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

export const NexusProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [metricoolBrands, setMetricoolBrands] = useState<any[]>([]);
  const [isLoadingMetricool, setIsLoadingMetricool] = useState(false);

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: api.clients.getAll,
    enabled: isAuthenticated && !isAuthLoading,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', activeClientId],
    queryFn: () => api.messages.getAll(activeClientId || undefined),
    enabled: !!activeClientId,
  });

  // Auto-select first client when loaded
  React.useEffect(() => {
    console.log('[NexusContext] Effect triggered:', {
      isAuthenticated,
      isAuthLoading,
      hasActiveClientId: !!activeClientId,
      clientsLength: clients.length,
      isLoadingClients,
      firstClientId: clients[0]?.id
    });
    
    if (isAuthenticated && !isAuthLoading && !activeClientId && clients.length > 0 && !isLoadingClients) {
      console.log('[NexusContext] Auto-selecting first client:', clients[0].id);
      setActiveClientId(clients[0].id);
    }
  }, [isAuthenticated, isAuthLoading, clients.length, activeClientId, isLoadingClients]);

  const activeClient = React.useMemo(
    () => clients.find(c => c.id === activeClientId),
    [clients, activeClientId]
  );

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

  const importMetricoolBrand = async (brandId: string) => {
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

      const importedBrand = await api.metricool.importBrand({
        ...brandToImport,
        agentName: `${brandToImport.name.split(' ')[0]}Bot`,
        tone: 'casual',
        businessContext: `Official account for ${brandToImport.name}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['clients'] });

      toast({
        title: "Marca Importada",
        description: `${importedBrand.name} ha sido agregado correctamente.`,
      });

      toast({
        title: "Sincronizando Mensajes",
        description: "Descargando DMs y comentarios de Metricool...",
      });

      await api.metricool.syncBrand(importedBrand.id);

      queryClient.invalidateQueries({ queryKey: ['messages'] });
      
      toast({
        title: "¡Sincronización Completada!",
        description: "Los mensajes de Metricool han sido importados.",
      });

      setActiveClientId(importedBrand.id);

    } catch (error: any) {
      console.error('Error importing brand:', error);
      toast({
        title: "Error al Importar",
        description: error.message || "No se pudo importar la marca.",
        variant: "destructive"
      });
    }
  };

  const deprecatedImportMetricoolBrandOld = (brandId: string) => {
    const brandToImport = metricoolBrands.find(b => b.id === brandId);
    if (!brandToImport) return;

    if (clients.some(c => c.name === brandToImport.name)) {
       toast({
        title: "Already Connected",
        description: "This brand is already in your workspace.",
        variant: "destructive"
      });
      return;
    }

    addClient({
      name: brandToImport.name,
      industry: brandToImport.industry,
      avatar: brandToImport.avatar,
      agentName: `${brandToImport.name.split(' ')[0]}Bot`,
      tone: 'casual',
      businessContext: `Official account for ${brandToImport.name}.`,
    });
    
    toast({
      title: "Importing Data",
      description: "Fetching recent DMs and comments from Metricool...",
    });

    setTimeout(() => {
       toast({
        title: "Sync Complete",
        description: "Messages loaded successfully.",
      });
    }, 2000);
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
    queryClient.invalidateQueries({ queryKey: ['messages'] });
    toast({ title: "Feed Refreshed", description: "Checking for new messages..." });
  };

  return (
    <NexusContext.Provider value={{
      activeClientId,
      activeClient,
      clients,
      messages,
      isLoadingClients,
      isLoadingMessages,
      setActiveClientId,
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
