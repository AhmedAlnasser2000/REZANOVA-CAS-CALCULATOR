# TRACK-EXACT-LINEAR-ALGEBRA1 Manual Verification Checklist

Attribution:

- primary_agent: `codex`
- primary_agent_model: `gpt-5.5`

## What Is Achieved Now

- Added a bounded internal exact rational matrix core.
- Supported exact determinant, RREF/rank, square solve, and inverse for small capped matrices.
- Reused existing number-backed `ExactScalar` values with strict dimension and scalar-growth stops.
- Migrated rational-function partial-fraction coefficient solving to the shared exact core.
- Marked exact linear algebra readiness as `ready-with-adapter`.

## Manual App Steps

No manual app flow is expected.

This milestone is internal-only. Calculate, Equation, Matrix, Vector, Table, and Labs should behave as before.

## Boundary Checks

- No Matrix UI exact mode was added.
- No Equation symbolic linear-system feature was added.
- No resultants, Grobner, polynomial elimination, graphing, Labs runner work, source-mirror execution, or copied source was added.
- Existing numeric Matrix/Vector behavior should remain unchanged.
- `test-results/` remains generated/untracked noise.

## Verification Commands

```bash
npm run test:unit -- src/lib/linear-algebra/exact-matrix-core.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/capability-readiness.test.ts src/lib/linear-algebra/matrix-core.test.ts src/lib/linear-algebra/vector-core.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/linear-algebra/vector.test.ts src/lib/symbolic-engine/integration.test.ts
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```

## Expected Result

- Exact core tests pass for shape stops, determinant, RREF/rank, solve, inverse, and growth caps.
- Rational-function partial-fraction readiness remains stable after the solver migration.
- Capability readiness reports exact linear algebra as internally available.
- Product Matrix/Vector and symbolic integration regressions stay green.
