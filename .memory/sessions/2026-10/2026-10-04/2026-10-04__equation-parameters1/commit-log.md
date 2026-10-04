# Parameters gate commits (parts A and B)

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
- attribution_basis: live
- committed_by_agent: claude
- committed_by_agent_model: claude-opus-5-5
- committed_by_agent_family: opus-5.5

## Checkpoint

- 2026-10-04: the user pre-authorized commit, push and PR at completion, with one PR for both parts.
- The branch was restarted from `origin/main` after #17 merged, so the push to the existing branch uses force-with-lease, as the approved plan states.
- The commit contains part A: `core/parameters/`, the representation additions, the routing, the Liouville-bound zero tests, the gate spec, roadmap/README notes and Equation-owned memory.
- Commit identity: the commit containing this record (resolve with git log for this path); no self-referential hash is embedded.
- Memory protocol, file-size and diff-hygiene checks passed immediately before the commit.
- Part B: the user pre-authorized commit and push to the same PR (#18). The second commit is pushed normally on top of part A (no history rewrite). Memory protocol, file-size and diff-hygiene checks passed immediately before the commit.
