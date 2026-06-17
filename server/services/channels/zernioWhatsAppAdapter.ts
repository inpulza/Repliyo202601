import type {
  ChannelAdapter,
  ChannelConversation,
  ChannelExternalBrand,
  ChannelInboxData,
  MessageProviderResult,
  ReplyToCommentInput,
  ReplyToConversationInput,
} from "./types";

export const ZERNIO_WHATSAPP_PROVIDER_ID = "zernio-whatsapp";
export const WHATSAPP_SOCIAL_PROVIDER = "WHATSAPP";

export interface ZernioWhatsAppConfig {
  apiToken?: string;
  accountId?: string;
  accountName?: string;
  baseUrl?: string;
  blogId?: string;
  messageConcurrency?: number;
}

type ZernioRequestMethod = "GET" | "POST";

const DEFAULT_INPULZA_WHATSAPP_BLOG_ID = "4074962";
const DEFAULT_MESSAGE_CONCURRENCY = 3;
const MAX_MESSAGE_CONCURRENCY = 10;

export class ZernioWhatsAppChannelAdapter implements ChannelAdapter {
  readonly providerId = ZERNIO_WHATSAPP_PROVIDER_ID;

  private readonly apiToken: string;
  private readonly accountId: string;
  private readonly accountName: string;
  private readonly baseUrl: string;
  private readonly blogId: string;
  private readonly messageConcurrency: number;

  constructor(config: Required<ZernioWhatsAppConfig>) {
    this.apiToken = config.apiToken;
    this.accountId = config.accountId;
    this.accountName = config.accountName;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.blogId = config.blogId;
    this.messageConcurrency = this.clampMessageConcurrency(config.messageConcurrency);
  }

  async getBrands(): Promise<ChannelExternalBrand[]> {
    return [
      {
        blogId: this.blogId,
        name: this.accountName,
        detectedProviders: [
          {
            provider: WHATSAPP_SOCIAL_PROVIDER,
            accountName: this.accountName,
          },
        ],
      },
    ];
  }

  async getAllInboxData(blogId: string, activeProviders?: string[]): Promise<ChannelInboxData> {
    if (!this.isWhatsAppActive(activeProviders)) {
      return { conversations: [], comments: [] };
    }

    if (!this.isAllowedBlogId(blogId)) {
      return { conversations: [], comments: [] };
    }

    const rawConversations = await this.getOpenConversations(this.accountId);
    const conversations = await this.mapWithConcurrency(
      rawConversations,
      this.messageConcurrency,
      (conversation) => this.mapConversation(this.accountId, conversation)
    );

    return {
      conversations,
      comments: [],
    };
  }

  async replyToComment(_params: ReplyToCommentInput): Promise<MessageProviderResult> {
    return {
      success: false,
      error: "WhatsApp does not support public comment replies.",
    };
  }

  async replyToConversation(params: ReplyToConversationInput): Promise<MessageProviderResult> {
    if (!this.isAllowedBlogId(params.blogId)) {
      return {
        success: false,
        error: `WhatsApp is configured only for blogId ${this.blogId}.`,
      };
    }

    const response = await this.request<any>(
      `/inbox/conversations/${encodeURIComponent(params.conversationId)}/messages`,
      "POST",
      undefined,
      {
        account_id: this.accountId,
        message: params.text,
      }
    );

    return {
      success: true,
      messageId: this.toOptionalString(response?.id || response?.messageId || response?.wamid),
      rawResponse: response,
    };
  }

  async sendTypingIndicator(conversationId: string, accountId: string = this.accountId): Promise<void> {
    await this.request(
      `/inbox/conversations/${encodeURIComponent(conversationId)}/typing`,
      "POST",
      undefined,
      { account_id: accountId }
    );
  }

  private async getOpenConversations(accountId: string): Promise<any[]> {
    const response = await this.request<any>("/inbox/conversations", "GET", {
      account_id: accountId,
      status: "open",
    });

    return this.extractArray(response, ["conversations", "data", "items", "results"]);
  }

  private async getConversationMessages(conversationId: string): Promise<any[]> {
    const response = await this.request<any>(
      `/inbox/conversations/${encodeURIComponent(conversationId)}/messages`,
      "GET",
      { limit: 20 }
    );

    return this.extractArray(response, ["messages", "data", "items", "results"]);
  }

  private async mapConversation(accountId: string, conversation: any): Promise<ChannelConversation> {
    const conversationId = this.toString(
      conversation.id ||
        conversation.conversation_id ||
        conversation.conversationId ||
        conversation.thread_id ||
        conversation.threadId,
      "unknown-conversation"
    );

    const customerId = this.toString(
      conversation.contact?.id ||
        conversation.customer?.id ||
        conversation.participant?.id ||
        conversation.phone ||
        conversation.phone_number ||
        conversation.wa_id ||
        conversationId,
      conversationId
    );
    const customerName = this.toString(
      conversation.contact?.name ||
        conversation.customer?.name ||
        conversation.participant?.name ||
        conversation.name ||
        conversation.display_name ||
        conversation.phone ||
        customerId,
      customerId
    );
    const customerAvatar =
      conversation.contact?.avatar ||
      conversation.customer?.avatar ||
      conversation.participant?.avatar ||
      conversation.avatar ||
      null;

    const rawMessages = await this.getConversationMessages(conversationId);
    const messages = rawMessages.map((message) =>
      this.mapMessage(message, accountId, customerId, customerName, customerAvatar)
    );

    return {
      id: conversationId,
      provider: WHATSAPP_SOCIAL_PROVIDER,
      participants: [
        {
          id: accountId,
          name: this.accountName,
          self: true,
        },
        {
          id: customerId,
          name: customerName,
          imageProfileUrl: customerAvatar,
          self: false,
        },
      ],
      messages,
      lastUpdate: this.toString(
        conversation.lastUpdate ||
          conversation.updated_at ||
          conversation.updatedAt ||
          conversation.last_message_at ||
          conversation.lastMessageAt ||
          new Date().toISOString()
      ),
      rawData: {
        ...conversation,
        accountId,
      },
    };
  }

  private mapMessage(
    message: any,
    accountId: string,
    customerId: string,
    customerName: string,
    customerAvatar: string | null
  ): any {
    const isOutbound = this.isOutboundMessage(message);
    const sender = isOutbound
      ? { id: accountId, name: this.accountName }
      : { id: customerId, name: customerName, picture: customerAvatar };
    const content = this.toString(
      message.message ||
        message.text ||
        message.body ||
        message.content ||
        message.caption ||
        ""
    );

    return {
      id: this.toString(message.id || message.messageId || message.wamid || message.timestamp),
      message: content,
      text: content,
      timestamp:
        message.timestamp ||
        message.created_at ||
        message.createdAt ||
        message.sent_at ||
        message.sentAt ||
        new Date().toISOString(),
      from: sender,
      sender,
      attachments: this.extractAttachments(message),
      rawData: message,
    };
  }

  private async request<T>(
    path: string,
    method: ZernioRequestMethod,
    query?: Record<string, string | number | boolean | undefined>,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Zernio API error (${response.status}): ${responseText}`);
    }

    return responseText ? JSON.parse(responseText) : ({} as T);
  }

  private isWhatsAppActive(activeProviders?: string[]): boolean {
    if (!activeProviders || activeProviders.length === 0) {
      return true;
    }

    return activeProviders.some((provider) => provider.toUpperCase() === WHATSAPP_SOCIAL_PROVIDER);
  }

  private isAllowedBlogId(blogId: string): boolean {
    return blogId === this.blogId;
  }

  private isOutboundMessage(message: any): boolean {
    const direction = this.toString(message.direction || message.type || message.status).toLowerCase();
    return Boolean(
      message.from_me ||
        message.fromMe ||
        message.is_from_business ||
        message.isFromBusiness ||
        direction === "outbound" ||
        direction === "sent" ||
        direction === "agent" ||
        direction === "business"
    );
  }

  private extractAttachments(message: any): any[] {
    const candidates = [
      message.attachments,
      message.media,
      message.media_url || message.mediaUrl,
      message.image_url || message.imageUrl,
      message.audio_url || message.audioUrl,
      message.video_url || message.videoUrl,
      message.document_url || message.documentUrl,
    ];

    return candidates
      .flatMap((candidate) => (Array.isArray(candidate) ? candidate : [candidate]))
      .filter(Boolean);
  }

  private extractArray(response: any, keys: string[]): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    for (const key of keys) {
      if (Array.isArray(response?.[key])) {
        return response[key];
      }
    }

    return [];
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>
  ): Promise<R[]> {
    if (items.length === 0) {
      return [];
    }

    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(concurrency, items.length);

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
          const currentIndex = nextIndex;
          nextIndex += 1;
          results[currentIndex] = await mapper(items[currentIndex]);
        }
      })
    );

    return results;
  }

  private clampMessageConcurrency(value: number): number {
    if (!Number.isFinite(value)) {
      return DEFAULT_MESSAGE_CONCURRENCY;
    }

    return Math.min(Math.max(Math.trunc(value), 1), MAX_MESSAGE_CONCURRENCY);
  }

  private toString(value: unknown, fallback = ""): string {
    if (value === undefined || value === null) {
      return fallback;
    }

    return String(value);
  }

  private toOptionalString(value: unknown): string | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return String(value);
  }
}

export function createZernioWhatsAppChannelAdapter(
  config: ZernioWhatsAppConfig = {}
): ZernioWhatsAppChannelAdapter {
  const apiToken = config.apiToken || process.env.ZERNIO_API_TOKEN;
  const accountId = config.accountId || process.env.ZERNIO_WHATSAPP_ACCOUNT_ID;
  const blogId = config.blogId || process.env.ZERNIO_WHATSAPP_BLOG_ID || DEFAULT_INPULZA_WHATSAPP_BLOG_ID;
  const envMessageConcurrency = process.env.ZERNIO_WHATSAPP_MESSAGE_CONCURRENCY;
  const messageConcurrency = config.messageConcurrency ?? Number(envMessageConcurrency);

  if (!apiToken || !accountId) {
    throw new Error("Zernio WhatsApp credentials not configured. Set ZERNIO_API_TOKEN and ZERNIO_WHATSAPP_ACCOUNT_ID.");
  }

  return new ZernioWhatsAppChannelAdapter({
    apiToken,
    accountId,
    accountName: config.accountName || process.env.ZERNIO_WHATSAPP_ACCOUNT_NAME || "WhatsApp Business",
    baseUrl: config.baseUrl || process.env.ZERNIO_API_BASE_URL || "https://api.zernio.com/v1",
    blogId,
    messageConcurrency,
  });
}
