import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";

import type { User } from "@shared/schema";
import type { IStorage } from "../../server/storage";
import type { SessionAccessRecord } from "../../server/security/sessionAccess";

export interface DashboardAuthorizationState {
  assignmentWrites: number;
  notificationWrites: number;
  sessionRevocations: number;
}

export interface DashboardAuthorizationTestServer {
  baseUrl: string;
  state: DashboardAuthorizationState;
  setUserStatus(userId: string, status: string): void;
  reset(): void;
  close(): Promise<void>;
}

const activeUserA = user("user-a", "brand-a");
const activeAgentA = user("agent-a", "brand-a");
const suspendedUserA = user("suspended-a", "brand-a", "suspended");
const activeUserB = user("user-b", "brand-b");
const adminUser = user("admin", null, "active", "admin");
const archivedUser = user("archived-user", "brand-archived");
const staleAgentA = user("stale-agent-a", "brand-a");

const accessRecords: Record<string, SessionAccessRecord> = {
  "user-a": { user: activeUserA, brandStatus: "active" },
  "agent-a": { user: activeAgentA, brandStatus: "active" },
  "suspended-a": { user: suspendedUserA, brandStatus: "active" },
  "user-b": { user: activeUserB, brandStatus: "active" },
  admin: { user: adminUser, brandStatus: null },
  "archived-user": { user: archivedUser, brandStatus: "archived" },
};

const lookupUsers: Record<string, User> = {
  ...Object.fromEntries(
    Object.entries(accessRecords).map(([id, record]) => [id, record.user]),
  ),
  "stale-agent-a": staleAgentA,
};

export async function startDashboardAuthorizationTestServer(): Promise<DashboardAuthorizationTestServer> {
  process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:1/repliyo_test";
  process.env.SESSION_SECRET ??= "dashboard-authorization-test-secret";

  const [{ registerRoutes }, storageModule] = await Promise.all([
    import("../../server/routes"),
    import("../../server/storage"),
  ]);
  const storage = storageModule.storage;
  const state: DashboardAuthorizationState = {
    assignmentWrites: 0,
    notificationWrites: 0,
    sessionRevocations: 0,
  };

  const notifications = [
    notification("notification-a", "brand-a"),
    notification("notification-b", "brand-b"),
  ];
  const conversations = new Map([
    ["conversation-a", conversation("conversation-a", "brand-a")],
    ["conversation-b", conversation("conversation-b", "brand-b")],
  ]);

  const originalMethods = {
    createConversationStatusHistory: storage.createConversationStatusHistory,
    getConversation: storage.getConversation,
    getNotifications: storage.getNotifications,
    getSessionAccessByUserId: storage.getSessionAccessByUserId,
    getUnreadNotificationCount: storage.getUnreadNotificationCount,
    getUser: storage.getUser,
    markAllNotificationsAsRead: storage.markAllNotificationsAsRead,
    markNotificationAsRead: storage.markNotificationAsRead,
    updateConversationAssignment: storage.updateConversationAssignment,
  };

  storage.getSessionAccessByUserId = async (id) => accessRecords[id];
  storage.getUser = async (id) => lookupUsers[id];
  storage.getNotifications = async (brandId) =>
    notifications.filter((item) => item.brandId === brandId) as Awaited<ReturnType<IStorage["getNotifications"]>>;
  storage.getUnreadNotificationCount = async (brandId) =>
    notifications.filter((item) => item.brandId === brandId && !item.isRead).length;
  storage.markNotificationAsRead = async (id, brandId) => {
    const item = notifications.find(
      (candidate) => candidate.id === id && candidate.brandId === brandId,
    );
    if (!item) return undefined;

    item.isRead = true;
    state.notificationWrites += 1;
    return item as Awaited<ReturnType<IStorage["markNotificationAsRead"]>>;
  };
  storage.markAllNotificationsAsRead = async (brandId) => {
    let count = 0;
    for (const item of notifications) {
      if (item.brandId === brandId && !item.isRead) {
        item.isRead = true;
        count += 1;
      }
    }
    state.notificationWrites += count;
    return count;
  };
  storage.getConversation = async (id) =>
    conversations.get(id) as Awaited<ReturnType<IStorage["getConversation"]>>;
  storage.updateConversationAssignment = async (id, brandId, userId) => {
    const item = conversations.get(id);
    if (!item || item.brandId !== brandId) return undefined;
    if (userId) {
      const assignee = accessRecords[userId]?.user;
      if (
        !assignee ||
        assignee.brandId !== brandId ||
        assignee.status !== "active"
      ) {
        return undefined;
      }
    }

    item.assignedToUserId = userId;
    item.assignedAt = userId ? new Date("2026-08-05T12:00:00.000Z") : null;
    item.aiActive = !userId;
    state.assignmentWrites += 1;
    return item as Awaited<ReturnType<IStorage["updateConversationAssignment"]>>;
  };
  storage.createConversationStatusHistory = async () =>
    ({ id: "history-a" }) as Awaited<ReturnType<IStorage["createConversationStatusHistory"]>>;

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header("x-test-user-id") || "user-a";
    req.session = {
      userId,
      destroy: (callback: (error?: unknown) => void) => {
        state.sessionRevocations += 1;
        callback();
      },
    } as typeof req.session;
    next();
  });

  const httpServer = await registerRoutes(app);
  await listen(httpServer);
  const address = httpServer.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    state,
    setUserStatus(userId, status) {
      const record = accessRecords[userId];
      if (!record) throw new Error(`Unknown dashboard test user: ${userId}`);
      record.user.status = status;
    },
    reset() {
      state.assignmentWrites = 0;
      state.notificationWrites = 0;
      state.sessionRevocations = 0;
      activeUserA.status = "active";
      for (const item of notifications) item.isRead = false;
      for (const item of conversations.values()) {
        item.assignedToUserId = null;
        item.assignedAt = null;
        item.aiActive = true;
      }
    },
    async close() {
      storage.createConversationStatusHistory = originalMethods.createConversationStatusHistory;
      storage.getConversation = originalMethods.getConversation;
      storage.getNotifications = originalMethods.getNotifications;
      storage.getSessionAccessByUserId = originalMethods.getSessionAccessByUserId;
      storage.getUnreadNotificationCount = originalMethods.getUnreadNotificationCount;
      storage.getUser = originalMethods.getUser;
      storage.markAllNotificationsAsRead = originalMethods.markAllNotificationsAsRead;
      storage.markNotificationAsRead = originalMethods.markNotificationAsRead;
      storage.updateConversationAssignment = originalMethods.updateConversationAssignment;
      await close(httpServer);
    },
  };
}

function user(
  id: string,
  brandId: string | null,
  status = "active",
  role = "client",
): User {
  return {
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
  };
}

function notification(id: string, brandId: string) {
  return {
    id,
    brandId,
    type: "new_messages",
    title: `Notification ${id}`,
    description: "Authorization fixture",
    isRead: false,
    clickUrl: null,
    platform: "instagram",
    count: 1,
    metadata: null,
    createdAt: new Date("2026-08-05T10:00:00.000Z"),
    updatedAt: new Date("2026-08-05T10:00:00.000Z"),
  };
}

function conversation(id: string, brandId: string) {
  return {
    id,
    brandId,
    status: "open",
    assignedToUserId: null as string | null,
    assignedAt: null as Date | null,
    aiActive: true,
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
