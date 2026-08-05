import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { WebSocket, type RawData } from "ws";
import { WEBSOCKET_TRANSIENT_FAILURE_CLOSE_CODE } from "../../shared/websocketAccess";

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

    await expectNoMessageBeforeBarrier(
      clientA,
      (message) => (message.data as { id?: string } | undefined)?.id === "foreign-before-subscribe",
      () => {
        server.service.notifyNewMessage("brand-b", { id: "foreign-before-subscribe" });
        server.service.notifyNewMessage("brand-a", { id: "own-before-subscribe" });
      },
      (message) => (message.data as { id?: string } | undefined)?.id === "own-before-subscribe",
    );

    clientA.socket.send(JSON.stringify({ type: "subscribe", brandId: "brand-b" }));
    await waitForMessage(
      clientA,
      (message) => message.type === "error" && message.message === "Access denied to this brand",
    );

    await expectNoMessageBeforeBarrier(
      clientA,
      (message) => (message.data as { id?: string } | undefined)?.id === "foreign-after-subscribe",
      () => {
        server.service.notifyNewMessage("brand-b", { id: "foreign-after-subscribe" });
        server.service.notifyNewMessage("brand-a", { id: "own-after-subscribe" });
      },
      (message) => (message.data as { id?: string } | undefined)?.id === "own-after-subscribe",
    );

    await closeProbe(clientA);
  });

  it("isolates two clients while allowing an admin to narrow its subscription", async () => {
    const clientA = await connect("session-a");
    const clientB = await connect("session-b");
    const admin = await connect("session-admin");

    const clientAStart = clientA.messages.length;
    server.service.notifySyncComplete("brand-b", { newMessages: 2, totalMessages: 5 });
    server.service.notifyNewMessage("brand-a", { id: "client-a-sync-barrier" });
    await waitForMessage(clientB, (message) => message.type === "sync_complete" && message.brandId === "brand-b");
    await waitForMessage(admin, (message) => message.type === "sync_complete" && message.brandId === "brand-b");
    await waitForMessage(
      clientA,
      (message) => (message.data as { id?: string } | undefined)?.id === "client-a-sync-barrier",
    );
    assert.equal(
      clientA.messages.slice(clientAStart).some(
        (message) => message.type === "sync_complete" && message.brandId === "brand-b",
      ),
      false,
    );

    admin.socket.send(JSON.stringify({ type: "subscribe", brandId: "brand-a" }));
    await waitForMessage(admin, (message) => message.type === "subscribed" && message.brandId === "brand-a");

    const adminStart = admin.messages.length;
    server.service.notifyAgentReply("brand-b", { id: "brand-b-reply" });
    server.service.notifyAgentReply("brand-a", { id: "brand-a-reply" });
    await waitForMessage(
      clientB,
      (message) => (message.data as { id?: string } | undefined)?.id === "brand-b-reply",
    );
    await waitForMessage(
      admin,
      (message) => (message.data as { id?: string } | undefined)?.id === "brand-a-reply",
    );
    assert.equal(
      admin.messages.slice(adminStart).some(
        (message) => (message.data as { id?: string } | undefined)?.id === "brand-b-reply",
      ),
      false,
    );
    await waitForMessage(
      clientA,
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

  it("still treats a valid cookie without a stored session as unauthenticated", async () => {
    const missing = new WebSocket(server.wsUrl, {
      headers: { Cookie: signedSessionCookie("session-missing") },
    });

    assert.equal(await waitForCloseCode(missing), 4001);
  });

  it("logs a session-store failure safely and keeps it retryable", async () => {
    const logs: Array<{ message: string; source?: string }> = [];
    const storeError = Object.assign(
      new Error(
        "Neon connection reset password=hunter2 token=provider-token "
          + "sessionId=session-super-secret payload='provider-body' "
          + "postgresql://db-user:db-password@db.example.test/repliyo",
      ),
      { code: "ECONNRESET" },
    );
    const unavailableServer = await startWebSocketTestServer({
      getSessionUserId: async () => {
        throw storeError;
      },
      logger: (message, source) => logs.push({ message, source }),
    });

    try {
      const socket = new WebSocket(unavailableServer.wsUrl, {
        headers: { Cookie: signedSessionCookie("session-a") },
      });
      assert.equal(await waitForCloseCode(socket), WEBSOCKET_TRANSIENT_FAILURE_CLOSE_CODE);

      const diagnostic = findAuthenticationFailureLog(logs);
      assert.equal(diagnostic.source, "ws");
      assert.equal(diagnostic.context.event, "websocket_authentication_failed");
      assert.equal(diagnostic.context.stage, "session_store_lookup");
      assert.equal(diagnostic.context.outcome, "retryable_close");
      assert.equal(diagnostic.context.closeCode, WEBSOCKET_TRANSIENT_FAILURE_CLOSE_CODE);
      assert.equal(diagnostic.context.error.name, "Error");
      assert.equal(diagnostic.context.error.code, "ECONNRESET");
      assert.match(diagnostic.context.error.message, /Neon connection reset/);
      assert.match(diagnostic.context.error.message, /\[redacted\]/);
      assert.match(diagnostic.context.error.message, /\[redacted-url\]/);

      const serializedLog = JSON.stringify(diagnostic.context);
      for (const sensitiveValue of [
        "hunter2",
        "provider-token",
        "session-super-secret",
        "provider-body",
        "db-user",
        "db-password",
      ]) {
        assert.doesNotMatch(serializedLog, new RegExp(sensitiveValue));
      }
    } finally {
      await unavailableServer.close();
    }
  });

  it("identifies authorization lookup failures without changing retry behavior", async () => {
    const logs: Array<{ message: string; source?: string }> = [];
    const unavailableServer = await startWebSocketTestServer({
      getSessionAccessByUserId: async () => {
        throw new TypeError("Cannot read properties of undefined");
      },
      logger: (message, source) => logs.push({ message, source }),
    });

    try {
      const socket = new WebSocket(unavailableServer.wsUrl, {
        headers: { Cookie: signedSessionCookie("session-a") },
      });
      assert.equal(await waitForCloseCode(socket), WEBSOCKET_TRANSIENT_FAILURE_CLOSE_CODE);

      const diagnostic = findAuthenticationFailureLog(logs);
      assert.equal(diagnostic.context.stage, "authorization_lookup");
      assert.equal(diagnostic.context.error.name, "TypeError");
      assert.equal(diagnostic.context.error.message, "Cannot read properties of undefined");
    } finally {
      await unavailableServer.close();
    }
  });

  it("rejects suspended users and clients of archived brands", async () => {
    const suspended = new WebSocket(server.wsUrl, {
      headers: { Cookie: signedSessionCookie("session-suspended") },
    });
    const archived = new WebSocket(server.wsUrl, {
      headers: { Cookie: signedSessionCookie("session-archived") },
    });

    const suspendedClose = waitForCloseCode(suspended);
    const archivedClose = waitForCloseCode(archived);

    assert.equal(await suspendedClose, 4003);
    assert.equal(await archivedClose, 4003);
  });

  it("disconnects an established socket when user or brand access is revoked", async () => {
    const clientA = await connect("session-a");
    const clientB = await connect("session-b");
    const clientAClose = waitForCloseCode(clientA.socket);
    const clientBClose = waitForCloseCode(clientB.socket);

    assert.equal(server.service.disconnectUser("user-a"), 1);
    assert.equal(await clientAClose, 4003);

    assert.equal(server.service.disconnectBrand("brand-b"), 1);
    assert.equal(await clientBClose, 4003);
    assert.equal(server.service.getConnectedClientsCount(), 0);
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

  await waitForConnected(probe);
  return probe;
}

async function waitForConnected(probe: SocketProbe): Promise<void> {
  if (probe.messages.some((message) => message.type === "connected")) return;

  await new Promise<void>((resolve, reject) => {
    const onMessage = (data: RawData) => {
      const message = JSON.parse(data.toString()) as Record<string, unknown>;
      if (message.type === "connected") finish();
    };
    const onClose = (code: number, reason: Buffer) => {
      finish(new Error(`Socket closed before connect: ${code} ${reason.toString()}`));
    };
    const onError = (error: Error) => finish(error);
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      probe.socket.off("message", onMessage);
      probe.socket.off("close", onClose);
      probe.socket.off("error", onError);
      error ? reject(error) : resolve();
    };
    const timeout = setTimeout(() => finish(new Error("Timed out waiting for WebSocket connection")), 1_500);

    probe.socket.on("message", onMessage);
    probe.socket.once("close", onClose);
    probe.socket.once("error", onError);
  });
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

async function expectNoMessageBeforeBarrier(
  probe: SocketProbe,
  predicate: (message: Record<string, unknown>) => boolean,
  emitEvents: () => void,
  barrierPredicate: (message: Record<string, unknown>) => boolean,
): Promise<void> {
  const startingIndex = probe.messages.length;
  emitEvents();
  await waitForMessage(probe, barrierPredicate);
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

function findAuthenticationFailureLog(
  logs: Array<{ message: string; source?: string }>,
): {
  source?: string;
  context: {
    event: string;
    stage: string;
    outcome: string;
    closeCode: number;
    error: { name: string; code?: string; message: string };
  };
} {
  const entry = logs.find(({ message }) => message.includes('"event":"websocket_authentication_failed"'));
  assert.ok(entry, `Expected a structured authentication failure log. Received: ${JSON.stringify(logs)}`);

  return {
    source: entry.source,
    context: JSON.parse(entry.message),
  };
}
