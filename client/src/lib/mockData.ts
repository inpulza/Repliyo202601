
export type MessageStatus = 'unread' | 'drafting' | 'ready_for_review' | 'approved' | 'sent';
export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'youtube';
export type MessageType = 'dm' | 'comment';
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
  }
];
