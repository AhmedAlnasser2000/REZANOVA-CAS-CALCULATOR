## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## LINEAR-ALGEBRA-RUNTIME-PUBLIC-SEAM1

Completed the public Linear Algebra runtime seam for Matrix/Vector app-facing request work.

- Added `src/lib/linear-algebra/runtime-request.ts` as the public facade for editor dispatch, active named-operand request building, named-value snapshot helpers/types, and the typed Equation handoff shape.
- Moved app runtime and Matrix/Vector workspace imports off private `src/lib/linear-algebra/named-values`, `editor-dispatch`, and `equation-handoff` paths.
- Registered the Linear Algebra runtime facade in the compartment manifest.
- Enabled app-runtime boundary enforcement so future app runtime imports must use the facade instead of Linear Algebra internals.
- Preserved Matrix and Vector as separate OOE capabilities: `linearAlgebra.matrix` and `linearAlgebra.vector` still share `linear-algebra-worker-runtime`.

## Memory Scope Note

Shared `.memory/current-state.md`, `.memory/decisions.md`, and the July 5 journal already contained unrelated unstaged Calculus edits from another lane. This session dossier is the staged durable memory for this milestone so the commit does not absorb unrelated work.
