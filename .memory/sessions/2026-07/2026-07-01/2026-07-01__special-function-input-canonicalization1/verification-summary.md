# SPECIAL-FUNCTION-INPUT-CANONICALIZATION1 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Focused Verification
- `npx vitest run src/lib/input/input-canonicalization.test.ts`
  - Result: pass, 25 tests.
- `npm run test:ui -- src/components/MathEditor.ui.test.tsx src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx`
  - Result: pass, 2 files / 19 tests.
- `npm run test:ui -- src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx`
  - Result: pass, 1 file / 5 tests.

## Final Gate Verification
- `npx vitest run src/lib/input/input-canonicalization.test.ts src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 5 files / 131 tests.
- `npm run test:ui -- src/components/MathEditor.ui.test.tsx src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx`
  - Result: pass, 3 files / 24 tests.
- `npx tsc -b --pretty false`
  - Result: blocked by unrelated active Surface/Surface Protocol lane errors:
    - `src/app/shell/ActiveSurfaceHost.ui.test.tsx(23,5): Type '"latex"' is not assignable to type 'DisplayBlockRenderKind'.`
    - `src/lib/surface-protocol/dto.test.ts(64,28): 'advisories' does not exist in type 'RuntimeAdvisories'.`
    - `src/lib/surface-protocol/spec-examples.test.ts(1,30): Cannot find module 'node:fs' or its corresponding type declarations.`
  - Action: not edited or staged for this milestone.
- `node tools/validate-file-sizes.mjs`
  - Result: pass after extracting special-function canonicalization into `src/lib/input/function-canonicalization.ts`.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check`
  - Result: pass.

## Notes
- The first Integral UI test attempt exposed that actual Calculus integral screens use camelCase hints such as `indefiniteIntegral`; the canonicalization detector now covers those live screen ids.
- Shared current-state/journal/decisions memory files remain unstaged because they contain unrelated active Surface/workspace lane hunks.
