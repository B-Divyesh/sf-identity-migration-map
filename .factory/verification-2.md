# Independent verification 2 — FAIL

**Candidate:** `6e3c8c0d8fb6db73a566cf47d988795e05261ac6`  
**URL:** `https://identity-migration-map.sociobot.in/`  
**Verified:** 2026-08-28  
**Method:** fresh detached checkout at the candidate; no product code changed.

## Decision

**FAIL — the live deployment now matches the candidate and works, but it misses the required immutable caching policy for hashed static assets.** This violates the performance acceptance contract. The earlier certificate/routing failure is resolved: the hostname has a valid hostname certificate and serves the candidate byte-for-byte.

| Severity | Defect | Fresh evidence | Required resolution |
| --- | --- | --- | --- |
| Medium | Hashed deploy assets are revalidated every 30 seconds instead of being long-lived immutable. | The deployed JS, CSS, WebP, and service worker all return `Cache-Control: public, must-revalidate, max-age=30`; none includes `immutable`. The built JS/CSS names are content-hashed (`home-CD--hA8a.js`, `styles-CAGcHQsC.css`), so this fails the required long-lived immutable caching policy and creates needless repeat revalidation. | Configure the static host/CDN so fingerprinted `/assets/*` receive a long max-age plus `immutable`; keep HTML and `service-worker.js` short-lived/revalidated. Retest headers after the change. |

The following non-blocking response-policy hardening gap was also observed: the HTML response has HSTS, `Referrer-Policy`, and `X-Content-Type-Options`, but no CSP, `X-Frame-Options`, or `frame-ancestors` protection. It is not the basis for this decision, but should be addressed by deployment policy.

## Clean-checkout quality gates

`npm ci` completed from the detached candidate (20 packages, `npm audit` reported 0 vulnerabilities). There is no separate repository typecheck or lint npm script; the available Rust formatter/linter were run.

- `npm test`: passed — 2 Rust unit tests, 4 CLI integration tests, 1 doctest, and 3 built-site tests.
- `cargo fmt --check`: passed.
- `cargo clippy --all-targets -- -D warnings`: passed.
- `npm run build`: passed — release binary at `target/release/imm` and deployment artifact at `dist/site/`.
- `cargo package`: passed, including Cargo's verification build; package was `237,902` bytes.

Built initial assets are within budget: JS `6,440` bytes (gzip `2.93 kB`), CSS `11,514` bytes (gzip `3.41 kB`), hero WebP `192,734` bytes, and no downloaded fonts. The live resource hashes matched the fresh build for `index.html`, JavaScript, CSS, hero image, and service worker.

## CLI and package exercise

I installed the packaged crate into an isolated consumer root with:

```sh
cargo install --path target/package/identity-migration-map-0.1.0 --root /tmp/imm-consumer-root
```

The consumer-installed `imm` binary exposed useful `init` and `scan` help, completed the committed sample with JSON summary `1` mapping, `3` sources, `3` files, `7` occurrences, `0` unowned occurrences, and `1` external source, and emitted `manifest.json`, `report.md`, `hits.csv`, and `rollback-ledger.csv`. A missing plan and an attempt to overwrite an existing starter plan each exited `2` with actionable messages.

The normal CLI scan additionally confirmed the full 7-occurrence fixture and its complete owner/rollback rows. The passing integration/unit suite covers secret redaction while preserving the declared identifier, duplicate-mapping rejection, missing/unowned owner behavior (reports written then exit `3`), and the committed fixture. The CLI has no network-capable runtime dependency and its documented safety boundary states matches are evidence only; SaaS exports require human confirmation.

## Live browser, privacy, accessibility, and PWA exercise

Playwright Chromium 1.62.1 tested the live candidate at `1440×1000` and `390×844`.

- Both viewports had one `h1`, one `main`, `lang="en"`, a title, image alt text, and no horizontal overflow.
- Keyboard Tab reached the skip link first with a visible `rgb(155, 97, 11) solid 3px` focus ring. Keyboard Space submitted the demo. A full Tab circuit returned to the skip link without a trap.
- Representative local demo scan found two literal occurrences. Missing fields produced an actionable error; equal old/new identifiers produced an actionable error and focused the new-identifier field; a no-match excerpt showed the explicit cautionary empty state. Marking input external displayed “human confirmation required.”
- Axe WCAG A/AA had **0 violations** at desktop and mobile (therefore 0 serious/critical). Both runs had 0 console errors and 0 page errors.
- Reduced motion computed a `0.01ms` transition. No looping animation was observed.
- A clean load requested only `https://identity-migration-map.sociobot.in`; migrated text was not sent. Source and exercised mocked-license flow show the only runtime cross-origin request is the documented, user-triggered Sociobot verification endpoint. A return license was stored locally, removed from the URL, verified at the exact product endpoint, and unlocked only the optional kit. No analytics/CDN fonts/scripts were requested.
- After registration, the live service worker controlled the page; `registration.update()` completed with no waiting worker. A 390px offline reload returned the cached shell with HTTP 200, a visible `main`, and no errors.

An attempted Lighthouse run against the live URL produced valid mobile metric values (FCP `0.8 s`, LCP `1.8 s`, TBT `0 ms`, CLS `0`, accessibility `100`) but no aggregate performance score because the available Chrome/Lighthouse pairing returned a null Speed Index score. This environment limitation does not mask the cache-header defect above; bundle budgets and browser behavior were independently measured.

## Live identity and headers

Normal HTTPS now succeeds. The certificate subject/SAN is `identity-migration-map.sociobot.in` (DigiCert chain, valid 2026-08-27 through 2027-02-27). The live `index.html` SHA-256 is `c0f83ce8686984978f1086501236801bd2379ff41bb0ad1988c740375d7d2cba`, exactly matching the fresh candidate build. The JS, CSS, WebP, and service-worker SHA-256 values also matched their respective built files.

The HTML response returns HSTS (`max-age=10886400; includeSubDomains; preload`), `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. It does not return the stronger cache policy required for hashed assets, nor the optional CSP/frame protections noted above.

## Retest

After the deployment cache configuration is corrected:

```sh
npm ci
npm test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
npm run build
cargo package
curl -I https://identity-migration-map.sociobot.in/assets/home-CD--hA8a.js
```

Confirm that the hashed asset response has a long `max-age` and `immutable`, then repeat the live header and offline browser checks.
