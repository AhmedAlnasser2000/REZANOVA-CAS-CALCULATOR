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

Follow-on: `EQUATION-FRONTIER-SOLVER-ROADMAP0` now owns the next capability-expansion sequence after this substrate track and numeric-route repair. This substrate roadmap remains the record of the seams already prepared; the frontier roadmap chooses the first visible capability lane.

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

Status: first internal seam implemented by `EQUATION-BRANCH-DOMAIN-FACTS1`.

Purpose:

- Carry denominator exclusions, radicand requirements, branch facts, periodic facts, and candidate-validation facts without stuffing everything into prose strings.
- Prepare future graphing/readback only after Equation can defend the facts.

Audit finding:

- Calcwiz already has typed fact ingredients: `SolveDomainConstraint`, `ExactSupplementEntry`, and `mergeExactSupplementLatex(...)`.
- `exactSupplementLatex` is rendered compatibility output, not canonical fact storage.
- `detailSections` are human method/readback text and should not be parsed as facts.
- Root-level fact attachment should be scoped and narrow; start with factorable root groups and rational denominator exclusions before broad adoption.

Implemented first slice:

- Added `src/lib/equation/facts/branch-domain-facts.ts` as the internal adapter around existing exact-supplement/domain-constraint meanings.
- Added attachment scopes for `global`, `root-set`, `root-group`, and `branch`, while rendering the current raw supplement strings for compatibility.
- Adopted only factorable root-group facts and parameterized rational denominator exclusions.

Candidate later milestones:

- `EQUATION-BRANCH-DOMAIN-FACTS-ADOPTION2`
- `EQUATION-COMPACT-ROOT-READBACK1`

### 4. Compact Readback / Implicit-Root Policy

Status: first internal seam implemented by `EQUATION-COMPACT-ROOT-READBACK1`.

Purpose:

- Decide when a correct exact answer should be shown as compact branches, implicit root notation, factored form, isolated equation, or a structured stop.
- Keep formula-size caps as readback safety, not hidden solver failure.

Audit finding:

- Visible `RootOf` / implicit-root notation is not the next safe move; the internal implicit-root type stays dormant until notation, copy/editor, ordering, domain, and user-expectation policy are decided.
- Formula-size stops are readback/product-safety boundaries. They should eventually carry structured evidence, but should not be treated as no-root results or as a reason to raise caps blindly.
- Display and History should remain consumers of current strings/metadata for now; producer-side adapters should map root representations back into existing `exactLatex`, `branchReadback`, supplements, and detail sections.

Implemented first slice:

- Added `src/lib/equation/roots/readback.ts` as the producer-side compact root/readback adapter.
- The helper returns visible exact readback from current root-set surfaces, structured stop metadata for dormant structured stops, or `no-visible-exact` for dormant implicit/numeric-only roots.
- Adopted only factorable root-set consumers; visible roots, branch readback, supplements, details, formula-size stops, source labels, and schemas remain unchanged.

Candidate later milestones:

- `EQUATION-IMPLICIT-ROOT-NOTATION-AUDIT0`
- `EQUATION-EXACT-ISOLATE-SEMANTICS-AUDIT0`

### 5. Exact / Isolate Semantics

Status: audited by `EQUATION-EXACT-ISOLATE-SEMANTICS-AUDIT0`, simplified directionally by `EQUATION-ANSWER-MODE-SIMPLIFICATION0`, and first implemented by `EQUATION-ANSWER-MODE-SIMPLIFICATION1`. The uncommitted `EQUATION-ANSWER-SEMANTICS-TAGS1` source/test slice was removed from the worktree before commit and must be reworked from the new boundary if revived.

Purpose:

- Resolve the deferred answer-mode boundary after substrate facts and root/readback policy exist.
- Preserve `Isolate` as rearrangement/isolation intent.
- Require `Exact` to add roots, branch families, principal ranges, domain/exclusion facts, or candidate validation before claiming a solved exact answer.
- Remove `Approx` as an active Equation answer mode while preserving Numeric Interval Solve as a contextual numeric route/tool.

Audit finding:

- `Approx` currently conflates an answer-mode selector with the Numeric Interval Solve route. Numeric interval solving remains useful, but it should no longer be persisted or shown as the ordinary third answer mode.
- `Isolate` already short-circuits into `isolateSelectedTargetEquation(...)` and may return an isolated formula or isolated equation, with Valid When facts when rearrangement introduces conditions.
- `Exact` may use isolation helpers internally, but the terminal result should carry exact evidence before it is treated as an Exact success. Irrational radicals and symbolic-parameter formulas are Exact when symbolically represented.
- Existing `DisplayOutcome.solutionKind` is the best first behavior-preserving seam for recording answer semantics.

Audit update:

- `EQUATION-ANSWER-MODE-SIMPLIFICATION0` records the new implementation direction.
- Active Equation answer modes should become `Exact` and `Isolate`.
- Header `DECIMAL`, approximate digits, and numeric notation settings remain display-output controls.
- Numeric interval solving should become contextual route/action metadata rather than `equationAnswerMode: 'approximate'`.
- Legacy settings/history with `approximate` need compatibility handling.
- The salvageable part of `EQUATION-ANSWER-SEMANTICS-TAGS1` is produced-answer tagging for Exact/Isolate plus precise missing-value guidance; its old Approximate answer-mode implementation was removed before commit.

Candidate later milestones:

- `EQUATION-EXACT-ISOLATE-SEMANTICS1`

Implemented simplification slice:

- `EQUATION-ANSWER-MODE-SIMPLIFICATION1` removes `Approx` from active Settings and Equation workspace answer-mode controls.
- Web and Tauri settings sanitize legacy/invalid `approximate` values to `exact`.
- Numeric Interval Solve remains an explicit contextual route/tool and records successful numeric-route output as `solutionKind: 'approximate-numeric'` without persisting `answerMode: 'approximate'`.
- Contextual numeric visibility is intentionally narrow: hidden on ordinary symbolic input, available when already opened, shown for periodic suggested intervals, and auto-opened only for numeric-solve error advisories.

Implemented numeric-route repair slice:

- `EQUATION-NUMERIC-INTERVAL-ROUTE-REPAIR1` keeps Numeric Interval Solve as a contextual route/tool and removes its redundant panel-local run button.
- Eligibility and visibility are distinct: exact stops with numeric advisories expose the `Numeric Solve` opener, but numeric execution is armed only after the user opens the panel.
- While the panel is open, header Run, F1, and EXE dispatch the numeric interval route; once hidden, those controls return to symbolic Exact/Isolate solving.

Implemented numeric guidance slice:

- `EQUATION-NUMERIC-INTERVAL-GUIDANCE1` renders exact periodic `suggestedIntervals` inside the open Numeric Interval panel.
- Suggestions are click-to-fill only: Start and End are filled, Subdivisions remain user-controlled, and no computation starts until Run/F1/EXE.
- Numeric interval wording now frames the tool as a local real search plus final validation, with clearer guidance for no roots, rejected candidates, invalid intervals, dense/nested periodic cases, and discontinuity/domain holes.

Implemented numeric stability slice:

- `EQUATION-NUMERIC-INTERVAL-STABILITY1` adds bounded adaptive refinement to Numeric Interval Solve.
- Refinement is deterministic and capped, covering sign changes, near-zero residuals, local minima, steep jumps, discontinuity-like endpoints, and trig/log dense-periodic cells before final original-equation validation.
- Diagnostics now report adaptive samples, refined cells, and discontinuity cells; the route still does not claim all roots in an interval.
- Numeric route successes now surface approximate roots as the primary visible answer/readback even under Exact output style, without writing fake `exactLatex`; Copy Result copies those numeric roots.

Candidate later numeric-route milestones:

- `EQUATION-NUMERIC-INTERVAL-SUGGESTION-EXPANSION1` if non-periodic exact stops need generated interval suggestions.
- `EQUATION-NUMERIC-INTERVAL-DIAGNOSTIC-SURFACE1` if the UI should expose richer sampler diagnostics beyond current detail text.

Candidate later milestones:

- `EQUATION-EXACT-ISOLATE-SEMANTICS1`
- `EQUATION-ANSWER-SEMANTICS-TAGS2` if Exact/Isolate produced-answer tags are still desired after the active Approx removal

## Non-Goals

- No source-mirror copy or parity target.
- No full CAS recursion promise.
- No broad semantic planner rewrite.
- No global DAG/e-graph/rewrite engine.
- No cap raise without user-real default-cap hit evidence.
- No Cardano/Ferrari, broad factoring, numeric root fallback, graphing, step-by-step, Rust migration, OOE expansion, Display rewrite, History schema change, app-state change, or Tauri change in this roadmap milestone.

## Verification Policy

Each implementation milestone must prove behavior boundaries with focused tests. Prefer pure helper tests and existing Equation parity suites before broad UI/runtime gates. Performance claims should use route evidence or narrow helper evidence, not broad wall-clock promises.
