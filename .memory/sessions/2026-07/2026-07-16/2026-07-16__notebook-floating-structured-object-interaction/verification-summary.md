# NOTEBOOK-FLOATING-STRUCTURED-OBJECT-INTERACTION1 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- gate_id: `NOTEBOOK-FLOATING-STRUCTURED-OBJECT-INTERACTION1`
- gate_type: ui
- scope: forward slice of `NOTEBOOK-FLOATING-OBJECT-INTERACTION1-REBASE`

## Outcome

- Supported structured block drag from flow into visible Print Layout sheet whitespace for floating placement.
- The slice covers floating-eligible non-image structured objects through the shared block pointer path: display equations, evidence snapshots, dividers, Sections, and academic containers.
- Existing flow reordering, inside-section moves, and Outline movement remain under the existing document move commands.
- Added a viewport-level `Float here` block guide and extracted the block floating/ghost helpers into `NotebookFloatingBlockInteraction.ts` so the coordinator remains below the file-size ratchet.

## Evidence

- `npx eslint src/app/shell/notebook/canvas/NotebookDirectMediaCanvasCoordinator.ts src/app/shell/notebook/canvas/NotebookFloatingBlockInteraction.ts e2e/notebook-block-drag.spec.ts` — passed.
- `git diff --check -- src/app/shell/notebook/canvas/NotebookDirectMediaCanvasCoordinator.ts src/app/shell/notebook/canvas/NotebookFloatingBlockInteraction.ts e2e/notebook-block-drag.spec.ts src/styles/app/notebook-rich-canvas.css` — passed.
- `wc -l src/app/shell/notebook/canvas/NotebookDirectMediaCanvasCoordinator.ts src/app/shell/notebook/canvas/NotebookFloatingBlockInteraction.ts` — coordinator is 990 lines; helper is 251 lines.
- `npx tsc -b --pretty false --incremental` — passed.
- `npx vite build` — passed.
- `npx playwright test e2e/notebook-block-drag.spec.ts --grep "one pointer path"` — passed.
- `npx playwright test e2e/notebook-block-drag.spec.ts --grep "floating structured object"` — passed after the helper extraction and production rebuild.

## Blockers and exclusions

- `node tools/validate-file-sizes.mjs` remains blocked by unrelated dirty Calculus growth: `src/lib/calculus/engine/trig-power-identities.ts` has 1069 lines over the 1000-line cap.
- `test-results/` remained unstaged and excluded.
- No video behavior was reintroduced.
- No push was authorized or performed.
