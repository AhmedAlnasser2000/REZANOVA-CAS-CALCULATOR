# Equation Frontier Solver Roadmap

Date: 2026-06-21

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: claude
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: mixed

## Purpose

This roadmap starts the post-discipline, post-semantics Equation frontier track.

The goal is the first real capability leap toward mature-CAS-style solving power, without copying source mirrors, promising full CAS recursion, or hiding fragile behavior behind broad search. Calcwiz now has enough route discipline and producer substrate to begin capability expansion deliberately:

- target-shape profiling and conservative route planning;
- internal search-trace evidence;
- generated-handoff seams;
- symbolic polynomial coefficient sharing;
- generated-branch handoff sharing;
- product decomposition, root representation, branch/domain facts, and compact root readback;
- simplified `Exact` / `Isolate` semantics;
- contextual Numeric Interval Solve as numeric support, not an answer mode.

The frontier work should now add algebraic capability, not more router scaffolding.

## Source Inputs

- Original external handoff: `/home/ahmed/Downloads/codex-handoff-solver-phase.md`
- Corrected handoff: `.memory/research/roadmaps/equation-solver-search-discipline-handoff.md`
- Search roadmap: `.memory/research/roadmaps/equation-search-discipline-roadmap.md`
- Substrate roadmap: `.memory/research/roadmaps/equation-substrate-roadmap.md`
- Source-mirror audit: `.memory/research/audits/equation-source-mirror-context-audit0-2026-06-20.md`
- Cap evidence: `.memory/research/audits/equation-cap-hit-evidence1-2026-06-20.md`
- Real/default cap audit: `.memory/research/audits/equation-cap-hit-real-cases0-2026-06-20.md`
- Frontier handoff resync: `.memory/research/audits/equation-frontier-handoff-resync0-2026-06-21.md`

## Frontier Definition

For this roadmap, "frontier" means Calcwiz starts solving more equations by adding mathematical representation and transformation capability, not by trying more existing families for longer.

Frontier work should make one or more of these things true:

- an equation is converted into a stronger typed algebraic object;
- an expanded/factored/product form is decomposed into independently solvable pieces;
- a target polynomial/rational equation can be represented beyond current degree-2 symbolic limits through factor/special-form evidence;
- a result can preserve exact root structure without dumping unreadable formulas;
- branch/domain/exclusion facts travel with the solution instead of being recreated as prose;
- numeric tools validate or support a bounded route without replacing exact symbolic claims.

## What Is Already Done

- Search strategy is no longer the first blocker. Calcwiz has target-shape profile, route planning, generated-handoff evidence, and route trace seams.
- The original handoff's "flat polynomial representation" request is corrected: Algebra already has exact polynomial/rational cores, and Equation now has a MathJSON-symbolic coefficient seam for parameterized solving.
- Cap audits do not justify blind cap raises. Most current stops are algorithm, readback, or semantic boundaries.
- Numeric interval solving has been repaired as a contextual support tool, not a broad approximate answer mode.
- Step-by-step and graphing remain downstream of solver maturity.

## Working Rules

1. Add capability through substrate and family-owned consumers, not a new global solver authority.
2. Prefer factor/special-form decomposition before general formulas such as unrestricted Cardano/Ferrari.
3. Keep exact and numeric outputs separate. Numeric validation may support confidence; it must not become hidden Exact closure.
4. Keep source mirrors as context only. No production import, execution, copy, parity promise, or source-mirror path in runtime output.
5. Do not raise caps until a named capability/readback milestone makes the larger case defensible.
6. Do not start a DAG/e-graph/search graph until repeated transformation-state duplication creates concrete pressure.
7. Use route/search trace and focused fixtures to prove path choice; do not rely on broad wall-clock CI timing.

## Recommended Milestone Sequence

### 0. `EQUATION-FRONTIER-SOLVER-ROADMAP0`

Status: current roadmap-only milestone.

Purpose:

- Declare that the next Equation phase is capability frontier work, not more search-discipline cleanup.
- Lock the source-mirror lesson: mature systems get breadth from algebraic substrates, domain/fact handling, factorization/elimination, and honest fallback objects, not from unbounded peeling.
- Choose the first implementation lane.

Exit:

- Roadmap artifact recorded.
- Handoff resync performed.
- Manual checklist exists for the just-finished answer-semantics/numeric-interval track.
- Memory protocol and diff hygiene pass.

### 0.5. `EQUATION-FRONTIER-HANDOFF-RESYNC0`

Status: current audit/resync milestone.

Purpose:

- Reopen the external Claude handoff after search discipline, substrate seams, Exact/Isolate simplification, and Numeric Interval repair.
- Mark what is implemented, stale, corrected, preserved, deferred, and newly recommended.
- Prevent the older cap/algorithm list from pulling Calcwiz into blind cap raises, DAG-first work, or broad source-mirror imitation.

### 1. `EQUATION-FACTORABLE-DECOMPOSITION-FRONTIER1`

Status: implemented as the first code frontier milestone.

Purpose:

- Turn the new product decomposition, root representation, branch/domain facts, and compact root readback seams into the first visible capability expansion.
- Start where Calcwiz already has strong evidence: explicit products and factor-derived roots.

Implemented scope:

- Split factorable cap policy so explicit zero-product solving gets a 12 target-degree-slot budget while expanded/exact-rational factorable solving keeps the existing degree-4 behavior.
- Counts the explicit-product budget after multiplicity: twelve linear factors, six quadratic factors, or mixed linear/quadratic factors can solve when each target-containing factor delegates to an existing supported family.
- Preserves multiplicity internally and in detail lines while keeping visible roots deduped.
- Keeps target-free numeric nonzero constants ignored and target-free symbolic factors as current conditional-family stops.
- Updates cap evidence so five explicit linear factors now succeed and thirteen target-degree slots remain a `degree-limit`.

Non-goals:

- No broad automatic factoring.
- No general Cardano/Ferrari.
- No individual cubic/quartic factor solving.
- No multivariable factorization.
- No DAG/search graph.
- No Display/History schema change.
- No Exact/Isolate rewrite.

Why first:

- The code already has `product-decomposition`, `EquationRootSet`, branch/domain facts, and readback adapters.
- The cap evidence has a concrete factorable-product degree boundary.
- This can create a visible exact-solving leap with less risk than jumping straight into general cubic/quartic formulas.

### 2. `EQUATION-EXPANDED-FACTOR-FRONTIER1`

Status: implemented.

Purpose:

- Use existing Algebra factorization surfaces where they are already bounded and exact to turn selected expanded univariate polynomial equations into factor-derived root groups.
- Keep Algebra-owned exact-rational factorization separate from Equation readback and answer semantics.

Implemented scope:

- Exact-rational univariate polynomials only.
- Algebra bounded factor APIs now accept explicit max-degree options while preserving degree 4 as the default for existing callers.
- The Equation factorable expanded path opts into degree 12 and adapts successful factorization through existing Equation root representation and compact readback.
- Expanded degree-5 and degree-12 exact-rational polynomials can solve when rational-root extraction reduces them to real linear factors plus an optional real quadratic remainder.
- Degree >12 stops with `degree-limit`; unfactored or unsupported degree 5-12 expanded exact-rational cases stop as `unsupported-expanded-polynomial`.

Non-goals:

- No full symbolic coefficient factorization.
- No arbitrary special functions.
- No hidden numeric fallback.
- No broad automatic factoring or general high-degree formulas.

### 3. `EQUATION-SPECIAL-FORM-ROOTS-FRONTIER1`

Status: implemented.

Purpose:

- Add exact high-degree special forms before broad formulas.

Implemented scope:

- Real Exact affine selected-target powers now split caps: real affine powers may solve through degree 12, while Complex power isolation remains capped at degree 4.
- Added an exact-rational pure-power carrier helper for quadratics in `u=x^n`, outer degree 2, and total degree `2n <= 12`.
- Added `special-form-roots` as an internal/test-traced selected-target route family after factorable polynomial and before generic carrier/algebraic fallbacks.
- `x^6-5x^3+4=0` and `x^{12}-5x^6+4=0` are now compact exact real-root frontier cases.

Deferred from this milestone:

- No universal degree-5+ closed form promise.
- No Durand-Kerner as Exact closure.
- No unreadable formula dump.
- No symbolic carrier coefficients.
- No affine/non-pure carrier substitution until the follow-up affine-carrier milestone.
- No reciprocal/palindromic special forms yet.

### 3.5. `EQUATION-AFFINE-CARRIER-SPECIAL-FORM-FRONTIER1`

Status: implemented.

Purpose:

- Extend special-form carrier solving from pure `x^n` carriers to narrow affine carriers before attempting symbolic carrier coefficients or broad symbolic factor discovery.

Implemented scope:

- Real Exact only.
- Carrier base shape `(q*x+r)^n`, where `q` is a nonzero exact-rational coefficient and `r` is target-free symbolic MathJSON.
- Exact-rational outer quadratic carrier equations through total target degree 12.
- Examples now solved through the special-form carrier seam: `(x+a)^6-5(x+a)^3+4=0` and `(2x-1)^{12}-5(2x-1)^6+4=0`.
- Back-substitution preserves symbolic radical readback instead of decimalizing roots.
- Direct affine powers such as `(x+a)^{12}=b` remain on the algebraic-isolation route.
- Complex high-degree special-form carrier shapes stop at the explicit Complex boundary.

Non-goals:

- No symbolic outer carrier coefficients.
- No symbolic target coefficient inside the affine carrier.
- No non-affine carrier discovery.
- No Complex degree-12 widening.
- No broad factorization, visible implicit roots, numeric Exact fallback, Display/History schema changes, OOE/app-state/Tauri changes, graphing, step-by-step, or DAG/search graph.

### 3.6. `EQUATION-SYMBOLIC-CARRIER-COEFF-FRONTIER1`

Status: implemented.

Purpose:

- Extend special-form carrier solving to target-free symbolic outer quadratic coefficients without inventing a second symbolic coefficient collector.

Implemented scope:

- Real Exact only.
- Pure carriers `x^n` and affine carriers `(q*x+r)^n`, where `q` is nonzero exact-rational and `r` is target-free symbolic MathJSON.
- Outer quadratic coefficients are collected through the existing Equation `SymbolicTargetPolynomial` seam.
- Total target degree remains capped at 12.
- Examples now solved: `x^6-a*x^3+b=0`, `x^{12}-a*x^6+b=0`, and `(x+c)^6-a*(x+c)^3+b=0`.
- Readback uses existing root/fact/detail surfaces, including discriminant facts and even-root carrier nonnegativity facts.

Non-goals:

- No target-bearing carrier coefficients.
- No non-affine carrier discovery.
- No Complex degree-12 widening.
- No broad symbolic factoring, Cardano/Ferrari formulas, visible implicit roots, numeric Exact fallback, Display/History schema changes, OOE/app-state/Tauri changes, graphing, step-by-step, or DAG/search graph.

### 3.7. `EQUATION-SYMBOLIC-FACTOR-DISCOVERY-FRONTIER1`

Status: implemented.

Purpose:

- Add the first narrow symbolic factor discovery path after product/factor/root/fact/readback substrate is stable.

Implemented scope:

- Real Exact factorable route only.
- Zero-form expanded symbolic polynomials through total target degree 12.
- Supported shape: a common selected-target power factor `x^k * Q(x)=0`, where `k > 0` and residual `Q` is linear or quadratic with target-free symbolic coefficients.
- Discovered factors delegate to the existing linear/quadratic selected-target solvers, then merge roots through existing factorable root representation and compact readback.
- Examples now solved: `x^3-a*x^2=0`, `x^5-a*x^3=0`, and `x^{12}-a*x^{10}=0`.

Non-goals:

- No residual degree >2 symbolic factoring.
- No target-bearing coefficients, denominator factors, or target-in-function factors.
- No sum/difference-of-powers factoring.
- No broad symbolic factorization, Cardano/Ferrari formulas, visible implicit roots, numeric Exact fallback, Display/History schema changes, OOE/app-state/Tauri changes, graphing, step-by-step, or DAG/search graph.

### 3.8. `EQUATION-SYMBOLIC-FACTOR-PATTERNS-FRONTIER1`

Status: implemented.

Purpose:

- Extend symbolic factor discovery from one common pure-target-power pattern into a small internal pattern seam.

Implemented scope:

- Extracted the common symbolic factor discovery out of `factorable-polynomial.ts` into `symbolic-factor-patterns.ts`.
- Real Exact factorable route only.
- Affine common-carrier powers through degree 12, where the carrier is `(q*x+r)` with nonzero exact-rational `q` and target-free symbolic `r`.
- Residual affine-carrier polynomials are expanded only for degree 1/2 so existing linear/quadratic selected-target solvers remain the only delegated solvers.
- Safe real difference-of-powers `U^n-V^n=0` through degree 12, where `U` is a pure/affine selected-target carrier and `V` is target-free.
- Examples now solved: `(x+c)^3-a*(x+c)^2=0`, `(2x-1)^5-a*(2x-1)^3=0`, `x^2-a^2=0`, `(x+c)^2-a^2=0`, and `x^3-a^3=0`.

Non-goals:

- No sum-of-powers factoring.
- No Vieta/product-sum symbolic factoring.
- No residual degree >2.
- No target-bearing coefficients, denominator factors, or target-in-function factors.
- No Complex degree-12 widening.
- No Cardano/Ferrari formulas, visible implicit roots, numeric Exact fallback, Display/History schema changes, OOE/app-state/Tauri changes, graphing, step-by-step, or DAG/search graph.

### 4. `EQUATION-CUBIC-QUARTIC-POLICY-AUDIT0`

Purpose:

- Decide whether Cardano/Ferrari should be user-visible formulas, internal factorization helpers, collapsed exact objects, or mostly replaced by factor/special-form/implicit-root readback.

Reason:

- The handoff lists Cardano/Ferrari, but Calcwiz product policy now says formula size affects display, not mathematical classification. The next safe step is a policy audit before rendering giant formulas.

### 5. `EQUATION-ELIMINATION-FRONTIER1`

Purpose:

- Start bounded elimination/resultant-style solving only after factor/special-form root representation is stable.

Candidate scope:

- Reuse existing Algebra polynomial-elimination/resultant cores where target/parameter roles are explicit.
- Keep one-target or small fixed-variable cases first.
- Preserve domain/fact/readback metadata.

Non-goals:

- No Groebner-first roadmap.
- No broad multivariable solve command.
- No hidden source-mirror delegation.

### 6. `EQUATION-IMPLICIT-ROOT-FRONTIER1`

Purpose:

- Convert some "formula too large" or "irreducible but exact structure exists" stops into internal implicit root objects, then decide visible notation separately.

Candidate scope:

- Internal-only implicit algebraic roots first.
- Structured exact stops that can later become readback rows.
- No visible `RootOf` until notation/copy/editor/user-expectation policy is approved.

### 7. `EQUATION-SEARCH-GRAPH-AUDIT0`

Purpose:

- Reassess DAG/e-graph/search-graph need after factorization, special forms, and elimination create repeated transformation states.

Trigger evidence:

- repeated normalized equations across branch handoffs;
- repeated factor/elimination candidates;
- repeated candidate-validation states;
- exponential revisit pressure visible in route trace evidence.

Non-goal:

- Do not start with a graph because mature systems have one. Start only if Calcwiz now has the repeated-state pressure that justifies it.

## Deferred From This Frontier

- Step-by-step: still downstream of solver maturity and should explain stable chosen paths, not immature route accidents.
- Graphing: still downstream of trustworthy domains, restrictions, branches, discontinuities, and failure reasons.
- Rust migration: still measured-loop-only over flat homogeneous data, not expression trees or symbolic dispatch.
- Broad integration/ODE/PDE/linear-algebra expansion: important later, but not part of this Equation frontier kickoff.
- Durand-Kerner as general Equation fallback: keep numeric roots labeled numeric; do not use numeric roots as Exact proof.

## Acceptance Standard For Frontier Milestones

A frontier implementation milestone should show at least one real capability improvement while preserving Calcwiz trust:

- new exact successes must carry defensible root/fact/readback evidence;
- new stops must be more honest or more structured, not vaguer;
- existing successes must preserve exactLatex/copy/history/replay behavior unless explicitly changed;
- route trace or helper evidence should prove the intended path;
- numeric support must remain local/approximate and labeled;
- tests should include old supported cases, new frontier cases, and nearest over-boundary stops.

## Bottom Line

Calcwiz is ready to start the frontier phase now. The first leap should be factorable/decomposition capability because the current repo already has the rails to make it safe: product decomposition, root representation, branch/domain facts, compact readback, and simplified answer semantics.
