# NOTEBOOK-PAGE-LAYOUT1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- milestone: `NOTEBOOK-PAGE-LAYOUT1`
- kind: ui
- status: verified
- approval: standing user approval recorded on 2026-07-14
- push_authorization: none

## Implemented Contract

- Notebook rich documents advance from V7 to strict V8 with continuous V1-V8 migration, canonical point-based page setup, simple document-wide headers and footers, configurable page numbering, and an explicit top-level page-break node.
- Print Layout is the per-tab default and Draft is the continuous performance view. Derived physical pages, fragments, measurement offsets, and page counts are never serialized.
- Pagination retains one Tiptap editor and one selection/undo model. Headings stay with the next eligible block, Sections and large academic containers can split, and oversized math/media fit proportionally instead of clipping.
- Layout owns paper, orientation, preset/custom margins, running matter, numbering, page-break insertion, and Print/Draft controls through the Notebook transient coordinator. The status bar reports `Page X of Y`, word count, and save state.
- The Layout ribbon wraps cleanly at constrained widths, reserves space for its popovers, and uses readable dark select fields with visible values and native options. Forced-colors mode returns those fields to system colors.

## Verification Evidence

- Focused Notebook model evidence passes 22 files and 115 tests, including V7-to-V8 migration, strict validation, adapter round trips, all paper/orientation/margin combinations, explicit breaks, keep-with-next, split containers, and oversized-object fitting.
- Focused Notebook UI passes 27 cases for selection preservation, document-attribute undo/redo, page breaks, Print/Draft state, and the existing authoring surface.
- Rust Notebook storage passes 9 focused tests for V8 validation, current-version persistence, V6/V7 migration defaults, and top-level page-break rules.
- Dedicated Chromium evidence passes at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. It verifies V8 IndexedDB state, one-editor pagination, headers/footers/numbering, responsive page geometry, contained popovers, Math Authoring exclusion, and Draft/Print switching.
- A post-evidence visual correction gives Layout icons deliberate spacing and readable select values; the dedicated two-case Chromium page-layout gate passes again, and the final 1100px dark and 130% forced-colors screenshots were inspected.
- Notebook-scoped ESLint, file-size validation, exact-patch production build, and diff hygiene pass. Shared-checkout TypeScript is blocked only by concurrent Canonical Result V2 files outside Notebook ownership; `npm run build` passes from clean `12a91729` with exactly the staged Notebook patch.
- No full unit, UI, or canary suite ran. Untracked `test-results/` and concurrent solver/result-contract files remain excluded.

## Handoff

- `NOTEBOOK-IMAGE-LAYOUT1` is the next gate.
- V8 page geometry is now the sole basis for image wrapping in editing, print projection, and later publication adapters.
