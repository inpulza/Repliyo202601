import { storage } from "../storage";
import { conversationLifecycleService } from "./conversationLifecycleService";
import { reminderService } from "./reminderService";
import { log } from "../app";

class LifecycleScheduler {
  private isRunning = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private readonly SCHEDULER_INTERVAL_MS = 15 * 60 * 1000; // Run every 15 minutes
  private readonly REMINDER_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check reminders every 5 minutes
  private reminderInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    if (this.isRunning) {
      log("[LifecycleScheduler] Already running, skipping start", "sync");
      return;
    }

    this.isRunning = true;
    log("[LifecycleScheduler] Starting lifecycle scheduler (interval: 15 min)", "sync");
    log("[LifecycleScheduler] Starting reminder scheduler (interval: 5 min)", "sync");

    await this.runScheduledTasks();
    await this.runReminderTasks();

    this.schedulerInterval = setInterval(async () => {
      await this.runScheduledTasks();
    }, this.SCHEDULER_INTERVAL_MS);

    this.reminderInterval = setInterval(async () => {
      await this.runReminderTasks();
    }, this.REMINDER_CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    this.isRunning = false;
    log("[LifecycleScheduler] Stopped", "sync");
  }

  private async runScheduledTasks(): Promise<void> {
    log("[LifecycleScheduler] Running scheduled lifecycle tasks...", "sync");

    try {
      const brands = await storage.getActiveBrands();
      
      let totalAutoSolved = 0;
      let totalTransitioned = 0;
      let totalErrors = 0;

      for (const brand of brands) {
        try {
          // First: Auto-solve inactive open conversations (open → solved)
          const autoSolveResult = await conversationLifecycleService.processAutoClose(brand.id);
          totalAutoSolved += autoSolveResult.closed;
          totalErrors += autoSolveResult.errors.length;

          if (autoSolveResult.closed > 0) {
            log(`[LifecycleScheduler] Brand ${brand.name}: ${autoSolveResult.closed} open→solved (auto)`, "sync");
          }

          // Then: Close solved conversations (solved → closed)
          const transitionResult = await conversationLifecycleService.processSolvedToClosedTransitions(brand.id);
          totalTransitioned += transitionResult.transitioned;
          totalErrors += transitionResult.errors.length;

          if (transitionResult.transitioned > 0) {
            log(`[LifecycleScheduler] Brand ${brand.name}: ${transitionResult.transitioned} solved→closed`, "sync");
          }
        } catch (error: any) {
          log(`[LifecycleScheduler] Error processing brand ${brand.name}: ${error.message}`, "sync");
          totalErrors++;
        }

        await this.delay(500);
      }

      if (totalAutoSolved > 0 || totalTransitioned > 0 || totalErrors > 0) {
        log(`[LifecycleScheduler] Cycle complete: ${totalAutoSolved} auto-solved, ${totalTransitioned} closed, ${totalErrors} errors`, "sync");
      }
    } catch (error: any) {
      log(`[LifecycleScheduler] Fatal error: ${error.message}`, "sync");
    }
  }

  async runManualCloseCheck(brandId: string): Promise<{ transitioned: number; errors: string[] }> {
    log(`[LifecycleScheduler] Manual close check for brand ${brandId}`, "sync");
    return await conversationLifecycleService.processSolvedToClosedTransitions(brandId);
  }

  async runManualAutoSolve(brandId: string): Promise<{ closed: number; errors: string[] }> {
    log(`[LifecycleScheduler] Manual auto-solve for brand ${brandId}`, "sync");
    return await conversationLifecycleService.processAutoClose(brandId);
  }

  private async runReminderTasks(): Promise<void> {
    log("[LifecycleScheduler] Running reminder tasks...", "sync");

    try {
      const brands = await storage.getActiveBrands();
      
      let totalScheduled = 0;
      let totalSent = 0;
      let totalErrors = 0;

      for (const brand of brands) {
        try {
          const scheduleResult = await reminderService.scheduleRemindersForBrand(brand.id);
          totalScheduled += scheduleResult.scheduled;
          totalErrors += scheduleResult.errors.length;

          const sendResult = await reminderService.sendScheduledReminders(brand.id);
          totalSent += sendResult.sent;
          totalErrors += sendResult.errors.length;

          if (scheduleResult.scheduled > 0 || sendResult.sent > 0) {
            log(`[LifecycleScheduler] Brand ${brand.name}: ${scheduleResult.scheduled} scheduled, ${sendResult.sent} sent`, "sync");
          }
        } catch (error: any) {
          log(`[LifecycleScheduler] Error processing reminders for brand ${brand.name}: ${error.message}`, "sync");
          totalErrors++;
        }

        await this.delay(500);
      }

      if (totalScheduled > 0 || totalSent > 0 || totalErrors > 0) {
        log(`[LifecycleScheduler] Reminder cycle complete: ${totalScheduled} scheduled, ${totalSent} sent, ${totalErrors} errors`, "sync");
      }
    } catch (error: any) {
      log(`[LifecycleScheduler] Reminder fatal error: ${error.message}`, "sync");
    }
  }

  async runManualReminders(brandId: string): Promise<{ scheduled: number; sent: number; errors: string[] }> {
    log(`[LifecycleScheduler] Manual reminder run for brand ${brandId}`, "sync");
    const scheduleResult = await reminderService.scheduleRemindersForBrand(brandId);
    const sendResult = await reminderService.sendScheduledReminders(brandId);
    return {
      scheduled: scheduleResult.scheduled,
      sent: sendResult.sent,
      errors: [...scheduleResult.errors, ...sendResult.errors],
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): { isRunning: boolean; intervalMs: number; reminderIntervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.SCHEDULER_INTERVAL_MS,
      reminderIntervalMs: this.REMINDER_CHECK_INTERVAL_MS,
    };
  }
}

export const lifecycleScheduler = new LifecycleScheduler();
