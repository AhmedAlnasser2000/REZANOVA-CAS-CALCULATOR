# ALGEBRAIC-READBACK-SCALAR-PRODUCT-NORMALIZATION1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- label: ui
- type: generated exact algebraic integration readback normalization

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus0-symbolic-branch-coverage.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-inverse-readback.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-rational-in-radical.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` passed: 6 files, 113 tests.
- `npm run test:ui -- src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx` passed: 1 file, 5 tests.
- `npx playwright test e2e/algebraic-readback-smoke.spec.ts` passed against a dev server on `127.0.0.1:4173`: 1 Chromium test.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed after durable-memory updates.
- `git diff --check` passed.

## Blocked Gate Evidence

- `npm run test:e2e -- e2e/algebraic-readback-smoke.spec.ts` did not reach Playwright because the build/typecheck step is currently blocked by unrelated active-lane errors in `src/app/runtime/editorTargets.ts`.
- `npx tsc -b --pretty false` is blocked by the same unrelated active-lane errors; no algebraic-readback files are listed in the failure output.

## Evidence Notes

- Browser evidence verifies the current Calculus Indefinite main-editor flow and the visible answer card for `1/sqrt(a*x+b)`.
- The Playwright smoke asserts the rendered exact answer contains `\frac{2}{a}` and `sqrt`, and does not contain `2\frac{1}{a}`.
- The reusable Calculus integration UI evidence harness remains the next approved milestone; this milestone added only a minimal smoke lens for the visible readback fix.
