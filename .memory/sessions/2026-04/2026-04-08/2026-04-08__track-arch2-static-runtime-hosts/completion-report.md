# ARCH2 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Milestone: `ARCH2 — Promote ARCH1 Seams into Static Runtime Hosts`
- Date: `2026-04-08`
- Status: verified, not yet committed

## Scope Delivered
- Added `src/lib/kernel/runtime-hosts.ts` with internal runtime-host descriptors for:
  - `expression-runtime`
  - `equation-runtime`
  - `table-runtime` (metadata only)
- Extended `src/lib/kernel/capabilities.ts` so every public capability now includes an owning `hostId` while preserving the public capability list from `ARCH1`.
- Promoted the guarded Equation runtime in `src/lib/equation/guarded/run.ts` into a static descriptor-backed stage host with stable ids:
  - `numeric-interval`
  - `bounded-polynomial`
  - `algebra-transform`
  - `composition`
  - `direct-trig`
  - `rewrite-trig`
  - `substitution`
  - `direct-symbolic`
- Kept guarded Equation preflight outside the stage host:
  - request preparation
  - loop-state detection
  - range-impossibility guard
  - symbolic cache setup
- Promoted `runExpressionAction()` in `src/lib/math-engine.ts` into a static internal action host for:
  - `evaluate`
  - `simplify`
  - `factor`
  - `expand`
  - internal shared `solve`
- Kept Calculate preparation and result shaping outside the action host:
  - request canonicalization and short-circuits
  - parse / rewrite preparation
  - shared post-process and response shaping

## Behavior Notes
- Public repo-facing entrypoints remain stable:
  - `runExpressionAction()`
  - `buildTable()`
  - `runCalculateMode()`
  - `runEquationMode()`
- Public kernel capability surface remains unchanged:
  - `expression.evaluate`
  - `expression.simplify`
  - `expression.factor`
  - `expression.expand`
  - `equation.solve`
  - `table.build`
- Internal expression `solve` remains non-public in capability metadata.
- `Table` remains capability-linked metadata only and was not promoted into a new host runtime flow in this milestone.
- No intentional user-facing behavior changes were introduced.

## Key Files
- `src/lib/kernel/runtime-hosts.ts`
- `src/lib/kernel/capabilities.ts`
- `src/lib/equation/guarded/run.ts`
- `src/lib/equation/guarded-solve.ts`
- `src/lib/math-engine.ts`
- `src/lib/kernel/capabilities.test.ts`
- `src/lib/equation/guarded-solve.test.ts`
- `src/lib/math-engine.test.ts`
