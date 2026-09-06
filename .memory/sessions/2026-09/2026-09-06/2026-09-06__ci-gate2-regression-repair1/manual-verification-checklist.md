# CI-GATE2-REGRESSION-REPAIR1 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- Established Equation root presentation, signed-imaginary proof, Matrix adjoint proof, deterministic Graph budget tests, and the CI additional-seam selection are repaired without baseline rewrites.

## Manual App Steps

1. In Equation Symbolic, run `x^4-16=0` with Complex Off, then Complex On.
2. In radians, run `sin(x^2+x)=1/2`.
3. Run `sqrt(x^2+sqrt(5-x^2))=2`.
4. Run `sqrt(x^2+x+sqrt(4-(x^2+x)))=2`.
5. In Matrix Complex/Symbolic mode, enter `[[1,i],[a,1-i]]` and run `adjoint(A)`.
6. For each result, use Copy Result and History replay and inspect all visible facts/details.

## Expected Results

- Complex Off quartic: `x=-4/2` and `x=4/2`; Complex On also shows distinct `-2i` and `2i` roots.
- Periodic carrier: four readable exact rows containing `2\pi k`, plus representative branches and parameter constraints.
- Sequential radical: two roots `±sqrt(7/2-sqrt(5)/2)` with two rejected extraneous candidates.
- Repeated-clearing radical: `-1/2-sqrt(13)/2` and `-1/2+sqrt(13)/2` with domain and rejection evidence.
- Matrix adjoint: `[[1,a*],[-i,1+i]]` with the negative imaginary sign intact.
- Copy and History replay preserve the visible mathematical values; no horizontal clipping appears.
