export type MessageStatus = 'unread' | 'drafting' | 'ready_for_review' | 'approved' | 'sent';
export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'youtube' | 'google-business' | 'whatsapp';
export type MessageType = 'dm' | 'comment' | 'review';
export type Tone = 'formal' | 'casual' | 'funny' | 'empathetic';
export type Urgency = 'high' | 'medium' | 'low';
export type Intent = 'sales' | 'support' | 'complaint' | 'general';
export type Sentiment = 'positive' | 'neutral' | 'negative';

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
