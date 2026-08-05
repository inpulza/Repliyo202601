import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import signature from "cookie-signature";

import {
  WebSocketService,
  type WebSocketServiceOptions,
} from "../../server/services/websocketService";
import type { SessionAccessRecord } from "../../server/security/sessionAccess";

export const TEST_SESSION_SECRET = "websocket-tenant-test-secret";

const sessions: Record<string, string> = {
  "session-a": "user-a",
  "session-b": "user-b",
  "session-admin": "user-admin",
  "session-suspended": "user-suspended",
  "session-archived": "user-archived",
};

const accessRecords: Record<string, SessionAccessRecord> = {
  "user-a": sessionAccessRecord("user-a", "client", "brand-a", "active", "active"),
  "user-b": sessionAccessRecord("user-b", "client", "brand-b", "active", "active"),
  "user-admin": sessionAccessRecord("user-admin", "admin", null, "active", null),
  "user-suspended": sessionAccessRecord("user-suspended", "client", "brand-a", "suspended", "active"),
  "user-archived": sessionAccessRecord("user-archived", "client", "brand-archived", "active", "archived"),
};

export interface WebSocketTestServer {
  httpUrl: string;
  wsUrl: string;
  service: WebSocketService;
  close(): Promise<void>;
}

export interface WebSocketTestServerOptions {
  getSessionUserId?: (sessionId: string) => Promise<string | null>;
  getSessionAccessByUserId?: WebSocketServiceOptions["getSessionAccessByUserId"];
  logger?: WebSocketServiceOptions["logger"];
}

export function signedSessionValue(
  sessionId: string,
  secret = TEST_SESSION_SECRET,
): string {
  return encodeURIComponent(`s:${signature.sign(sessionId, secret)}`);
}

export function signedSessionCookie(
  sessionId: string,
  secret = TEST_SESSION_SECRET,
): string {
  return `connect.sid=${signedSessionValue(sessionId, secret)}`;
}

export async function startWebSocketTestServer(
  options: WebSocketTestServerOptions = {},
): Promise<WebSocketTestServer> {
  const httpServer = createServer();
  const service = new WebSocketService({
    sessionSecret: TEST_SESSION_SECRET,
    getSessionUserId: options.getSessionUserId || (async (sessionId) => sessions[sessionId] || null),
    getSessionAccessByUserId: options.getSessionAccessByUserId
      || (async (userId) => accessRecords[userId] || null),
    logger: options.logger || (() => {}),
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

function sessionAccessRecord(
  id: string,
  role: string,
  brandId: string | null,
  status: string,
  brandStatus: string | null,
): SessionAccessRecord {
  return {
    user: {
      id,
      email: `${id}@example.test`,
      password: null,
      name: id,
      role,
      brandId,
      replitId: null,
      profileImageUrl: null,
      authProvider: "local",
      status,
      emailVerifiedAt: new Date("2026-08-05T00:00:00.000Z"),
      createdAt: new Date("2026-08-05T00:00:00.000Z"),
    },
    brandStatus,
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
