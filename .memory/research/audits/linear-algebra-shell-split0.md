# LINEAR-ALGEBRA-SHELL-SPLIT0

Date: 2026-07-10
Status: verified current-risk audit; prospective topology override approved

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

## Scope

This is a backend `0` milestone. It measures the current shared Matrix/Vector worker shell and decides whether `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1` may proceed. It does not change runtime behavior, host routing, capabilities, request/replay schemas, solver code, or app-visible output.

The approved gate requires at least one of:

- a 10% production worker-asset reduction after removing the other workspace stack;
- a 2x Matrix/Vector divergence in P95 duration or serialized request/result size;
- a concrete current difference in dependency, initialization, cancellation, result-limit, or failure-containment requirements.

## Fixtures And Method

- Matrix light: determinant of a 2 by 2 matrix.
- Matrix maximum profile: `profile(A)` on a 6 by 6 identity matrix, the current exact profile cap.
- Vector light: unit vector for `[3, 4]`.
- Vector maximum profile: `span(...)` over six standard basis vectors of length six, the current variadic exact cap.
- Direct compute: five warmups followed by twenty timed runs per fixture under `vite-node`.
- Browser worker lifecycle: five fresh-context cold runs and twenty same-context warm runs per fixture through the real OOE facade and isolated worker client in Chromium.
- Production assets: current Vite production worker compared with audit-only Matrix and Vector worker entrypoints built through Vite's worker pipeline.
- Bundle bytes and serialized request/result bytes are memory-pressure proxies. Reliable per-worker heap data was not available and is not claimed.

## Measurements

| Fixture | Direct P95 ms | Browser cold P95 ms | Browser warm P95 ms | Request bytes | Result bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Matrix determinant 2 by 2 | 0.055 | 88.0 | 89.6 | 68 | 89 |
| Matrix profile 6 by 6 | 0.089 | 90.7 | 89.4 | 216 | 2,064 |
| Vector unit 2D | 0.038 | 92.0 | 90.2 | 71 | 146 |
| Vector span 6 by 6 | 0.056 | 89.7 | 90.3 | 189 | 1,581 |

Maximum-profile direct P95 differs by about 1.58x. Browser worker P95 differs by about 1.01x. Maximum request size differs by about 1.14x and maximum result size by about 1.31x. None reaches 2x.

| Worker asset | Raw bytes | Gzip bytes | Raw reduction | Gzip reduction |
| --- | ---: | ---: | ---: | ---: |
| Current shared Linear Algebra | 1,240,488 | 334,342 | baseline | baseline |
| Matrix-only audit worker | 1,223,981 | 329,865 | 1.33% | 1.34% |
| Vector-only audit worker | 1,169,115 | 317,628 | 5.75% | 5.00% |

The audit-only builds also emit the current shared worker asset because the present mode facades statically import the shared worker client. That emitted asset is not requested by the synchronous audit worker path and is excluded from the loaded-asset comparison. A real split would remove that facade reference, but the measured primary assets still remain below the 10% gate.

## Runtime Contract Evidence

- Matrix and Vector retain distinct capabilities, request snapshots, replay seeds, diagnostics labels, and History launch tickets while selecting the same primary/fallback host pair.
- Both use the same pre-start fallback policy, reject post-start worker failures without silent retry, poll the same hard-stop cancellation path, and apply the same stale/commit legality contract.
- The client creates one isolated Worker instance per run. Sharing an entrypoint and host identifier does not place simultaneous Matrix and Vector jobs in one long-lived process, so the current shell already provides per-job failure containment.
- Focused worker, pilot, runtime-shell, and nine-workspace probe tests passed 21/21, including fallback, failure diagnostics, hard-stop cancellation, launch-ticket evidence, and stale-drop behavior.

## Audit Decision

No approved current-risk split criterion is met. The audit therefore does not independently authorize a topology change and must never be cited as proving present runtime divergence.

## User Decision Addendum

After reviewing the failed gate, the user explicitly locked separate Matrix and Vector runtime topology prospectively. The reason is the approved near-term divergence between Matrix numerical decomposition/conditioning work and Vector exact Gram-Schmidt/geometric work, not the current benchmark numbers.

This product-containment decision supersedes the audit's implementation blocker without rewriting the audit outcome. `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1` was implemented and verified immediately after the audit, before Behavioral Ratchets 5-9 or further Matrix/Vector capability expansion. The Matrix/Vector feature freeze remains active through the Anti-Regression closeout.
