# `NOTEBOOK-TRANSIENT-CHROME-REPAIRS1` — UI Gate

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

## Delivered

- Added one small `NotebookFloatingLayer` body portal for ribbon, picture, layout, selection, template, Section, and Math Authoring transient menus.
- Placement is fixed to the viewport, flips above the trigger when appropriate, clamps horizontally, and caps/scolls oversized menus without changing coordinator-owned Escape, outside-dismissal, selection restoration, or focus behavior.
- Replaced the duplicated internal product-name strip with the current Notebook title and an `Opening Notebook…` loading label. The outer application title is unchanged.
- Renamed Section actions to `Make subsection` and `Promote section`; unavailable hierarchy actions are disabled with truthful tooltips.
- Selecting a just-inserted math node now hydrates and focuses it before the Math Authoring surface opens, fixing the narrow viewport race used by the Math Authoring exclusion path.

## Evidence

- `npx vitest run --config vitest.ui.config.ts src/app/shell/notebook/canvas/selection.ui.test.ts src/app/shell/notebook/transient-ui/NotebookTransientLayerProvider.ui.test.tsx src/app/shell/NotebookPage.ui.test.tsx` — 34 passed.
- `npx tsc -b --pretty false` — passed.
- Focused Notebook/E2E ESLint — passed.
- `npm run test:file-sizes` — passed.
- `git diff --check` — passed.
- `npx playwright test e2e/notebook-ribbon-tabs.spec.ts e2e/notebook-page-layout.spec.ts --project=chromium` — 4 passed, covering 2400px, 1440px, 1100px, 80%, 130%, forced colors, Math Authoring coexistence, and viewport containment.
- Manual Chromium inspection at 1100px confirmed the academic-container menu is body-portaled at `left: 8px`, fully visible (`right: 294px`, `top: 423px`, `bottom: 797px`), and not clipped by the ribbon.
- The local Vite evidence server was stopped after capture. `test-results/` stays untracked and excluded.

## Commit

- Candidate commit scope: only Notebook source, tests, styles, this session dossier, current state, decisions, and journal updates.
- Standing user approval for all four repair-gate commits was recorded on 2026-07-14.
- This verified gate is committed by the checkpoint containing this entry.
