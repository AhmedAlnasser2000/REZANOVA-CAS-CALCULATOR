# NOTEBOOK-FLOATING-IMAGE-INTERACTION1 verification summary

- Date: 2026-07-16
- Gate type: ui
- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live
- contributors: none

## Scope

- Added the first direct floating-object interaction slice for images.
- Dragging an in-flow selected image into Print Layout page whitespace now creates a Schema 14 floating `objectPlacement` with a paragraph anchor when available, margin references, square wrapping, text-distance defaults, and next layer order.
- Normal flow reordering and left/normal/right wrap drops remain unchanged.
- This slice does not implement structured-object X/Y dragging, Objects & Layers, settings, or publication parity.

## Evidence

- `npx eslint src/app/shell/notebook/canvas/NotebookDirectMediaCanvasCoordinator.ts e2e/notebook-image.spec.ts` passed.
- `git diff --check -- src/app/shell/notebook/canvas/NotebookDirectMediaCanvasCoordinator.ts e2e/notebook-image.spec.ts src/styles/app/notebook-rich-canvas.css` passed.
- `npx vite build` passed so `vite preview` served current Notebook source.
- `npx playwright test e2e/notebook-image.spec.ts --grep "floating object"` passed after the fresh Vite build.
- `npm run test:memory-protocol` passed.

## Blocked / excluded evidence

- `npx tsc -b --pretty false --incremental` is blocked by unrelated dirty Calculus work in `src/lib/calculus/engine/integration.ts` where `IntegralResolution` has no `error` property on success variants.
- `npm run test:file-sizes` is blocked by unrelated dirty files over cap: `src/lib/calculus/engine/trig-power-identities.ts`, `src/lib/symbolic-engine/integration/dispatch.ts`, and `src/lib/symbolic-engine/integration/rational.ts`.
- `test-results/` remains untracked and excluded from staging.

## Next

- Continue `NOTEBOOK-FLOATING-OBJECT-INTERACTION1-REBASE` with structured-object floating gestures and an Objects & Layers view after this image-only slice is committed.
