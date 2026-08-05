import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";

import {
  ReminderDispatchService,
  type ReminderDeliveryResult,
  type ReminderDispatchStore,
} from "../../server/services/reminderDispatchService";
import type { ReminderEvent } from "../../shared/schema";

const TEST_NOW = new Date("2026-08-05T12:00:00.000Z");

export interface ReminderDispatchHarness {
  events: ReminderEvent[];
  deliveryCount: number;
  dispatchConcurrently(workerCount?: number): Promise<{
    results: Array<{ sent: number; errors: string[] }>;
    deliveryCount: number;
    statuses: string[];
  }>;
  dispatchOnce(): Promise<{ sent: number; errors: string[] }>;
}

export interface ReminderDispatchTestServer {
  baseUrl: string;
  close(): Promise<void>;
}

export function createReminderDispatchHarness(
  events: ReminderEvent[] = [createReminderEvent()],
): ReminderDispatchHarness {
  const state = {
    events: events.map((event) => ({ ...event })),
    deliveryCount: 0,
  };

  const store: ReminderDispatchStore = {
    async claimScheduledReminders(brandId, limit = 50) {
      const claimedAt = new Date(TEST_NOW);
      const ready = state.events
        .filter(
          (event) =>
            event.brandId === brandId &&
            event.status === "scheduled" &&
            event.scheduledAt <= TEST_NOW,
        )
        .slice(0, limit);

      for (const event of ready) {
        event.status = "processing";
        event.processingStartedAt = claimedAt;
        event.errorMessage = null;
      }

      return ready.map((event) => ({ ...event }));
    },

    async failAbandonedReminderClaims(brandId, claimedBefore, reason) {
      let failed = 0;
      for (const event of state.events) {
        if (
          event.brandId === brandId &&
          event.status === "processing" &&
          event.processingStartedAt !== null &&
          event.processingStartedAt <= claimedBefore
        ) {
          event.status = "failed";
          event.errorMessage = reason;
          failed += 1;
        }
      }
      return failed;
    },
  };

  const deliver = async (claimed: ReminderEvent): Promise<ReminderDeliveryResult> => {
    state.deliveryCount += 1;
    await new Promise<void>((resolve) => setImmediate(resolve));

    const event = state.events.find((candidate) => candidate.id === claimed.id);
    if (!event || event.status !== "processing") {
      throw new Error("The claimed reminder is no longer deliverable");
    }

    event.status = "sent";
    event.sentAt = new Date(TEST_NOW);
    event.externalMessageId = `test-delivery-${state.deliveryCount}`;
    return { success: true };
  };

  const createDispatcher = () =>
    new ReminderDispatchService({
      store,
      deliver,
      onDeliveryException: async (reminder, error) => {
        const event = state.events.find((candidate) => candidate.id === reminder.id);
        if (event) {
          event.status = "failed";
          event.errorMessage = String(error);
        }
      },
      logger: { log() {}, warn() {} },
      now: () => new Date(TEST_NOW),
    });

  return {
    get events() {
      return state.events;
    },
    get deliveryCount() {
      return state.deliveryCount;
    },
    async dispatchConcurrently(workerCount = 2) {
      const workers = Array.from({ length: workerCount }, () => createDispatcher());
      const results = await Promise.all(
        workers.map((worker) => worker.dispatchBrand("brand-a")),
      );

      return {
        results,
        deliveryCount: state.deliveryCount,
        statuses: state.events.map((event) => event.status),
      };
    },
    dispatchOnce() {
      return createDispatcher().dispatchBrand("brand-a");
    },
  };
}

export function createReminderEvent(
  overrides: Partial<ReminderEvent> = {},
): ReminderEvent {
  return {
    id: "reminder-a",
    brandId: "brand-a",
    conversationId: "conversation-a",
    contactId: null,
    reminderNumber: 1,
    status: "scheduled",
    content: "Safe test fixture",
    contentSource: "template",
    contextSnapshot: null,
    scheduledAt: new Date("2026-08-05T11:55:00.000Z"),
    processingStartedAt: null,
    sentAt: null,
    errorMessage: null,
    deliveryChannel: "dm",
    externalMessageId: null,
    createdAt: new Date("2026-08-05T11:50:00.000Z"),
    ...overrides,
  };
}

export async function startReminderDispatchTestServer(): Promise<ReminderDispatchTestServer> {
  const app = express();
  app.use(express.json());

  app.get("/test/reminders", (_req, res) => {
    res.type("html").send(`<!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><title>Reminder dispatch safety test</title></head>
        <body>
          <button id="dispatch" type="button">Run concurrent reminder workers</button>
          <output id="result" aria-live="polite">Ready</output>
          <script>
            document.querySelector("#dispatch").addEventListener("click", async () => {
              const response = await fetch("/api/test/reminders/race", { method: "POST" });
              if (!response.ok) throw new Error("Dispatch test failed: " + response.status);
              document.querySelector("#result").textContent = JSON.stringify(await response.json());
            });
          </script>
        </body>
      </html>`);
  });

  app.post("/api/test/reminders/race", async (_req, res) => {
    const harness = createReminderDispatchHarness();
    const result = await harness.dispatchConcurrently(2);
    res.json(result);
  });

  const server = await listen(app);
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => close(server),
  };
}

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1");
    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
