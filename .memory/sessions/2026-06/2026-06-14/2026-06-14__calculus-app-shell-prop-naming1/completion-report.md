# CALCULUS-APP-SHELL-PROP-NAMING1 Completion Report

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

Normalize current app-shell Calculus prop and callback names from legacy `advancedCalc*` vocabulary to canonical `calculus*` vocabulary without changing persisted compatibility fields or internal `advanced-calc` implementation paths.

## What Changed

- Renamed current AppMain Calculus runtime outputs and local props to `calculus*`.
- Renamed DisplayPanel and private display-panel Calculus props to `calculus*`.
- Renamed app logic dependencies for focus routing, expression routing, reset, soft actions, keypad routing, primary actions, Guide routing, and window-key routing where they describe current Calculus UI behavior.
- Renamed `useCalculusRuntime` public hook outputs/callbacks to current Calculus names.
- Renamed History/Display shell delegates that point at current Calculus runtime state.
- Updated focused runtime and app-logic tests to the new app-shell names.
- Updated the Calculus identity audit with the final split record.

## Boundaries

- Structure-only app-shell naming closure.
- Preserved `AdvancedCalcScreen`, `advancedCalcScreen`, `advancedCalcSeed`, `advancedCalculus`, Guide launch fields, schemas, replay fallback paths, CSS selectors, and `src/lib/advanced-calc/*`.
- No solver, Display, OOE, worker, CSS, Guide, schema, replay/history, stored-value, or reserved-symbol behavior changes.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-APP-SHELL-PROP-NAMING1.

## Follow-Ups

- Continue with `CALCULUS-GUIDE-DOMAIN-COMPAT-AUDIT0` to audit Guide domain/content ids that still intentionally use legacy `advancedCalculus` compatibility names.
