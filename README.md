# Identity Migration Map

Identity Migration Map (`imm`) is an offline-first, read-only CLI for administrators planning an identifier rename. It scans declared filesystem, configuration, and database-export sources for the old identifiers, then produces an evidence manifest, owner checklist, and rollback ledger. A string match is evidence to review—not authorization to change an account or record.

The companion static site at <https://identity-migration-map.sociobot.in> documents the workflow and includes a local in-browser demo. Neither the CLI nor the demo sends migration content anywhere.

## Usage

Create a starter plan:

```sh
imm init --output migration.toml
```

Edit it to name every mapping and source you expect to inspect:

```toml
version = 1
name = "Rename alice to alice.ops"

[[mappings]]
from = "alice"
to = "alice.ops"
owner = "platform"
rollback = "Restore the account alias and the pre-migration export"

[[sources]]
path = "./config"
kind = "config"
owner = "platform"

[[sources]]
path = "./exports/users.csv"
kind = "database-export"
owner = "data"

[[sources]]
path = "./exports/chat.json"
kind = "saas-export"
owner = "collaboration"
external = true
```

Scan without modifying any source file:

```sh
imm scan --plan migration.toml --out migration-map
```

The output directory contains:

- `manifest.json`: machine-readable plan, evidence, warnings, and summary.
- `report.md`: human review sheet grouped by mapping and owner.
- `hits.csv`: one row per literal occurrence with file, line, column, and redacted context.
- `rollback-ledger.csv`: explicit rollback step and verification status for every mapping/source pair.

Use `--json` for a compact summary on stdout and `--fail-on-unowned` to exit `3` if any evidence has no declared owner:

```sh
imm scan --plan migration.toml --out migration-map --json --fail-on-unowned
```

Context redaction is on by default. It masks values near secret-like keys and bearer tokens while leaving the declared identifier visible. Use `--no-redact` only when the generated artifact will receive the same protection as its source.

Exit codes: `0` scan complete, `2` invalid plan/input/I/O error, `3` scan complete but unowned evidence exists. Empty scans are valid and produce a checklist explaining what was inspected.

## Install

Requires Rust 1.85 or newer:

```sh
cargo install --path .
imm --help
```

For release preparation (the factory publishes binaries):

```sh
cargo package
```

## Develop, test, and build

```sh
npm install
npm test
npm run build
```

`npm test` runs Rust unit/integration tests plus static-site tests. `npm run build` compiles the release CLI and emits the deployable site at `dist/site/index.html`. To work on the site alone, use `npm run dev` or `npm run build:site`.

## Scope and safety

Inputs are opened read-only. Binary files, symlinks, and common build/VCS directories are skipped; external SaaS exports are marked for human confirmation. `imm` does not rename, provision, authenticate, execute SQL, or infer permission from a match. Review results with the named system owners and test every rollback step before changing production identities.

No telemetry is collected. See [privacy](site/privacy.html) and [terms](site/terms.html). Licensed site tools use Sociobot's hosted one-time purchase and daily verification contract; the core scanner, safety controls, and exports are free.

## License

MIT. See [LICENSE](LICENSE).
