# Algebra Polynomial Elimination District Audit

Status: audit

Purpose: document the current Algebra polynomial elimination surface before any future split. Polynomial elimination is a shared backend capability for exact resultants and bounded bivariate projection; it is not a broad Grobner or multivariate algebra engine.

## Current Public Surface

- `polynomial-elimination-core.ts`: exact Sylvester matrix construction, univariate resultant calculation, determinant-stop propagation, and bounded resultant options.
- `polynomial-bivariate-elimination.ts`: bounded bivariate resultant projection from two LaTeX equations, retained/eliminated variable policy, stored constant substitution, cap validation, projected polynomial readback, and coefficient access.

## Responsibility Map

- Univariate resultants: `polynomial-elimination-core.ts` owns variable matching, zero/constant stops, Sylvester dimension caps, exact matrix determinant handoff, and resultant scalar return.
- Bivariate parsing: `polynomial-bivariate-elimination.ts` owns LaTeX parsing, explicit named-variable normalization, retained/eliminated variable interpretation, polynomial AST parsing, and unsupported-parameter stops.
- Projection assembly: `polynomial-bivariate-elimination.ts` owns bivariate polynomial arithmetic, Sylvester matrix over retained-variable polynomials, determinant expansion, primitive projected polynomial normalization, and projected Latex.
- Stored constants: `polynomial-bivariate-elimination.ts` owns finite scalar extraction from stored values, exact rationalization of decimal/scientific/rational forms, protected retained/eliminated variables, and unsafe stored-constant stops.
- Capability metadata: `capability-readiness.ts` records `polynomial-elimination-core` as bounded and adapter-backed, with product-facing polynomial systems and Grobner work deferred.

## Current Consumers

- `src/lib/equation/polynomial/system.ts`
- `src/lib/equation/polynomial/system-types.ts`
- `src/lib/equation/polynomial/system-outcome.ts`
- `src/lib/algebra/capability-readiness.ts`
- `src/lib/algebra/polynomial-elimination-core.test.ts`
- `src/lib/algebra/polynomial-bivariate-elimination.test.ts`

## Ratchet Pressure

- `src/lib/algebra/polynomial-bivariate-elimination.ts`: near the default ratchet and the primary future split candidate.
- `src/lib/algebra/polynomial-elimination-core.ts`: small, focused, and low immediate size pressure.

No file-size baseline update is expected for this docs-only audit.

## Future Split Candidates

- `ALGEBRA-POLYNOMIAL-ELIMINATION-DISTRICT-SPLIT1`: create `src/lib/algebra/polynomial-elimination/` while keeping root compatibility facades stable.
- Split bivariate internals into private modules for public types/options, bivariate polynomial arithmetic, parser/validation caps, Sylvester/resultant projection, stored-constant substitution, and output assembly.
- Keep univariate `polynomial-elimination-core.ts` as a root facade over the district only if the split touches shared resultants; otherwise leave it intact.
- Do not merge Equation polynomial system orchestration into Algebra; Algebra owns projection primitives, not Equation solve flow.

## High-Risk Contracts

- Preserve all stop reasons and metadata, including `constantContext: 'resultant'`, `storedVariable`, `symbols`, and exact matrix determinant stop propagation.
- Preserve default caps for Sylvester dimension, eliminated degree, retained degree, term count, and scalar magnitude.
- Preserve stored constant behavior: retained/eliminated variables are protected, usable constants are exact-rationalized, and unsafe constants stop deterministically.
- Preserve projected polynomial primitive normalization, projected Latex, substituted left/right Latex, substitutions, and protected substitutions.
- Preserve backend-only scope: no Grobner bases, no broad multivariate representation, no new product-facing solver family, and no display/readback policy changes.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/polynomial-elimination-core.test.ts src/lib/algebra/polynomial-bivariate-elimination.test.ts src/lib/algebra/capability-readiness.test.ts`
- `npm run test:unit -- src/lib/equation/equation-polynomial-system.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not split or move polynomial elimination implementation during this audit.
- Do not change resultant math, bivariate projection behavior, stop reasons, caps, stored-value policy, projected Latex, Equation polynomial system behavior, schemas, capabilities, OOE/runtime policy, or replay/history contracts.
- Do not add Grobner support, graphing hooks, broad multivariate algebra, or new polynomial system capabilities.
