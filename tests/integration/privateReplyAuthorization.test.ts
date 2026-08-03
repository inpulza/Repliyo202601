import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";

import type { IStorage } from "../../server/storage";
import {
  startPrivateReplyTestServer,
  type PrivateReplyTestServer,
} from "../helpers/privateReplyTestServer";

let server: PrivateReplyTestServer;
let applicationServer: Server;
let applicationBaseUrl = "";
let applicationStorage: IStorage;
let restoreApplicationStorage: (() => void) | undefined;
const downstreamCalls = {
  brand: 0,
  agent: 0,
  conversationMessages: 0,
};

before(async () => {
  server = await startPrivateReplyTestServer();

  process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:1/repliyo_test";
  process.env.SESSION_SECRET ??= "private-reply-integration-test-secret";

  const [{ registerRoutes }, storageModule] = await Promise.all([
    import("../../server/routes"),
    import("../../server/storage"),
  ]);
  applicationStorage = storageModule.storage;

  const originalMethods = {
    getUser: applicationStorage.getUser,
    getMessage: applicationStorage.getMessage,
    getConversation: applicationStorage.getConversation,
    getBrand: applicationStorage.getBrand,
    getAiAgentByBrand: applicationStorage.getAiAgentByBrand,
    getMessagesByConversation: applicationStorage.getMessagesByConversation,
  };

  applicationStorage.getUser = async () => ({
    id: "user-a",
    email: "client-a@example.test",
    password: null,
    name: "Client A",
    role: "client",
    brandId: "brand-a",
    replitId: null,
    profileImageUrl: null,
    authProvider: "local",
    status: "active",
    emailVerifiedAt: new Date("2026-08-03T00:00:00.000Z"),
    createdAt: new Date("2026-08-03T00:00:00.000Z"),
  });
  applicationStorage.getMessage = async () => ({
    id: "message-b",
    brandId: "brand-b",
  }) as Awaited<ReturnType<IStorage["getMessage"]>>;
  applicationStorage.getConversation = async () => ({
    id: "conversation-b",
    brandId: "brand-b",
  }) as Awaited<ReturnType<IStorage["getConversation"]>>;
  applicationStorage.getBrand = async () => {
    downstreamCalls.brand += 1;
    return undefined;
  };
  applicationStorage.getAiAgentByBrand = async () => {
    downstreamCalls.agent += 1;
    return undefined;
  };
  applicationStorage.getMessagesByConversation = async () => {
    downstreamCalls.conversationMessages += 1;
    return [];
  };

  restoreApplicationStorage = () => {
    applicationStorage.getUser = originalMethods.getUser;
    applicationStorage.getMessage = originalMethods.getMessage;
    applicationStorage.getConversation = originalMethods.getConversation;
    applicationStorage.getBrand = originalMethods.getBrand;
    applicationStorage.getAiAgentByBrand = originalMethods.getAiAgentByBrand;
    applicationStorage.getMessagesByConversation = originalMethods.getMessagesByConversation;
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = {
      userId: "user-a",
      destroy: (callback: (error?: unknown) => void) => callback(),
    } as typeof req.session;
    next();
  });

  applicationServer = await registerRoutes(app);
  await new Promise<void>((resolve, reject) => {
    applicationServer.once("error", reject);
    applicationServer.listen(0, "127.0.0.1", resolve);
  });
  const address = applicationServer.address() as AddressInfo;
  applicationBaseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await server.close();
  await new Promise<void>((resolve, reject) => {
    applicationServer.close((error) => (error ? reject(error) : resolve()));
  });
  restoreApplicationStorage?.();
});

describe("private reply brand authorization over HTTP", () => {
  it("blocks a foreign message before any external call or write", async () => {
    server.reset();

    const response = await fetch(`${server.baseUrl}/api/inbox/private-reply`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-brand-id": "brand-a",
      },
      body: JSON.stringify({ messageId: "message-b", text: "Do not send" }),
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Message not found" });
    assert.equal(server.state.metaCalls, 0);
    assert.equal(server.state.databaseWrites, 0);
  });

  it("allows the owning brand to continue to the send boundary", async () => {
    server.reset();

    const response = await fetch(`${server.baseUrl}/api/inbox/private-reply`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-brand-id": "brand-b",
      },
      body: JSON.stringify({ messageId: "message-b", text: "Safe fixture" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.equal(server.state.metaCalls, 1);
    assert.equal(server.state.databaseWrites, 1);
  });

  it("hides a foreign template without reading agent data", async () => {
    server.reset();

    const response = await fetch(
      `${server.baseUrl}/api/inbox/private-reply/template?messageId=message-b`,
      { headers: { "x-test-brand-id": "brand-a" } },
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Message not found" });
    assert.equal(server.state.templateReads, 0);
  });

  it("returns an empty status for a foreign conversation without reading messages", async () => {
    server.reset();

    const response = await fetch(
      `${server.baseUrl}/api/inbox/private-reply/status?conversationId=conversation-b`,
      { headers: { "x-test-brand-id": "brand-a" } },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { sentCommentIds: [] });
    assert.equal(server.state.statusMessageReads, 0);
  });
});

describe("registered private reply routes", () => {
  it("blocks a foreign send before brand or Meta configuration is loaded", async () => {
    downstreamCalls.brand = 0;

    const response = await fetch(`${applicationBaseUrl}/api/inbox/private-reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: "message-b", text: "Do not send" }),
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Message not found" });
    assert.equal(downstreamCalls.brand, 0);
  });

  it("hides a foreign template before agent data is loaded", async () => {
    downstreamCalls.agent = 0;

    const response = await fetch(
      `${applicationBaseUrl}/api/inbox/private-reply/template?messageId=message-b`,
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Message not found" });
    assert.equal(downstreamCalls.agent, 0);
  });

  it("hides foreign reply status before conversation messages are loaded", async () => {
    downstreamCalls.conversationMessages = 0;

    const response = await fetch(
      `${applicationBaseUrl}/api/inbox/private-reply/status?conversationId=conversation-b`,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { sentCommentIds: [] });
    assert.equal(downstreamCalls.conversationMessages, 0);
  });
});
