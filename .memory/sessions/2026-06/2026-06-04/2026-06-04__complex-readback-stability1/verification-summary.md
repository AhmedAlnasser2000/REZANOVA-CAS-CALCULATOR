# COMPLEX-READBACK-STABILITY1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Status

Focused unit, UI, memory protocol, lint, and build verification passed.

## Passed

```bash
npm run test:unit -- src/lib/algebra/variable-core.test.ts src/lib/algebra/variable-hints.test.ts src/lib/equation/equation-target.test.ts src/lib/equation/equation-complex.test.ts
```

Result: 4 files passed, 39 tests passed.

```bash
npm run test:unit -- src/lib/algebra/variable-hints.test.ts src/lib/equation/equation-complex.test.ts src/lib/numeric/complex.test.ts src/lib/modes/equation.test.ts
```

Result: 4 files passed, 136 tests passed.

```bash
npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariableHintStrip.ui.test.tsx
```

Result: 2 files passed, 122 tests passed.

## Final Gate

```bash
npm run test:memory-protocol
npm run lint
npm run build
```

Result:

- Memory protocol validation passed.
- Lint passed with the existing Node color-environment warning.
- Build passed.

## Notes

- `src/lib/modes/equation.test.ts` remains the slowest focused unit suite because it includes heavy selected-target and hygiene regressions.
- `src/AppMain.ui.test.tsx` remains the slowest UI suite because it covers broad Equation and workspace behavior.
- No solver capability, UI route, history schema, OOE behavior, non-Equation route, stored-value policy, or Rust behavior changed.
