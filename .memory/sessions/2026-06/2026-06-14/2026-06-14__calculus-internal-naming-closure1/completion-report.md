# CALCULUS-INTERNAL-NAMING-CLOSURE1 Completion Report

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

Remove remaining internal Advanced Calculus naming from live source after schema and Guide compatibility were retired.

## What Changed

- Renamed variable-memory mode/action policy from `advanced-calc` / `advanced-calc-evaluate` to `calculus` / `calculus-workspace-evaluate`.
- Renamed Calculus workspace integral/limit state types, defaults, local state variables, setter props, and helper names from `Advanced*` / `advanced*` wording to canonical Calculus wording.
- Renamed app-shell focus refs and workspace props from `advanced*` names to `calculus*` names.
- Removed the legacy Calculus mode canonicalization constant/helper; `isCalculusMode` now recognizes only current `calculus`.
- Renamed remaining Calculus test helper/descriptions and breadcrumb/history ids to canonical wording.
- Verified the planned retired-name grep returns no matches in `src` and `src-tauri`.

## Boundaries

- Did not change solver behavior, output wording, Display policy, OOE policy, worker-host identity, current `calculus` schema shape, stored-value behavior, CSS behavior, or Guide content meaning.
- Did not stage the concurrent architecture-docs grouping lane; this commit is limited to live Calculus naming closure and its same-commit memory record.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-INTERNAL-NAMING-CLOSURE1.

## Follow-Ups

- Reconcile any concurrent docs/current-state grouping lane separately before treating the whole checkout as clean.
