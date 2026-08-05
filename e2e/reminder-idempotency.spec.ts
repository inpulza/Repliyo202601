import { expect, test, type Page } from "@playwright/test";

import {
  startReminderDispatchTestServer,
  type ReminderDispatchTestServer,
} from "../tests/helpers/reminderDispatchTestServer";

const browserErrors = new WeakMap<Page, string[]>();
let testServer: ReminderDispatchTestServer;

test.beforeAll(async () => {
  testServer = await startReminderDispatchTestServer();
});

test.afterAll(async () => {
  await testServer.close();
});

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "unexpected browser errors").toEqual([]);
});

test("two browser-triggered workers produce exactly one reminder delivery", async ({ page }) => {
  await page.goto(`${testServer.baseUrl}/test/reminders`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Run concurrent reminder workers" }).click();

  const output = page.locator("#result");
  await expect(output).toContainText('"deliveryCount":1');
  const result = JSON.parse(await output.innerText()) as {
    deliveryCount: number;
    statuses: string[];
    results: Array<{ sent: number; errors: string[] }>;
  };

  expect(result.deliveryCount).toBe(1);
  expect(result.statuses).toEqual(["sent"]);
  expect(result.results.reduce((sum, worker) => sum + worker.sent, 0)).toBe(1);
  expect(result.results.flatMap((worker) => worker.errors)).toEqual([]);
});

test("the dashboard shows an in-flight reminder as processing", async ({ page }) => {
  await installDashboardReminderMocks(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app/settings", { waitUntil: "domcontentloaded" });

  await page.getByTestId("tab-reminders").click();
  const eventRow = page.getByTestId("event-row-reminder-processing");

  await expect(eventRow).toBeVisible();
  await expect(eventRow.getByText("Procesando", { exact: true })).toHaveCount(2);
  await expect(eventRow).toContainText(/05 ago \d{2}:58/);
  await expect(eventRow.locator("svg.animate-spin")).toHaveCSS("animation-name", "none");
});

async function installDashboardReminderMocks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("repliyo_active_brand_id", "brand-a");

    class TestWebSocket {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;

      readonly CONNECTING = 0;
      readonly OPEN = 1;
      readonly CLOSING = 2;
      readonly CLOSED = 3;
      readyState = TestWebSocket.OPEN;
      onclose: ((event: CloseEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onopen: ((event: Event) => void) | null = null;

      constructor(_url: string | URL) {
        queueMicrotask(() => this.onopen?.(new Event("open")));
      }

      addEventListener() {}
      close() {
        this.readyState = TestWebSocket.CLOSED;
      }
      dispatchEvent() {
        return true;
      }
      removeEventListener() {}
      send() {}
    }

    Object.defineProperty(window, "WebSocket", {
      configurable: true,
      value: TestWebSocket,
    });
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const response = mockDashboardApi(url.pathname, url.searchParams);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

function mockDashboardApi(path: string, searchParams: URLSearchParams): unknown {
  if (path === "/api/auth/me") {
    return {
      id: "user-a",
      email: "client-a@example.test",
      name: "Client A",
      role: "client",
      brandId: "brand-a",
      profileImageUrl: null,
    };
  }

  if (path === "/api/brands") {
    return [
      {
        id: "brand-a",
        name: "Brand A",
        status: "active",
        avatar: null,
        industry: "Test",
        createdAt: "2026-08-05T00:00:00.000Z",
      },
    ];
  }

  if (path === "/api/conversations") return [];

  if (path === "/api/ai-models/openai") {
    return { models: [{ value: "gpt-4o-mini", label: "GPT-4o mini" }] };
  }

  if (path === "/api/ai-agent/brand-a") {
    return {
      id: "agent-a",
      brandId: "brand-a",
      provider: "openai",
      model: "gpt-4o-mini",
      isActive: true,
    };
  }

  if (path === "/api/brands/brand-a/reminder-rules") {
    return { rules: null };
  }

  if (path === "/api/brands/brand-a/reminder-events") {
    expect(searchParams.get("includeConversation")).toBe("true");
    return {
      events: [
        {
          id: "reminder-processing",
          brandId: "brand-a",
          conversationId: "conversation-a",
          contactId: null,
          reminderNumber: 1,
          status: "processing",
          content: "Safe processing reminder fixture",
          contentSource: "template",
          contextSnapshot: null,
          scheduledAt: "2026-08-05T11:55:00.000Z",
          processingStartedAt: "2026-08-05T11:58:00.000Z",
          sentAt: null,
          errorMessage: null,
          deliveryChannel: "dm",
          externalMessageId: null,
          createdAt: "2026-08-05T11:50:00.000Z",
          conversationType: "dm",
          conversationPlatform: "instagram",
          customerName: "Test Customer",
          socialPostId: null,
        },
      ],
    };
  }

  if (path === "/api/brands/brand-a/reminders/analytics/summary") {
    return {
      stats: {
        totalSent: 0,
        totalScheduled: 1,
        totalFailed: 0,
        totalCancelled: 0,
        totalOptedOut: 0,
        conversionCount: 0,
        conversionRate: 0,
        avgResponseMinutes: null,
        dailyCapUsage: 1,
        dailyCapLimit: 50,
      },
    };
  }

  if (path === "/api/brands/brand-a/reminders/analytics/timeline") {
    return { timeline: [] };
  }

  if (path === "/api/brands/brand-a/reminders/analytics/failures") {
    return { failures: [] };
  }

  if (path === "/api/sync/status") return { isRunning: false, brands: [] };
  if (path === "/api/notifications") return { notifications: [], unreadCount: 0 };

  return [];
}
