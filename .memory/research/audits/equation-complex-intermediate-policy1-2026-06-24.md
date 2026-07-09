# EQUATION-COMPLEX-INTERMEDIATE-POLICY1 Audit Note

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verdict

The missing symbolic Complex prerequisite is narrow enough to build for direct carrier powers before Cardano/Ferrari.

Calcwiz now has an internal Equation-owned PrincipalRoot branch object that records a symbolic radicand, degree, branch index, and non-visible principal-argument/branch-cut facts. That representation is sufficient for direct symbolic Complex special-form powers such as `x^5=a` and affine variants through degree 12.

## Included

- Direct symbolic Complex special-form powers with exact-rational selected-target carrier coefficient, degree 5 through 12.
- Pure and affine carriers such as `x^5=a`, `x^5+a=0`, `(x+c)^5=a`, and `(2*x-1)^6=a`.
- Explicit `\operatorname{PrincipalRoot}_{n}` notation for the new high-degree symbolic path.
- `cis` multipliers only when the selected Complex exact form is `cis`; otherwise exact trigonometric multipliers.
- Internal-only branch-cut/principal-argument facts.

## Deferred

- Cardano/Ferrari formulas.
- Symbolic carrier quadratics such as `x^6-a*x^3+b=0`.
- Symbolic target-power coefficients such as `a*x^5=b` when visible nonzero coefficient facts would be required.
- Visible `RootOf`/implicit-root notation.
- Display, History, OOE, app-state, Tauri, or schema changes.

## Compatibility

Existing low-degree symbolic Complex power output such as `u^2=a`, `u^3=a`, and `u^4=a` remains visible in its existing radical form. The PrincipalRoot notation is reserved for the newly unblocked high-degree symbolic Complex special-form route.
