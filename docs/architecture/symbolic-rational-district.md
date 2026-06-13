# Symbolic Rational District

Status: shipped in `SYMBOLIC-RATIONAL-DISTRICT-SPLIT1`

Purpose: record the structure-only split of Symbolic Engine rational normalization while preserving the public `src/lib/symbolic-engine/rational.ts` facade and all existing rational simplify/factor/LCD behavior.

## Final Shape

- `rational.ts` is the public compatibility facade.
- `rational/types.ts` owns public rational result contracts and private scalar/term contracts.
- `rational/scalars.ts` owns exact integer/rational scalar arithmetic and scalar node reads.
- `rational/latex.ts` owns repeated-variable Latex compaction.
- `rational/factors.ts` owns factor-map cloning, merging, scaling, and coefficient node assembly.
- `rational/parsing.ts` owns variable detection, affine/atomic support checks, and rational-term parsing.
- `rational/assembly.ts` owns LCD assembly, cancellation, polynomial rational-function fallback, exclusions, and factor-mode helpers.
- `rational/api.ts` owns public AST/Latex entrypoints and result assembly.

## Preserved Contracts

- Public exports remain `RationalNormalizationResult`, `normalizeExactRationalNode`, and `normalizeExactRationalLatex`.
- Simplify, factor, and LCD modes keep existing exact Latex, cancellation order, exclusion metadata, assumption facts, and polynomial fallback behavior.
- Algebra transform, Engine, Integration, Limits, and guarded Equation consumers keep importing through the root facade.
- No solver behavior, output wording, source labels, result-origin policy, OOE/runtime policy, replay/history contract, schema, capability, stored-value behavior, display policy, or reserved-symbol policy changed.

## Test Surface Note

`src/lib/symbolic-engine/rational.test.ts` stays at the root. It is below the ratchet, imports the public facade, and remains useful compatibility coverage for downstream callers.

## Verification Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/symbolic-engine/rational.test.ts src/lib/symbolic-engine/factoring.test.ts src/lib/symbolic-engine/integration.test.ts`
- `npm run test:unit -- src/lib/algebra/rational-function/*.test.ts src/lib/algebra/transform-core/*.test.ts src/lib/algebra/algebra-transform.test.ts`
- `npm run test:unit -- src/lib/engine/math-engine.test.ts src/lib/equation/guarded/*.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
