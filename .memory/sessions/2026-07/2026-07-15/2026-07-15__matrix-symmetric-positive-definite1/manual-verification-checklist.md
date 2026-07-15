# Matrix Symmetric Definiteness Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- Matrix provides bounded exact and numerical definiteness classification with visible criteria and producer-owned canonical evidence.
- Exact answers remain canonical, copyable, replayable, and readable; numerical answers disclose their tolerance.

## Manual App Steps

1. Open Matrix, switch the soft keypad to Ctrl, and confirm the `inv?` key displays `definite`.
2. Set `A=[[2,-1],[-1,2]]`, run `definite(A)`, and confirm `Positive definite`.
3. Expand `Exact Principal-Minor Evidence` and confirm leading minors `[2,3]` plus all-principal counts `[3,0,0]`.
4. Copy the result, collapse and reopen details, then replay it from History.
5. Set `A=[[1.5,0],[0,0.5]]`, rerun, and confirm the tolerance warning plus `Tolerance-Labeled Spectral Evidence` with a displayed threshold and eigenvalue estimates.
6. Set `A=[[1,2],[2,1]]` and confirm `Indefinite`.
7. Set a 2 by 3 matrix and confirm the controlled square-matrix error.

## Expected Results

- Exact and replayed results copy as `\operatorname{definite}(A)=\text{Positive definite}`.
- Numerical classification never hides its tolerance or claims exact principal-minor proof.
- The answer, evidence, warning, error, and History cards remain readable without horizontal overflow.
