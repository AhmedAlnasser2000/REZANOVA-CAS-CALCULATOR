# EQUATION-BRANCH-DOMAIN-FACTS1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Static Verification

- Confirmed the worktree was clean before implementation.
- Confirmed adoption is limited to factorable delegated root groups and parameterized rational denominator exclusions.
- Confirmed `exactSupplementLatex` remains a rendered compatibility surface and still emits raw strings such as `z-a\ne0` / `a\ge0`.
- Confirmed `detailSections` remain prose/readback and are not parsed for facts.
- Confirmed no Display, History, OOE, app-state, Tauri, UI, graphing, step-by-step, cap, source-mirror, or Exact/Isolate behavior changed.

## Verification Commands

- `npx tsc -b --pretty false` - passed
- `npm run test:unit -- src/lib/equation/facts/branch-domain-facts.test.ts src/lib/equation/roots/representation.test.ts src/lib/equation/parameterized/rational.test.ts src/lib/equation/parameterized/factorable-polynomial.test.ts src/lib/equation/parameterized/product-decomposition.test.ts` - passed
- `npm run test:compartments-boundaries` - passed
- `npm run test:file-sizes` - passed
- `npm run test:memory-protocol` - passed
- `npm run lint` - passed
- `npm run build` - passed
- `git diff --check` - passed

## Notes

- The recurring Node `NO_COLOR` / `FORCE_COLOR` warning appeared during the initial TypeScript and focused test checks and remained non-fatal.
- The existing Vite dynamic/static import chunking warnings appeared during build and remained non-blocking because `npm run build` exited successfully.
