import { createMetricoolChannelAdapter } from "./metricoolAdapter";
import type { ChannelAdapter, ChannelCredentials, ChannelProviderId } from "./types";

export const DEFAULT_CHANNEL_PROVIDER_ID = "metricool";

export interface ChannelAdapterFactoryOptions {
  credentials?: ChannelCredentials;
}

type ChannelAdapterFactory = (options?: ChannelAdapterFactoryOptions) => ChannelAdapter;

const channelAdapterFactories: Partial<Record<ChannelProviderId, ChannelAdapterFactory>> = {
  [DEFAULT_CHANNEL_PROVIDER_ID]: (options) =>
    createMetricoolChannelAdapter(
      options?.credentials?.userToken,
      options?.credentials?.userId
    ),
};

export function createChannelAdapter(
  providerId: ChannelProviderId = DEFAULT_CHANNEL_PROVIDER_ID,
  options?: ChannelAdapterFactoryOptions
): ChannelAdapter {
  const factory = channelAdapterFactories[providerId];

  if (!factory) {
    throw new Error(`Unsupported channel provider: ${providerId}`);
  }

  return factory(options);
}

export function createDefaultChannelAdapter(options?: ChannelAdapterFactoryOptions): ChannelAdapter {
  return createChannelAdapter(DEFAULT_CHANNEL_PROVIDER_ID, options);
}

export function getRegisteredChannelProviderIds(): ChannelProviderId[] {
  return Object.keys(channelAdapterFactories);
}
