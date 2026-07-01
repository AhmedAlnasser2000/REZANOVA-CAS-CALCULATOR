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

## EQUATION-NUMERIC-KERNEL-CONTRACT1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/equation/numeric-interval/sampling.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts`
- Evidence: 5 test files passed, 47 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` is currently blocked by unrelated untracked `src/lib/surface-protocol/` work: `src/lib/surface-protocol/dto.test.ts` passes an `advisories` object that no longer matches `RuntimeAdvisories`.

## EQUATION-NUMERIC-ITP-KERNEL1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/equation/numeric-interval/sampling.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts`
- Evidence: 5 test files passed, 47 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` remains blocked by unrelated Surface Protocol work: `src/lib/surface-protocol/dto.test.ts` passes an `advisories` object that no longer matches `RuntimeAdvisories`.

## EQUATION-NUMERIC-SEGMENTATION-HARDEN1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/modes/equation/numeric-shape-classifier.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts`
- Evidence: 4 test files passed, 52 tests passed.
- Regression unit gate passed:
  - `npm run test:unit -- src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts src/lib/equation/candidate/validation.test.ts src/lib/equation/numeric-interval/sampling.test.ts src/lib/equation/numeric-interval/solve.test.ts`
- Evidence: 5 test files passed, 44 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.
- `npm run build` remains blocked by unrelated Surface Protocol work: `src/lib/surface-protocol/dto.test.ts` passes an `advisories` object that no longer matches `RuntimeAdvisories`.

## EQUATION-NUMERIC-POLYNOMIAL-ABERTH1

- Focused unit gate passed:
  - `npm run test:unit -- src/lib/algebra/polynomial-roots.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts`
- Evidence: 3 test files passed, 21 tests passed.
- Guided polynomial regression gate passed:
  - `npm run test:unit -- src/lib/algebra/polynomial-roots.test.ts src/lib/modes/equation/systems-guided-polynomial.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/numeric-route-orchestration-closeout.test.ts`
- Evidence: 4 test files passed, 32 tests passed.
- `npm run lint` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run build` remains blocked by unrelated Surface Protocol work: `src/lib/surface-protocol/dto.test.ts` passes an `advisories` object that no longer matches `RuntimeAdvisories`.
