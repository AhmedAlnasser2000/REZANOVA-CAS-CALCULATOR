# INT-RAT2 Verification Summary

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

Passed before final commit:

```bash
npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/calculus/calculus-strategy.test.ts src/lib/engine/math-engine.test.ts src/lib/modes/calculate.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/capability-readiness.test.ts src/lib/algebra/simplify-policy.test.ts
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
npm run test:ui
```

## Notes

- The focused unit bundle passed with 135 tests.
- The visible strategy remains `partial-fractions`.
- Source mirrors and Playground runners were not executed.
- `npm run build` emitted the existing Vite large-chunk warning.
- Optional UI coverage passed with 85 tests.
