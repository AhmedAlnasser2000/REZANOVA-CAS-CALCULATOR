# AREA-POLY-RAT0 Scope

## Capability Area

Polynomial and rational-function substrates for future exact symbolic work, especially bounded rational integration.

## Goal

Decide whether Calcwiz can proceed to `INT-RAT1` using current `POLY-RAT-CORE0` readiness, or whether it must first add `POLY-RAT-CORE1`, `AREA-SIMPLIFY0`, or defer implementation pressure.

## In Scope

- Expression-to-polynomial extraction.
- Exact rational coefficient and scalar policy.
- Polynomial arithmetic, division, GCD, content, primitive, and monic normalization.
- Rational-function cancellation and denominator constraints.
- Distinct-linear partial-fraction readiness.
- Factorization, square-free, resultant, and Grobner boundaries as research blockers.
- Source-context comparison across Calcwiz, FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra.

## Out Of Scope

- Product behavior changes.
- Source mirror execution or dependency installation.
- Code copying from any external project.
- Broad factorization, resultants, Grobner bases, exact linear algebra, and full rational integration.
- Labs runner work.

## Prerequisite Check

| Prerequisite | Status | AREA-POLY-RAT0 decision |
| --- | --- | --- |
| One-variable exact polynomial substrate | `ready-with-adapter` | Enough for a bounded rational-integration slice. |
| Polynomial division and GCD | `ready` | Available through `POLY-RAT-CORE0`. |
| Rational-function normalization | `ready-with-adapter` | Enough for normalized quotient inputs and cancellation. |
| Distinct rational linear partial fractions | `ready-with-adapter` | Enough for first `INT-RAT1` slice. |
| Repeated-factor partial fractions | `blocked` | Stop reason, not prerequisite for first slice. |
| Irreducible quadratic partial fractions | `blocked` | Stop reason, not prerequisite for first slice. |
| Square-free factorization | `blocked` | Later `POLY-RAT-CORE1` candidate if needed. |
| Resultants and Grobner/elimination | `defer` | Later area study, not needed for `INT-RAT1`. |
| Simplification/normal-form policy | `ready-with-adapter` | Watch closely, but not the main blocker for distinct-linear rational integration. |
