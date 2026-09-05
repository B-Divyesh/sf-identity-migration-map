# Identity Migration Map

Identity Migration Map is a read-only CLI for planning a user identifier rename.

It is for self-hosters and small-team administrators.
It finds literal dependencies and assigns owner checks and rollback steps.
A string match is evidence for human review, never permission to change a system.

The companion site is <https://identity-migration-map.sociobot.in>.
Its [sample demo](https://identity-migration-map.sociobot.in/demo/) works without an account.

## Install

Install Rust 1.85 or newer.
Then install the CLI from the public source repository:

```sh
cargo install --git https://github.com/B-Divyesh/sf-identity-migration-map --locked
imm --help
```

The factory publishes release packages.
This repository is ready for `cargo package`, but workers do not publish registry releases.

## Try the bundled sample

Run the real scanner without supplying any files:

```sh
imm demo
```

The command creates sample inputs in a new temporary directory.
It finds seven occurrences in three files and creates four reports.
The terminal prints the report directory and leaves it available for review.

## Scan your own exports

Create a starter plan:

```sh
imm init --output migration.toml
```

Edit the plan to name each mapping, source, owner, and rollback step:

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

Run the scan:

```sh
imm scan --plan migration.toml --out migration-map
```

The scan leaves declared inputs unchanged.
It creates files only inside the chosen output directory.

- `manifest.json` contains the plan, evidence, warnings, and summary.
- `report.md` contains an owner checklist and rollback table.
- `hits.csv` contains each file, line, column, source type, and redacted context.
- `rollback-ledger.csv` contains one untested rollback entry per mapping and source pair.

Use JSON output and fail completed scans that still have unowned evidence:

```sh
imm scan --plan migration.toml --out migration-map --json --fail-on-unowned
```

Exit code `0` means the scan completed.
Exit code `2` means the plan, input, or output was invalid.
Exit code `3` means the scan completed but found unowned evidence when requested.
An empty scan returns `0` and explains what still needs confirmation.

## Safety and privacy

Context redaction is on by default.
It masks likely secrets while keeping the declared identifier visible.
Use `--no-redact` only when the reports receive the same protection as the source.

The CLI does not rename, provision, authenticate, or write to databases.
External exports always require confirmation from a human owner.

The browser demo keeps sample text in memory and creates no demo storage keys.
Its JSON and CSV exports need no license.
The populated demo reloads offline after its first visit.
The site loads no analytics, advertising trackers, or third-party fonts.

See the [privacy policy](https://identity-migration-map.sociobot.in/privacy/) and [terms](https://identity-migration-map.sociobot.in/terms/).

## Optional Field Kit

The $19 one-time Field Kit contains three editable team planning templates.
Scanning, redaction, report exports, and safety checks remain free.
The buy link opens Sociobot’s hosted checkout.
Buyers can restore a valid license on the site.

## Develop, test, and build

Run the clean setup and every quality gate:

```sh
npm ci
npm test
npm run build
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo package
```

`npm test` runs Rust tests, strict TypeScript, the site build, static checks, browser claims, and accessibility checks.
`npm run build` creates `target/release/imm` and the deployable site in `dist/site/`.

Every public claim is listed in [`.factory/claims.json`](.factory/claims.json).
From the clean build above, run each listed `test` command exactly as written.

## Deployment

The site is a Vite static build.
Deploy `dist/site/` without changing its `staticwebapp.config.json` response policy.
The factory owns DNS, billing registration, and release publication.

## License

MIT. See [LICENSE](LICENSE).
