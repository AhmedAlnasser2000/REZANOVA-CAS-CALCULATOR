# AREA-SIMPLIFY0 Scope

## Capability Area

Normal-form, readback, equivalence, and simplification policy for Calcwiz-owned symbolic results.

## Goal

Decide whether Calcwiz can proceed directly to `INT-RAT2`, needs only a narrow rational-calculus readback polish, or should first add a shared simplification/readback policy substrate.

## In Scope

- Canonical vs readable expression forms.
- Factored, expanded, canceled, partial-fraction, log, arctan, radical, absolute-value, power-log, and trig identity forms.
- Bounded equivalence checks under explicit assumptions.
- Denominator exclusions and domain constraints surviving simplification and readback.
- Result-surface policy for future `INT-RAT2` repeated-linear and irreducible-quadratic rational outputs.
- Static evidence from Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra.

## Out Of Scope

- Stable simplification behavior changes.
- New calculus, equation, solver, UI, result-origin, or strategy-badge behavior.
- Source mirror execution, dependency installation, submodule recursion, or copied source.
- Broad global simplifier rewrite or parity with any mirror.

## Prerequisite Check

| Prerequisite | Current Calcwiz state | Study implication |
| --- | --- | --- |
| Exact polynomial/rational substrate | `ready-with-adapter` | Strong enough to create test families and normal-form questions. |
| Repeated/quadratic rational readiness | `ready-with-adapter` | `INT-RAT2` can be considered only if readback/equivalence policy is safe. |
| Result envelope/details | `ready` | Can carry method and warning notes, but not a full normal-form policy. |
| Domain/range core | `ready` | Useful for real-domain checks, but not all simplification assumptions. |
| Existing simplify/factor/expand | `ready-with-adapter` | Shipped behavior exists, but ownership is spread across engine, algebra helpers, and CE fallback. |
| Expression equivalence policy | `blocked` | No shared bounded policy for when equivalent forms can replace each other safely. |
| Denominator exclusion preservation | `ready-with-adapter` | Present in rational-function facts, but not yet a general simplification/readback contract. |
