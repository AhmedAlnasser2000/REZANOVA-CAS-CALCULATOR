# RUBI-TIER1-INVERSE-TRIG-AFFINE-VARIANTS1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Replaced the numeric inverse-trig matcher with exact-rational affine handling for scalar numerators, affine shifts, rational square constants, and positive completed-square quadratic denominators.
- Added verifier-local reciprocal-square-root normalization so scaled arcsin variants prove exactly rather than falling back to numeric confidence.
- Kept arcsec-style reciprocal-root forms outside Tier I because the safe real derivative requires branch/domain facts that are not present yet.

## Files Updated

- `src/lib/symbolic-engine/integration/rules.ts`
- `src/lib/symbolic-engine/integration/classifier.ts`
- `src/lib/calculus/engine/verification.ts`
- `src/lib/symbolic-engine/integration/rational.ts`
- focused symbolic integration tests
- Rubi durable memory and session dossier
