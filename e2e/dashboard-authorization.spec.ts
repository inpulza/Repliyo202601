import { expect, test, type Page } from "@playwright/test";

import {
  startDashboardAuthorizationTestServer,
  type DashboardAuthorizationTestServer,
} from "../tests/helpers/dashboardAuthorizationTestServer";
import {
  WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE,
  WEBSOCKET_AUTH_REQUIRED_CLOSE_CODE,
} from "../shared/websocketAccess";

declare global {
  interface Window {
    __repliyoTestSockets?: Array<{
      emitClose: (code: number, reason?: string) => void;
    }>;
  }
}

let authorizationServer: DashboardAuthorizationTestServer;

test.beforeAll(async () => {
  authorizationServer = await startDashboardAuthorizationTestServer();
});

test.afterAll(async () => {
  await authorizationServer.close();
});

test.beforeEach(() => authorizationServer.reset());

test("a suspended existing session is visibly returned to login", async ({ page }) => {
  const browserState = await installDashboardApi(page, "suspended-a");

  await page.goto("/app/profile", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("input-email")).toBeVisible();
  expect(authorizationServer.state.sessionRevocations).toBeGreaterThan(0);
  expect(browserState.pageErrors, "unexpected browser errors").toEqual([]);
  expect(browserState.failedResponses, "expected revoked auth response").not.toHaveLength(0);
  expect(new Set(browserState.failedResponses)).toEqual(new Set([
    "GET /api/auth/me 403",
  ]));
});

test("a revoked realtime session returns the open dashboard to login", async ({ page, isMobile }) => {
  const browserState = await installDashboardApi(page, "user-a");

  await page.goto("/app/inbox", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/app\/inbox$/);
  await expect.poll(() => page.evaluate(() => window.__repliyoTestSockets?.length ?? 0)).toBe(1);

  authorizationServer.setUserStatus("user-a", "suspended");
  await page.evaluate((closeCode) => {
    window.__repliyoTestSockets?.at(-1)?.emitClose(closeCode, "Access revoked");
  }, WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE);

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("input-email")).toBeVisible();
  expect(browserState.pageErrors, "unexpected browser errors").toEqual([]);
  expect(browserState.knownBaselineErrors, "tracked mobile CRM accessibility baseline").toEqual(
    isMobile ? ["mobile CRM dialog is missing DialogTitle"] : [],
  );
  await expect.poll(() => authorizationServer.state.sessionRevocations).toBeGreaterThan(0);
  expect(
    browserState.failedResponses.every((failure) => failure === "GET /api/auth/me 403"),
    "only the expected revoked auth check may fail during navigation",
  ).toBe(true);
});

test("an expired realtime session cannot trap the dashboard in a reload loop", async ({ page }) => {
  const browserState = await installDashboardApi(page, "user-a");

  await page.goto("/app/inbox", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => window.__repliyoTestSockets?.length ?? 0)).toBe(1);

  await Promise.all([
    page.waitForEvent("load"),
    page.evaluate((closeCode) => {
      window.__repliyoTestSockets?.at(-1)?.emitClose(closeCode, "Not authenticated");
    }, WEBSOCKET_AUTH_REQUIRED_CLOSE_CODE),
  ]);

  await expect(page).toHaveURL(/\/app\/inbox$/);
  await expect.poll(() => page.evaluate(() => window.__repliyoTestSockets?.length ?? 0)).toBe(1);
  await page.evaluate((closeCode) => {
    window.__repliyoTestSockets?.at(-1)?.emitClose(closeCode, "Not authenticated");
  }, WEBSOCKET_AUTH_REQUIRED_CLOSE_CODE);

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("input-email")).toBeVisible();
  expect(browserState.pageErrors, "unexpected browser errors").toEqual([]);
  expect(browserState.failedResponses, "unexpected HTTP errors").toEqual([]);
});

test("a terminal 403 closes a dashboard screen that has no WebSocket", async ({ page, isMobile }) => {
  const browserState = await installDashboardApi(page, "user-a");

  await page.goto("/app/profile", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(
    isMobile ? page.getByTestId("mobile-user-name") : page.getByTestId("text-user-name"),
  ).toBeVisible();

  authorizationServer.setUserStatus("user-a", "suspended");

  if (isMobile) {
    await page.getByTestId("mobile-row-password").click();
    await page.locator("#mobileCurrentPassword").fill("current-password");
    await page.locator("#mobileNewPassword").fill("new-password");
    await page.locator("#mobileConfirmPassword").fill("new-password");
    await page.getByRole("button", { name: /Actualizar/ }).click();
  } else {
    await page.getByTestId("tab-change-password").click();
    await page.getByTestId("input-current-password").fill("current-password");
    await page.getByTestId("input-new-password").fill("new-password");
    await page.getByTestId("input-confirm-password").fill("new-password");
    await page.getByTestId("button-save-password").click();
  }

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("input-email")).toBeVisible();
  expect(browserState.pageErrors, "unexpected browser errors").toEqual([]);
  expect(browserState.failedResponses).toContain("POST /api/auth/change-password 403");
  expect(
    browserState.failedResponses.every((failure) => (
      failure === "POST /api/auth/change-password 403"
      || failure === "GET /api/auth/me 403"
    )),
    "only the terminal mutation and follow-up auth check may fail",
  ).toBe(true);
  expect(authorizationServer.state.sessionRevocations).toBeGreaterThan(0);
});

test("an own-brand notification is marked read through the dashboard", async ({
  page,
  isMobile,
}) => {
  test.skip(
    Boolean(isMobile),
    "NotificationCenter is currently desktop-only; mobile session revocation is covered above.",
  );
  const browserState = await installDashboardApi(page, "user-a");

  await page.goto("/app/profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("button-notifications")).toBeVisible();
  await page.getByTestId("button-notifications").click();
  await expect(page.getByTestId("notification-item-notification-a")).toBeVisible();

  await page.getByTestId("notification-item-notification-a").click();

  await expect(page.getByText("Todas leídas", { exact: true })).toBeVisible();
  await expect(page.getByTestId("badge-notification-count")).toHaveCount(0);
  expect(authorizationServer.state.notificationWrites).toBe(1);
  expect(browserState.pageErrors, "unexpected browser errors").toEqual([]);
  expect(browserState.failedResponses, "unexpected HTTP errors").toEqual([]);
});

async function installDashboardApi(page: Page, userId: string) {
  const pageErrors: string[] = [];
  const knownBaselineErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (
      message.text().includes("Failed to load resource") &&
      message.text().includes("403")
    ) {
      return;
    }
    if (message.text().includes("`DialogContent` requires a `DialogTitle`")) {
      knownBaselineErrors.push("mobile CRM dialog is missing DialogTitle");
      return;
    }
    pageErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = new URL(response.url());
    failedResponses.push(`${response.request().method()} ${url.pathname} ${response.status()}`);
  });

  await page.addInitScript(() => {
    localStorage.setItem("repliyo_active_brand_id", "brand-a");
    window.__repliyoTestSockets = [];

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
        window.__repliyoTestSockets?.push(this);
        queueMicrotask(() => this.onopen?.(new Event("open")));
      }

      addEventListener(type: string) {
        throw new Error(
          `TestWebSocket.addEventListener("${type}") is not implemented; use an on* property or extend the mock.`,
        );
      }
      close(code = 1000, reason = "") {
        this.emitClose(code, reason);
      }
      emitClose(code: number, reason = "") {
        this.readyState = TestWebSocket.CLOSED;
        this.onclose?.(new CloseEvent("close", {
          code,
          reason,
          wasClean: true,
        }));
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

    if (
      path === "/api/auth/me"
      || path === "/api/auth/change-password"
      || path.startsWith("/api/notifications")
    ) {
      const response = await fetch(`${authorizationServer.baseUrl}${path}${url.search}`, {
        method: request.method(),
        headers: {
          "content-type": "application/json",
          "x-test-user-id": userId,
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

  return { pageErrors, knownBaselineErrors, failedResponses };
}

function mockApiResponse(path: string, method: string): { status: number; body: unknown } {
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
          createdAt: "2026-08-05T00:00:00.000Z",
        },
      ],
    };
  }

  if (path === "/api/sync/status") {
    return { status: 200, body: { isRunning: false, brands: [] } };
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
