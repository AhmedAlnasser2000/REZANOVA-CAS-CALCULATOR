# Design QA — REZANOVA website

Result: **PASS for the reviewable website prototype.** The owner has confirmed the calculator address; the separate marketing website address is pending. Publication has not been performed.

## Scope and reference

The approved English/Arabic desktop and tablet compositions are retained in `design-reference/`. The implementation follows their landscape-first hierarchy, welcome copy, blue/glass navigation, screenshot showcase and preview-status note. Source assets and optimized production images are included separately.

Browser review covered English and Arabic desktop layouts at 1440 CSS pixels, tablet layouts at 834 pixels, and an English laptop layout at 1024 pixels. Fixed-size same-origin review frames were used because this browser session did not expose a viewport-resize API. Review frames are not shipped in `public/` or the production build. The final preview is left on the actual English homepage.

## Visual evidence

The downloadable project includes these captures under `qa/` (local QA images are gitignored):

| Evidence                       | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `desktop-en.png`               | Final English desktop composition                   |
| `desktop-ar-final.png`         | Final Arabic desktop composition                    |
| `tablet-en.png`                | English tablet composition                          |
| `tablet-ar-final.png`          | Final Arabic tablet composition                     |
| `laptop-en.png`                | Intermediate-width layout check                     |
| `compare-desktop.png`          | English desktop reference/implementation comparison |
| `compare-tablet-en.png`        | English tablet reference/implementation comparison  |
| `compare-ar-desktop-final.png` | Arabic desktop reference/implementation comparison  |
| `compare-ar-tablet-final.png`  | Arabic tablet reference/implementation comparison   |
| `focused-ar-hero.png`          | Focused Arabic heading, spacing and CTA comparison  |

Reference and implementation images were normalized by width for comparison without stretching their aspect ratios. Tablet captures include unused space outside the review frame; that space is not part of the website.

## Corrections made

- Moved the desktop welcome copy and actions higher so actions sit clearly above the horizon.
- Replaced the square logo background with a transparent version of the original R mark.
- Reduced tablet hero height to bring the showcase into view sooner.
- Increased Arabic desktop display type and adjusted line spacing to match the intended hierarchy.

The authentic application screenshots have a taller aspect ratio than the generated mockups. Their contents are preserved rather than cropped to imitate invented UI. Extra screenshot context and preview limitations are intentional content additions. Landscape composition differs slightly because separate production scenery was created from the agreed art direction. Glass is made with static tint, gradients, highlights and borders; it is deliberately restrained to avoid live background blur.

## Verification

- `npm run check`: no errors, warnings or hints.
- `npm run build`: successful static output for six pages.
- `npm test`: four checks passed, covering localized document metadata, local links/fragments/assets, screenshot tabs/panels, and asset budgets.
- Both languages display correctly, including Arabic RTL layout and LTR application screenshots.
- No horizontal page overflow at the reviewed desktop, tablet and laptop widths.
- Screenshot tabs switch on click and support arrow keys, Home and End; Arabic navigation direction was checked.
- Language switching preserves the capabilities route and limitations fragment.
- Capabilities disclosure controls open and close.
- The browser-launch dialog opens on the actual page, and closes with its button or Escape.
- No website console errors were observed during interaction checks.
- Scenery remains static; feature entrances run once. Reduced-motion handling is implemented in CSS and JavaScript.

## Remaining limits and launch work

There are no unresolved high or medium severity visual issues within the reviewed prototype scope. Exact crop, glow and spacing can still be refined by preference.

**Before publishing:** set `PUBLIC_WEBSITE_URL` to the separate marketing website origin and pass `npm run check:launch`. The owner confirmed that `https://rezanova-cas.com/` is the calculator address; the launch dialog now links there. Preview pages omit absolute canonical metadata and carry noindex until the marketing origin is supplied. The original live-site lookup could not be retrieved in this environment; the link is based on the owner's explicit confirmation.

Real tablet hardware, browser zoom, a browser/device matrix, and reduced-motion OS emulation were not tested. No power-use or battery measurements were performed. The small-screen fallback does not claim to resolve the calculator application's existing touch, keyboard or responsive-layout issues. External downloads and a live browser calculator session were not exercised. Screenshots may differ from packaged releases, as the visible site notes.

This project is separate from the calculator. No calculator code, remote repository, production deployment or DNS configuration was changed.

## 17 September 2026 — expanded capabilities and history

Added bilingual long-form capabilities and history routes, chapter anchors, native source disclosures, active navigation states and a homepage history preview. Each of ten history entries has a summary paragraph followed by change bullets; the two changelog versions are visually distinguished from eight development milestones. Capability boundaries remain visible rather than hidden behind disclosures. No new client-side library or continuous animation was introduced.

Research and source conflicts are documented in `CONTENT-SOURCES.md`. The calculator repository was read only. Replaced the old Notebook homepage implication of graph embedding with the supported writing/math/image description. Latin input syntax uses bidirectional isolation so `@name` and `var(name)` remain readable in Arabic.

Browser review covered desktop English/Arabic history, Arabic capabilities in an 834px review frame, and English history at the same tablet width. Checked capability/history navigation, the v0.2.0 fragment, native source disclosure, and language switching with a preserved history path and fragment. Tablet document width and scroll width both measured 819px (834px frame minus scrollbar), with no horizontal overflow. New evidence lives in `qa/history-en.jpg`, `qa/history-ar.jpg`, `qa/history-en-tablet.jpg`, and `qa/capabilities-ar-tablet.jpg`. Initial screenshots precede the small bidi-isolation correction; the corrected DOM was inspected for isolated input tokens. These checks do not certify the calculator's mathematical behavior or hardware compatibility.

Final expanded-site verification: Astro check reports 0 errors/warnings/hints; static build emits 8 pages; all four automated checks pass across both locales, including the new history routes. The temporary review harness was removed from public assets before the final build. Desktop capability detail and the expanded homepage were visually inspected in `qa/capabilities-en-matrix.jpg` and `qa/home-expanded.jpg`.
