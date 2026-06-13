# Symbolic Limits District

Status: shipped in `SYMBOLIC-LIMITS-DISTRICT-SPLIT1`

Purpose: record the structure-only split of Symbolic Engine finite/infinite limit rule matching while preserving the public `src/lib/symbolic-engine/limits.ts` facade and all existing Calculus-facing limit behavior.

## Final Shape

- `limits.ts` is the public compatibility facade.
- `limits/types.ts` owns limit result, local-equivalent, and boxed-node contracts.
- `limits/evaluation.ts` owns ComputeEngine boxing, numeric reads, target evaluation, numeric predicates, and detail-section success assembly.
- `limits/known-rules.ts` owns standard bounded finite-limit pattern matching.
- `limits/local-equivalents.ts` owns local-equivalent eligibility, derivative-order fallback, local-order combination, and equivalent-limit resolution.
- `limits/rational-local.ts` owns exact rational simplification handoff before local analysis.
- `limits/poles.ts` owns signed finite pole sampling and one-sided logarithm boundary behavior.
- `limits/lhospital.ts` owns capped L'Hospital fallback.
- `limits/api.ts` owns public `resolveFiniteLimitRule` dispatch order.

## Preserved Contracts

- Public exports remain `evaluateNodeAt`, `attemptLHospital`, and `resolveFiniteLimitRule`.
- Route order remains direct substitution, known finite rules, rational local simplification, local equivalents, signed pole sampling, log-boundary handling, capped L'Hospital fallback, then unhandled.
- Finite/infinite output values, origins, detail-section wording, direction behavior, derivative-equivalent behavior, L'Hospital recursion budget, and Calculus/Advanced Calc consumers are unchanged.
- No solver behavior, output wording, source labels, result-origin policy, OOE/runtime policy, replay/history contract, schema, capability, stored-value behavior, display policy, or reserved-symbol policy changed.

## Test Surface Note

`src/lib/symbolic-engine/limits.test.ts` stays at the root. It is below the ratchet, imports the public facade, and remains useful compatibility coverage for downstream callers.

## Verification Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/symbolic-engine/limits.test.ts src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/rational.test.ts`
- `npm run test:unit -- src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/engine.test.ts`
- `npm run test:unit -- src/lib/engine/math-engine.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
