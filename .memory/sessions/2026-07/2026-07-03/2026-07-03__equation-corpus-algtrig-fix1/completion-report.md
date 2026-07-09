# EQUATION-CORPUS-ALGTRIG-FIX1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`EQUATION-CORPUS-ALGTRIG-FIX1` fixes the six findings recorded by the first OpenStax Algebra/Trig Equation corpus scan.

What changed:

- Added focused Equation corpus regression coverage for the six scan obligations plus the `\exponentialE^x=5` and `\tan(x)=1` variants.
- Routed narrow selected-target exact cases through a small `symbolic-parameterized-exact` helper instead of growing the main symbolic orchestrator.
- Widened factorable-polynomial exact handling so `x^5-x=0` returns exact roots `{-1,0,1}`.
- Preserved cancelled rational-zero denominator facts from the original Equation-mode input so `\frac{x^2-4}{x+2}=0` returns `x=2` with `x+2\ne0`.
- Solved direct natural exponential inverse cases such as `e^x=5` and `\exponentialE^x=5` as `x=\ln(5)`.
- Returned periodic families for `2\cos^2(x)-1=0` through the selected-target trig rewrite path.
- Simplified common radian special-angle trig readback such as `\sin(x)=\frac{1}{2}`, `2\sin(x)-1=0`, and `\tan(x)=1`.
- Appended `run_id: 2026-07-03-openstax-algtrig-fix1` for the fixed cases and marked the six scan findings with resolution metadata while preserving the original scan run rows.

Boundaries preserved:

- No duplicate benchmark sightings were converted into runnable cases.
- The original failed scan evidence remains in `run-results.jsonl`.
- Shared symbolic helper behavior with symbolic parameters keeps the existing equality-style periodic form.
- The main `symbolic.ts` file was kept below its file-size cap by moving the new exact selected-target routes into a compact helper module.
- Unrelated active memory cleanup and integration work from other agents was left untouched.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-03.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-fix1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-fix1/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-fix1/commit-log.md`
