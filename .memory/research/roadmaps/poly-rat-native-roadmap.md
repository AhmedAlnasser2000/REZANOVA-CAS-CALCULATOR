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
- simplification/normal-form policy is cross-cutting and should be handled as a shared policy substrate once repeated/quadratic denominator facts exist

`POLY-RAT-CORE1` closed the immediate repeated/quadratic substrate gap. `AREA-SIMPLIFY0` then found that Calcwiz needed a shared normal-form/readback/equivalence policy before visible rational integration widened again. `SIMPLIFY-CORE0` provided that internal policy layer, `INT-RAT2` consumed both substrates through the existing verified `partial-fractions` strategy, and `CALC-RAT-READBACK0` cleaned the visible rational-integral output without adding another capability family.

The next move is no longer automatic rational-integration widening. `AREA-ASSUMPTIONS0` examined the post-readback gap and selected `ASSUMPTIONS-CORE0`, which now exists as a small typed fact substrate for domain constraints, exclusions, branch/principal-range choices, interval hazards, candidate rejection, and equivalence trust. `ASSUMPTIONS-ADOPT1` wired existing fact-producing modules to that substrate internally, `ASSUMPTIONS-READBACK0` made those facts visible, `ASSUMPTIONS-POLISH1` made that visibility configurable, and `DOMAIN-GRAPH-READY0` created the first shared sampling-readiness helper for tables and future graphing readiness.

`AREA-POLY-ELIM0` then reopened the resultants/Grobner/elimination question as a study-only milestone. Its decision was not to start `POLY-ELIM1` yet: exact coefficient-domain and exact-linear-algebra readiness needed study first. `AREA-EXACT-LINEAR-ALGEBRA0` completed that study and selected `EXACT-LINEAR-ALGEBRA1`, which now provides the first bounded internal exact rational matrix core.

## Current Baseline

Completed substrate and consumer milestones:

- `POLY-CORE-AUDIT1`: bounded one-variable polynomial readiness map
- `POLY-RAT-CORE0`: polynomial division/GCD, primitive/monic normalization, rational-function normalization, and distinct-linear partial-fraction readiness
- `INT-RAT1`: derivative-backed rational integration for one-variable exact rational functions whose proper denominators decompose into distinct rational linear factors
- `AREA-POLY-RAT1`: full-domain atlas across Calcwiz, FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra
- `POLY-RAT-CORE1`: repeated-linear and irreducible-quadratic rational denominator family readiness in the shared algebra substrate
- `AREA-SIMPLIFY0`: full normal-form/readback/equivalence policy study across Calcwiz and all seven static mirrors
- `SIMPLIFY-CORE0`: internal form-intent, equivalence-trust, and preserved-fact policy substrate for future rational readback
- `INT-RAT2`: bounded repeated-linear and irreducible-quadratic rational integration through existing `partial-fractions` strategy and verification policy
- `CALC-RAT-READBACK0`: visible rational-integral readback polish for supported `partial-fractions` results, detail sections, and Guide examples
- `AREA-ASSUMPTIONS0`: full domain/exclusion/branch/trust study that recommends `ASSUMPTIONS-CORE0`
- `ASSUMPTIONS-CORE0`: shared scoped internal fact substrate for domain/exclusion/branch/candidate/trust metadata
- `ASSUMPTIONS-ADOPT1`: internal adapters from existing fact-producing modules into shared assumption facts
- `ASSUMPTIONS-READBACK0`: first visible detail-section readback over existing assumption facts
- `ASSUMPTIONS-POLISH1`: configurable concise-vs-detailed fact readback, defaulting to concise
- `DOMAIN-GRAPH-READY0`: reusable sampled-domain readiness for Table and future graphing surfaces
- `AREA-POLY-ELIM0`: resultants, Grobner, and elimination study that recommends `AREA-EXACT-LINEAR-ALGEBRA0` before `POLY-ELIM1`
- `AREA-EXACT-LINEAR-ALGEBRA0`: exact scalar/matrix/vector readiness study that recommends `EXACT-LINEAR-ALGEBRA1`
- `EXACT-LINEAR-ALGEBRA1`: bounded internal exact rational matrix core for determinant, RREF/rank, square solve, and inverse

Current known limits:

- stable calculus consumes distinct rational linear, repeated rational linear, and irreducible quadratic rational partial-fraction families only under strict caps
- rational readback is cleaner for shipped families, but this is not a broad simplifier or a general normal-form engine
- shared normal-form/readback/equivalence policy exists, but it is internal and does not add rewrite behavior by itself
- full assumption detail is visible only when users opt into `Detailed Facts`; concise readback is the product default
- graphing remains intentionally deferred; `DOMAIN-GRAPH-READY0` is sampling readiness only
- broad square-free factorization beyond supported denominator-family facts is missing
- broader factorization is not a core capability
- resultants and Grobner/elimination are not in scope
- exact linear algebra is present only as an internal capped core; product Matrix exact mode and polynomial elimination have not adopted it yet

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

### 2. `AREA-SIMPLIFY0` - Normal-Form And Readback Study

Status: complete.

Goal:

- decide whether rational-calculus widening is blocked by display wording, shared simplification policy, assumptions/domain handling, or current readiness

What it achieved:

- compared Calcwiz simplification/readback behavior against FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static evidence only
- separated canonical internal forms from readable result surfaces
- identified denominator/domain preservation as a first-class policy need
- selected `SIMPLIFY-CORE0` as the exact next move before `INT-RAT2`

Non-goals:

- no broad simplifier implementation
- no new simplification rules
- no calculus widening
- no source-mirror execution or copied source

### 3. `SIMPLIFY-CORE0` - Shared Normal-Form, Equivalence, And Readback Policy

Status: complete.

Goal:

- add a bounded Calcwiz-native policy layer for form intent, equivalent-form trust, preserved constraints, and readable output preference

What it achieved:

- a typed form-intent vocabulary such as `preserve`, `factor`, `expand`, `cancel`, `partial-fraction`, and `readable`
- a small equivalence envelope that records whether two forms are trusted by exact normalization, derivative backcheck, numeric spot-check, or not trusted
- preserved domain facts for denominator exclusions and real-domain restrictions
- adoption gating that lets `INT-RAT2` accept derivative-verified and numeric-confidence forms while rejecting display-only or blocked forms

Non-goals:

- no full canonical simplifier
- no broad trig/radical/power-log rewrite expansion
- no new visible calculator capability by itself
- no source-mirror runtime or parity target

### 4. `INT-RAT2` - Consume `POLY-RAT-CORE1` And `SIMPLIFY-CORE0`

Status: complete.

Goal:

- widen rational integration only after `POLY-RAT-CORE1` gives calculus reusable substrate facts and `SIMPLIFY-CORE0` gives result/readback/equivalence policy

What it achieved:

- repeated rational linear factors when derivative verification succeeds
- irreducible quadratic denominator cases whose log/arctan forms pass exact verification or accepted numeric confidence
- mixed linear/quadratic and mixed repeated/distinct linear denominator families under strict caps
- improper rational functions through existing polynomial division
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

### 5. `AREA-POLY-ELIM0` - Resultants, Grobner, And Elimination Study

Status: complete.

Goal:

- determine whether Calcwiz can safely start resultants/Grobner/elimination implementation, or whether exact linear algebra must be studied first

What it achieved:

- compared Calcwiz with FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static sources only
- confirmed that elimination needs multivariate polynomial representation, monomial ordering, exact coefficient-domain gates, and exact linear-algebra readiness
- selected `AREA-EXACT-LINEAR-ALGEBRA0` as the exact next move before `POLY-ELIM1`
- locked milestone naming discipline: `0` for audit/study/surveillance/readiness, implementation starts at `1`
- reinforced graphing deferral until the calculator is broadly stabilized

Historical trigger:

- open only when solving or algebra work has a named blocker involving elimination or multivariate polynomial systems

Answered questions:

- what is the smallest Calcwiz-native multivariate polynomial model?
- what coefficient domain is allowed?
- what term orders are supported?
- what caps prevent black-box CAS behavior?
- what result envelope and stop reasons are needed?

Boundary:

- study first, likely Playground before stable adoption
- no direct jump from rational integration to Grobner
- no source execution or copied source
- no graphing

### 5B. `AREA-EXACT-LINEAR-ALGEBRA0` - Exact Linear Algebra Readiness Study

Status: complete.

Goal:

- decide whether exact linear algebra should start with scalar strengthening, internal exact matrix core work, product Matrix adoption, polynomial elimination, or deferral

What it achieved:

- compared Calcwiz with FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static sources only
- confirmed numeric Matrix/Vector cores must stay separate from exact linear algebra
- found current number-backed `ExactScalar` sufficient for a first tiny exact matrix core under strict caps
- selected `EXACT-LINEAR-ALGEBRA1` as the exact next move

Boundary:

- no product Matrix exact mode
- no polynomial elimination
- no graphing
- no source execution or copied source

### 5C. `EXACT-LINEAR-ALGEBRA1` - Bounded Internal Exact Rational Matrix Core

Status: complete.

Goal:

- add the first reusable exact linear algebra substrate before any product Matrix exact mode or polynomial elimination work

What it achieved:

- added an internal exact rational matrix core under `src/lib/linear-algebra/`
- implemented capped exact determinant, RREF/rank, square solve, and inverse
- reused the current number-backed `ExactScalar` shape with strict size and scalar-growth stops
- migrated rational-function partial-fraction coefficient solving to the shared exact core
- updated capability readiness to `ready-with-adapter`

Boundary:

- no Matrix UI exact mode
- no Equation symbolic linear-system widening
- no resultants, Grobner, or elimination
- no bigint scalar overhaul
- no graphing, Labs runner work, source execution, or copied source

### 6. `ASSUMPTIONS-CORE0` - Scoped Domain, Exclusion, Branch, And Trust Facts

Status: complete.

Goal:

- unify local domain/exclusion/branch/trust facts into a small typed internal substrate before more visible algebra/calculus/table/graphing-readiness widening

What it should achieve:

- represent denominator exclusions
- represent real-domain constraints
- represent branch/principal-range facts
- represent interval hazards and proof/sampling trust
- represent candidate rejection facts
- connect readable/equivalent forms to trust levels from `SIMPLIFY-CORE0`
- keep facts request-scoped and result-attached rather than global

Non-goals:

- no public `assume(...)` feature
- no broad inequality solver
- no graphing behavior changes
- no general piecewise engine
- no source-mirror execution

### 7. `ASSUMPTIONS-ADOPT1` - Internal Fact Adoption Adapters

Status: complete.

Goal:

- connect existing fact-producing modules to `assumptions-core` without changing visible app behavior

What it should achieve:

- map rational-function denominator exclusions into assumption facts
- map domain/range checks and interval hazards into assumption facts
- map branch/principal-range metadata into assumption facts
- map candidate rejection and simplify/readback trust metadata into assumption facts
- keep adoption internal and testable

Non-goals:

- no new visible detail sections
- no changed result wording
- no new badges, result origins, or history schema
- no global assumptions context

Posture after completion:

- future visible assumption/readback work should be a separate product/readback milestone
- future algebra/calculus/table/graphing-readiness work should reuse `AssumptionFact[]` rather than adding local domain/trust metadata

### 8. `ASSUMPTIONS-READBACK0` - Visible Fact Readback

Status: complete.

Goal:

- make existing scoped assumption facts visible through current result detail surfaces without changing primary math behavior

What it achieved:

- grouped assumption facts into stable detail-section titles
- surfaced rational denominator exclusions as domain facts
- surfaced calculus and Advanced Calc interval hazards and verification trust
- surfaced equation candidate checking and preserved domain facts
- surfaced table undefined-row real-domain hazards

Non-goals:

- no public `assume(...)` feature
- no new math, solver, calculus, table, or simplification behavior
- no new result origins, strategy labels, badges, history schema, source-mirror execution, or Labs runner behavior

Posture after completion:

- future assumption work can choose a narrower polish/adoption slice for graphing-readiness, branch-policy readback, or richer exact-supplement formatting
- implementation milestones should continue using scoped facts rather than ad hoc local domain/trust metadata

### 9. `ASSUMPTIONS-POLISH1` - Configurable Fact Detail

Status: implemented locally.

Goal:

- keep visible assumption facts useful without overwhelming default result readback

What it achieved:

- added a global default-off `Detailed Facts` setting
- kept backend assumption facts and result metadata intact
- made concise detail sections the default display policy
- preserved full checked-source/trust wording for opt-in auditing

Non-goals:

- no math behavior changes
- no new assumption facts
- no result-origin, strategy, history, or schema widening beyond the settings default

### 10. `DOMAIN-GRAPH-READY0` - Domain Sampling Readiness

Status: implemented locally.

Goal:

- move sampled real-domain hazard detection toward a shared helper that Table and future graphing can consume

What it achieved:

- added a reusable domain sampling readiness helper over `domain-range-core` and `AssumptionFact[]`
- updated Table mode to use the helper without changing table rows or warnings
- recorded readiness in the internal capability registry

Non-goals:

- no graph UI or plotting behavior
- no interval arithmetic proof engine
- no new table behavior or public result contract

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

After `POLY-RAT-CORE1`, `SIMPLIFY-CORE0`, and `INT-RAT2`, Calcwiz should feel meaningfully more serious in rational-function work:

- repeated and quadratic rational families are no longer opaque blobs
- integration can widen from real algebra facts, not ad hoc rules
- denominator/domain honesty improves
- equivalent-form and readable-form choices become explicit rather than accidental
- future simplification, solving, and exact-linear-algebra planning have better substrate evidence

That is the leap: not full CAS breadth, but a stronger reusable polynomial/rational core that future features can stand on.
