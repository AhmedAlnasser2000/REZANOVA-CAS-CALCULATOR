# OOE-PILOT-SURFACE-GROUPING1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Scope

`OOE-PILOT-SURFACE-GROUPING1` moves OOE pilot files and direct pilot tests into `src/lib/ooe/pilots/`.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/ooe/pilots/*.test.ts src/lib/ooe/runtime-shell-contract.test.ts src/lib/ooe/ooe-bridge.test.ts src/lib/ooe/runtime-coordinator.test.ts`
- `npm run test:unit -- src/lib/modes/*worker*.test.ts src/lib/modes/table.test.ts src/lib/modes/calculate/*.test.ts src/lib/modes/equation/*.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Outcome

- All planned pilot grouping checks passed.

## Outstanding Gaps

- No known `OOE-PILOT-SURFACE-GROUPING1` gaps.
