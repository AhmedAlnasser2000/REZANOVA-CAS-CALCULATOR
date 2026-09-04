# EQUATION-FINITE-BRANCH-V2-AUTHORITY1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- gate_type: backend
- status: focused-green; selective commit pending

## Completed

- Added a non-frozen exact finite-branch authority resolver for one-target `Equal` and `Element(..., Set(...))` results.
- Required a unique semantic bijection between final branches and producer-owned native roots; missing, extra, duplicate, ambiguous, conflicting, or unrelated evidence fails closed.
- Routed composition, substitution, and owned-readback enrichment through the same root-level authority while preserving frozen Equation files and public schemas.
- Normalized equivalent real numeric half-powers through the existing finite-root renderer and retained approved single-root and Complex presentation.
- Repaired production finalization of `\ln(\sqrt{x^4-5x^2+4})=0` with four proven answer rows.

## Manual App Check

1. Open Equation Symbolic and solve `ln(sqrt(x^4-5x^2+4))=0` for `x`.
2. Expect four exact rows in producer order: `x=-\sqrt{\frac{5}{2}+\frac{\sqrt{13}}{2}}`, `x=-\sqrt{\frac{5}{2}-\frac{\sqrt{13}}{2}}`, `x=\sqrt{\frac{5}{2}-\frac{\sqrt{13}}{2}}`, and `x=\sqrt{\frac{5}{2}+\frac{\sqrt{13}}{2}}`.
3. Confirm Domain Facts and Outer Inversion / Power Lift details are present.
4. Copy Result, reopen the result from History, and confirm the same four rows with no horizontal overflow.

## Boundary

- No public Canonical Result schema, V1 inventory, proof baseline, worker topology, solver capability, or frozen Equation file changed.
- A pre-existing shared formal-comparison weakness can accept opposite signed-imaginary equality trees. This gate matches native roots before constructing equality proof and remains fail-closed, but the shared comparator needs a separate CRITICAL repair before Gate 2.
- Calculate MathLive textual-root and Node 24/Actions work remain separate and unstaged.
