# Handoff: Identity Migration Map review 1 — FAIL

Review 1 completed on 2026-09-05 without changing product code.

- Verdict: **FAIL**
- Findings: **7**
- Untested public claim groups: **28**
- Implementation reviewed: `6fbcd7d2aa0dcc1a8e1686865f534ec530561fe9`
- Documentation at review start: `f5f0ecab6310806b933dc8e8158dcd9ab56c10b9`
- Full report: `.factory/review-1.md`

The normal CLI scan and browser preview work, all clean build gates pass, live assets match the candidate, axe reports no violations, offline reload works, and Lighthouse mobile scored 99 performance and 100 accessibility.

Release remains blocked by seven findings. The highest-impact issues are the unavailable public Cargo install, the HTTP 404 paid checkout, the missing CLI/demo sandbox contract, and the absent claim registry. The first-screen copy, site routes/metadata/shared structure, and mobile touch targets also need repair.

## Reproduce the passing checks

```sh
npm ci
npm test
npm run build
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo package --allow-dirty
```

Install the packaged candidate in a fresh consumer root, then run the shipped fixture:

```sh
cargo install --path target/package/identity-migration-map-0.1.0 --root /tmp/imm-review-install --force
/tmp/imm-review-install/bin/imm scan --plan examples/sample/migration.toml --out /tmp/imm-review-output --json
```

Expected sample summary: 1 mapping, 3 sources, 3 files, 7 occurrences, 0 unowned occurrences, and 1 external source.

## Next steps

Resolve every item F-01 through F-07 in `.factory/review-1.md`, add the required claim and demo documents, deploy the repaired artifact, and rerun a strict review. Factory owners must perform registry publication, billing registration, and deployment.
