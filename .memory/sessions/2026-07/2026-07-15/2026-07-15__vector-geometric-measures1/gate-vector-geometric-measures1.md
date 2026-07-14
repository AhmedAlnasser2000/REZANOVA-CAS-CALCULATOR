# VECTOR-GEOMETRIC-MEASURES1

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

- Five new Vector selectors provide parallel classification, distance, parallelogram area, triangle area, and 3D volume.
- Exact rational helpers own Gram determinants and scalar triples; the existing numeric core provides bounded decimal fallback.
- A new strict V2 `vector.geometric-measures` route carries aligned producer-built standard MathJSON for the primary and evidence details.
- The editor accepts real MathLive `operatorname` forms, while the Ctrl keypad and Guide expose the same bounded functions.
- Existing Vector worker, OOE, cancellation/stale behavior, History ownership, replay snapshots, and copy semantics remain unchanged.
- Display inversion now recognizes `attachCanonicalResultV2ToProducerDraft` and `attachCanonicalResultV3ToProducerDraft` as native document wrappers, restoring the Statistics native floor after its V2 consolidation and strengthening current-version authority visibility without runtime behavior changes.

## Handoff

- Concurrent integration note: while this gate was running, `STATISTICS-DATA-SUMMARY1` (`dec43fc3`) landed and included the shared `VectorOperation`, golden-case, and V2-default-route hunks authored for this milestone. The candidate was rebased onto that checkpoint and both generated baselines were regenerated from the combined clean state; this milestone commit completes the remaining implementation and evidence without rewriting the Statistics commit.
- Commit this milestone as `VECTOR-GEOMETRIC-MEASURES1` under standing approval.
- Continue directly to `MATRIX-SYMMETRIC-POSITIVE-DEFINITE1`.
- Keep concurrent work unstaged and do not push.
