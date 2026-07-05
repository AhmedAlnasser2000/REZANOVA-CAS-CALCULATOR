# CALCULUS-INTEGRATION-ONE-ANSWER-PRESENTATION1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

`CALCULUS-INTEGRATION-ONE-ANSWER-PRESENTATION1` corrects the ordinary indefinite-integration answer-card semantics introduced by the first printing-layer gate.

Gate labels: `backend` for printer output shape and unit assertions; `ui` for Playwright verification of the rendered answer card, detail cards, trust card, Copy Result, To Editor, and readability.

## Completed

- Removed additive-term splitting from the Calculus integration printer.
- Kept ordinary verified indefinite antiderivatives as one canonical visible answer expression.
- Kept `answerRows` as a one-row display-order guard so Display does not commute `+C` before fraction-heavy expressions.
- Updated presentation detail evidence to state that visible output is one antiderivative expression.
- Updated workspace and Calculate tests so root-sum, rational polynomial division, and rational Calculate outputs assert one answer row equal to the canonical antiderivative.

## Excluded

- No Equation output changes.
- No shared Display schema redesign.
- No solver capability widening.
- No casewise integration rendering changes; multi-row integration remains reserved for future true casewise/branch-family results.
- Did not stage unrelated Guide or shared-memory work.

## Remaining Risk

- Very long one-expression antiderivatives may still need a richer Formula Viewer or horizontal-readability treatment later, but they must not be presented as multiple additive answers.
