# Matrix Symmetric Definiteness Completion Report

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

- `MATRIX-SYMMETRIC-POSITIVE-DEFINITE1` is implemented and verified.
- `definite(A)` and `definite(B)` classify real square matrices as positive definite, negative definite, positive semidefinite, negative semidefinite, both semidefinite, indefinite, or nonsymmetric.
- Exact matrices through 6 by 6 use exact symmetry plus every nonempty principal minor. Decimal or otherwise non-exact matrices through 8 by 8 use a bounded symmetric Jacobi eigensolver with a displayed scale-aware tolerance.
- The new `matrix.definiteness` route defaults to strict Canonical Result V2 and carries aligned producer-owned MathJSON for the classification and mathematical evidence.
- The existing Matrix editor, worker, capability, OOE shell, History/replay contract, copy behavior, and visible workspace layout remain in place.

## Next Checkpoint

- Continue the approved program with `MATRIX-SVD1`.
- Standing user approval covers the remaining approved Linear Algebra commits.
- Do not push.
