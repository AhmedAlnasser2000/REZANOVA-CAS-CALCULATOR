# Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## EQUATION-REAL-POLYNOMIAL-STURM-CERTIFICATION1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/algebra/sturm-real-roots.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts`
- Evidence: 2 test files passed, 7 tests passed.
- Regression unit gate passed:
  - `npm run test:unit -- src/lib/algebra/sturm-real-roots.test.ts src/lib/algebra/polynomial-roots.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/numeric-golden-trace-harness.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts`
- Evidence: 6 test files passed, 37 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` is blocked by unrelated current repo Surface Protocol/UI test type errors in `src/app/shell/ActiveSurfaceHost.ui.test.tsx`, `src/lib/surface-protocol/dto.test.ts`, and `src/lib/surface-protocol/spec-examples.test.ts`.

## EQUATION-REAL-INTERVAL-ARITHMETIC-DOMAIN1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/equation/real-interval-arithmetic.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/numeric-golden-trace-harness.test.ts`
- Evidence: 4 test files passed, 44 tests passed.
- Regression unit gate passed:
  - `npm run test:unit -- src/lib/equation/real-interval-arithmetic.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/equation/numeric-interval/sampling.test.ts src/lib/modes/equation/numeric-shape-classifier.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts src/lib/modes/equation/numeric-golden-trace-harness.test.ts`
- Evidence: 9 test files passed, 79 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` is blocked by unrelated current repo Surface Protocol/UI test type errors in `src/app/shell/ActiveSurfaceHost.ui.test.tsx`, `src/lib/surface-protocol/dto.test.ts`, and `src/lib/surface-protocol/spec-examples.test.ts`.

## EQUATION-NUMERIC-PRECISION-ESCALATION1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/numeric/decimal-precision.test.ts src/lib/algebra/polynomial-roots.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts`
- Evidence: 4 test files passed, 27 tests passed.
- Regression unit gate passed:
  - `npm run test:unit -- src/lib/numeric/decimal-precision.test.ts src/lib/algebra/polynomial-roots.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts src/lib/modes/equation/numeric-golden-trace-harness.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts`
- Evidence: 8 test files passed, 55 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` is blocked by unrelated current repo Surface Protocol/UI test type errors in `src/app/shell/ActiveSurfaceHost.ui.test.tsx`, `src/lib/surface-protocol/dto.test.ts`, and `src/lib/surface-protocol/spec-examples.test.ts`.

## EQUATION-REAL-PIECEWISE-ABS-HYBRID1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/modes/equation/real-piecewise-abs-hybrid.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/numeric-shape-classifier.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts`
- Evidence: 4 test files passed, 47 tests passed.
- Regression unit gate passed:
  - `npm run test:unit -- src/lib/modes/equation/real-piecewise-abs-hybrid.test.ts src/lib/modes/equation/numeric-golden-trace-harness.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts src/lib/equation/numeric-interval/solve.test.ts`
- Evidence: 6 test files passed, 58 tests passed.
- Post-extraction regression gate passed:
  - `npm run test:unit -- src/lib/modes/equation/real-piecewise-abs-hybrid.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/numeric-shape-classifier.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/numeric-golden-trace-harness.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts`
- Evidence: 6 test files passed, 61 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed after extracting `src/lib/equation/numeric-piecewise-breakpoints.ts`.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` is blocked by unrelated current repo Surface Protocol/UI test type errors in `src/app/shell/ActiveSurfaceHost.ui.test.tsx`, `src/lib/surface-protocol/dto.test.ts`, and `src/lib/surface-protocol/spec-examples.test.ts`.

## EQUATION-REAL-INTERVAL-NEWTON-PRUNING1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/equation/numeric-interval/newton-pruning.test.ts src/lib/equation/numeric-interval/sampling.test.ts src/lib/equation/numeric-interval/solve.test.ts`
- Evidence: 3 test files passed, 34 tests passed.
- Route regression unit gate passed:
  - `npm run test:unit -- src/lib/equation/numeric-interval/newton-pruning.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts src/lib/modes/equation/numeric-golden-trace-harness.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts`
- Evidence: 6 test files passed, 57 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` is blocked by unrelated current repo Surface Protocol/UI test type errors in `src/app/shell/ActiveSurfaceHost.ui.test.tsx`, `src/lib/surface-protocol/dto.test.ts`, and `src/lib/surface-protocol/spec-examples.test.ts`.

## EQUATION-NUMERIC-CONFIDENCE-READBACK1

- Focused numeric confidence gate passed:
  - `npm run test:unit -- src/lib/modes/equation/numeric-golden-trace-harness.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts src/lib/modes/equation/real-piecewise-abs-hybrid.test.ts`
- Evidence: 7 test files passed, 63 tests passed.
- Route regression gate passed:
  - `npm run test:unit -- src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts src/lib/modes/equation/answer-modes.test.ts src/lib/equation/guarded/stage-routing.test.ts`
- Evidence: 3 test files passed, 54 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` is blocked by unrelated current repo Symbolic/Risch work: `src/lib/symbolic-engine/integration/transcendental-certificate/special-functions.ts` has 1118 lines, exceeding its cap of 900.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` is blocked by unrelated current repo Surface Protocol/UI test type errors in `src/app/shell/ActiveSurfaceHost.ui.test.tsx`, `src/lib/surface-protocol/dto.test.ts`, and `src/lib/surface-protocol/spec-examples.test.ts`.

## EQUATION-COMPLEX-BRANCH-CUT-POLICY1

- Focused branch-cut policy gate passed:
  - `npm run test:unit -- src/lib/equation/complex/branch-cut-policy.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts`
- Evidence: 2 test files passed, 10 tests passed.
- Broader `complex-domain` regression was probed and found pre-existing/stale against current Complex numeric/readback policy; failures include older direct Complex Cardano/Ferrari expectations and older exact-only stop wording. This branch-cut milestone does not change those routes.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## EQUATION-COMPLEX-NUMERIC-EVALUATOR1

- Focused Complex evaluator gate passed:
  - `npm run test:unit -- src/lib/equation/complex/numeric-evaluator.test.ts src/lib/equation/complex/branch-cut-policy.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts`
- Evidence: 3 test files passed, 16 tests passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## EQUATION-COMPLEX-POLYNOMIAL-CONDITIONING-LIFT1

- Focused Complex polynomial conditioning gate passed:
  - `npm run test:unit -- src/lib/algebra/polynomial-roots.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts src/lib/equation/complex/numeric-evaluator.test.ts src/lib/equation/complex/branch-cut-policy.test.ts`
- Evidence: 4 test files passed, 29 tests passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run lint` is blocked by unrelated untracked Symbolic/Risch work in `src/lib/symbolic-engine/integration/transcendental-certificate/quotient-powers.ts` (`scalarLatex` unused).
- `npm run build` is blocked by the same unrelated `quotient-powers.ts` TypeScript error.

## EQUATION-COMPLEX-SEED-GRID-NEWTON1

- Focused Complex seed-grid Newton gate passed:
  - `npm run test:unit -- src/lib/equation/complex/seed-grid-newton.test.ts src/lib/equation/complex/numeric-evaluator.test.ts src/lib/equation/complex/branch-cut-policy.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts`
- Evidence: 4 test files passed, 24 tests passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## EQUATION-COMPLEX-CONTOUR-WINDING-VERIFICATION1

- Focused Complex contour/winding gate passed:
  - `npm run test:unit -- src/lib/equation/complex/contour-winding.test.ts src/lib/equation/complex/seed-grid-newton.test.ts src/lib/equation/complex/numeric-evaluator.test.ts src/lib/equation/complex/branch-cut-policy.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts`
- Evidence: 5 test files passed, 29 tests passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## EQUATION-COMPLEX-REGION-NONLINEAR-SOLVE1

- Focused Complex region solve gate passed:
  - `npm run test:unit -- src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/equation/complex/contour-winding.test.ts src/lib/equation/complex/seed-grid-newton.test.ts src/lib/equation/complex/numeric-evaluator.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts`
- Evidence: 5 test files passed, 30 tests passed.
- UI/runtime panel gate passed:
  - `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/lib/modes/equation/ooe-runtime.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts`
  - `npm run test:ui -- src/app/runtime/useEquationRuntime.ui.test.tsx`
- Evidence: controller/runtime/OOE/backend unit gate passed 3 files and 24 tests; hook UI gate passed 1 file and 10 tests.
- Route regression gate passed:
  - `npm run test:unit -- src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts`
- Evidence: 3 test files passed, 19 tests passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
