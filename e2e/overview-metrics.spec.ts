import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __overviewTestSockets?: Array<WebSocket>;
  }
}

test('Overview shows real operational metrics and applies historical date filters', async ({ page, isMobile }) => {
  const observedMetricsQueries: string[] = [];
  const browserErrors = await installOverviewApi(page, observedMetricsQueries);

  await page.goto('/app/overview', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/app\/overview$/);

  await expect(
    isMobile ? page.getByTestId('mobile-stat-response-time') : page.getByTestId('text-response-time'),
  ).toContainText('15m');

  if (isMobile) {
    await expect(page.getByTestId('mobile-stat-response-time')).toContainText('71,1%');
  } else {
    await expect(page.getByTestId('text-response-coverage')).toContainText('71,1% respondidos');
    await expect(page.getByTestId('text-response-coverage')).toContainText('651/916');
  }

  if (isMobile) {
    const instagram = page.getByTestId('mobile-platform-instagram');
    await expect(instagram).toContainText('12 recibidos · 8 enviados');
    await expect(instagram).toContainText('IA 8m');
    await expect(instagram).toContainText('Humano 18m');
  } else {
    const instagramRow = page.getByTestId('platform-row-instagram');
    await expect(instagramRow).toContainText('Instagram');
    await expect(instagramRow).toContainText('12');
    await expect(instagramRow).toContainText('8');
    await expect(instagramRow).toContainText('15m');
    await expect(page.getByTestId('platform-response-rate-instagram')).toContainText('90,7%');
    await expect(page.getByTestId('text-response-origin-split')).toContainText('IA 8m');
    await expect(page.getByTestId('text-response-origin-split')).toContainText('Humano 18m');
    await expect(page.getByTestId('period-context')).toContainText('Europe/Madrid');
  }

  const periodButton = page.getByTestId(
    isMobile ? 'button-period-selector-mobile' : 'button-period-selector',
  );
  await periodButton.click();
  await page.getByTestId(
    isMobile ? 'menu-item-period-mobile-custom' : 'menu-item-period-custom',
  ).click();

  await expect(page.getByTestId('dialog-custom-period')).toBeVisible();
  await page.getByTestId('input-period-from').fill('2026-08-01');
  await page.getByTestId('input-period-to').fill('2026-08-10');
  await page.getByTestId('button-apply-custom-period').click();

  await expect.poll(() => observedMetricsQueries.at(-1)).toContain('from=2026-08-01&to=2026-08-10');
  await expect(periodButton).toContainText('01 ago – 10 ago');

  await periodButton.click();
  await page.getByTestId(
    isMobile ? 'menu-item-period-mobile-all' : 'menu-item-period-all',
  ).click();
  await expect.poll(() => observedMetricsQueries.at(-1)).toContain('range=all');
  await expect(periodButton).toContainText('Histórico completo');

  expect(browserErrors, 'unexpected page or console errors').toEqual([]);
});

async function installOverviewApi(page: Page, observedMetricsQueries: string[]): Promise<string[]> {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));

  await page.addInitScript(() => {
    localStorage.setItem('repliyo_active_brand_id', 'brand-a');
    window.__overviewTestSockets = [];

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
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;

      constructor() {
        window.__overviewTestSockets?.push(this as unknown as WebSocket);
        queueMicrotask(() => this.onopen?.(new Event('open')));
      }
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() { return true; }
      send() {}
      close() {
        this.readyState = TestWebSocket.CLOSED;
        this.onclose?.(new CloseEvent('close', { code: 1000, wasClean: true }));
      }
    }

    Object.defineProperty(window, 'WebSocket', { configurable: true, value: TestWebSocket });
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/auth/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-a',
          email: 'user-a@example.test',
          name: 'User A',
          role: 'client',
          brandId: 'brand-a',
          status: 'active',
        }),
      });
    }

    if (path === '/api/brands') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'brand-a',
          name: 'Brand A',
          status: 'active',
          avatar: null,
          industry: 'Test',
          createdAt: '2026-08-01T00:00:00.000Z',
        }]),
      });
    }

    if (path === '/api/inbox-stats/brand-a') {
      observedMetricsQueries.push(url.searchParams.toString());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(metricsFixture(url)),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(route.request().method() === 'GET' ? [] : { success: true }),
    });
  });

  return browserErrors;
}

function metricsFixture(url: URL) {
  const isAll = url.searchParams.get('range') === 'all';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  return {
    totalMessages: 20,
    inboundMessages: 12,
    outboundMessages: 8,
    totalConversations: 6,
    openConversations: 2,
    closedConversations: 4,
    uniqueContacts: 5,
    responseTime: {
      medianMs: 900000,
      p90Ms: 16860000,
      samples: 4,
      ai: { medianMs: 480000, p90Ms: 600000, samples: 2 },
      human: { medianMs: 1080000, p90Ms: 1800000, samples: 2 },
      coverage: { eligible: 916, answered: 651, rate: 71.1 },
    },
    byPlatform: {
      instagram: {
        inbound: 12,
        outbound: 8,
        responseTime: {
          medianMs: 900000,
          p90Ms: 16860000,
          samples: 4,
          ai: { medianMs: 480000, p90Ms: 600000, samples: 2 },
          human: { medianMs: 1080000, p90Ms: 1800000, samples: 2 },
          coverage: { eligible: 54, answered: 49, rate: 90.7 },
        },
      },
    },
    bySentiment: { positive: 3, neutral: 1 },
    volumeStats: [
      { date: '2026-08-09', inbound: 4, outbound: 2 },
      { date: '2026-08-10', inbound: 8, outbound: 6 },
    ],
    recentActivity: [],
    period: {
      label: isAll ? 'Histórico completo' : 'Período de prueba',
      from: isAll ? null : (from ?? '2026-08-04'),
      to: to ?? '2026-08-10',
      timezone: 'Europe/Madrid',
      granularity: isAll ? 'month' : 'day',
    },
  };
}
