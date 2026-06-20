# EQUATION-EXACT-ISOLATE-SEMANTICS-AUDIT0

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

## Summary

Calcwiz is ready to clarify the Exact/Isolate/Approximate boundary without changing solver behavior first. The current code already has the right high-level split:

- `Approximate` is the numeric/decimal lane: interval solving, numeric roots, numeric validation, and decimal views.
- `Isolate` is the selected-target rearrangement/formula lane.
- `Exact` is the symbolically representable solved-answer lane; irrational radicals and symbolic-parameter formulas can be Exact.

The main gap is not that the current routes are wrong. The gap is that successful Equation outcomes do not consistently expose machine-readable answer semantics beyond `answerMode`, `resultOrigin`, `answerDomain`, and scattered detail-section prose. The next implementation should tag existing outcomes first, then consider visible wording later.

## Code Evidence

| Area | Code anchor | Current behavior | Audit conclusion |
| --- | --- | --- | --- |
| Answer-mode type/schema | `src/types/calculator/mode-types.ts`, `src/lib/app-state/schemas.ts` | `EquationAnswerMode = 'exact' | 'approximate' | 'isolate'`; settings default to `exact`. | The persisted mode vocabulary is already stable and should not be renamed. |
| UI selector | `src/app/workspaces/EquationWorkspace.tsx` | Shows `Exact`, `Approx`, `Isolate` as a simple control. | UI labels are intentionally compact, but do not explain the semantic boundary. Defer wording changes until tags exist. |
| Runtime request | `src/app/logic/runtimeControllers.ts`, `src/lib/modes/equation/run.ts` | Passes `equationAnswerMode` through OOE/runtime/history context. | Runtime already preserves the user intent; no OOE change is needed. |
| Approximate mode | `src/lib/modes/equation/run.ts`, `src/lib/modes/equation/outcomes.ts`, `answer-modes.test.ts` | Requires a numeric interval and numeric non-target parameters; rejects missing interval/symbolic parameters. | Approximate is already mostly cleanly separated from Exact and Isolate. Its missing-parameter guidance should become more explicit and Variables-oriented. |
| Inequalities | `src/lib/equation/equation-inequality.ts`, `src/lib/equation/inequality/outcome.ts` | Only Exact mode solves guarded real inequality sets; Approx/Isolate receive guidance. | Inequality semantics are already explicit: Exact owns condition/set output. |
| Isolate mode | `src/lib/modes/equation/symbolic.ts`, `src/lib/equation/isolation/selected-target.ts` | `answerMode === 'isolate'` short-circuits into `isolateSelectedTargetEquation(...)`, which peels target-free shells and returns a formula or isolated equation. | Isolate is already a rearrangement lane. It may show formulas or isolated equations, but it is not the general exact solver route. |
| Exact selected-target route | `src/lib/modes/equation/parameterized.ts`, `src/lib/equation/isolation/selected-target.ts` | Exact route can use `solveSelectedTargetIsolationEquation(...)`, but that path succeeds only after generated-equation delegation to exact families. | Exact may use isolation internally; the differentiator should be terminal exact evidence, not whether an isolation helper appeared in the route. |
| Exact numeric fallback rejection | `src/lib/modes/equation/outcomes.ts` | Exact rejects numeric-only fallback outcomes through `exactModeNeedsExactOutcome(...)`. | The repo already has one exactness guard; expand this style with semantic tags rather than broad rewrites. |
| Root/readback substrate | `src/lib/equation/roots/representation.ts`, `src/lib/equation/roots/readback.ts` | Internal root sets can distinguish exact finite roots, factor-derived roots, numeric validated roots, implicit roots, and structured stops; compact readback maps only visible exact roots back to current surfaces. | The substrate is now strong enough to support answer semantics tags without exposing `RootOf` or changing Display/History schemas. |
| Display metadata | `src/types/calculator/display-types.ts` | `DisplayOutcome` already has `answerMode`, `answerDomain`, and `solutionKind`, but most exact/isolate Equation successes do not consistently set `solutionKind`. | `solutionKind` is the best first seam for behavior-preserving semantics tagging. |

## Current Boundary

### Approximate

Approximate means numeric/decimal solving over a one-target real equation after stored-value substitution. It can approximate exact numeric constants such as `2` or `\sqrt{2}`, but it must not preserve unresolved symbolic parameters.

Rules:

- Approximate may find decimal roots or numeric values.
- Approximate may show a decimal companion view for an Exact result, but that companion is not a replacement for the Exact classification.
- Approximate requires every non-target symbol to have a numeric value, usually through stored Variables.
- Approximate should stop on unresolved parameters with guided input requirements, not generic solver failure.
- Approximate must not silently take over because an exact expression is ugly, huge, or collapsed. Large exact expressions remain Exact/display-readback policy.

Examples:

- `x^2=2`, target `x`: Approximate may return decimal roots because the non-target input is numeric.
- `\sqrt{2}x=a`, target `x`: Approximate must stop until `a` has a numeric stored value.
- `x^2=a`, target `x`: Approximate must stop until `a` has a numeric stored value.
- `\sin(x)=b`, target `x`: Approximate must stop until `b` has a numeric stored value.

The guard should point to each missing value, for example: `Missing numeric value: a. Store a value for a in Variables, then run Approximate again.` A list such as `a, b, c are parameters` is too generic; the user needs to know which parameter values are missing and where to provide them.

### Isolate

Isolate means: rearrange one selected target through bounded, target-free algebra shells and return the isolated expression, compact formula, or isolated equation when useful.

It may include Valid When facts such as denominator exclusions or radicand conditions. Those facts come from the rearrangement and are correctness conditions for the isolated form, not proof that Isolate produced a full solved root set.

Isolate does not need to prove full root closure, branch families, principal ranges, or candidate validation before returning a useful rearranged form.

Current code already implements this via `isolateSelectedTargetEquation(...)`.

### Exact

Exact means: produce a trustworthy symbolically representable answer set, not merely a rearranged target expression and not merely a whole-number/clean-number answer.

Exact is allowed to use isolation internally. The important distinction is the final evidence. A result is Exact when the terminal producer can defend at least one of:

- explicit finite roots or root sets;
- factor-derived exact roots;
- exact-rational factor roots;
- periodic/principal branch families;
- guarded real inequality sets;
- complex-domain exact branches;
- domain/exclusion facts or candidate-validation facts that make the answer trustworthy.

Irrational radicals and symbolic-parameter formulas can be Exact when represented symbolically. For example, `x^2=2` may return `x=\pm\sqrt{2}` in Exact, and `\sqrt{2}x=a` may return `x=\frac{a}{\sqrt{2}}` in Exact with the symbolic parameter preserved. Exact must reject numeric-only decimal answers that have no exact representation behind them, not exact irrational forms.

If the solver can only rearrange the target into an unresolved isolated equation, that belongs in Isolate or structured guidance, not an Exact success. If an exact form is too large or unsafe to show fully, that should produce collapsed/structured Exact readback or a structured stop, not silent demotion to Approximate.

## Important Clarification

The scary-looking overlap is mostly naming, not broken behavior. Exact currently has helpers named `algebraic-isolation` and `selected-target-isolation`, but those helpers are route mechanics. In Exact mode, the selected-target isolation helper is used as a path to generated exact-family solving; in Isolate mode, the isolation-only helper returns rearranged formulas/equations. So the durable distinction should be based on terminal result evidence, not whether an internal route contains the word `isolation`.

## Gaps

- `solutionKind` exists but is underused for ordinary Equation successes.
- `resultOrigin: 'symbolic'` is too broad to distinguish exact root closure from isolate-formula readback.
- Detail-section titles such as `Target Isolation` and `Algebraic Isolation` are human readback, not canonical semantics.
- History stores `equationAnswerMode`, but not a durable answer-semantics tag.
- Exact success surfaces are mostly current strings (`exactLatex`, `branchReadback`, supplements) rather than a typed proof of why the answer qualifies as exact.
- Approximate unresolved-parameter guidance currently needs stronger per-parameter wording and a clearer Variables path.
- Some guided Equation screens solve through dedicated screens and are not meaningfully governed by symbolic Exact/Isolate semantics yet.

## Recommended Next Milestone

`EQUATION-ANSWER-SEMANTICS-TAGS1`

First implementation should be behavior-preserving:

- set `solutionKind: 'isolate-formula'` on Isolate-mode selected-target successes;
- set `solutionKind: 'exact-symbolic'` on existing exact symbolic successes where the terminal producer has exact evidence;
- keep inequalities on `solutionKind: 'inequality-solution-set'`;
- keep approximate numeric interval outcomes on `solutionKind: 'approximate-numeric'` where not already tagged;
- preserve Approximate as the numeric/decimal lane only, with tests for unresolved non-target parameter stops and exact symbolic parameter preservation outside Approximate;
- refine Approximate missing-parameter guidance to identify each missing numeric value and direct the user to store values in Variables;
- add a regression fixture for `\sqrt{2}x=a`: Exact should remain exact-symbolic with `a` preserved, while Approximate should require a numeric value for `a`;
- add tests proving Exact does not accept isolate-only unresolved equations as success;
- do not change visible text, Display/History schemas, OOE, app-state, Tauri, solver algorithms, caps, or answer-mode settings.

After that, a later `EQUATION-EXACT-ISOLATE-SEMANTICS1` can safely tighten copy/readback or guidance if needed.

## Non-Goals

- No source code change in this audit.
- No answer-mode rename.
- No DisplayOutcome schema change.
- No History schema change.
- No visible `RootOf` / implicit-root notation.
- No cap raise, broad factoring, Cardano/Ferrari, numeric fallback expansion, OOE, app-state, Tauri, UI, graphing, step-by-step, or source-mirror behavior change.
