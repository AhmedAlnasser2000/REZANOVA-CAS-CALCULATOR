# ARCH3 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Milestone: `ARCH3 — Shared Runtime Envelopes and Internal Advisories for Calculate and Equation`
- Date: `2026-04-09`
- Status: verified, not yet committed

## Scope Delivered
- Added `src/lib/kernel/runtime-envelope.ts` as a shared internal envelope helper for:
  - success/error `DisplayOutcome` assembly
  - planner-badge attach/merge behavior
  - `resolvedInputLatex` attachment
  - optional internal runtime-advisory attachment
- Extended `src/types/calculator/display-types.ts` with a minimal internal-only advisory model:
  - `blocked/range-guard`
  - `blocked/invalid-request`
  - `manual-only`
  - `suggest-on-error`
- Rewired `src/lib/modes/calculate.ts` to use the shared envelope instead of a mode-local `toOutcome()` / planner helper pair.
- Rewired `src/lib/modes/equation.ts` to use the shared envelope and attach Equation numeric-solve advisories while preserving planner-badge merge behavior.
- Refactored `src/app/logic/runtimeControllers.ts` so Equation numeric-solve gating now depends on runtime advisories rather than brittle error-string checks.

## Behavior Notes
- Scope stayed limited to `Calculate` and `Equation`.
- `Table` remained metadata-linked and out of the shared envelope work.
- Runtime advisories remain internal-only:
  - not rendered
  - not persisted into history
  - not added to persisted schemas
- No intentional user-facing behavior changes were introduced:
  - same wording
  - same titles
  - same prompts
  - same badge behavior
  - same numeric-solve panel behavior

## Key Files
- `src/types/calculator/display-types.ts`
- `src/lib/kernel/runtime-envelope.ts`
- `src/lib/kernel/runtime-envelope.test.ts`
- `src/lib/modes/calculate.ts`
- `src/lib/modes/equation.ts`
- `src/lib/modes/equation.test.ts`
- `src/app/logic/runtimeControllers.ts`
- `src/app/logic/runtimeControllers.test.ts`
