import { createZernioWhatsAppChannelAdapter } from "../services/channels/zernioWhatsAppAdapter";

type FetchCall = {
  url: string;
  method: string;
};

const calls: FetchCall[] = [];
const accountId = "acc_inpulza_whatsapp";
const blogId = "4074962";

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(String(input));
  const method = init?.method || "GET";
  calls.push({ url: url.toString(), method });

  assert(method === "GET", `Expected read-only GET request, got ${method}`);
  assert(!url.pathname.endsWith("/read"), "Observer must not mark conversations as read");
  assert(!url.pathname.endsWith("/typing"), "Observer must not send typing indicators");

  if (url.pathname.endsWith("/inbox/conversations")) {
    assert(url.searchParams.get("accountId") === accountId, "List conversations must be scoped by accountId");
    assert(url.searchParams.get("status") === "active", "List conversations must request active conversations");
    assert(url.searchParams.get("sortOrder") === "desc", "List conversations must request descending updatedTime");

    return jsonResponse({
      data: [
        {
          id: "conv-live-1",
          platform: "whatsapp",
          accountId,
          accountUsername: "Inpulza USA",
          participantId: "17864346163",
          participantName: "Lead Example",
          participantPicture: "https://example.com/avatar.jpg",
          lastMessage: "Thanks",
          updatedTime: "2026-06-17T10:00:00.000Z",
          status: "active",
        },
      ],
    });
  }

  if (url.pathname.endsWith("/inbox/conversations/conv-live-1/messages")) {
    assert(url.searchParams.get("accountId") === accountId, "List messages must be scoped by accountId");
    assert(url.searchParams.get("sortOrder") === "asc", "List messages must request chronological order");

    return jsonResponse({
      messages: [
        {
          id: "wamid-inbound-1",
          conversationId: "conv-live-1",
          accountId,
          platform: "whatsapp",
          message: "Hola",
          senderId: "17864346163",
          senderName: "Lead Example",
          direction: "incoming",
          createdAt: "2026-06-17T09:59:00.000Z",
        },
        {
          id: "wamid-outbound-1",
          conversationId: "conv-live-1",
          accountId,
          platform: "whatsapp",
          message: "Hey, thanks for reaching out",
          senderId: accountId,
          senderName: "Inpulza USA",
          direction: "outgoing",
          createdAt: "2026-06-17T10:00:00.000Z",
        },
      ],
    });
  }

  throw new Error(`Unexpected Zernio URL: ${url.toString()}`);
}) as typeof fetch;

async function main() {
  const adapter = createZernioWhatsAppChannelAdapter({
    apiToken: "test-token",
    accounts: [
      {
        blogId,
        accountId,
        accountName: "Inpulza USA",
      },
    ],
  });

  const inactive = await adapter.getAllInboxData(blogId, ["INSTAGRAM"]);
  assert(inactive.conversations.length === 0, "Inactive WhatsApp provider must not fetch conversations");
  assert(callCount() === 0, "Inactive WhatsApp provider must not call Zernio");

  const wrongBrand = await adapter.getAllInboxData("not-mapped", ["WHATSAPP"]);
  assert(wrongBrand.conversations.length === 0, "Unmapped blogId must not fetch conversations");
  assert(callCount() === 0, "Unmapped blogId must not call Zernio");

  const data = await adapter.getAllInboxData(blogId, ["WHATSAPP"]);
  assert(data.comments.length === 0, "WhatsApp adapter must not create public comments");
  assert(data.conversations.length === 1, "Expected one mapped WhatsApp conversation");

  const [conversation] = data.conversations;
  assert(conversation.provider === "WHATSAPP", "Conversation provider must be WHATSAPP");
  assert(conversation.id === "conv-live-1", "Conversation id must come from Zernio id");
  assert(conversation.lastUpdate === "2026-06-17T10:00:00.000Z", "Conversation lastUpdate must use updatedTime");
  assert(conversation.participants[1].id === "17864346163", "Customer participant id must use participantId");
  assert(conversation.participants[1].name === "Lead Example", "Customer participant name must use participantName");

  assert(conversation.messages.length === 2, "Expected inbound and outbound messages");
  assert(conversation.messages[0].from.id === "17864346163", "Inbound sender must be the customer");
  assert(conversation.messages[0].timestamp === "2026-06-17T09:59:00.000Z", "Inbound timestamp must use createdAt");
  assert(conversation.messages[1].from.id === accountId, "Outbound sender must be the WhatsApp account");
  assert(conversation.messages[1].timestamp === "2026-06-17T10:00:00.000Z", "Outbound timestamp must use createdAt");

  assert(callCount() === 2, `Expected 2 read-only calls, got ${callCount()}`);

  console.log("Zernio WhatsApp adapter smoke: OK");
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function callCount(): number {
  return calls.length;
}

main().catch((error) => {
  console.error("Zernio WhatsApp adapter smoke: FAILED");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
