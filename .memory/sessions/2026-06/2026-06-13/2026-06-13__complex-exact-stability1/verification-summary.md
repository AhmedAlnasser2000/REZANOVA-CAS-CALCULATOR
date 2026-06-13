# COMPLEX-EXACT-STABILITY1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live
- commit_hash: `c672758`

## Scope

`COMPLEX-EXACT-STABILITY1` adds focused stability coverage for the existing Complex On + Exact Equation surface.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/modes/equation-complex-stability.test.ts src/lib/equation/equation-direct-symbolic-worker.test.ts`
- `npm run test:unit -- src/lib/equation/equation-complex.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed history/replay coverage included `equationDomainIntent` and `complexExactForm`.
- Confirmed direct-symbolic worker parity stayed inside the existing worker harness.
- Confirmed no new Complex families were added.

## Outcome

All planned Complex Exact stability checks passed before `c672758`. This record was added later because the memory closeout step was missed.

## Outstanding Gaps

No known `COMPLEX-EXACT-STABILITY1` gaps.
