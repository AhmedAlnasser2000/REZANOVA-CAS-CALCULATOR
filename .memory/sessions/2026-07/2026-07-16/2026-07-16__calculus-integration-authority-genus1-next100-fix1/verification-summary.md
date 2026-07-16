## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Verification Ledger

- Program verification is in progress.
- App-visible mathematical output gates require Playwright evidence before completion.
- Complete-suite commands are reserved for the final cross-cutting closeout; ordinary gates use focused tests and contract ratchets.

## CANONICAL-RESULT-V4-SPECIAL-FUNCTION-EXPRESSION1

- gate_type: backend
- status: verified
- `npx vitest run src/lib/result-contract/v4-special-function-expression.test.ts` - pass, 12 tests.
- Focused V2/V3/native/consumer/History compatibility run - pass, 38 tests.
- `npm run test:result-contract` - pass, 126 tests across 18 files.
- `npm run test:canonical-result-v2-enforcement` - pass after sandbox escalation was required only because the ratchet self-test creates a temporary Git repository; V2 frozen-file enforcement and display inversion pass.
- `npx tsc -b --pretty false` - pass.
- `npm run test:file-sizes` - pass.
- `npm run test:memory-protocol` - pass before the final gate note.
- `git diff --check` - pass.
- Playwright: not applicable because this contract-only gate has no live V4 producer and changes no app-visible output.

## CALCULUS-INTEGRATION-NATIVE-RESULT-IR1

- gate_type: backend
- status: verified
- Focused Vitest: `npx vitest run src/lib/calculus/engine/antiderivative-expression.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts --maxWorkers=2` - pass, 54 tests.
- `npm run build` - pass, including TypeScript project build and production Vite build.
- Focused Chromium Playwright: `CALCWIZ_CAPTURE_GATE_EVIDENCE=1 npx playwright test e2e/calculus-native-ir-gate.spec.ts --project=chromium` - pass, 1 test after rebuilding the preview bundle.
- Playwright checks: one visible antiderivative row, structural right-hand `+C`, Integration Presentation evidence, Copy Result, To Editor, History replay, and overflow readiness.
- Visual screenshot: `test-results/calculus-native-ir-gate-na-a0e3f-ritative-across-app-actions-chromium/calculus-native-ir.png`; inspected at original resolution with no overlap, clipping, or mixed-number ambiguity.
- Browser-led correction: the first current-source run exposed `3\\cdot\\frac{x^2}{2}`; structured scalar scaling now folds the coefficient into the quotient numerator and the final app renders `\\frac{3x^2}{2}`.
- Existing boundary: the frozen V1 runtime does not expose the core Trust section for this direct route. The core verification remains `verified-exact`; the approved V2 authority migration gate owns the runtime Trust handoff.
- `npm run test:file-sizes` - pass, 1,991 files checked against five baseline caps.
- `npm run test:memory-protocol` - pass.
- `git diff --check` - pass.
