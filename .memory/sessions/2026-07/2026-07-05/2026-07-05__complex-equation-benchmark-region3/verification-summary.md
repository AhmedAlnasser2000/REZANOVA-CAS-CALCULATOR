## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification Summary

- Gate: backend.
- Focused Vitest passed:
  - `npx vitest run src/lib/modes/equation/complex-benchmark-region-runner.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts`
- TypeScript passed:
  - `npx tsc -b --pretty false`
- App visual verification: not run for this frontier because the change is benchmark-runner-only and does not alter rendered app output. Existing manual Complex Region cards and global-polynomial cards remain covered by their prior app-visible frontiers.
- Shared memory boundary: shared current-state, decisions, and journal files were already dirty from other active work, so this gate does not stage or rewrite them.

## Evidence Notes

- `x^6+x+1=0` stays primary `global-polynomial` with no staged region attempts.
- `e^z+z=0` succeeds in the first staged region with contour count and candidate count both `1`.
- `e^z+z-20=0` records the first region as verified zero-root evidence, then succeeds in the larger staged region.
- A custom one-box no-root region records `bounded-region-zero-roots` rather than supported.
