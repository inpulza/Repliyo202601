import { MetricoolService, createMetricoolService } from "../metricool";
import type {
  ChannelAdapter,
  ChannelCredentials,
  ChannelExternalBrand,
  ChannelInboxData,
  MessageProviderResult,
  ReplyToCommentInput,
  ReplyToConversationInput,
} from "./types";

export class MetricoolChannelAdapter implements ChannelAdapter {
  readonly providerId = 'metricool' as const;

  constructor(private readonly metricool: MetricoolService) {}

  async getBrands(): Promise<ChannelExternalBrand[]> {
    return this.metricool.getBrands();
  }

  async getAllInboxData(blogId: string, activeProviders?: string[]): Promise<ChannelInboxData> {
    return this.metricool.getAllInboxData(blogId, activeProviders);
  }

  async replyToComment(params: ReplyToCommentInput): Promise<MessageProviderResult> {
    return this.metricool.replyToComment(params);
  }

  async replyToConversation(params: ReplyToConversationInput): Promise<MessageProviderResult> {
    return this.metricool.replyToConversation(params);
  }
}

export function createMetricoolChannelAdapter(userToken?: string, userId?: string): MetricoolChannelAdapter {
  return new MetricoolChannelAdapter(createMetricoolService(userToken, userId));
}

export function createMetricoolChannelAdapterFromCredentials(
  credentials: ChannelCredentials
): MetricoolChannelAdapter {
  return createMetricoolChannelAdapter(credentials.userToken, credentials.userId);
}
