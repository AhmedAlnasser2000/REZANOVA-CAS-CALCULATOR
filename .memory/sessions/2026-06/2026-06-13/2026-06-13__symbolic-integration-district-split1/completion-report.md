# SYMBOLIC-INTEGRATION-DISTRICT-SPLIT1 Completion Report

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

Split the over-cap Symbolic Engine integration surface into a private district while preserving the root public facade and all existing symbolic integration behavior.

## What Changed

- Kept `src/lib/symbolic-engine/integration.ts` as a public compatibility facade.
- Added private modules under `src/lib/symbolic-engine/integration/` for types/constants, metadata/domain hazards, shared node helpers, rational partial fractions, rule families, and dispatch.
- Preserved integration dispatch order exactly: inverse trig, derivative ratio, partial fractions, substitution, direct rule, by parts, affine-linear, unsupported.
- Kept `src/lib/symbolic-engine/integration.test.ts` at the root because it remains below cap and proves public facade compatibility.
- Added `docs/architecture/symbolic-integration-district.md`.
- Updated `docs/README.md`.

## Boundaries

- Structure-only split.
- No new symbolic solver families, exact Latex changes, strategy id changes, candidate metadata changes, controlled failure wording changes, OOE/runtime policy changes, replay/history changes, schema changes, capability changes, stored-value behavior changes, or reserved-symbol policy changes.
- `patterns.ts`, `normalize.ts`, and `precedence.ts` were not touched.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts` passed.
- `npm run test:unit -- src/lib/symbolic-engine/*.test.ts` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: SYMBOLIC-INTEGRATION-DISTRICT-SPLIT1.

## Follow-Ups

- Continue with `SYMBOLIC-RADICAL-DISTRICT-SPLIT1`.
