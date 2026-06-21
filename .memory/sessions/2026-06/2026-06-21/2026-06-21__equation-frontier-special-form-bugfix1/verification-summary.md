# EQUATION-FRONTIER-SPECIAL-FORM-BUGFIX1 Verification Summary

Date: 2026-06-21

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live verification

## Verified

- `npx tsc -b --pretty false` passed.
- `npm run test:ui -- src/components/MathEditor.ui.test.tsx` passed.
- `npm run test:unit -- src/lib/input/input-canonicalization.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/equation/parameterized/special-form-roots.test.ts src/lib/equation/equation-algebraic-isolation.test.ts` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `npm run lint` passed.
- `npm run build` passed; existing Vite dynamic/static chunk warnings were non-blocking.
- `git diff --check` passed.
- Direct probe evidence:
  - `(x+a)^5=b` real Exact returns `x=\sqrt[5]{b}-a`.
  - `(x+a)^{12}=b` real Exact returns both real branches with `b\ge0`.
  - `x^6-5x^3+4=0` real Exact returns `x\in{\sqrt[3]{4}, 1}`.
  - `x^{12}-5x^6+4=0` real Exact returns `x\in{-\sqrt[6]{4}, \sqrt[6]{4}, -1, 1}`.
  - Complex high-degree special-form cases stop with the dedicated Complex boundary.
