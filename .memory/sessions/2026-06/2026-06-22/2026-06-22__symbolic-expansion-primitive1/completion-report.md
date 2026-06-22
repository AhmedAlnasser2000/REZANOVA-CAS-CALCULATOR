# SYMBOLIC-EXPANSION-PRIMITIVE1 Completion Report

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

Created the first private Symbolic Primitive: bounded MathJSON expansion.

The primitive lives under `src/lib/symbolic-engine/primitives/expansion/` and exposes:

- `expandMathJsonNode(...)`
- `expandMathJsonNodeOrOriginal(...)`

It supports safe expansion for `Add`, `Subtract`, `Negate`, `Multiply` / `InvisibleOperator`, and positive integer powers. Expansion is bounded by default caps of `maxPower: 12`, `maxExpandedTerms: 256`, and `maxNodeCount: 2000`.

## Code Changes

- Added `src/lib/symbolic-engine/primitives/expansion/expansion.ts`.
- Added focused primitive tests at `src/lib/symbolic-engine/primitives/expansion/expansion.test.ts`.
- Registered `src/lib/symbolic-engine/primitives/` as a private Symbolic Engine path in the compartment manifest.
- Replaced the local ComputeEngine `expand` loop in Equation polynomial carrier follow-on with `expandMathJsonNodeOrOriginal`.
- Repaired the real Exact top-level route so direct quadratic-carrier equations can reach the existing carrier-follow-on bridge.
- Added a narrow Complex Exact quadratic-carrier follow-on so the same expanded quadratic-carrier family returns the full complex branch set instead of a generic unsupported stop.
- Fixed the local Complex follow-on readback leak where a simplified imaginary magnitude could already contain `i` and then receive another appended `i`.

## Preserved Boundaries

- No public primitive facade yet.
- No broad solver migration.
- No broad Equation capability expansion beyond the intended real Exact quadratic-carrier handoff.
- No broad Complex carrier closure; Complex support in this milestone is limited to quadratic selected-target carriers with real carrier roots.
- No substitution, factorization, simplification, or elimination primitive work.
- No OOE, Display, History, app-state, Tauri, UI, graphing, or step-by-step changes.
- No broad final-answer readback polishing or normalization; awkward but valid fragments such as reducible arithmetic, equivalent radical spellings, and sign/fraction cleanup are deferred to a dedicated future readback milestone.

## Manual QA Notes

- `Complex Off`, `(x^2+x)^2-(x^2+x)-1=0`: solves through the bounded polynomial-carrier bridge.
- `Complex On`, `(x^2+x)^2-(x^2+x)-1=0`: solves through the narrow quadratic-carrier Complex follow-on and returns real plus non-real branches.
- The same Complex QA case no longer emits double-imaginary-unit fragments such as `ii`.
- `sqrt((2x+1)^4-5(2x+1)^2+4)=1`: existing radical/carrier follow-on path remains green.
- `(x^3+x)^2-5(x^3+x)+4=1`: remains unsupported, as planned.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-22.md`
- `.memory/research/roadmaps/symbolic-primitives-compartment-roadmap.md`
- `.memory/sessions/2026-06/2026-06-22/2026-06-22__symbolic-expansion-primitive1/`
