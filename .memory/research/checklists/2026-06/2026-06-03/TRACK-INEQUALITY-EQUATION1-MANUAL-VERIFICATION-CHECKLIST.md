# TRACK-INEQUALITY-EQUATION1 Manual Verification Checklist

## Scope

- [x] Keep product-facing inequality adoption Equation-only.
- [x] Add bounded top-level `<`, `<=`, `>`, and `>=` handling for Equation symbolic input.
- [x] Support only one-variable numeric-coefficient linear inequalities in `Exact` mode.
- [x] Return all-real and empty-set results for constant true/false linear reductions.
- [x] Use `INEQUALITY-CORE1` interval/set readback and value-domain facts.
- [x] Mark successful inequality results with `answerDomain: conditional-real`.
- [x] Mark successful inequality results with `solutionKind: inequality-solution-set`.
- [x] Show the result-card `Solution: Inequality set` chip for successful inequality-set results.
- [x] Preserve history/replay and OOE provenance metadata for solution kind and domain.
- [x] Keep `Approximate` on real root-search guidance for inequalities.
- [x] Keep `Isolate` on equation-rearrangement guidance for inequalities.
- [x] Keep `Complex On` inequalities real-order-only with a visible detail note.

## Boundaries

- [x] No non-Equation inequality adoption.
- [x] No broad inequality parser.
- [x] No symbolic-parameter or multivariable inequality solving.
- [x] No quadratic or rational sign-chart solving.
- [x] No absolute-value, trig, log, or exponential inequality solving.
- [x] No chained inequality solving.
- [x] No `!=` inequality route.
- [x] No Approximate inequality sampling.
- [x] No Isolate inequality rearrangement.
- [x] No stored-value policy change.
- [x] No OOE runtime behavior change.
- [x] No Rust solver execution.

## Verification

- [x] `npm run test:unit -- src/lib/modes/equation.test.ts`
- [x] `npm run test:unit -- src/lib/modes/equation.test.ts src/lib/algebra/inequality-core.test.ts src/lib/algebra/value-domain-core.test.ts src/lib/ooe/equation-pilot.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
