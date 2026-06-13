# EQUATION-ROOT-SURFACE-MAP1 Completion Report

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

Add the durable Equation root surface map after Candidate, Target, audit, and facade tidy cleanup.

## What Changed

- Added `docs/architecture/equation-root-surface-map.md`.
- Updated `docs/README.md` to list the root surface map.
- Recorded import-boundary rules, public compatibility facades, active root surfaces, root test surface policy, and future cleanup guidance.
- Added same-commit memory records for the surface map milestone.

## Boundaries

- Docs and memory only.
- No Equation code changes.
- No solver behavior, output wording, display/readback, OOE/runtime, replay/history, schema, capability, worker-host, or reserved-symbol changes.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: EQUATION-ROOT-SURFACE-MAP1.

## Follow-Ups

- Use the map as the reference before future Equation active-root splits.
