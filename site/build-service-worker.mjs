import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const output = new URL("../dist/site/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL(".vite/manifest.json", output), "utf8"));
const builtAssets = [...new Set(Object.values(manifest).flatMap((entry) => [entry.file, ...(entry.css || [])]))]
  .map((file) => `/${file}`);
const shell = ["/", "/demo/", "/privacy/", "/terms/", "/404.html", ...builtAssets, "/assets/migration-herbarium.webp", "/assets/social-card.png", "/favicon.svg", "/apple-touch-icon.png"];
const shellContent = await Promise.all(shell.map(async (path) => {
  const file = path === "/" ? "index.html" : path.replace(/^\//, "").replace(/\/$/, "/index.html");
  return readFile(new URL(file, output));
}));
const version = createHash("sha256").update(Buffer.concat(shellContent)).digest("hex").slice(0, 10);

const serviceWorker = `const CACHE = "imm-shell-${version}";
const SHELL = ${JSON.stringify(shell)};
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const url = new URL(event.request.url);
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      if (event.request.mode === "navigate") return cache.match("/");
      return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
`;

await writeFile(new URL("service-worker.js", output), serviceWorker);
