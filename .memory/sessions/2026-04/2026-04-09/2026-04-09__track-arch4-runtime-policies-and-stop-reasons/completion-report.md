# ARCH4 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Milestone: `ARCH4 — Shared Runtime Policies and Structured Stop Reasons`
- Date: `2026-04-09`
- Status: verified, not yet committed

## Scope Delivered
- Added `src/types/calculator/runtime-policy-types.ts` as the focused internal contract layer for:
  - `RuntimeStopReason`
  - `RuntimeStopReasonKind`
  - `RuntimeAdvisories`
  - the existing tiny `EquationNumericSolveAdvisory`
- Added `src/lib/kernel/runtime-policy.ts` so runtime/planner outcomes now classify through one shared helper for:
  - planner hard stops
  - Calculate invalid/unsupported requests
  - Equation invalid requests
  - Equation `Range Guard` stops
  - bounded unsupported symbolic families
- Rewired `src/lib/modes/calculate.ts` so planner stops, invalid-request paths, and bounded unsupported-family errors attach shared runtime advisories through the existing `ARCH3` envelope.
- Rewired `src/lib/modes/equation.ts` so symbolic invalid requests, planner hard stops, guarded range impossibility, and bounded unsupported symbolic-family stops derive both `stopReason` and Equation numeric-solve advisories through shared runtime-policy classification.
- Kept host/runtime behavior unchanged:
  - same wording
  - same badges
  - same prompts
  - same panel behavior
  - same persistence/history behavior

## Behavior Notes
- Scope stayed limited to `Calculate`, `Equation`, and planner boundaries.
- `Table` and other mode runtimes remained out of scope.
- `PeriodicFamilyInfo.structuredStopReason` was left unchanged as the math-specific stop channel.
- The new runtime stop metadata remains internal-only:
  - not rendered
  - not persisted into history
  - not added to persisted schemas
  - not widened into a job/profile/runtime state system

## Key Files
- `src/types/calculator/runtime-policy-types.ts`
- `src/types/calculator/display-types.ts`
- `src/types/calculator/runtime-types.ts`
- `src/lib/kernel/runtime-policy.ts`
- `src/lib/kernel/runtime-policy.test.ts`
- `src/lib/modes/calculate.ts`
- `src/lib/modes/calculate.test.ts`
- `src/lib/modes/equation.ts`
- `src/lib/modes/equation.test.ts`
