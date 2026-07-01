# Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
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
