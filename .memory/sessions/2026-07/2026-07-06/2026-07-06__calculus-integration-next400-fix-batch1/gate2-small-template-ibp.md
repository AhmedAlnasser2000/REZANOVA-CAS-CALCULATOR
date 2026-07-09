# Gate 2: CALCULUS-INTEGRATION-SMALL-TEMPLATE-UNLOCKS2

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

- Added bounded log-power substitution for `ln(x)^n/x` and `1/(x ln(x)^n)` with domain/exclusion facts.
- Added a positive-branch inverse-secant radical template for `1/(u sqrt(u^2-a^2))` with branch facts and no partial antiderivative adoption outside the stated branch.
- Fixed hyperbolic-square recognition/output for parser function-power shapes such as `sinh^2(2x)` and `cosh^2(2x)`.
- Extended inverse-trig IBP to affine `arctan(ax+b)` while keeping affine `arcsin(ax+b)` capped after slow failed probes.

## Deliberate Caps And Findings

- `x^6 arcsin(x/2)` remains unsupported. The affine arcsin recurrence path was observed to exceed useful runtime before failing, so non-identity affine arcsin IBP is capped for now.
- `x^2 sec^2(2x)` and `x^2 csc^2(6x)` remain unsupported. Their IBP residuals lead to `int ln(cos)` / `int ln(sin)`-type gaps, so no elementary partial answer was adopted.
- The positive-branch radical route `1/(x sqrt(x^2-49))` succeeds, but full workspace presentation took about 4.6s and does not yet receive structured `+C` because the presentation re-backcheck samples outside the stated branch.

## Commands

- `npx vitest run src/lib/symbolic-engine/integration-ibp-gaps.test.ts --reporter=dot`
- `npx vitest run src/lib/symbolic-engine/integration-lowrisk-unlocks.test.ts --reporter=dot`
- `npx vitest run src/lib/calculus/workspace/integrals.test.ts --reporter=dot`
- `npx playwright test -c .task_tmp/calculus-integration-next400-fix-batch1/playwright.visual.config.ts .task_tmp/calculus-integration-next400-fix-batch1/small-template-ibp-visual.spec.ts`
- `npm run test:calculus-integration-corpus`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npx tsc -b --pretty false`
- `git diff --check`

## Results

- IBP focused suite passed: 17 tests.
- Low-risk unlock suite passed: 28 tests.
- Workspace integration suite passed: 26 tests.
- Playwright visual gate passed: 2 tests covering log-power, branch radical, hyperbolic square, affine arctan IBP, and capped unsupported rows.
- Integration corpus validator passed: 8 sources, 550 unique cases, 17 duplicate records, 973 run results, and 68 scan findings.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npm run test:file-sizes` failed only on unrelated `src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx` over its cap; this gate kept `src/lib/symbolic-engine/integration/dispatch.ts` at its 900-line cap.
- `npx tsc -b --pretty false` failed on unrelated Equation complex-locus and Linear Algebra test typing blockers.

## Visual Evidence

- Screenshots were written under `.task_tmp/calculus-integration-next400-fix-batch1/visual-evidence/`:
  - `log-power-answer.png`
  - `branch-radical-answer.png`
  - `hyperbolic-square-answer.png`
  - `affine-arctan-ibp-answer.png`
  - `affine-arcsin-cap.png`
  - `quadratic-sec2-cap.png`
  - `quadratic-csc2-cap.png`
