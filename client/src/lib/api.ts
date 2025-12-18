import type { Client, Message, Brand, Conversation, SocialPost, SocialAccount, AiAgent, AiAgentAuditLog } from '@shared/schema';
import type { Platform, MessageType, Urgency, Intent, Sentiment, MessageStatus, CRMContact } from '@/lib/types';

export type { SocialAccount };

const API_BASE = '/api';

export interface DetectedProvider {
  provider: string;
  accountName: string | null;
  accountAvatar?: string | null;
}

interface MetricoolBrand {
  id: string;
  name: string;
  industry: string;
  avatar: string | null;
  blogId: string;
  detectedProviders?: DetectedProvider[];
}

interface ImportBrandPayload extends MetricoolBrand {
  agentName?: string;
  tone?: string;
  businessContext?: string;
  detectedProviders?: DetectedProvider[];
  selectedProviders?: string[];
}

interface ImportBrandResponse extends Brand {
  socialAccounts?: SocialAccount[];
}

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
  threadId?: string | null;
  parentMessageId?: string | null;
} {
  // Convert 'conversation' to 'dm' for frontend display
  const messageType: MessageType = dbMsg.type === 'conversation' ? 'dm' : (dbMsg.type as MessageType);
  
  return {
    ...dbMsg,
    platform: dbMsg.platform as Platform,
    type: messageType,
    urgency: dbMsg.urgency as Urgency,
    intent: dbMsg.intent as Intent,
    sentiment: dbMsg.sentiment as Sentiment,
    status: dbMsg.status as MessageStatus,
    timestamp: new Date(dbMsg.timestamp),
    crmData: dbMsg.crmData as CRMContact | undefined,
    threadId: dbMsg.threadId || null,
    parentMessageId: dbMsg.parentMessageId || null,
  };
}

export const api = {
  clients: {
    getAll: async (): Promise<Client[]> => {
      const res = await fetch(`${API_BASE}/brands`);
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    },
    
    getById: async (id: string): Promise<Client> => {
      const res = await fetch(`${API_BASE}/brands/${id}`);
      if (!res.ok) throw new Error('Failed to fetch client');
      return res.json();
    },
    
    create: async (data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
      const res = await fetch(`${API_BASE}/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create client');
      return res.json();
    },
  },

  metricool: {
    getBrands: async (): Promise<MetricoolBrand[]> => {
      const res = await fetch(`${API_BASE}/metricool/brands`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch Metricool brands');
      }
      return res.json();
    },

    importBrand: async (brand: ImportBrandPayload): Promise<ImportBrandResponse> => {
      const res = await fetch(`${API_BASE}/brands/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to import brand');
      }
      return res.json();
    },

    syncBrand: async (brandId: string): Promise<{ success: boolean; stats: any }> => {
      const res = await fetch(`${API_BASE}/sync-brand/${brandId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to sync brand');
      }
      return res.json();
    },

    getSyncStatus: async (brandId: string): Promise<{ syncPaused: boolean }> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/sync-status`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get sync status');
      }
      return res.json();
    },

    updateSyncStatus: async (brandId: string, syncPaused: boolean): Promise<{ message: string; syncPaused: boolean }> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/sync-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncPaused }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update sync status');
      }
      return res.json();
    },
  },

  socialAccounts: {
    getByBrand: async (brandId: string): Promise<SocialAccount[]> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/social-accounts`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch social accounts');
      }
      return res.json();
    },

    updateStatus: async (brandId: string, provider: string, isActive: boolean): Promise<SocialAccount> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/social-accounts/${provider}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update social account');
      }
      return res.json();
    },

    refresh: async (brandId: string): Promise<{ message: string; detected: number; accounts: SocialAccount[] }> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/social-accounts/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to refresh social accounts');
      }
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

  conversations: {
    getAll: async (brandId?: string, platform?: string, type?: string): Promise<(Conversation & { socialPost: SocialPost | null })[]> => {
      const params = new URLSearchParams();
      if (brandId) params.append('brandId', brandId);
      if (platform) params.append('platform', platform);
      if (type) params.append('type', type);
      
      const url = `${API_BASE}/conversations${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    },

    getById: async (id: string): Promise<Conversation & { socialPost: SocialPost | null }> => {
      const res = await fetch(`${API_BASE}/conversations/${id}`);
      if (!res.ok) throw new Error('Failed to fetch conversation');
      return res.json();
    },

    getMessages: async (conversationId: string): Promise<Message[]> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch conversation messages');
      const messages: Message[] = await res.json();
      return messages.map(adaptMessage);
    },

    markAsRead: async (conversationId: string): Promise<Conversation> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/mark-read`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark conversation as read');
      return res.json();
    },

    update: async (id: string, data: Partial<Conversation>): Promise<Conversation> => {
      const res = await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update conversation');
      return res.json();
    },
  },

  aiAgent: {
    get: async (brandId: string): Promise<AiAgent | null> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}`);
      if (res.status === 404) return null;
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch AI agent');
      }
      return res.json();
    },

    save: async (brandId: string, data: Partial<AiAgent>): Promise<AiAgent> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save AI agent');
      }
      return res.json();
    },

    generateReply: async (brandId: string, messageId: string, conversationId: string): Promise<{ 
      success: boolean;
      reply: string;
      characterCount: number;
      platformLimit: number;
      wasCharacterLimited: boolean;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      model: string;
      provider: string;
    }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/generate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, conversationId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate reply');
      }
      return res.json();
    },

    getAuditLog: async (brandId: string, limit?: number): Promise<AiAgentAuditLog[]> => {
      const params = limit ? `?limit=${limit}` : '';
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/audit-log${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch audit log');
      }
      return res.json();
    },

    testGenerate: async (brandId: string, testMessage: string, platform: string = 'instagram'): Promise<{
      success: boolean;
      reply: string;
      characterCount: number;
      platformLimit: number;
      wasCharacterLimited: boolean;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      model: string;
      provider: string;
      error?: string;
    }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/test-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testMessage, platform }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate test reply');
      }
      return res.json();
    },

    generateDraft: async (brandId: string, messageId: string): Promise<{
      success: boolean;
      draft: string;
      messageId: string;
      characterCount: number;
      provider?: string;
      model?: string;
    }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/generate-draft/${messageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate draft');
      }
      return res.json();
    },

    regenerateDraft: async (brandId: string, messageId: string, confirmOverwrite: boolean = false): Promise<{
      success: boolean;
      draft: string;
      messageId: string;
      characterCount: number;
      requiresConfirmation?: boolean;
      message?: string;
    }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/regenerate-draft/${messageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmOverwrite }),
      });
      if (!res.ok) {
        const error = await res.json();
        if (error.requiresConfirmation) {
          return { success: false, draft: '', messageId, characterCount: 0, requiresConfirmation: true, message: error.message };
        }
        throw new Error(error.error || 'Failed to regenerate draft');
      }
      return res.json();
    },

    bulkGenerateDrafts: async (brandId: string, messageIds?: string[], limit?: number): Promise<{
      success: boolean;
      message: string;
      processed: number;
      successCount: number;
      errorCount: number;
      results: Array<{ messageId: string; success: boolean; error?: string }>;
    }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/bulk-generate-drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, limit }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to bulk generate drafts');
      }
      return res.json();
    },

    updateDraft: async (brandId: string, messageId: string, draft: string): Promise<{ success: boolean; messageId: string; draft: string }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/update-draft/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update draft');
      }
      return res.json();
    },

    discardDraft: async (brandId: string, messageId: string): Promise<{ success: boolean; messageId: string }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/discard-draft/${messageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to discard draft');
      }
      return res.json();
    },

    sendDraft: async (brandId: string, messageId: string): Promise<{ success: boolean; messageId: string; externalMessageId?: string }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/send-draft/${messageId}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send draft');
      }
      return res.json();
    },

    getDraftsCount: async (brandId: string): Promise<{
      needsDrafts: number;
      conversationsWithPendingDrafts: number;
      conversationIds: string[];
    }> => {
      const res = await fetch(`${API_BASE}/ai-agent/${brandId}/drafts-count`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get drafts count');
      }
      return res.json();
    },
  },
};
