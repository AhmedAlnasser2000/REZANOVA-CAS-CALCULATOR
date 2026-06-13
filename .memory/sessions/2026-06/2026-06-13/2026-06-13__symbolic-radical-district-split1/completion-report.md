# SYMBOLIC-RADICAL-DISTRICT-SPLIT1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Split the over-cap Symbolic Engine radical surface into a private district while preserving the root public facade and all existing radical normalization behavior.

## What Changed

- Kept `src/lib/symbolic-engine/radical.ts` as a public compatibility facade.
- Added private modules under `src/lib/symbolic-engine/radical/` for types, exact scalar helpers, node builders, constant nested radical denesting, monomial root normalization, additive term combination, rationalization/conjugate transforms, and public API orchestration.
- Kept `src/lib/symbolic-engine/radical.test.ts` at the root because it remains below cap and proves public facade compatibility.
- Added `docs/architecture/symbolic-radical-district.md`.
- Updated `docs/README.md`.
- Removed the stale `src/lib/symbolic-engine/radical.ts` file-size baseline entry with the repo ratchet tool.

## Boundaries

- Structure-only split.
- No new symbolic solver families, exact Latex changes, strategy id changes, candidate metadata changes, controlled failure wording changes, OOE/runtime policy changes, replay/history changes, schema changes, capability changes, stored-value behavior changes, or reserved-symbol policy changes.
- `patterns.ts`, `normalize.ts`, and `precedence.ts` were not touched.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/symbolic-engine/radical.test.ts src/lib/algebra/radical/radical-core.test.ts src/lib/algebra/absolute-value/abs-core.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts` passed.
- `npm run test:unit -- src/lib/symbolic-engine/*.test.ts src/lib/modes/equation/*.test.ts` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: SYMBOLIC-RADICAL-DISTRICT-SPLIT1.

## Follow-Ups

- Continue with `SYMBOLIC-POWER-LOG-SURFACE-AUDIT0`.
