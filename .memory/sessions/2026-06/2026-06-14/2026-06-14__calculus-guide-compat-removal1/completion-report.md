# CALCULUS-GUIDE-COMPAT-REMOVAL1 Completion Report

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

Remove the remaining legacy Advanced Calculus Guide compatibility surface and keep guided Calculus content on canonical ids only.

## What Changed

- Removed the `advancedCalculus` Guide domain and hidden compatibility selection state.
- Removed the `advanced-calculus-core` capability from runtime types, Guide symbol mapping, active capabilities, and virtual-keyboard catalog ownership.
- Renamed legacy guided Calculus article ids to canonical `calculus-*` ids with no redirects.
- Updated AppMain guide shortcuts, Calculus workspace route metadata, Guide content/search/symbol tests, and Guide runtime UI tests to use the canonical ids.
- Deleted the orphaned `articles-advanced-calculus.ts` compatibility export.
- Updated the Guide compatibility audit with the final removal record.

## Boundaries

- Did not change Guide article wording, example LaTeX, launch destinations, runtime behavior, solver behavior, Display policy, OOE policy, stored-value behavior, CSS behavior, or current Calculus schema shape.
- Did not remove internal `advanced-calc` variable-memory naming; that is reserved for `CALCULUS-INTERNAL-NAMING-CLOSURE1`.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-GUIDE-COMPAT-REMOVAL1.

## Follow-Ups

- Continue with `CALCULUS-INTERNAL-NAMING-CLOSURE1` to remove remaining internal `advanced-calc` names.
