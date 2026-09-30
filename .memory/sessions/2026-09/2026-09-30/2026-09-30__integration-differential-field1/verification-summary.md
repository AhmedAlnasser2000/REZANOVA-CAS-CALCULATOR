# INTEGRATION-DIFFERENTIAL-FIELD1 verification

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

## Status and scope

2026-09-30; backend, CRITICAL, root-only. Complete: implementation, mathematical/boundary evidence and memory/file-size/diff checks pass. No staging, commit or push. Production edits are confined to the private integration core. Unrelated Agent Attention edits and concurrent `src/lib/graphing/ptx/` work are preserved.

## Verification

- Initial full focused core run: 176 tests passed in 17 files, 7.39 s, with two workers. This includes all 138 prior core tests and the initial 38 new tests.
- Final changed-scope run: all 40 differential tests plus isolation passed (41 tests, 3 files, 3.01 s). Two added cases cover fractional coefficient differentiation and a formal extension above a certified logarithmic field. Combined coverage is 178 core tests.
- TypeScript: `npx tsc -b --pretty false` passed after test narrowing corrections.
- Scoped ESLint passed on new differential files and the existing execution-context file.
- Compartment boundaries passed (1,560 source files; 26 OOE TypeScript / 6 Rust). OOE boundaries passed (8 tests plus validator).
- No Playwright: no application caller, public schema, parser or UI behavior changes. Full repository lint/build remain later source-commit gates.
- New tests exercise immutable ownership, independent dual-number verification, rational-multiple batches, nonzero residues/poles, formal constant-field honesty, certificate tampering, strict canonical artifact replay and sticky exhaustion. Decode tests disable the derivative/exponential/logarithm producers.

## Representative measurements

Serial local run through `npx vite-node .task_tmp/integration-differential-field1/measure.ts`; Node v24.19.0. One observation per operation, not a performance acceptance benchmark. Every row uses a fresh execution/proof context; all stages share the same finite limits. Base Q/Q(x) setup is outside the measured construction rows. For each extension, derivative/verify/codec stages use x times its top generator. The height-five case has four formal generators over Q(x), each with derivative one.

Arithmetic profile: work 20,000,000,000; cumulative allocation 1,000,000,000,000; integer bits 2,048; degree 256. Additional bounds: height 8, artifact depth 64, nodes 100,000, bytes 16,777,216. Counters are safeguards and cumulative allocation units, not RAM measurements.

| Construction | Operation | ms | Work | Allocation units |
| --- | --- | ---: | ---: | ---: |
| exp(x^2) | construct | 6.519 | 129,604 | 1,247,764 |
| exp(x^2) | differentiate-checked | 6.929 | 288,971 | 2,238,519 |
| exp(x^2) | verify-fresh | 5.072 | 253,028 | 1,905,792 |
| exp(x^2) | encode-checked | 6.165 | 289,943 | 2,224,376 |
| exp(x^2) | decode-replay | 7.476 | 330,896 | 2,540,145 |
| exp(1/x) | construct | 18.161 | 254,573 | 2,588,292 |
| exp(1/x) | differentiate-checked | 8.792 | 454,097 | 3,998,031 |
| exp(1/x) | verify-fresh | 7.496 | 368,682 | 3,133,480 |
| exp(1/x) | encode-checked | 9.399 | 469,053 | 4,132,813 |
| exp(1/x) | decode-replay | 13.410 | 608,174 | 5,489,082 |
| log((x-1)/(x+1)) | construct | 33.980 | 897,770 | 9,676,723 |
| log((x-1)/(x+1)) | differentiate-checked | 10.196 | 437,743 | 3,860,133 |
| log((x-1)/(x+1)) | verify-fresh | 7.163 | 366,270 | 3,138,342 |
| log((x-1)/(x+1)) | encode-checked | 20.114 | 787,930 | 7,661,300 |
| log((x-1)/(x+1)) | decode-replay | 34.137 | 955,082 | 9,352,893 |
| formal-height-5 | construct | 5.806 | 439,759 | 4,323,096 |
| formal-height-5 | differentiate-checked | 1174.327 | 43,364,693 | 321,712,218 |
| formal-height-5 | verify-fresh | 951.426 | 39,644,935 | 293,854,174 |
| formal-height-5 | encode-checked | 997.058 | 39,664,103 | 293,877,380 |
| formal-height-5 | decode-replay | 1127.072 | 45,777,524 | 338,472,625 |

Deeper recursive fraction arithmetic and repeated ownership checks are observably expensive: the height-five derivative took approximately 1.17 s and fresh verification 0.95 s in this observation. First-level examples were in milliseconds. No speed target was imposed or inferred. Further optimization must preserve both derivative paths, ownership and all admission hypotheses.

## Proof and artifact boundaries

- Formal generators remain independent symbols with unestablished constants. Zero derivative does not become rational-scalar equality.
- Certified owners copy caller evidence containers and check the snapshot before claiming Q constants.
- Exponential obstruction: nonzero polynomial part or a verified finite pole of order at least two. Log obstruction: a checked nonzero integer residue from square-free divisor multiplicity.
- Fresh replay rebuilds owners, replays hypotheses/claims and compares the expected construction. No callbacks or trust flags are serialized; no integration producers run during replay.
- All old codec versions remain unchanged. New artifact tag: `differential-field-artifact`, version 1.
- Extra safeguard exhaustion is sticky through the execution context. No new application limits or mathematical degree ceilings.

## Final closeout

- Runtime ownership guard added to the private field constructor; reflective construction and forged owner prototypes are rejected. The affected 40 tests passed again (2 files, 3.01 s); the prior isolation and retained-core evidence remains applicable.
- Final incremental TypeScript and scoped lint pass. Memory protocol (24 tests plus validator), file sizes (10 tests plus validator) and diff hygiene pass.
- The metric observations precede the final constructor token guard; arithmetic and counter behavior are unchanged by that ownership-only guard. Measurements are representative observations, not speed guarantees.
- All required durable memory and architecture documents are updated. Outcome: **exact recursive differential arithmetic with certified first-level exponential/logarithmic construction and replayable evidence**.
- No staging, commit or push. Concurrent Graphing analysis/PTX/export/ratchet changes and both pre-existing Agent Attention files remain outside this task.

## Authorized commit verification, 2026-09-30

- Repository `npm run lint` passed: zero errors, two existing React-ref cleanup warnings in `useGraphWorkspaceController.ts`.
- `npm run build` passed (TypeScript plus Vite; Vite 38.07 s).
- User authorized this integration-only milestone commit; no push. The commit includes its attribution/authorization record. Graphing and September 28 Agent Attention edits remain excluded.
- Commit checkpoint: all 178 core tests passed together (17 files, two workers, 7.97 s); memory/file-size validation and diff hygiene passed.
