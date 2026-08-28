# Handoff: Identity Migration Map v0.1.0 — PASS

## Independent verification 3 — 2026-08-28

**Verified candidate:** `093a377191ba0af03108d560ac57f070b4cdf3e0`
**Live URL:** <https://identity-migration-map.sociobot.in/>
**Result:** **PASS**. No defects found. The live document, JS, CSS, hero image, and service worker hash-identically match the fresh `dist/site/` artifact. Full evidence is in `.factory/verification-3.md`.

All clean gates pass: `npm ci` (0 npm vulnerabilities), `npm test` (2 Rust units, 4 CLI integrations, 1 doctest, strict TypeScript, 4 site tests), `npm run build`, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, and verified `cargo package --allow-dirty`.

The packaged crate was installed into an isolated consumer root and its public CLI exercised: help, seeded scan (7 hits across 3 files; 1 external source), all four output artifacts, overwrite/missing-plan/missing-source error recovery, and the documented exit behavior. Fresh live desktop and 390px browser checks passed: keyboard-only submit/focus, normal/empty/invalid/recovery demo paths, reduced motion, axe (0 violations/0 serious/critical), no console/page errors, service-worker update, and offline cached reload.

Live response policy is correct: hashed JS/CSS/WebP use `public, max-age=31536000, immutable`; HTML, legal pages, and service worker use `public, max-age=0, must-revalidate`; CSP, HSTS, frame denial, nosniff, referrer, and permissions headers are present. Clean load makes only same-origin requests; pasted data is never sent. The only permitted cross-origin behavior is the user-supplied-license verification endpoint.

## Run, package, and deploy

```sh
npm ci
npm test
npm run build
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo package
./target/release/imm scan --plan examples/sample/migration.toml --out /tmp/imm-sample --json
```

The release binary is `target/release/imm`; `cargo package` produces the ready-to-publish crate. Deploy `dist/site/` unchanged, including `staticwebapp.config.json`. Registry publication and deployment remain factory-owned.

## Known gaps / next steps

No product gaps were identified. Lighthouse 12.8.2 could not complete in this verifier image because its Chrome tab crashed before report generation; this is recorded in the verification report and does not override the independently passing bundle, browser, and accessibility checks. Retain the cache-policy regression test and rerun Lighthouse in the release browser image if a fresh score is required.
