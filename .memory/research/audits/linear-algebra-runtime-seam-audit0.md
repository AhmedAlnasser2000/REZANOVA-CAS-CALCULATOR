# LINEAR-ALGEBRA-RUNTIME-SEAM-AUDIT0

Date: 2026-07-05

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

This is a `0` milestone. It records boundary state only.

No runtime behavior, request shapes, validators, capability ids, worker wiring, OOE routing, parser behavior, or app-visible output changed in this milestone.

## Current Boundary State

- Matrix and Vector remain separate product/runtime identities with OOE facts `linearAlgebra.matrix` and `linearAlgebra.vector`.
- The Linear Algebra compartment owns `src/lib/linear-algebra/`, `src/lib/modes/matrix.ts`, and `src/lib/modes/vector.ts`.
- The current public Linear Algebra seams are `src/lib/modes/matrix.ts` and `src/lib/modes/vector.ts`.
- `src/lib/linear-algebra/` is marked private by the compartment manifest.
- The app runtime still imports private Linear Algebra internals from `src/lib/linear-algebra/editor-dispatch`, `src/lib/linear-algebra/equation-handoff`, and `src/lib/linear-algebra/named-values`.
- Unlike Trigonometry, Statistics, and Geometry, Linear Algebra does not yet expose a dedicated public runtime-request/paste/canonicalization seam for app runtime request building.

## Risk

The present import shape is pragmatic but leaky: app runtime can reach parser and named-value internals that should eventually sit behind a public Linear Algebra seam. That increases future worker-split risk because request construction, paste canonicalization, replay snapshots, and named-value helpers are not yet gathered behind a stable public boundary.

## Future Seam Target

The later implementation milestone should create a public Linear Algebra runtime seam that exposes only workspace-safe helpers, such as:

- Matrix/Vector paste naturalization and editor-expression canonicalization.
- Matrix/Vector request construction from named-value snapshots.
- Matrix/Vector replay/request snapshot helpers.
- Typed Equation handoff shape export without importing Equation internals.

After that seam exists, app runtime should stop importing private `src/lib/linear-algebra/*` internals directly, and the compartment validator can add a Linear Algebra `workspace-runtime-request-boundary` policy.

## Enforcement Deferred

Validator hardening is intentionally deferred because the public seam does not exist yet. Enforcing the private-path rule now would either fail the current runtime or force a rushed seam extraction inside an audit-only milestone.

