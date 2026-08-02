import { expect, test, type Page } from "@playwright/test";

const pageErrors = new WeakMap<Page, string[]>();

const metadata = {
  en: {
    lang: "en",
    title: "Repliyo - Smart social media inbox",
    heading: "Respond in seconds. Sell more with AI.",
    canonical: "https://repliyo.com/",
    ogLocale: "en_US",
  },
  es: {
    lang: "es",
    title: "Repliyo - Inbox inteligente para redes sociales",
    heading: "Responde en segundos. Vende más con IA.",
    canonical: "https://repliyo.com/?lang=es",
    ogLocale: "es_ES",
  },
} as const;

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "null",
    }),
  );
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/css",
      body: "",
    }),
  );
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? [], "unexpected browser errors").toEqual([]);
});

async function openLanding(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function expectLandingMetadata(
  page: Page,
  language: keyof typeof metadata,
) {
  const expected = metadata[language];

  await expect(page.locator("html")).toHaveAttribute("lang", expected.lang);
  await expect(page).toHaveTitle(expected.title);
  await expect(
    page.getByRole("heading", { level: 1, name: expected.heading }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    expected.canonical,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    expected.canonical,
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    expected.ogLocale,
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    expected.title,
  );
  await expect(
    page.locator('link[rel="alternate"][hreflang="en"]'),
  ).toHaveAttribute("href", metadata.en.canonical);
  await expect(
    page.locator('link[rel="alternate"][hreflang="es"]'),
  ).toHaveAttribute("href", metadata.es.canonical);
  await expect(
    page.locator('link[rel="alternate"][hreflang="x-default"]'),
  ).toHaveAttribute("href", metadata.en.canonical);
}

test("root stays English and lightweight despite a stale Spanish preference", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.addInitScript(() => localStorage.setItem("repliyo-lang", "es"));

  await openLanding(page);

  await expect(page).toHaveURL(/\/$/);
  await expectLandingMetadata(page, "en");
  expect(await page.evaluate(() => localStorage.getItem("repliyo-lang"))).toBe(
    "es",
  );
  expect(requests.some((url) => url.includes("fonts.googleapis.com"))).toBe(
    false,
  );
  expect(requests.some((url) => url.includes("ApplicationProviders"))).toBe(
    false,
  );
});

test("language switch keeps URL, visible copy and metadata aligned", async ({
  page,
}) => {
  await openLanding(page);
  await expectLandingMetadata(page, "en");

  await page.getByTestId("button-language-toggle").click();
  await expect(page).toHaveURL(/\?lang=es$/);
  await expectLandingMetadata(page, "es");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expectLandingMetadata(page, "es");

  await page.getByTestId("button-language-toggle").click();
  await expect(page).toHaveURL(/\/$/);
  await expectLandingMetadata(page, "en");
});

test("ultra-wide hero preserves its proportions without horizontal overflow", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Ultra-wide behavior is desktop-only");
  await page.setViewportSize({ width: 3440, height: 1440 });

  await openLanding(page);
  const mockup = page.locator(".mockup-container-v2");
  await expect(mockup).toBeVisible();
  const bounds = await mockup.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThan(1400);
  expect(bounds!.width / bounds!.height).toBeGreaterThan(1.65);
  expect(bounds!.width / bounds!.height).toBeLessThan(1.78);
  expect(
    await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    })),
  ).toEqual({ documentWidth: 3440, viewportWidth: 3440 });
});

test("slow startup still reveals the complete landing", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The slow-start branch is viewport-independent");
  await page.addInitScript(() => {
    const originalNow = performance.now.bind(performance);
    Object.defineProperty(performance, "now", {
      configurable: true,
      value: () => originalNow() + 3000,
    });
  });

  await openLanding(page);
  await expect(page.locator("#features")).toBeAttached({ timeout: 5500 });
  await expect(page.locator("#cta")).toBeAttached();
  await expect(page.locator("footer")).toBeAttached();
});

test("reduced motion removes continuous landing animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLanding(page);
  await expect(page.locator("#features")).toBeAttached();
  await page.waitForTimeout(100);

  const motionState = await page.evaluate(() => ({
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    infiniteAnimations: document
      .getAnimations({ subtree: true })
      .filter((animation) => {
        const iterations = animation.effect?.getComputedTiming().iterations;
        return animation.playState === "running" && iterations === Infinity;
      }).length,
  }));

  expect(motionState).toEqual({ reduced: true, infiniteAnimations: 0 });
});

test("sign-in navigation loads application providers and settles correctly", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await openLanding(page);
  await page.getByTestId("button-login-header").click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("invite-only-block")).toBeVisible();
  await expect(page.getByTestId("link-get-started")).toBeVisible();

  expect(requests.some((url) => url.includes("ApplicationProviders"))).toBe(
    true,
  );
  expect(requests.some((url) => url.includes("fonts.googleapis.com"))).toBe(
    true,
  );

  await page.goto("/privacy", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
  ).toBeVisible();
});
