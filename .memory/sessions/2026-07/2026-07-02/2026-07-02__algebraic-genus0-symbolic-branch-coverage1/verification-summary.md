## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend
- milestone: `ALGEBRAIC-GENUS0-SYMBOLIC-BRANCH-COVERAGE1`

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus0-symbolic-branch-coverage.test.ts`
  - initial run: failed one display-shape assertion because affine radical readback normalized `(a*x+b)^(3/2)` as `sqrt(a*x+b)^3`; behavior was already successful.
- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus0-symbolic-branch-coverage.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-rational-in-radical.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-standard-radicals.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-inverse-readback.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-pullback.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-parametrization.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-profile.test.ts`
  - passed: 8 files, 41 tests.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - passed: 3 files, 97 tests.
- `npx tsc -b --pretty false`
  - passed.
- `node tools/validate-file-sizes.mjs`
  - passed.
- `npm run test:memory-protocol`
  - passed after durable-memory additions.
- `git diff --check`
  - passed after durable-memory additions.

## Notes

The live symbolic slice is intentionally centered and branch-explicit. General symbolic quadratic radical completion is still deferred because it needs a larger branch/casewise readback layer rather than a local formula shortcut.
