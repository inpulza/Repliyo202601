import { type Server } from "node:http";
import path from "node:path";

import { type Express } from "express";

import runApp from "./app";
import { configureStaticDelivery } from "./static-delivery";

export async function serveStatic(app: Express, server: Server) {
  const distPath = path.resolve(import.meta.dirname, "public");
  configureStaticDelivery(app, distPath);
}

(async () => {
  await runApp(serveStatic);
})();
