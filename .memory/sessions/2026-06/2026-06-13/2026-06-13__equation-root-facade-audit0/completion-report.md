# EQUATION-ROOT-FACADE-AUDIT0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Add a durable audit of the current Equation root facade and active-surface layout after Candidate and Target splitting.

## What Changed

- Added `docs/architecture/equation-root-facade-audit.md`.
- Updated `docs/README.md` to list the new architecture audit.
- Recorded which root files are compatibility facades, active root surfaces, root test surfaces, and deferred district candidates.
- Added same-commit memory records for the audit milestone.

## Boundaries

- Docs and memory only.
- No Equation code changes.
- No root facade deletion, active root movement, solver behavior, output wording, display/readback, OOE/runtime, replay/history, schema, capability, worker-host, or reserved-symbol changes.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: EQUATION-ROOT-FACADE-AUDIT0.

## Follow-Ups

- Continue with `EQUATION-ROOT-FACADE-TIDY1`.
