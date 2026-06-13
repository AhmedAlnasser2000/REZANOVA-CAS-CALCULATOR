# Styles App Shell Surface Audit

Status: audit plus final decomposition record; selector relocation shipped in `STYLES-APP-SHELL-DECOMP1`

Purpose: map the `src/styles/app/` CSS surface and record the final shell decomposition. The decomposition moved selector blocks out of the large `shell.css` monolith while preserving Guide/Keypad ownership and avoiding component, runtime, and visual-design changes.

## Current Surface

- `src/App.css`: imports the app CSS layers in this order: `shell.css`, `display.css`, `workspace-common.css`, `side-surfaces.css`, `equation.css`, `trigonometry.css`, `statistics.css`, `geometry.css`, `guide.css`, `advanced-calc.css`, `linear-algebra.css`, `labs.css`, `keypad.css`.
- `src/styles/app/shell.css`: shell core for tokens, app frame, mode strip, soft menu, launcher, shared top-level button/control primitives, high-contrast/scaling variables, and root responsive shell layout.
- `src/styles/app/display.css`: display panel, editor runtime controls, math fields, preview/result cards, result readback, branches, large-result preview, and display-scoped transform tray selectors.
- `src/styles/app/workspace-common.css`: workspace/card/action/input/grid helpers, generated preview cards, shared topic-panel helpers, variable hints, table/range/grid helpers, shared `guide-chip*` primitives, and notation-pad shared helpers.
- `src/styles/app/side-surfaces.css`: history, settings, variables, left inspector, OOE diagnostics, overlay/outboard placement, and side-surface form/input behavior.
- `src/styles/app/labs.css`: labs/dev-only panel, runner, result, comparison, and editor selectors.
- `src/styles/app/guide.css`: 374 lines; real Guide extract for guide entries, route/search/article/list/display pieces, and Guide-owned menu surfaces.
- `src/styles/app/keypad.css`: 106 lines; real Keypad extract for keypad panel, key grid, key variants, and compact keypad behavior.
- `src/styles/app/equation.css`, `advanced-calc.css`, `trigonometry.css`, `statistics.css`, `geometry.css`, and `linear-algebra.css`: mode-owned panel/menu/copy/card selectors.

## Final Decomposition Record

- `STYLES-APP-SHELL-DECOMP1` filled the staged placeholders and added `side-surfaces.css` and `labs.css`.
- `shell.css` shrank from 3452 lines to the shell core and no longer owns display/result, workspace-common, side-surface, mode-panel, or labs selector families.
- Shared `guide-chip*`, `guide-chip-row`, `guide-related-links`, and notation-pad chip primitives moved to `workspace-common.css` as common UI primitives.
- `guide.css` and `keypad.css` were preserved as existing real extracts; no Guide-owned or Keypad-owned selectors were moved in this milestone.
- Mixed grouped selectors that could not be split without selector rewrites were moved to the safest shared home, usually `workspace-common.css` or `display.css`, with selectors kept intact.
- No file-size baseline update was required; all CSS files stayed under the default ratchet.

## Responsibility Map

- App shell keeps global tokens, app frame, mode strip, soft menu, launcher, shared top-level controls, and root responsive shell layout.
- Display/result lives in `display.css`.
- Shared workspace/card/action/input/grid helpers live in `workspace-common.css`.
- Side surfaces live in `side-surfaces.css`.
- Labs/dev-only styling lives in `labs.css`.
- Mode-owned panel/menu/card/copy selectors live in their matching mode CSS files.

## Existing Extract Boundaries

- `keypad.css` already owns keypad styling and should not be pulled back into `shell.css`.
- `guide.css` already owns Guide route/search/list/article/menu selectors and should remain the Guide-owned CSS home.
- Shared `guide-chip*`, `guide-chip-row`, `guide-related-links`, and notation-pad chip primitives now live in `workspace-common.css`.
- Former placeholder files are now active CSS ownership files.

## Safe Future Decomposition Order

The major shell decomposition is complete. Future CSS work should be visual QA, small ownership corrections, or deliberate redesign work rather than another broad shell split.

## High-Risk Contracts

- Import order is part of the cascade contract; do not reorder `src/App.css` during selector moves unless a separate visual regression pass authorizes it.
- Selector movement must be copy/move-only unless the milestone explicitly authorizes visual changes.
- Do not combine CSS decomposition with component rewrites, mode renames, Calculus naming changes, or runtime behavior changes.
- Keep `keypad.css` and `guide.css` ownership intact.
- Shared chip primitives are now common workspace primitives; do not move them back into Guide or shell without a dedicated common-style plan.
- Preserve focus-visible, hover, disabled, compact responsive, high-contrast, and scaling behavior during moves.

## Test Gates

- CSS ownership changes should run `npx tsc -b --pretty false`, focused UI smoke for affected surfaces, `npm run lint`, `npm run build`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check`.
- Display/result or mode panel changes should include the matching AppMain/runtime UI tests where practical.
- If a selector move changes screenshots or computed styles unexpectedly, stop and treat it as a visual-behavior change requiring a separate plan.

## Stop Rules

- Do not edit components or TypeScript as part of CSS ownership cleanup.
- Do not collapse active CSS ownership files back into `shell.css`.
- Do not move Guide-owned selectors out of `guide.css` or Keypad-owned selectors out of `keypad.css`.
- Do not treat selector naming alone as ownership; check actual component usage before moving shared selectors.
