# Polynomial/Rational Native Roadmap

status: active implementation roadmap
created: 2026-05-22  
source_milestone: `AREA-POLY-RAT1`  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

This roadmap turns the `AREA-POLY-RAT1` full-domain atlas into a Calcwiz-native implementation sequence.

The goal is a real substrate leap, not broad CAS imitation. Calcwiz should become much stronger at polynomial and rational-function reasoning by widening its own bounded cores first, then letting calculus and solving consume those facts later.

## Core Finding

`AREA-POLY-RAT1` found that strong polynomial/rational capability comes from substrate discipline:

- expressions are converted through a domain gate before algorithms run
- coefficient domains are explicit algorithm inputs
- factorization is layered
- rational-function facts preserve denominator constraints
- partial fractions belong in the algebra substrate, not calculus-local helpers
- resultants, Grobner, and elimination are a separate capability tier
- simplification/normal-form policy is cross-cutting, but not the immediate blocker for the next rational leap

The next move is therefore `POLY-RAT-CORE1`, not `INT-RAT2`.

## Current Baseline

Completed substrate and consumer milestones:

- `POLY-CORE-AUDIT1`: bounded one-variable polynomial readiness map
- `POLY-RAT-CORE0`: polynomial division/GCD, primitive/monic normalization, rational-function normalization, and distinct-linear partial-fraction readiness
- `INT-RAT1`: derivative-backed rational integration for one-variable exact rational functions whose proper denominators decompose into distinct rational linear factors
- `AREA-POLY-RAT1`: full-domain atlas across Calcwiz, FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra
- `POLY-RAT-CORE1`: repeated-linear and irreducible-quadratic rational denominator family readiness in the shared algebra substrate

Current known limits:

- stable calculus still consumes only distinct rational linear partial fractions until `INT-RAT2`
- repeated rational linear and irreducible quadratic families are substrate-ready but not integration-ready
- broad square-free factorization beyond supported denominator-family facts is missing
- broader factorization is not a core capability
- resultants and Grobner/elimination are not in scope
- exact linear algebra remains deferred

## Roadmap Sequence

### 1. `POLY-RAT-CORE1` - Repeated/Quadratic Rational Substrate Leap

Status: complete.

Goal:

- strengthen `polynomial-core` and `rational-function-core` so rational facts are richer before calculus widens again

What it should achieve:

- represent rational denominator factor families with multiplicity facts
- classify repeated rational linear factors under strict caps
- classify irreducible quadratic factors over exact rational coefficients
- add square-free or square-free-like readiness sufficient for supported denominator families
- preserve denominator nonzero constraints
- make stop reasons more specific:
  - decimal coefficients
  - multivariable input
  - over-cap degree/term growth
  - unsupported factorization
  - repeated factor unsupported by caller
  - irreducible quadratic unsupported by caller
  - algebraic/complex root policy outside current scope

Acceptance:

- existing `INT-RAT1` distinct-linear wins remain unchanged
- no visible calculus widening is introduced
- new substrate envelopes are typed and tested directly
- rational-function stop metadata is useful to future calculus and solver consumers

Non-goals:

- no broad factorization engine
- no multivariate polynomial algebra
- no resultants or Grobner
- no exact linear algebra
- no external CAS/source-mirror runtime

### 2. `INT-RAT2` - Consume `POLY-RAT-CORE1`

Status: next likely implementation slice if rational integration remains the priority.

Goal:

- widen rational integration only after `POLY-RAT-CORE1` gives calculus reusable substrate facts

Potential scope:

- repeated rational linear factors when derivative verification succeeds
- irreducible quadratic denominator cases where exact real antiderivative forms can be represented honestly
- safer unsupported metadata when a rational family is beyond the adopted slice

Required gates:

- derivative-backed verification remains mandatory
- existing interval/domain safety gates remain in force for definite integrals
- no new `ResultOrigin` values
- no source-mirror execution or copied algorithms

Non-goals:

- no full Hermite/Rothstein-Trager/Risch engine
- no broad algebraic extension fields
- no promise of all rational functions

### 3. `AREA-SIMPLIFY0` - Normal-Form And Readback Study

Trigger:

- open this only if `POLY-RAT-CORE1` or `INT-RAT2` shows that trustworthy output is blocked by equivalence/readback/normal-form policy rather than missing factor facts

Questions:

- when should Calcwiz preserve factored, expanded, canceled, or partial-fraction forms?
- how should denominator exclusions survive readback?
- how should equivalent rational expressions be compared without hiding assumptions?
- when should a readable form win over a more canonical form?

Boundary:

- research first
- no hidden broad simplifier
- no source imitation

### 4. `AREA-POLY-ELIM0` - Resultants, Grobner, And Elimination Study

Trigger:

- open only when solving or algebra work has a named blocker involving elimination or multivariate polynomial systems

Questions:

- what is the smallest Calcwiz-native multivariate polynomial model?
- what coefficient domain is allowed?
- what term orders are supported?
- what caps prevent black-box CAS behavior?
- what result envelope and stop reasons are needed?

Boundary:

- study first, likely Playground before stable adoption
- no direct jump from rational integration to Grobner

## Deferred Domains

These remain out of the near-term POLY/RAT sequence:

- full multivariate polynomial algebra
- modular polynomial algorithms
- algebraic-number coefficient fields
- resultants/Grobner implementation
- exact linear algebra
- Risch/Liouville integration
- external CAS backend dependency
- source-mirror execution
- feature parity with any mirror

## Implementation Discipline

Every milestone in this roadmap should preserve these rules:

- source mirrors are evidence only
- implementation is Calcwiz-native
- visible capability widens only after substrate facts exist
- unsupported cases get specific stop reasons
- calculus should consume algebra, not own hidden algebra
- tests should lock shipped behavior and substrate envelopes separately
- broad capability areas reopen through `AREA-*` studies when cross-engine evidence matters

## Expected End State

After `POLY-RAT-CORE1` and a later `INT-RAT2`, Calcwiz should feel meaningfully more serious in rational-function work:

- repeated and quadratic rational families are no longer opaque blobs
- integration can widen from real algebra facts, not ad hoc rules
- denominator/domain honesty improves
- future simplification, solving, and exact-linear-algebra planning have better substrate evidence

That is the leap: not full CAS breadth, but a stronger reusable polynomial/rational core that future features can stand on.
