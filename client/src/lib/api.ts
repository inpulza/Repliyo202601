import type { Client, Message } from '@shared/schema';
import type { Platform, MessageType, Urgency, Intent, Sentiment, MessageStatus, CRMContact } from '@/lib/types';

const API_BASE = '/api';

// Adapter function to convert DB message to frontend format
function adaptMessage(dbMsg: Message): Message & {
  platform: Platform;
  type: MessageType;
  urgency: Urgency;
  intent: Intent;
  sentiment: Sentiment;
  status: MessageStatus;
  timestamp: Date;
  crmData?: CRMContact;
} {
  return {
    ...dbMsg,
    platform: dbMsg.platform as Platform,
    type: dbMsg.type as MessageType,
    urgency: dbMsg.urgency as Urgency,
    intent: dbMsg.intent as Intent,
    sentiment: dbMsg.sentiment as Sentiment,
    status: dbMsg.status as MessageStatus,
    timestamp: new Date(dbMsg.timestamp),
    crmData: dbMsg.crmData as CRMContact | undefined,
  };
}

export const api = {
  clients: {
    getAll: async (): Promise<Client[]> => {
      const res = await fetch(`${API_BASE}/clients`);
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    },
    
    getById: async (id: string): Promise<Client> => {
      const res = await fetch(`${API_BASE}/clients/${id}`);
      if (!res.ok) throw new Error('Failed to fetch client');
      return res.json();
    },
    
    create: async (data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create client');
      return res.json();
    },
  },
  
  messages: {
    getAll: async (clientId?: string) => {
      const url = clientId 
        ? `${API_BASE}/messages?clientId=${clientId}`
        : `${API_BASE}/messages`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const messages: Message[] = await res.json();
      return messages.map(adaptMessage);
    },
    
    getById: async (id: string) => {
      const res = await fetch(`${API_BASE}/messages/${id}`);
      if (!res.ok) throw new Error('Failed to fetch message');
      const message: Message = await res.json();
      return adaptMessage(message);
    },
    
    create: async (data: Omit<Message, 'id' | 'createdAt'>) => {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create message');
      const message: Message = await res.json();
      return adaptMessage(message);
    },
    
    update: async (id: string, data: Partial<Message>) => {
      const res = await fetch(`${API_BASE}/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update message');
      const message: Message = await res.json();
      return adaptMessage(message);
    },
    
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/messages/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete message');
    },
  },
};
