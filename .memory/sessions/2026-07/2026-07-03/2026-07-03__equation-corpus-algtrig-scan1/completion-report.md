# EQUATION-CORPUS-ALGTRIG-SCAN1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

`EQUATION-CORPUS-ALGTRIG-SCAN1` starts the first real Equation benchmark scan from OpenStax Algebra and Trigonometry 2e.

What changed:

- Added 50 unique runnable cases to `benchmarks/equation-corpus/ledger/unique-cases.jsonl`.
- Added 50 run results under `run_id: 2026-07-03-openstax-algtrig-scan1`.
- Kept `duplicate-cases.jsonl` empty for this pass because the first 50 selected cases were unique within the scanned set.
- Updated the Equation corpus validator unit expectation so the committed ledger test accepts the populated first corpus batch.
- Added six scan findings:
  - factorable `x^5-x=0` falls to numeric roots instead of exact roots;
  - cancelled rational hole `\frac{x^2-4}{x+2}=0` loses the `x\ne -2` exclusion in readback;
  - `e^x=5` does not produce exact `x=\ln(5)`;
  - `2\cos^2(x)-1=0` returns finite principal roots instead of periodic families;
  - two sine special-angle cases solve periodically but keep `arcsin(1/2)` instead of simplifying to `\pi/6`.

Boundaries preserved:

- No Equation solver implementation changes.
- No runtime application code changes.
- No source excerpts or copied textbook problem statements.
- The temporary runner lives in `.task_tmp/equation-corpus-scan1/` and is not a runtime dependency.
- Unrelated active memory cleanup and Calculus/integration work from other agents was left untouched.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-07/2026-07-03.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan1/verification-summary.md`
