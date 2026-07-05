## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

- `npx vitest run src/lib/linear-algebra/runtime-request.test.ts`
  - passed: facade canonicalization, active Matrix/Vector request building, and handoff type.
- `npx vitest run src/lib/linear-algebra/runtime-request.test.ts src/lib/linear-algebra/editor-dispatch-named-values.test.ts`
  - passed: facade plus named-dispatch regression.
- `npm run test:compartments-boundaries`
  - passed: Linear Algebra facade allowed and private app-runtime imports rejected.
- `npm run test:ooe-boundaries`
  - passed: OOE import graph still valid.
- `npx tsc -b --pretty false`
  - passed.
- `npm run build`
  - passed with existing bundle/chunk warnings.
- `npx playwright test e2e/linear-algebra-paste-naturalization.spec.ts --grep "keyboard paste naturalizes Matrix|Vector paste naturalizes"`
  - passed: Matrix pasted eigen and Vector pasted Gram-Schmidt visible readback smoke.
- `git diff --check`
  - passed.

## Known External Blocker

- `npm run test:file-sizes` fails outside this lane because `src/lib/symbolic-engine/limits/mrv-lite.ts` has 1016 lines over its 900-line cap. This file is not modified by `LINEAR-ALGEBRA-RUNTIME-PUBLIC-SEAM1`.
