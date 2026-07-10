# Linear Algebra Topology Lock Recap

Date: 2026-07-10
Status: topology implemented and verified; Behavioral Ratchets pending

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
  - user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Repository Truth

- Anti-Regression prerequisite Move 0 and Incident Closure Moves 1-4 are committed.
- The mandatory Incident Review is complete and user-accepted.
- Behavioral Ratchets 5-9 are reserved and approved, but they are not implemented or committed.
- `LINEAR-ALGEBRA-SHELL-SPLIT0` is complete and is committed with this topology-decision recap.
- `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1` is implemented and verified in its approved commit checkpoint.
- Production now uses independent `matrix-worker-runtime` / `matrix-runtime` and `vector-worker-runtime` / `vector-runtime` host pairs while preserving separate `linearAlgebra.matrix` and `linearAlgebra.vector` capabilities.

The earlier instruction to the Matrix/Vector thread to assume the nine moves were finished was a scheduling reservation intended to prevent concurrent interference. It must not be restated as Git history, completed verification, or shipped behavior.

## What The Audit Proved

Current workloads do not independently justify a split on measured cost. Matrix-only and Vector-only audit workers reduced gzip bytes by 1.34% and 5.00%; browser lifecycle timing was effectively equal; serialized request/result differences remained below 2x; and current fallback, cancellation, failure, stale/commit, diagnostics, and History-ticket policies matched.

The audit remains a truthful failed current-divergence gate. It is not rewritten as a pass.

## User Topology Decision

The user now locks separate Matrix and Vector runtime topology prospectively because the approved near-term roadmap intentionally introduces different execution-risk classes:

- Matrix moves toward exact positive-definite classification and numerical SVD, pseudoinverse, condition number, numerical rank, tolerance, precision, and larger-memory decomposition work.
- Vector moves toward variadic Gram-Schmidt and geometric measures while preserving a lighter exact vector-oriented profile.

This is an explicit product-containment policy revision after reviewing the audit. It authorizes `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1` without falsely claiming the current measurements crossed the old thresholds.

Locked topology:

- Matrix: capability `linearAlgebra.matrix`, primary host `matrix-worker-runtime`, fallback `matrix-runtime`, shell `matrix-worker-shell`.
- Vector: capability `linearAlgebra.vector`, primary host `vector-worker-runtime`, fallback `vector-runtime`, shell `vector-worker-shell`.
- Matrix and Vector keep separate worker entrypoints, clients, host lifecycles, diagnostics, and runtime-probe records.
- Shared exact Matrix/RREF and future orthogonalization cores remain reusable math substrates; the split must not duplicate solvers.
- Request shapes, `matrixSeed`, `vectorSeed`, History behavior, stale/cancel semantics, commit legality, and one OOE authority remain unchanged.

## Safe Sequence

1. Completed: commit the verified `LINEAR-ALGEBRA-SHELL-SPLIT0` audit and topology decision as `bc752a25`.
2. Completed in the current approved checkpoint: implement and verify only `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1` without new Matrix/Vector math.
3. Next: complete and commit Behavioral Ratchets 5-9 in their approved order.
4. Run the anti-regression manual closeout and obtain user acceptance.
5. Resume Linear Algebra capability work with `LINEAR-ALGEBRA-EXACT-DECIMAL-CONTROLS1`, then Gram-Schmidt, geometric measures, positive-definite classification, and SVD/pseudoinverse/conditioning.

Until step 4 is accepted, Matrix/Vector feature work remains frozen. The other agent may inspect, plan, or review, but must not implement or commit those capability milestones in the shared checkout.

## Message For The Matrix/Vector Thread

Do not treat Anti-Regression Moves 5-9 as completed Git history. They are reserved blockers and are being executed by the Anti-Regression thread. The Linear Algebra shell audit and independent Matrix/Vector host split are complete; the truthful audit thresholds did not pass, and the split proceeded under the user's separate prospective product-containment decision. Pause capability implementation until all five Behavioral Ratchets are actually committed and the closeout is accepted. Remove `LINEAR-ALGEBRA-SHELL-SPLIT0` and `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1` from the remaining numeric feature sequence because both topology milestones now precede that work.
