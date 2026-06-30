# EQUATION-NUMERIC-SEARCH-UX-DISCIPLINE1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Nonlinear numeric fallback should no longer search every configured auto-window when a wider pass confirms no new roots or unique extraneous values.
- Periodic numeric fallback without an interval should guide the user and surface the existing Numeric Interval Solve panel.
- Numeric details should show hard facts, probe evidence, search diagnostics, validation, and extraneous values in separate cards with capped diagnostic density.

## Manual App Steps

- In Equation, Real, Exact, run `x^2+\sin(x)=2`; check that roots appear near `-1.728466` and `1.06155` and that search diagnostics list only the searched windows needed before stability.
- Run `\ln(x-1)+1/(x-2)=3`; check that roots appear near `2.372685` and `20.00011`, `Domain and Exclusions` shows hard facts, `Domain Probe` shows fixed sample evidence/regions, and `Extraneous Solutions` lists `x≈2` with repeat count.
- Run an unsupported periodic fixture such as `\sin(x!)=0`; check that the guidance result appears and the existing Numeric Interval Solve panel is visible without auto-running.
- Toggle Detailed Facts in Settings; check diagnostic cards show more representative lines but still cap overflow instead of dumping every sample.

## Expected Results

- Normal Solve/Run remains the only execution entry.
- Periodic guidance panel visibility can be dismissed and re-opened through the existing numeric panel controls.
- Copy Result and Formula Viewer contracts are unchanged.
