# MATRIX-SVD-PINVERSE-CONDITIONING1

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

## Gate

- label: backend
- result: verified pass under standing user approval for the full Linear Algebra program
- push authority: none
- protected state: concurrent Notebook and Statistics changes plus untracked `test-results/`

## Implemented

- Finite numeric matrices through 8 by 8 support singular-value decomposition, Moore-Penrose pseudoinverse, 2-norm condition number, and threshold-derived numerical rank.
- The focused `ml-matrix` 6.14.0 dependency owns SVD computation with automatic transposition for rectangular matrices. The adapter preserves the library threshold and rank while explicitly mapping threshold-rank deficiency to infinite condition.
- Visible results include singular values, the automatic threshold, numerical rank, condition, factor matrices, reconstruction residuals, and the relation `A pinv(A) A` approximately equals `A`.
- Parser, editor formatting/dispatch, Matrix Ctrl templates, Guide discovery, request/replay validation, worker/OOE execution, History replay, copy, and canonical evidence are wired without changing existing ownership boundaries.
- The strict V2 route raises executable evidence to 146 cases and MathJSON coverage to 466/466 proven leaves with zero exemptions and zero missing leaves.

## Handoff

- The full shared-tree and exact selectively staged TypeScript/Vite builds pass. The isolated staged coverage gate confirms that the Statistics inference byte baseline remains unchanged. Scoped lint, file-size, result-contract, canonical enforcement, display inversion, OOE, compartment, focused UI, and Chromium verification all pass.
- Concurrent Notebook and Statistics source/tests/styles/dossiers remain unstaged. The shared `runtime-types.ts` contains an active Statistics inference hunk that must remain outside this commit; only the Matrix operation-union hunk belongs to this milestone.
- Commit this milestone as `MATRIX-SVD-PINVERSE-CONDITIONING1` under standing approval.
- Continue with the numerical checkpoint, keep concurrent work unstaged, and do not push.
