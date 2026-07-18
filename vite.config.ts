import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import {
  LANDING_METADATA,
  LANDING_STRUCTURED_DESCRIPTIONS,
} from "./shared/landingMetadata";

const LANDING_HTML_REPLACEMENTS = {
  "%LANDING_TITLE%": LANDING_METADATA.en.title,
  "%LANDING_DESCRIPTION%": LANDING_METADATA.en.description,
  "%LANDING_CANONICAL_URL%": LANDING_METADATA.en.canonicalUrl,
  "%LANDING_ES_CANONICAL_URL%": LANDING_METADATA.es.canonicalUrl,
  "%LANDING_OG_LOCALE%": LANDING_METADATA.en.openGraphLocale,
  "%LANDING_OG_LOCALE_ALTERNATE%": LANDING_METADATA.en.openGraphLocaleAlternate,
  "%LANDING_IMAGE_ALT%": LANDING_METADATA.en.imageAlt,
  "%LANDING_STRUCTURED_DESCRIPTION%": LANDING_STRUCTURED_DESCRIPTIONS.en,
} as const;

function landingMetadataHtmlPlugin(): Plugin {
  return {
    name: "landing-metadata-html",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return Object.entries(LANDING_HTML_REPLACEMENTS).reduce(
          (result, [placeholder, value]) => {
            if (!result.includes(placeholder)) {
              throw new Error(`Missing landing metadata placeholder: ${placeholder}`);
            }
            return result.replaceAll(placeholder, value);
          },
          html,
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [
    landingMetadataHtmlPlugin(),
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
