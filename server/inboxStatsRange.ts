import { z } from 'zod';

import type { InboxMetricsGranularity, InboxMetricsRange } from '@shared/inboxMetrics';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const INBOX_METRICS_TIMEZONE = 'Europe/Madrid' as const;

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
}).superRefine((value, context) => {
  const hasCustomRange = value.from !== undefined || value.to !== undefined;
  if (hasCustomRange && (!value.from || !value.to)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'from and to must be provided together' });
  }
  if ([value.days !== undefined, hasCustomRange, value.range === 'all'].filter(Boolean).length > 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'choose one date range mode' });
  }
});

function validateDate(value: string): void {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('invalid calendar date');
  }
}

function addCalendarDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function madridDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INBOX_METRICS_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function madridMidnight(value: string): Date {
  validateDate(value);
  const [year, month, day] = value.split('-').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INBOX_METRICS_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(utcGuess));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  const representedAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return new Date(utcGuess - (representedAsUtc - utcGuess));
}

function granularityFor(days: number | null): InboxMetricsGranularity {
  if (days === null || days > 730) return 'month';
  return days <= 90 ? 'day' : 'week';
}

export function parseInboxStatsRange(
  query: Record<string, unknown>,
  now: Date = new Date(),
): ParsedInboxStatsRange {
  const parsed = querySchema.parse(query);
  const today = madridDate(now);
  const tomorrow = addCalendarDays(today, 1);

  if (parsed.range === 'all') {
    return {
      from: null,
      toExclusive: madridMidnight(tomorrow),
      label: 'Histórico completo',
      fromDate: null,
      toDate: today,
      timezone: INBOX_METRICS_TIMEZONE,
      granularity: 'month',
    };
  }

  if (parsed.from && parsed.to) {
    validateDate(parsed.from);
    validateDate(parsed.to);
    const days = Math.round((Date.parse(`${parsed.to}T00:00:00Z`) - Date.parse(`${parsed.from}T00:00:00Z`)) / DAY_MS) + 1;
    if (days < 1) throw new Error('to must be on or after from');
    if (days > 366) throw new Error('custom date range cannot exceed 366 days');
    return {
      from: madridMidnight(parsed.from),
      toExclusive: madridMidnight(addCalendarDays(parsed.to, 1)),
      label: `${parsed.from} – ${parsed.to}`,
      fromDate: parsed.from,
      toDate: parsed.to,
      timezone: INBOX_METRICS_TIMEZONE,
      granularity: granularityFor(days),
    };
  }

  const days = parsed.days ?? 7;
  const fromDate = addCalendarDays(today, -(days - 1));
  return {
    from: madridMidnight(fromDate),
    toExclusive: madridMidnight(tomorrow),
    label: `Últimos ${days} días`,
    fromDate,
    toDate: today,
    timezone: INBOX_METRICS_TIMEZONE,
    granularity: granularityFor(days),
  };
}
