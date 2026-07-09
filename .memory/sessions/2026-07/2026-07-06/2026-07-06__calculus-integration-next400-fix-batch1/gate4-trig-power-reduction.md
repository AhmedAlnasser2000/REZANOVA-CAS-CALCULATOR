# Gate 4: CALCULUS-INTEGRATION-TRIG-POWER-REDUCTION1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- gate_type: backend
- gate_type: ui
- scope: Calculus integration only, indefinite only.
- boundary: no Equation imports, no shared Display schema redesign, no definite/improper integral widening.

## Implemented

- Added bounded textbook trig-power reduction for mixed `sin^m(x)cos^n(x)` products with individual exponents at most 8 and total degree at most 12.
- Extended tan/sec and cot/csc power support to the same cap, including the previously missing odd sec/csc rows such as `tan^4(x)sec^5(x)` and `cot^4(x)csc^5(x)`.
- Flattened recurrence output so accepted tan/sec and cot/csc answers render as one readable antiderivative expression instead of nested fraction chains.
- Added a controlled `Integration Trig Power Boundary` error/detail card for over-cap trig-power rows, with no partial antiderivative adoption.

## Findings

- The cap is intentionally local to textbook trig-power rows. Broader trig identities, symbolic coefficients, and high-degree recurrence expansion remain deferred.
- Broad TypeScript remains blocked by unrelated Equation complex-locus work: `src/lib/equation/complex/locus-evidence.ts(152,46): Property 'value' does not exist on type 'LocusEvaluationResult'.`

## Commands

- `npx vitest run src/lib/symbolic-engine/integration-trig-power-reduction.test.ts --reporter=dot`
- `npx vitest run src/lib/calculus/engine/antiderivative-rules.test.ts --reporter=dot`
- `npx vitest run src/lib/symbolic-engine/integration.test.ts --testNamePattern "sin/cos parity|tan/sec|over-cap trig" --reporter=dot`
- `npx playwright test -c .task_tmp/calculus-integration-next400-fix-batch1/playwright.visual.config.ts .task_tmp/calculus-integration-next400-fix-batch1/small-template-ibp-visual.spec.ts`
- `npm run test:calculus-integration-corpus`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npx tsc -b --pretty false`
- `git diff --check`

## Results

- Trig-power focused suite passed: 7 tests.
- Calculus antiderivative-rules suite passed: 2 tests.
- Focused symbolic integration regression suite passed: 3 tests, 49 skipped by pattern.
- Playwright visual gate passed: 4 tests covering Gate 2, Gate 3, Gate 4 answer cards, facts/details, trust/backcheck cards, copy/to-editor behavior, and the over-cap boundary card.
- Integration corpus validator passed: 8 sources, 550 unique cases, 17 duplicate records, 973 run results, and 68 scan findings.
- File-size ratchet passed with `dispatch.ts` and `trig-power-identities.ts` under their caps.
- Memory protocol validation passed.
- `git diff --check` passed.
- `npx tsc -b --pretty false` failed only on the unrelated Equation complex-locus blocker listed above.

## Visual Evidence

- Screenshots were written under `.task_tmp/calculus-integration-next400-fix-batch1/visual-evidence/`:
  - `sin-cos-power.png`
  - `tan-sec-power.png`
  - `cot-csc-power.png`
  - `trig-power-over-cap-boundary.png`
