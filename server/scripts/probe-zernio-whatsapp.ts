/**
 * Read-only Zernio WhatsApp connectivity probe.
 *
 * Ejecutar:
 *   npm run probe:zernio-whatsapp
 *
 * Variables requeridas:
 *   ZERNIO_API_TOKEN
 *   ZERNIO_WHATSAPP_ACCOUNT_ID
 *
 * Variables opcionales:
 *   ZERNIO_API_BASE_URL              default: https://api.zernio.com/v1
 *   ZERNIO_PROBE_STATUS              default: active
 *   ZERNIO_PROBE_LIMIT               default: 5, max: 10
 *   ZERNIO_PROBE_CONVERSATION_ID     optional explicit conversation id for messages check
 */

type ProbeStep = {
  name: string;
  detail: string;
};

type RequestResult = {
  status: number;
  ok: boolean;
  body: unknown;
  text: string;
};

const DEFAULT_BASE_URL = "https://api.zernio.com/v1";
const ARRAY_KEYS = ["conversations", "messages", "data", "items", "results"];

async function main() {
  const apiToken = process.env.ZERNIO_API_TOKEN;
  const accountId = process.env.ZERNIO_WHATSAPP_ACCOUNT_ID;
  const baseUrl = normalizeBaseUrl(process.env.ZERNIO_API_BASE_URL || DEFAULT_BASE_URL);
  const status = process.env.ZERNIO_PROBE_STATUS || "active";
  const limit = clampNumber(Number(process.env.ZERNIO_PROBE_LIMIT || 5), 1, 10);
  const explicitConversationId = process.env.ZERNIO_PROBE_CONVERSATION_ID;

  const steps: ProbeStep[] = [];

  console.log("Zernio WhatsApp connectivity probe");
  console.log(`baseUrl: ${baseUrl}`);
  console.log(`accountId: ${mask(accountId)}`);
  console.log(`conversation status filter: ${status}`);
  console.log(`limit: ${limit}`);

  if (!apiToken || !accountId) {
    fail(
      "Missing required environment variables: ZERNIO_API_TOKEN and ZERNIO_WHATSAPP_ACCOUNT_ID."
    );
  }

  const conversationsPath = "/inbox/conversations";
  const conversationsResult = await requestJson(baseUrl, conversationsPath, apiToken, {
    account_id: accountId,
    status,
    limit,
    sort_order: "desc",
  });

  if (!conversationsResult.ok) {
    failRequest("conversations list", conversationsResult, apiToken, accountId);
  }

  const conversations = extractArray(conversationsResult.body, ARRAY_KEYS);
  const firstConversationId =
    explicitConversationId || extractConversationId(conversations[0]);

  steps.push({
    name: "GET /inbox/conversations",
    detail: `status=${conversationsResult.status}, count=${conversations.length}, firstConversationId=${firstConversationId ? "present" : "none"}`,
  });

  if (firstConversationId) {
    const messagesPath = `/inbox/conversations/${encodeURIComponent(firstConversationId)}/messages`;
    const messagesResult = await requestJson(baseUrl, messagesPath, apiToken, {
      accountId,
      limit: 20,
      sort_order: "asc",
    });

    if (!messagesResult.ok) {
      failRequest("conversation messages", messagesResult, apiToken, accountId);
    }

    const messages = extractArray(messagesResult.body, ARRAY_KEYS);
    steps.push({
      name: "GET /inbox/conversations/{id}/messages",
      detail: `status=${messagesResult.status}, count=${messages.length}`,
    });
  } else {
    steps.push({
      name: "GET /inbox/conversations/{id}/messages",
      detail: "skipped: no matching conversation and no ZERNIO_PROBE_CONVERSATION_ID provided",
    });
  }

  console.log("\nProbe result: OK");
  for (const step of steps) {
    console.log(`- ${step.name}: ${step.detail}`);
  }
}

async function requestJson(
  baseUrl: string,
  path: string,
  apiToken: string,
  query: Record<string, string | number | undefined>
): Promise<RequestResult> {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
    },
  });
  const text = await response.text();

  return {
    status: response.status,
    ok: response.ok,
    body: parseJson(text),
    text,
  };
}

function extractArray(response: unknown, keys: string[]): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const record = response as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key];
    }
  }

  return [];
}

function extractConversationId(conversation: unknown): string | undefined {
  if (!conversation || typeof conversation !== "object") {
    return undefined;
  }

  const record = conversation as Record<string, unknown>;
  const value =
    record.id ||
    record.conversation_id ||
    record.conversationId ||
    record.thread_id ||
    record.threadId;

  return value ? String(value) : undefined;
}

function parseJson(text: string): unknown {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}

function failRequest(label: string, result: RequestResult, apiToken: string, accountId: string): never {
  fail(
    `${label} failed with status ${result.status}: ${sanitize(result.text, apiToken, accountId)}`
  );
}

function fail(message: string): never {
  console.error(`\nProbe result: FAILED`);
  console.error(message);
  process.exit(1);
}

function sanitize(value: string, apiToken?: string, accountId?: string): string {
  let output = value.slice(0, 800);
  if (apiToken) {
    output = output.replaceAll(apiToken, "[redacted-token]");
  }
  if (accountId) {
    output = output.replaceAll(accountId, mask(accountId));
  }
  return output;
}

function mask(value?: string): string {
  if (!value) {
    return "[missing]";
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}...`;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
