## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/parameterized/factorable-polynomial.test.ts src/lib/modes/equation/parameterized-search-trace.test.ts` passed.
- `npm run test:unit -- src/lib/equation/parameterized/factorable-polynomial.test.ts src/lib/equation/parameterized/product-decomposition.test.ts src/lib/equation/roots/representation.test.ts src/lib/equation/roots/readback.test.ts src/lib/equation/facts/branch-domain-facts.test.ts src/lib/equation/cap-hit-evidence.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/parameterized-search-trace.test.ts` passed.
- `npm run test:compartments-boundaries` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `npm run lint` passed.
- `npm run build` passed with the existing non-blocking Vite dynamic/static import chunking warnings.
- `git diff --check` passed.
