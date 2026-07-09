# ALGEBRAIC-INTEGRATION-UI-EVIDENCE-HARNESS1 Verification Summary

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
- type: reusable Calculus Indefinite integration browser evidence harness

## Verification

- `npx playwright test e2e/algebraic-integration-ui-evidence.spec.ts` passed: 2 Chromium tests.
- `npx playwright test e2e/algebraic-readback-smoke.spec.ts e2e/algebraic-integration-ui-evidence.spec.ts` passed: 3 Chromium tests against a dev server on `127.0.0.1:4173`.
- `npm run test:ui -- src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx` passed: 1 file, 5 tests.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` passed: 3 files, 97 tests.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Evidence Notes

- Browser evidence covers the current main-editor Calculus Indefinite flow, answer card raw LaTeX, visible `Valid When` facts, Copy Result capture, History replay, and answer-card overflow readiness.
- The partial-fractions evidence path verifies the reusable detail-card helper against an actual result detail section.

## Blocked Gate Evidence

- `npx tsc -b --pretty false` remains blocked by unrelated active-lane errors in `src/app/runtime/editorTargets.ts`.
- `npm run test:e2e -- ...` remains blocked before Playwright by the same unrelated build/typecheck failure, so this milestone records direct Playwright evidence against the local dev server.
