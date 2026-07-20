# GRAPHING-APPEARANCE-STYLING1 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: ui
- date: 2026-07-20
- commit_hash: pending at write time

## Passing evidence

- Incremental TypeScript passes.
- Focused Graph UI passes 29/29 across page and SVG renderer.
- Focused document/session/validation tests pass 16/16.
- Production web build passes; the existing active-job-registry mixed-import warning remains informational.
- Focused Chromium Playwright passes the Move 21 piecewise/style/theme scenario at 2020x1077 with no console or page errors.
- Scoped ESLint has no errors; four existing hook cleanup/dependency warnings were reduced to two existing controller cleanup warnings.

## Visual evidence

- Browser capture: `test-results/graphing-minimum-visible-G-382cf-yle-edits-presentation-only-chromium/graphing-move21-piecewise-reference-2020x1077.png`.
- Full and focused combined comparisons: `.task_tmp/graphing-appearance-styling1/`.
- `design-qa.md` records the source, implementation, interaction, and comparison evidence with `final result: passed`.

## Final hygiene

- Memory protocol, file-size ratchet, Graph contract ratchet, and diff hygiene are required before commit.
- The protected prior `test-results/graphing-minimum-visible-G-07137--gap-endpoints-consistently-chromium/` artifact remains excluded.
- The new Playwright output is verification-only and excluded from the commit.
