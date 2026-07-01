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

## Milestone 3 - TRANSCENDENTAL-SI-CI-AFFINE-QUOTIENT-CERTIFICATE1

- Added live certificate-backed special-function answers for affine `sin(u)/u` and `cos(u)/u` quotient families after existing elementary routes miss.
- Sine quotient answers render as `Si` with affine-slope scaling, including derivative-present cases such as `2 sin(2x+1)/(2x+1) -> Si(2x+1)`.
- Cosine quotient answers render real-domain `Ci` casewise rows for `u>0` and `u<0`, with `u=0` excluded by visible supplement facts.
- Public strategy labels, result schemas, Display, History, OOE, Tauri, and persistence remain unchanged.

## Milestone 4 - SPECIAL-FUNCTION-EI-LI-SUBSTRATE1

- Added behavior-invisible `Ei` and `li` support to direct symbolic differentiation and derivative preflight.
- Certificate proof-local differentiation now accepts `Ei` and `li` without Compute Engine fallback.
- The exact rules are `d Ei(u)/dx = e^u u'/u` and `d li(u)/dx = u'/ln(u)`.
- Live integration adoption remains deferred to the next milestone.
