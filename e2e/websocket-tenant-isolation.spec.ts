import { expect, test, type Page } from "@playwright/test";

import {
  signedSessionValue,
  startWebSocketTestServer,
  type WebSocketTestServer,
} from "../tests/helpers/websocketTestServer";

declare global {
  interface Window {
    __repliyoSocket?: WebSocket;
    __repliyoSocketMessages?: Array<Record<string, unknown>>;
  }
}

const pageErrors = new WeakMap<Page, string[]>();
let server: WebSocketTestServer;

test.beforeAll(async () => {
  server = await startWebSocketTestServer();
});

test.afterAll(async () => {
  await server.close();
});

test.beforeEach(async ({ context, page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  const cookieValue = signedSessionValue("session-a");
  await context.addCookies([
    {
      name: "connect.sid",
      value: cookieValue,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "null" }),
  );
});

test.afterEach(async ({ page }) => {
  try {
    await page.evaluate(() => window.__repliyoSocket?.close(1000, "Test complete"));
  } catch {
    // The page may already be closed; browser errors still need to be asserted.
  }
  expect(pageErrors.get(page) ?? [], "unexpected browser errors").toEqual([]);
});

test("the browser receives only its session brand before and after subscription", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((wsUrl) => {
    window.__repliyoSocketMessages = [];
    const socket = new WebSocket(wsUrl);
    window.__repliyoSocket = socket;
    socket.onmessage = (event) => {
      window.__repliyoSocketMessages?.push(JSON.parse(event.data) as Record<string, unknown>);
    };
  }, server.wsUrl);

  await expect.poll(() => hasBrowserMessage(page, "connected")).toBe(true);

  server.service.notifyNewMessage("brand-b", { id: "foreign-before-subscribe" });
  server.service.notifyNewMessage("brand-a", { id: "own-before-subscribe" });
  await expect.poll(() => hasBrowserDataId(page, "own-before-subscribe")).toBe(true);
  expect(await hasBrowserDataId(page, "foreign-before-subscribe")).toBe(false);

  await page.evaluate(() => {
    window.__repliyoSocket?.send(JSON.stringify({ type: "subscribe", brandId: "brand-b" }));
  });
  await expect
    .poll(() => hasBrowserErrorMessage(page, "Access denied to this brand"))
    .toBe(true);

  server.service.notifyNewMessage("brand-b", { id: "foreign-after-subscribe" });
  server.service.notifyNewMessage("brand-a", { id: "own-after-subscribe" });
  await expect.poll(() => hasBrowserDataId(page, "own-after-subscribe")).toBe(true);
  expect(await hasBrowserDataId(page, "foreign-after-subscribe")).toBe(false);
});

async function hasBrowserMessage(page: Page, type: string): Promise<boolean> {
  return page.evaluate(
    (expectedType) => window.__repliyoSocketMessages?.some((message) => message.type === expectedType) ?? false,
    type,
  );
}

async function hasBrowserDataId(page: Page, id: string): Promise<boolean> {
  return page.evaluate(
    (expectedId) => window.__repliyoSocketMessages?.some((message) => {
      const data = message.data as { id?: string } | undefined;
      return data?.id === expectedId;
    }) ?? false,
    id,
  );
}

async function hasBrowserErrorMessage(page: Page, text: string): Promise<boolean> {
  return page.evaluate(
    (expectedText) => window.__repliyoSocketMessages?.some(
      (message) => message.type === "error" && message.message === expectedText,
    ) ?? false,
    text,
  );
}
