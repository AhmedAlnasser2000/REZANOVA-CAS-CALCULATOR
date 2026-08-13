# CODEX-CONTROLLED-AGENT-WORKFLOW1 Verification

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

## Evidence

- `npm run test:codex-agent-workflow`: passed; 9 mutation tests plus the live validator.
- `codex exec --strict-config --ephemeral --sandbox read-only`: passed with installed Codex `0.147.0-alpha.6.5`; the ephemeral agent returned `OK`. Local rollout-index warnings were unrelated to configuration parsing.
- `npm run test:ci-gate-alignment`: passed; 12 tests and live alignment, including the dedicated job and ci-linux-scoped static command.
- `npm run test:seam-impact-selector`: passed; 22 tests.
- `npm run seam:impact -- --path .codex/config.toml --path AGENTS.md --format human`: selected only `codex-agent-workflow-governance`, the workflow ratchet, and file-size evidence.
- `npm run test:memory-protocol`: passed; 21 tests and live validation.
- `npm run test:file-sizes`: passed; 10 tests and 2,159 live files within caps.
- `git diff --check`: passed.

## Mutation Coverage

- Missing and extra roles.
- Reviewed model/reasoning drift with a distinct model-migration failure.
- Concurrency growth and sandbox widening.
- Tester write authorization and recursive spawning.
- Explicit-per-task permission, root orchestration, context packet, compact result, and stop-condition weakening.
- External-provider workflow roles, dedicated CI job removal, and seam-selection drift.

## Scope Note

- The full repository gate is intentionally not run for this governance-only milestone.
- No app-visible output changed, so Playwright visual verification is not applicable.
