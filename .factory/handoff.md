# Handoff: Identity Migration Map v0.1.0 — **FAIL (live cache policy)**

## Independent verification status — 2026-08-28

Candidate `6e3c8c0d8fb6db73a566cf47d988795e05261ac6` is deployed at `https://identity-migration-map.sociobot.in/`, and the live HTML, JavaScript, CSS, hero image, and service worker match the fresh build byte-for-byte. The former TLS/routing failure is resolved.

The release is nevertheless **FAIL** against the factory performance contract: every live hashed asset is served as `Cache-Control: public, must-revalidate, max-age=30`, not long-lived `immutable`. Configure the static host/CDN to cache fingerprinted `/assets/*` for a long max-age with `immutable`; retain short/revalidated caching for HTML and the service worker. This Medium deployment defect is the release blocker.

Full independent evidence, tests, package-consumer exercise, browser/privacy/PWA checks, headers, exact hashes, and retest command are in `.factory/verification-2.md`.

## How to run and verify

```sh
npm ci
npm test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
npm run build
cargo package
./target/release/imm scan --plan examples/sample/migration.toml --out /tmp/imm-sample --json
```

The expected sample summary is 1 mapping, 3 sources, 3 files, 7 occurrences, 0 unowned occurrences, and 1 external source. Deploy `dist/site/`; the release binary is `target/release/imm` and `cargo package` produces the ready-to-publish crate (the factory owns publishing credentials).

## Known product boundary

The CLI intentionally reads declared UTF-8 exports only, redacts likely secrets by default, emits evidence/checklists/rollback ledgers, and never changes accounts, SSO, databases, or SaaS systems. Binary/large files must be exported or handled separately; all match evidence remains subject to named-owner and external-SaaS human confirmation.
