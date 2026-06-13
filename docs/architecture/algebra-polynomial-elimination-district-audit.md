# Algebra Polynomial Elimination District Audit

Status: audit and split record

Purpose: document the current Algebra polynomial elimination surface and the district created by `ALGEBRA-POLYNOMIAL-ELIMINATION-DISTRICT-SPLIT1`. Polynomial elimination is a shared backend capability for exact resultants and bounded bivariate projection; it is not a broad Grobner or multivariate algebra engine.

## Current Public Surface

- `polynomial-elimination-core.ts`: compatibility facade for exact Sylvester matrix construction, univariate resultant calculation, determinant-stop propagation, and bounded resultant options.
- `polynomial-bivariate-elimination.ts`: compatibility facade for bounded bivariate resultant projection from two LaTeX equations, retained/eliminated variable policy, stored constant substitution, cap validation, projected polynomial readback, and coefficient access.
- `polynomial-elimination/`: private district for the shared elimination implementation.

## Responsibility Map

- Univariate resultants: the district owns variable matching, zero/constant stops, Sylvester dimension caps, exact matrix determinant handoff, and resultant scalar return.
- Bivariate parsing: the district owns LaTeX parsing, explicit named-variable normalization, retained/eliminated variable interpretation, polynomial AST parsing, and unsupported-parameter stops.
- Projection assembly: the district owns bivariate polynomial arithmetic, Sylvester matrix over retained-variable polynomials, determinant expansion, primitive projected polynomial normalization, and projected Latex.
- Stored constants: the district owns finite scalar extraction from stored values, exact rationalization of decimal/scientific/rational forms, protected retained/eliminated variables, and unsafe stored-constant stops.
- Capability metadata: `capability-readiness.ts` records `polynomial-elimination-core` as bounded and adapter-backed, with product-facing polynomial systems and Grobner work deferred.

## Current Consumers

- `src/lib/equation/polynomial/system.ts`
- `src/lib/equation/polynomial/system-types.ts`
- `src/lib/equation/polynomial/system-outcome.ts`
- `src/lib/algebra/capability-readiness.ts`
- `src/lib/algebra/polynomial-elimination-core.test.ts`
- `src/lib/algebra/polynomial-bivariate-elimination.test.ts`

## District Shape

- `src/lib/algebra/polynomial-elimination-core.ts`: root compatibility facade for univariate resultant exports.
- `src/lib/algebra/polynomial-bivariate-elimination.ts`: root compatibility facade for bivariate projection exports.
- `src/lib/algebra/polynomial-elimination/types.ts`: shared constants, result/stop types, option defaults, and scalar cap helpers.
- `src/lib/algebra/polynomial-elimination/univariate-resultant.ts`: Sylvester matrix construction and exact resultant calculation.
- `src/lib/algebra/polynomial-elimination/bivariate-polynomial.ts`: retained-variable polynomial arithmetic and bivariate validation.
- `src/lib/algebra/polynomial-elimination/parser.ts`: MathJSON-to-bivariate polynomial parsing.
- `src/lib/algebra/polynomial-elimination/stored-constants.ts`: stored constant parsing, exact rationalization, protected names, and substitution snapshots.
- `src/lib/algebra/polynomial-elimination/projection.ts`: bivariate Sylvester projection and determinant expansion.
- `src/lib/algebra/polynomial-elimination/output.ts`: projected polynomial normalization, Latex/readback assembly, and coefficient access.
- `src/lib/algebra/polynomial-elimination/solve.ts`: bivariate projection orchestration.
- `src/lib/algebra/polynomial-elimination/index.ts`: district export surface consumed by the root facades.

## Ratchet Pressure

- The former `src/lib/algebra/polynomial-bivariate-elimination.ts` pressure point is now a small facade.
- The new private district modules are under the default ratchet.
- No file-size baseline update was required for `ALGEBRA-POLYNOMIAL-ELIMINATION-DISTRICT-SPLIT1`.

## Future Split Candidates

- Harden polynomial elimination only if future Equation polynomial-system behavior expands.
- Keep univariate and bivariate root files as compatibility facades unless a broader Algebra import-boundary tidy explicitly changes public imports.
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
- `npm run test:unit -- src/lib/equation/polynomial/system.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not change resultant math, bivariate projection behavior, stop reasons, caps, stored-value policy, projected Latex, Equation polynomial system behavior, schemas, capabilities, OOE/runtime policy, or replay/history contracts.
- Do not add Grobner support, graphing hooks, broad multivariate algebra, or new polynomial system capabilities.
