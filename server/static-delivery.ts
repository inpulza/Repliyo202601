import fs from "node:fs";
import path from "node:path";

import compression from "compression";
import express, { type Express } from "express";

const HASHED_ASSET_FILENAME = /-[A-Za-z0-9_-]{8}\.[^.]+$/;
const REVALIDATE_CACHE_CONTROL = "no-cache";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export function isHashedAsset(filePath: string, distPath: string) {
  const relativePath = path
    .relative(distPath, filePath)
    .split(path.sep)
    .join("/");

  return (
    relativePath.startsWith("assets/") &&
    HASHED_ASSET_FILENAME.test(path.basename(filePath))
  );
}

export function configureStaticDelivery(app: Express, distPath: string) {
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // API routes are registered before this setup runs, so compression is scoped
  // to the static site and its SPA fallback rather than changing API responses.
  app.use(compression());

  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        // Keep cache variants correct even on 304 responses, which the
        // compression middleware intentionally does not transform.
        res.setHeader("Vary", "Accept-Encoding");
        res.setHeader(
          "Cache-Control",
          isHashedAsset(filePath, distPath)
            ? IMMUTABLE_CACHE_CONTROL
            : REVALIDATE_CACHE_CONTROL,
        );
      },
    }),
  );

  // Fall through to a revalidated index.html for client-side routes.
  app.use("*", (_req, res) => {
    // Preserve stricter policies set by earlier middleware (notably /api).
    if (!res.hasHeader("Cache-Control")) {
      res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
    }
    res.setHeader("Vary", "Accept-Encoding");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
