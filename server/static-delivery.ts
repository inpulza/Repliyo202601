import fs from "node:fs";
import path from "node:path";

import compression from "compression";
import express, { type Express } from "express";

const HASHED_ASSET_FILENAME = /-[A-Za-z0-9_-]{8}\.[^.]+$/;
const REVALIDATE_CACHE_CONTROL = "no-cache";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const SPANISH_LANDING_REPLACEMENTS: Array<[string, string]> = [
  ['<html lang="en">', '<html lang="es">'],
  [
    'Repliyo - Smart social media inbox',
    'Repliyo - Inbox inteligente para redes sociales',
  ],
  [
    'Unify Instagram, TikTok and Facebook DMs and comments. Automate replies with AI, manage contacts in the built-in CRM and never miss a follow-up.',
    'Unifica DMs y comentarios de Instagram, TikTok y Facebook. Automatiza respuestas con IA, gestiona contactos en el CRM integrado y no pierdas ningún seguimiento.',
  ],
  [
    '<link rel="canonical" href="https://repliyo.com/" />',
    '<link rel="canonical" href="https://repliyo.com/?lang=es" />',
  ],
  [
    '<meta property="og:url" content="https://repliyo.com/" />',
    '<meta property="og:url" content="https://repliyo.com/?lang=es" />',
  ],
  [
    '<meta property="og:locale" content="en_US" />',
    '<meta property="og:locale" content="es_ES" />',
  ],
  [
    '<meta property="og:locale:alternate" content="es_ES" />',
    '<meta property="og:locale:alternate" content="en_US" />',
  ],
  [
    'Repliyo - Respond in seconds. Sell more with AI. Instagram, TikTok, Facebook, YouTube, LinkedIn, Google Business.',
    'Repliyo - Responde en segundos. Vende más con IA. Instagram, TikTok, Facebook, YouTube, LinkedIn y Google Business.',
  ],
  [
    'Smart social media inbox that unifies Instagram, TikTok and Facebook DMs and comments with AI-powered replies, an integrated CRM and intelligent follow-ups.',
    'Inbox inteligente para redes sociales que unifica DMs y comentarios de Instagram, TikTok y Facebook con respuestas mediante IA, CRM integrado y seguimientos inteligentes.',
  ],
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
