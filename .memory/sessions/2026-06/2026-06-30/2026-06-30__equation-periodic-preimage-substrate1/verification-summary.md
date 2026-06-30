## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate: backend

Focused verification run:

- `npm run test:unit -- src/lib/modes/equation/periodic-preimage-substrate.test.ts`
- `npm run test:unit -- src/lib/modes/equation/periodic-preimage-substrate.test.ts src/lib/equation/guarded/composition-periodic.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts src/lib/equation/parameterized/trig.test.ts`

Observed result:

- Focused tests passed.
- Periodic composition, periodic interval numeric, and parameterized trig regressions passed after updating expectations for the new compact exact family readback.

Final gate notes before commit:

- `npm run lint`: passed.
- `npm run test:memory-protocol`: passed.
- `git diff --check`: passed.
- `npm run build`: blocked by unrelated dirty Calculus derivative workspace TypeScript errors in `src/lib/calculus/workspace/engine.ts`.
- `npm run test:file-sizes`: blocked by unrelated dirty runtime/type files over their existing caps (`src/app/runtime/useCalculusRuntime.ts`, `src/types/calculator/runtime-types.ts`).
