# CI-UNIT-REFOBJECT-CLEANUP1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate Label

- backend

## Scope

- Cleared the reported CI unit failures and refreshed stale unit/UI assertions.
- Removed deprecated React `MutableRefObject` usage from `src`.
- Added a safe editor-target guard for non-DOM test/SSR contexts.
- Added generated exp/log real-domain validation so impossible same-base log candidates fail closed.
- Made the numeric golden trace elapsed soft budget CI-aware while keeping root-count and rejected-candidate limits strict.
- Kept `.task_tmp/**` ignored by ESLint as workflow scratch.

## Verification

- `npm run test:unit` passed: 470 files, 3403 tests.
- `npm run test:ui` passed: 56 files, 431 tests.
- `npx tsc -b --pretty false` passed.
- `npm run lint` passed.
- `npm run build` passed with existing large-chunk warnings only.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed after durable memory updates.
- `git diff --check` passed after durable memory updates.
- Follow-up: `CI=true npm run test:unit -- src/lib/modes/equation/numeric-golden-trace-harness.test.ts` passed after the final CI soft-budget adjustment.
- Follow-up: `npx tsc -b --pretty false` passed after the final CI soft-budget adjustment.

## Notes

- `rg -n "MutableRefObject" src` returns no matches.
- The recurring `NO_COLOR`/`FORCE_COLOR` Node warning appeared during commands but was non-fatal.
- No Playwright visual pass was run for this CI cleanup because the changed app-visible math behavior is covered by existing UI tests rather than a new visible output milestone.
