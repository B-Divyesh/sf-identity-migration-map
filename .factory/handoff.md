# Handoff: Identity Migration Map repair 2

## Verification 4 update (2026-09-05)

Independent verification of implementation `3d03af965a2cc7e45e4b9086430b5e79275250c1` is **FAIL**, recorded in `.factory/verification-4.md`. This is a report-only conclusion; no product code was changed.

- The live artifact matches the fresh local build. All clean gates and all 14 exact claim commands passed. The public Git install, packaged CLI consumer run, phone and desktop demo, offline reload, routes, accessibility audit, headers, and $19 checkout passed.
- The live hosted checkout returns 303 to Dodo, then 200 with Identity Migration Map Field Kit at $19.00. A live invalid token is correctly rejected and keeps paid content locked.
- A real issued valid license was not available and no payment was authorized. The valid-entitlement part of `licensed-field-kit` is only tested with an intercepted response, so it remains an untested public assertion and blocks PASS.
- README also says the factory publishes release packages despite no release/tag or crates.io package. The supported, tested installation route remains public Git.

An authorized billing operator must complete one purchase and verify the returned valid token, daily cache, download, and revocation behavior. The README release-package wording must be removed/qualified or backed by a published and tested release. See `.factory/verification-4.md` for all evidence and the exact verdict.

## Outcome

Repair 2 is implemented, pushed, deployed, and verified at <https://identity-migration-map.sociobot.in/>.

- Implementation SHA: `3d03af965a2cc7e45e4b9086430b5e79275250c1`
- Live artifact: the static build from that SHA
- Documentation state: this later handoff commit; the implementation SHA above remains the deployed product candidate
- CLI version: `imm 0.2.0`
- Live checkout: registered $19 one-time Field Kit through the approved Sociobot endpoint

## Review finding disposition

| Finding | Disposition | Evidence |
| --- | --- | --- |
| F-01 public Cargo install failed | Fixed | The site and README now use `cargo install --git https://github.com/B-Divyesh/sf-identity-migration-map --locked`. A fresh public Git install passed and exposed `demo`, `init`, and `scan`. |
| F-02 paid checkout returned 404 | Fixed | The approved endpoint now opens the Sociobot-hosted Dodo checkout. It displays “Identity Migration Map Field Kit” at `$19.00`. No payment provider is embedded. |
| F-03 CLI/demo sandbox missing | Fixed | `imm demo` scans bundled files in a new temporary directory and prints the report location. `/demo/` has four realistic hits, a persistent sample label, reset, and start-for-real action. `.factory/demo.md` documents both sandboxes. |
| F-04 claims missing | Fixed | `.factory/claims.json` declares 14 claims. Every exact command passed from the documented clean build. Tests assert outcomes in fresh temp directories or browser contexts. |
| F-05 first-screen and copy contract | Fixed | The job, audience, first action, and three facts appear before scrolling at 390×844 and 1440×1000. Metaphorical headings were removed. `.factory/copy-audit.md` has no over-22-word or banned-word flags. |
| F-06 routes and discovery incomplete | Fixed | Dedicated home, demo, privacy, terms, and designed 404 documents have route titles. Robots, sitemap, canonical, Open Graph, Twitter, social image, touch icon, shared header/footer, and security policy are present. Unknown paths return the designed document with HTTP 404. |
| F-07 mobile targets too small | Fixed | Browser checks measure visible controls at 44×44 CSS pixels or larger. The 22-pixel checkbox uses its 44-pixel label target. |

Earlier certificate/routing, immutable-cache, CSP/frame, and Lighthouse verification gaps remain fixed.

## CLI and consumer verification

The package contains 14 files and is 15.2 KiB compressed.
`cargo package` completed its verification build.

A fresh consumer root installed the packaged crate, then ran:

```sh
imm --version
imm --help
imm demo --json
```

The installed binary reported version `0.2.0`.
Its demo found seven occurrences across three bundled files and one external source.
It emitted `manifest.json`, `report.md`, `hits.csv`, and `rollback-ledger.csv` under a new system temporary directory.

The public install claim separately installed from the pushed Git repository.
Registry publication remains factory-owned and is not advertised as an available install path.

## Clean gates

These passed from the committed checkout:

```sh
npm ci
npm test
npm run build
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo package
```

`npm test` passed two Rust unit tests, five CLI integration tests, one doctest, five built-site checks, and 25 browser tests.
The browser set includes all claims, axe, keyboard, validation, recovery, touch targets, 200% text, reduced motion, offline, links, route titles, and 404 behavior.

All 14 commands in `.factory/claims.json` passed individually.
That run included the real public Git install and live hosted-checkout checks.

## Live verification

The final local and live SHA-256 values matched:

- `index.html`: `16cfa9fc44b4371a2639df7456f7360bd6f6dba176c0d6ec139c583c21443706`
- `service-worker.js`: `9bc336f095a6b23ec8b9be3b5a80726d4846077c019b0917061c1edfaf556db6`

Cold phone and desktop contexts confirmed:

- correct job, audience, first action, and all three facts before scrolling;
- four realistic demo hits, visible owner and external-confirmation labels;
- reset from zero hits back to four hits;
- persistent “Demo — sample data, nothing is saved” label;
- no changes to a sentinel real-data storage key;
- no demo cross-origin requests or console errors;
- zero axe WCAG A/AA violations on home and demo;
- offline `/demo/` reload returned 200 with four hits;
- arbitrary paths returned the designed 404 with HTTP 404;
- dedicated route titles and working internal links.

The response policy returns CSP, HSTS, frame denial, nosniff, referrer, and permissions headers.
Fingerprint assets use `public, max-age=31536000, immutable`.
HTML and the service worker use `public, max-age=0, must-revalidate`.

The URL verifier passed with no console errors, one `h1`, one `main`, `lang="en"`, and complete image alternatives.

## Performance

Production assets remain inside the budgets:

- JavaScript: 7.77 KiB raw, 3.40 KiB gzip
- CSS: 13.79 KiB raw, 3.86 KiB gzip
- hero WebP: 192,734 bytes
- font files: none

Lighthouse 12.8.2 mobile completed without a runtime error after disabling its unstable full-page screenshot artifact:

- Performance: 100
- Accessibility: 100
- Best practices: 100
- SEO: 100
- FCP: 0.9 s
- LCP: 1.8 s
- TBT: 60 ms
- CLS: 0
- Speed Index: 0.9 s

## Billing and entitlement boundary

The live checkout path and exact $19 offer are verified.
The existing return-token, local storage, daily verdict cache, restore field, valid download, and invalid-license lock paths pass with recorded verification responses.

No real purchase was made because the worker has no purchaser authorization or payment instrument.
Therefore the hosted redirect and product price are proven, but a real paid entitlement issuance is not claimed.
Public billing metadata is in `/work/.evidence/billing-offer.json` and `.factory/billing-offer.json`.

## Evidence

- `/work/.evidence/claims-run.txt`
- `/work/.evidence/verify-url-final/verify.json`
- `/work/.evidence/live-final-phone-first-screen.png`
- `/work/.evidence/live-final-desktop-first-screen.png`
- `/work/.evidence/lighthouse-final-clean.json`
- `/work/.evidence/billing-offer.json`
- `/work/.evidence/catalog-description.txt`

## Known gaps and next steps

- A crates.io release does not exist. The tested public Git install is the supported path until the factory publishes one.
- A real payment and issued license were not exercised. A billing operator can run that external transaction and return-license check when authorized.
- This product has no backend, tenant store, or server-side product state. SQLite persistence, tenant isolation, health, and 429 checks do not apply.
