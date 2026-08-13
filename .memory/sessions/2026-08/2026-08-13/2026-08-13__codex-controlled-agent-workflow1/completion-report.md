# CODEX-CONTROLLED-AGENT-WORKFLOW1

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

## Gate

- Type: backend governance.
- Status: implemented; selective commit approved by the user and pending final verification.

## Completed Scope

- Added a project-scoped Codex configuration with five capability-based roles, a three-subagent ceiling, one writable Implementer, read-only Explorer/CAS Researcher/Tester/Reviewer roles, and child recursion disabled.
- Kept `DIRECT` root-only work as the default; `CONTROLLED` and `CRITICAL` require explicit permission for each current task.
- Added a versioned model-assignment baseline and a validator that distinguishes model drift from permission or workflow weakening.
- Added package, seam-impact, CI-alignment, Linux CI/release, dedicated GitHub job, and CODEOWNER enforcement.
- Recorded the deferred OOE resource-breaker boundary and the live Table fallback concern without changing runtime code.

## Preserved Boundaries

- No calculator runtime, solver, worker, public schema, computational cap, or existing CI-repair behavior changed.
- No subagents were used to implement this gate because this task did not grant per-task delegation permission.
- Branch-protection activation remains blocked until the workflow exists remotely and receives separate push and GitHub-setting approval.
- No push is authorized.
