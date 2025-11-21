export type MessageStatus = 'unread' | 'drafting' | 'ready_for_review' | 'approved' | 'sent';
export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'linkedin';
export type MessageType = 'dm' | 'comment';
export type Tone = 'formal' | 'casual' | 'funny' | 'empathetic';

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
      businessContext: 'We are a local franchise of a major burger chain. We value quick service, humor, and community engagement. Ignore complaints about corporate policy, focus on local food quality.',
    },
  },
  {
    id: 'c2',
    name: 'Urban Threads',
    industry: 'Fashion Retail',
    avatar: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    settings: {
      agentName: 'StyleAssistant',
      tone: 'casual',
      businessContext: 'Trendy boutique clothing store for young adults. Focus on style tips, new arrivals, and inclusive fashion. Be helpful and trendy.',
    },
  },
  {
    id: 'c3',
    name: 'TechNova Solutions',
    industry: 'B2B SaaS',
    avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop',
    settings: {
      agentName: 'NovaSupport',
      tone: 'formal',
      businessContext: 'Enterprise software solutions for data analytics. Responses should be professional, concise, and technically accurate. Direct support issues to the ticket system.',
    },
  },
];

export const MOCK_MESSAGES: Message[] = [
  // Client 1 - Burger King Local
  {
    id: 'm1',
    clientId: 'c1',
    platform: 'instagram',
    type: 'dm',
    author: '@foodie_jane',
    content: 'Are you open late tonight? Craving a burger!',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    status: 'unread',
  },
  {
    id: 'm2',
    clientId: 'c1',
    platform: 'facebook',
    type: 'comment',
    author: 'John Smith',
    content: 'The fries were cold yesterday. Not happy.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    status: 'drafting',
  },
  {
    id: 'm3',
    clientId: 'c1',
    platform: 'tiktok',
    type: 'comment',
    author: '@burger_lover99',
    content: 'This new spicy burger is FIRE! 🔥🔥🔥',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    status: 'ready_for_review',
    draftResponse: 'Glad you loved it! 🔥 Come back soon for another round!',
  },
  {
    id: 'm4',
    clientId: 'c1',
    platform: 'instagram',
    type: 'dm',
    author: '@health_nut',
    content: 'Do you have gluten free buns?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    status: 'approved',
    draftResponse: 'Yes! We offer lettuce wraps and GF buns upon request.',
  },
  {
    id: 'm5',
    clientId: 'c1',
    platform: 'facebook',
    type: 'comment',
    author: 'Sarah Connor',
    content: 'Is the terminator promotion still running?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    status: 'sent',
    draftResponse: 'Hasta la vista, baby! (Yes, until Friday)',
  },
  // New LinkedIn Message for diversity
  {
    id: 'm11',
    clientId: 'c1',
    platform: 'linkedin',
    type: 'dm',
    author: 'Business Weekly',
    content: 'We would like to feature your franchise in our next issue.',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    status: 'unread',
  },


  // Client 2 - Urban Threads
  {
    id: 'm6',
    clientId: 'c2',
    platform: 'instagram',
    type: 'comment',
    author: '@fashionista_x',
    content: 'When is the summer collection dropping?',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'unread',
  },
  {
    id: 'm7',
    clientId: 'c2',
    platform: 'tiktok',
    type: 'comment',
    author: '@trendsetter',
    content: 'Can I style this jacket with jeans?',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'ready_for_review',
    draftResponse: 'Absolutely! It looks great with distressed denim and white sneakers.',
  },
  {
    id: 'm8',
    clientId: 'c2',
    platform: 'facebook',
    type: 'dm',
    author: 'MomShopper',
    content: 'Do you have kids sizes?',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'unread',
  },

  // Client 3 - TechNova
  {
    id: 'm9',
    clientId: 'c3',
    platform: 'linkedin',
    type: 'dm',
    author: 'CTO_Dave',
    content: 'API seems down, getting 500 errors.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: 'unread',
  },
  {
    id: 'm10',
    clientId: 'c3',
    platform: 'instagram',
    type: 'dm',
    author: '@startuplife',
    content: 'Love the new dashboard design!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    status: 'ready_for_review',
    draftResponse: 'Thank you! Our design team worked hard on the new UX.',
  },
];
