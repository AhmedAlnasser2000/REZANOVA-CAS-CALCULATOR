# Incubation Infrastructure Roadmap

status: implemented through INCUBATION-INFRA1  
created: 2026-05-21  
source_snapshot: `.memory/sources/2026-05-21__incubation-infrastructure-upgrade-redefined-codex-prompt.md`  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

This roadmap upgrades Calcwiz incubation from a loose Playground lane into durable project infrastructure.

Memory infrastructure preserves what Calcwiz knows. Incubation infrastructure governs how Calcwiz safely learns, compares, synthesizes, prototypes, visually inspects, and graduates ideas.

The main shift is:

- old unit of research: one external system such as FriCAS
- new unit of research: one Calcwiz capability area studied across relevant sources

External systems remain evidence and inspiration. They do not become product dependencies, runtime authorities, identity templates, or direct code sources.

## Current Starting Point

The repository already has important foundations:

- `playground/` as a level-based incubation tree
- `playground/records/` and `playground/manifests/`
- `npm run test:playground`
- `playground/sources/` as the controlled source-mirror registry
- registered source mirrors for FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, and SymEngine
- `INCUBATION-LABS0` one-way generated Labs catalog
- `PGL-VIS1` developer-only interactive Labs runners
- `PGL-VIS1-POLISH` live Labs preview and rendered comparison surface
- `INCUBATION-INFRA1` source security, runner policy, and area-study templates
- `SOURCE-CAPTURE1` static local source captures for FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra
- `AREA-POLY-RAT0` as the first full multi-source capability-area synthesis
- `AREA-POLY-RAT1` as the full-domain polynomial/rational atlas and Calcwiz-native substrate roadmap
- `AREA-SIMPLIFY0` and `AREA-ASSUMPTIONS0` as follow-up policy studies that convert mirror evidence into Calcwiz-native next steps
- `AREA-POLY-ELIM0`, `AREA-EXACT-LINEAR-ALGEBRA0`, `EXACT-LINEAR-ALGEBRA1`, and `POLY-ELIM1` as the guarded path from elimination study to a bounded internal resultant substrate
- `AREA-MULTIVAR0` as the follow-up study that blocks bivariate elimination until variable semantics are explicit

This roadmap should strengthen and formalize those pieces. It should not duplicate them.

## Philosophy

Calcwiz should be described as:

> truth-first and exact-when-appropriate

That means:

- exact finite results when valid
- exact family results for infinite/periodic families
- exact conditional results when assumptions matter
- piecewise/branch results when the math requires branches
- no-solution or domain-invalid results when appropriate
- approximate or verified numeric results when exact symbolic form is unavailable or inappropriate
- guided unresolved or unsupported stops when Calcwiz cannot honestly close the case

Do not let "exact-first" become fake exactness.

## Source Mirror Security

Source mirrors are untrusted by default.

The next infrastructure milestone should add a formal source-mirror security policy, likely under `playground/sources/SECURITY.md`, with at least these tiers:

- Tier 0: registered metadata only, no local clone
- Tier 1: static mirror, local clone may be read but not executed
- Tier 2: sandboxed execution only with explicit isolation rules
- Tier 3: approved executable research, rare and explicitly reviewed

The default for current source mirrors should be Tier 0 or Tier 1. Labs runners must not execute source mirrors.

## Labs Runner Security

`PGL-VIS1` already permits approved local development runners, so runner security must be explicit.

The next infrastructure milestone should add `playground/RUNNERS.md` or an equivalent policy section stating:

- runners are allowlisted, not dynamically discovered from arbitrary files
- every runner maps to a Playground record and manifest
- accepted input kinds are declared
- outputs stay experimental and developer-only
- runners do not use secrets
- runners do not execute source mirrors
- runners do not run remote/SSH/provider jobs by default
- runners do not write stable product files
- runners do not add normal calculator history/provenance
- release builds do not expose the runner bridge

Allowed initial runner categories:

- `local-stable-probe`
- `local-playground-experiment`
- `corpus-comparison`

Forbidden by default:

- `remote-experiment`
- `source-mirror-execution`
- product solver backend behavior

## Area Studies

The durable research unit is a Calcwiz capability area.

Recommended structure:

```text
playground/area-studies/
  README.md
  INDEX.md
  templates/
    lite-synthesis.md
    standard-synthesis.md
    full-synthesis/
      00-scope.md
      01-source-note.md
      02-cross-source-comparison.md
      03-pattern-extraction.md
      04-calcwiz-fit-evaluation.md
      05-synthesis.md
      06-calcwiz-native-proposal.md
      07-benchmark-families.md
      08-risks.md
```

### Lite Synthesis

Use for small wording, diagnostic, readback, or UX refinements.

Deliverable:

- problem
- evidence
- decision
- risk

### Standard Synthesis

Use for one subsystem with moderate architecture risk and two or three relevant sources.

Deliverable:

- scope
- source notes
- short comparison
- Calcwiz-fit evaluation
- proposal
- risks

### Full Synthesis

Use for foundational areas:

- polynomial core
- simplification
- assumptions/domain logic
- complex numbers
- inequalities
- symbolic integration
- exact linear algebra
- graphing
- expression IR
- external compute
- semantic math editing / IntelliSense

Deliverables:

- scope and prerequisite check
- isolated source notes
- source-vs-source comparison
- pattern extraction
- Calcwiz-fit evaluation
- final synthesis
- Calcwiz-native proposal
- benchmark families
- risks
- incubation/adoption decision

## Missing Capability Gate

Area studies must not force adoption through missing substrates.

Classify missing foundations as:

- `blocker`
- `bounded-workaround`
- `playground-only`
- `deferred`

Potential blockers to track:

- complex-number core
- inequality/assumption core
- exact linear algebra
- verified numerics
- graphing core
- branch-cut semantics
- profile/policy routing

## `INCUBATION-INFRA1` Implemented Scope

`INCUBATION-INFRA1: Source Security, Runner Policy, And Area Synthesis Templates`

Implemented:

1. Added `playground/sources/SECURITY.md`.
2. Extended source-mirror metadata with required security fields and validation.
3. Registered GeoGebra as an additional planned context mirror.
4. Added `playground/RUNNERS.md`.
5. Added `playground/area-studies/README.md`.
6. Added `playground/area-studies/INDEX.md`.
7. Added lite, standard, and full synthesis templates.
8. Added a missing-capability/prerequisite-gate template.
9. Added `npm run test:area-studies`.
10. Wired the new check into `test:gate`, CI, and Release Linux.
11. Updated durable memory and manual checklist.

Out of scope:

- no math behavior
- no solver behavior
- no normal-user UI feature
- no source-mirror execution

## `AREA-POLY-RAT0` Implemented Study

`AREA-POLY-RAT0: Cross-Engine Polynomial And Rational Substrate Synthesis`

Implemented:

1. Added `playground/area-studies/studies/area-poly-rat0/`.
2. Validated committed studies under `playground/area-studies/studies/<area-id>/`.
3. Compared Calcwiz, FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra static source-context evidence.
4. Focused the synthesis on polynomial extraction, exact rational coefficient policy, polynomial division/GCD, rational-function cancellation, denominator constraints, partial-fraction readiness, and `INT-RAT1` blockers.
5. Chose bounded `INT-RAT1` as the next recommended implementation move.

Decision:

- proceed to `INT-RAT1` for one-variable exact rational functions with distinct rational linear partial fractions and derivative-backed verification
- keep repeated factors, irreducible quadratics, square-free factorization, resultants, Grobner/elimination, exact linear algebra, source execution, and copied source out of scope
- no new external clone
- no submodules
- no stable `src` dependency on raw Playground/source/area-study files
- no new Labs runner permissions
- no remote/SSH/provider runner work
- no `AREA-*` study implementation

## `SOURCE-CAPTURE1` Implemented Scope

`SOURCE-CAPTURE1: Shallow Static Captures For Registered Source Mirrors`

Implemented:

1. Shallow-captured the six remaining registered open-source mirrors under ignored `playground/sources/mirrors/<mirror-id>/`.
2. Captured SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context only.
3. Kept FriCAS as the existing active static context mirror.
4. Updated source-mirror metadata and index so captured mirrors are `active`, `static-only`, and `no-execute`.
5. Recorded exact capture commits and capture date `2026-05-21`.
6. Updated Giac/XCAS to use the GeoGebra GitHub mirror clone endpoint because the previous SourceForge URL was a browser path, not a clone endpoint.

## `POLY-ELIM1` Implemented Scope

`POLY-ELIM1: Bounded Resultant Core Over Exact Linear Algebra`

Implemented:

1. Added a bounded internal polynomial elimination core under `src/lib/algebra/`.
2. Built Sylvester matrices for same-variable positive-degree exact polynomials.
3. Computed scalar univariate resultants through the shared exact matrix determinant core.
4. Added structured stops for variable mismatch, zero/constant polynomials, Sylvester dimension limits, and determinant/growth failures.
5. Kept bivariate elimination, Grobner bases, product solver adoption, graphing, Labs runners, source-mirror execution, and copied source out of scope.

Decision:

- `POLY-ELIM1` is a substrate milestone only
- future elimination work must choose a bounded implementation slice such as `POLY-ELIM2`, or a product adoption study, rather than assuming broad CAS elimination is available

## `AREA-MULTIVAR0` Implemented Study

`AREA-MULTIVAR0: Variable Semantics And Multivariable Readiness Study`

Implemented:

1. Added `playground/area-studies/studies/area-multivar0/`.
2. Studied symbol discovery, solve-target selection, stored numeric variables, symbolic parameters, active variables, bound variables, history replay, assumption facts, and future elimination readiness.
3. Compared Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources only.
4. Chose `VARIABLE-CORE1` as the next recommended implementation slice.

Decision:

- proceed to `VARIABLE-CORE1`
- keep `EQUATION-TARGET1`, `VARIABLE-MEMORY1`, `CALCULUS-VARIABLE1`, `POLY-ELIM2`, graphing, source execution, and copied source out of this study
7. Recorded that the closed TI calculator installation is intentionally excluded from source-mirror registration.

Out of scope:

- no area study
- no source-mirror execution
- no dependency install
- no submodule recursion or adoption
- no source copying
- no Labs runner integration
- no stable `src` dependency on source mirrors

## `AREA-POLY-RAT1` Implemented Study

`AREA-POLY-RAT1: Full Polynomial/Rational Domain Atlas And Native Roadmap`

Implemented:

1. Added `playground/area-studies/studies/area-poly-rat1/`.
2. Marked `AREA-POLY-RAT0` as the predecessor narrow `INT-RAT1` decision study.
3. Studied the whole polynomial/rational domain across Calcwiz, FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra.
4. Covered expression-to-polynomial extraction, coefficient-domain policy, univariate/multivariate boundaries, normalization, division/GCD, factorization tiers, square-free readiness, rational-function normalization, denominator constraints, partial fractions, simplification interactions, and resultants/Grobner boundaries.
5. Chose `POLY-RAT-CORE1` as the next recommended implementation move.

Decision:

- proceed to `POLY-RAT-CORE1` for repeated linear factors, irreducible quadratic readiness, square-free/factor-multiplicity facts, and stronger rational stop metadata
- keep `INT-RAT2` waiting until those substrate facts exist
- keep `AREA-SIMPLIFY0` and `AREA-POLY-ELIM0` as separate studies when their blockers become immediate
- no source-mirror execution
- no external source copying
- no stable product dependency on source mirrors
- no Labs runner changes

## FriCAS Reframe Under Multi-Source Area Studies

`FRICAS-CTX0` is complete.

The important change is not bookkeeping. The important change is that Calcwiz is no longer studying FriCAS alone as the main research frame.

The next research frame is a Calcwiz capability area studied across all relevant sources. FriCAS remains valuable evidence, but it should sit beside SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and future graphing/workflow references where appropriate.

Reclassification under area synthesis:

- `ALG-CAPS0`: complete
- `VEC-MAT-AUDIT0`: complete
- `VEC-MAT-CORE0`: complete
- `POLY-CORE-AUDIT1`: complete
- `INT-CANDIDATE2`: complete
- `POLY-RAT-CORE0`: complete
- `LIM-SERIES-LAB0`: if reopened, should become an area study such as `AREA-LIM-SERIES0`
- `GROBNER-TINY0`: if reopened, should become an area study such as `AREA-POLY-ELIM0`
- `MATRIX-EXACT0`: deferred behind exact scalar/coefficient-domain readiness and should reopen through `AREA-EXACT-LINEAR-ALGEBRA0` or a dedicated exact-linear-algebra study
- any future FriCAS-specific prompt: convert into source evidence for a capability-area study, not a direct single-source implementation lane

This matters because the next major incubation roadmap should make capability areas first-class. FriCAS remains one source among several, not the owner of future Calcwiz milestones.

## `AREA-POLY-ELIM0` Implemented Study

`AREA-POLY-ELIM0: Polynomial Elimination, Resultants, And Grobner Study`

Implemented:

1. Added `playground/area-studies/studies/area-poly-elim0/`.
2. Studied elimination, resultants, Grobner bases, monomial ordering, coefficient domains, exact linear algebra, and assumption-fact propagation across Calcwiz plus all seven static mirrors.
3. Chose `AREA-EXACT-LINEAR-ALGEBRA0` as the next recommended move before `POLY-ELIM1`.
4. Recorded milestone naming policy: `0` is reserved for audit, study, surveillance, and readiness; implementation starts at `1`.
5. Recorded graphing deferral: graphing should not re-enter near-term planning until the calculator is broadly stabilized.

Decision:

- proceed to `AREA-EXACT-LINEAR-ALGEBRA0` before `POLY-ELIM1`
- keep resultants, Grobner bases, multivariate solving, exact matrix algebra, graphing, source execution, and copied source out of scope
- use area studies and Playground prototypes before any stable elimination adoption

## `AREA-EXACT-LINEAR-ALGEBRA0` Implemented Study

`AREA-EXACT-LINEAR-ALGEBRA0: Exact Linear Algebra Readiness Study`

Implemented:

1. Added `playground/area-studies/studies/area-exact-linear-algebra0/`.
2. Studied exact scalar policy, exact matrix/vector representation, determinant, rank, inverse, solve, row reduction/RREF, fraction-free elimination, growth caps, and assumption/trust fact propagation.
3. Compared Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources only.
4. Chose `EXACT-LINEAR-ALGEBRA1` as the next recommended implementation slice.

Decision:

- proceed to `EXACT-LINEAR-ALGEBRA1` as a bounded internal exact rational matrix core
- keep product `MATRIX-EXACT1`, `POLY-ELIM1`, bigint-focused `EXACT-SCALAR1`, graphing, source execution, and copied source out of scope

## `EXACT-LINEAR-ALGEBRA1` Implemented Core

`EXACT-LINEAR-ALGEBRA1: Bounded Internal Exact Rational Matrix Core`

Implemented:

1. Added a capped internal exact rational matrix core under `src/lib/linear-algebra/`.
2. Implemented exact determinant, RREF/rank, square solve, and inverse over current number-backed `ExactScalar` values.
3. Migrated rational-function partial-fraction coefficient solving to the shared exact matrix core.
4. Marked exact linear algebra readiness as `ready-with-adapter`.

Decision:

- exact linear algebra is now available as an internal substrate
- keep product `MATRIX-EXACT1`, symbolic linear-system solving, bigint-focused `EXACT-SCALAR1`, graphing, source execution, and Labs runner work out of this milestone

## Recommended Next Milestones

1. Continue the dedicated `EQUATION-PARAM*` lane only when selected-target Equation behavior is the selected priority; `EQUATION-PARAM3` now covers bounded rational LCD-clearing cases.
2. `POLY-ELIM2` - only after variable-role and target/projection-variable policy is explicit enough for bivariate elimination.
3. `MATRIX-EXACT1` - only when product-facing exact Matrix mode becomes the selected near-term priority.
4. `EXACT-SCALAR1` - only if coefficient-growth tests prove current number-backed rationals are the immediate blocker.
5. Another `EXACT-LINEAR-ALGEBRA*` slice - only if the core needs more internal operations before consumers adopt it.

## Success Criteria

After `INCUBATION-INFRA1`, Calcwiz should be able to answer:

- where source mirrors may live
- when source mirrors may be read or executed
- what Labs runners may do
- how area studies are structured
- how multi-source synthesis avoids clone/identity drift
- how missing foundations block or defer adoption
- how truth-first math output taxonomy informs proposals

The infrastructure should make future research safer and sharper without turning every small task into paperwork.
