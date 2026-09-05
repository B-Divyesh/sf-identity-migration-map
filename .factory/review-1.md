# Review 1: Inventory dependencies before renaming a user identifier

## Verdict

**FAIL — 7 findings, including 4 high-severity findings. There are 28 untested public claim groups.**

Identity Migration Map is for self-hosters and small-team administrators who need to find every use of an old user identifier before changing it. On the live first screen, the first action is **“Try the local demo.”** It scrolls to a prefilled browser form and four sample hits. The page does not name the intended audience before scrolling.

Reviewed on 2026-09-05.

- Live URL: <https://identity-migration-map.sociobot.in/>
- Implementation candidate: `6fbcd7d2aa0dcc1a8e1686865f534ec530561fe9`
- Documentation SHA at review start: `f5f0ecab6310806b933dc8e8158dcd9ab56c10b9`
- Candidate selection: every change after `6fbcd7d` only changes `.factory/handoff.md` or adds `.factory/verification-3.md`. The live HTML, JavaScript, CSS, image, and service worker match the fresh build from the current checkout.

## Findings

### F-01 — High — The public CLI install command does not work

The live terminal tells users to run `cargo install identity-migration-map`. A clean registry lookup found no crate, and that command exited 101 with `could not find identity-migration-map in registry crates-io`. This blocks the normal install path for the product's main artifact. Installing the locally packaged crate works, but that is not available to a visitor following the live instructions.

Required change: publish through the factory-owned release process, or replace the live command with a tested install path that a new user can run.

### F-02 — High — The paid checkout link returns HTTP 404

The live **Buy the Field Kit** link points to the required Sociobot product endpoint, but a GET returned HTTP 404 with an error saying the factory product is not enabled. A visitor cannot buy the advertised $19 item. The invalid-license verification endpoint itself returned a valid `{valid:false}` response, and the browser kept the optional download locked.

Required change: register and enable this product in the approved billing system, then verify the complete checkout and return-license path.

### F-03 — High — The required CLI demo sandbox is missing

The packaged `imm 0.1.0` has only `init` and `scan`; `imm demo` exits 2 as an unrecognized subcommand. The landing page has no recording of the real binary. `/demo` is only the home-page fallback. The browser sample has no persistent **“Demo — sample data, nothing is saved”** label, **Reset demo**, or **Start for real** action. `.factory/demo.md` is missing.

The existing browser preview is useful but does not meet the CLI demo contract. Clicking **Try the local demo** scrolls to realistic prefilled output with four hits. The preview keeps its data in memory, made no cross-origin request during the exercised flow, and did not change local storage. Those facts do not replace the required bundled CLI demo and documented sandbox.

Required change: add `imm demo` using the packaged `examples/` fixture in a temporary directory, record that real command on the landing page, implement the required labeled/resettable demo entry, and add `.factory/demo.md`.

### F-04 — High — Public claims have no claim registry or claim commands

`.factory/claims.json` is missing. Therefore no public claim has the required `@claim:<id>` command, clean demo sandbox, or recorded evidence. Existing general unit and site tests do not satisfy the claim contract.

The audit counted these 28 distinct public claim groups:

1. CLI inputs are opened read-only.
2. The CLI writes only to the chosen output directory.
3. The CLI has no telemetry.
4. The CLI has no network code.
5. The CLI runs offline.
6. The binary runs on macOS, Linux, and Windows.
7. Every literal occurrence includes file, line, column, and source type.
8. Secret-like context is redacted by default.
9. Unowned findings remain visibly unresolved.
10. External SaaS evidence requires human confirmation.
11. A string match never grants authorization.
12. Every mapping/source pair receives a rollback entry starting at `not-tested`.
13. A machine-readable manifest is produced.
14. A Markdown owner report is produced.
15. A hit CSV is produced.
16. A rollback CSV is produced.
17. `--json` prints a compact summary.
18. Exit codes are 0 for success, 2 for invalid input, and 3 for unowned evidence.
19. An empty scan is valid and explains what was inspected.
20. Browser demo text stays in memory and is not uploaded, logged, or saved.
21. The browser demo exports JSON with the shown evidence.
22. The browser demo exports CSV with the shown evidence.
23. The web demo works offline after its first visit.
24. The site uses no analytics, advertising trackers, or third-party fonts.
25. License state is stored locally and the token is removed from the return URL.
26. License verification occurs no more than once per day after a cached result.
27. Versioned assets are cached for one year while the shell can discover updates.
28. The $19 one-time Field Kit supplies the listed templates while core scanning, exports, and safety controls remain free.

Required change: create `.factory/claims.json`, give every retained claim exactly one observable tagged test, and remove or narrow statements that cannot be tested.

### F-05 — Medium — The first screen and site copy do not follow the plain-words contract

The headline, **“Trace the roots before you rename the user,”** is a metaphor rather than the job. The 26-word supporting sentence exceeds the 22-word limit and does not name self-hosters or administrators. The primary action is **“Try the local demo,”** not **“Try it with sample data,”** and no adjacent sentence says what happens. At 390×844, only two of the three facts are visible before scrolling. The required `.factory/copy-audit.md` is missing.

Metaphorical interface headings continue below the first screen, including “Field procedure,” “Declare the specimen,” “Observe every root,” “Assign a keeper,” and “Rehearse the return.” The document title is 63 characters, over the 60-character limit.

Required change: name the job and audience directly, use the standard sample action with its outcome, keep all three facts in the phone first screen, replace metaphorical headings, and add the required sentence-by-sentence copy audit.

### F-06 — Medium — Required routes, discovery metadata, and shared page structure are incomplete

- `/demo` returns the landing page and landing title instead of a demo route and title.
- `/definitely-not-a-route` and `/404.html` return the home page with HTTP 200. There is no designed 404 page or expected 404 status.
- `robots.txt` and `sitemap.xml` are absent and return host 404 pages.
- Canonical, Open Graph, Twitter card, 1200×630 social image, and Apple touch icon metadata are absent.
- The landing header omits Privacy; legal-page navigation differs from the landing header.
- Footers omit “Built by Param Factory” and a version/build id; legal footers also omit the product one-line description and one of the two legal links.
- The landing order puts the procedure before the live product preview, and the procedure uses four steps instead of the required three.

A deliberate 404 response is acceptable. The defect here is that the required error route is missing and arbitrary paths silently return the product home page as 200.

Required change: implement the required routes and per-route titles, return a designed 404 with 404 status, add discovery/social files and metadata, and use the standard header, footer, and section order.

### F-07 — Medium — Several mobile touch targets are shorter than 44 pixels

At 390 pixels wide, computed live bounds were 34 pixels high for the header and footer home links and 15 pixels high for the footer Privacy and Terms links. The checkbox itself is 22 pixels but has a 44-pixel label target, so it is not included as a defect. Axe does not detect target-size failures in this configuration.

Required change: give every visible link a target box at least 44×44 CSS pixels while preserving spacing and focus appearance.

## What passed

### Clean checkout and package

- `npm ci`: passed; 20 packages installed and 0 vulnerabilities reported.
- `npm test`: passed; 2 Rust unit tests, 4 CLI integration tests, 1 doctest, strict TypeScript, production site build, and 4 site tests.
- `npm run build`: passed and produced `target/release/imm` and `dist/site/`.
- `cargo fmt --check`: passed.
- `cargo clippy --all-targets -- -D warnings`: passed.
- `cargo package --allow-dirty`: passed package verification; 36 files, 240.0 KiB compressed.

No claim commands were available to run because `.factory/claims.json` is absent.

### Installed CLI behavior

The packaged crate was installed under a fresh temporary consumer root. Its shipped sample produced 7 occurrences across 3 files, 3 owner-checklist rows, 3 rollback rows, no unowned occurrences, and 1 external source. It emitted `manifest.json`, `report.md`, `hits.csv`, and `rollback-ledger.csv`. Source-file hashes were unchanged after the scan.

Missing-plan and existing-plan paths exited 2 with useful messages. `init --force` recovered successfully. Repository tests cover duplicate mappings, redaction, unowned exit 3 after report output, and the complete seeded fixture.

### Live browser behavior

Fresh Chromium contexts were used at 1440×1000 and 390×844. Both had one `h1`, one `main`, `lang="en"`, image alt text, no horizontal overflow, no console errors, and no page errors. Axe WCAG A/AA found zero violations in both contexts.

The first Tab reached the skip link with a 3-pixel visible focus ring. A keyboard Space press on **Map this excerpt** produced one hit and kept focus on the button. A full form tab sequence showed no trap. Reduced motion set tested motion durations to 0.01 ms. At a simulated 200% root text size, the 390-pixel page had no horizontal overflow.

The normal sample rendered four realistic hits. Missing required values showed an actionable error. Equal identifiers showed an error and focused the new-identifier field. No-match input showed the cautious empty state. A later valid external sample recovered to two hits and two human-confirmation notices. JSON and CSV downloads contained two evidence rows. The demo flow made no cross-origin request and left local storage unchanged.

The service worker controlled the page, found no waiting update, and served a 390-pixel offline reload with HTTP 200, the correct title, visible main content, the offline notice, and no console errors. An invalid return license was removed from the URL, stored under the product key, checked only at the approved Sociobot endpoint, and left the paid download disabled.

Lighthouse 12.8.2 mobile completed after installing its matching Chromium: performance 99, accessibility 100, FCP 1.1 s, LCP 1.8 s, total blocking time 0 ms, CLS 0, and Speed Index 1.1 s. Built assets are 6,440-byte JS, 11,514-byte CSS, 192,734-byte WebP, and no font files.

### Live identity, privacy, links, and response policy

The live `index.html`, JavaScript, CSS, hero image, and service worker match the clean build byte for byte. The live page uses valid HTTPS. JavaScript, CSS, and WebP return `public, max-age=31536000, immutable`; HTML, legal pages, and the service worker return `public, max-age=0, must-revalidate`. CSP, HSTS, frame denial, nosniff, referrer, and permissions headers are present.

Clean page and demo requests stayed on the product origin. The only exercised cross-origin application call was the explicit license check to `api.sociobot.in`. Privacy and Terms return 200 with distinct correct titles. The source link returns 200. Mail links are explicit. The checkout link is the broken link in F-02.

This is a static site plus a local CLI. There is no product backend, tenant store, or server-side product state, so tenant isolation, SQLite restart persistence, health, and 429/`Retry-After` checks do not apply.

## Earlier review findings

| Earlier item | Current disposition | Evidence |
| --- | --- | --- |
| Invalid certificate and unrouted site in `.factory/verification.md` | Fixed | Normal HTTPS succeeds and serves the product. |
| Hashed assets lacked immutable caching in `.factory/verification-2.md` | Fixed | Live JS, CSS, and WebP return a one-year immutable policy. |
| CSP and frame protection hardening note in `.factory/verification-2.md` | Fixed | Live CSP has `frame-ancestors 'none'`; `X-Frame-Options: DENY` is present. |
| Lighthouse could not complete in `.factory/verification-3.md` and the prior handoff | Fixed as a verification gap | A matching browser completed with performance 99 and accessibility 100. |

The earlier reports did not identify F-01 through F-07. Their prior PASS does not override this review's stricter attached contracts and fresh live evidence.

## Evidence locations

- Desktop first screen: `/work/.evidence/live-desktop-first-screen.png`
- Phone first screen: `/work/.evidence/live-phone-first-screen.png`
- Factory URL verifier: `/work/.evidence/verify-url/verify.json`
- This report copy: `/work/.evidence/qa-report.md`
- Machine result: `/work/.evidence/qa-result.json`

