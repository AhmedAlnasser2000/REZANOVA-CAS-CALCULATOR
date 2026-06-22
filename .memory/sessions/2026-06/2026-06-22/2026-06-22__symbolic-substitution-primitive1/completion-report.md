# SYMBOLIC-SUBSTITUTION-PRIMITIVE1 Completion Report

Date: 2026-06-22

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live repo implementation

## Summary

Created the second private Symbolic Primitive: bounded structural substitution.

The primitive lives under `src/lib/symbolic-engine/primitives/substitution/` and exposes:

- `substituteMathJsonSymbols(...)`
- `substituteMathJsonSubtree(...)`
- `substituteCarrierPowerBasis(...)`

V1 is deliberately structural and carrier-focused. It supports protected symbol substitution, exact subtree replacement, and carrier power-basis substitution with metadata for changes, used substitutions, protected hits, and node counts.

## Code Changes

- Added `src/lib/symbolic-engine/primitives/substitution/substitution.ts`.
- Added focused primitive tests at `src/lib/symbolic-engine/primitives/substitution/substitution.test.ts`.
- Refactored `src/lib/equation/parameterized/carrier-elimination.ts` so reduced `u` equations are built through `substituteCarrierPowerBasis(...)`.

## Preserved Boundaries

- Equation still owns carrier detection, supported carrier policy, route order, branch families, facts, stop wording, detail sections, and readback.
- Stored-variable substitution remains in `src/lib/algebra/variable-memory/`.
- No broad substitution engine, arbitrary auxiliary-variable inference, periodic/transcendental closure, solver capability expansion, public primitive facade, OOE, Display, History, app-state, Tauri, UI, graphing, or step-by-step changes.
- Final-answer readback polishing and normalization remains deferred until after all five Symbolic Primitives are established.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-22.md`
- `.memory/research/roadmaps/symbolic-primitives-compartment-roadmap.md`
- `.memory/sessions/2026-06/2026-06-22/2026-06-22__symbolic-substitution-primitive1/`
