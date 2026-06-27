## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

# Verification Summary

Status: implemented and verified locally. No commit has been performed for this implementation gate.

Evidence recorded:
- `npm run test:unit -- src/lib/modes/equation/real-wrapper-coverage-bundle.test.ts` passed.
- `npm run test:unit -- src/lib/modes/equation/real-wrapper-coverage-bundle.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/modes/equation/nth-root-wrapper-formula.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/modes/equation/parameterized-families.test.ts` passed with 6 files and 120 tests.
- `npm run build` passed.
- `npm run test:file-sizes` passed after the affine root carrier helper was extracted from `composition/core.ts`.
- `npm run test:memory-protocol` passed after attribution metadata formatting was normalized.
- `git diff --check` passed.

Scope verified:
- Narrow Cardano/Ferrari producer-side known-nonzero self-ratio readback cleanup only.
- Rational/linear-fractional Real Cardano/Ferrari examples are locked as regression coverage.
- Real Exact affine single-root radical shells isolate `(R-C)/A`, preserve symbolic `A\ne0`, reuse odd/even root policies, and delegate generated degree-3/4 branches.
- Complex affine radical, mixed/two-radical, and nested wrapper boundaries remain unsupported.
- No Display, OOE, History, Tauri, app-state, persisted schema, Copy Result, or Formula Viewer contract changes were made.
