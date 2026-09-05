# Verification 4: find identifier dependencies before a rename

## Verdict

**FAIL — 2 findings and 2 untested public-claim assertions.**

The deployment and free product paths are working. The result is not a PASS because the paid valid-license assertion has not been exercised against a real issued entitlement, and README includes an unsupported release-package statement. This verifier had no authorization to make a payment or access a buyer license.

- Reviewed candidate: `3d03af965a2cc7e45e4b9086430b5e79275250c1`
- Documentation commit: `a83c71711fe7dc55c69a31a4bcdda06455bb0670`
- Live URL: <https://identity-migration-map.sociobot.in/>
- Reviewed: 2026-09-05

## First screen

- Job: find every dependency before renaming a user.
- Audience: self-hosters and small-team administrators who need an owner and rollback step for each old identifier.
- First action: **Try it with sample data**. It loads four sample hits with owners and source lines.

Fresh desktop (1440×1000) and phone contexts opened the live site. The job, audience, action, and all three facts were visible before scrolling. The phone check used a 390-pixel-wide mobile viewport; the three facts ended at 631 CSS pixels in the 664-pixel iPhone viewport. Screenshots are in `/work/.evidence/verification-4/`.

## Findings

### F-01 — High — A real paid entitlement has not been validated

The public claim `licensed-field-kit` says that a valid restored license downloads the Field Kit. Its declared test intercepts the verification URL and supplies a made-up valid response for `sample-license`; it proves the browser client behavior but not a real issued Sociobot/Dodo entitlement. No purchaser-authorized transaction or issued license was available for this verification.

What is proven: the live buy endpoint returned 303 to the Dodo checkout, which returned 200 and displayed **Identity Migration Map Field Kit** at **$19.00**. The live verification endpoint returned `{ "valid": false, "reason": "invalid" }` for an intentionally invalid token. In a fresh live browser, that token was stored locally, removed from the URL, verified once, and left the Field Kit locked while free tools remained available.

Required external follow-up: complete an authorized purchase, return to the product with the issued token, and verify the live `valid: true` response, daily cache behavior, Field Kit download, and later revocation. This is not a code change request and must not be simulated with a fabricated entitlement.

### F-02 — Low — README makes an unlisted release-package statement

README says, “The factory publishes release packages,” although this repository has no Git tag or GitHub release and its handoff says that no crates.io release exists. The documented and independently tested Git installation works, so the CLI is available; this sentence is nevertheless an unlisted, unsupported public statement that conflicts with the documented current distribution state.

Required change: remove or qualify the statement, or publish and test the referenced release package and register that claim.

## Verified behavior

### Clean checkout and claims

The following completed from this checkout:

```sh
npm ci
npm test
npm run build
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo package
```

`npm test` passed 2 Rust unit tests, 5 CLI integration tests, 1 doctest, 5 static-site tests, and 25 browser tests. `npm run build` produced `target/release/imm` and `dist/site/`. `cargo package` verified the 0.2.0 package.

Each of the 14 exact commands in `.factory/claims.json` passed separately. This includes the clean public Git installation command, CLI demo, scan safety and report claims, browser demo/export/privacy/offline claims, the recorded-license client flow, and live checkout. Per-command logs are at `/work/.evidence/claims-verify-4/`.

I also installed the packaged Cargo artifact into a fresh consumer root. The installed `imm 0.2.0` ran `demo --json` with 7 hits across 3 files and 1 external source, scanned the shipped fixture into all four reports, and returned exit 2 with an actionable error for a missing plan.

### Live artifact, browser, and routes

The live `index.html`, service worker, JavaScript, CSS, hero image, and social image match the fresh local production build by SHA-256. The current hashed assets use the required one-year immutable cache policy; HTML and the service worker use `max-age=0, must-revalidate`.

The first-screen action entered `/demo/` in one click. It showed four realistic hits, owner labels, and four external human-confirmation notices. The persistent **Demo — sample data, nothing is saved** label remained visible. A no-match input produced zero hits; **Reset demo** restored four hits; and a pre-existing `real:sentinel` local-storage value remained unchanged. Demo input caused no cross-origin request or browser console error. A fresh controlled service-worker context reloaded the populated demo offline with HTTP 200 and four hits.

`/`, `/demo/`, `/privacy/`, and `/terms/` each returned 200 with distinct route titles, one `h1`, and one `main`. An arbitrary unknown route returned the designed page with HTTP 404. Internal and external documented links resolved; `mailto:` links are explicit. The response includes CSP with `frame-ancestors 'none'`, HSTS, nosniff, referrer, permissions, and frame-denial headers.

### Accessibility and privacy

Playwright Axe against the live home, demo, privacy, and terms routes found zero violations, including zero serious or critical violations. There were no console or page errors. Fresh desktop and phone checks confirmed `lang="en"`, one main landmark, one h1, no horizontal overflow, visible skip-link focus, and the documented reduced-motion behavior. The standalone `@axe-core/cli` command could not start because this container has no system Chrome binary; the Playwright Chromium audit completed successfully instead.

The direct live invalid-license check made one request only to the approved Sociobot verification endpoint. The normal landing and demo flows had no analytics, advertising, third-party font, or other third-party request.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Certificate/routing failure in `verification.md` | Fixed: normal HTTPS serves the product. |
| Missing immutable asset caching in `verification-2.md` | Fixed: current JS, CSS, and WebP responses are immutable for one year. |
| CSP/frame hardening note in `verification-2.md` | Fixed: live CSP has `frame-ancestors 'none'` and `X-Frame-Options: DENY`. |
| Lighthouse completion gap in `verification-3.md` | Previous handoff records a successful 100/100/100/100 run; this verification confirmed the live route and asset conditions but did not repeat Lighthouse. |
| Review 1 F-01 through F-07 | Fixed: public Git install, hosted checkout, CLI/browser demo, claims registry, plain-language first screen, required routes/discovery, and 44-pixel mobile targets all passed current checks. |

## Evidence

- `/work/.evidence/claims-verify-4/`
- `/work/.evidence/verification-4/live-desktop-first-screen.png`
- `/work/.evidence/verification-4/live-phone-first-screen.png`
- `/tmp/imm-checkout.html` (live hosted-checkout response captured during this verification)

