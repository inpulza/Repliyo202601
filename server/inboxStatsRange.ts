import { z } from 'zod';

import type { InboxMetricsRange } from '@shared/inboxMetrics';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ParsedInboxStatsRange extends InboxMetricsRange {
  label: string;
  fromDate: string | null;
  toDate: string;
}

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
  from: z.string().regex(ISO_DATE).optional(),
  to: z.string().regex(ISO_DATE).optional(),
  range: z.literal('all').optional(),
}).strict().superRefine((value, context) => {
  const hasCustomRange = value.from !== undefined || value.to !== undefined;
  if (hasCustomRange && (!value.from || !value.to)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'from and to must be provided together' });
  }
  if ([value.days !== undefined, hasCustomRange, value.range === 'all'].filter(Boolean).length > 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'choose one date range mode' });
  }
});

function parseUtcDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('invalid calendar date');
  }
  return parsed;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseInboxStatsRange(
  query: Record<string, unknown>,
  now: Date = new Date(),
): ParsedInboxStatsRange {
  const parsed = querySchema.parse(query);
  const tomorrowUtc = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ));

  if (parsed.range === 'all') {
    return {
      from: null,
      toExclusive: tomorrowUtc,
      label: 'Histórico completo',
      fromDate: null,
      toDate: formatUtcDate(new Date(tomorrowUtc.getTime() - DAY_MS)),
    };
  }

  if (parsed.from && parsed.to) {
    const from = parseUtcDate(parsed.from);
    const to = parseUtcDate(parsed.to);
    if (to < from) throw new Error('to must be on or after from');
    if ((to.getTime() - from.getTime()) / DAY_MS > 365) {
      throw new Error('custom date range cannot exceed 366 days');
    }
    return {
      from,
      toExclusive: new Date(to.getTime() + DAY_MS),
      label: `${parsed.from} – ${parsed.to}`,
      fromDate: parsed.from,
      toDate: parsed.to,
    };
  }

  const days = parsed.days ?? 7;
  const from = new Date(tomorrowUtc.getTime() - days * DAY_MS);
  return {
    from,
    toExclusive: tomorrowUtc,
    label: `Últimos ${days} días`,
    fromDate: formatUtcDate(from),
    toDate: formatUtcDate(new Date(tomorrowUtc.getTime() - DAY_MS)),
  };
}
