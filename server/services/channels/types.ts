export type ChannelProviderId = string;

export interface ChannelCredentials {
  userToken: string;
  userId: string;
}

export interface DetectedChannelProvider {
  provider: string;
  accountName: string | null;
  accountAvatar?: string | null;
}

export interface ChannelExternalBrand {
  blogId: string;
  name: string;
  avatar?: string;
  url?: string;
  detectedProviders: DetectedChannelProvider[];
}

export interface ChannelConversation {
  id: string;
  provider: string;
  participants: any[];
  messages: any[];
  lastUpdate: string;
  rawData?: any;
}

export interface ChannelComment {
  id: string;
  provider: string;
  postId: string;
  postUrl?: string;
  author: string;
  authorAvatar?: string;
  content: string;
  commentMediaUrl?: string | null;
  timestamp: string;
  replies?: any[];
  rawData?: any;
}

export interface ChannelInboxData {
  conversations: ChannelConversation[];
  comments: ChannelComment[];
}

export interface ReplyToCommentInput {
  provider: string;
  objectId: string;
  text: string;
  blogId: string;
  mentionUsername?: string;
}

export interface ReplyToConversationInput {
  provider: string;
  conversationId: string;
  recipient: string;
  text: string;
  blogId: string;
}

export interface MessageProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rawResponse?: any;
}

export interface ChannelProvider {
  readonly providerId: ChannelProviderId;
  getBrands(): Promise<ChannelExternalBrand[]>;
  getAllInboxData(blogId: string, activeProviders?: string[]): Promise<ChannelInboxData>;
}

export interface MessageProviderAdapter {
  readonly providerId: ChannelProviderId;
  replyToComment(params: ReplyToCommentInput): Promise<MessageProviderResult>;
  replyToConversation(params: ReplyToConversationInput): Promise<MessageProviderResult>;
}

export type ChannelAdapter = ChannelProvider & MessageProviderAdapter;
