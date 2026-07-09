# CALCULUS-INTEGRATION-NEXT400-HYGIENE-PERF1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Added benchmark hygiene for the next400 scratch generator so ambiguous products are grouped and generated-only `1x`/`x^1` artifacts are removed before promotion.
- Added the `test:calculus-integration-corpus` npm script for the integration ledger validator and ledger test.
- Added a Calculus-owned indefinite-integration performance boundary before Compute Engine fallback, with a visible detail card and no partial antiderivative adoption.

## User-Facing Behavior

- Known expensive affine trig-substitution radical families without a local exact route now fail closed with `Integration Performance Boundary` instead of entering a slow synchronous fallback.
- The error card tells the user that the case was stopped before heavy symbolic fallback and that no partial antiderivative was adopted.

## Durable Memory

- Added this session dossier.
- Did not stage shared current-state, journal, or decisions files because they were already dirty from unrelated active lanes; this boundary is recorded in `verification-summary.md`.
