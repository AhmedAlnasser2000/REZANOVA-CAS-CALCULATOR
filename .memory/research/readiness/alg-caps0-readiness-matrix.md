# ALG-CAPS0 Readiness Matrix

milestone: `ALG-CAPS0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Summary

`ALG-CAPS0` adds a small code-backed readiness vocabulary for Calcwiz-owned math substrates. It is not a runtime capability router and does not add math behavior.

The runtime execution capability registry remains `src/lib/kernel/capabilities.ts`. The new readiness source of truth is `src/lib/algebra/capability-readiness.ts`.

Approved readiness statuses:

- `ready`
- `ready-with-adapter`
- `blocked`
- `defer`

## Readiness Matrix

| Substrate | Status | Decision |
| --- | --- | --- |
| Polynomial core | `ready-with-adapter` | `POLY-RAT-CORE0` adds shared division/GCD and primitive normalization; `POLY-RAT-CORE1` adds supported denominator family facts while broader square-free/resultant/Grobner work remains unavailable. |
| Rational-function core | `ready-with-adapter` | One-variable exact rational-function normalization and distinct-linear partial fractions support `INT-RAT1`; repeated-linear and irreducible-quadratic readiness envelopes now exist for later `INT-RAT2` adoption. |
| Domain/range core | `ready` | Shared bounded real-domain/range checks are available for equation and calculus consumers. |
| Calculus core | `ready` | Basic Calculus and Advanced Calc share shipped calculus evaluation boundaries. |
| Calculus verification | `ready-with-adapter` | Derivative-backed antiderivative verification exists, but numeric confidence is not proof. |
| Symbolic integration | `ready-with-adapter` | Bounded symbolic families now include derivative-backed distinct-linear partial fractions; repeated/quadratic envelopes are not adopted until a later calculus milestone and broad rational/Risch-style integration remains deferred. |
| Limit core | `ready-with-adapter` | Bounded known-form/local-limit behavior exists; general series/MRV remains deferred. |
| Result envelope | `ready` | `DisplayOutcome` and runtime envelope helpers support shared result metadata and detail notes. |
| Numeric fallback policy | `ready-with-adapter` | Runtime budgets and visible origins distinguish approximate fallback, but future hosts need explicit permissions. |
| Vector/matrix core | `ready-with-adapter` | `VEC-MAT-CORE0` added separate reusable numeric Matrix and Vector cores behind existing product adapters. |
| Exact linear algebra | `defer` | Wait for exact scalar readiness and coefficient-domain gates before reopening `MATRIX-EXACT0`. |

## Sequencing Decision

Post-FriCAS core-first sequence is now:

1. `ALG-CAPS0` - complete.
2. `VEC-MAT-CORE0` - complete.
3. `POLY-CORE-AUDIT1` - complete.
4. `INT-CANDIDATE2` - complete.
5. `POLY-RAT-CORE0` - complete.
6. `INT-RAT1` - complete.
7. `AREA-POLY-RAT1` - complete as the full-domain atlas.
8. `POLY-RAT-CORE1` - complete as the repeated/quadratic rational substrate leap; next potential consumer is `INT-RAT2`.

`MATRIX-EXACT0` remains deferred until exact scalar readiness and coefficient-domain gates exist.
