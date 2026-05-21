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
7. Recorded that the closed TI calculator installation is intentionally excluded from source-mirror registration.

Out of scope:

- no area study
- no source-mirror execution
- no dependency install
- no submodule recursion or adoption
- no source copying
- no Labs runner integration
- no stable `src` dependency on source mirrors

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
- `MATRIX-EXACT0`: deferred behind exact scalar/coefficient-domain readiness and should reopen through `AREA-LINALG0` or a dedicated exact-linear-algebra study
- any future FriCAS-specific prompt: convert into source evidence for a capability-area study, not a direct single-source implementation lane

This matters because the next major incubation roadmap should make capability areas first-class. FriCAS remains one source among several, not the owner of future Calcwiz milestones.

## Recommended Next Milestones

1. `AREA-POLY0` - first full cross-engine area synthesis, chosen because Calcwiz already has polynomial/rational substrate work and future integration/solving depend on it.
2. Depending on `AREA-POLY0`, either:
   - a bounded stable prerequisite milestone,
   - a Level 0 or Level 1 Playground experiment,
   - or a deferred/no-action decision.

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
