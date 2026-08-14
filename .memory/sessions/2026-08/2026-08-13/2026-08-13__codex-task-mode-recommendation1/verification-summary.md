# CODEX-TASK-MODE-RECOMMENDATION1 Verification

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: [codex (calcwiz_implementer)]
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Implementer Evidence

- Initial Implementer run of `npm run test:codex-agent-workflow`: passed 14 mutation/live tests plus the live validator.
- The first focused run exposed a duplicated-substring weakness in one new synthetic mutation. Route-specific operator-guide tokens corrected the fixture and validator; the one permitted remediation rerun passed.
- Live result remains five roles, one writable role, and a concurrency maximum of three.
- `npm run test:ci-gate-alignment`: passed; 12 tests and live validation.
- `npm run test:seam-impact-selector`: passed; 22 tests.
- `codex exec --strict-config --ephemeral --sandbox read-only "Reply with OK only."`: passed with installed Codex `0.147.0-alpha.6.5`; the ephemeral agent returned `OK`. Local rollout-index warnings were unrelated to configuration parsing.
- `npm run test:memory-protocol`: passed; 21 tests and live validation.
- `npm run test:file-sizes`: passed; 10 tests and 2,159 live files within caps.
- `git diff --check`: passed after the final evidence-only dossier update; root must repeat it against the staged Gate 1 diff.

## Mutation Coverage Added

- Missing task-mode recommendation and rationale/subagent disclosure.
- Automatic `DIRECT` continuation weakening.
- `CONTROLLED` and `CRITICAL` approval weakening.
- Continuation-exemption removal.
- Material-scope renewal removal.
- Already-selected-route handling removal.
- Route-guidance drift in the operator guide.

## Remaining Root Evidence

- Independent Tester verification passed the workflow ratchet, CI alignment, seam selector, memory protocol, file-size ratchet, and diff hygiene; role/config/model files remain byte-identical.
- Independent Reviewer found that unanchored token checks accepted a contradictory retained-token override. Under the one-remediation rule, delegated work stopped and returned to root.
- Root hardened the ratchet to require exact reviewed task-mode sections and reject route directives outside the approved sections, with retained-token contradiction and duplicated/extra-section mutation coverage.
- Reviewer follow-up found one narrower bypass inside the older route-bearing Controlled Subagent section. Root pinned that section exactly too and added the specific in-section contradiction mutation.
- Root verification after final hardening passed: `npm run test:codex-agent-workflow` (17 tests plus live validator), `npm run test:ci-gate-alignment` (12), `npm run test:seam-impact-selector` (22), strict ephemeral read-only Codex configuration (`OK`), `npm run test:memory-protocol` (21 plus live validation), `npm run test:file-sizes` (10 plus 2,159 live files), and `git diff --check`.
- Final read-only Reviewer confirmation found no blocking issue: outside-section and Controlled Subagent-section retained-token overrides both reject, the four authoritative route sections are unique and exact-pinned, and role/config/model files remain unchanged.
- Selective staging, staged diff presentation, and commit approval remain.
