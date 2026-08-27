# Independent verification — FAIL

**Candidate:** `6e3c8c0d8fb6db73a566cf47d988795e05261ac6` (`main` at test start)  
**Product URL:** `https://identity-migration-map.sociobot.in/`  
**Verified:** 2026-08-27  
**Scope:** fresh clean-checkout verification against the researched brief and factory acceptance contract. Product code was not modified.

## Decision

**FAIL — release blocked by the live deployment.** The candidate builds and works locally, but the configured product URL neither has a certificate valid for the hostname nor serves the candidate artifact. A normal browser refuses the TLS connection; bypassing TLS only returns an Azure `404 Site Not Found` page. The live deployment therefore cannot match, or be used to verify, the candidate.

## Release-blocking defect

| Severity | Defect | Fresh evidence | Required resolution |
| --- | --- | --- | --- |
| Critical | `identity-migration-map.sociobot.in` is not routed to a deployed product and has no valid certificate for that hostname. | Verified `curl -I` failed with `curl: (60) SSL: no alternative certificate subject name matches target host name`. SNI inspection returned an Azure certificate for `*.msha-slice-7-eus2-1-ase.p.azurewebsites.net`, whose SAN omits the product hostname. Diagnostic-only `curl -k -I` returned `HTTP/1.1 404 Site Not Found`, `Content-Type: text/html`, `Content-Length: 2667`; its HTML SHA-256 (`1e0878…e3311a`) differs from the local `dist/site/index.html` (`c0f83c…2cba`). | Factory deployment/DNS owner must attach the hostname to the correct static site, issue a valid certificate, deploy `dist/site/`, then rerun live browser, headers, cache, and deployment-identity checks. |

No product-code defect was found in the locally built candidate. Because the URL is not reachable as the product, live response-policy/caching/browser-console checks are not passable and no live PASS is implied by local results.

## Clean-checkout gates

Passed from this checkout after `npm ci` (21 npm packages; audit reported 0 vulnerabilities):

- `npm test`: passed — 2 Rust unit tests, 4 CLI integration tests, 1 Rust doctest, and 3 built-site tests.
- `cargo fmt --check`: passed.
- `cargo clippy --all-targets -- -D warnings`: passed.
- `npm run build`: passed — release binary at `target/release/imm`; static deployment at `dist/site/`.
- `cargo package`: passed and verified the package; produced `target/package/identity-migration-map-0.1.0.crate` (237,902 bytes).

Production asset sizes: JS 6,440 bytes, CSS 11,514 bytes, hero WebP 192,734 bytes, no font files. These meet the stated 200 KB JS, 50 KB CSS, 300 KB hero, and 120 KB font budgets.

## CLI and package verification

I installed the `cargo package` contents into a fresh consumer root and exercised its public binary, not the workspace binary.

- `imm --help` exposed only `init` and `scan` with useful help.
- Sample scan completed with JSON summary: 1 mapping, 3 sources, 3 files, **7 occurrences**, 0 unowned occurrences, 1 external source.
- It emitted all required artifacts: `manifest.json`, `report.md`, `hits.csv`, and `rollback-ledger.csv`.
- Missing plan exited 2; refusing an existing `init` destination exited 2; a starter plan with missing declared source exited 2 and explained the missing path.
- The repository integration suite also verified unowned evidence writes reports then exits 3, default secret redaction preserves the declared identifier, and the seven-fixture occurrence count.

This satisfies the brief’s normal read-only inventory path, output/checklist/rollback path, secret-redaction path, invalid input recovery, and external-SaaS human-confirmation boundary. No mutation/network-capable runtime dependency is present in the CLI.

## Local production-site verification

The exact generated `dist/site/` artifact was served locally and tested with Playwright Chromium at 1440×1000 and 390×844.

- Normal demo scan found two supplied literal occurrences; checked external input showed a human-confirmation note for each hit.
- Missing input gave the actionable required-fields message. Equal old/new values gave the actionable error and moved focus to the new-identifier field. A no-match excerpt rendered the explicit cautious empty state.
- Both viewports had exactly one `h1` and no horizontal overflow. Keyboard Tab first reached the skip link with a visible 3 px focus outline.
- `prefers-reduced-motion: reduce` reduced transitions to 0.01 ms; no looping animation is present.
- Axe: **0 serious/critical findings** (0 violations total; 44 desktop and 45 mobile rules passed). There were no console errors or page errors.
- A clean page issued four requests, all same-origin local static resources; pasted migration content was not requested. Source review found no analytics, CDN scripts, or fonts. The sole runtime cross-origin request is the documented Sociobot license-verification endpoint, triggered only after a license is supplied; the checkout and repository are ordinary user-initiated links.
- Service worker registered, took control after reload, and an offline 390 px reload returned the cached shell (HTTP 200) with `<main>` visible and no console errors.

The product’s offline banner depends on `navigator.onLine`; Chromium’s Playwright offline emulation kept that value true after a service-worker cache reload, so banner visibility is not claimed as an automated result. The actual offline shell reload passed.

## Live inspection details

DNS resolved the hostname to `68.220.237.27` (`waws-prod-bn1-395a8892.sip.p.azurewebsites.windows.net`). The presented certificate is issued by Microsoft TLS G2 RSA CA OCSP 04, valid 2026-07-21 through 2027-01-17, but covers only the Azure `msha-slice` hostnames. It has no product-host SAN. The unauthenticated 404 also supplied neither the candidate assets nor observable product cache/security headers. These are deployment failures, not a waiver for the required checks.

## Retest after deployment repair

```sh
npm ci
npm test
npm run build
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo package
curl -I https://identity-migration-map.sociobot.in/
```

Then compare deployed content/hashed assets with `dist/site/`, repeat the 390 px and desktop Playwright, axe, keyboard, console, request, service-worker/offline, response-header, and cache checks against the valid HTTPS URL.
