# Symbolic Integration District

Status: shipped in `SYMBOLIC-INTEGRATION-DISTRICT-SPLIT1`

Purpose: record the structure-only split of Symbolic Engine integration while preserving the public `src/lib/symbolic-engine/integration.ts` facade and all existing symbolic integration behavior.

## Final Shape

- `integration.ts` is the public compatibility facade.
- `integration/types.ts` owns public integration result/candidate types and route constants.
- `integration/metadata.ts` owns candidate metadata, domain-hazard collection, unsupported-family classification, and compute-engine candidate metadata.
- `integration/node-helpers.ts` owns numeric/rational approximation, node equality, and proportional-scale helpers.
- `integration/rational.ts` owns bounded rational partial-fraction integration and exact Latex assembly helpers used by rule families.
- `integration/rules.ts` owns inverse-trig, derivative-ratio, substitution, by-parts, polynomial-times-exponential/trig/log, and input normalization helpers.
- `integration/dispatch.ts` owns the public AST/Latex entrypoints and preserves route order.

## Preserved Contracts

- Public exports remain `IntegralResolution`, `IntegralStrategy`, candidate metadata types, `buildComputeEngineIntegrationCandidate`, `resolveSymbolicIntegralFromAst`, and `resolveSymbolicIntegralFromLatex`.
- Dispatch order remains exactly: inverse trig, derivative ratio, partial fractions, substitution, direct rule, by parts, affine-linear, unsupported.
- Exact Latex, origin values, strategy ids, verification status, candidate metadata, domain hazards, and controlled failure wording are unchanged.
- Calculus fallback behavior and derivative-backcheck verification remain unchanged.
- `patterns.ts`, `normalize.ts`, and `precedence.ts` were not touched.

## Test Surface Note

`src/lib/symbolic-engine/integration.test.ts` stays at the root. It is below the ratchet, imports the public facade, and remains useful compatibility coverage for downstream callers.

## Verification Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/*.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
