import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { WebSocket, type RawData } from "ws";

import {
  signedSessionCookie,
  startWebSocketTestServer,
  type WebSocketTestServer,
} from "../helpers/websocketTestServer";

interface SocketProbe {
  socket: WebSocket;
  messages: Array<Record<string, unknown>>;
}

let server: WebSocketTestServer;

before(async () => {
  server = await startWebSocketTestServer();
});

after(async () => {
  await server.close();
});

describe("WebSocket tenant isolation", () => {
  it("scopes a client immediately and rejects a foreign subscription", async () => {
    const clientA = await connect("session-a");

    server.service.notifyNewMessage("brand-b", { id: "foreign-before-subscribe" });
    await expectNoMessage(clientA, (message) => message.brandId === "brand-b");

    server.service.notifyNewMessage("brand-a", { id: "own-before-subscribe" });
    await waitForMessage(
      clientA,
      (message) => message.type === "new_message" && message.brandId === "brand-a",
    );

    clientA.socket.send(JSON.stringify({ type: "subscribe", brandId: "brand-b" }));
    await waitForMessage(
      clientA,
      (message) => message.type === "error" && message.message === "Access denied to this brand",
    );

    server.service.notifyNewMessage("brand-b", { id: "foreign-after-subscribe" });
    await expectNoMessage(
      clientA,
      (message) => (message.data as { id?: string } | undefined)?.id === "foreign-after-subscribe",
    );

    await closeProbe(clientA);
  });

  it("isolates two clients while allowing an admin to narrow its subscription", async () => {
    const clientA = await connect("session-a");
    const clientB = await connect("session-b");
    const admin = await connect("session-admin");

    server.service.notifySyncComplete("brand-b", { newMessages: 2, totalMessages: 5 });
    await waitForMessage(clientB, (message) => message.type === "sync_complete" && message.brandId === "brand-b");
    await waitForMessage(admin, (message) => message.type === "sync_complete" && message.brandId === "brand-b");
    await expectNoMessage(clientA, (message) => message.type === "sync_complete" && message.brandId === "brand-b");

    admin.socket.send(JSON.stringify({ type: "subscribe", brandId: "brand-a" }));
    await waitForMessage(admin, (message) => message.type === "subscribed" && message.brandId === "brand-a");

    server.service.notifyAgentReply("brand-b", { id: "brand-b-reply" });
    await waitForMessage(
      clientB,
      (message) => (message.data as { id?: string } | undefined)?.id === "brand-b-reply",
    );
    await expectNoMessage(
      admin,
      (message) => (message.data as { id?: string } | undefined)?.id === "brand-b-reply",
    );

    server.service.notifyAgentReply("brand-a", { id: "brand-a-reply" });
    await waitForMessage(
      clientA,
      (message) => (message.data as { id?: string } | undefined)?.id === "brand-a-reply",
    );
    await waitForMessage(
      admin,
      (message) => (message.data as { id?: string } | undefined)?.id === "brand-a-reply",
    );

    await Promise.all([closeProbe(clientA), closeProbe(clientB), closeProbe(admin)]);
  });

  it("rejects unsigned and incorrectly signed session cookies", async () => {
    const unsigned = new WebSocket(server.wsUrl, {
      headers: { Cookie: "connect.sid=session-a" },
    });
    const invalid = new WebSocket(server.wsUrl, {
      headers: { Cookie: signedSessionCookie("session-a", "wrong-secret") },
    });

    const unsignedClose = waitForCloseCode(unsigned);
    const invalidClose = waitForCloseCode(invalid);

    assert.equal(await unsignedClose, 4001);
    assert.equal(await invalidClose, 4001);
  });
});

async function connect(sessionId: string): Promise<SocketProbe> {
  const socket = new WebSocket(server.wsUrl, {
    headers: { Cookie: signedSessionCookie(sessionId) },
  });
  const probe: SocketProbe = { socket, messages: [] };

  socket.on("message", (data) => {
    probe.messages.push(JSON.parse(data.toString()) as Record<string, unknown>);
  });

  await waitForMessage(probe, (message) => message.type === "connected");
  return probe;
}

async function waitForMessage(
  probe: SocketProbe,
  predicate: (message: Record<string, unknown>) => boolean,
  timeoutMs = 1_500,
): Promise<Record<string, unknown>> {
  const existing = probe.messages.find(predicate);
  if (existing) return existing;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      probe.socket.off("message", onMessage);
      reject(new Error(`Timed out waiting for WebSocket message. Received: ${JSON.stringify(probe.messages)}`));
    }, timeoutMs);

    const onMessage = (data: RawData) => {
      const message = JSON.parse(data.toString()) as Record<string, unknown>;
      if (!predicate(message)) return;

      clearTimeout(timeout);
      probe.socket.off("message", onMessage);
      resolve(message);
    };

    probe.socket.on("message", onMessage);
  });
}

async function expectNoMessage(
  probe: SocketProbe,
  predicate: (message: Record<string, unknown>) => boolean,
  durationMs = 120,
): Promise<void> {
  const startingIndex = probe.messages.length;
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  assert.equal(probe.messages.slice(startingIndex).some(predicate), false);
}

async function closeProbe(probe: SocketProbe): Promise<void> {
  if (probe.socket.readyState === WebSocket.CLOSED) return;

  const closed = new Promise<void>((resolve) => probe.socket.once("close", () => resolve()));
  probe.socket.close(1000, "Test complete");
  await closed;
}

function waitForCloseCode(socket: WebSocket): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for socket rejection")), 1_500);
    socket.once("close", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
    socket.once("error", () => {});
  });
}
