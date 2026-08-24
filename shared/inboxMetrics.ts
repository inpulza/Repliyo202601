export interface InboxMetricsMessage {
  id: string;
  conversationId: string | null;
  platform: string;
  direction: string | null;
  timestamp: Date;
}

export interface InboxMetricsRange {
  from: Date | null;
  toExclusive: Date;
}

export interface PlatformInboxMetrics {
  inbound: number;
  outbound: number;
  avgResponseTimeMs: number | null;
  responseSamples: number;
}

export interface CalculatedInboxMetrics {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  avgResponseTimeMs: number | null;
  responseSamples: number;
  byPlatform: Record<string, PlatformInboxMetrics>;
  bySentiment: Record<string, number>;
  dailyStats: Array<{ date: string; inbound: number; outbound: number }>;
}

type MetricsMessage = InboxMetricsMessage & { sentiment?: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * A response cycle starts with the first inbound message after the previous
 * outbound message. Consecutive inbound messages are treated as one customer
 * burst, and only the first following outbound message closes the cycle.
 */
export function calculateInboxMetrics(
  inputMessages: readonly MetricsMessage[],
  range: InboxMetricsRange,
): CalculatedInboxMetrics {
  const messages = inputMessages
    .filter((message) => (
      message.timestamp < range.toExclusive
      && (range.from === null || message.timestamp >= range.from)
      && (message.direction === 'inbound' || message.direction === 'outbound')
    ))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

  const byPlatform: Record<string, PlatformInboxMetrics> = {};
  const bySentiment: Record<string, number> = {};
  const dailyMap = new Map<string, { inbound: number; outbound: number }>();

  let inboundMessages = 0;
  let outboundMessages = 0;

  for (const message of messages) {
    const platform = message.platform?.trim().toLowerCase() || 'unknown';
    byPlatform[platform] ??= {
      inbound: 0,
      outbound: 0,
      avgResponseTimeMs: null,
      responseSamples: 0,
    };

    const date = utcDayKey(message.timestamp);
    const daily = dailyMap.get(date) ?? { inbound: 0, outbound: 0 };

    if (message.direction === 'inbound') {
      inboundMessages += 1;
      byPlatform[platform].inbound += 1;
      daily.inbound += 1;
      if (message.sentiment) {
        bySentiment[message.sentiment] = (bySentiment[message.sentiment] ?? 0) + 1;
      }
    } else {
      outboundMessages += 1;
      byPlatform[platform].outbound += 1;
      daily.outbound += 1;
    }

    dailyMap.set(date, daily);
  }

  const responseTimes: number[] = [];
  const responseTimesByPlatform = new Map<string, number[]>();
  const messagesByConversation = new Map<string, MetricsMessage[]>();

  for (const message of messages) {
    const conversationKey = message.conversationId ?? `message:${message.id}`;
    const conversationMessages = messagesByConversation.get(conversationKey) ?? [];
    conversationMessages.push(message);
    messagesByConversation.set(conversationKey, conversationMessages);
  }

  for (const conversationMessages of Array.from(messagesByConversation.values())) {
    let awaitingResponseSince: Date | null = null;
    let awaitingResponsePlatform = 'unknown';

    for (const message of conversationMessages) {
      if (message.direction === 'inbound') {
        if (awaitingResponseSince === null) {
          awaitingResponseSince = message.timestamp;
          awaitingResponsePlatform = message.platform?.trim().toLowerCase() || 'unknown';
        }
        continue;
      }

      if (awaitingResponseSince === null) continue;

      const responseTime = message.timestamp.getTime() - awaitingResponseSince.getTime();
      if (responseTime >= 0) {
        responseTimes.push(responseTime);
        const platformTimes = responseTimesByPlatform.get(awaitingResponsePlatform) ?? [];
        platformTimes.push(responseTime);
        responseTimesByPlatform.set(awaitingResponsePlatform, platformTimes);
      }

      awaitingResponseSince = null;
    }
  }

  for (const [platform, platformMetrics] of Object.entries(byPlatform)) {
    const platformTimes = responseTimesByPlatform.get(platform) ?? [];
    platformMetrics.avgResponseTimeMs = average(platformTimes);
    platformMetrics.responseSamples = platformTimes.length;
  }

  const firstDay = range.from
    ?? (messages.length > 0 ? startOfUtcDay(messages[0].timestamp) : null);
  const dailyStats: Array<{ date: string; inbound: number; outbound: number }> = [];

  if (firstDay) {
    for (
      let cursor = firstDay.getTime();
      cursor < range.toExclusive.getTime();
      cursor += DAY_MS
    ) {
      const date = utcDayKey(new Date(cursor));
      dailyStats.push({ date, ...(dailyMap.get(date) ?? { inbound: 0, outbound: 0 }) });
    }
  }

  return {
    totalMessages: inboundMessages + outboundMessages,
    inboundMessages,
    outboundMessages,
    avgResponseTimeMs: average(responseTimes),
    responseSamples: responseTimes.length,
    byPlatform,
    bySentiment,
    dailyStats,
  };
}
