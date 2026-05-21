# CALC-AUDIT0 Status And Reuse Audit

Date: 2026-04-24

Status: complete audit gate; no new math capability was added.

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`CALC-AUDIT0` reviewed the current basic `Calculus` and `Advanced Calc` surfaces before any new calculus-composition work. Existing focused calculus unit coverage is green, and the audit adds a browser smoke suite for representative guided workflows.

The audit confirms that calculus should proceed with `CALC-CORE1` before `CALC-COMP1`. The current code has two similar calculus evaluation stacks:

- basic `Calculate > Calculus` uses `src/lib/calculus-eval.ts`
- `Advanced Calc` uses `src/lib/advanced-calc/*`

Both already reuse some shared symbolic helpers, but finite-limit sampling, integral result handling, warnings, and result-origin plumbing still drift enough that a narrow shared calculus evaluation boundary should come before new antiderivative breadth.

## Status Table

| Surface | Current status | Test coverage | Result origin behavior | Known gaps | Reused cores | Duplication | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Basic derivative | Shipped and symbolic for one-variable `x` requests. | `calculus-workbench.test.ts`; browser smoke added. | `symbolic-engine` from `differentiateAst`. | Readback can be algebraically raw for composed expressions. | `symbolic-engine/differentiation`. | Basic stack owns result wrapping separately from Advanced Calc. | Keep behavior; revisit readback in `CALC-COMP2`. |
| Basic derivative at point | Shipped with symbolic derivative first and numeric fallback. | `calculus-workbench.test.ts`. | `symbolic-engine` when substitution succeeds; `numeric-fallback` otherwise. | Numeric fallback and warning policy is local to basic stack. | `symbolic-engine/differentiation`; numeric sampling in `calculus-eval`. | Numeric derivative fallback is basic-only. | Keep; document in `CALC-CORE1` as shared result-origin candidate only if Advanced Calc gains point derivatives later. |
| Basic indefinite integral | Shipped symbolic-only with app-owned rule fallback. | `calculus-workbench.test.ts`; `symbolic-engine/integration.test.ts`; browser smoke added. | `compute-engine` if CE resolves; otherwise `rule-based-symbolic`; error when unsupported. | User-facing stop wording differs from Advanced Calc. | `symbolic-engine/integration`; `antiderivative-rules`. | Result wrapping and unsupported wording differ from Advanced Calc integrals. | Consolidate wording/result origin in `CALC-CORE1`, then broaden in `CALC-COMP1`. |
| Basic definite integral | Shipped with symbolic-first and numeric fallback for finite numeric bounds. | `calculus-workbench.test.ts`. | `compute-engine` when CE resolves; `numeric-fallback` otherwise. | Endpoint/domain trust is limited; fallback warning is basic-local. | `adaptive-simpson`; `result-guard` indirectly through display guard. | Numeric definite handling duplicates Advanced Calc concepts. | Keep; defer trust work to `CALC-INT1` after shared boundary. |
| Basic finite limit | Shipped with symbolic finite-limit rules and numeric fallback. | `symbolic-engine/limits.test.ts`; `limit-heuristics.test.ts`; browser smoke added. | `rule-based-symbolic`, `heuristic-symbolic`, or `numeric-fallback`. | Sampling constants differ from Advanced Calc; warnings are duplicated. | `symbolic-engine/limits`; local numeric sampling. | Duplicates Advanced Calc finite-limit algorithm shape. | Consolidate shared limit helper in `CALC-CORE1`. |
| Basic infinite/directional limits | Shipped for finite directions and infinity targets. | `calculus-workbench.test.ts`; `limit-heuristics.test.ts`. | `rule-based-symbolic` or `numeric-fallback`; explicit unbounded errors. | Infinite target UI is basic but narrower than Advanced Calc menu taxonomy. | `limit-heuristics`; numeric sampling in `calculus-eval`. | Duplicates Advanced Calc limit handling. | Use `CALC-CORE1` to align result handling before `CALC-LIM1`. |
| Advanced indefinite integrals | Shipped with stronger rule, substitution, inverse-trig, and by-parts families. | `advanced-calc/integrals.test.ts`; `symbolic-engine/integration.test.ts`; browser smoke added with one provenance `test.fixme`. | `symbolic`, `rule-based-symbolic`, or controlled error, depending on whether Compute Engine resolves before app-owned rules. | No broad Risch/Liouville; unsupported families stop; `1/(1+x^2)` succeeds but currently displays generic `Symbolic` provenance instead of the planned `Rule-based symbolic` badge. | `symbolic-engine/integration`; `antiderivative-rules`. | Some behavior overlaps basic integral evaluation; CE-first vs rule-first ordering affects provenance. | Use as primary base for `CALC-COMP1` after `CALC-CORE1`; align provenance in the shared boundary first. |
| Advanced definite integrals | Shipped finite numeric fallback. | `advanced-calc/integrals.test.ts`. | `symbolic`, `rule-based-symbolic`, or `numeric-fallback`. | Endpoint/domain trust is intentionally light. | `adaptive-simpson`; symbolic integral rules. | Duplicates basic definite fallback concepts. | Defer exact endpoint trust to `CALC-INT1`. |
| Advanced improper integrals | Shipped for selected convergent numeric cases. | `advanced-calc/integrals.test.ts`. | Numeric approximation with controlled divergence errors. | Limited convergence proof; no broad discontinuity analysis. | `adaptive-simpson`; result guard. | Mostly Advanced Calc-only. | Keep; audit result wording again in `CALC-INT1`. |
| Advanced finite limits | Shipped with removable singularity, capped L'Hopital-style heuristic, directional mismatch, and unbounded errors. | `advanced-calc/limits.test.ts`; browser smoke added. | `symbolic`, `heuristic-symbolic`, or `numeric-fallback`. | Sampling/warning logic drifts from basic `calculus-eval`. | `symbolic-engine/limits`; local numeric sampling. | Duplicates basic finite-limit helper shape. | Consolidate in `CALC-CORE1`, then broaden in `CALC-LIM1`. |
| Advanced infinite limits | Shipped for rational same/lower degree, numeric infinity fallback, and unbounded errors. | `advanced-calc/limits.test.ts`; `limit-heuristics.test.ts`. | `rule-based-symbolic` or `numeric-fallback`; unbounded errors. | Limited asymptotic reasoning by design. | `limit-heuristics`. | Similar to basic infinity path. | Align warning/result-origin in `CALC-CORE1`. |
| Maclaurin/Taylor series | Shipped for selected polynomial/trig/exp/log families up to bounded order. | `advanced-calc/series.test.ts`; browser smoke added. | Symbolic/rule-style exact series output. | No broad series algebra or arbitrary function expansion. | `advanced-calc/series`; Compute Engine parse/eval. | Advanced Calc-only. | Keep out of first capability slice; revisit as later `CALC-SER1`. |
| Partial derivatives | Shipped first-order `x/y/z` partials. | `advanced-calc/partials.test.ts`; `symbolic-engine/partials.test.ts`; browser smoke added. | Symbolic output or controlled error. | No higher-order partials; no mixed partial workflows. | `symbolic-engine/partials`. | Advanced Calc-only. | Keep stable; later polish can follow single-variable calculus. |
| First-order ODE | Shipped guided separable/linear/exact-class workflows with bounded templates. | `advanced-calc/ode.test.ts`; browser smoke added. | Symbolic/template output or controlled error. | Classification is user-guided; not a general ODE classifier. | `advanced-calc/ode`. | Advanced Calc-only. | Keep; later `CALC-ODE1` after core calculus work. |
| Second-order ODE | Shipped constant-coefficient homogeneous cases. | `advanced-calc/ode.test.ts`. | Symbolic/template output or controlled error. | Narrow homogeneous/constant-coefficient scope. | `advanced-calc/ode`. | Advanced Calc-only. | Keep; later `CALC-ODE1`. |
| Numeric IVP | Shipped numeric IVP path through the Tauri-backed solver. | Rust-side ODE checks and browser smoke added for UI route. | Numeric result from async Advanced Calc runner. | Browser smoke covers default path only; deeper method parity is later work. | Tauri command path; `advanced-calc/ode`. | Advanced Calc-only. | Keep; later harden in `CALC-ODE1` if needed. |

## Findings

- The existing focused calculus unit baseline passes and covers 41 tests across 13 files.
- Browser automation previously had no dedicated calculus smoke; `CALC-AUDIT0` adds one focused Playwright spec.
- `CALC-CORE1` should come before `CALC-COMP1` because limits and integrals have duplicated result wrapping, warnings, and numeric fallback policy across basic and Advanced Calc stacks.
- `CALC-COMP1` remains the right first capability milestone after `CALC-CORE1`: the strongest value is bounded substitution antiderivatives over already-supported carriers.
- Series, partials, ODE, and numeric IVP are healthy enough to remain later candidates rather than immediate blockers.
- One browser `test.fixme` records a visible provenance mismatch: Advanced Calc indefinite integral of `1/(1+x^2)` returns `arctan` successfully, but the UI currently shows `Symbolic` because Compute Engine resolves before app-owned rules can stamp `Rule-based symbolic`.
- While authoring the smoke, using Playwright `fill('0')` on the already-default finite target appended `0` to the active MathLive body in the basic Limit flow. The final smoke leaves default-zero targets untouched; any non-default target typing/routing check should be handled as a separate UI reliability task.

## Verification

- Focused calculus unit baseline:
  - `npm run test:unit -- src/lib/calculus-workbench.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/series.test.ts src/lib/advanced-calc/partials.test.ts src/lib/advanced-calc/ode.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/advanced-calc/ui.test.ts src/lib/antiderivative-rules.test.ts src/lib/limit-heuristics.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/symbolic-engine/partials.test.ts`
  - Result: pass, 13 files and 41 tests.
- Browser smoke:
  - `npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium`
  - Result: pass, 4 passed and 1 skipped `test.fixme` for the provenance mismatch.
- Lint:
  - `npx eslint e2e/helpers.ts e2e/calc-audit0-smoke.spec.ts`
  - Result: pass.
- Memory:
  - `npm run test:memory-protocol`
  - Result: pass.
