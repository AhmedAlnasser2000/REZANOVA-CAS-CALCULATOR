# Equation Substrate Roadmap

Date: 2026-06-20

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Purpose

This roadmap starts the post-search-discipline Equation substrate track. The search rails are now in place: target-shape profile, route planning, trace evidence, generated handoff seams, symbolic coefficient sharing, and cap-hit evidence. The next growth should add mathematical substrate, not bigger caps or copycat CAS breadth.

## Source Inputs

- Search discipline roadmap: `.memory/research/roadmaps/equation-search-discipline-roadmap.md`
- Source mirror context: `.memory/research/audits/equation-source-mirror-context-audit0-2026-06-20.md`
- Cap evidence: `.memory/research/audits/equation-cap-hit-evidence1-2026-06-20.md`
- Real/default cap audit: `.memory/research/audits/equation-cap-hit-real-cases0-2026-06-20.md`
- Live substrate seams:
  - `src/lib/equation/parameterized/symbolic-polynomial.ts`
  - `src/lib/equation/parameterized/math-json.ts`
  - `src/lib/equation/parameterized/product-decomposition.ts`
  - `src/lib/equation/roots/representation.ts`
  - `src/lib/algebra/polynomial-core/`

## Working Rule

Substrate milestones may add reusable mathematical structure, but they must not create a new solver authority. Existing Equation family solvers keep ownership of their success/stops, readback, source labels, and answer-mode semantics until a named implementation milestone changes them.

## Substrate Sequence

1. Factoring/product decomposition.
2. Higher-degree root representation policy.
3. Branch/domain/exclusion facts.
4. Compact readback and implicit-root policy.
5. Exact/Isolate answer-mode semantics.

## DAG / Search Graph Position

Calcwiz has not implemented a symbolic DAG substrate. Current search-discipline work added shape profiling, local memoized traversal, conservative route plans, and trace evidence. That is not an expression DAG, e-graph, rewrite graph, or global search-state graph.

DAG/search-graph work is deferred. It becomes relevant only when repeated transformation states create concrete duplication pressure, such as overlapping branch-generated equations, factoring/elimination candidates, or candidate-validation states that need shared normalized forms. Do not start the substrate track with a broad DAG engine.

## Milestone Sequence

### 0. `EQUATION-SUBSTRATE-ROADMAP0`

Status: current roadmap-only milestone.

Purpose:

- Lock the substrate order after search-discipline and cap-real-case audits.
- Record why cap raising and broad DAG work are not first.
- Choose the first implementation candidate.

### 1. `EQUATION-FACTOR-PRODUCT-DECOMPOSITION1`

Status: implemented as the first narrow substrate milestone.

Purpose:

- Added a pure internal Equation product/factor decomposition seam at `src/lib/equation/parameterized/product-decomposition.ts`.
- Recognizes explicit zero-product sides, explicit `Multiply` / `InvisibleOperator` products, positive integer power multiplicity, target-bearing factors, target-free factors, and target-bearing unsupported powers.
- Preserved existing solver behavior by adopting the seam only in `factorable-polynomial.ts` explicit zero-product handling.

Guardrails:

- No broad automatic factoring in v1.
- No new visible solver success promise.
- No cap raise, DAG engine, OOE, Display, History, app-state, Tauri, graphing, step-by-step, or Exact/Isolate behavior change.
- Rational denominator/fact adoption, algebraic isolation, composition, and exact-rational factoring remain follow-up lanes with their own parity tests.

### 2. Higher-Degree Root Representation Policy

Status: first internal seam implemented by `EQUATION-ROOT-REPRESENTATION-SEAM1`.

Purpose:

- Decide how Calcwiz should represent roots it can identify but should not expand into unreadable formulas.
- Separate exact root objects, implicit roots, factor roots, numeric roots, and structured stops.

Audit finding:

- Display/result surfaces can show exact LaTeX, finite branch metadata, periodic families, exact supplements, approximate text, and candidate values, but Equation needed a solver-owned root representation.
- Formula-size, higher-degree symbolic, and factorable-degree stops should remain stops until an internal root model can distinguish explicit finite roots, factor-derived roots, exact-rational factor roots, implicit algebraic roots, numeric validated roots, periodic families, and structured stops.
- `branchReadback` remains display metadata, not the canonical root source.

Implemented seam:

- `EQUATION-ROOT-REPRESENTATION-SEAM1`

Current shape:

- Added `src/lib/equation/roots/representation.ts` as an internal Equation root model and adapter seam.
- Adopted it only in `factorable-polynomial.ts` explicit zero-product and exact-rational expanded factorable paths.
- Preserved current visible `exactLatex`, `branchReadback`, supplements, details, source labels, stop reasons, and caps.
- Kept numeric validated roots, implicit algebraic roots, and structured stops internal/dormant; no visible `RootOf`, implicit-root display, cap raise, broad factoring, Display/History schema, OOE, app-state, Tauri, graphing, step-by-step, or Exact/Isolate behavior changed.

Follow-up candidates:

- `EQUATION-BRANCH-DOMAIN-FACTS1`
- `EQUATION-COMPACT-ROOT-READBACK1`

### 3. Branch / Domain / Exclusion Facts

Status: audited by `EQUATION-FACTS-SURFACE-AUDIT0`.

Purpose:

- Carry denominator exclusions, radicand requirements, branch facts, periodic facts, and candidate-validation facts without stuffing everything into prose strings.
- Prepare future graphing/readback only after Equation can defend the facts.

Audit finding:

- Calcwiz already has typed fact ingredients: `SolveDomainConstraint`, `ExactSupplementEntry`, and `mergeExactSupplementLatex(...)`.
- `exactSupplementLatex` is rendered compatibility output, not canonical fact storage.
- `detailSections` are human method/readback text and should not be parsed as facts.
- Root-level fact attachment should be scoped and narrow; start with factorable root groups and rational denominator exclusions before broad adoption.

Candidate later milestones:

- `EQUATION-BRANCH-DOMAIN-FACTS1`

### 4. Compact Readback / Implicit-Root Policy

Purpose:

- Decide when a correct exact answer should be shown as compact branches, implicit root notation, factored form, isolated equation, or a structured stop.
- Keep formula-size caps as readback safety, not hidden solver failure.

Candidate later milestones:

- `EQUATION-IMPLICIT-ROOT-READBACK-AUDIT0`
- `EQUATION-COMPACT-ROOT-READBACK1`

### 5. Exact / Isolate Semantics

Purpose:

- Resolve the deferred answer-mode boundary after substrate facts and root/readback policy exist.
- Preserve `Isolate` as rearrangement/isolation intent.
- Require `Exact` to add roots, branch families, principal ranges, domain/exclusion facts, or candidate validation before claiming a solved exact answer.

Candidate later milestones:

- `EQUATION-EXACT-ISOLATE-SEMANTICS-AUDIT0`
- `EQUATION-EXACT-ISOLATE-SEMANTICS1`

## Non-Goals

- No source-mirror copy or parity target.
- No full CAS recursion promise.
- No broad semantic planner rewrite.
- No global DAG/e-graph/rewrite engine.
- No cap raise without user-real default-cap hit evidence.
- No Cardano/Ferrari, broad factoring, numeric root fallback, graphing, step-by-step, Rust migration, OOE expansion, Display rewrite, History schema change, app-state change, or Tauri change in this roadmap milestone.

## Verification Policy

Each implementation milestone must prove behavior boundaries with focused tests. Prefer pure helper tests and existing Equation parity suites before broad UI/runtime gates. Performance claims should use route evidence or narrow helper evidence, not broad wall-clock promises.
