# CALCULUS-LEGACY-SCHEMA-CLOSURE1 Completion Report

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

Hard-remove legacy Advanced Calculus schema/replay compatibility from live app and Rust/Tauri surfaces while preserving current canonical `calculus` behavior.

## What Changed

- Removed `advancedCalculus` from app mode schemas, launcher launch targets, launcher categories, Rust/Tauri mode/category enums, OOE bridge schema, and History parsing.
- Renamed current persisted Calculus launch/history fields to `calculusScreen` and `calculusSeed`.
- Renamed canonical TypeScript screen/result-origin surfaces to `CalculusScreen` and `CalculusResultOrigin`.
- Updated AppMain, app-flow routing, runtime hooks, History construction/restoration, launcher/menu metadata, and focused tests to use canonical Calculus fields only.
- Removed replay and History fallback behavior for old `advancedCalculus` / `advancedCalc*` records.
- Added schema regression coverage that rejects old legacy history records instead of mapping them forward.

## Boundaries

- Did not remove legacy Guide domain/capability/article ids; those are reserved for `CALCULUS-GUIDE-COMPAT-REMOVAL1`.
- Did not remove internal `advanced-calc` variable-memory action names or test-helper names; those are reserved for `CALCULUS-INTERNAL-NAMING-CLOSURE1`.
- Did not change solver behavior, output wording, Display policy, OOE policy, worker-host identity, current `calculus` schema shape, stored-value behavior, CSS behavior, or Guide article content meaning.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-LEGACY-SCHEMA-CLOSURE1.

## Follow-Ups

- Continue with `CALCULUS-GUIDE-COMPAT-REMOVAL1` to remove legacy Guide compatibility.
- Continue with `CALCULUS-INTERNAL-NAMING-CLOSURE1` to remove remaining internal `advanced-calc` naming.
