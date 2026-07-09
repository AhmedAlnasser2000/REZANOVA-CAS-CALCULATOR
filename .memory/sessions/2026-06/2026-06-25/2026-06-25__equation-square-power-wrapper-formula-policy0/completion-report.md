# EQUATION-SQUARE-POWER-WRAPPER-FORMULA-POLICY0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- Gate label: backend
- Scope: audit/readiness policy for future Real square-power wrapper formula handoff.

## Summary

Audited whether one-layer Real square-power wrappers are ready to consume generated Cardano/Ferrari formula payloads after the square-root and absolute-value wrapper formula milestones.

## Findings

- Real `F(t)^2=b` is a suitable next wrapper candidate because it has a clear two-branch split under the global fact `b>=0`.
- Exact `b=0` should collapse to one generated branch `F(t)=0`; exact `b<0` should stop as real-domain empty before formula delegation.
- The first live milestone should stay square-only (`power = 2`) rather than silently widening to higher even powers or odd powers.
- The grouped generated formula readback added for absolute-value wrappers is the right display substrate for square-power branch groups.
- The live route still needs square-power-specific wrapper validation evidence and exact-zero generated-branch readback polish before it can go live.
- Complex square-power wrappers remain deferred because they need a separate complex branch/back-substitution policy.

## Decision

Proceed toward `EQUATION-SQUARE-POWER-WRAPPER-FORMULA1` as a Real Exact, one-layer, square-only live milestone that reuses grouped formula readback and bundles the small exact-zero generated-branch readback polish.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/research/audits/equation-square-power-wrapper-formula-policy0-2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-square-power-wrapper-formula-policy0/`

## Commit Status

Planned as a docs-only commit before any readback-polish code edits. The user asked to leave the readback polish uncommitted for the later live milestone.

## Next Discussion Focus

Plan `EQUATION-SQUARE-POWER-WRAPPER-FORMULA1` around Real Exact square-only branch generation, validation evidence, grouped formula output, exact-zero readback polish, and unsupported boundaries for Complex/higher-power/nested wrappers.
