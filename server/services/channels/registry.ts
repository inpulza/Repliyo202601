import { createMetricoolChannelAdapter } from "./metricoolAdapter";
import {
  createZernioWhatsAppChannelAdapter,
  ZERNIO_WHATSAPP_PROVIDER_ID,
  type ZernioWhatsAppConfig,
} from "./zernioWhatsAppAdapter";
import type { ChannelAdapter, ChannelCredentials, ChannelProviderId } from "./types";

export const DEFAULT_CHANNEL_PROVIDER_ID = "metricool";

export interface ChannelAdapterFactoryOptions {
  credentials?: ChannelCredentials;
  zernioWhatsApp?: ZernioWhatsAppConfig;
}

type ChannelAdapterFactory = (options?: ChannelAdapterFactoryOptions) => ChannelAdapter;

const channelAdapterFactories: Partial<Record<ChannelProviderId, ChannelAdapterFactory>> = {
  [DEFAULT_CHANNEL_PROVIDER_ID]: (options) =>
    createMetricoolChannelAdapter(
      options?.credentials?.userToken,
      options?.credentials?.userId
    ),
  [ZERNIO_WHATSAPP_PROVIDER_ID]: (options) =>
    createZernioWhatsAppChannelAdapter(options?.zernioWhatsApp),
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
