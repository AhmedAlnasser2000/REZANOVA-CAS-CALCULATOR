# NOTEBOOK-GESTURE-RATCHET1 verification summary

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
- gate_type: ui
- date: 2026-07-16

## Scope

- Added the focused `test:notebook-gesture-ratchet` command for Notebook direct image geometry, floating document validation, floating pagination, persistence round trips, publication projections, and focused floating layer-order UI behavior.
- Added seam-impact selector coverage so Notebook authoring, publication, style, and Notebook E2E path changes select the focused ratchet while retaining baseline CI requirements.
- Added a direct-media regression assertion for width-only image shrinking so the selected box cannot remain at the stale pre-shrink width.
- Added a narrow floating-layer UI ratchet that validates layer-order normalization and preserved selected object without depending on unrelated broad arrangement coverage.

## Evidence

- `npm run test:notebook-gesture-ratchet`
- `npm run test:seam-impact-selector`
- `npx tsc -b --pretty false --incremental`
- `npx eslint package.json tools/seam-impact-registry.mjs tools/seam-impact-selector.test.mjs src/app/shell/notebook/canvas/NotebookDirectMediaInteraction.test.ts src/app/shell/notebook/canvas/NotebookFloatingLayerRatchet.ui.test.ts`
- `npm run test:memory-protocol`
- `node tools/validate-file-sizes.mjs`
- `git diff --check`

## Notes

- The broad existing `src/app/shell/notebook/canvas/selection.ui.test.ts` file was not added to the ratchet command because an unrelated arrangement assertion currently fails when the whole file is run directly. This gate instead adds a focused floating-layer test for the intended layer-order behavior.
- This gate adds no new document schema, UI feature surface, video support, or interaction coordinator.
- Unrelated Linear Algebra, Calculus, symbolic-engine, result-contract, untracked media-removal dossier, and `test-results/` work remains outside this commit.
