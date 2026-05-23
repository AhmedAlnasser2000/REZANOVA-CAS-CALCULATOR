# TRACK-POLY-ELIM1 Manual Verification Checklist

Attribution:

- primary_agent: `codex`
- primary_agent_model: `gpt-5.5`

## What Is Achieved Now

- Added a bounded internal polynomial elimination core for scalar univariate resultants.
- Built Sylvester matrices from positive-degree same-variable exact polynomials.
- Computed exact resultants through the shared exact matrix determinant core.
- Added strict stops for zero polynomials, constant polynomials, variable mismatch, Sylvester dimension limits, and exact-matrix determinant/growth failures.
- Marked `polynomial-elimination-core` as `ready-with-adapter` in capability readiness.

## Manual App Steps

No manual app flow is expected.

This milestone is internal-only. Calculate, Equation, Matrix, Vector, Table, Labs, and Guide behavior should remain unchanged.

## Boundary Checks

- No Grobner basis engine was added.
- No bivariate or multivariate elimination was added.
- No Equation solver adoption was added.
- No Matrix UI exact behavior was added.
- No graphing, Labs runner, source-mirror execution, or copied external source was added.
- `test-results/` remains generated/untracked noise.

## Verification Commands

```bash
npm run test:unit -- src/lib/algebra/polynomial-elimination-core.test.ts src/lib/algebra/polynomial-core.test.ts src/lib/linear-algebra/exact-matrix-core.test.ts src/lib/algebra/capability-readiness.test.ts
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```

## Expected Result

- Resultant core tests pass for Sylvester matrix construction, integer/rational resultants, zero resultants, structured stops, and exact-matrix determinant stop propagation.
- Existing polynomial core and exact matrix core tests remain green.
- Capability readiness reports bounded polynomial elimination as internally available.
- Product behavior remains unchanged.
