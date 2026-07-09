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

- Equation symbolic surfaces show compact `Enable Numeric Interval`.
- Enabling the panel makes Run/F1/EXE use Numeric Interval Solve.
- Disabling the panel returns Run/F1/EXE to normal exact/numeric fallback routing.
- Parameterized interval runs use stored non-target values and protect the selected target.
- Answer cards and Formula Viewer blocks can collapse and expand.

## Manual App Steps

- Enter `x^2+\sin(x)=2`; confirm `Enable Numeric Interval` is visible but normal Run still uses the non-periodic numeric fallback.
- Enable Numeric Interval, set a finite interval, and run again; confirm the result is local to that interval.
- Enter `\sqrt{x+c}-t=v^2` with target `x` and no stored values; enable Numeric Interval and run; confirm missing `c`, `t`, and `v` are reported.
- Store `c`, `t`, and `v`; rerun interval solve and confirm `x` is protected and the effective equation uses stored values.
- Open a formula-heavy answer in Formula Viewer; collapse and reopen Answer and detail blocks.

## Expected Results

- No extra solve button appears.
- Numeric Interval Solve never substitutes the selected target.
- Missing non-target parameters stop with clear guidance.
- Copy Result and History behavior are unchanged.
