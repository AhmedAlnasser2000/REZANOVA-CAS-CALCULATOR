# INTEGRATION-DIFFERENTIAL-ARITHMETIC-PERFORMANCE1 verification

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Boundary and current evidence

Backend gate, CRITICAL root-only. User initially approved implementation without staging/commit/push, then explicitly requested finishing and committing this gate; no push authorized. Concurrent Graphing and September 28 Agent Attention work remains untouched.

- Baseline is unchanged `b4517300`, extracted only under ignored `.task_tmp/integration-differential-arithmetic-performance1/baseline/`.
- Harness: `src/lib/symbolic-engine/integration/core/__tests__/differential-performance.ts`, same Node/machine/profile; two warm-ups and five measured runs. Fresh contexts/proof state and owners; fixture construction/JSON/file I/O outside timers. CPU profile separate from timing acceptance. Work/allocation are logical cumulative counters, not RAM.
- Checkpoint A alone: inverse integration 69.72 ms / fresh verification 30.81 ms against exploratory baseline 65.99 / 29.92 ms; targets unmet. This result did not justify stopping.
- Checkpoint B exploratory full corpus passed both 5x targets and all regression tolerances. A subsequent correction cancels product powers before allocation, preventing an avoidable intermediate degree exhaustion. Final acceptance reruns this final code.
- Initial final-core run: 359 tests / 25 files, two workers, 20.71 s: all 306 retained core tests, 17 added tests, and 36 affected New Integration service/result tests. After the owner-cache container allocation charge adjustment, the affected differential/hyperexponential delta is recorded below.
- Scoped ESLint passed. Initial incremental TypeScript encountered an unrelated transient missing `usePiecewiseSuppression` import in concurrent Graphing edits. The Graphing owner corrected it; the repeated incremental TypeScript check passed. No Graphing file was edited by this gate.
- Isolation passes as part of core tests; OOE and compartment validators pass.
- Final performance, real-app visual and memory/file-size evidence follows below. Overlapping benchmark attempts were interrupted when another agent launched heavy verification; all partial trials are excluded from acceptance. The final full baseline/candidate pair completed with a process monitor recording no competing verifier.

## User-requested presentation delta

The user separately identified excessive sigma-to-summand spacing for 1/(x^2+1). A one-line change to integration-presentation.ts removes the full-size textstyle override in expanded sum subscripts. The real app now renders the ordinary subscript size with the summand closer to sigma. This small UI correction is separately authorized and is outside the backend production-path inventory. No semantic, canonical-document or artifact changes. Existing presentation/printer regression tests and ratchets passed after serial measurements.

The first smoke script's source-condition screenshot captured the retained earlier result while the next request was running. It was corrected to require Stop disabled and the earlier-expression notice absent. Replacement screenshots were inspected: x^3/3+C; the complete quadratic root-log sum with local semantics/condition; and C with source exclusion x-1 != 0. Conditions and verification details are expanded; no page errors or workspace overflow.

## Final backend acceptance

Checkpoint A+B passes both 5x targets and all 92 non-target operation regression tolerances across 26 cases (94 measured operations). Checkpoint C was not implemented. Accepted two-warm-up/five-run data, machine metadata, counters and memory observations are preserved in baseline-final.json, candidate-final.json and performance-results.md; serial-observations.json records the concurrency checks.

| exp(-x) operation | Baseline median ms | Candidate median ms | Speedup |
| --- | ---: | ---: | ---: |
| integration | 67.418 | 9.696 | 6.95x |
| verification | 29.521 | 4.899 | 6.03x |
| encoding | 52.273 | 8.062 | 6.48x |
| decoding | 64.602 | 8.551 | 7.55x |

- Complete integration work: 3,272,647 → 484,036; cumulative allocation units: 27,693,545 → 4,249,060.
- Fresh verification work: 1,533,397 → 184,597; cumulative allocation units: 12,929,462 → 1,559,522.
- Final affected correctness delta after accounting adjustment: 57 tests / 3 files pass with two workers, 1.28 s. Together with the 359-test run this retains 306 old core tests, adds 17 core tests and checks 36 adopted service/result tests.
- Real npm-run-dev Playwright: three completed answers, conditions, verification details and overflow inspected; no page errors. Screenshots are polynomial.png, root-log.png and source-exclusion.png. An existing user/other-agent dev server was reused and left running; this gate's browser processes were closed.
- The user asked not to record a printer follow-up; none is left in open questions or the roadmap.

Final source-commit checks:

- Focused integration presentation, integration printer, V2 contract and MathJSON coverage: 26 tests / 4 files pass, two workers, 52.75 s (includes the pre-existing difficult rational presentation fixtures).
- Canonical V2 enforcement: pass, 20 frozen producers. Display inversion tests and ratchet: pass. No canonical schema or producer authority change.
- `npm run lint`: pass, zero errors; one pre-existing Graphing ref-cleanup warning in useGraphWorkspaceController.ts.
- `npm run build`: pass, incremental TypeScript plus Vite (38.62 s); existing mixed static/dynamic Graphing import warning remains.
- OOE and compartment boundary checks: pass; private-core isolation included in the core run.
- Memory protocol: 24 tests plus validator pass. File-size checks: 10 tests plus validator, 2,353 files and 5 existing caps. `git diff --check`: pass.
- All owned benchmark/test/browser/build processes completed. The existing npm-dev server was not created by this gate and is left alone.
- Authorized commit is restricted to two core production files, benchmark/tests/baseline artifacts, one presentation line, and this gate's documentation/memory. Other-agent Graphing work is already committed independently; the two September 28 Agent Attention edits are excluded. No push.
