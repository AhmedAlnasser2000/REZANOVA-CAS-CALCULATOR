# AREA-POLY-RAT1 Scope

## Capability Area

Full polynomial and rational-function substrate architecture for Calcwiz-owned exact symbolic work.

## Goal

Map the whole POLY/RAT domain across Calcwiz and the seven static source mirrors, then decide the next Calcwiz-native implementation slice after `INT-RAT1`.

The study must answer the strategic question: why study tiny pieces when the mirrors can teach the whole domain? The answer is: research broadly, implement in bounded slices.

## In Scope

- Polynomial representation and expression-to-polynomial extraction.
- Coefficient domains: integers, rationals, decimals, algebraic/complex/modular boundaries.
- Univariate and multivariate policy, variable ordering, monomial ordering, and degree/cap policy.
- Content, primitive, monic normalization, division, GCD, and square-free readiness.
- Factorization tiers, resultants, elimination, and Grobner boundaries.
- Rational-function normalization, denominator constraints, cancellation, and partial fractions.
- Simplification/normal-form interaction with rational functions and integration.
- Native Calcwiz roadmap output for implementation slices, Playground-first candidates, and deferred areas.

## Out Of Scope

- Stable product math behavior changes.
- Source mirror execution, builds, dependency installation, or submodule recursion.
- Direct source copying, line-by-line ports, or license reuse decisions.
- Labs runner changes or visual experiment execution.
- Full-CAS parity with any mirror.

## Prerequisite Check

| Prerequisite | Current Calcwiz state | Atlas implication |
| --- | --- | --- |
| One-variable exact polynomial core | `ready-with-adapter` | Good base for rational substrates, but not broad polynomial algebra. |
| Exact rational scalar arithmetic | `ready-with-adapter` | Enough for bounded POLY/RAT; needs overflow/bigint/coefficient-domain policy later. |
| Polynomial division and GCD | `ready` | Supports current rational normalization and `INT-RAT1`. |
| Rational-function normalization | `ready-with-adapter` | Correct owner for quotient cancellation and future rational integration gates. |
| Distinct-linear partial fractions | `ready-with-adapter` | Adopted by `INT-RAT1`. |
| Repeated-linear partial fractions | `blocked` | Immediate `POLY-RAT-CORE1` target. |
| Irreducible-quadratic partial fractions | `blocked` | Immediate `POLY-RAT-CORE1` target, with real/complex policy. |
| Square-free/factor readiness | `blocked` | Immediate prerequisite before broader partial fractions. |
| Resultants and Grobner/elimination | `defer` | Needs future `AREA-POLY-ELIM0`; not next implementation. |
| Simplification/normal forms | `ready-with-adapter` | Important cross-cutting risk; not the immediate rational-integration blocker. |
