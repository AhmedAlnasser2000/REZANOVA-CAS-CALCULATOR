# EQUATION-CAP-HIT-EVIDENCE1

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

## Scope

- Test-backed evidence only.
- No cap constants changed.
- No production APIs, UI, OOE diagnostics, History, app-state, Tauri, Display, graphing, step-by-step, Rust, Exact/Isolate, or solver-capability changes.

## Evidence Matrix

| Cap family | Code anchor | Fixture | Observed stop/evidence | Classification | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Selected-target peel depth | `src/lib/equation/isolation/selected-target.ts` | configured `maxPeels=0` sentinel | `isolation-depth-limit` plus trace final-stop | recalibration-candidate | Collect real default-depth hits before raising `DEFAULT_MAX_PEELS`. |
| Selected-target compact formula length | `src/lib/equation/isolation/selected-target.ts` | configured `compactTargetMaxLatexLength=1` sentinel | fallback to isolated equation | readback-boundary | Treat as display/readback safety, not solver power. |
| Symbolic polynomial degree | `src/lib/equation/parameterized/symbolic-polynomial.ts` and `polynomial.ts` | degree-3 symbolic target polynomial | seam `degree-limit`; solver `target-power` | algorithm-boundary | Wait for higher-degree algorithms or factoring. |
| Rational cleared degree | `src/lib/equation/parameterized/rational.ts` | three target denominators | `cleared-degree-limit` | algorithm-boundary | Wait for higher-degree closure after LCD clearing. |
| Factorable polynomial degree | `src/lib/equation/parameterized/factorable-polynomial.ts` | five explicit linear factors | `degree-limit` | algorithm-boundary | Revisit with factoring/readback expansion. |
| Algebraic power degree | `src/lib/equation/isolation/algebraic-power.ts` | selected-target fifth power | `unsupported-power-degree` | algorithm-boundary | Do not raise without new algebraic-power semantics. |
| Formula-size/readback | `src/lib/equation/isolation/algebraic.ts` | general symbolic cubic | `formula-size-limit` | readback-boundary | Keep as truth/readability protection. |
| Mixed carrier count | `src/lib/equation/parameterized/mixed-algebraic.ts` | three independent square-root carriers | `branch-limit` | semantic-boundary | Requires mixed-carrier capability work. |
| Mixed generated branch count | `src/lib/equation/parameterized/mixed-algebraic-branches.ts` | source guard; earlier carrier-count cap usually stops first | `MAX_GENERATED_BRANCHES` static guard | static-guard | Do not expose internals just to force a test-only branch-count hit. |
| Composition depth | `src/lib/equation/composition/core.ts` | three selected-target composition layers | `nested-composition` | semantic-boundary | Requires composition capability work. |
| Composition generated branch count | `src/lib/equation/composition/core.ts` | configured `maxGeneratedBranches=1` sentinel | `branch-limit` | recalibration-candidate | Collect real default branch-count hits before raising. |
| Composition periodic parameter count | `src/lib/equation/composition/core.ts` | configured `maxPeriodicParameters=1` sentinel | `branch-limit` | semantic-boundary | Requires exact periodic-family semantics. |

## Result

`src/lib/equation/cap-hit-evidence.test.ts` covers every audited cap family without changing solver behavior. The evidence confirms the cap strategy from `EQUATION-CAP-RECALIBRATION-AUDIT0`: start with evidence and avoid blind cap expansion.

## Recommended Next Move

Prefer `EQUATION-CAP-HIT-REAL-CASES0` or a similarly narrow evidence-gathering audit before any implementation cap raise. A future implementation should only target:

- selected-target peel depth, if real equations hit the default depth cap and trace evidence shows supported generated equations just beyond it;
- generated branch count, if real branch cases remain readable and route-gated under the existing handoff seams.

Degree, formula-size, composition-depth, and periodic-parameter caps should route to algorithm/readback/semantic milestones instead.
