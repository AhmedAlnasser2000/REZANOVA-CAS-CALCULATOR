## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Real Equation numeric route order is locked and regression-tested.
- Periodic/dense cases no longer have a path back to huge fixed-window numeric enumeration when exact periodic readback or interval guidance is appropriate.
- Numeric fallback guidance now distinguishes approximate real-root output from exact symbolic output and interval-local numeric solving.

## Manual App Steps

- Enter `x+5=8` in Equation Exact mode and run.
- Enter `x^7-x=5` and run.
- Enter `sin(x! )=0` or the equivalent MathLive sine/factorial form and run.
- Enter `sin(x)/x=0` and run in Exact mode.
- Enter `x^2+sin(x)=2` and run.
- Enable Numeric Interval, set `[0,10]`, enter `tan(x)=1`, and run.

## Expected Results

- `x+5=8` returns exact symbolic `x=3`, not numeric fallback.
- `x^7-x=5` returns validated approximate real roots with deterministic polynomial method details, not nonlinear search or Cardano/Ferrari cases.
- Unsupported periodic-only inputs ask for a finite real interval and do not show searched fixed windows.
- `sin(x)/x=0` returns the exact periodic family with the denominator exclusion, not thousands of numeric roots.
- `x^2+sin(x)=2` uses bounded nonlinear auto-search with searched-window evidence.
- `tan(x)=1` interval solving reports roots local to `[0,10]` and carries trig-pole evidence.
