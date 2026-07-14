# V1-TYPED-DETAIL-CALCULUS1

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

- labels: backend, ui
- result: pass; awaiting explicit commit approval
- behavior: newly computed derivative and implicit-derivative details use typed prose and producer-owned inline math
- boundaries: no schema, renderer, History, worker, OOE, consumer, mathematics, or persisted-record change
- protected lane: concurrent Notebook files and untracked `test-results/` remain excluded

## Changes

- Replaced derivative operator/applied pseudo-label math with `Differentiate with respect to ...`, partial-variable order, and `Applied in order: ...` typed parts.
- Added producer-owned variable, substitution, derivative-step, relation, and differentiated-relation MathJSON leaves.
- Replaced implicit-derivative pseudo-label math with `Relation`, differentiation-variable, and `Differentiated relation` typed parts.
- Refreshed the six affected Calculus replay fixtures and accepted the coverage delta with a durable reason.

## Coverage

- aggregate: 458/394/64/0 to 460/410/50/0 for total/proven/exempt/missing
- `calculus.derivatives`: 27 leaves, 13 proven, 14 exempt to 29 leaves, 27 proven, 2 exempt
- `calculus.partials`: 4 leaves, 2 proven, 2 exempt to 4 leaves, 4 proven, 0 exempt
- Obsolete exemption rules remain in the baseline registry until `V1-TYPED-DETAIL-CLOSEOUT0`, as approved.

## Verification

- affected Calculus engine and implicit tests: 24 pass
- affected Calculus UI tests: 11 pass, including one isolated correction rerun for a stale text assertion
- replay and MathJSON coverage: 6 tests pass; all 100 replay fixtures and 143 evidence executions hard-compare
- result contract: 63 tests pass across 11 files, including all 43 golden and 100 replay executions
- detail migration: 449 declared, zero undeclared
- result intent: zero direct-summary violations; golden and replay intent coverage passes
- Chromium: ordinary derivative, implicit derivative, and mixed partial pass with one worker; compact History preserves the exact input/result; screenshots show no malformed math or overflow
- static: incremental TypeScript, changed-file lint, file-size, memory protocol, and diff hygiene pass
- resource posture: focused tests only; no full unit, UI, or canary suite ran

## Evidence

- `.task_tmp/v1-typed-detail-cleanup/calculus-derivative.png`
- `.task_tmp/v1-typed-detail-cleanup/calculus-derivative-history.png`
- `.task_tmp/v1-typed-detail-cleanup/calculus-implicit.png`
- `.task_tmp/v1-typed-detail-cleanup/calculus-partial.png`

## Handoff

- Request explicit approval for the `V1-TYPED-DETAIL-CALCULUS1` commit.
- After commit, continue with `V1-TYPED-DETAIL-TRIGONOMETRY1`.
- Do not stage Notebook files or `test-results/`; do not push.
