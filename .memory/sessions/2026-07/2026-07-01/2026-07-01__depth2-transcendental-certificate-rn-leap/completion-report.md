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

## Milestone 5 - TRANSCENDENTAL-EI-LI-AFFINE-CERTIFICATE1

- Added live certificate-backed special-function answers for affine `e^u/u` and `1/ln(u)` quotient families after existing elementary routes miss.
- Exponential-integral answers render `Ei` with real-domain `u>0` and `u<0` rows and visible denominator exclusions.
- Logarithmic-integral answers render `li` with real-domain `u>1` and `0<u<1` rows plus visible `u>0` and `ln(u) != 0` facts.
- Public strategy labels, result schemas, Display, History, OOE, Tauri, and persistence remain unchanged.

## Milestone 6 - RN-DEPTH2-DERIVATIVE-SUBSTITUTION1

- Added a guarded RN-owned depth-2 derivative-substitution helper under `src/lib/symbolic-engine/integration/risch-norman/depth2-substitution.ts`.
- The helper consumes the depth-2 tower profiler for elementary nested forms such as `e^x e^(e^x)` and `cos(x)e^(sin(x))`, and directly recognizes `e^x/(1+e^x)` and `1/(x ln(x))`.
- Results keep the public strategy label `u-substitution`, use exact rule-proof verification, and do not introduce a public RN/Risch strategy or schema change.
- Focused tests live in `src/lib/symbolic-engine/integration-risch-norman-depth2-substitution.test.ts` so the large integration regression file stays under the file-size ratchet.

## Milestone 7 - SPECIAL-FUNCTION-FRESNEL-SUBSTRATE1

- Added behavior-invisible exact differentiation support for `FresnelS(u)` and `FresnelC(u)` using the standard convention `d FresnelS(u)/dx = sin(pi*u^2/2)u'` and `d FresnelC(u)/dx = cos(pi*u^2/2)u'`.
- Added preflight and certificate proof-local differentiation support for the same heads without enabling live integration adoption.
- `sin(x^2)` and `cos(x^2)` remain controlled unsupported/deferred as integration inputs; future live adoption still needs certificate/readback policy, scaling normalization, and real/complex branch decisions.
- Readiness detail is recorded in `.memory/research/readiness/special-function-fresnel-substrate1-2026-07-01.md`.

## Milestone 8 - TRANSCENDENTAL-PRACTICAL-CERTIFICATE-CHECKPOINT0

- Added audit-only closeout at `.memory/research/audits/transcendental-practical-certificate-checkpoint0-2026-07-01.md`.
- Recorded the completed live practical certificate scope: exp-quadratic `erf/erfi`, affine `Si/Ci`, affine `Ei/li`, and RN-owned elementary depth-2 derivative substitutions.
- Recorded that `FresnelS/FresnelC` remain substrate/readiness only, with `sin(x^2)` and `cos(x^2)` live adoption deferred.
- Recorded remaining formal transcendental Risch gaps: general depth-2 towers, depth-3+, Risch differential equations, algebraic extensions, complex branch cuts, broad proof-field solving, and formal certificates outside scoped families.
- No runtime behavior, public strategy, public schema, Display, History, OOE, Tauri, or persistence changes were made.
