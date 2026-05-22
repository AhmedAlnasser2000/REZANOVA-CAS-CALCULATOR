# SIMPLIFY-CORE0 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Commands

Passed:

```bash
npm run test:unit -- src/lib/algebra/simplify-policy.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/modes/calculate.test.ts
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```

## Notes

- The pass is policy/metadata only.
- Existing integration tests still pass before `INT-RAT2` changes.
- `npm run build` emitted the existing large-chunk warning.
