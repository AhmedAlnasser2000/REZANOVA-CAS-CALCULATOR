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

- gate_type: backend
- milestone: `SPECIAL-FUNCTION-ERF-ERFI-SUBSTRATE1`

## Verification

- `npx vitest run src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-proof-diff.test.ts` passed.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` passed.
- `npx tsc -b --pretty false` passed.
- `node tools/validate-file-sizes.mjs` passed.

## Notes

- `git diff --check` and `npm run test:memory-protocol` are run during the commit checkpoint for this gate.
