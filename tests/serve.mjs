// Tiny static file server for the site in public/ (no dependencies, works on any OS).
// The browser tests use it; `npm start` runs it on its own.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
};
// With PORT set (the browser tests set it), that exact port is needed. Without it (npm start),
// a busy 4173 moves on to the next free port, up to 4183.
const fixedPort = Boolean(process.env.PORT);
const firstPort = Number(process.env.PORT || 4173);
const lastPort = fixedPort ? firstPort : firstPort + 10;

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(root, path));
  if (!file.startsWith(normalize(root))) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res
      .writeHead(200, {
        "content-type": types[extname(file)] || "application/octet-stream",
        "cache-control": "no-store",
      })
      .end(body);
  } catch {
    // Like GitHub Pages: a missing address gets the site's 404 page.
    const notFound = await readFile(join(root, "404.html")).catch(() => "Not found");
    res.writeHead(404, { "content-type": types[".html"], "cache-control": "no-store" }).end(notFound);
  }
});

let port = firstPort;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && port < lastPort) {
    console.log(`Port ${port} is busy; trying ${port + 1}.`);
    server.listen(++port);
    return;
  }
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop whatever is using it, or set PORT to a free one (for example 4180).`,
    );
    process.exit(1);
  }
  throw err;
});
server.listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
