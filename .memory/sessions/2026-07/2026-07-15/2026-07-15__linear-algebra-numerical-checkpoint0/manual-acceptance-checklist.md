# Linear Algebra Numerical Manual Acceptance Checklist

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

## Accepted Checks

- [x] Exact structural answers remain the canonical copy truth while Both/Decimal show precision-aware mathematical readback.
- [x] Three-vector Gram-Schmidt shows the expected orthogonal/orthonormal basis, proof detail, exact copy, replay, and bounded operand-count error.
- [x] Geometric measures show exact area/volume, 3D-only normal and orientation meaning, exact copy, replay, and non-3D volume stop.
- [x] Exact definiteness shows principal-minor evidence; decimal definiteness discloses automatic tolerance and eigenvalue estimates; rectangular input stops clearly.
- [x] Rank-one pseudoinverse is `[[0.12,0.16],[0,0]]`; `cond(diag(3,1))` is approximately 3; singular condition is infinity.
- [x] Rectangular SVD shows factor matrices, singular values, threshold, rank, condition, and reconstruction residuals.
- [x] Numerical warnings are visible and do not claim exactness.
- [x] Result and error cards, details, History, and large formulas are readable without clipping or unsafe horizontal overflow.
- [x] Matrix and Vector retain distinct workers, primary/fallback hosts, capabilities, cancellation, failure, stale/commit, History, and replay ownership.

## Visual Evidence

- `.task_tmp/linear-algebra-exact-decimal-controls1/vector-projection-decimal.png`
- `.task_tmp/vector-gram-schmidt-n1/variadic-gram-schmidt.png`
- `.task_tmp/vector-geometric-measures1/oriented-volume-expanded.png`
- `.task_tmp/matrix-symmetric-positive-definite1/positive-definite-expanded.png`
- `.task_tmp/matrix-symmetric-positive-definite1/numeric-positive-definite.png`
- `.task_tmp/matrix-svd-pinverse-conditioning1/pseudoinverse-expanded.png`
- `.task_tmp/matrix-svd-pinverse-conditioning1/rectangular-svd-expanded.png`
- Controlled-stop screenshots exist in the corresponding milestone directories.

## Hold

- Symbolic work is intentionally paused for user discussion.
