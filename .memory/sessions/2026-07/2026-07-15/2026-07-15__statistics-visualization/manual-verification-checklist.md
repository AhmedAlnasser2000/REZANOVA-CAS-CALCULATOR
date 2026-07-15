# Statistics Results And Visualization Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- Statistics has one PC-width workspace with four internal sections, shared data where required, Guided and Expression input modes, explicit evaluation, per-section result memory, and canonical student-facing results.
- Answer formulas are vertical labeled rows with Contained and Full presentation modes.
- Data and Summary plus Probability results render evaluation-bound ECharts SVG visuals in the lower dock.

## Manual App Steps

1. Open Data, then Statistics, and keep the window at least 1280 by 800.
2. Evaluate the default Data and Summary request.
3. Confirm the Answer group contains separate labeled rows such as Size and total, Center, and Five-number summary.
4. Select Full result and confirm all groups open and the result grows vertically without a page-level horizontal scrollbar.
5. Return to Contained and confirm only the result area scrolls vertically.
6. Evaluate `1, 2, 3, 4, 100` with Type-7 quartiles, switch Histogram to Box plot, and confirm `100` appears as a separate outlier.
7. In Probability, evaluate Binomial `P(X >= 7)` for `n=10`, `p=0.5`; confirm bars 7 through 10 use the selected-event treatment.
8. Switch to Normal and compare Exactly `0` with Density at `0`; both show a marker, while Exactly keeps zero shaded probability area.

## Expected Results

- Copy and History still use the original exact Statistics answer.
- Labels remain aligned above their math rows and no ordinary row is clipped horizontally.
- Full result removes the cap; Contained keeps a stable workspace height.
- Histogram bin changes redraw locally and do not create History entries or replace the result.
- The Statistics keypad is available only through the temporary Expression dock swap.
