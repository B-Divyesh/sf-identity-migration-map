# Handoff: Identity Migration Map v0.1.0 — PASS

## Repair delivered — 2026-08-28

Repair commit `6fbcd7d` (`fix(deploy): cache fingerprinted assets immutably`) fixes the independent verifier's only release blocker from candidate `6e3c8c0d8fb6db73a566cf47d988795e05261ac6`: Azure Static Web Apps was applying a 30-second revalidation policy to all files.

`site/public/staticwebapp.config.json` is now part of the built deployment root. It gives fingerprinted `/assets/*` a one-year immutable cache policy and keeps the HTML shell and `service-worker.js` revalidated. It also preserves the existing safe navigation fallback and adds CSP `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, referrer policy, and a restrictive permissions policy. The regression test reads the emitted configuration and asserts the exact cache directives and frame protections, so the deployment script cannot silently fall back to its weaker generated configuration.

The static site was deployed with `/opt/fleet/lib/deploy-static.sh identity-migration-map dist/site`. Live artifact identity matched the fresh build byte-for-byte:

| File | SHA-256 |
| --- | --- |
| `index.html` | `c0f83ce8686984978f1086501236801bd2379ff41bb0ad1988c740375d7d2cba` |
| `assets/home-CD--hA8a.js` | `819fc7f9eb9b340fa9c5c09fbaeadc0e6aaebed7044066c9f45062912fddb705` |
| `assets/styles-CAGcHQsC.css` | `fb5b515103ac3c937ff19b24024446bee55241381b2828f95172580bd106a315` |
| `service-worker.js` | `c0081643a9cd851e507b011ca4dc43c36ac0af62dfb0de0a1862368e8b5ae453` |
| `assets/migration-herbarium.webp` | `0329627d574be411caa9e82bc2da517d592c26a0409d1546796d7446fcd0d135` |

Live response-policy retest:

- JavaScript, CSS, and WebP assets: `Cache-Control: public, max-age=31536000, immutable`.
- HTML and `service-worker.js`: `Cache-Control: public, max-age=0, must-revalidate`.
- HTML also returns the CSP above, `X-Frame-Options: DENY`, HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`.

## Verification completed

From a clean `npm ci` install (0 vulnerabilities):

- `npm test`: passed — 2 Rust units, 4 CLI integrations, 1 doctest, strict TypeScript checking, and 4 built-site tests (including the cache-policy regression).
- `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`: passed.
- `npm run build`: passed; release CLI at `target/release/imm`, static deployment root at `dist/site/`.
- `cargo package`: passed and verified; `identity-migration-map-0.1.0.crate` is 237.5 KiB compressed.
- Consumer check: installed the packaged crate into an isolated temporary root, ran `imm --help`/`imm init --help`, and scanned the committed sample. Its JSON summary was `1` mapping, `3` sources, `3` files, `7` occurrences, `0` unowned occurrences, and `1` external source; `manifest.json` was emitted.
- Live `verify-url.sh`: HTTPS 200; correct title/lang, one `h1`, `main`, image alt text, no unlabeled buttons, and no console errors (652 ms load in that smoke check).
- Live Playwright Chromium desktop (1440×1000) and mobile (390×844): one `h1`, no horizontal overflow, skip link reached first with the designed 3 px focus ring, equal-identifier validation remained actionable, Axe WCAG A/AA had 0 violations at both sizes, and there were 0 page/console errors.
- Privacy/offline/update: a clean live load made 0 cross-origin requests; pasted demo content remains local. The service worker controlled after reload, `registration.update()` left no waiting worker, and a 390 px offline reload returned the cached shell with `main` present.
- Lighthouse mobile (simulated throttling): Performance **100**, Accessibility **100**, FCP **0.9 s**, LCP **1.8 s**, TBT **0 ms**, CLS **0**. Chrome reported a post-audit screenshot target crash after writing the report, but the complete category scores and metrics were present in `/tmp/imm-lighthouse.json`.

## How to run, package, and deploy

```sh
npm ci
npm test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
npm run build
cargo package
./target/release/imm scan --plan examples/sample/migration.toml --out /tmp/imm-sample --json
/opt/fleet/lib/deploy-static.sh identity-migration-map dist/site
```

Deploy `dist/site/` as-is; it must include `staticwebapp.config.json`. The release binary is `target/release/imm`. `cargo package` produces the ready-to-publish crate; registry publication remains with the factory.

## Product boundary

The CLI intentionally reads declared UTF-8 exports only, redacts likely secrets by default, emits evidence/checklists/rollback ledgers, and never changes accounts, SSO, databases, or SaaS systems. Binary/large files must be exported or handled separately; all match evidence remains subject to named-owner and external-SaaS human confirmation.
