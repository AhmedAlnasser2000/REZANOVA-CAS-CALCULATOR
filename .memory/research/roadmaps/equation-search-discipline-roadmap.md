# Equation Search Discipline Roadmap

Date: 2026-06-19

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

This roadmap turns the corrected solver-phase handoff and `EQUATION-SEARCH-DISCIPLINE-AUDIT0` into a bounded implementation sequence.

The goal is not "infinite CAS recursion." The goal is controlled, inspectable search: cheap target-shape recognition, bounded routing, fewer expensive impossible family attempts, honest structured stops, and enough evidence to protect future solver expansion.

## Source Inputs

- Corrected handoff: `.memory/research/roadmaps/equation-solver-search-discipline-handoff.md`
- Audit: `.memory/research/audits/equation-search-discipline-audit0-2026-06-19.md`
- Live repo anchors:
  - `src/lib/modes/equation/symbolic.ts`
  - `src/lib/modes/equation/parameterized.ts`
  - `src/lib/equation/isolation/selected-target.ts`
  - `src/lib/equation/parameterized/exp-log-core.ts`
  - `src/lib/equation/parameterized/polynomial.ts`
  - `src/lib/equation/parameterized/rational.ts`
  - `src/lib/algebra/polynomial-core/`

## Non-Goals For This Roadmap

- No broad `semantic-planner.ts` rewrite.
- No new OOE authority, runtime bus, registry, Supercarrier layer, plugin system, or worker-host merge.
- No graphing, step-by-step engine, Rust solver migration, Cardano/Ferrari, broad factoring, broad integration, or Durand-Kerner fallback until search discipline is stable.
- No replacement of existing exact polynomial-core. The question is whether the symbolic-parameter collectors should align with it, not whether flat polynomial maps exist.
- No brittle golden-suite wall-clock promises. Performance checks should be focused and deliberately scoped.
- No Exact/Isolate answer-mode redesign before search discipline. The boundary is real, but route search has to stabilize first.

## Milestone Sequence

### 0. `EQUATION-SEARCH-DISCIPLINE-AUDIT0`

Status: started/recorded as docs and memory.

Purpose:

- Preserve the external handoff with live-repo corrections.
- Map the current selected-target, parameterized, exp/log generated-equation, and polynomial-core seams.
- Name the next implementation seam without changing solver behavior.

Exit criteria:

- Corrected handoff preserved.
- Audit artifact recorded.
- Dedicated roadmap created.
- Memory protocol and diff hygiene pass.

### 1. `EQUATION-TARGET-SHAPE-PROFILE1`

Purpose:

- Add a cheap pure Equation target-shape profile for selected-target search.
- Detect target occurrence positions before running expensive family solvers.
- Keep the profile local and reusable without turning it into a global planner.

Likely outputs:

- Target occurrence counts.
- Target-in-exponent evidence.
- Target-in-denominator evidence.
- Target-under-radical evidence.
- Direct polynomial/linear candidate evidence.
- Trig/log/exp carrier evidence where cheap.
- Mixed/unknown fallback classification.

Guardrails:

- No visible solver capability expansion.
- No broad planner rewrite.
- No History, Display, app-state, OOE, worker, or runtime schema changes.
- Existing successes and structured stops must remain stable.

Verification:

- Focused pure tests for shape-profile classification.
- Existing Equation parameterized/selected-target tests.
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`

### 2. `EQUATION-SELECTED-TARGET-ROUTER-PERF1`

Purpose:

- Consume the target-shape profile inside selected-target isolation and related parameterized routing.
- Avoid expensive delegated family attempts when the profile proves they cannot work.
- Preserve existing route outputs, source labels, badges, and structured guidance.

Primary focus:

- `src/lib/equation/isolation/selected-target.ts`
- `src/lib/modes/equation/parameterized.ts`
- The reference `s` family and nearby exp/log selected-target cases.

Guardrails:

- No new solver family.
- No changed OOE cancellation, stale gate, launch ticket, history finalization, or display rendering policy.
- No broad route reordering unless tests prove parity.

Verification:

- Focused route/no-regression tests for current successes and stops.
- A focused perf sentinel or route-evidence assertion that avoids flaky broad timing.
- Existing Equation UI/runtime tests touched by the route if any.

### 3. `EQUATION-GENERATED-HANDOFF-PERF1`

Purpose:

- Audit and narrow generated-equation handoffs from exp/log and related carriers.
- Prevent generated equations from falling into expensive symbolic-polynomial verification when cheap shape evidence can reject or route them.

Primary focus:

- `src/lib/equation/parameterized/exp-log-core.ts`
- Generated equation solving order and fallback evidence.
- The power-generated equation family surfaced during audit.

Guardrails:

- Generated equations must preserve exact/readback semantics.
- No fake exact numeric fallback.
- No broad polynomial algorithm work.

Verification:

- Focused generated-equation tests.
- No-regression coverage for exp/log cases that already solve.
- Performance evidence should be scoped to route behavior, not global CI timing.

### 4. `POLYNOMIAL-SYMBOLIC-COEFF-SEAM1`

Purpose:

- Decide whether and how parameterized symbolic polynomial/rational collectors should align with existing `polynomial-core`.
- Keep symbolic `MathJson` coefficients and exact readback intact.

Primary focus:

- `src/lib/equation/parameterized/polynomial.ts`
- `src/lib/equation/parameterized/rational.ts`
- `src/lib/algebra/polynomial-core/`

Possible outcomes:

- Keep the local collectors but document why.
- Extract a small symbolic-coefficient polynomial seam.
- Reuse selected polynomial-core concepts where the coefficient model fits.

Guardrails:

- No broad algebra-core rewrite.
- No low-degree root algorithm expansion in this milestone.
- No display/readback format churn unless required by a verified bug.

### 5. Cap Recalibration

Purpose:

- Tune depth, degree, term, and generated-equation limits only after routing and representation work changes the actual bottleneck.

Guardrails:

- Cap hits must produce honest structured stops.
- Do not raise caps to hide search inefficiency.
- Keep display-size policy separate from solver-search policy.

### 6. Algorithm Expansion

Purpose:

- Add heavier solver algorithms only after search discipline and symbolic coefficient representation are stable.

Candidate later work:

- Cardano and Ferrari.
- Degree 5+ recognized special forms.
- Factoring pipeline.
- Named simplification operations.
- Numeric root fallback with explicit numeric labeling.
- Integration and ODE/PDE work after dedicated readiness audits.

## Reference Case Policy

The `s` problem should remain a search-discipline sentinel, not a broad golden promise. Treat exact elapsed time as machine-dependent. Prefer route evidence, bounded helper timing, or a small dev-only perf harness over global golden-suite wall-clock assertions.

## Deferred Exact/Isolate Boundary

The current Exact/Isolate tension is acknowledged and parked until after `EQUATION-SELECTED-TARGET-ROUTER-PERF1` and generated-equation handoff cleanup.

Future candidate differentiator:

- `Isolate`: rearrange/isolate the selected target as far as the algebraic shape safely allows, even when that yields a formula, condition, or unresolved carrier rather than a full solution set.
- `Exact`: may reuse isolation internally, but must add the extra exact-solve layer: roots, branch families, principal ranges for trig/inverse-function cases, domain/exclusion facts, candidate validation, and clear stops when it cannot honestly close the solution set.

This should prevent "Exact" from looking like "Isolate with a different label" on unsolved or principal-range-sensitive equations. It should be resolved as a later answer-mode semantics/readback milestone, not inside the search-discipline implementation itself.

## Working Rule

Every milestone in this roadmap must prove it reduced search chaos without creating a new authority. The solver can become more powerful later; first it must become more disciplined.
