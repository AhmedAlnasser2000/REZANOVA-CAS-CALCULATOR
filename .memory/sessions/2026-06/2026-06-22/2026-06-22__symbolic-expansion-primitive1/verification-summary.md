# SYMBOLIC-EXPANSION-PRIMITIVE1 Verification Summary

Date: 2026-06-22

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live repo implementation

## Verification

Passed:

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/symbolic-engine/primitives/expansion/expansion.test.ts`
- `npm run test:unit -- src/lib/equation/polynomial/carrier-follow-on.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/primitives/expansion/expansion.test.ts src/lib/equation/polynomial/carrier-follow-on.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- `npm run test:unit -- src/lib/modes/equation/answer-modes.test.ts`
- `npm run test:unit -- src/lib/modes/equation/answer-modes.test.ts src/lib/symbolic-engine/primitives/expansion/expansion.test.ts src/lib/equation/polynomial/carrier-follow-on.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- `npm run test:unit -- src/lib/modes/equation/complex-domain.test.ts`
- `npm run test:unit -- src/lib/modes/equation/complex-domain.test.ts src/lib/modes/equation/answer-modes.test.ts src/lib/symbolic-engine/primitives/expansion/expansion.test.ts src/lib/equation/polynomial/carrier-follow-on.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- `npm run test:unit -- src/lib/modes/equation/complex-domain.test.ts` after the Complex `ii` regression fix
- `npx tsc -b --pretty false` after the Complex `ii` regression fix
- `npm run test:unit -- src/lib/modes/equation/complex-domain.test.ts src/lib/modes/equation/answer-modes.test.ts src/lib/symbolic-engine/primitives/expansion/expansion.test.ts src/lib/equation/polynomial/carrier-follow-on.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts` after the Complex `ii` regression fix
- `npm run test:compartments-boundaries`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`

Regression evidence:

- Complex Exact `(x^2+x)^2-(x^2+x)-1=0` succeeds through the narrow quadratic-carrier follow-on.
- The Complex follow-on exact readback contains an imaginary branch but does not contain `ii` or `\imaginaryI\imaginaryI`.

Known benign output:

- Node may warn that `NO_COLOR` is ignored because `FORCE_COLOR` is set.
- `npm run build` passed with the known Vite dynamic/static import chunk warnings.
