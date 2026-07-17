# NOTEBOOK-PUBLICATION-PARITY1 verification summary

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
- gate_type: backend
- date: 2026-07-16

## Scope

- Added optional derived floating fragments to `NotebookPublicationLayoutV1` and strict publication-layout validation for those fragments.
- Passed live Notebook pagination floating fragments into PDF, DOCX, and Web export dialogs instead of freezing only flow fragments.
- Rendered PDF/print floating objects with page-coordinate layers from the authoritative paginated layout, including recursive node lookup for nested Sections and academic containers.
- Kept Web and DOCX honest: they preserve safe ordered-flow/editable fallbacks, point-sized image geometry where supported, and emit explicit compatibility findings for floating objects.
- Preserved the Schema 14 video-removal boundary; no video export behavior was reintroduced.

## Evidence

- `npx tsc -b --pretty false --incremental`
- `npx eslint src/app/shell/NotebookPage.tsx src/app/shell/notebook/publication/NotebookPrintProjection.tsx src/lib/notebook/publication/types.ts src/lib/notebook/publication/projection.ts src/lib/notebook/publication/web.ts src/lib/notebook/publication/docx.ts src/lib/notebook/publication/projection.test.ts src/lib/notebook/publication/web.test.ts src/lib/notebook/publication/docx.test.ts`
- `npx vitest run src/lib/notebook/publication/projection.test.ts src/lib/notebook/publication/web.test.ts src/lib/notebook/publication/docx.test.ts --maxWorkers=4`
- `npm run test:memory-protocol`
- `node tools/validate-file-sizes.mjs`
- `git diff --check`

## Notes

- This gate intentionally does not add a second Web page-layout engine. PDF/print consumes physical page coordinates; Web and DOCX remain publication projections with compatibility findings where exact floating layout cannot be represented safely.
- Unrelated Linear Algebra, Calculus, symbolic-engine, result-contract, untracked media-removal dossier, and `test-results/` work remains outside this commit.
