# INEQ-COMPLEX-FOUNDATION0 Domain Audit

status: readiness audit
created: 2026-06-02
milestone: INEQ-COMPLEX-FOUNDATION0
primary_agent: codex
primary_agent_model: gpt-5
attribution_basis: live

## Purpose

`INEQ-COMPLEX-FOUNDATION0` freezes the first shared semantics for future inequality and complex-number work before any new solver capability is exposed.

The key product decision is narrow but important: future inequality and complex routes should be **Equation-first** until stable, while their internal cores must remain reusable. Equation is the proving ground because it already owns the hardest semantics: solve targets, exact/approx/isolate intent, branch facts, validity facts, candidate validation, and "no real solution" wording.

This milestone is documentation/readiness only. It does not add the top-header `Complex` toggle, an inequality solver, complex Equation solving, stored complex variables, OOE behavior, or runtime code changes.

## Contract Freeze

### Answer Domain

Use one internal answer-domain vocabulary across future Equation, assumptions, readback, and OOE diagnostics work:

- `real`: returned solutions are intended as real values.
- `complex`: returned solutions may include non-real complex values.
- `conditional-real`: symbolic output is real only under visible facts or parameter restrictions.
- `unknown-domain`: the route cannot prove a trustworthy domain.

The vocabulary is internal first. UI exposure may use friendlier chips/notes, but each result/provenance record should have one source of truth.

### Solution Kind

Keep solution style separate from answer domain:

- exact symbolic answer;
- approximate numeric answer;
- isolate/rearranged formula;
- inequality solution set;
- condition/fact-only stop.

This keeps `Exact`, `Approximate`, and `Isolate` from silently absorbing inequality or complex behavior.

### Complex Toggle

Product-facing complex answers are opt-in through a future top-header `Complex`/complex-domain toggle.

Locked behavior:

- disabled by default;
- when disabled, current real-first behavior remains valid, including controlled "no real solution" results;
- when enabled, bounded complex-capable Equation routes may return visibly marked complex-domain answers;
- the toggle expresses answer-domain intent, not a solver family by itself;
- stored values remain finite real numeric values until a separate variable milestone deliberately changes that policy.

### Equation-First Adoption

Reusable cores may be shared across the app, but visible inequality/complex solver adoption stays in Equation until stable.

Deferred visible adoption:

- Calculate;
- Table;
- Calculus and Advanced Calc;
- Trigonometry;
- Geometry;
- Statistics;
- Matrix and Vector.

These modes may later consume shared facts or domain metadata, but they should not receive visible inequality or complex routes during the first product adoption pass.

## Existing Reusable Substrates

### Assumptions Core

`src/lib/algebra/assumptions-core.ts` already provides a scoped fact substrate:

- fact kinds: domain exclusion, domain constraint, interval hazard, branch/principal range, candidate rejection, equivalence trust;
- sources: rational-function core, domain-range core, branch core, candidate validation, simplify policy, calculus verification, legacy;
- trust levels: proved, validated, sampled, display-only, blocked;
- scopes: request, result, candidate, interval, display;
- stable merge/summarize/readback-adapter path.

Future work should extend this substrate with inequality and complex fact vocabulary rather than creating Equation-local fact shapes.

### Branch Core

`src/lib/algebra/branch-core.ts` owns branch equation sets, branch constraints, branch-family metadata, representatives, suggested intervals, piecewise branches, principal range, and structured periodic stop reasons.

Future complex/inequality work should reuse branch-core for:

- branch/case bookkeeping;
- principal branch/range metadata;
- branch-generated constraints;
- future formula branch readback.

It should not become a general inequality engine or complex branch-cut theorem prover.

### Domain/Range Core

`src/lib/algebra/domain-range-core.ts` owns current real-domain helpers:

- real range proofs for constants, trig carriers, trig squares, positive exponentials, principal roots, absolute value, bounded sums/products;
- real-domain constraints for denominators, logs, roots, negative powers, intervals, and one-sided/interval checks;
- domain sampling readiness for Table and future graphing-style readiness.

Future inequality work should reuse interval/range pieces where possible, and complex work should explicitly mark when a route is no longer real-domain constrained rather than bypassing the core silently.

### Numeric Complex Primitive

`src/lib/numeric/complex.ts` already contains a small numeric complex primitive with arithmetic, square root, normalization, and LaTeX/text formatting. `src/lib/display/format.ts` can format complex solution lists, and guided quadratic/quartic code already uses numeric complex fallback in bounded places.

`COMPLEX-CORE1` should evaluate this primitive before adding anything new. The likely gap is not "no complex type exists"; it is that Calcwiz lacks a domain-intent contract, exact symbolic complex readback policy, and product-facing toggle.

### Current Public Shapes

Existing shared shapes already matter:

- `SolveDomainConstraint` in `src/types/calculator/solver-types.ts` records intervals, nonzero, positive, nonnegative, expression intervals, trig carrier ranges, trig-square ranges, and exp-positive facts.
- `DisplayOutcome` in `src/types/calculator/display-types.ts` carries result text, supplement facts, detail sections, badges, candidate metadata, numeric method, and Equation answer mode.
- `EquationAnswerMode` currently separates Exact, Approximate, and Isolate intent.
- OOE diagnostics/provenance can already record route intent and should later distinguish exact/approx/isolate/inequality and real/complex domains after the core contract exists.

## Current Real-Only And Inequality-Adjacent Audit

### Equation

Equation is the richest and highest-risk adoption target.

Current behavior includes:

- symbolic mode rejects inequality relations with controlled guidance;
- `Approximate` is real numeric interval solving only;
- `Exact` remains strict symbolic intent and stops numeric-only fallback guidance;
- `Isolate` is textbook formula rearrangement, not broad exact solving;
- range guards report real-domain impossibilities;
- selected-target solvers preserve nonzero, positive, nonnegative, range, branch, and denominator facts;
- candidate validation rejects roots that fail the original equation or preserved domain constraints;
- current wording repeatedly distinguishes "real solution" and "real domain";
- current complex-like behavior exists in guided polynomial fallback, but broad symbolic complex solving is not adopted.

Equation is the first product-facing home for future complex/inequality behavior because it already owns selected targets, answer modes, branch facts, and solution validity.

### Calculate

Calculate remains real-first:

- expression evaluation/simplification guards raw `NaN`, complex-like `i`, and unsupported real-domain exits;
- explicit algebra tray works on expressions, not relations or inequalities;
- keypad and virtual keyboard may expose relation symbols or `i`, but that is not solver capability.

Visible inequality/complex Calculate behavior is deferred.

### Table

Table remains real numeric sampling:

- sampled rows outside the real domain become `undefined`;
- warnings explain that sampled rows left the real domain;
- stored values are finite real numeric values;
- OOE Table worker/cooperative work does not change math semantics.

Visible complex or inequality Table behavior is deferred.

### Calculus And Advanced Calc

Calculus routes currently depend on real-domain verification, interval safety, derivative/integral/limit strategy metadata, and sampled/proved facts. They should consume future shared domain facts eventually, but product-facing complex or inequality calculus behavior is out of scope for the first adoption pass.

### Trigonometry

Trigonometry is real-angle oriented:

- trig equation routes emit real periodic families and range failures;
- inverse/principal-range behavior is real-domain policy;
- no complex trigonometric solving is approved in this roadmap.

### Geometry And Statistics

Geometry and Statistics are real numeric/guided workflow domains. Future shared inequality facts may help constraints/readback, but visible inequality/complex solver expansion is deferred.

### Matrix And Vector

Matrix and Vector product surfaces are numeric real workspaces plus notation pads. Exact linear algebra exists separately as an internal core for bounded algebra consumers, but visible complex matrices/vectors are deferred.

## Risks To Avoid

- Returning complex roots while the UI still implies real answers.
- Letting inequality facts become hidden global assumptions.
- Adding Equation-only fact dialects that cannot be reused by OOE diagnostics or other modes.
- Treating `Complex` as a parser switch rather than answer-domain intent.
- Letting `Approximate` silently become complex numerical search.
- Changing stored values from finite real numerics without a dedicated variable milestone.

## Inputs For VALUE-DOMAIN-CORE1

The next implementation milestone should add a small internal substrate, not solver capability:

- answer-domain and solution-kind metadata types;
- reusable constructors for real-domain, complex-domain, inequality, branch/principal, and candidate facts;
- readback helpers for simple facts;
- adapters from existing `SolveDomainConstraint` and `AssumptionFact` structures;
- no public UI change unless tests need minimal internal plumbing;
- no product-facing complex or inequality solving.

## Verification

This audit is complete when:

- the roadmap records Equation-first adoption and complex opt-in behavior;
- current state and decisions record the scope;
- the manual checklist and session dossier exist;
- `npm run test:memory-protocol` passes.
