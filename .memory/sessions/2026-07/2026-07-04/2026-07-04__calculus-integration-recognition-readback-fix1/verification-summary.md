# CALCULUS-INTEGRATION-RECOGNITION-READBACK-FIX1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Backend Gate

Passed:

- `npx vitest run src/lib/symbolic-engine/integration-recognition-gates.test.ts`
- `npm run test:file-sizes`
- `git diff --check`
- `node tools/validate-calculus-integration-corpus-ledger.mjs`
- `node --test tools/validate-calculus-integration-corpus-ledger.test.mjs`
- `npx tsx .task_tmp/calculus-integration-recognition-gates/first200-current-backend-sweep.ts`

Backend sweep result:

- Total cases: 200.
- Supported cases: 200.
- Unsupported cases: 0.
- Unclear readback patterns: 0.
- Focused fixed run rows added: 11 under `2026-07-04-calculus-integration-recognition-fix1`.

Blocked outside this gate:

- `npx tsc -b --pretty false` still stops in `src/app/runtime/historyDisplayEntry.test.ts` because a readonly tuple `lineKinds` fixture is not assignable to mutable `DisplayDetailSection.lineKinds`. This is outside the Calculus integration lane and was not changed for this commit.

## Playwright Visual Gate

Passed:

- `timeout 120s npx playwright test scalar-multiple-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`
- `timeout 180s npx playwright test readback-clarity-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`

Visual evidence inspected:

- `.task_tmp/calculus-integration-recognition-gates/scalar-multiple-visual/scaled-affine-sine.png`
- `.task_tmp/calculus-integration-recognition-gates/scalar-multiple-visual/negative-affine-sec-square.png`
- `.task_tmp/calculus-integration-recognition-gates/scalar-multiple-visual/half-csc-cot-sum.png`
- `.task_tmp/calculus-integration-recognition-gates/readback-clarity-visual/sum-root-powers.png`
- `.task_tmp/calculus-integration-recognition-gates/readback-clarity-visual/mixed-root-quotients.png`
- `.task_tmp/calculus-integration-recognition-gates/readback-clarity-visual/fourth-root-quotient.png`

Observed visual result:

- `-\pi sin(\pi x)` renders `cos(pi x)` plus an `Integration Scalar Multiple` card with coefficient `-pi`.
- `-sec^2(3x/2)` renders `-2 tan(3x/2)/3` plus an `Integration Scalar Multiple` card.
- `1/2(csc^2(x)-csc(x)cot(x))` renders `csc(x)/2 - cot(x)/2`, keeps the affine slope fact visible, and shows the scalar-multiple evidence card.
- `sqrt(x)+x^(1/3)` renders explicit `2/3` and `3/4` coefficients instead of mixed-number-looking output.
- `sqrt(x)/2+2/sqrt(x)` and `8x-2/x^(1/4)` render without ambiguous unit-fraction coefficient grouping or double-negative fraction groups.
