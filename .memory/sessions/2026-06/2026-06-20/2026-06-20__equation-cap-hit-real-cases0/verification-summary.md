# EQUATION-CAP-HIT-REAL-CASES0 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scratch Probe

- `npx vite-node .task_tmp/equation-cap-hit-real-cases0/probe.ts` - passed

## Probe Findings

- The valid deep affine/quotient selected-target shell around `\sin(z)` solved under current defaults.
- Raising scratch `maxPeels` to 12 did not reveal a different success class for that probe.
- Existing real/default fixtures still stop on algorithm/readback/semantic boundaries such as `target-power`, `cleared-degree-limit`, `degree-limit`, `unsupported-power-degree`, `formula-size-limit`, `branch-limit`, and `nested-composition`.

## Verification Commands

- `npm run test:memory-protocol` - passed
- `git diff --check` - passed
