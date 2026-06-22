# EQUATION-COMPLEX-SYMBOLIC-SPECIAL-FORM-FRONTIER1 Audit Gate

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

No symbolic Complex special-form subset is enabled in this milestone.

Exact-rational Complex special forms are already safe because every branch has a concrete magnitude and angle. Symbolic cases such as `x^5=a` or `x^6-a*x^3+b=0` require a convention for expressions like `a^(1/n)` over the complex plane. That is a formal principal-branch and branch-cut policy, not a formatting tweak.

## Evidence

- Branch count: symbolic carrier quadratics can produce up to 12 visible branches, but branch count alone is not the blocker.
- Notation: `rectangular`, `polar`, and `cis` can describe exact-rational branches; symbolic roots would need principal-root notation or an equivalent root object.
- Exact-readback meaning: displaying `u^(1/n)` without a principal-root contract would imply a convention Calcwiz has not defined.
- Fact semantics: symbolic Complex branch facts need branch-cut/principal-root metadata, not only real-domain nonnegativity or discriminant facts.
- Root representation: current internal root representation has dormant implicit roots, but no approved visible Complex principal-root readback.

## Decision

- Keep exact-rational Complex direct/pure/affine special forms through the existing route.
- Keep symbolic Complex carrier coefficients/constants as explicit boundaries.
- Clarify the boundary wording to mention the missing principal-branch root policy.
- Add tests preventing visible `RootOf` or informal symbolic branch notation.

## Deferred

- Formal principal-branch Complex symbolic roots.
- Compact symbolic Complex root objects.
- Branch-cut facts and copy/editor semantics for symbolic Complex roots.
- Any visible `RootOf` or implicit-root notation.
