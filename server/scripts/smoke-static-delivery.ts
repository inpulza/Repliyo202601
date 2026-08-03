import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";

import express from "express";
import { GET_STARTED_METADATA, LANDING_METADATA } from "@shared/landingMetadata";

import {
  API_CACHE_CONTROL,
  handleUnknownApi,
  preventApiCaching,
} from "../cache-policy";
import { configureStaticDelivery, isHashedAsset } from "../static-delivery";

const distPath = path.resolve(process.cwd(), "dist/public");
const assetsPath = path.join(distPath, "assets");
const unhashedProbePath = path.join(assetsPath, "static-delivery-probe.txt");

type ProbeResponse = {
  statusCode: number | undefined;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
};

function decodeBody(response: ProbeResponse) {
  switch (response.headers["content-encoding"]) {
    case "gzip":
      return zlib.gunzipSync(response.body);
    case "br":
      return zlib.brotliDecompressSync(response.body);
    case undefined:
      return response.body;
    default:
      throw new Error(
        `Unsupported content encoding: ${response.headers["content-encoding"]}`,
      );
  }
}

function request(
  port: number,
  requestPath: string,
  headers: http.OutgoingHttpHeaders = {},
): Promise<ProbeResponse> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        host: "127.0.0.1",
        port,
        path: requestPath,
        headers: { "Accept-Encoding": "gzip", ...headers },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    req.setTimeout(10_000, () => {
      req.destroy(new Error(`Timed out requesting ${requestPath}`));
    });
    req.on("error", reject);
  });
}

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address !== "string");
      resolve(address.port);
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

if (!fs.existsSync(assetsPath)) {
  throw new Error("Build output not found. Run `npm run build` before this smoke check.");
}

function largestHashedAsset(extension: string) {
  return fs
    .readdirSync(assetsPath)
    .filter((fileName) => fileName.endsWith(extension))
    .map((fileName) => ({
      fileName,
      size: fs.statSync(path.join(assetsPath, fileName)).size,
    }))
    .filter(({ fileName }) =>
      isHashedAsset(path.join(assetsPath, fileName), distPath),
    )
    .sort((a, b) => b.size - a.size)[0];
}

async function main() {
  const hashedJavaScript = largestHashedAsset(".js");
  const hashedCss = largestHashedAsset(".css");

  assert(hashedJavaScript, "Expected at least one hashed JavaScript asset");
  assert(hashedCss, "Expected at least one hashed CSS asset");
  assert(
    !fs.existsSync(unhashedProbePath),
    `Refusing to overwrite existing smoke fixture: ${unhashedProbePath}`,
  );

  let server: http.Server | undefined;

  try {
    fs.writeFileSync(unhashedProbePath, "static delivery probe\n".repeat(128));

    const app = express();
    app.use("/api", preventApiCaching);
    app.get("/api/static-delivery-probe", (_req, res) => {
      res.type("text/plain").send("API response probe\n".repeat(128));
    });
    app.use("/api", handleUnknownApi);
    configureStaticDelivery(app, distPath);

    server = http.createServer(app);
    const port = await listen(server);
    const [
      javascript,
      css,
      unhashedAsset,
      missingAsset,
      root,
      spanishRoot,
      index,
      getStarted,
      spanishGetStarted,
      spaRoute,
      api,
      missingApi,
    ] =
      await Promise.all([
        request(port, `/assets/${hashedJavaScript.fileName}`),
        request(port, `/assets/${hashedCss.fileName}`),
        request(port, "/assets/static-delivery-probe.txt"),
        request(port, "/assets/missing-static.js"),
        request(port, "/"),
        request(port, "/?lang=es"),
        request(port, "/index.html"),
        request(port, "/get-started"),
        request(port, "/get-started?lang=es"),
        request(port, "/nonexistent-spa-route"),
        request(port, "/api/static-delivery-probe"),
        request(port, "/api/nonexistent-route"),
      ]);

    for (const asset of [javascript, css]) {
      assert.equal(asset.statusCode, 200);
      assert.equal(
        asset.headers["cache-control"],
        "public, max-age=31536000, immutable",
      );
      assert.equal(asset.headers["content-encoding"], "gzip");
      assert.match(asset.headers.vary ?? "", /Accept-Encoding/i);
    }
    assert.deepEqual(
      decodeBody(javascript),
      fs.readFileSync(path.join(assetsPath, hashedJavaScript.fileName)),
    );
    assert.deepEqual(
      decodeBody(css),
      fs.readFileSync(path.join(assetsPath, hashedCss.fileName)),
    );

    const revalidatedAsset = await request(
      port,
      `/assets/${hashedJavaScript.fileName}`,
      { "If-None-Match": javascript.headers.etag },
    );
    assert.equal(revalidatedAsset.statusCode, 304);
    assert.equal(
      revalidatedAsset.headers["cache-control"],
      "public, max-age=31536000, immutable",
    );
    assert.match(revalidatedAsset.headers.vary ?? "", /Accept-Encoding/i);

    const brotliAsset = await request(
      port,
      `/assets/${hashedJavaScript.fileName}`,
      { "Accept-Encoding": "br" },
    );
    assert.equal(brotliAsset.statusCode, 200);
    assert.equal(brotliAsset.headers["content-encoding"], "br");
    assert.match(brotliAsset.headers.vary ?? "", /Accept-Encoding/i);
    assert.deepEqual(
      decodeBody(brotliAsset),
      fs.readFileSync(path.join(assetsPath, hashedJavaScript.fileName)),
    );

    assert.equal(unhashedAsset.statusCode, 200);
    assert.equal(unhashedAsset.headers["cache-control"], "no-cache");
    assert.equal(unhashedAsset.headers["content-encoding"], "gzip");
    assert.equal(
      decodeBody(unhashedAsset).toString("utf8"),
      "static delivery probe\n".repeat(128),
    );

    assert.equal(missingAsset.statusCode, 404);
    assert.equal(missingAsset.headers["cache-control"], "no-cache");
    assert.equal(missingAsset.headers["content-encoding"], undefined);
    assert.match(missingAsset.headers["content-type"] ?? "", /^text\/plain/);
    assert.equal(decodeBody(missingAsset).toString("utf8"), "Not Found");

    for (const htmlResponse of [
      root,
      spanishRoot,
      index,
      getStarted,
      spanishGetStarted,
      spaRoute,
    ]) {
      assert.equal(htmlResponse.statusCode, 200);
      assert.equal(htmlResponse.headers["cache-control"], "no-cache");
      assert.match(htmlResponse.headers.vary ?? "", /Accept-Encoding/i);
      assert.doesNotMatch(
        htmlResponse.headers["cache-control"] ?? "",
        /immutable/,
      );
    }

    const englishHtml = decodeBody(root).toString("utf8");
    assert.match(englishHtml, /<html lang="en">/);
    assert.ok(englishHtml.includes(LANDING_METADATA.en.title));
    assert.ok(englishHtml.includes(LANDING_METADATA.en.description));
    assert.match(
      englishHtml,
      /<link rel="canonical" href="https:\/\/repliyo\.com\/" \/>/,
    );
    assert.equal(root.headers["content-language"], "en");

    const spanishHtml = decodeBody(spanishRoot).toString("utf8");
    assert.match(spanishHtml, /<html lang="es">/);
    assert.ok(spanishHtml.includes(LANDING_METADATA.es.title));
    assert.ok(spanishHtml.includes(LANDING_METADATA.es.description));
    assert.match(
      spanishHtml,
      /<link rel="canonical" href="https:\/\/repliyo\.com\/\?lang=es" \/>/,
    );
    assert.match(
      spanishHtml,
      /<meta property="og:locale" content="es_ES" \/>/,
    );
    assert.equal(spanishRoot.headers["content-language"], "es");

    const englishGetStartedHtml = decodeBody(getStarted).toString("utf8");
    assert.match(englishGetStartedHtml, /<html lang="en">/);
    assert.ok(englishGetStartedHtml.includes(GET_STARTED_METADATA.en.title));
    assert.ok(englishGetStartedHtml.includes(GET_STARTED_METADATA.en.description));
    assert.match(
      englishGetStartedHtml,
      /<link rel="canonical" href="https:\/\/repliyo\.com\/get-started" \/>/,
    );
    assert.match(
      englishGetStartedHtml,
      /<link rel="alternate" hreflang="es" href="https:\/\/repliyo\.com\/get-started\?lang=es" \/>/,
    );
    assert.equal(getStarted.headers["content-language"], "en");

    const spanishGetStartedHtml = decodeBody(spanishGetStarted).toString("utf8");
    assert.match(spanishGetStartedHtml, /<html lang="es">/);
    assert.ok(spanishGetStartedHtml.includes(GET_STARTED_METADATA.es.title));
    assert.ok(spanishGetStartedHtml.includes(GET_STARTED_METADATA.es.description));
    assert.match(
      spanishGetStartedHtml,
      /<link rel="canonical" href="https:\/\/repliyo\.com\/get-started\?lang=es" \/>/,
    );
    assert.match(
      spanishGetStartedHtml,
      /<meta property="og:locale" content="es_ES" \/>/,
    );
    assert.equal(spanishGetStarted.headers["content-language"], "es");

    const [revalidatedIndex, revalidatedSpaRoute] = await Promise.all([
      request(port, "/index.html", { "If-None-Match": index.headers.etag }),
      request(port, "/nonexistent-spa-route", {
        "If-None-Match": spaRoute.headers.etag,
      }),
    ]);
    for (const htmlResponse of [revalidatedIndex, revalidatedSpaRoute]) {
      assert.equal(htmlResponse.statusCode, 304);
      assert.equal(htmlResponse.headers["cache-control"], "no-cache");
      assert.match(htmlResponse.headers.vary ?? "", /Accept-Encoding/i);
    }

    assert.equal(api.statusCode, 200);
    assert.equal(api.headers["cache-control"], API_CACHE_CONTROL);
    assert.equal(api.headers["content-encoding"], undefined);
    assert.match(api.headers["content-type"] ?? "", /^text\/plain/);

    assert.equal(missingApi.statusCode, 404);
    assert.equal(missingApi.headers["cache-control"], API_CACHE_CONTROL);
    assert.equal(missingApi.headers["content-encoding"], undefined);
    assert.match(missingApi.headers["content-type"] ?? "", /^application\/json/);
    assert.deepEqual(
      JSON.parse(decodeBody(missingApi).toString("utf8")),
      { message: "Not Found" },
    );

    console.log(
      "Static delivery smoke passed: hashed JS/CSS are immutable and compressed, 304 responses vary safely, SPA HTML revalidates, and APIs are private/no-store.",
    );
  } finally {
    try {
      if (server?.listening) {
        await close(server);
      }
    } finally {
      if (fs.existsSync(unhashedProbePath)) {
        fs.unlinkSync(unhashedProbePath);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
