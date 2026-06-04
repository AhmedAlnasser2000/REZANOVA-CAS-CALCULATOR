# COMPLEX-INPUT1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Passed

```bash
npm run test:unit -- src/lib/input/input-canonicalization.test.ts src/lib/algebra/variable-core.test.ts src/lib/modes/equation.test.ts src/lib/ooe/equation-pilot.test.ts
```

Result: 4 files passed, 143 tests passed.

## Notes

- The Equation suite remains comparatively slow because it includes large selected-target and hygiene regressions.
- No UI, history schema, solver breadth, OOE runtime behavior, or stored-value behavior changed.
