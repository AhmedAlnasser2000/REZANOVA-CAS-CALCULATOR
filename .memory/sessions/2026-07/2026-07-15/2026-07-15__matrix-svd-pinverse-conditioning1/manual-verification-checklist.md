# Matrix SVD, Pseudoinverse, and Conditioning Manual Verification Checklist

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

- Matrix provides bounded numerical SVD, pseudoinverse, condition-number, and numerical-rank results with visible threshold and residual evidence.
- Approximate answers remain canonical, copyable, replayable, and explicit about numerical authority.

## Manual App Steps

1. Open Matrix, switch the soft keypad to Ctrl, and confirm `rank`, `eigen`, inverse, and `qr` display `nrank`, `cond`, `pinv`, and `svd`.
2. Set `A=[[3,0],[4,0]]`, run `pinv(A)`, and confirm `[[0.12,0.16],[0,0]]`.
3. Expand `SVD Diagnostics` and `Pseudoinverse Check`; confirm singular values, threshold, rank 1, infinite condition, and the Moore-Penrose reconstruction relation.
4. Copy the result, collapse and reopen details, then replay it from History and confirm the Matrix workspace and request are restored.
5. Set `A=diag(3,1)`, run `cond(A)`, and confirm approximately 3. Set `A=diag(1,0)` and confirm infinity.
6. Set `A=[[1,2,3],[4,5,6]]`, run `svd(A)`, and inspect `U`, `Sigma`, transposed `V`, and the reconstruction residual.
7. Run `pinv` on an inline 9 by 2 matrix and confirm the controlled 8 by 8 input-limit error.

## Expected Results

- The rank-one pseudoinverse copies as `\operatorname{pinv}\left(A\right)\approx \begin{bmatrix}0.12 & 0.16\\0 & 0\end{bmatrix}`.
- Numerical output never hides the SVD threshold or claims exact decomposition proof.
- The answer, evidence, warning, error, and History cards remain readable without horizontal overflow.
