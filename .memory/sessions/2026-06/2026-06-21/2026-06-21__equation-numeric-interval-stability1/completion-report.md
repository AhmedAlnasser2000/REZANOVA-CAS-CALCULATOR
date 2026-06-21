# EQUATION-NUMERIC-INTERVAL-STABILITY1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- Numeric Interval Solve sampler stability only.
- No all-roots guarantee, open-ended recursion, Approx answer-mode restoration, schema change, OOE authority change, or Display/History persistence change.

## Completed

- Added bounded adaptive refinement after the base interval grid.
- Refined sign-change, near-zero, local-minimum, steep-jump, discontinuity-like, and trig/log dense-periodic cells under a fixed extra-sample cap.
- Preserved final original-equation candidate validation as the acceptance authority.
- Added diagnostics for adaptive samples, refined cells, and discontinuity-like cells.
- Added tests for endpoint equivalence, shifted local windows, dense nested periodic recovery, and discontinuity-domain-hole handling.
- Amended the milestone after QA found accepted numeric roots could be hidden when symbolic output style was Exact.
- Numeric interval successes now surface approximate roots as the primary visible answer/readback through Display branch/text blocks without writing fake `exactLatex`.
- Copy Result now copies numeric-route roots when no exact result exists, even under Exact output style.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-06/2026-06-21.md`
- `.memory/research/roadmaps/equation-substrate-roadmap.md`
- `.memory/sessions/2026-06/2026-06-21/2026-06-21__equation-numeric-interval-stability1/`
