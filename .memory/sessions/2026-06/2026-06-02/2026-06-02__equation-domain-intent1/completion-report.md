# EQUATION-DOMAIN-INTENT1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Summary

Implemented `EQUATION-DOMAIN-INTENT1` as the first product-facing complex-domain intent layer for Equation.

The app now has a persisted top-header `Complex Off` / `Complex On` toggle. The setting defaults to `real`, is sanitized in Rust desktop persistence, persists in web preview state, and is threaded through Equation symbolic runtime requests, OOE input revisions, active Equation request refs, history replay, and rich Equation OOE provenance.

## User-Facing Behavior

- Real-first behavior remains the default.
- Complex enabled does not change solver math yet.
- Equation symbolic result cards show `Domain intent: Complex` only when the Complex toggle is enabled.
- Non-Equation modes do not receive visible complex behavior.

## Boundaries Preserved

- No complex solving.
- No inequality solving.
- No complex input parser.
- No stored complex values.
- No Approximate complex search.
- No solver behavior change.
- No OOE runtime behavior change.
- No non-Equation product adoption.

## Next

`COMPLEX-EQUATION1` remains the first milestone allowed to produce bounded complex Equation answers.
