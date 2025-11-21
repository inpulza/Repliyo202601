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
  approveMessage: (messageId: string) => void;
  refreshFeed: () => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

export const NexusProvider = ({ children }: { children: ReactNode }) => {
  const [activeClientId, setActiveClientId] = useState<string>(MOCK_CLIENTS[0].id);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

  // Derived state for easier access
  const activeClient = clients.find(c => c.id === activeClientId);

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
      approveMessage,
      refreshFeed
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
