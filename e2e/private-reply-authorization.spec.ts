import { expect, test, type Page } from "@playwright/test";

import {
  startPrivateReplyTestServer,
  type PrivateReplyTestServer,
} from "../tests/helpers/privateReplyTestServer";

const pageErrors = new WeakMap<Page, string[]>();
const failedResponses = new WeakMap<Page, string[]>();
let securityServer: PrivateReplyTestServer;

test.skip(
  ({ isMobile }) => Boolean(isMobile),
  "The authorization behavior is not responsive; mobile Inbox coverage is a separate PR.",
);

test.beforeAll(async () => {
  securityServer = await startPrivateReplyTestServer();
});

test.afterAll(async () => {
  await securityServer.close();
});

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  const responses: string[] = [];
  pageErrors.set(page, errors);
  failedResponses.set(page, responses);
  securityServer.reset();

  page.on("console", (message) => {
    if (message.type() === "error") {
      if (message.text().includes("Failed to load resource: the server responded with a status of 404")) {
        return;
      }
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      const url = new URL(response.url());
      responses.push(`${response.request().method()} ${url.pathname} ${response.status()}`);
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("repliyo-active-brand-id", "brand-a");

    class TestWebSocket {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;

      readonly CONNECTING = 0;
      readonly OPEN = 1;
      readonly CLOSING = 2;
      readonly CLOSED = 3;
      readonly url: string;
      readyState = TestWebSocket.OPEN;
      onclose: ((event: CloseEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onopen: ((event: Event) => void) | null = null;

      constructor(url: string | URL) {
        this.url = String(url);
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
    const path = url.pathname;

    if (path.startsWith("/api/inbox/private-reply")) {
      const response = await fetch(`${securityServer.baseUrl}${path}${url.search}`, {
        method: request.method(),
        headers: {
          "content-type": "application/json",
          "x-test-brand-id": "brand-a",
        },
        body: request.method() === "GET" ? undefined : request.postData(),
      });

      return route.fulfill({
        status: response.status,
        contentType: "application/json",
        body: await response.text(),
      });
    }

    const response = mockApiResponse(path, request.method());
    return route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  expect(pageErrors.get(page) ?? [], "unexpected browser errors").toEqual([]);
  if (testInfo.status === "skipped") {
    expect(failedResponses.get(page) ?? [], "unexpected HTTP errors").toEqual([]);
    return;
  }

  expect(failedResponses.get(page) ?? [], "unexpected HTTP errors").toEqual([
    "GET /api/inbox/private-reply/template 404",
    "POST /api/inbox/private-reply 404",
  ]);
});

test("a foreign private reply is rejected before Meta and remains visibly unsent", async ({
  page,
}) => {
  await page.goto("/app/inbox", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("conversation-card-conversation-b")).toBeVisible();
  await expect(page.getByTestId("button-private-reply-message-b")).toBeVisible();
  await page.getByTestId("button-private-reply-message-b").click();

  await expect(page.getByText("Enviando como Respuesta Privada")).toBeVisible();
  await page.getByTestId("input-reply-text").fill("This must never reach Meta");
  await page.getByTestId("button-send-reply").click();

  await expect(
    page.getByText("Error al enviar respuesta privada", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Message not found", { exact: true })).toBeVisible();
  await expect(page.getByText("Enviando como Respuesta Privada")).toBeVisible();
  expect(securityServer.state.metaCalls).toBe(0);
  expect(securityServer.state.databaseWrites).toBe(0);
});

function mockApiResponse(path: string, method: string): { status: number; body: unknown } {
  if (path === "/api/auth/me") {
    return {
      status: 200,
      body: {
        id: "user-a",
        email: "client-a@example.test",
        name: "Client A",
        role: "client",
        brandId: "brand-a",
        profileImageUrl: null,
      },
    };
  }

  if (path === "/api/brands") {
    return {
      status: 200,
      body: [
        {
          id: "brand-a",
          name: "Brand A",
          status: "active",
          avatar: null,
          industry: "Test",
          createdAt: "2026-08-03T00:00:00.000Z",
        },
      ],
    };
  }

  if (path === "/api/conversations") {
    return {
      status: 200,
      body: [
        {
          id: "conversation-b",
          brandId: "brand-b",
          platform: "facebook",
          type: "comment",
          customerId: "customer-b",
          customerName: "Foreign Customer",
          customerAvatar: null,
          lastMessageAt: "2026-08-03T10:00:00.000Z",
          lastMessagePreview: "Please send me more information",
          status: "new",
          unreadCount: 1,
          messageCount: 1,
          socialPostId: null,
          socialPost: null,
        },
      ],
    };
  }

  if (path === "/api/conversations/conversation-b/messages") {
    return {
      status: 200,
      body: [
        {
          id: "message-b",
          brandId: "brand-b",
          conversationId: "conversation-b",
          platform: "facebook",
          type: "comment",
          direction: "inbound",
          author: "Foreign Customer",
          content: "Please send me more information",
          timestamp: "2026-08-03T10:00:00.000Z",
          status: "unread",
          parentMessageId: null,
          rawData: { id: "post_comment-b" },
        },
      ],
    };
  }

  if (path === "/api/ai-agent/brand-a") {
    return {
      status: 200,
      body: {
        id: "agent-a",
        brandId: "brand-a",
        privateReplyEnabled: true,
        privateReplyTemplate: "Hello {{username}}",
      },
    };
  }

  if (path === "/api/sync/status") {
    return { status: 200, body: { isRunning: false, brands: [] } };
  }

  if (path === "/api/notifications") {
    return { status: 200, body: { notifications: [], unreadCount: 0 } };
  }

  if (path.includes("/sentiment-alerts/by-conversation")) {
    return { status: 200, body: { conversations: {} } };
  }

  if (path.includes("/social-accounts")) {
    return { status: 200, body: [] };
  }

  if (path.includes("/sync-status")) {
    return { status: 200, body: { syncPaused: false } };
  }

  if (method === "GET") {
    return { status: 200, body: [] };
  }

  return { status: 200, body: { success: true } };
}
