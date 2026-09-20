import { resultPage } from "./server/result-page.mjs";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { handleApi } from "./server/api.mjs";
import { openLocalDatabase } from "./server/local-db.mjs";
const privatePreview = process.env.TECHCRUSH_PRIVATE_PREVIEW === "1";
const ownerAccess =
  privatePreview && process.env.TECHCRUSH_OWNER_ACCESS === "1";
const port = privatePreview ? 4191 : 4173;
const previewEpoch = Date.now();
// Local preview uses ordinary access and real time unless owner testing is explicit.
const previewNow =
  ownerAccess && process.env.TECHCRUSH_PREVIEW_TIME
    ? Date.parse(process.env.TECHCRUSH_PREVIEW_TIME)
    : previewEpoch;
const DB = openLocalDatabase(
  privatePreview ? ".sites-runtime/city-wars-preview.sqlite" : undefined,
);
const root = path.resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname.startsWith("/result/")) {
        const response = await resultPage(
          new Request("http://" + req.headers.host + req.url, {
            method: req.method,
          }),
          DB,
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (pathname.startsWith("/api/")) {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 8192) {
            res.writeHead(413);
            res.end("Request too large");
            return;
          }
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);
        const response = await handleApi(
          new Request("http://localhost" + req.url, {
            method: req.method,
            headers: req.headers,
            ...(body.length ? { body } : {}),
          }),
          DB,
          {
            clientIP: req.socket.remoteAddress,
            ...(ownerAccess
              ? {
                  preview: true,
                  now: () => previewNow + Date.now() - previewEpoch,
                }
              : {}),
          },
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (/^\/(server|client|\.openai)(\/|$)/.test(pathname)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const file = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(root + path.sep)) throw Error();
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `Local ${ownerAccess ? "OWNER TEST" : "game"}: http://127.0.0.1:${port}`,
    ),
  );
