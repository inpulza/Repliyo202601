import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Message, ClientSettings, MOCK_CLIENTS, MOCK_MESSAGES, MessageStatus } from '@/lib/mockData';
import { toast } from '@/hooks/use-toast';

interface NexusContextType {
  activeClientId: string;
  activeClient: Client | undefined;
  clients: Client[];
  messages: Message[];
  setActiveClientId: (id: string) => void;
  updateClientSettings: (clientId: string, settings: ClientSettings) => void;
  updateMessageDraft: (messageId: string, draft: string) => void;
  approveMessage: (messageId: string) => void;
  refreshFeed: () => void;
  addClient: (client: Client) => void;
  metricoolBrands: any[];
  isLoadingMetricool: boolean;
  fetchMetricoolBrands: () => Promise<void>;
  importMetricoolBrand: (brandId: string) => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

export const NexusProvider = ({ children }: { children: ReactNode }) => {
  const [activeClientId, setActiveClientId] = useState<string>(MOCK_CLIENTS[0].id);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [metricoolBrands, setMetricoolBrands] = useState<any[]>([]);
  const [isLoadingMetricool, setIsLoadingMetricool] = useState(false);

  // Derived state for easier access
  const activeClient = clients.find(c => c.id === activeClientId);

  // Mock function to add a client manually
  const addClient = (client: Client) => {
    setClients(prev => [...prev, client]);
    setActiveClientId(client.id);
    toast({
      title: "Client Added",
      description: `${client.name} has been added to your workspace.`,
    });
  };

  // Mock function to fetch brands from "Metricool"
  const fetchMetricoolBrands = async () => {
    setIsLoadingMetricool(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockBrands = [
      { id: 'mb1', name: 'Nike Official', industry: 'Retail', avatar: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop' },
      { id: 'mb2', name: 'Starbucks Coffee', industry: 'Food & Bev', avatar: 'https://images.unsplash.com/photo-1512428559087-560fa5ce7d87?w=100&h=100&fit=crop' },
      { id: 'mb3', name: 'Spotify', industry: 'Tech', avatar: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=100&h=100&fit=crop' },
      { id: 'mb4', name: 'Local Bakery', industry: 'Small Business', avatar: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop' },
    ];
    
    setMetricoolBrands(mockBrands);
    setIsLoadingMetricool(false);
  };

  const importMetricoolBrand = (brandId: string) => {
    const brandToImport = metricoolBrands.find(b => b.id === brandId);
    if (!brandToImport) return;

    // Check if already exists
    if (clients.some(c => c.name === brandToImport.name)) {
       toast({
        title: "Already Connected",
        description: "This brand is already in your workspace.",
        variant: "destructive"
      });
      return;
    }

    const newClient: Client = {
      id: `imported_${brandToImport.id}`,
      name: brandToImport.name,
      industry: brandToImport.industry,
      avatar: brandToImport.avatar,
      settings: {
        agentName: `${brandToImport.name.split(' ')[0]}Bot`,
        tone: 'casual',
        businessContext: `Official account for ${brandToImport.name}.`,
      }
    };

    addClient(newClient);
    
    // Simulate fetching historical messages
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

  // Simulate Agent "Drafting" Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(currentMessages => {
        // Find an unread message to start "thinking" about
        const unreadMsg = currentMessages.find(m => m.status === 'unread');
        
        if (unreadMsg && Math.random() > 0.6) { // 40% chance to start drafting per tick
          return currentMessages.map(m => 
            m.id === unreadMsg.id ? { ...m, status: 'drafting' } : m
          );
        }

        // Find a drafting message to finish
        const draftingMsg = currentMessages.find(m => m.status === 'drafting');
        if (draftingMsg && Math.random() > 0.5) {
          // Generate a mock response based on tone (simple mock)
          const client = clients.find(c => c.id === draftingMsg.clientId);
          const response = `[${client?.settings.tone}] Here is a generated response for: "${draftingMsg.content}"`;
          
          return currentMessages.map(m => 
            m.id === draftingMsg.id ? { ...m, status: 'ready_for_review', draftResponse: response } : m
          );
        }

        return currentMessages;
      });
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [clients]);

  const updateClientSettings = (clientId: string, newSettings: ClientSettings) => {
    setClients(prev => prev.map(c => 
      c.id === clientId ? { ...c, settings: newSettings } : c
    ));
    toast({
      title: "Settings Saved",
      description: `Updated agent configuration for ${clients.find(c => c.id === clientId)?.name}`,
    });
  };

  const updateMessageDraft = (messageId: string, draft: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, draftResponse: draft } : m
    ));
  };

  const approveMessage = (messageId: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, status: 'approved' } : m
    ));
    
    // Simulate sending after a short delay
    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, status: 'sent' } : m
      ));
      toast({
        title: "Message Sent",
        description: "Response has been published to the platform.",
      });
    }, 1500);
  };

  const refreshFeed = () => {
    // Logic to fetch new messages would go here
    toast({ title: "Feed Refreshed", description: "Checking for new messages..." });
  };

  return (
    <NexusContext.Provider value={{
      activeClientId,
      activeClient,
      clients,
      messages,
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
