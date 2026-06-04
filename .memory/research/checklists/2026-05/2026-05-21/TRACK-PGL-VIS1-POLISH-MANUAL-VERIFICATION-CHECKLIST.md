# TRACK-PGL-VIS1-POLISH Manual Verification Checklist

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now
- `PGL-VIS1-POLISH` gives Labs mode a live top-display preview instead of an empty or stale normal calculator display.
- The Labs panel remains the control surface for runner selection, input kind, corpus case, custom input, and execution.
- The top display mirrors Labs runner/input/result state and keeps experimental/developer-only framing visible.
- Comparison rows render math through `MathStatic`; raw LaTeX stays in raw/details/accessibility surfaces rather than the primary visible table.
- Normal calculator history and stable result provenance remain unchanged.

## Manual App Steps
- Launch with `VITE_SHOW_LABS=1 VITE_ENABLE_LAB_RUNNERS=1 npm run tauri:dev`.
- Open `Labs`.
- Select `Symbolic Search Planner Ordering`.
- Choose a corpus case and confirm the top display renders the selected input.
- Run the experiment and confirm the top display shows the latest run summary.
- Confirm the comparison table shows rendered math, not raw `\frac`/`\left` strings.
- Switch away from Labs after producing a normal Calculate/Table result, then return to Labs and confirm the top display does not show the stale normal result.

## Expected Outcomes
- Labs is still hidden unless `VITE_SHOW_LABS=1`.
- Labs runner controls are still hidden unless `VITE_ENABLE_LAB_RUNNERS=1`.
- Labs output is visibly marked developer-only/experimental.
- Labs runs are not added to normal calculator history.
- Stable app code does not import or execute `playground/` code at runtime.

## Verification
- Passed: `npm run test:ui -- src/components/LabsPanel.ui.test.tsx src/AppMain.ui.test.tsx`
- Passed: `npm run test:labs-catalog`
- Passed: `npm run test:playground`
- Passed: `npm run test:memory-protocol`
- Passed: `npm run lint`
- Passed: `npm run build`

## Notes
- This is UX/readback polish only.
- No product math behavior, result origins, release behavior, remote execution, source-mirror execution, or normal-user experimental mode changed.
- No commit has been made yet; commit remains pending explicit user approval.
