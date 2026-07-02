# LINEAR-ALGEBRA-NAMED-INPUTS1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

Passed:

- `npx vitest run src/lib/navigation/menu.test.ts src/lib/linear-algebra/vector.test.ts src/lib/modes/vector.test.ts`
- `npx vitest run --config vitest.ui.config.ts src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx`
- `git diff --check -- src/app/workspaces/VectorWorkspace.tsx src/lib/navigation/menu.ts src/lib/modes/vector.ts src/lib/linear-algebra/vector.ts src/lib/linear-algebra/vector.test.ts src/lib/modes/vector.test.ts src/types/calculator/runtime-types.ts src/lib/guide/content/selectors.ts src/lib/navigation/menu.test.ts src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx .memory/current-state.md .memory/decisions.md .memory/journal/2026-07/2026-07-02.md .memory/sessions/2026-07/2026-07-02/2026-07-02__linear-algebra-named-inputs1`

Known unrelated verification blockers:

- `npm run test:file-sizes` fails because concurrent dirty work has `src/lib/equation/numeric-domain-segmentation.ts` at 928 lines over its 900-line cap. This file was not changed for `LINEAR-ALGEBRA-NAMED-INPUTS1`.
- `npm run test:memory-protocol` passed once for this checkpoint, then a concurrent dirty calculus session dossier appeared and the current global command fails because `.memory/sessions/2026-07/2026-07-02/2026-07-02__calculus-limits-ui-polish1/commit-log.md` is missing `primary_agent`. That dossier was not changed for `LINEAR-ALGEBRA-NAMED-INPUTS1`.
- `npx tsc -b --pretty false` fails in concurrent, unrelated dirty Equation test work: `src/lib/modes/equation/numeric-card-credibility-polish.test.ts` reads `detailSections` on unconstrained `DisplayOutcome` and has implicit `any` callback parameters. This file was not changed for `LINEAR-ALGEBRA-NAMED-INPUTS1`.

## Coverage Notes

- `menu.test.ts` proves the Vector overlay exposes `u` and `v` keys and no longer exposes stale `linear-vector-a`.
- `vector.test.ts` proves stop messages use `u`/`v`.
- `vector.test.ts` under modes proves existing operation IDs still run while readback titles use `u`/`v`.
- `LinearAlgebraEditorSource.ui.test.tsx` proves Vector shows `Vector u` and `Vector v`, hides the old secondary notation pad, and keeps the main editor source active.
