# POLY-RAD4 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Date: `2026-04-09`
- Scope: shared algebra trust/correctness polish across Equation and existing Calculate algebra outputs

## Landed
- Added a small internal supplement model in `src/types/calculator/exact-supplement-types.ts`.
- Added `src/lib/exact-supplements.ts` for shared supplement parsing, deduping, classification, and rendering.
- Added `src/lib/equation/candidate-rejection.ts` for small structured rejection classification.
- Rewired Calculate and Equation algebra output assembly to use the shared supplement path.
- Preserved `DisplayOutcome.exactSupplementLatex` as the visible output surface.

## Visible Effect
- Supplement lines now group more cleanly:
  - informational notes first
  - merged `Exclusions:` next
  - merged `Conditions:` last
- All-rejected candidate wording is now driven by a small shared taxonomy instead of scattered message heuristics.

## Verification
- `npm run test:gate`
