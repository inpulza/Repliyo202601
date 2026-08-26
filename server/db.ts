import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { isTransientSocketError } from "./dbTransientErrors";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Transient network drops on Neon's WebSocket transport (ECONNRESET /
// "socket hang up") otherwise surface as unhandled errors and kill the
// whole process. Log and keep serving; the pool creates fresh
// connections on the next query.
pool.on("error", (err) => {
  console.error("[db] Neon pool error (recovered):", err.message);
});

process.on("uncaughtException", (err) => {
  if (isTransientSocketError(err)) {
    console.error("[db] Transient socket error (recovered):", (err as Error).message ?? err);
    return;
  }
  throw err;
});

process.on("unhandledRejection", (reason) => {
  if (isTransientSocketError(reason)) {
    console.error(
      "[db] Transient socket rejection (recovered):",
      (reason as Error)?.message ?? reason,
    );
    return;
  }
  throw reason;
});

export const db = drizzle({ client: pool, schema });
