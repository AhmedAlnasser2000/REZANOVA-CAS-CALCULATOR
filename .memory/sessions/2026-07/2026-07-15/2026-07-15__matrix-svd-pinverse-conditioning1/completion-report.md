# Matrix SVD, Pseudoinverse, and Conditioning Completion Report

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

## Completion

- `MATRIX-SVD-PINVERSE-CONDITIONING1` is implemented and verified.
- `svd(A)`, `pinv(A)`, `cond(A)`, and `nrank(A)` accept finite numeric rectangular matrices through 8 by 8 and run through the existing Matrix worker, capability, OOE shell, History, and replay contracts.
- The implementation uses the focused `ml-matrix` 6.14.0 singular-value decomposition rather than a route-local SVD. Its automatic threshold drives the displayed numerical rank; rank-deficient condition numbers are reported as infinity.
- Results disclose approximation, singular values, threshold, rank, condition, pseudoinverse reconstruction evidence, and SVD reconstruction evidence. There is no tolerance editor, PCA surface, new workspace, host, capability, or replay schema.
- The new `matrix.numeric-decomposition` route defaults to strict Canonical Result V2 with aligned producer-owned standard MathJSON.

## Next Checkpoint

- Run the approved numerical checkpoint before entering the remaining symbolic Linear Algebra milestones.
- Standing user approval covers the remaining approved Linear Algebra commits.
- Do not push.
