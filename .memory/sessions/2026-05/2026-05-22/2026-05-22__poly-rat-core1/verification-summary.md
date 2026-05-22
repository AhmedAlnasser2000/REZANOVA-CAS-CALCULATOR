# POLY-RAT-CORE1 Verification Summary

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
npm run test:unit -- src/lib/algebra/polynomial-core.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/capability-readiness.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/modes/calculate.test.ts
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```

## Notes

- Focused algebra tests cover repeated rational linear factors, mixed repeated/distinct linear denominators, irreducible quadratics, algebraic-root stops, degree-limit stops, and wider readiness envelopes.
- Symbolic integration, calculus core, Calculate, and golden tests keep visible behavior stable.
- `npm run build` passed with the existing large-chunk warning.
