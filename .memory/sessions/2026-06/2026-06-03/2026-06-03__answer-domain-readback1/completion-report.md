# ANSWER-DOMAIN-READBACK1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented `ANSWER-DOMAIN-READBACK1` as focused history/readback polish after bounded complex and inequality adoption.

The main fix is persisted History stability: reopening the app with many saved records now shows readable compact cards instead of thin overlapping rows. The milestone also cleans domain/solution chips, inequality prose readback, and simple bounded complex branch display.

## User-Facing Behavior

- Restored History entries stay compact and readable even with many records.
- Collapsed History cards show the original input preview only, plus mode/replay/delete/expand controls.
- Expanded History cards show answer, approximation, domain/solution labels, and validity facts in contained scroll areas.
- Equation complex results show `Domain: Complex` without a duplicate `Domain intent: Complex` chip.
- Ordered inequalities under `Complex On` still show `Domain intent: Complex`, `Solution: Inequality set`, and the real-order note.
- Inequality detail readback keeps operators readable as `<=`, `>=`, and `!=`.
- Bounded complex power branches are cleaner for simple cube/fourth-power routes.

## Internal Changes

- Updated History CSS so the list owns vertical scrolling and entries are flex non-shrinking cards.
- Added HistoryPanel and AppMain UI regressions for many persisted entries, collapsed/expanded behavior, delete, and domain chips.
- Fixed notation readback normalization for ASCII comparison operators.
- Suppressed duplicate complex-domain intent labels when an actual result already carries `answerDomain: complex`.
- Improved simple bounded complex power-branch readback in the algebraic isolation helper.

## Boundaries Preserved

- No new solver family.
- No broad inequality solver.
- No broad complex polynomial route.
- No complex parser.
- No stored complex values.
- No stored-value policy change.
- No OOE runtime behavior change.
- No non-Equation inequality/complex adoption.
- No history schema change.

## Next

The inequality/complex lane can either continue with the next bounded Equation capability or pause for more result/history polish if manual app testing finds more persisted-readback rough edges.
