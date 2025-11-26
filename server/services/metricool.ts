interface MetricoolConfig {
  userToken: string;
  userId: string;
}

interface MetricoolBrand {
  blogId: string;
  name: string;
  avatar?: string;
  url?: string;
}

interface MetricoolConversation {
  id: string;
  provider: string;
  participants: any[];
  messages: any[];
  lastUpdate: string;
  rawData?: any;
}

interface MetricoolComment {
  id: string;
  provider: string;
  postId: string;
  postUrl?: string;
  author: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
  replies?: any[];
  rawData?: any;
}

export const SUPPORTED_PROVIDERS = ['facebook', 'instagram', 'TIKTOKBUSINESS', 'GMB', 'twitter', 'linkedin', 'youtube'] as const;
export type SocialProvider = typeof SUPPORTED_PROVIDERS[number];

export class MetricoolService {
  private baseUrl = 'https://app.metricool.com/api';
  private config: MetricoolConfig;

  constructor(config: MetricoolConfig) {
    this.config = config;
  }

  async getAllInboxData(blogId: string): Promise<{ conversations: MetricoolConversation[]; comments: MetricoolComment[] }> {
    const allConversations: MetricoolConversation[] = [];
    const allComments: MetricoolComment[] = [];

    const conversationProviders: SocialProvider[] = ['instagram', 'facebook'];
    const commentProviders: SocialProvider[] = ['instagram', 'facebook', 'TIKTOKBUSINESS', 'youtube', 'linkedin', 'GMB'];

    for (const provider of conversationProviders) {
      try {
        const conversations = await this.getConversations(blogId, provider);
        allConversations.push(...conversations);
      } catch (error: any) {
        console.log(`No conversations for ${provider} on brand ${blogId}`);
      }
    }

    for (const provider of commentProviders) {
      try {
        const comments = await this.getComments(blogId, provider);
        allComments.push(...comments);
      } catch (error: any) {
        console.log(`No comments for ${provider} on brand ${blogId}`);
      }
    }

    return { conversations: allConversations, comments: allComments };
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    url.searchParams.append('userId', this.config.userId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Mc-Auth': this.config.userToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Metricool API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getBrands(): Promise<MetricoolBrand[]> {
    try {
      const response = await this.makeRequest<any>('/admin/simpleProfiles', {
        blogId: this.config.userId,
      });

      if (!response || !Array.isArray(response)) {
        console.error('Unexpected response format from Metricool getBrands:', response);
        return [];
      }

      return response.map((brand: any) => ({
        blogId: String(brand.id || brand.blogId || brand.blog_id),
        name: brand.label || brand.name || brand.title || 'Unknown Brand',
        avatar: brand.picture || brand.avatar || brand.image || brand.logo,
        url: brand.url || brand.website,
      }));
    } catch (error) {
      console.error('Error fetching Metricool brands:', error);
      throw error;
    }
  }

  async getConversations(blogId: string, provider: string = 'instagram'): Promise<MetricoolConversation[]> {
    try {
      const params: Record<string, any> = {
        blogId,
        provider,
      };

      const response = await this.makeRequest<any>('/v2/inbox/conversations', params);

      if (!response) {
        return [];
      }

      const conversations = Array.isArray(response) ? response : (response.data || response.conversations || []);

      return conversations.map((conv: any) => ({
        id: String(conv.id || conv.conversationId),
        provider: conv.provider || conv.network || 'unknown',
        participants: conv.participants || [],
        messages: conv.messages || [],
        lastUpdate: conv.lastUpdate || conv.updated_at || new Date().toISOString(),
        rawData: conv,
      }));
    } catch (error) {
      console.error(`Error fetching conversations for blogId ${blogId}:`, error);
      throw error;
    }
  }

  async getComments(blogId: string, provider: string = 'instagram'): Promise<MetricoolComment[]> {
    try {
      const params: Record<string, any> = {
        blogId,
        provider,
      };

      const response = await this.makeRequest<any>('/v2/inbox/post-comments', params);

      if (!response) {
        return [];
      }

      const comments = Array.isArray(response) ? response : (response.data || response.comments || []);

      return comments.map((comment: any) => {
        let author = 'Unknown';
        let authorAvatar = null;
        let content = '';
        let timestamp = new Date().toISOString();
        let postUrl = null;

        if (comment.provider === 'LINKEDIN' || comment.provider === 'TIKTOKBUSINESS' || comment.provider === 'INSTAGRAM') {
          const ownerId = comment.root?.owner;
          const participants = comment.participants || [];
          const ownerParticipant = participants.find((p: any) => p.id === ownerId);
          
          author = ownerParticipant?.name || `Unknown ${comment.provider} User`;
          authorAvatar = ownerParticipant?.imageProfileUrl || null;
          content = comment.root?.text || '';
          timestamp = comment.root?.creationDate || comment.creationDate || timestamp;
          postUrl = comment.root?.element?.link || null;
        } else {
          author = comment.author || comment.user || comment.from?.name || comment.sender?.name || 'Unknown';
          authorAvatar = comment.authorAvatar || comment.author_avatar || comment.from?.picture || comment.sender?.picture || null;
          content = comment.message || comment.text || comment.content || '';
          timestamp = comment.created_time || comment.timestamp || comment.creationDate || timestamp;
          postUrl = comment.postUrl || comment.post_url || comment.permalink || null;
        }

        return {
          id: String(comment.id || comment.commentId),
          provider: comment.provider || comment.network || 'unknown',
          postId: String(comment.postId || comment.post_id || comment.root?.element?.id || ''),
          postUrl,
          author,
          authorAvatar,
          content,
          timestamp,
          replies: comment.replies || comment.comments || [],
          rawData: comment,
        };
      });
    } catch (error) {
      console.error(`Error fetching comments for blogId ${blogId}:`, error);
      throw error;
    }
  }
}

export function createMetricoolService(userToken?: string, userId?: string): MetricoolService {
  const token = userToken || process.env.METRICOOL_USER_TOKEN;
  const id = userId || process.env.METRICOOL_USER_ID;

  if (!token || !id) {
    throw new Error('Metricool credentials not configured. Set METRICOOL_USER_TOKEN and METRICOOL_USER_ID.');
  }

  return new MetricoolService({
    userToken: token,
    userId: id,
  });
}
