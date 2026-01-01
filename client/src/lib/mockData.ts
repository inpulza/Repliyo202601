
export type MessageStatus = 'unread' | 'drafting' | 'ready_for_review' | 'approved' | 'sent';
export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'youtube' | 'google-business' | 'whatsapp';
export type MessageType = 'dm' | 'comment' | 'review';
export type Tone = 'formal' | 'casual' | 'funny' | 'empathetic';
export type Urgency = 'high' | 'medium' | 'low';
export type Intent = 'sales' | 'support' | 'complaint' | 'general';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Message {
  id: string;
  clientId: string;
  platform: Platform;
  type: MessageType;
  author: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
  draftResponse?: string;
  
  // AI Fields
  urgency: Urgency;
  intent: Intent;
  sentiment: Sentiment;
  aiSummary?: string;

  // Context Fields
  sourceUrl?: string;
  contextType?: 'post' | 'reel' | 'story' | 'dm' | 'ad';
  crmData?: CRMContact;
  
  // Message origin tracking
  source?: string;
}

// Repliyo source constants for message origin detection
// Includes all values that indicate a message was sent from Repliyo (not from the social network directly)
export const REPLIYO_SOURCES = ['repliyo', 'repliyo_auto', 'ai_agent'] as const;
export type RepliyoSource = typeof REPLIYO_SOURCES[number];

// Sources that indicate AI-generated content
export const AI_SOURCES = ['repliyo_auto', 'ai_agent'] as const;
export type AISource = typeof AI_SOURCES[number];

// Sources that indicate manual sends from Repliyo (not AI)
export const MANUAL_SOURCES = ['repliyo'] as const;
export type ManualSource = typeof MANUAL_SOURCES[number];

// Source for messages synced from social networks (not sent from Repliyo)
export const SYNC_SOURCES = ['metricool_sync'] as const;
export type SyncSource = typeof SYNC_SOURCES[number];

// Internal origin values (immutable field)
export const INTERNAL_ORIGINS = ['manual', 'ai', 'reminder'] as const;
export type InternalOrigin = typeof INTERNAL_ORIGINS[number];

// Helper functions for message source detection
// Uses internalOrigin as primary source (immutable), with fallback to source for backward compatibility
// Returns false explicitly when both values are null/undefined (message from social network sync)

export function isRepliyoMessage(source: string | null | undefined, internalOrigin?: string | null): boolean {
  // Primary: use internalOrigin (immutable field that can't be overwritten by sync)
  if (internalOrigin === 'manual' || internalOrigin === 'ai' || internalOrigin === 'reminder') {
    return true;
  }
  // Fallback: use source for backward compatibility with existing messages
  if (source && REPLIYO_SOURCES.includes(source as RepliyoSource)) {
    return true;
  }
  // Explicitly return false for null/undefined or sync sources
  return false;
}

export function isReminderMessage(source: string | null | undefined, internalOrigin?: string | null): boolean {
  // Primary: use internalOrigin (immutable)
  if (internalOrigin === 'reminder') {
    return true;
  }
  // Fallback: check source
  if (source === 'reminder_service') {
    return true;
  }
  return false;
}

export function isAutoReply(source: string | null | undefined, internalOrigin?: string | null): boolean {
  // Primary: use internalOrigin (immutable)
  if (internalOrigin === 'ai') {
    return true;
  }
  // Fallback: use source for backward compatibility (includes 'repliyo_auto' and 'ai_agent')
  if (source && AI_SOURCES.includes(source as AISource)) {
    return true;
  }
  // Explicitly return false for null/undefined or non-AI sources
  return false;
}

// Helper to check if message was sent manually from Repliyo (not AI)
export function isManualReply(source: string | null | undefined, internalOrigin?: string | null): boolean {
  // Primary: use internalOrigin
  if (internalOrigin === 'manual') {
    return true;
  }
  // If AI, explicitly return false
  if (internalOrigin === 'ai') {
    return false;
  }
  // Fallback: check for manual sources (any Repliyo source that's not an AI source)
  if (source && MANUAL_SOURCES.includes(source as ManualSource)) {
    return true;
  }
  // Explicitly return false for null/undefined or sync/AI sources
  return false;
}

// Helper to check if message was synced from social network (not sent from Repliyo)
export function isSyncedMessage(source: string | null | undefined, internalOrigin?: string | null): boolean {
  // If internalOrigin is set, it's from Repliyo, not synced
  if (internalOrigin === 'manual' || internalOrigin === 'ai' || internalOrigin === 'reminder') {
    return false;
  }
  // Check for sync sources
  if (source && SYNC_SOURCES.includes(source as SyncSource)) {
    return true;
  }
  // If source is null/undefined and no internalOrigin, assume synced (legacy data)
  if (!source && !internalOrigin) {
    return true;
  }
  return false;
}

export interface CRMContact {
  crmId: string;
  crmType: 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho' | 'monday' | 'notion' | 'airtable';
  email: string;
  phone: string;
  company: string;
  dealValue: number;
  dealStage: 'New' | 'Discovery' | 'Negotiation' | 'Closed Won';
  lastNote: string;
  profileUrl: string;
}

export interface ClientSettings {
  agentName: string;
  tone: Tone;
  businessContext: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  avatar: string;
  settings: ClientSettings;
}

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Burger King Local',
    industry: 'Restaurant',
    avatar: 'https://images.unsplash.com/photo-1561758033-d8f3c660b13c?w=100&h=100&fit=crop',
    settings: {
      agentName: 'BurgerBuddy',
      tone: 'funny',
      businessContext: 'We are a local franchise of a major burger chain.',
    },
  },
];

export const MOCK_MESSAGES: Message[] = [
  // 1. Complaint Urgent (Facebook)
  {
    id: 'm1',
    clientId: 'c1',
    platform: 'facebook',
    type: 'comment',
    author: 'AngryCustomer88',
    content: 'I waited 45 minutes for my order and it was COLD! This is unacceptable service. I want a refund immediately.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    status: 'unread',
    urgency: 'high',
    intent: 'complaint',
    sentiment: 'negative',
    aiSummary: 'Customer is angry about wait time and cold food. Demanding refund.',
    sourceUrl: 'https://facebook.com/post/123',
    contextType: 'post'
  },
  // 2. Lead (Instagram)
  {
    id: 'm2',
    clientId: 'c1',
    platform: 'instagram',
    type: 'dm',
    author: '@burger_fan_sophie',
    content: 'Hey! Do you guys do catering for birthday parties? Looking for prices for about 20 people.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    status: 'unread',
    urgency: 'medium',
    intent: 'sales',
    sentiment: 'positive',
    aiSummary: 'Potential lead inquiring about catering pricing for an event.',
    contextType: 'dm',
    crmData: {
      crmId: 'hs_12345',
      crmType: 'hubspot',
      email: 'sophie@events.com',
      phone: '+1 (555) 987-6543',
      company: 'Sophie Events LLC',
      dealValue: 2500,
      dealStage: 'Discovery',
      lastNote: 'Interested in catering for 20 people. Sent initial menu.',
      profileUrl: 'https://app.hubspot.com/contacts/12345'
    }
  },
  // 3. Neutral/General (YouTube)
  {
    id: 'm3',
    clientId: 'c1',
    platform: 'youtube',
    type: 'comment',
    author: 'RandomViewer',
    content: 'First view! cool video.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    status: 'unread',
    urgency: 'low',
    intent: 'general',
    sentiment: 'neutral',
    aiSummary: 'General engagement comment.',
    sourceUrl: 'https://youtube.com/watch?v=video123&lc=comment456',
    contextType: 'post'
  },
  // 4. Support (LinkedIn)
  {
    id: 'm4',
    clientId: 'c1',
    platform: 'linkedin',
    type: 'dm',
    author: 'Supplier Inc.',
    content: 'Hello, just checking if you received the invoice for the last shipment of buns?',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    status: 'unread',
    urgency: 'medium',
    intent: 'support',
    sentiment: 'neutral',
    aiSummary: 'Vendor follow-up regarding invoice status.',
    contextType: 'dm',
    crmData: {
      crmId: 'hs_67890',
      crmType: 'hubspot',
      email: 'accounts@supplierinc.com',
      phone: '+1 (555) 111-2222',
      company: 'Supplier Inc.',
      dealValue: 10000,
      dealStage: 'Closed Won',
      lastNote: 'Invoice #4455 sent. Waiting for payment.',
      profileUrl: 'https://app.hubspot.com/contacts/67890'
    }
  },
  // 5. Positive Feedback (TikTok)
  {
    id: 'm5',
    clientId: 'c1',
    platform: 'tiktok',
    type: 'comment',
    author: '@spicy_lover',
    content: 'Omg the new spicy sauce is EVERYTHING 🔥 Need to buy a bottle!',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    status: 'unread',
    urgency: 'medium',
    intent: 'sales',
    sentiment: 'positive',
    aiSummary: 'Strong positive product feedback, potential upsell opportunity.',
    sourceUrl: 'https://tiktok.com/@user/video/789',
    contextType: 'post'
  },
  // 6. Low Urgency Complaint (Instagram)
  {
    id: 'm6',
    clientId: 'c1',
    platform: 'instagram',
    type: 'comment',
    author: '@picky_eater',
    content: 'The music was a bit loud yesterday.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    status: 'unread',
    urgency: 'low',
    intent: 'complaint',
    sentiment: 'negative',
    aiSummary: 'Minor complaint about ambiance/volume.',
    sourceUrl: 'https://instagram.com/p/post321',
    contextType: 'post'
  },
  // 7. Google Business Review
  {
    id: 'm7',
    clientId: 'c1',
    platform: 'google-business',
    type: 'review',
    author: 'Local Guide Level 6',
    content: 'Great place, but parking is a nightmare during lunch hours.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    status: 'unread',
    urgency: 'medium',
    intent: 'complaint',
    sentiment: 'neutral',
    aiSummary: 'Feedback about parking availability.',
    sourceUrl: 'https://goo.gl/maps/review123',
    contextType: 'post'
  },
  // 8. WhatsApp Message
  {
    id: 'm8',
    clientId: 'c1',
    platform: 'whatsapp',
    type: 'dm',
    author: '+1 555-0123',
    content: 'Hi, can I place an order for pickup via WhatsApp?',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
    status: 'unread',
    urgency: 'high',
    intent: 'sales',
    sentiment: 'positive',
    aiSummary: 'Direct order inquiry via WhatsApp.',
    contextType: 'dm'
  },
  // 9. High Urgency Support (Not Synced)
  {
    id: 'm9',
    clientId: 'c1',
    platform: 'facebook',
    type: 'dm',
    author: 'Mark Zuckerberg',
    content: 'We have a serious issue with the enterprise contract. Call me ASAP.',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
    status: 'unread',
    urgency: 'high',
    intent: 'support',
    sentiment: 'negative',
    aiSummary: 'Critical enterprise issue reported by high-profile user.',
    contextType: 'dm'
  }
];
