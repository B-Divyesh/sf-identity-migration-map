import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../dist/site/", import.meta.url);

test("all public routes and discovery files are emitted", async () => {
  const files = [
    "index.html", "demo/index.html", "privacy/index.html", "terms/index.html", "404.html",
    "robots.txt", "sitemap.xml", "service-worker.js", "staticwebapp.config.json",
    "assets/social-card.png", "apple-touch-icon.png"
  ];
  for (const file of files) assert.ok((await stat(new URL(file, root))).size > 50, `${file} should exist`);
});

test("route documents have distinct titles, one h1, canonical and social metadata", async () => {
  const expected = new Map([
    ["index.html", "Identity Migration Map — Find identifier dependencies"],
    ["demo/index.html", "Demo — Identity Migration Map"],
    ["privacy/index.html", "Privacy — Identity Migration Map"],
    ["terms/index.html", "Terms — Identity Migration Map"],
    ["404.html", "Page not found — Identity Migration Map"]
  ]);
  for (const [file, title] of expected) {
    const html = await readFile(new URL(file, root), "utf8");
    assert.equal(html.match(/<title>([^<]+)<\/title>/)?.[1], title);
    assert.ok(title.length <= 60, `${file} title is ${title.length} characters`);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<main[ >]/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /property="og:image"/);
    assert.match(html, /name="twitter:card"/);
  }
});

test("deployment policy serves a designed 404 and keeps assets immutable", async () => {
  const config = JSON.parse(await readFile(new URL("staticwebapp.config.json", root), "utf8"));
  assert.equal(config.responseOverrides["404"].rewrite, "/404.html");
  assert.equal(config.globalHeaders["Cache-Control"], "public, max-age=0, must-revalidate");
  assert.equal(config.globalHeaders["Content-Security-Policy"].includes("frame-ancestors 'none'"), true);
  assert.equal(config.globalHeaders["X-Frame-Options"], "DENY");
  const assets = config.routes.find((route) => route.route === "/assets/*");
  assert.equal(assets.headers["Cache-Control"], "public, max-age=31536000, immutable");
});

test("initial JavaScript, CSS, image, and font assets stay inside budgets", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const js = html.match(/src="([^"]+\.js)"/)?.[1];
  const css = html.match(/href="([^"]+\.css)"/)?.[1];
  assert.ok(js && css);
  assert.ok((await stat(new URL(js.slice(1), root))).size <= 200 * 1024);
  assert.ok((await stat(new URL(css.slice(1), root))).size <= 50 * 1024);
  assert.ok((await stat(new URL("assets/migration-herbarium.webp", root))).size <= 300 * 1024);
  assert.equal((html.match(/\.woff2/g) || []).length, 0);
});

test("the paid offer links only to the approved Sociobot checkout", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const checkouts = html.match(/https:\/\/api\.sociobot\.in\/api\/v1\/products\/identity-migration-map\/checkout/g) || [];
  assert.equal(checkouts.length, 1);
  assert.doesNotMatch(html, /dodopayments\.com|pilot-api\.sociobot\.in/);
});
