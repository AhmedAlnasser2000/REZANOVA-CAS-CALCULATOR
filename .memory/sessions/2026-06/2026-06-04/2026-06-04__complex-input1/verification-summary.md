# COMPLEX-INPUT1 Verification Summary

## Passed

```bash
npm run test:unit -- src/lib/input/input-canonicalization.test.ts src/lib/algebra/variable-core.test.ts src/lib/modes/equation.test.ts src/lib/ooe/equation-pilot.test.ts
```

Result: 4 files passed, 143 tests passed.

## Notes

- The Equation suite remains comparatively slow because it includes large selected-target and hygiene regressions.
- No UI, history schema, solver breadth, OOE runtime behavior, or stored-value behavior changed.
