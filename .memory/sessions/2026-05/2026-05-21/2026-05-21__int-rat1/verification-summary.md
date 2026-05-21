# INT-RAT1 Verification Summary

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
npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/calculus/calculus-strategy.test.ts src/lib/engine/math-engine.test.ts src/lib/modes/calculate.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/capability-readiness.test.ts
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```

## Notes

- The new rational integration examples verify through the existing antiderivative backcheck.
- Safe finite definite rational examples use the shared exact definite-integral trust path.
- Unsafe finite definite rational intervals crossing a denominator zero stop before numeric fallback.
- Repeated-factor and irreducible-quadratic rational cases remain controlled unsupported families with explicit blocker metadata.
- `npm run build` passed with the existing large-chunk warning.
- Optional `npm run test:ui` and Playwright smoke were not run in this checkpoint.
