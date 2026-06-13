# EQUATION-PARAMETERIZED-SHARED-SPLIT1 Completion Report

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

Split selected-target Parameterized Equation helper and route internals while preserving public route files and behavior.

## What Changed

- Added shared `src/lib/equation/parameterized/` helpers for MathJSON operations, target context parsing, facts, and generated-equation handoff parsing.
- Kept `parameterized/trig.ts`, `parameterized/exp-log.ts`, and `parameterized/mixed-algebraic.ts` as public import facades.
- Split trig into private modules for public/internal types, carrier collection, direct trig solving, and mixed sine/cosine solving.
- Split exp/log into private modules for public/internal types, carrier/base logic with generated solve finalization, and target-base direct solving.
- Moved mixed-algebraic branch generation and branch solving into a private branch module.
- Updated `tools/file-size-baseline.json` after removing stale over-cap parameterized entries.

## Boundaries

- No solver-order changes.
- No display or readback wording changes.
- No OOE, replay/history, schema, capability, worker-host, or reserved-symbol changes.
- Existing first-party callers continue importing from the same public route files.
- Guarded implementation splitting remains deferred.

## Verification

- `npx tsc -b --pretty false` passed.
- Full Parameterized unit slice passed.
- Focused algebraic and selected-target isolation tests passed.
- Guarded/shared/parity/Equation-mode unit slice passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- Removed stale baseline entries for:
  - `src/lib/equation/parameterized/exp-log.ts`
  - `src/lib/equation/parameterized/mixed-algebraic.ts`
  - `src/lib/equation/parameterized/trig.ts`
- Largest parameterized implementation file after the split stayed below the 900-line ratchet.

## Commits

- Same-commit milestone: EQUATION-PARAMETERIZED-SHARED-SPLIT1.

## Follow-Ups

- Land `EQUATION-GUARDED-DISTRICT-AUDIT0` as a docs-only audit before any guarded implementation split.
