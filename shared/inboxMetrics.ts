export type InboxMetricsGranularity = 'day' | 'week' | 'month';
export type ResponseOrigin = 'ai' | 'human';

export interface InboxMetricsRange {
  from: Date | null;
  toExclusive: Date;
  timezone: 'Europe/Madrid';
  granularity: InboxMetricsGranularity;
}

export interface ResponseDistribution {
  medianMs: number | null;
  p90Ms: number | null;
  samples: number;
}

export interface ResponseTimeMetrics extends ResponseDistribution {
  ai: ResponseDistribution;
  human: ResponseDistribution;
}

export interface PlatformInboxMetrics {
  inbound: number;
  outbound: number;
  responseTime: ResponseTimeMetrics;
}

/** Reference model for tests. Production runs these rules in PostgreSQL. */
export interface ResponseMetricMessage {
  id: string;
  conversationId: string | null;
  conversationType: string;
  platform: string;
  direction: string | null;
  timestamp: Date;
  parentMessageId?: string | null;
  internalOrigin?: string | null;
  source?: string | null;
}

export interface ResponseCycle {
  inboundMessageId: string;
  outboundMessageId: string;
  platform: string;
  responseMs: number;
  origin: ResponseOrigin;
}

function originOf(message: ResponseMetricMessage): ResponseOrigin {
  return message.internalOrigin === 'ai' || message.source === 'repliyo_auto' ? 'ai' : 'human';
}

function isDm(message: ResponseMetricMessage): boolean {
  return message.conversationType === 'dm' || message.conversationType === 'conversation';
}

function percentile(values: readonly number[], fraction: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower));
}

export function summarizeResponseCycles(cycles: readonly ResponseCycle[]): ResponseTimeMetrics {
  const summarize = (selected: readonly ResponseCycle[]): ResponseDistribution => ({
    medianMs: percentile(selected.map(cycle => cycle.responseMs), 0.5),
    p90Ms: percentile(selected.map(cycle => cycle.responseMs), 0.9),
    samples: selected.length,
  });

  return {
    ...summarize(cycles),
    ai: summarize(cycles.filter(cycle => cycle.origin === 'ai')),
    human: summarize(cycles.filter(cycle => cycle.origin === 'human')),
  };
}

/**
 * Comments only count when the outbound points to the exact inbound parent.
 * DMs count the first outbound after each consecutive inbound burst. A cycle
 * belongs to the response period, while its inbound may precede the boundary.
 */
export function matchResponseCycles(
  inputMessages: readonly ResponseMetricMessage[],
  range: Pick<InboxMetricsRange, 'from' | 'toExclusive'>,
): ResponseCycle[] {
  const messages = [...inputMessages].sort((left, right) => (
    left.timestamp.getTime() - right.timestamp.getTime() || left.id.localeCompare(right.id)
  ));
  const inboundComments = new Map(
    messages
      .filter(message => message.direction === 'inbound' && !isDm(message))
      .map(message => [message.id, message]),
  );
  const cycles: ResponseCycle[] = [];
  const answeredComments = new Set<string>();

  for (const outbound of messages) {
    if (outbound.direction !== 'outbound' || !outbound.parentMessageId) continue;
    const inbound = inboundComments.get(outbound.parentMessageId);
    if (!inbound || answeredComments.has(inbound.id) || outbound.timestamp < inbound.timestamp) continue;
    answeredComments.add(inbound.id);
    if (outbound.timestamp >= range.toExclusive || (range.from && outbound.timestamp < range.from)) continue;
    cycles.push({
      inboundMessageId: inbound.id,
      outboundMessageId: outbound.id,
      platform: inbound.platform.toLowerCase(),
      responseMs: outbound.timestamp.getTime() - inbound.timestamp.getTime(),
      origin: originOf(outbound),
    });
  }

  const dmConversations = new Map<string, ResponseMetricMessage[]>();
  for (const message of messages) {
    if (!isDm(message) || !message.conversationId) continue;
    const conversation = dmConversations.get(message.conversationId) ?? [];
    conversation.push(message);
    dmConversations.set(message.conversationId, conversation);
  }

  for (const conversation of Array.from(dmConversations.values())) {
    let pendingInbound: ResponseMetricMessage | null = null;
    for (const message of conversation) {
      if (message.direction === 'inbound') {
        pendingInbound ??= message;
      } else if (message.direction === 'outbound' && pendingInbound) {
        if (message.parentMessageId && inboundComments.has(message.parentMessageId)) {
          pendingInbound = null;
          continue;
        }
        if (message.timestamp < range.toExclusive && (!range.from || message.timestamp >= range.from)) {
          cycles.push({
            inboundMessageId: pendingInbound.id,
            outboundMessageId: message.id,
            platform: pendingInbound.platform.toLowerCase(),
            responseMs: message.timestamp.getTime() - pendingInbound.timestamp.getTime(),
            origin: originOf(message),
          });
        }
        pendingInbound = null;
      }
    }
  }

  return cycles;
}
