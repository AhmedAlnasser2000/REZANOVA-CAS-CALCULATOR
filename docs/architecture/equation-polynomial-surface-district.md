# Equation Polynomial Surface District

Status: audit plus split record

Purpose: document the Polynomial Surface district created by `EQUATION-POLYNOMIAL-SURFACE-DISTRICT1`. This milestone preserves root facades while moving polynomial domain extraction, 2x2 polynomial systems, and polynomial carrier follow-on solving into `src/lib/equation/polynomial/`.

## Public Surface

- `extractEquationPolynomialDomain`
- `isEquationPolynomialRelation`
- `solvePolynomialSystem2x2`
- `solveBoundedPolynomialCarrierEquationAst`
- Public result/options types re-exported through the root facade files.

The root compatibility facades remain `equation-polynomial-domain.ts`, `equation-polynomial-system.ts`, and `polynomial-carrier-follow-on.ts`.

## Internal Responsibility Map

- Domain helper: relation parsing, zero-form extraction, polynomial-domain classification, and Latex readback.
- Polynomial system: zero-form parsing, resultant projection, exact projected-root solving, candidate pair validation, stored-value readback, and outcome assembly.
- Carrier follow-on: carrier detection, carrier polynomial construction, carrier-root solving, branch backsolve, root refinement, exact supplements, and solve orchestration.
- Private shared helpers: polynomial system types/outcome assembly and carrier result/root-dedupe helpers.

## High-Risk Contracts

- Public root imports must remain stable for Equation mode, guarded algebra, inequality, complex polynomial routing, and tests.
- Polynomial 2x2 wording, candidate rejection counts, stored-value policy, protected `x`/`y` behavior, resultant details, and candidate caps must stay unchanged.
- Carrier follow-on must preserve the existing bounded carrier surface and avoid widening unsupported nonlinear carriers.
- Polynomial domain extraction must preserve relation handling, chained-relation stops, target selection, and max-degree behavior.
- No Equation solver order, display/readback, OOE/runtime, replay/history, schema, capability, worker-host, or reserved-symbol behavior changes are part of this district.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/equation/polynomial/*.test.ts`
- `npm run test:unit -- src/lib/equation/equation-inequality.test.ts src/lib/equation/equation-complex.test.ts`
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not widen polynomial system variables beyond `x` and `y`.
- Do not add new polynomial carrier families or exact branch readback formats.
- Do not change stored-variable substitution policy or protected variable behavior.
- Do not fold unrelated shared solve, domain guard, or display policy into this district.
