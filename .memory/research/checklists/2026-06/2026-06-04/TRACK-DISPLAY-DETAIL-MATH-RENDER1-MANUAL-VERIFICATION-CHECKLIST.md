# TRACK-DISPLAY-DETAIL-MATH-RENDER1 Manual Verification Checklist

Milestone: `DISPLAY-DETAIL-MATH-RENDER1`
Date: 2026-06-04

## Scope

- [ ] Confirm result detail cards keep the existing `lines: string[]` compatibility contract.
- [ ] Confirm detail sections can opt into whole-line math rendering.
- [ ] Confirm detail sections can opt into mixed prose/math line rendering.
- [ ] Confirm unmarked prose remains readable and does not get forced through math parsing.
- [ ] Confirm no result/history schema or solver behavior changed.

## Rendering Checks

- [ ] `Expanded Branches` renders branch formulas through math-aware display.
- [ ] `Composition Branches` renders generated equations through math-aware display.
- [ ] `Generated Branches`, `Carrier Branches`, and `Factorization` render formulas as math.
- [ ] Prose cards such as `What To Try`, `Variable Policy`, and route narration remain prose.
- [ ] Mixed prose cards such as `Solve Note` and route summaries render embedded formulas as math fragments where safely recognized.

## Settings Checks

- [ ] Rendered notation mode still renders formulas visually.
- [ ] Plain-text notation mode still produces readable text.
- [ ] LaTeX notation mode still exposes canonical LaTeX instead of app prose corruption.
- [ ] Symbolic display preferences still apply to marked math lines and inline math fragments.

## Regression Checks

- [ ] Collapsible detail cards still expand/collapse normally.
- [ ] History replay still shows the same result details after reload/replay.
- [ ] Copy Result and To Editor are unaffected.
- [ ] Assumption detail filtering preserves render metadata.
