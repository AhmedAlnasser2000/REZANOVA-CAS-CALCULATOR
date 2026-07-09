# CALCULUS-GUIDED-WORKSPACE-MERGE1 Completion Report

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

Retire the physical `src/lib/advanced-calc/` implementation folder by moving the guided Calculus workspace implementation under canonical `src/lib/calculus/workspace/`.

## What Changed

- Moved guided Calculus implementation and tests into `src/lib/calculus/workspace/`.
- Removed the old `src/lib/advanced-calc/` folder without compatibility stubs.
- Renamed live implementation exports from `runAdvancedCalcMode`, `RunAdvancedCalcModeRequest`, and `getAdvancedCalc*` helpers to canonical workspace names.
- Updated AppMain, app runtime hooks, app logic, modes, worker client/entrypoint, docs, and tests to import from `src/lib/calculus/workspace/*`.
- Updated Calculus identity and engine-path audit docs with the final merge record.

## Boundaries

- Preserved `AdvancedCalcScreen`, `AdvancedCalcResultOrigin`, `advancedCalcScreen`, `advancedCalcSeed`, legacy `advancedCalculus`, Guide launch fields, Guide content ids, schemas, replay compatibility, worker host ids, OOE capability ids, solver behavior, output wording, Display behavior, stored-value behavior, and reserved-symbol behavior.
- Did not rename CSS files or selectors; that remains for `CALCULUS-CSS-IDENTITY-CLOSURE1`.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-GUIDED-WORKSPACE-MERGE1.

## Follow-Ups

- Continue with `CALCULUS-CSS-IDENTITY-CLOSURE1` to rename `advanced-calc.css` and live `.advanced-calc-*` selectors to canonical Calculus naming.
