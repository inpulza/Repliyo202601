import type { Client, Message, Brand, Conversation, SocialPost, SocialAccount, AiAgent, AiAgentAuditLog, PlaygroundTemplate, ReminderRules, ReminderEvent } from '@shared/schema';
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

    getTimeline: async (conversationId: string): Promise<{ success: boolean; timeline: import('@shared/schema').ConversationTimeline }> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/timeline`);
      if (!res.ok) throw new Error('Failed to fetch timeline');
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

  templates: {
    getAll: async (brandId: string, category?: string): Promise<PlaygroundTemplate[]> => {
      const params = category && category !== 'all' ? `?category=${category}` : '';
      const res = await fetch(`${API_BASE}/brands/${brandId}/templates${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch templates');
      }
      return res.json();
    },

    create: async (brandId: string, data: { category: string; title: string; content: string }): Promise<PlaygroundTemplate> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create template');
      }
      return res.json();
    },

    update: async (brandId: string, id: string, data: Partial<{ category: string; title: string; content: string }>): Promise<PlaygroundTemplate> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update template');
      }
      return res.json();
    },

    delete: async (brandId: string, id: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete template');
      }
    },

    incrementUsage: async (brandId: string, id: string): Promise<PlaygroundTemplate> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/templates/${id}/use`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to increment usage');
      }
      return res.json();
    },
  },

  crm: {
    getContactByChannel: async (brandId: string, platform: string, externalId: string): Promise<{ contact: any; channels: any[] } | null> => {
      const res = await fetch(`${API_BASE}/crm/contacts/by-channel?brandId=${brandId}&platform=${platform}&externalId=${encodeURIComponent(externalId)}`);
      if (res.status === 404) return null;
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch CRM contact');
      }
      return res.json();
    },

    createContact: async (data: {
      brandId: string;
      displayName: string;
      email?: string;
      phone?: string;
      city?: string;
      country?: string;
      platform?: string;
      externalId?: string;
      username?: string;
      avatarUrl?: string;
    }): Promise<{ contact: any }> => {
      const res = await fetch(`${API_BASE}/crm/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create contact');
      }
      return res.json();
    },

    getContactTimeline: async (contactId: string, limit = 100): Promise<{ messages: any[]; mostRecentConversationId: string | null }> => {
      const res = await fetch(`${API_BASE}/crm/contacts/${contactId}/timeline?limit=${limit}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch timeline');
      }
      return res.json();
    },

    getContactJourney: async (contactId: string): Promise<{ success: boolean; timeline: import('@shared/schema').ConversationTimeline }> => {
      const res = await fetch(`${API_BASE}/crm/contacts/${contactId}/journey`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch journey');
      }
      return res.json();
    },
  },

  lifecycle: {
    updateStatus: async (conversationId: string, status: string, userId?: string): Promise<Conversation> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update status');
      }
      return res.json();
    },

    generateSummary: async (conversationId: string): Promise<{ summary: string; sentiment: string; intent: string; resolution: string }> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/generate-summary`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate summary');
      }
      return res.json();
    },

    updateSummary: async (conversationId: string, summary: { summary: string; sentiment: string; intent: string; resolution: string }): Promise<Conversation> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update summary');
      }
      return res.json();
    },

    assign: async (conversationId: string, userId: string): Promise<Conversation> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign conversation');
      }
      return res.json();
    },

    unassign: async (conversationId: string): Promise<Conversation> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/unassign`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to unassign conversation');
      }
      return res.json();
    },

    getAnalytics: async (brandId: string, days = 30): Promise<any> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/lifecycle/analytics?days=${days}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch analytics');
      }
      return res.json();
    },

    getSettings: async (brandId: string): Promise<{ solvedToClosedHours: number; autoGenerateSummary: boolean; csatSurveyEnabled: boolean }> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/lifecycle-settings`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch lifecycle settings');
      }
      return res.json();
    },

    updateSettings: async (brandId: string, settings: { solvedToClosedHours?: number; autoGenerateSummary?: boolean; csatSurveyEnabled?: boolean }): Promise<{ solvedToClosedHours: number; autoGenerateSummary: boolean; csatSurveyEnabled: boolean }> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/lifecycle-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update lifecycle settings');
      }
      return res.json();
    },
  },

  reminders: {
    getRules: async (brandId: string): Promise<ReminderRules | null> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/reminder-rules`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch reminder rules');
      }
      const data = await res.json();
      return data.rules || null;
    },

    updateRules: async (brandId: string, rules: Partial<ReminderRules>): Promise<ReminderRules> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/reminder-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update reminder rules');
      }
      const data = await res.json();
      return data.rules;
    },

    runManual: async (brandId: string): Promise<{ scheduled: number; sent: number; errors: string[] }> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/reminders/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run reminders');
      }
      const data = await res.json();
      return { scheduled: data.scheduled || 0, sent: data.sent || 0, errors: data.errors || [] };
    },

    getEventsByConversation: async (conversationId: string): Promise<ReminderEvent[]> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/reminder-events`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch reminder events');
      }
      const data = await res.json();
      return data.events || [];
    },

    getEventsByBrand: async (brandId: string, options?: { status?: string; limit?: number; includeConversation?: boolean }): Promise<Array<ReminderEvent & {
      conversationType?: string | null;
      conversationPlatform?: string | null;
      customerName?: string | null;
      postId?: string | null;
    }>> => {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.includeConversation) params.append('includeConversation', 'true');
      const url = `${API_BASE}/brands/${brandId}/reminder-events${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch reminder events');
      }
      const data = await res.json();
      return data.events || [];
    },

    optOutConversation: async (conversationId: string): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/reminder-opt-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to opt out');
      }
      return res.json();
    },

    // Analytics
    getStats: async (brandId: string, timeRange: 'today' | '7d' | '30d' = '7d'): Promise<{
      totalSent: number;
      totalScheduled: number;
      totalFailed: number;
      totalCancelled: number;
      totalOptedOut: number;
      conversionCount: number;
      conversionRate: number;
      avgResponseMinutes: number | null;
      dailyCapUsage: number;
      dailyCapLimit: number;
    }> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/reminders/analytics/summary?timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch reminder stats');
      }
      const data = await res.json();
      return data.stats;
    },

    getTimeline: async (brandId: string, timeRange: 'today' | '7d' | '30d' = '7d'): Promise<Array<{
      date: string;
      sent: number;
      conversions: number;
      failed: number;
    }>> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/reminders/analytics/timeline?timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch reminder timeline');
      }
      const data = await res.json();
      return data.timeline || [];
    },

    getFailureReasons: async (brandId: string, timeRange: 'today' | '7d' | '30d' = '7d', limit: number = 10): Promise<Array<{
      reason: string;
      count: number;
    }>> => {
      const res = await fetch(`${API_BASE}/brands/${brandId}/reminders/analytics/failures?timeRange=${timeRange}&limit=${limit}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch failure reasons');
      }
      const data = await res.json();
      return data.failures || [];
    },
  },
};
