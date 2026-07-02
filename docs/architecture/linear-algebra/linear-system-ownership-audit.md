# Linear System Ownership Audit

Status: docs-only boundary lock

Milestone: `LINEAR-SYSTEM-OWNERSHIP-AUDIT0`

Purpose: lock the product and engineering boundary before Matrix adds structured `Ax=b` and `Ax+b=0` support. This audit does not change runtime behavior, schemas, parser behavior, OOE routing, history replay, or Equation solving.

## Summary

Matrix and Vector are editor-primary linear-algebra workspaces. Matrix may execute structured linear-algebra expressions and classify finite-dimensional linear systems when the input shape is explicitly a Matrix-owned system form. Equation remains the owner for free-form equation solving, selected targets, nonlinear symbolic solving, branches, assumptions, domain facts, and Equation route selection.

The safe Matrix path for the next implementation move is:

- Accept only structured Matrix system forms such as `Ax=b` and `Ax+b=0`.
- Treat `x` as a local unknown vector placeholder, not an Equation selected target.
- Accept right-hand-side vectors only when they are inline editor vectors in this sequence.
- Use Matrix-owned rank/RREF facts over the coefficient and augmented matrices to classify solution count.
- Return controlled Matrix errors for unsupported equation-shaped input.
- Offer an explicit `Open in Equation` action for free-form equations instead of automatic routing.

## Matrix Ownership

Matrix owns structured linear systems when all of these are true:

- The surface is Matrix, not Equation, Calculate, Vector, or Guide.
- The coefficient source is a Matrix value or inline matrix literal accepted by the Matrix editor parser.
- The unknown is the local vector placeholder `x`.
- The right-hand side is an inline vector literal for this sequence.
- The operation is finite-dimensional rank/RREF classification, solution-count classification, or a Matrix-local solution vector when the system is unique.

Matrix may use:

- coefficient matrix rank,
- augmented matrix rank,
- RREF pivots,
- shape checks,
- exact Matrix arithmetic and readback helpers,
- Matrix-owned detail wording about unique, inconsistent, or underdetermined systems.

Matrix must not use this milestone as permission to add:

- broad symbolic equation solving,
- nonlinear solving,
- selected-target routing,
- Equation branch facts,
- Equation domain assumptions,
- Equation generated-handoff routes,
- automatic routing into Equation,
- hidden cross-mode RHS state.

## Equation Ownership

Equation owns relation solving once the input stops being a structured Matrix system. This includes:

- free-form equations,
- equations with arbitrary selected targets,
- nonlinear or mixed symbolic equations,
- domain-restricted solving,
- branch families,
- assumptions and validity facts,
- generated equations from other Equation routes,
- numeric interval solving,
- stored-value substitution consent,
- solution readback that depends on Equation route evidence.

If Matrix sees an equation-shaped expression outside its structured system subset, Matrix should stop locally and expose an explicit handoff affordance. The handoff is user-controlled; Matrix should not silently launch Equation.

## Explicit Handoff Contract

The implementation contract is a typed payload owned at an app or shared-boundary layer, not an import of Equation internals into Matrix:

```ts
type LinearAlgebraEquationHandoff = {
  source: 'linear-algebra';
  sourceMode: 'matrix' | 'vector';
  latex: string;
  reason: 'unsupported-equation-shape' | 'free-form-equation';
  suggestedTarget?: string;
};
```

This shape is a contract sketch for the following implementation move. It may be refined when the actual app-shell action is wired, but the boundary is locked:

- Matrix/Vector may construct a handoff payload.
- App-shell routing may offer `Open in Equation`.
- Equation decides how to interpret the payload after the user explicitly opens it.
- Matrix/Vector must not import Equation solver modules, selected-target helpers, route internals, branch facts, or guarded/numeric stages.

## Structured System Classification

For Matrix-owned systems, the intended classification is standard rank/RREF classification:

- Unique solution: coefficient rank equals augmented rank and equals the number of unknowns.
- No solution: coefficient rank is less than augmented rank.
- Infinite solutions: coefficient rank equals augmented rank and is less than the number of unknowns.

These are Matrix facts about one finite linear system. They are not global Equation domain facts and should not be stored as Equation supplements or assumptions.

## Next Implementation Guardrails

`MATRIX-AX-B-SYSTEM1` may implement only the structured subset described here:

- `Ax=b` with inline RHS vector.
- `Ax+b=0` with inline vector offset.
- local `x` placeholder only.
- explicit `Open in Equation` for unsupported equation-shaped input.

Deferred:

- symbolic Matrix CAS,
- hidden named RHS vectors,
- automatic Equation routing,
- general `A*x+c=d` simplification,
- nonlinear equations,
- eigenvalues/eigenvectors,
- diagonalization,
- matrix exponential,
- Equation-owned branch/domain facts.
