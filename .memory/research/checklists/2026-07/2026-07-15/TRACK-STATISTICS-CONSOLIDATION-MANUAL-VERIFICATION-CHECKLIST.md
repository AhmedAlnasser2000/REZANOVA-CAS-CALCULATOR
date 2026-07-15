# Statistics Consolidation Manual Verification Checklist

Date: 2026-07-15

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- One PC Statistics workspace owns Data & Summary, Probability, Inference, and Relationships with one Guided/Expression mode and one canonical result authority.
- Guided forms retain incomplete drafts and focus; evaluation remains explicit; section results are remembered and marked stale after relevant edits.
- The calculator shell gives Statistics its full content width, with a stable form rail and a wider result pane. Light native controls use dark readable text.
- Plots and diagrams are intentionally absent pending a separate bounded product decision.

## Manual App Steps

1. Open Statistics at a PC viewport at least 1280 by 800 and visit all four section tabs.
   - Expected: four equal tabs remain stable, the form stays in the left rail, and the result area fills the remaining shell width without a dead right gutter.
2. In Data & Summary, type a trailing comma, switch List/Frequency table without converting, then explicitly convert and evaluate Summary.
   - Expected: the draft remains editable, conversion never silently overwrites newer data, and the result shows quartiles, fences, mode, and both spread contexts.
3. Open every light select in Data & Summary, Probability, and Inference.
   - Expected: selected values and menu options use dark text on a light surface in idle, hover, and focus states.
4. Run one Binomial interval, one one-sided mean test, and both Regression and Correlation over the shared paired rows.
   - Expected: each section displays its own real result, changing one field does not steal focus, and returning to a section restores its remembered result or stale badge.
5. Switch to Expression, type a supported request, evaluate, switch sections, then return to Guided.
   - Expected: the existing editor and result authority fill the Statistics workspace, the draft is not rewritten while typing, and a valid expression imports to its owning Guided section without auto-running.
6. Use Clear, History replay, Stop, and a workspace-tab switch.
   - Expected: Clear affects only the active Statistics section, replay restores the legacy target, cancellation commits no stale result, and workspace state survives tab restoration.

## Expected Results

- No app-level horizontal overflow or clipped primary controls appears at supported PC widths.
- Mathematical output remains canonical and readable; no duplicate result renderer or second Statistics runtime exists.
- Mobile behavior is not part of this acceptance checklist.
- Completing this checklist permits discussion of bounded Statistics plotting and diagrams; it does not authorize their implementation or a push.
