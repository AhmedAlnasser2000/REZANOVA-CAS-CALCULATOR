# NOTEBOOK-INLINE-MATH-CANVAS1 Gate

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

- The live page migrates or creates an app-owned version-2 Notebook document and keeps Tiptap runtime state behind an internal adapter.
- One canvas supports prose, marks, headings, lists, undo/redo, evidence placeholders, and selected inline/display MathLive node views.
- Likely-math detection is suggestion-only; conversion requires explicit author acceptance and preserves source text.
- Inline/display conversion is bidirectional, MathLive focus keeps the correct inspector target, and only supported runnable math enables `Open in Tool`.
- The custom Notebook keyboard and global calculator MathLive behavior remain unchanged.

## Evidence

- `npx vitest run src/lib/notebook`: 25 passed.
- `node --test src/lib/notebook/dependency-licenses.test.mjs`: 1 passed.
- Focused Notebook/page-host UI suite: 21 passed.
- Targeted Notebook ESLint: passed.
- `npx tsc -b --pretty false`: passed.
- `npm run test:file-sizes`: passed for 1,701 files.
- `git diff --check`: passed before memory catch-up; rerun at commit checkpoint.
- Chromium at 1,487 by 1,058: zero console errors and zero horizontal overflow.
- Visual comparison: `.task_tmp/NOTEBOOK-INLINE-MATH-CANVAS1/reference-comparison.png` pairs the approved mock with the live worked-example surface; remaining density, academic-container controls, reordering, and responsive drawers belong to `NOTEBOOK-AUTHORING-POLISH1`.

## Shared-Tree Boundary

- Only Notebook source, styles, tests, and this program's durable-memory artifacts belong to this commit.
- Result-contract, Equation, calculator result-type, worker, ratchet, package, and untracked `test-results/` files remain excluded.
