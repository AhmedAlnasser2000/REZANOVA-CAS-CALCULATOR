# TRACK-EQUATION-NUMERIC-INTERVAL-AND-ANSWER-SEMANTICS Manual Verification Checklist

Date: 2026-06-21

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Equation active answer modes are `Exact` and `Isolate` only.
- The old `Approx` answer-mode control is removed from active Settings and Equation workspace controls.
- Numeric Interval Solve is a contextual numeric route/tool, not a restored third answer mode.
- Numeric Interval Solve is hidden for ordinary symbolic input unless an exact stop suggests numeric solving, exact output offers interval suggestions, or the panel is already open.
- When the Numeric Interval panel is open, header `Run`, F1, and EXE launch numeric interval solving; hiding the panel returns those controls to symbolic Exact/Isolate solving.
- The Numeric Interval panel is configuration-only for Start, End, and Subdivisions; the old panel-local run button is gone.
- Suggested intervals are click-to-fill only and do not auto-run.
- Numeric interval results show accepted approximate roots as the visible answer/readback and Copy Result payload.
- Numeric interval diagnostics explain local search, candidate validation, adaptive sampling, rejected candidates, discontinuity-like cells, and the no-all-roots guarantee.

## Manual App Steps

1. Open Equation and confirm the answer-mode control shows `Exact` and `Isolate`, with no `Approx` option.
2. Enter a normal symbolic equation such as `x^2-5x+6=0` and solve in Exact.
3. Confirm Numeric Interval Solve is not shown by default for that ordinary supported symbolic solve.
4. Enter a periodic/nested case that reports suggested intervals, such as `sin(tan(ln(x)+1))=1`.
5. Open Numeric Solve from the suggested/exact-stop area and click a suggested interval.
6. Confirm Start and End update while Subdivisions stay unchanged and no computation starts until Run/F1/EXE.
7. With the numeric panel open, press header Run or F1 and confirm numeric interval solving runs.
8. Hide the numeric panel, press Run again, and confirm symbolic Exact/Isolate solving runs instead.
9. Try a dense/nested periodic interval and confirm accepted roots appear in the answer area and Copy Result copies the roots, not an empty symbolic payload.
10. Try an interval around a discontinuity/domain hole and confirm false roots are rejected with explanatory guidance.

## Expected Results

- Exact symbolic results remain exact and do not become numeric because the numeric panel is closed.
- Isolate results remain rearrangement/formula output and do not promise exact closure.
- Numeric interval runs are clearly marked as local real-root searches with candidate validation.
- Accepted numeric roots are visible in the answer card and copyable.
- No UI path restores `Approx` as an ordinary Equation answer mode.
- Dense periodic cases may still miss roots, but guidance should say this honestly and suggest narrower/suggested intervals or more subdivisions.
