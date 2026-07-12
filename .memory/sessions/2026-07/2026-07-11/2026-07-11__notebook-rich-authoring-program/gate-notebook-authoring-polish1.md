# NOTEBOOK-AUTHORING-POLISH1 Gate

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
- status: passed
- date: 2026-07-12

## Verified Behavior

- All twelve approved academic containers render through one app-owned semantic catalog; optional labels/numbers and Hint/Answer collapse remain author controlled.
- The left rail distinguishes section headings from nested academic anchors, remains scrollable when crowded, and supports drag/drop plus accessible Move Up/Down.
- The three-column desktop frame becomes mutually exclusive outline/inspector drawers near 1,100 pixels without adding an internal document-tab system.
- The Notebook-owned keyboard docks inside the canvas, keeps the active MathLive field and quick template toolbar clear, and does not change shared calculator MathLive behavior.
- UI scale and high contrast affect Notebook content while the page frame remains stable at 80% and 130%.

## Evidence

- `npx vitest run src/lib/notebook`: 28 passed.
- Focused Notebook/page-host UI suite: 43 passed.
- `npx playwright test e2e/notebook-rich-authoring.spec.ts --project=chromium`: 2 passed after a production build.
- Dependency-license audit: passed; exact official Tiptap pins remain permissively licensed.
- Targeted Notebook ESLint, `npx tsc -b --pretty false`, `npm run build`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check`: passed.
- Chromium visual sweep: 2,400 by 1,200; 1,440 by 1,000; 1,100 by 900; high contrast; and 80%/130% UI scale, with zero console errors and zero horizontal overflow.
- Stress trace: 100 blocks and 150 inline MathLive nodes, no console errors, no horizontal overflow, and trace evidence for load, typing, selection, and scrolling under `.task_tmp/NOTEBOOK-AUTHORING-POLISH1/`.
- Side-by-side source comparison: `.task_tmp/NOTEBOOK-AUTHORING-POLISH1/reference-comparison.png` pairs the approved mock with the live Notebook at the same reference size.

## Shared-Tree Boundary

- Only Notebook source, styles, tests, this program's durable-memory artifacts, and its manual checklist belong to this commit.
- Concurrent History/Display contract, CI workflow, package/tooling, calculator runtime, and untracked `test-results/` changes remain excluded.
