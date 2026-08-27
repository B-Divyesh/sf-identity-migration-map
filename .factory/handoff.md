# Handoff: Identity Migration Map v0.1.0

## What shipped

- A typed Rust CLI, `imm`, with helpful `init`, `scan`, and `--help` paths; documented exit codes; compact `--json` output; and no interactive or network behavior.
- Strict TOML plans for identifier mappings and filesystem, config, database-export, and SaaS-export sources. Source paths are resolved relative to the plan.
- Read-only recursive scanning of UTF-8 text, exact occurrence locations, default secret/bearer-token redaction, ignored build/VCS directories, and explicit warnings for skipped binary/large files.
- A complete output bundle: `manifest.json`, `report.md`, `hits.csv`, and `rollback-ledger.csv`. The manifest includes every occurrence plus one owner-checklist and rollback row for every mapping/source pair, including zero-hit sources.
- Automatic human-confirmation warnings for `saas-export` sources, even if `external = true` was omitted. No match is presented as authority to mutate a system.
- A committed seven-occurrence sample under `examples/sample/`, covered by an end-to-end integration test.
- A responsive botanical field-guide landing/docs site with an in-browser local-only scanner, empty/error states, keyboard operation, JSON/CSV demo exports, install documentation, and source links.
- A $19 one-time optional Field Kit using the Sociobot billing contract: hosted buy link, return-token capture and URL cleanup, `sb_license:identity-migration-map` local storage, cached daily verification, optimistic cached unlock, offline behavior, and paste-to-restore. Core scanning, safety, accessibility, and export remain free.
- `/privacy/` and `/terms/` pages, no analytics, no CDN assets, and an offline service worker whose precache is generated from Vite's hashed manifest.
- Original generated hero artwork at `site/public/assets/migration-herbarium.webp` (192,734 bytes). The exact prompt, generation route, visual tokens, and provenance are recorded in `.factory/design.md`.
- MIT license, changelog, README, and a clean-clone CI workflow.

## Run and verify

```sh
npm ci
npm test
npm run build
cargo package
```

The required static deployment root is `dist/site/`, with `dist/site/index.html` at its root. The release binary is `target/release/imm`. The ready-to-publish Rust package is produced with `cargo package`; publishing credentials remain with the factory.

Seeded end-to-end check:

```sh
./target/release/imm scan \
  --plan examples/sample/migration.toml \
  --out /tmp/imm-sample \
  --json
```

Expected summary: 1 mapping, 3 sources, 3 files, 7 occurrences, 0 unowned occurrences, and 1 external source.

## Verification completed on 2026-08-27

- `cargo fmt --check`: passed.
- `cargo clippy --all-targets -- -D warnings`: passed.
- `npm test`: passed (2 unit tests, 4 CLI integration tests, 1 Rust doctest, 3 site tests).
- `npm run build`: passed; emitted the release CLI and `dist/site/`.
- `cargo package --allow-dirty`: packaged and verified successfully. A clean final tree can use `cargo package` without the flag.
- Factory `verify-url.sh` against the production build: passed; title/lang/main/alt present, one h1, no unlabeled buttons, no console errors.
- Playwright axe WCAG A/AA audit at 390×844: 0 violations, 28 passes.
- Offline Playwright smoke test at 390×844: cached page, styles, JavaScript, and offline banner all loaded; 0 console errors.
- Lighthouse mobile: Performance 99, Accessibility 100, LCP 2.0s, FCP 0.9s, Speed Index 0.9s, Total Blocking Time 0ms, CLS 0.
- Initial assets: JavaScript 6,440 bytes, CSS 11,514 bytes, hero WebP 192,734 bytes. No webfonts are shipped.

## Known gaps and next steps

- Scanning is deliberately literal and limited to UTF-8 files up to 10 MiB. Binary formats and live databases must be exported to readable text first; semantic meaning remains a human decision.
- The CLI does not mutate accounts, SSO, databases, or SaaS products. That is the intended safety boundary, not an incomplete automation path.
- The factory must register and publish the package/product, exercise a real test checkout, and switch environment routing as part of release. No product ID, registry credential, DNS, or billing secret is embedded here.
- Release binaries are not cross-compiled in this container; CI/release automation can add signed platform archives after registry setup.
