import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../dist/site/", import.meta.url);

test("landing page has required semantics and paid-unlock contract", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /<html lang="en">/);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(html, /<main id="main">/);
  assert.match(html, /alt="A field-guide illustration/);
  assert.match(html, /api\.sociobot\.in\/api\/v1\/products\/identity-migration-map\/checkout/);
  assert.doesNotMatch(html, /fonts\.googleapis|googletagmanager|analytics/);
});

test("legal routes and offline shell are emitted", async () => {
  for (const file of ["privacy/index.html", "terms/index.html", "service-worker.js", "staticwebapp.config.json"]) {
    assert.ok((await stat(new URL(file, root))).size > 100, `${file} should exist`);
  }
});

test("deployment response policy keeps versioned assets immutable and the shell fresh", async () => {
  const config = JSON.parse(await readFile(new URL("staticwebapp.config.json", root), "utf8"));
  assert.equal(config.globalHeaders["Cache-Control"], "public, max-age=0, must-revalidate");
  assert.equal(config.globalHeaders["Content-Security-Policy"].includes("frame-ancestors 'none'"), true);
  assert.equal(config.globalHeaders["X-Frame-Options"], "DENY");
  assert.equal(config.globalHeaders["X-Content-Type-Options"], "nosniff");
  assert.equal(config.globalHeaders["Referrer-Policy"], "strict-origin-when-cross-origin");

  const assets = config.routes.find((route) => route.route === "/assets/*");
  assert.ok(assets, "hashed Vite assets need an explicit cache rule");
  assert.equal(assets.headers["Cache-Control"], "public, max-age=31536000, immutable");
});

test("initial JS and CSS stay inside the budgets", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const js = html.match(/src="([^"]+\.js)"/)?.[1];
  const css = html.match(/href="([^"]+\.css)"/)?.[1];
  assert.ok(js && css, "built asset references should exist");
  const jsSize = (await stat(new URL(js.slice(1), root))).size;
  const cssSize = (await stat(new URL(css.slice(1), root))).size;
  assert.ok(jsSize <= 200 * 1024, `JS is ${jsSize} bytes`);
  assert.ok(cssSize <= 50 * 1024, `CSS is ${cssSize} bytes`);
  const code = await readFile(new URL(js.slice(1), root), "utf8");
  assert.match(code, /sb_license:/);
  assert.match(code, /verify\?license=/);
});
