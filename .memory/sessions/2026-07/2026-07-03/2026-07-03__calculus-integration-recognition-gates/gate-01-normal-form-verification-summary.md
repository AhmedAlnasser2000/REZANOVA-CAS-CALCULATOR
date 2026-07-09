# CALCULUS-INTEGRATION-NORMAL-FORM-GATE1 Verification Summary

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

- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/integration-recognition-gates.test.ts`
- `npx vitest run src/lib/calculus/workspace/integrals.test.ts`
- `node tools/validate-calculus-integration-corpus-ledger.mjs`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check -- src/lib/calculus/engine/integration.ts src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/integration-recognition-gates.test.ts src/lib/symbolic-engine/integration/dispatch.ts src/lib/symbolic-engine/integration/normal-form.ts src/lib/symbolic-engine/integration/target-free-polynomial-direct.ts src/lib/symbolic-engine/integration/types.ts`

Blocked outside this gate:

- `npx tsc -b --pretty false` currently stops in `src/app/runtime/historyDisplayEntry.test.ts` because a readonly tuple `lineKinds` fixture is not assignable to mutable `DisplayDetailSection.lineKinds`. That file is outside the Calculus integration lane and was not staged for this gate.

## Playwright Visual Gate

Passed:

- `npx playwright test normal-form-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`

Visual evidence inspected:

- `.task_tmp/calculus-integration-recognition-gates/normal-form-visual/scaled-sqrt.png`
- `.task_tmp/calculus-integration-recognition-gates/normal-form-visual/reciprocal-sqrt.png`
- `.task_tmp/calculus-integration-recognition-gates/normal-form-visual/reciprocal-cuberoot.png`
- `.task_tmp/calculus-integration-recognition-gates/normal-form-visual/sum-root-powers.png`
- `.task_tmp/calculus-integration-recognition-gates/normal-form-visual/mixed-root-quotients.png`
- `.task_tmp/calculus-integration-recognition-gates/normal-form-visual/fourth-root-quotient.png`
- `.task_tmp/calculus-integration-recognition-gates/normal-form-visual/mixed-fail-closed.png`

Notes:

- Success cards render verified answer cards plus an expanded `Integration Normal Form` card naming the recognized rewrite family.
- The mixed unsupported case renders an error card plus `Integration Term Plan` evidence naming the blocked term and explicitly refusing a partial antiderivative.
- No obvious overflow or readability issue was seen in the inspected screenshots.
