# Rational limited integration — backend handoff checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- committed_by_agent: codex
- committed_by_agent_model: gpt-6
- committed_by_agent_family: sol
- attribution_basis: live

## What is achieved now

- Complete rational coefficient families and their rational primitives, or a verified rational inconsistency certificate; both replay independently.
- This is a private lower-field prerequisite, not a new New Integration input mode or an elementary non-integrability claim.

## Manual app steps

- No app action activates this private solver. Existing New Integration behavior is unchanged.
- For a local developer check, run `npx vitest run src/lib/symbolic-engine/integration/core/rational-limited-integration.test.ts src/lib/symbolic-engine/integration/core/rational-limited-integration-wire.test.ts --maxWorkers=2`.

## Expected results

- For f=1/x+1/x² and g₁=1/x: c₁=-1, primitive -1/x+C.
- For f=1/x, g₁=1/x, g₂=2/x: all c₁+2c₂=-1, primitive C; retain the nonzero coefficient direction with zero primitive direction.
- For f=1/x and no generators: no rational solution, without claiming elementary non-integrability.
- Tampering, foreign owners and exhausted arithmetic fail distinctly; producer-disabled positive/negative artifact replay succeeds.
