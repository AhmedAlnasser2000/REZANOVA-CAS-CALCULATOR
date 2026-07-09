# SYMBOLIC-COEFFICIENT-DOMAIN-AUDIT0

Date: 2026-06-29

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Audit only. This milestone does not change runtime behavior, solver coverage, Display, Equation, History, OOE, Tauri, persistence, public Calculus schemas, or public strategy labels.

The goal is to set the ownership boundary before any Lazard-Rioboo-Trager (LRT) logarithmic-part work, so future infrastructure can be shared at the algebra-primitive level without leaking integration-specific machinery into Equation.

## Ownership Boundary

LRT remains integration/Risch-Norman owned.

That means:

- LRT route selection, Hermite residual interpretation, logarithmic residue construction, trace/log readback, and integration proof narratives belong under Symbolic Engine / Integration.
- Equation must not expose "LRT steps" or RN/LRT method names in Equation step-by-step output.
- Equation may consume future shared algebra primitives only through Equation-owned routes, facts, and readback.
- Complex intermediate roots produced by LRT are proof artifacts unless a consuming domain explicitly chooses to present them.

Future shared code should be primitive-level only:

- coefficient-domain arithmetic over MathJSON nodes
- polynomial squarefree factorization and resultants/subresultants
- algebraic root/number representation
- exact fact and condition objects
- small exact linear-algebra helpers when they are domain-neutral

Do not share high-level integration concepts such as Hermite reduction stages, LRT residues, logarithmic trace terms, or RN fallback orchestration as general Equation services.

## Current RN Pieces

Current internal RN infrastructure:

- `integration/risch-norman/coefficient-field.ts` represents exact-rational plus target-free symbolic coefficients as MathJSON nodes with scoped arithmetic and denominator facts.
- `integration/risch-norman/linear-solver.ts` solves bounded symbolic linear systems over that coefficient substrate and records pivot facts.
- RN exp, sin/cos, exp-sincos, affine-log, affine-log-rational, symbolic log-derivative, and Hermite-correction routes use proof-based adoption with visible facts.
- `integration/risch-norman/hermite-reduction.ts` is a bounded rational-correction adopter, not a full symbolic Hermite plus LRT implementation.
- Symbolic quadratic rational routes currently cover casewise power-one denominators and positive-branch repeated powers `2` and `3`; broad symbolic partial fractions remain deferred.

These pieces are useful prerequisites for LRT, but they are still integration-local. They should not be moved wholesale into shared algebra.

## What Full LRT Would Need

To complete the logarithmic part after Hermite-style rational reduction, LRT would need:

- squarefree factorization over a target-free symbolic coefficient domain
- resultants/subresultants for denominator/residue relations
- algebraic-root placeholders for resultant roots
- trace/log construction that can express sums over algebraic roots without expanding into unusable expressions
- fact generation for nonzero pivots, discriminants, squarefree assumptions, and branch/domain constraints
- proof hooks that differentiate the constructed logarithmic part back to the rational residual
- strict caps and stop reasons so high-degree symbolic resultants do not freeze the app

For Calcwiz, this should be introduced as an integration-owned LRT layer that depends on any shared primitives, not as a shared "LRT substrate" consumed directly by Equation.

## Share Later

Safe future shared candidates:

- A domain-neutral coefficient-expression module if it stays MathJSON-based, exact, and independent of RN route names.
- Squarefree/resultant helpers that accept explicit coefficient-domain operations and return algebraic data, not integration narratives.
- Algebraic root descriptors that can be rendered by each consuming domain through its own readback.
- Exact fact helpers for relations such as nonzero pivots, discriminant sign, and denominator exclusions.

Potential shared code must remain below user-facing route ownership. Equation, Calculus, and future workspaces should wrap the primitive result in their own user-facing explanations.

## Keep Integration-Specific

Keep these under Integration/RN/LRT:

- LRT route orchestration and residual classification
- Hermite reduction as an integration method
- logarithmic residue interpretation
- trace-to-log antiderivative readback
- RN fallback ordering
- non-elementary integration messaging
- any proof statement whose meaning is "this is an antiderivative"

## Equation Protection Policy

Equation can use shared algebra primitives later for solving, factoring, candidate validation, or exclusions, but only through Equation-owned APIs and readback. It should continue to explain equation transformations: isolate, factor, substitute carrier, clear denominators with exclusions, validate candidates, and run numeric fallback when appropriate.

Equation should not inherit:

- LRT method labels
- integration-specific case splits
- antiderivative proof artifacts
- logarithmic residue terminology
- implicit complex algebraic roots unless Equation explicitly plans a root-representation milestone

## Recommended Next Infrastructure Slice

Before full LRT, build a small shared-algebra preflight only if a later implementation milestone needs it:

1. Keep the current RN coefficient field integration-local until a second consumer exists.
2. Extract only a domain-neutral coefficient-expression core when Equation or another domain has a concrete primitive need.
3. Add squarefree/resultant helpers behind explicit caps and test them as algebra primitives.
4. Let Integration/RN wrap those primitives in LRT-specific proof and readback.

This keeps the architecture flexible without making Equation carry integration machinery it does not own.
