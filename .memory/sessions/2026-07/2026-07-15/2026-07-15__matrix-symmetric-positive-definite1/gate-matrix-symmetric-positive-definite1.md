# MATRIX-SYMMETRIC-POSITIVE-DEFINITE1

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

- Exact symmetric matrices through 6 by 6 evaluate all `2^n - 1` nonempty principal minors with the existing rational determinant core. Positive and negative semidefiniteness use the complete principal-minor criteria; strict definiteness is also identified exactly.
- Decimal or otherwise non-exact matrices through 8 by 8 are scale-normalized and classified by a bounded symmetric Jacobi iteration. The visible evidence includes the automatic tolerance, symmetry residual, and eigenvalue estimates.
- Nonsymmetric square matrices return a successful bounded classification with mismatch/residual evidence; rectangular inputs stop with a controlled error.
- Editor parsing, Matrix Ctrl keypad insertion, Guide discovery, request/replay validation, worker execution, OOE behavior, History replay, copy, and canonical evidence are wired without a new workspace, worker, host, capability, or replay shape.
- The strict V2 route raises executable evidence to 145 cases and MathJSON coverage to 459/459 proven leaves with zero exemptions and zero missing leaves.

## Handoff

- Concurrent integration note: while this gate was running, `STATISTICS-PROBABILITY1` (`d52951a7`) landed and included the shared `definiteA`/`definiteB` `MatrixOperation` union hunk authored for this milestone. The isolated candidate is based on that checkpoint; this milestone commit completes the remaining implementation and evidence without rewriting the Statistics commit.
- Full-repo lint remains blocked by five pre-existing errors in untouched `matrix-change-of-basis.ts` and `vector-result-document.ts`; scoped lint for every file in this milestone passes.
- Commit this milestone as `MATRIX-SYMMETRIC-POSITIVE-DEFINITE1` under standing approval.
- Continue directly to `MATRIX-SVD1`, keep concurrent work unstaged, and do not push.
