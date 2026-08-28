# Independent verification 3 — PASS

**Candidate:** `093a377191ba0af03108d560ac57f070b4cdf3e0`  
**Live URL:** <https://identity-migration-map.sociobot.in/>  
**Verified:** 2026-08-28  
**Method:** fresh checkout at the candidate; product code was not changed.

## Decision

**PASS — the candidate meets the researched CLI contract and the live deployment is the exact production artifact.** The deployment defect recorded in verification 2 is repaired: fingerprinted JavaScript, CSS, and WebP now use immutable one-year caching. No release-blocking or non-blocking product defects were found in this run.

## Clean-checkout quality gates

`npm ci` completed with 0 reported npm vulnerabilities. The final clean gate run passed all available checks:

- `npm test`: passed: 2 Rust units, 4 CLI integrations, 1 Rust doctest, strict TypeScript check, Vite production-site build, and 4 static-site tests.
- `npm run build`: passed: release CLI at `target/release/imm`; deployable static artifact at `dist/site/`.
- `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`: passed.
- `cargo package --allow-dirty`: passed Cargo's package verification; packaged 35 files, 238.6 KiB compressed.
- `npm pack --dry-run`: completed; it is not the product package, but its private site package is structurally packable. The publishable CLI artifact is the Cargo package.

Production first-load assets are within contract: JavaScript 6,440 bytes (2.93 kB gzip), CSS 11,514 bytes (3.41 kB gzip), hero WebP 192,734 bytes, and no font files. This is below the 200 kB JS, 50 kB CSS, 300 kB hero, and 120 kB font budgets.

## CLI and packaged-consumer exercise

I installed the **packaged** crate into a fresh consumer root, rather than using the workspace binary:

```sh
cargo install --path target/package/identity-migration-map-0.1.0 --root /tmp/imm-consumer-bnIkdC/install --force
```

The installed `imm 0.1.0` provided useful `--help`, then scanned the committed fixture successfully. Its JSON summary was 1 mapping, 3 sources, 3 files scanned, **7 occurrences**, 0 unowned occurrences, and 1 external source; it emitted `manifest.json`, `report.md`, `hits.csv`, and `rollback-ledger.csv`.

Boundary and recovery paths from that installed public binary behaved correctly:

- An existing `imm init` target exited 2 and explained `pass --force to replace it`.
- A missing plan exited 2 with an I/O error.
- The generated starter plan with its undeclared/missing `./config` input exited 2 with an actionable source error.
- The passing integration suite independently covers reports-before-exit-3 for unowned evidence, invalid duplicate mappings, default secret masking while retaining the declared identifier, the full seven-hit fixture, and all required report forms.

The normal fixture and source inspection confirm the product boundary required by the brief: inputs are read-only; literal matches are explicitly evidence rather than authorization; generated owner checklist and rollback ledger are complete for declared mapping/source pairs; and SaaS exports are marked for human confirmation. The Rust CLI has no telemetry or network-capable runtime dependency.

## Live identity, response policy, privacy, and cache evidence

HTTPS presented a valid certificate for `identity-migration-map.sociobot.in` (valid 2026-08-27 through 2027-02-27). Fresh local `dist/site/` and live responses have identical SHA-256 values for all checked deploy-critical files:

| File | SHA-256 |
| --- | --- |
| `index.html` | `c0f83ce8686984978f1086501236801bd2379ff41bb0ad1988c740375d7d2cba` |
| `assets/home-CD--hA8a.js` | `819fc7f9eb9b340fa9c5c09fbaeadc0e6aaebed7044066c9f45062912fddb705` |
| `assets/styles-CAGcHQsC.css` | `fb5b515103ac3c937ff19b24024446bee55241381b2828f95172580bd106a315` |
| `assets/migration-herbarium.webp` | `0329627d574be411caa9e82bc2da517d592c26a0409d1546796d7446fcd0d135` |
| `service-worker.js` | `c0081643a9cd851e507b011ca4dc43c36ac0af62dfb0de0a1862368e8b5ae453` |

Live JS, CSS, and WebP each return `Cache-Control: public, max-age=31536000, immutable`. HTML, `/privacy/`, `/terms/`, and `service-worker.js` return `public, max-age=0, must-revalidate`, preserving update discovery. The live response policy includes HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive Permissions Policy, and a CSP allowing only same-origin assets plus the documented Sociobot license verification endpoint.

A clean live browser load requested exactly the same-origin document, JS, CSS, and hero image: no analytics, tracking, CDN font, or third-party script request. Pasted demo evidence caused no network request. An intercepted return-license test confirmed that a license is saved locally, removed from the URL, verified only at `https://api.sociobot.in/api/v1/products/identity-migration-map/verify`, and an invalid verdict keeps the optional Field Kit locked while leaving free tools available.

## Live browser, accessibility, and PWA exercise

Playwright Chromium 1.62.1 was installed for its required browser revision and exercised the byte-identical live candidate at desktop 1440x1000 and mobile 390x844.

- Both viewports had the correct title, `lang=en`, exactly one `h1`, one `main`, image alt text, and no horizontal overflow.
- Keyboard Tab reached the skip link first with the designed `rgb(155, 97, 11) solid 3px` focus outline and 3px offset. Keyboard Space activated the focused “Map this excerpt” button and returned one hit; no keyboard trap was observed.
- A representative excerpt found two literal hits and, when marked external, displayed two human-confirmation notices. Missing input had an actionable error; equal identifiers had an actionable error and focused `new-id`; a no-match excerpt rendered the cautionary empty state; a subsequent valid excerpt recovered to one hit.
- Axe WCAG 2 A/AA had **0 violations** at desktop and mobile (therefore 0 serious/critical). There were 0 browser console errors and 0 page errors in every desktop, mobile, and reduced-motion run.
- `prefers-reduced-motion: reduce` set the tested transition duration to `0.00001s`; no looping animation is present.
- The service worker controlled after reload, `registration.update()` left no waiting worker, and a 390px offline reload served the cached shell with `main` and the expected title. Chromium reports `navigator.onLine` as true for that cached SW reload, so no claim is made about the banner's visual state.

I also attempted Lighthouse 12.8.2 against the live URL with the installed Chromium. Lighthouse itself crashed the tab before producing a report, so no Lighthouse score is claimed. This test-environment failure does not affect the independently verified bundle budgets, load behavior, accessibility audit, or live cache/security policy above.

## Defects

None found. The previous medium cache-policy defect is verified fixed by fresh live headers and artifact hashes.

