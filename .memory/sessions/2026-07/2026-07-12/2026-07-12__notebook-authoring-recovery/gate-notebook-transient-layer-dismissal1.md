# NOTEBOOK-TRANSIENT-LAYER-DISMISSAL1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- gate_kind: ui
- status: passed
- date: 2026-07-12

## Verified Behavior

- Notebook starter-template, academic-container, section-action, and narrow-drawer layers share one local coordinator.
- Unrelated roots are mutually exclusive; child layers retain their parent chain.
- One non-repeated Escape closes one top layer and restores focus to its trigger.
- Held Escape cannot cascade, outside pointer input closes the active chain, and the Notebook tab remains open.
- Permanent desktop outline and inspector panes are unaffected when not acting as drawers.

## Evidence

- `NotebookTransientLayerProvider.ui.test.tsx`: 3 passed for sibling exclusion, nested Escape/repeat handling, and outside dismissal.
- `NotebookPage.ui.test.tsx`: 12 passed with existing authoring, hierarchy, drawer, and math behavior intact.
- `npx tsc -b --pretty false`: passed.
- `npm run build`: passed with existing chunk-size and mixed static/dynamic import warnings only.
- Chromium `Notebook dismisses one transient layer per Escape without closing the document`: passed at 1,100 by 900.

## Shared-Tree Boundary

- Only Notebook page/components/tests/browser evidence and this program's memory hunks belong to this commit.
- App-wide menus, active output-inversion/result-document files, and untracked `test-results/` remain excluded.
