# APPMAIN-EQUATION-RUNTIME1 Completion Report

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

Extract Equation runtime ownership from `AppMain` into `src/app/runtime/useEquationRuntime.ts` while preserving `AppMain` as the cross-mode orchestrator.

## What Changed

- Added `src/app/runtime/useEquationRuntime.ts`.
- Moved Equation screen/menu state, algebra tray state, numeric solve panel state, polynomial and system draft state, Equation refs, route/menu derived values, solve-target analysis, algebra transform analysis, reset/clear/replay helpers, live MathLive snapshot reading, active request construction, runtime controller wiring, and `EquationWorkspace` prop assembly into the hook.
- Kept shared commit/display/history/settings/variable-memory/mode-switching/Guide dispatch ownership in `AppMain`.
- Added `src/app/runtime/useEquationRuntime.ui.test.tsx` for focused hook coverage.
- Kept `AppMain` wiring the hook outputs into global keyboard, soft-action, launcher, Guide, Display, and History flows.

## Boundaries

- Structure-only runtime extraction.
- No solver behavior, result wording, display/readback policy, OOE policy, schema, capability id, worker-host behavior, replay/history contract, stored-value behavior, or reserved-symbol behavior changed.
- Existing `createEquationRuntimeController` remains the runtime launch boundary.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: APPMAIN-EQUATION-RUNTIME1.

## Follow-Ups

- Proceed with the docs-only `FACADE-COMPAT-AUDIT0`.
