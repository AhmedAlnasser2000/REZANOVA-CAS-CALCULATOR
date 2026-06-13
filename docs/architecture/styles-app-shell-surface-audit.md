# Styles App Shell Surface Audit

Status: audit-only in `STYLES-APP-SHELL-SURFACE-AUDIT0`

Purpose: map the current `src/styles/app/` CSS surface before future selector movement. This audit records ownership boundaries for the large `shell.css` monolith, the real Guide/Keypad extracts, and the staged placeholder files without changing import order, selectors, components, or visual behavior.

## Current Surface

- `src/App.css`: imports the app CSS layers in this order: `shell.css`, `display.css`, `workspace-common.css`, `equation.css`, `trigonometry.css`, `statistics.css`, `geometry.css`, `guide.css`, `advanced-calc.css`, `linear-algebra.css`, `keypad.css`.
- `src/styles/app/shell.css`: 3452 lines; owns app frame, tokens, editor/display/result styling, launcher, mode panels, side surfaces, labs, and most workspace/mode selectors.
- `src/styles/app/guide.css`: 374 lines; real Guide extract for guide entries, route/search/article/list/display pieces, and Guide-owned menu surfaces.
- `src/styles/app/keypad.css`: 106 lines; real Keypad extract for keypad panel, key grid, key variants, and compact keypad behavior.
- `src/styles/app/display.css`: placeholder only.
- `src/styles/app/workspace-common.css`: placeholder only.
- `src/styles/app/equation.css`: placeholder only.
- `src/styles/app/geometry.css`: placeholder only.
- `src/styles/app/advanced-calc.css`: placeholder only.
- `src/styles/app/linear-algebra.css`: placeholder only.
- `src/styles/app/statistics.css`: placeholder only.
- `src/styles/app/trigonometry.css`: placeholder only.

## Responsibility Map

- App shell should keep global tokens, app frame, mode strip, soft menu, shared button/control primitives, overlay placement, and root responsive layout.
- Display/result should move to `display.css` later: display panel, editor runtime controls, math fields, preview/result cards, result readback, branch lists, large-result previews, and display-scoped transform tray styling.
- Workspace-common should move to `workspace-common.css` later: mode workspace layout, editor cards, generic field groups, workspace action rows/buttons, grid helpers, generated preview cards, common input/focus rules, and shared notation-pad cards.
- Equation should move to `equation.css` later: equation preview copy, route/breadcrumb/badge styling, equation menu/work panels, numeric panel, polynomial/system/range grids, and equation branch cards.
- Advanced Calculus should move to `advanced-calc.css` later: advanced/core calculus panels, menus, provenance badges, calculus summaries, and calculus-specific polynomial preview pieces.
- Trigonometry, Statistics, and Geometry should move to their matching files later: panel/menu headers, generated preview accents, reference/summary/point cards, input grids, and mode-specific display shells/status badges.
- Linear Algebra should move to `linear-algebra.css` later: linear algebra panel copy, badges, info cards, matrix/vector/system grids, quick templates, and notation-pad layout that is not shared chip primitive styling.
- Side surfaces can either stay shell-adjacent or become a later side-surface slice: history, settings, variables, left inspector, OOE diagnostics, overlay/outboard placement, and side-surface inputs.
- Labs/dev-only styling can be isolated in a later labs slice after product-facing selectors are settled.

## Existing Extract Boundaries

- `keypad.css` already owns keypad styling and should not be pulled back into `shell.css`.
- `guide.css` already owns Guide route/search/list/article/menu selectors and should remain the Guide-owned CSS home.
- Shared `guide-chip*`, `guide-chip-row`, `guide-related-links`, and notation-pad chip primitives currently remain in `shell.css` because they are shared across Guide-adjacent surfaces and Linear Algebra notation helpers.
- Placeholder mode files are import-order anchors. They should receive moved selectors in future decomposition commits, not broad rewrites.

## Safe Future Decomposition Order

1. `STYLES-DISPLAY-RESULT-SPLIT1`
   - Move display/result selectors from `shell.css` into `display.css`.
   - Keep import order unchanged so cascade behavior is mechanically preserved.

2. `STYLES-WORKSPACE-COMMON-SPLIT1`
   - Move generic workspace/card/action/input/grid helpers into `workspace-common.css`.
   - Leave app frame, mode strip, and side surfaces in `shell.css`.

3. `STYLES-SIDE-SURFACES-SPLIT1`
   - Move history, settings, variables, left inspector, and OOE diagnostics selectors once display/workspace common pieces are stable.

4. Mode panel splits
   - Move Equation first, then Advanced Calculus, then Trigonometry/Statistics/Geometry, then Linear Algebra.
   - Keep Guide and Keypad as already-extracted surfaces unless a small common-style pass moves shared chip primitives.

5. Labs/dev-only split
   - Move labs selectors after product-facing CSS has clear homes.

## High-Risk Contracts

- Import order is part of the cascade contract; do not reorder `src/App.css` during selector moves unless a separate visual regression pass authorizes it.
- Selector movement must be copy/move-only unless the milestone explicitly authorizes visual changes.
- Do not combine CSS decomposition with component rewrites, mode renames, Calculus naming changes, or runtime behavior changes.
- Keep `keypad.css` and `guide.css` ownership intact.
- Shared chip primitives should stay in `shell.css` until a common-style milestone decides the shared destination.
- Preserve focus-visible, hover, disabled, compact responsive, high-contrast, and scaling behavior during moves.

## Test Gates

- CSS split commits should run `npx tsc -b --pretty false`, `npm run lint`, `npm run build`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check`.
- Display/result moves should include focused UI checks for AppMain display/result rendering where practical.
- Mode panel moves should include the matching runtime UI tests where practical.
- If a selector move changes screenshots or computed styles unexpectedly, stop and treat it as a visual-behavior change requiring a separate plan.

## Stop Rules

- Do not move selectors in `STYLES-APP-SHELL-SURFACE-AUDIT0`.
- Do not change CSS import order in this audit.
- Do not edit components or TypeScript as part of a CSS audit.
- Do not collapse placeholder files or remove them just because they are empty.
- Do not migrate shared Guide chip or notation-pad chip primitives without a common-style plan.
