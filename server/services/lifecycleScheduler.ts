import { storage } from "../storage";
import { conversationLifecycleService } from "./conversationLifecycleService";
import { log } from "../app";

class LifecycleScheduler {
  private isRunning = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private readonly SCHEDULER_INTERVAL_MS = 15 * 60 * 1000; // Run every 15 minutes

  async start(): Promise<void> {
    if (this.isRunning) {
      log("[LifecycleScheduler] Already running, skipping start", "sync");
      return;
    }

    this.isRunning = true;
    log("[LifecycleScheduler] Starting lifecycle scheduler (interval: 15 min)", "sync");

    await this.runScheduledTasks();

    this.schedulerInterval = setInterval(async () => {
      await this.runScheduledTasks();
    }, this.SCHEDULER_INTERVAL_MS);
  }

  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    log("[LifecycleScheduler] Stopped", "sync");
  }

  private async runScheduledTasks(): Promise<void> {
    log("[LifecycleScheduler] Running scheduled lifecycle tasks...", "sync");

    try {
      const brands = await storage.getActiveBrands();
      
      let totalTransitioned = 0;
      let totalErrors = 0;

      for (const brand of brands) {
        try {
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

      if (totalTransitioned > 0 || totalErrors > 0) {
        log(`[LifecycleScheduler] Cycle complete: ${totalTransitioned} conversations closed, ${totalErrors} errors`, "sync");
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.SCHEDULER_INTERVAL_MS,
    };
  }
}

export const lifecycleScheduler = new LifecycleScheduler();
