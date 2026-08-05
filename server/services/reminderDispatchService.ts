import type { ReminderEvent } from "@shared/schema";

const DEFAULT_CLAIM_BATCH_SIZE = 50;
const DEFAULT_ABANDONED_CLAIM_MS = 15 * 60 * 1000;
export const ABANDONED_REMINDER_CLAIM_REASON =
  "Reminder delivery outcome unknown after worker interruption; automatic retry suppressed to prevent duplicate delivery.";

export interface ReminderDeliveryResult {
  success: boolean;
  error?: string;
}

export interface ReminderDispatchStore {
  claimScheduledReminders(brandId: string, limit?: number): Promise<ReminderEvent[]>;
  failAbandonedReminderClaims(brandId: string, claimedBefore: Date, reason: string): Promise<number>;
}

export interface ReminderDispatchLogger {
  log(message: string): void;
  warn(message: string): void;
}

export interface ReminderDispatchServiceOptions {
  store: ReminderDispatchStore;
  deliver: (reminder: ReminderEvent) => Promise<ReminderDeliveryResult>;
  onDeliveryFailure: (reminder: ReminderEvent, error: unknown) => Promise<void>;
  logger?: ReminderDispatchLogger;
  now?: () => Date;
  claimBatchSize?: number;
  abandonedClaimMs?: number;
}

export class ReminderDispatchService {
  private readonly store: ReminderDispatchStore;
  private readonly deliver: (reminder: ReminderEvent) => Promise<ReminderDeliveryResult>;
  private readonly onDeliveryFailure: (reminder: ReminderEvent, error: unknown) => Promise<void>;
  private readonly logger: ReminderDispatchLogger;
  private readonly now: () => Date;
  private readonly claimBatchSize: number;
  private readonly abandonedClaimMs: number;

  constructor(options: ReminderDispatchServiceOptions) {
    this.store = options.store;
    this.deliver = options.deliver;
    this.onDeliveryFailure = options.onDeliveryFailure;
    this.logger = options.logger ?? console;
    this.now = options.now ?? (() => new Date());
    this.claimBatchSize = Math.max(1, options.claimBatchSize ?? DEFAULT_CLAIM_BATCH_SIZE);
    this.abandonedClaimMs = Math.max(1, options.abandonedClaimMs ?? DEFAULT_ABANDONED_CLAIM_MS);
  }

  async dispatchBrand(brandId: string): Promise<{ sent: number; errors: string[] }> {
    const result = { sent: 0, errors: [] as string[] };

    try {
      const claimedBefore = new Date(this.now().getTime() - this.abandonedClaimMs);
      const abandonedCount = await this.store.failAbandonedReminderClaims(
        brandId,
        claimedBefore,
        ABANDONED_REMINDER_CLAIM_REASON,
      );
      if (abandonedCount > 0) {
        this.logger.warn(
          `[ReminderDispatch] Marked ${abandonedCount} abandoned claim(s) as failed; automatic retry suppressed`,
        );
      }

      const reminders = await this.store.claimScheduledReminders(brandId, this.claimBatchSize);
      this.logger.log(`[ReminderDispatch] Claimed ${reminders.length} reminder(s) for brand ${brandId}`);

      for (const reminder of reminders) {
        let delivery: ReminderDeliveryResult;
        try {
          delivery = await this.deliver(reminder);
        } catch (error) {
          const errorMessage = String(error);
          result.errors.push(`Reminder ${reminder.id}: ${errorMessage}`);
          await this.onDeliveryFailure(reminder, error);
          continue;
        }

        if (delivery.success) {
          result.sent++;
        } else {
          const error = delivery.error ?? "Delivery failed without details";
          result.errors.push(`Reminder ${reminder.id}: ${error}`);
          await this.onDeliveryFailure(reminder, error);
        }
      }
    } catch (error) {
      result.errors.push(`Reminder dispatch failed: ${String(error)}`);
    }

    return result;
  }
}
