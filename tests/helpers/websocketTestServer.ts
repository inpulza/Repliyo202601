import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import signature from "cookie-signature";

import { WebSocketService } from "../../server/services/websocketService";

export const TEST_SESSION_SECRET = "websocket-tenant-test-secret";

const sessions: Record<string, string> = {
  "session-a": "user-a",
  "session-b": "user-b",
  "session-admin": "user-admin",
};

const users = {
  "user-a": { id: "user-a", role: "client", brandId: "brand-a" },
  "user-b": { id: "user-b", role: "client", brandId: "brand-b" },
  "user-admin": { id: "user-admin", role: "admin", brandId: null },
} as const;

export interface WebSocketTestServer {
  httpUrl: string;
  wsUrl: string;
  service: WebSocketService;
  close(): Promise<void>;
}

export function signedSessionCookie(
  sessionId: string,
  secret = TEST_SESSION_SECRET,
): string {
  const signedValue = `s:${signature.sign(sessionId, secret)}`;
  return `connect.sid=${encodeURIComponent(signedValue)}`;
}

export async function startWebSocketTestServer(): Promise<WebSocketTestServer> {
  const httpServer = createServer();
  const service = new WebSocketService({
    sessionSecret: TEST_SESSION_SECRET,
    getSessionUserId: async (sessionId) => sessions[sessionId] || null,
    getUser: async (userId) => users[userId as keyof typeof users] || null,
    logger: () => {},
  });
  service.initialize(httpServer);

  await listen(httpServer);
  const address = httpServer.address() as AddressInfo;
  const httpUrl = `http://127.0.0.1:${address.port}`;

  return {
    httpUrl,
    wsUrl: `ws://127.0.0.1:${address.port}/ws`,
    service,
    async close() {
      await service.shutdown();
      await close(httpServer);
    },
  };
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
