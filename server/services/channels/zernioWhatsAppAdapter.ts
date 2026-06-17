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

export interface ZernioWhatsAppAccountConfig {
  blogId: string;
  accountId: string;
  accountName?: string;
}

export interface ZernioWhatsAppConfig {
  apiToken?: string;
  accountId?: string;
  accountName?: string;
  baseUrl?: string;
  blogId?: string;
  accounts?: ZernioWhatsAppAccountConfig[];
  messageConcurrency?: number;
}

type ZernioRequestMethod = "GET" | "POST";

const DEFAULT_INPULZA_WHATSAPP_BLOG_ID = "4074962";
const DEFAULT_MESSAGE_CONCURRENCY = 3;
const MAX_MESSAGE_CONCURRENCY = 10;

type ResolvedZernioWhatsAppAccountConfig = Required<ZernioWhatsAppAccountConfig>;

interface ResolvedZernioWhatsAppConfig {
  apiToken: string;
  baseUrl: string;
  accounts: ResolvedZernioWhatsAppAccountConfig[];
  messageConcurrency: number;
}

export class ZernioWhatsAppChannelAdapter implements ChannelAdapter {
  readonly providerId = ZERNIO_WHATSAPP_PROVIDER_ID;

  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly accounts: ResolvedZernioWhatsAppAccountConfig[];
  private readonly accountsByBlogId: Map<string, ResolvedZernioWhatsAppAccountConfig>;
  private readonly messageConcurrency: number;

  constructor(config: ResolvedZernioWhatsAppConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.accounts = config.accounts;
    this.accountsByBlogId = new Map(config.accounts.map((account) => [account.blogId, account]));
    this.messageConcurrency = this.clampMessageConcurrency(config.messageConcurrency);
  }

  async getBrands(): Promise<ChannelExternalBrand[]> {
    return this.accounts.map((account) => ({
      blogId: account.blogId,
      name: account.accountName,
      detectedProviders: [
        {
          provider: WHATSAPP_SOCIAL_PROVIDER,
          accountName: account.accountName,
        },
      ],
    }));
  }

  async getAllInboxData(blogId: string, activeProviders?: string[]): Promise<ChannelInboxData> {
    if (!this.isWhatsAppActive(activeProviders)) {
      return { conversations: [], comments: [] };
    }

    const account = this.getAccountForBlogId(blogId);
    if (!account) {
      return { conversations: [], comments: [] };
    }

    const rawConversations = await this.getOpenConversations(account.accountId);
    const conversations = await this.mapWithConcurrency(
      rawConversations,
      this.messageConcurrency,
      (conversation) => this.mapConversation(account, conversation)
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
    const account = this.getAccountForBlogId(params.blogId);
    if (!account) {
      return {
        success: false,
        error: `WhatsApp is not configured for blogId ${params.blogId}.`,
      };
    }

    const response = await this.request<any>(
      `/inbox/conversations/${encodeURIComponent(params.conversationId)}/messages`,
      "POST",
      undefined,
      {
        account_id: account.accountId,
        message: params.text,
      }
    );

    return {
      success: true,
      messageId: this.toOptionalString(response?.id || response?.messageId || response?.wamid),
      rawResponse: response,
    };
  }

  async sendTypingIndicator(
    conversationId: string,
    accountId: string = this.accounts[0].accountId
  ): Promise<void> {
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

  private async mapConversation(
    account: ResolvedZernioWhatsAppAccountConfig,
    conversation: any
  ): Promise<ChannelConversation> {
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
      this.mapMessage(message, account, customerId, customerName, customerAvatar)
    );

    return {
      id: conversationId,
      provider: WHATSAPP_SOCIAL_PROVIDER,
      participants: [
        {
          id: account.accountId,
          name: account.accountName,
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
        accountId: account.accountId,
        blogId: account.blogId,
      },
    };
  }

  private mapMessage(
    message: any,
    account: ResolvedZernioWhatsAppAccountConfig,
    customerId: string,
    customerName: string,
    customerAvatar: string | null
  ): any {
    const isOutbound = this.isOutboundMessage(message);
    const sender = isOutbound
      ? { id: account.accountId, name: account.accountName }
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

  private getAccountForBlogId(blogId: string): ResolvedZernioWhatsAppAccountConfig | undefined {
    return this.accountsByBlogId.get(blogId);
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
  const envMessageConcurrency = process.env.ZERNIO_WHATSAPP_MESSAGE_CONCURRENCY;
  const messageConcurrency = config.messageConcurrency ?? Number(envMessageConcurrency);
  const accounts = resolveAccounts(config);

  if (!apiToken || accounts.length === 0) {
    throw new Error(
      "Zernio WhatsApp credentials not configured. Set ZERNIO_API_TOKEN and at least one WhatsApp account mapping."
    );
  }

  return new ZernioWhatsAppChannelAdapter({
    apiToken,
    accounts,
    baseUrl: config.baseUrl || process.env.ZERNIO_API_BASE_URL || "https://api.zernio.com/v1",
    messageConcurrency,
  });
}

function resolveAccounts(config: ZernioWhatsAppConfig): ResolvedZernioWhatsAppAccountConfig[] {
  const configuredAccounts = config.accounts?.length
    ? config.accounts
    : parseAccountsJson(process.env.ZERNIO_WHATSAPP_ACCOUNTS_JSON);
  const fallbackAccountName = config.accountName || process.env.ZERNIO_WHATSAPP_ACCOUNT_NAME;

  if (configuredAccounts.length > 0) {
    return ensureUniqueBlogIds(
      configuredAccounts.map((account) => normalizeAccount(account, fallbackAccountName))
    );
  }

  const accountId = config.accountId || process.env.ZERNIO_WHATSAPP_ACCOUNT_ID;
  if (!accountId) {
    return [];
  }

  return [
    normalizeAccount(
      {
        accountId,
        blogId: config.blogId || process.env.ZERNIO_WHATSAPP_BLOG_ID || DEFAULT_INPULZA_WHATSAPP_BLOG_ID,
        accountName: fallbackAccountName,
      },
      fallbackAccountName
    ),
  ];
}

function ensureUniqueBlogIds(
  accounts: ResolvedZernioWhatsAppAccountConfig[]
): ResolvedZernioWhatsAppAccountConfig[] {
  const seen = new Set<string>();

  for (const account of accounts) {
    if (seen.has(account.blogId)) {
      throw new Error(`Duplicate Zernio WhatsApp account mapping for blogId ${account.blogId}.`);
    }
    seen.add(account.blogId);
  }

  return accounts;
}

function parseAccountsJson(value?: string): ZernioWhatsAppAccountConfig[] {
  if (!value) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid ZERNIO_WHATSAPP_ACCOUNTS_JSON: expected a JSON array.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid ZERNIO_WHATSAPP_ACCOUNTS_JSON: expected a JSON array.");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid ZERNIO_WHATSAPP_ACCOUNTS_JSON item at index ${index}.`);
    }

    const record = item as Record<string, unknown>;
    return {
      blogId: requiredString(record.blogId, `accounts[${index}].blogId`),
      accountId: requiredString(record.accountId, `accounts[${index}].accountId`),
      accountName: optionalString(record.accountName),
    };
  });
}

function normalizeAccount(
  account: ZernioWhatsAppAccountConfig,
  fallbackAccountName?: string
): ResolvedZernioWhatsAppAccountConfig {
  return {
    blogId: account.blogId,
    accountId: account.accountId,
    accountName: account.accountName || fallbackAccountName || "WhatsApp Business",
  };
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid Zernio WhatsApp account mapping: ${label} must be a non-empty string.`);
  }

  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return value.trim();
}
