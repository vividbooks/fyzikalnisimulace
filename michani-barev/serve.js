#!/usr/bin/env node
/**
 * Minimal local static server for this project.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

const server = http.createServer((req, res) => {
  const rawPath = (req.url || "/").split("?")[0] || "/";
  const rel = rawPath === "/" ? "/index.html" : rawPath;
  const safeRel = path.posix.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(ROOT, safeRel);

  if (!full.startsWith(ROOT)) {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad request");
    return;
  }

  fs.readFile(full, (err, buf) => {
    if (err) {
      if (safeRel !== "/index.html") {
        send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
        return;
      }
      send(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, String(err.message || err));
      return;
    }
    send(
      res,
      200,
      {
        "Content-Type": contentType(full),
        "Content-Length": buf.length,
        "Cache-Control": "no-store",
      },
      buf,
    );
  });
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Spuštěno: http://${HOST}:${PORT}/`);
  // eslint-disable-next-line no-console
  console.log("Zastavení: Ctrl+C");
});

