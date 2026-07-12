# NOTEBOOK-AUTHORING-KEYBOARD1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: terra
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: terra
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: terra
- attribution_basis: live

## Gate

- gate_kind: ui
- status: passed with one external shared-tree blocker
- date: 2026-07-12

## Verified Behavior

- The keyboard renders only while a Notebook-owned math field is active.
- Search and seven curated categories expose beginner-friendly math templates through the active-field coordinator.
- Pointer interaction preserves math-field ownership and insert/command calls refocus the active MathLive field.
- Document-only notation remains authorable but disables `Open in Tool`; hidden unsafe entries do not enter the visible registry.
- The built-in MathLive keyboard layout and shared calculator MathEditor remain untouched.

## Evidence

- `npm run test:unit -- src/lib/notebook/authoring-keyboard/registry.test.ts`: 3 passed.
- `npm run test:ui -- src/app/shell/notebook/math-field/NotebookMathField.ui.test.tsx src/app/shell/notebook/authoring-keyboard/NotebookAuthoringKeyboard.ui.test.tsx src/app/shell/NotebookPage.ui.test.tsx`: 12 passed.
- Targeted ESLint over the keyboard registry and UI: passed.
- `npx tsc -b --pretty false`: passed.
- `git diff --check`: passed before memory catch-up; rerun at commit checkpoint.
- `npm run test:file-sizes`: externally blocked because concurrent `src/types/calculator/runtime-types.ts` is 1,342 lines against its 1,341-line cap. Notebook source is not the failing path.

## Shared-Tree Boundary

- Result-contract, Equation producer, worker-client, replay-fixture, calculator result-type, and ratchet-tool changes belong to another active lane and are excluded from this commit.
- `package.json` changed concurrently after the approved Tiptap package commit and is excluded.
- Untracked `test-results/` remains excluded.
