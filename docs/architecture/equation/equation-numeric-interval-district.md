# Equation Numeric Interval District

Status: audit plus split record

Purpose: document the Numeric Interval district created by `EQUATION-NUMERIC-INTERVAL-DISTRICT1`. This milestone preserves the public `numeric-interval-solve.ts` root facade while moving implementation ownership into `src/lib/equation/numeric-interval/`.

## Public Surface

- `runNumericIntervalSolve(equationLatex, interval, constraints?, angleUnit?)`
- `NumericIntervalSolveResult`

The root compatibility facade remains `src/lib/equation/numeric-interval-solve.ts`.

## Internal Responsibility Map

- Types and constants: numeric method label, tolerances, diagnostics, sample point/result types.
- Interval parsing and summaries: start/end/subdivision validation and stable summary text.
- Sampling and root recovery: finite substitution, sign-bracket bisection, and local absolute-minimum recovery.
- Direct trig guidance: branch/image analysis, angle-unit formatting, branch estimates, and no-root guidance.
- Solve orchestration: candidate collection, validation against the original equation and constraints, absolute-value guidance handoff, and result assembly.

## High-Risk Contracts

- Numeric method wording, diagnostics, accepted/rejected counts, and no-root guidance must stay stable.
- Angle-unit behavior for radians, degrees, and gradians must stay unchanged.
- Candidate validation must continue checking the original equation and preserved domain constraints.
- Numeric interval solving must remain gated by an explicit interval request.
- The guarded numeric stage and Equation Approximate mode must keep importing through the root facade.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/equation/numeric-interval/*.test.ts src/lib/equation/guarded-solve.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not change numeric solving behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, worker-host behavior, or reserved-symbol policy.
- Do not fold `domain-guards.ts` into this district.
- Do not widen Approximate mode beyond the existing explicit interval contract.
