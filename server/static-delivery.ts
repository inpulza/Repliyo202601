import fs from "node:fs";
import path from "node:path";

import compression from "compression";
import express, { type Express } from "express";
import {
  GET_STARTED_METADATA,
  LANDING_METADATA,
  LANDING_STRUCTURED_DESCRIPTIONS,
  type PublicPageMetadata,
} from "@shared/landingMetadata";

const HASHED_ASSET_FILENAME = /-[A-Za-z0-9_-]{8}\.[^.]+$/;
const REVALIDATE_CACHE_CONTROL = "no-cache";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const ENGLISH_METADATA = LANDING_METADATA.en;
const SPANISH_METADATA = LANDING_METADATA.es;

function metadataReplacements(
  metadata: PublicPageMetadata,
  englishCanonicalUrl: string,
  spanishCanonicalUrl: string,
): Array<[string, string]> {
  return [
    [`<title>${ENGLISH_METADATA.title}</title>`, `<title>${metadata.title}</title>`],
    [
      `<meta name="description" content="${ENGLISH_METADATA.description}" />`,
      `<meta name="description" content="${metadata.description}" />`,
    ],
    [
      `<link rel="canonical" href="${ENGLISH_METADATA.canonicalUrl}" />`,
      `<link rel="canonical" href="${metadata.canonicalUrl}" />`,
    ],
    [
      `<link rel="alternate" hreflang="en" href="${ENGLISH_METADATA.canonicalUrl}" />`,
      `<link rel="alternate" hreflang="en" href="${englishCanonicalUrl}" />`,
    ],
    [
      `<link rel="alternate" hreflang="es" href="${SPANISH_METADATA.canonicalUrl}" />`,
      `<link rel="alternate" hreflang="es" href="${spanishCanonicalUrl}" />`,
    ],
    [
      `<link rel="alternate" hreflang="x-default" href="${ENGLISH_METADATA.canonicalUrl}" />`,
      `<link rel="alternate" hreflang="x-default" href="${englishCanonicalUrl}" />`,
    ],
    [
      `<meta property="og:title" content="${ENGLISH_METADATA.title}" />`,
      `<meta property="og:title" content="${metadata.title}" />`,
    ],
    [
      `<meta property="og:description" content="${ENGLISH_METADATA.description}" />`,
      `<meta property="og:description" content="${metadata.description}" />`,
    ],
    [
      `<meta property="og:url" content="${ENGLISH_METADATA.canonicalUrl}" />`,
      `<meta property="og:url" content="${metadata.canonicalUrl}" />`,
    ],
    [
      `<meta property="og:locale" content="${ENGLISH_METADATA.openGraphLocale}" />`,
      `<meta property="og:locale" content="${metadata.openGraphLocale}" />`,
    ],
    [
      `<meta property="og:locale:alternate" content="${ENGLISH_METADATA.openGraphLocaleAlternate}" />`,
      `<meta property="og:locale:alternate" content="${metadata.openGraphLocaleAlternate}" />`,
    ],
    [
      `<meta property="og:image:alt" content="${ENGLISH_METADATA.imageAlt}" />`,
      `<meta property="og:image:alt" content="${metadata.imageAlt}" />`,
    ],
    [
      `<meta name="twitter:title" content="${ENGLISH_METADATA.title}" />`,
      `<meta name="twitter:title" content="${metadata.title}" />`,
    ],
    [
      `<meta name="twitter:description" content="${ENGLISH_METADATA.description}" />`,
      `<meta name="twitter:description" content="${metadata.description}" />`,
    ],
  ];
}

function applyReplacements(defaultHtml: string, replacements: Array<[string, string]>) {
  return replacements.reduce((html, [currentValue, nextValue]) => {
    if (!html.includes(currentValue)) {
      throw new Error(`Could not localize public page metadata: missing ${currentValue}`);
    }
    return html.replace(currentValue, nextValue);
  }, defaultHtml);
}

export function createSpanishLandingHtml(defaultHtml: string) {
  return applyReplacements(defaultHtml, [
    ['<html lang="en">', '<html lang="es">'],
    ...metadataReplacements(
      SPANISH_METADATA,
      ENGLISH_METADATA.canonicalUrl,
      SPANISH_METADATA.canonicalUrl,
    ),
    [LANDING_STRUCTURED_DESCRIPTIONS.en, LANDING_STRUCTURED_DESCRIPTIONS.es],
  ]);
}

export function createGetStartedHtml(defaultHtml: string, language: "en" | "es") {
  const metadata = GET_STARTED_METADATA[language];
  return applyReplacements(defaultHtml, [
    ...(language === "es" ? ([['<html lang="en">', '<html lang="es">']] as Array<[string, string]>) : []),
    ...metadataReplacements(
      metadata,
      GET_STARTED_METADATA.en.canonicalUrl,
      GET_STARTED_METADATA.es.canonicalUrl,
    ),
  ]);
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
  const defaultHtml = fs.readFileSync(indexPath, "utf8");
  const spanishLandingHtml = createSpanishLandingHtml(defaultHtml);
  const englishGetStartedHtml = createGetStartedHtml(defaultHtml, "en");
  const spanishGetStartedHtml = createGetStartedHtml(defaultHtml, "es");

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

  app.get(["/get-started", "/get-started/"], (req, res) => {
    const language = req.query.lang === "es" ? "es" : "en";
    res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
    res.setHeader("Vary", "Accept-Encoding");
    res.setHeader("Content-Language", language);
    res
      .type("html")
      .send(language === "es" ? spanishGetStartedHtml : englishGetStartedHtml);
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
