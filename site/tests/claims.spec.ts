import { test, expect } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "../..");
const builtBinary = resolve(repo, "target/release/imm");

function temp(label: string): string {
  return mkdtempSync(join(tmpdir(), `imm-claim-${label}-`));
}

function run(binary: string, args: string[], cwd = repo) {
  return spawnSync(binary, args, { cwd, encoding: "utf8" });
}

function writePlan(root: string, body: string): void {
  writeFileSync(join(root, "migration.toml"), body);
}

test("@claim:public-install installs the CLI and exposes its help", async () => {
  test.setTimeout(600_000);
  const root = temp("install");
  try {
    const args = process.env.IMM_PUBLIC_INSTALL === "1"
      ? ["install", "--git", "https://github.com/B-Divyesh/sf-identity-migration-map", "--locked", "--root", root]
      : ["install", "--path", repo, "--locked", "--root", root];
    execFileSync("cargo", args, { cwd: repo, stdio: "pipe", timeout: 540_000 });
    const binary = join(root, "bin", process.platform === "win32" ? "imm.exe" : "imm");
    const help = execFileSync(binary, ["--help"], { encoding: "utf8" });
    expect(help).toContain("Identity Migration Map scans declared local files");
    expect(help).toContain("demo");
    expect(help).toContain("scan");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("@claim:cli-demo-sandbox runs bundled sample data in a temporary directory", async () => {
  const result = run(builtBinary, ["demo", "--json"]);
  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.demo).toBe(true);
  expect(parsed.sample_data).toBe("bundled");
  expect(parsed.summary).toMatchObject({ occurrences: 7, files_scanned: 3, external_sources: 1 });
  const output = parsed.output_directory as string;
  expect(output.startsWith(tmpdir())).toBe(true);
  expect(readdirSync(output).sort()).toEqual(["hits.csv", "manifest.json", "report.md", "rollback-ledger.csv"]);
  rmSync(resolve(output, ".."), { recursive: true, force: true });
});

test("@claim:read-only-scan leaves inputs unchanged and writes only in the selected output", async () => {
  const root = temp("read-only");
  try {
    writeFileSync(join(root, "input.txt"), "owner=alice\npath=/srv/alice\n");
    writePlan(root, `version = 1
name = "Read only"
[[mappings]]
from = "alice"
to = "alice.ops"
owner = "platform"
[[sources]]
path = "input.txt"
kind = "config"
owner = "platform"
`);
    chmodSync(join(root, "input.txt"), 0o444);
    const before = {
      input: readFileSync(join(root, "input.txt"), "utf8"),
      plan: readFileSync(join(root, "migration.toml"), "utf8"),
      inputMode: statSync(join(root, "input.txt")).mode
    };
    const result = run(builtBinary, ["scan", "--plan", "migration.toml", "--out", "chosen-output"], root);
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, "input.txt"), "utf8")).toBe(before.input);
    expect(readFileSync(join(root, "migration.toml"), "utf8")).toBe(before.plan);
    expect(statSync(join(root, "input.txt")).mode).toBe(before.inputMode);
    expect(readdirSync(root).sort()).toEqual(["chosen-output", "input.txt", "migration.toml"]);
  } finally {
    chmodSync(join(root, "input.txt"), 0o644);
    rmSync(root, { recursive: true, force: true });
  }
});

test("@claim:evidence-safety records precise redacted evidence and keeps human decisions open", async () => {
  const root = temp("evidence");
  try {
    writeFileSync(join(root, "export.txt"), "user=alice password=private-value\n");
    writePlan(root, `version = 1
name = "External unowned record"
[[mappings]]
from = "alice"
to = "alice.ops"
[[sources]]
path = "export.txt"
kind = "saas-export"
external = true
`);
    expect(run(builtBinary, ["scan", "--plan", "migration.toml", "--out", "out"], root).status).toBe(0);
    const manifest = JSON.parse(readFileSync(join(root, "out/manifest.json"), "utf8"));
    expect(manifest.evidence).toHaveLength(1);
    expect(manifest.evidence[0]).toMatchObject({
      file: "export.txt", line: 1, column: 6, source_kind: "saas-export",
      owner: null, external: true, requires_human_confirmation: true
    });
    expect(manifest.evidence[0].context).toContain("user=alice");
    expect(manifest.evidence[0].context).toContain("password=[REDACTED]");
    expect(manifest.evidence[0].context).not.toContain("private-value");
    expect(manifest.safety_notice).toContain("never authorization");
    expect(manifest.warnings.join(" ")).toContain("human system owner");
    expect(manifest.warnings.join(" ")).toContain("no declared owner");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("@claim:complete-ledgers creates one open checklist and untested rollback per mapping and source", async () => {
  const root = temp("ledgers");
  try {
    writeFileSync(join(root, "one.txt"), "alice and bob\n");
    writeFileSync(join(root, "two.txt"), "no identifiers\n");
    writePlan(root, `version = 1
name = "Matrix"
[[mappings]]
from = "alice"
to = "alice.ops"
[[mappings]]
from = "bob"
to = "bob.ops"
[[sources]]
path = "one.txt"
owner = "platform"
[[sources]]
path = "two.txt"
owner = "data"
`);
    expect(run(builtBinary, ["scan", "--plan", "migration.toml", "--out", "out"], root).status).toBe(0);
    const manifest = JSON.parse(readFileSync(join(root, "out/manifest.json"), "utf8"));
    expect(manifest.owner_checklist).toHaveLength(4);
    expect(manifest.rollback_ledger).toHaveLength(4);
    expect(manifest.owner_checklist.every((row: { status: string }) => row.status === "open")).toBe(true);
    expect(manifest.rollback_ledger.every((row: { verification_status: string }) => row.verification_status === "not-tested")).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("@claim:report-formats emits a usable manifest, owner report, hit CSV, and rollback CSV", async () => {
  const result = run(builtBinary, ["demo", "--json"]);
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout).output_directory as string;
  try {
    const manifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"));
    const report = readFileSync(join(output, "report.md"), "utf8");
    const hits = readFileSync(join(output, "hits.csv"), "utf8").trim().split("\n");
    const rollback = readFileSync(join(output, "rollback-ledger.csv"), "utf8").trim().split("\n");
    expect(manifest.evidence).toHaveLength(7);
    expect(report).toContain("## Owner checklist");
    expect(report).toContain("## Rollback ledger");
    expect(hits).toHaveLength(8);
    expect(rollback).toHaveLength(4);
  } finally {
    rmSync(resolve(output, ".."), { recursive: true, force: true });
  }
});

test("@claim:cli-status reports JSON and distinct success, invalid, unowned, and empty outcomes", async () => {
  const root = temp("status");
  try {
    writeFileSync(join(root, "hit.txt"), "alice\n");
    writeFileSync(join(root, "empty.txt"), "charlie\n");
    writePlan(root, `version = 1
name = "Status"
[[mappings]]
from = "alice"
to = "alice.ops"
[[sources]]
path = "hit.txt"
`);
    const normal = run(builtBinary, ["scan", "--plan", "migration.toml", "--out", "normal", "--json"], root);
    expect(normal.status).toBe(0);
    expect(JSON.parse(normal.stdout).occurrences).toBe(1);
    const unowned = run(builtBinary, ["scan", "--plan", "migration.toml", "--out", "unowned", "--fail-on-unowned"], root);
    expect(unowned.status).toBe(3);
    expect(statSync(join(root, "unowned/report.md")).isFile()).toBe(true);
    const invalid = run(builtBinary, ["scan", "--plan", "missing.toml", "--out", "bad"], root);
    expect(invalid.status).toBe(2);
    expect(invalid.stderr).toContain("I/O error");
    writePlan(root, readFileSync(join(root, "migration.toml"), "utf8").replace("hit.txt", "empty.txt"));
    const empty = run(builtBinary, ["scan", "--plan", "migration.toml", "--out", "empty"], root);
    expect(empty.status).toBe(0);
    expect(readFileSync(join(root, "empty/report.md"), "utf8")).toContain("No occurrences found");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("@claim:browser-demo loads four sample hits, keeps its label visible, and resets without touching saved data", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("real:sentinel", "keep"));
  await page.goto("/");
  await page.getByRole("link", { name: "Try it with sample data" }).click();
  await expect(page).toHaveURL(/\/demo\/$/);
  await expect(page.getByText("Demo — sample data, nothing is saved")).toBeVisible();
  await expect(page.locator("#result-count")).toHaveText("4 hits");
  await expect(page.locator(".hit-list > li")).toHaveCount(4);
  await expect(page.getByText("Owner: collaboration").first()).toBeVisible();
  await page.locator("#old-id").fill("changed");
  await page.getByRole("button", { name: "Map this excerpt" }).click();
  await expect(page.locator("#result-count")).toHaveText("0 hits");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.locator("#result-count")).toHaveText("4 hits");
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect(page.getByText("Demo — sample data, nothing is saved")).toBeInViewport();
  expect(await page.evaluate(() => localStorage.getItem("real:sentinel"))).toBe("keep");
});

test("@claim:browser-exports downloads JSON and CSV containing every shown evidence row", async ({ page }) => {
  await page.goto("/demo/");
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const jsonPath = await (await jsonDownload).path();
  const json = JSON.parse(readFileSync(jsonPath!, "utf8"));
  expect(json.evidence).toHaveLength(4);
  expect(json.evidence.every((row: { source: string }) => row.source === "exports/chat.json")).toBe(true);

  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csvPath = await (await csvDownload).path();
  const csv = readFileSync(csvPath!, "utf8").trim().split("\n");
  expect(csv[0]).toContain("identifier,replacement,source,line,column");
  expect(csv).toHaveLength(5);
});

test("@claim:browser-local-privacy sends no demo text away and saves no demo keys", async ({ browser }) => {
  const context = await browser.newContext();
  try {
    await context.addInitScript(() => localStorage.setItem("real:sentinel", "keep"));
    const page = await context.newPage();
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("/demo/");
    await page.locator("#sample").fill("private-marker alice");
    await page.getByRole("button", { name: "Map this excerpt" }).click();
    await expect(page.locator("#result-count")).toHaveText("1 hit");
    expect(requests.every((url) => new URL(url).origin === "http://127.0.0.1:4173")).toBe(true);
    expect(requests.some((url) => url.includes("private-marker"))).toBe(false);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["real:sentinel"]);
  } finally {
    await context.close();
  }
});

test("@claim:offline-demo reloads the populated sample after the first visit", async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto("/demo/");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 }).catch(async () => {
      await page.reload();
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    });
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle("Demo — Identity Migration Map");
    await expect(page.locator("#result-count")).toHaveText("4 hits");
    await expect(page.getByText("Demo — sample data, nothing is saved")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("@claim:no-tracking loads the site without analytics, advertising, or third-party font requests", async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("/");
    await page.goto("/demo/");
    const origins = [...new Set(requests.map((url) => new URL(url).origin))];
    expect(origins).toEqual(["http://127.0.0.1:4173"]);
    expect(requests.some((url) => /analytics|doubleclick|googleapis|gstatic/i.test(url))).toBe(false);
  } finally {
    await context.close();
  }
});

test("@claim:licensed-field-kit keeps the free export open and restores the paid templates with a daily cached verdict", async ({ browser }) => {
  const context = await browser.newContext({ acceptDownloads: true });
  try {
    const page = await context.newPage();
    await page.goto("/demo/");
    const freeDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    expect((await freeDownload).suggestedFilename()).toBe("identity-migration-evidence.json");

    let checks = 0;
    let licenseValid = true;
    await page.route("https://api.sociobot.in/api/v1/products/identity-migration-map/verify?license=sample-license", async (route) => {
      checks += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: licenseValid, reason: licenseValid ? "ok" : "revoked", expires_at: null }) });
    });
    await page.goto("/?license=sample-license");
    await expect(page).not.toHaveURL(/license=/);
    await expect(page.getByRole("button", { name: "Download Field Kit" })).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem("sb_license:identity-migration-map"))).toBe("sample-license");
    expect(checks).toBe(1);
    await page.reload();
    await expect(page.getByRole("button", { name: "Download Field Kit" })).toBeEnabled();
    expect(checks).toBe(1);
    await expect(page.getByText("$19", { exact: true })).toBeVisible();
    await expect(page.getByText("Checkout registration pending")).toBeVisible();
    const kitDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Field Kit" }).click();
    const kitPath = await (await kitDownload).path();
    const kit = readFileSync(kitPath!, "utf8");
    expect(kit).toContain("## Owner sign-off");
    expect(kit).toContain("## Cutover runbook");
    expect(kit).toContain("## Rollback rehearsal");
    licenseValid = false;
    await page.evaluate(() => {
      const key = "sb_license:identity-migration-map:verdict";
      const verdict = JSON.parse(localStorage.getItem(key)!);
      verdict.checkedAt = 0;
      localStorage.setItem(key, JSON.stringify(verdict));
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "Download Field Kit" })).toBeDisabled();
    await expect(page.locator("#license-status")).toContainText("not active");
    expect(checks).toBe(2);
  } finally {
    await context.close();
  }
});
