# CALC-RAT-READBACK0 Verification Summary

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
npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/modes/calculate.test.ts src/lib/guide/content.test.ts
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
npm run test:ui -- src/AppMain.ui.test.tsx
```

## Notes

- The focused unit bundle passed with 56 tests.
- The golden corpus passed with 27 tests.
- The focused UI suite passed with 81 tests.
- `npm run build` emitted the existing Vite large-chunk warning.
- The visible strategy remains `partial-fractions`.
- Source mirrors and Playground runners were not executed.
