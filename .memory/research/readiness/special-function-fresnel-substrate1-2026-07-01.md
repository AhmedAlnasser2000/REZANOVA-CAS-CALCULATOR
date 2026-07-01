# SPECIAL-FUNCTION-FRESNEL-SUBSTRATE1 Readiness

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Current State

- `FresnelS(u)` and `FresnelC(u)` are now exact symbolic-differentiation heads.
- Certificate proof-local differentiation can use them without Compute Engine fallback.
- No integration route adopts Fresnel answers yet; `sin(x^2)` and `cos(x^2)` remain controlled unsupported/deferred.

## Future Live Adoption Needs

- Normalize quadratic trig arguments to the chosen Fresnel convention `sin(pi*u^2/2)` and `cos(pi*u^2/2)`.
- Carry exact scaling facts for affine or exact-rational square arguments.
- Decide real versus complex branch/readback policy before presenting a main answer.
- Keep certificate details visible when a Fresnel answer is shown as the named special-function readback.
