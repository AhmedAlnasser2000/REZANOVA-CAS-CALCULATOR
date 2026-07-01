# Depth-2 Transcendental Certificate + RN Leap

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Milestone 1 - TRANSCENDENTAL-DEPTH2-TOWER-SUBSTRATE1

- Added a behavior-invisible internal depth-2 tower profiler at `src/lib/symbolic-engine/integration/transcendental-certificate/depth2-profile.ts`.
- The profiler recognizes affine `sin(u)/u`, `cos(u)/u`, `e^u/u`, `1/ln(u)`, and derivative-present nested substitution evidence such as `e^x e^(e^x)` and `cos(x)e^(sin(x))`.
- It records selected variable, extension chain, derivative carrier, coefficient scope, required facts, branch/domain facts, and explicit stop reasons.
- Integration dispatch, public strategy labels, result schemas, Display, History, OOE, Tauri, and persistence remain unchanged.

## Memory Notes

- `.memory/current-state.md` had active unstaged Surface-lane edits before this milestone. This gate records completion in the session dossier and journal while intentionally not staging that other-lane current-state hunk.

## Milestone 2 - SPECIAL-FUNCTION-SI-CI-SUBSTRATE1

- Added behavior-invisible `Si` and `Ci` support to the direct symbolic differentiator and derivative preflight allowlist.
- Certificate proof-local differentiation now accepts `Si`/`Ci` without Compute Engine fallback.
- The exact rules are `d Si(u)/dx = sin(u)u'/u` and `d Ci(u)/dx = cos(u)u'/u`.
- Integration adoption remains deferred to the next milestone.
