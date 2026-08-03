import { expect, test, type Page } from "@playwright/test";

import { GET_STARTED_METADATA } from "../shared/landingMetadata";

const pageErrors = new WeakMap<Page, string[]>();
const submittedLeads = new WeakMap<Page, Record<string, unknown>[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  const leads: Record<string, unknown>[] = [];
  pageErrors.set(page, errors);
  submittedLeads.set(page, leads);

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
  await page.route("**/api/leads", async (route) => {
    leads.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "lead-e2e", message: "Lead submitted successfully" }),
    });
  });
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

async function expectMetadata(page: Page, language: "en" | "es") {
  const metadata = GET_STARTED_METADATA[language];

  await expect(page.locator("html")).toHaveAttribute("lang", language);
  await expect(page).toHaveTitle(metadata.title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    metadata.canonicalUrl,
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    metadata.description,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    metadata.canonicalUrl,
  );
  await expect(
    page.locator('link[rel="alternate"][hreflang="en"]'),
  ).toHaveAttribute("href", GET_STARTED_METADATA.en.canonicalUrl);
  await expect(
    page.locator('link[rel="alternate"][hreflang="es"]'),
  ).toHaveAttribute("href", GET_STARTED_METADATA.es.canonicalUrl);
  await expect(
    page.locator('link[rel="alternate"][hreflang="x-default"]'),
  ).toHaveAttribute("href", GET_STARTED_METADATA.en.canonicalUrl);
}

test("landing promises assisted access and preserves the chosen language", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const englishCta = page.getByRole("link", { name: "Request access" }).first();
  await expect(englishCta).toHaveAttribute("href", "/get-started");

  await page.getByTestId("button-language-toggle").click();
  const spanishCta = page.getByRole("link", { name: "Solicitar acceso" }).first();
  await expect(spanishCta).toHaveAttribute("href", "/get-started?lang=es");
  await spanishCta.click();

  await expect(page).toHaveURL(/\/get-started\?lang=es$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Cuéntanos sobre ti" }),
  ).toBeVisible();
  await expectMetadata(page, "es");
});

test("request-access language switch keeps copy, URL and metadata aligned", async ({
  page,
}) => {
  await page.goto("/get-started", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Tell us about yourself" }),
  ).toBeVisible();
  await expectMetadata(page, "en");

  await page.getByTestId("button-get-started-language").click();
  await expect(page).toHaveURL(/\/get-started\?lang=es$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Cuéntanos sobre ti" }),
  ).toBeVisible();
  await expectMetadata(page, "es");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Cuéntanos sobre ti" }),
  ).toBeVisible();
  await expectMetadata(page, "es");
});

test("Spanish request flow reaches a mocked success without creating a real lead", async ({
  page,
}) => {
  await page.goto("/get-started?lang=es", { waitUntil: "domcontentloaded" });

  await page.getByTestId("input-lead-name").fill("María Prueba");
  await page.getByTestId("input-lead-email").fill("maria@example.com");
  await page.getByTestId("button-next").click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Háblanos de tu negocio" }),
  ).toBeVisible();
  await page.getByTestId("select-lead-industry").click();
  await page.getByRole("option", { name: "Agencia de marketing" }).click();
  await page.getByTestId("button-next").click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Tus canales sociales" }),
  ).toBeVisible();
  await page.getByTestId("checkbox-platform-instagram").click();
  await expect(page.getByTestId("checkbox-platform-instagram")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("button-next").click();

  await expect(
    page.getByRole("heading", { level: 1, name: "¿Qué quieres mejorar?" }),
  ).toBeVisible();
  await page.getByTestId("checkbox-goal-unified_inbox").click();
  await page.getByTestId("button-next").click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Revisa tu solicitud" }),
  ).toBeVisible();
  await expect(page.getByTestId("summary-block")).toContainText("María Prueba");
  await expect(page.getByTestId("summary-block")).toContainText("Agencia de marketing");
  await expect(page.getByTestId("button-submit-lead")).toHaveText(/Solicitar acceso/);
  await page.getByTestId("button-submit-lead").click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Solicitud recibida" }),
  ).toBeVisible();
  await expect(page.getByTestId("button-back-to-login")).toHaveAttribute(
    "href",
    "/login",
  );
  expect(submittedLeads.get(page)).toEqual([
    expect.objectContaining({
      name: "María Prueba",
      email: "maria@example.com",
      industry: "Marketing Agency",
      platforms: ["instagram"],
      goals: ["unified_inbox"],
      source: "get-started",
    }),
  ]);
});
