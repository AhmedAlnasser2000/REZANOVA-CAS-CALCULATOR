# Symbolic Mixed Factor District

Status: shipped in `SYMBOLIC-MIXED-FACTOR-DISTRICT-SPLIT1`

Purpose: record the structure-only split of Symbolic Engine mixed carrier factoring while preserving the public `src/lib/symbolic-engine/mixed-factor.ts` facade and all existing carrier-factor behavior.

## Final Shape

- `mixed-factor.ts` is the public compatibility facade.
- `mixed-factor/types.ts` owns public factorization contracts and private carrier candidate/term contracts.
- `mixed-factor/carriers.ts` owns variable collection, expansion, rational-power carrier detection, carrier-degree reads, carrier-power reconstruction, and `u` to carrier mapping.
- `mixed-factor/polynomial.ts` owns carrier-term parsing, carrier-polynomial construction, and mixed-family recognition.
- `mixed-factor/factorization.ts` owns exact scalar root candidates, low-degree carrier polynomial factoring, and bounded factorization refinement.
- `mixed-factor/api.ts` owns public `factorMixedCarrierAst` orchestration and result assembly.

## Preserved Contracts

- Public exports remain `MixedCarrierFactorization` and `factorMixedCarrierAst`.
- Supported square-root, cubic-like, and same-base rational-power carrier families are unchanged.
- Unsupported unrelated radical bases, mixed-denominator carriers, multivariable shapes, and coefficient-contaminated shapes still return `null`.
- Exact factor nodes, carrier nodes, polynomial nodes, strategy id, and guarded Equation/factoring downstream behavior are unchanged.
- No solver behavior, exact Latex, output wording, source labels, result-origin policy, OOE/runtime policy, replay/history contract, schema, capability, stored-value behavior, display policy, or reserved-symbol policy changed.

## Test Surface Note

`src/lib/symbolic-engine/mixed-factor.test.ts` stays at the root. It is below the ratchet, imports the public facade, and remains useful compatibility coverage for downstream callers.

## Verification Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/symbolic-engine/mixed-factor.test.ts src/lib/symbolic-engine/factoring.test.ts src/lib/symbolic-engine/rational.test.ts`
- `npm run test:unit -- src/lib/algebra/polynomial-factor/*.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts src/lib/equation/guarded/*.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/*.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
