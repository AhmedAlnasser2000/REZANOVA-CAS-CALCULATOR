# COMPOSITION-STAGE-SPLIT1 Verification Summary

Date: 2026-06-12
Agent: codex
Model: gpt-5

## Result

`COMPOSITION-STAGE-SPLIT1` conservatively split stable helper groups out of `src/lib/equation/composition/stage.ts` while keeping the stage file as the guarded composition runtime owner.

## What Changed

- Added `src/lib/equation/composition/carriers.ts` for symbolic family branches, affine/power/shifted/quadratic carrier matching, and branch builders.
- Added `src/lib/equation/composition/periodic-family.ts` for periodic-family formatting, principal-range helpers, supplement construction, metadata merging, badge helpers, and summary formatting.
- `composition/stage.ts` imports the extracted helpers and re-exports moved public carrier helpers for compatibility.
- `polynomial-carrier-follow-on.ts` now imports carrier helpers from `composition/carriers`.
- `tools/file-size-baseline.json` lowered `composition/stage.ts` from 3,795 to 3,186 lines.

## Boundaries

- No solver behavior or output changes.
- No OOE, schema, capability, worker host, history/replay, or display contract changes.
- No split of the main `compositionSolve` flow, recursive guarded handoff, or candidate validation.

## Verification

- `npx tsc --noEmit` passed.
- `npm run test:unit -- src/lib/equation/composition/core.test.ts src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/polynomial-carrier-follow-on.test.ts src/lib/modes/equation.test.ts` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `node tools/validate-file-sizes.mjs --update-baseline`, then `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
