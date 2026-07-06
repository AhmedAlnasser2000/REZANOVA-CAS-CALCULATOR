# Gate 3: CALCULUS-INTEGRATION-TRIG-SUB-ROOTS1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

- gate_type: backend
- gate_type: ui
- scope: Calculus integration only, indefinite only.
- boundary: no Equation imports, no shared Display schema redesign, no definite/improper integral widening.

## Implemented

- Extended Calculus-owned trig-substitution radical templates to accept squared affine carriers over matching radicals, including `u^2/sqrt(a^2-u^2)`, `u^2/sqrt(u^2+a^2)`, and `u^2/sqrt(u^2-a^2)`.
- Accepted both `Sqrt` and fractional-power denominator forms for the new squared-carrier route.
- Preserved real-domain facts and radical-template detail cards for newly routed affine rows before adoption.
- Fixed a presentation slow path discovered during Playwright: when the verified antiderivative is not normalized into a different base expression, the indefinite presentation layer now reuses the existing exact antiderivative verification for `+C` instead of rerunning a heavy global derivative equivalence check.

## Findings

- The existing `x^2/(4-x^2)^(1/2)` row is still solved by an older u-substitution route and does not emit an `Integration Radical Template` detail card. It remains visually verified for answer/readability, while the new affine squared-carrier rows carry the new radical detail card.
- Broad TypeScript remains blocked by unrelated Equation complex-locus work: `src/lib/equation/complex/locus-evidence.ts(152,46): Property 'value' does not exist on type 'LocusEvaluationResult'.`

## Commands

- `npx vitest run src/lib/symbolic-engine/integration-trig-sub-roots.test.ts --reporter=dot`
- `npx vitest run src/lib/calculus/workspace/integrals.test.ts --testNamePattern "textbook radical|verified indefinite" --reporter=dot`
- `npx playwright test -c .task_tmp/calculus-integration-next400-fix-batch1/playwright.visual.config.ts .task_tmp/calculus-integration-next400-fix-batch1/small-template-ibp-visual.spec.ts`
- `npm run test:calculus-integration-corpus`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npx tsc -b --pretty false`
- `git diff --check`

## Results

- Trig-sub root suite passed: 17 tests.
- Focused workspace integration presentation suite passed: 2 tests, 24 skipped by pattern.
- Playwright visual gate passed: 3 tests covering Gate 2 regressions plus Gate 3 affine root rows and fractional-power denominator readability.
- Integration corpus validator passed: 8 sources, 550 unique cases, 17 duplicate records, 973 run results, and 68 scan findings.
- File-size ratchet passed.
- Memory protocol validation passed.
- `git diff --check` passed.
- `npx tsc -b --pretty false` failed only on the unrelated Equation complex-locus blocker listed above.

## Visual Evidence

- Screenshots were written under `.task_tmp/calculus-integration-next400-fix-batch1/visual-evidence/`:
  - `affine-plus-carrier-over-root.png`
  - `affine-outside-carrier-over-root.png`
  - `fractional-power-root-denominator.png`
