# Visual thesis: the migration herbarium

Identity Migration Map is a botanical field guide for a risky technical expedition. A user identifier is treated like a root specimen: visible at the surface, but connected to runners, grafts, and soil records below. The interface borrows the calm precision of pressed-plant folios—specimen labels, ruled annotations, ink diagrams, and warm paper—without becoming nostalgic decoration. Every botanical element explains dependency, provenance, or human verification.

## Palette

The site is deliberately single-mode, like one physical field notebook whose paper is always explicitly painted.

| Token | Hex | Use |
| --- | --- | --- |
| `paper` | `#F3EEDC` | canvas, aged field paper |
| `paper-deep` | `#E5DDC4` | recessed regions and ruled sections |
| `ink` | `#17251F` | primary text (13.2:1 on paper) |
| `fern` | `#285945` | primary actions and branch lines |
| `fern-dark` | `#173C2D` | hover and high-emphasis controls |
| `lichen` | `#A8B99D` | quiet fills, never small text |
| `clay` | `#A94D32` | warnings, unresolved dependencies |
| `ochre` | `#B97818` | human-confirmation markers |
| `white` | `#FFFDF5` | contrast text and specimen cards |

Body text and interactive combinations meet WCAG AA. State is always paired with text, shape, or iconography; color is not the only signal.

## Typography

- Headings: Georgia, `Times New Roman`, serif. The broad, bookish forms evoke taxonomic plates and distinguish the product from developer-dashboard sans serif.
- Interface and prose: system UI, with tabular figures for evidence counts and CLI output.
- Scale: 16px body; 18, 22, 30, 48–72px steps. Reading measure stays between 45 and 72 characters.

No font files are downloaded, keeping the offline artifact private and fast.

## Spacing and geometry

An 8px base rhythm with 4px for tight label relationships. Page gutters are 20px on phone, 40px on tablet, and 64px on wide screens. Specimen panels use asymmetric corners (2px/22px) and deliberate offset shadows like stacked index cards. Fine 1px rules appear only where they communicate a record boundary. Touch targets are at least 44px.

## Interaction grammar

- Primary actions resemble dark inked catalogue tabs; secondary actions are underlined annotations.
- The interactive demo follows one linear field procedure: declare old identifier, supply an excerpt, inspect dependencies. Results appear as specimen records with source, line, owner, and next action.
- Status marks use leaf, warning diamond, and ledger motifs with visible labels.
- Keyboard focus is a 3px ochre ring offset from the target.
- Offline and verification states live in the same page region as the action that triggered them.

## Motion

New evidence rises 8px and fades over 180ms, as if a specimen card were placed on the desk. Buttons compress by 1px on activation. Nothing loops or parallax-scrolls. With `prefers-reduced-motion: reduce`, transitions and transforms are removed and state changes are instant.

## Original asset plan and provenance

The hero is a generated editorial botanical plate: a branching root system becoming file paths, database rows, and connector tags. It contains no text, logos, or people, so the site supplies accessible semantic context. It will be generated with `/opt/fleet/lib/gen-image.sh` using the factory `factory-image` deployment, then converted locally to WebP at no more than 1600px and 300KB.

Final prompt:

> Use case: scientific-educational. Asset type: wide landing-page hero illustration. Primary request: an original botanical field-guide plate representing an identity migration dependency map. Scene: warm ivory archival paper. Subject: one carefully pressed fern-like plant whose central root label shape branches into fine roots that subtly transform into file path lines, small database-table grids, configuration braces, and external-integration connector nodes. Style: hand-inked 19th-century botanical engraving reinterpreted as a precise contemporary editorial illustration, fine crosshatching, flat pigments, no photorealism. Composition: landscape 3:2, the specimen centered with ample quiet paper around it; a few small numbered specimen markers but no letters or words. Palette: deep forest green, charcoal ink, muted lichen, sparing terracotta and ochre. Mood: calm, forensic, trustworthy. Constraints: no readable text, no logos, no gradients, no UI screenshot, no people, no watermark, no generic technology imagery; crisp silhouette at mobile size.

License/provenance: generated specifically for this repository on 2026-08-27 using the Param Factory image deployment; project-owned generated artwork under the repository MIT license. CSS-made leaf and ledger marks are original geometric decorations, not external assets.

## Why this fits

Renames fail when hidden roots are severed. The field-guide system makes observation, labeling, ownership, and safe handling feel like parts of one practice. It is specific to dependency inventorying rather than a generic security dashboard, and its physical-record metaphor remains legible in the CLI's Markdown reports.
