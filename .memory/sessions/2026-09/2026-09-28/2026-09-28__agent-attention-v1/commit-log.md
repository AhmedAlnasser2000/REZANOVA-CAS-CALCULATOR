# AGENT-ATTENTION-V1 commit posture

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- committed_by_agent: claude
- committed_by_agent_model: claude-opus-5-5
- committed_by_agent_family: opus-5.5
- attribution_basis: live

## 2026-09-28 commit checkpoint

- Branch `rezanova-agent-attention` (user-requested; not main). The user approved the plan and had already asked that this work live on this branch.
- Commit subject: `AGENT-ATTENTION-V1: notify only when an agent genuinely needs the user`.
- Resolve with `git log -1 --format=%H -- .memory/sessions/2026-09/2026-09-28/2026-09-28__agent-attention-v1/commit-log.md`.
- Follow-up (same day): the user asked to merge to `main` so testing happens where the work happens. Setup docs were updated for main, then `main` was fast-forwarded to this branch and pushed with the user's explicit approval.
- Pre-commit checks: agent-attention tests, codex-agent-workflow validator, memory protocol, file sizes, diff check.
