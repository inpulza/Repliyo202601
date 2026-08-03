import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";

import { getAccessibleBrandResource } from "../../server/security/brandAccess";

export interface PrivateReplyTestState {
  metaCalls: number;
  databaseWrites: number;
  templateReads: number;
  statusMessageReads: number;
}

export interface PrivateReplyTestServer {
  baseUrl: string;
  state: PrivateReplyTestState;
  reset(): void;
  close(): Promise<void>;
}

export async function startPrivateReplyTestServer(): Promise<PrivateReplyTestServer> {
  const app = express();
  const state: PrivateReplyTestState = {
    metaCalls: 0,
    databaseWrites: 0,
    templateReads: 0,
    statusMessageReads: 0,
  };

  app.use(express.json());

  app.post("/api/inbox/private-reply", async (req, res) => {
    const message = getAccessibleBrandResource(
      { role: "client", brandId: req.header("x-test-brand-id") ?? null },
      { id: String(req.body.messageId), brandId: "brand-b" },
    );

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    state.metaCalls += 1;
    state.databaseWrites += 1;
    return res.json({ success: true });
  });

  app.get("/api/inbox/private-reply/template", async (req, res) => {
    const message = getAccessibleBrandResource(
      { role: "client", brandId: req.header("x-test-brand-id") ?? null },
      { id: String(req.query.messageId), brandId: "brand-b" },
    );

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    state.templateReads += 1;
    return res.json({ text: "Safe fixture" });
  });

  app.get("/api/inbox/private-reply/status", async (req, res) => {
    const conversation = getAccessibleBrandResource(
      { role: "client", brandId: req.header("x-test-brand-id") ?? null },
      { id: String(req.query.conversationId), brandId: "brand-b" },
    );

    if (!conversation) {
      return res.json({ sentCommentIds: [] });
    }

    state.statusMessageReads += 1;
    return res.json({ sentCommentIds: ["message-b"] });
  });

  const server = await listen(app);
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    state,
    reset() {
      state.metaCalls = 0;
      state.databaseWrites = 0;
      state.templateReads = 0;
      state.statusMessageReads = 0;
    },
    close() {
      return close(server);
    },
  };
}

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1");
    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
