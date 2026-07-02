## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

- Gate: `CALCULUS-LIMITS-LHOSPITAL-ROBUST1`
- Type: backend

## Passed

- `npm run test:unit -- src/lib/symbolic-engine/limits/lhospital.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/limit-route-classifier.test.ts`
- `npx tsc -b --pretty false`
- `npm run test:memory-protocol`
- `npm run test:file-sizes`
- `git diff --check`
