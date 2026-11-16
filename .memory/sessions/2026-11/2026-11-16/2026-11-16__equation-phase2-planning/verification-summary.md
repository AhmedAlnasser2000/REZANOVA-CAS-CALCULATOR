# Verification

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

## Checks

- Engine runs through `tools/equation-slow-case-probe.mjs` and its runner on main (ceafcd9): IMO 1983 P6, IMO 1984 P1, Nesbitt, IMO 1995 P2 and IMO 2008 P2(a) negations return empty and verified; IMO 2001 P5 returns incomplete-implementation; IMO 2006 P3 returns a work stop after about 114 s.
- Memory protocol and Codex agent-workflow gates; `git diff --check`.
