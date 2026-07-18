import fs from "node:fs";
import path from "node:path";

import compression from "compression";
import express, { type Express } from "express";
import {
  LANDING_METADATA,
  LANDING_STRUCTURED_DESCRIPTIONS,
} from "@shared/landingMetadata";

const HASHED_ASSET_FILENAME = /-[A-Za-z0-9_-]{8}\.[^.]+$/;
const REVALIDATE_CACHE_CONTROL = "no-cache";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const ENGLISH_METADATA = LANDING_METADATA.en;
const SPANISH_METADATA = LANDING_METADATA.es;

const SPANISH_LANDING_REPLACEMENTS: Array<[string, string]> = [
  ['<html lang="en">', '<html lang="es">'],
  [ENGLISH_METADATA.title, SPANISH_METADATA.title],
  [ENGLISH_METADATA.description, SPANISH_METADATA.description],
  [
    `<link rel="canonical" href="${ENGLISH_METADATA.canonicalUrl}" />`,
    `<link rel="canonical" href="${SPANISH_METADATA.canonicalUrl}" />`,
  ],
  [
    `<meta property="og:url" content="${ENGLISH_METADATA.canonicalUrl}" />`,
    `<meta property="og:url" content="${SPANISH_METADATA.canonicalUrl}" />`,
  ],
  [
    `<meta property="og:locale" content="${ENGLISH_METADATA.openGraphLocale}" />`,
    `<meta property="og:locale" content="${SPANISH_METADATA.openGraphLocale}" />`,
  ],
  [
    `<meta property="og:locale:alternate" content="${ENGLISH_METADATA.openGraphLocaleAlternate}" />`,
    `<meta property="og:locale:alternate" content="${SPANISH_METADATA.openGraphLocaleAlternate}" />`,
  ],
  [ENGLISH_METADATA.imageAlt, SPANISH_METADATA.imageAlt],
  [LANDING_STRUCTURED_DESCRIPTIONS.en, LANDING_STRUCTURED_DESCRIPTIONS.es],
];

export function createSpanishLandingHtml(defaultHtml: string) {
  return SPANISH_LANDING_REPLACEMENTS.reduce((html, [english, spanish]) => {
    if (!html.includes(english)) {
      throw new Error(`Could not localize landing metadata: missing ${english}`);
    }
    return html.replaceAll(english, spanish);
  }, defaultHtml);
}

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

  const indexPath = path.resolve(distPath, "index.html");
  const spanishLandingHtml = createSpanishLandingHtml(
    fs.readFileSync(indexPath, "utf8"),
  );

  // Social crawlers do not execute the client app, so serve localized metadata
  // for the explicit Spanish landing URL instead of only swapping visible copy.
  app.get(["/", "/index.html"], (req, res, next) => {
    if (req.query.lang !== "es") {
      next();
      return;
    }

    res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
    res.setHeader("Vary", "Accept-Encoding");
    res.setHeader("Content-Language", "es");
    res.type("html").send(spanishLandingHtml);
  });

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
        if (path.basename(filePath) === "index.html") {
          res.setHeader("Content-Language", "en");
        }
      },
    }),
  );

  // Serve the SPA fallback for client-side routes, but fail fast for assets.
  app.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/assets/")) {
      res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
      res.setHeader("Vary", "Accept-Encoding");
      res.status(404).type("text/plain").send("Not Found");
      return;
    }

    // Preserve stricter policies set by earlier middleware (notably /api).
    if (!res.hasHeader("Cache-Control")) {
      res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
    }
    res.setHeader("Vary", "Accept-Encoding");
    res.setHeader("Content-Language", "en");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
