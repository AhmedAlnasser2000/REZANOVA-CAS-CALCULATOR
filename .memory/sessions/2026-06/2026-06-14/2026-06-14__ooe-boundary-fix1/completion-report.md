# OOE-BOUNDARY-FIX1 Completion Report

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

Repair the OOE boundary regression where the Equation pilot imported Equation complex-input policy directly after the OOE traffic-control split.

## What Changed

- Removed the direct `complex-input-policy` import from `src/lib/ooe/pilots/equation-pilot.ts`.
- Added `explicitImaginaryInput` to the Modes/Equation OOE route snapshots in `src/lib/modes/equation/ooe-snapshot.ts`.
- Updated Equation pilot provenance to consume the snapshot metadata.
- Added focused tests for snapshot-owned explicit imaginary-input evidence.
- Added this same-commit memory record.

## Boundaries

- Boundary-only repair.
- No OOE boundary validator loosening.
- No Equation solver behavior, output wording, provenance shape, schema, host id, diagnostics wording, replay/history contract, stored-value behavior, or reserved-symbol policy changed.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: OOE-BOUNDARY-FIX1.

## Follow-Ups

- `MEMORY-CURRENT-STATE-CATCHUP1` will update current-state memory after this boundary repair lands.
