# Rational proof performance verification

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

## Backend verification — 2026-09-28

- Focused `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2`: **15 files / 138 tests pass**, including all original 122 tests and isolation; 5.85 s. After the TypeScript identity-comparison repair (`Object.is` on object references), the affected polynomial/execution/proof regression delta passes **3 files / 22 tests**, 1.42 s. The final accepted benchmark and source hashes also include that repair.
- `npx tsc -b --pretty false`: pass. An initial generic-type comparison diagnostic in polynomial.ts was corrected without widening cache eligibility.
- `npx eslint src/lib/symbolic-engine/integration/core`: pass, no warnings.
- `npm run test:compartments-boundaries`: 36 tests and validator pass. `npm run test:ooe-boundaries`: 8 tests and validator pass.
- `npm run test:memory-protocol`: 23 tests and validator pass. `npm run test:file-sizes`: 10 tests and validator pass, no cap edits. `git diff --check`, new-file whitespace, artifact checksum and local documentation links pass. An initial commit-log validation interpreted the historical baseline hash as a new commit; its provenance was moved to the verification record, without inventing commit attribution.
- Existing baseline v1 quintic artifact decodes and re-encodes exactly with Hermite, LRT and Brown producers mocked to throw. Fresh calls with the same ExecutionContext incur the same verification work, proving that entry boundaries do not carry trusted state forward.
- Added tests cover exact signed bit boundaries, stricter contexts, bounded eviction, work/allocation exhaustion on hits, failed checks, mutable nested evidence, inverse/trace/weight/target/domain/modulus/condition changes, checked common-denominator conversion/cancellation, reducible quotient traces and Newton sums.
- Repository lint/build remain required before any separately authorized commit. No full suite, Playwright, staging, commit or push accompanies this backend gate.

## Reproducible benchmark

Baseline: unchanged `3a96622c` core extracted with git archive. Same harness, Node v24.19.0, physical Intel Core Ultra 7 265K machine (20 logical CPUs), Linux x86_64. Every case uses one warm-up plus three measured runs, each with fresh integration/verification/encoding/decoding contexts. Measurements ran serially, without another heavy verification job launched by this agent; process checks at launch found none. OS scheduling/GC still cause spread. Input setup and JSON parse/stringify are outside operation timers. No application latency claim follows.

Explicit identical limits: work 20,000,000,000; cumulative allocation 1,000,000,000,000; integer bits 2,048; degree 256. No benchmark limit was raised. Allocation is logical cumulative accounting, not live bytes. The accepted opt-in comparison exits successfully: both quintic targets exceed 5x and all remaining operation/case medians satisfy max(20%,20 ms) regression tolerance.

Raw samples, all resource counters, memory observations, harness hash and candidate production hashes: [benchmark-results.json](benchmark-results.json). Logs and intermediate A/B measurements remain in ignored `.task_tmp/integration-rational-proof-performance1/`.

| Case / operation | Baseline median [min–max] ms | Candidate median [min–max] ms | Speedup |
| --- | ---: | ---: | ---: |
| quintic / integration | 42960.80 [42800.15–43094.49] | 3215.47 [3211.52–3221.37] | 13.36x |
| quintic / verification | 8294.89 [8117.79–8517.36] | 59.19 [58.27–67.30] | 140.14x |
| quintic / encoding | 8438.86 [8292.77–8443.67] | 72.54 [63.94–72.61] | 116.34x |
| quintic / decoding | 8951.54 [8917.41–9049.26] | 272.83 [270.01–287.17] | 32.81x |
| quintic-log / integration | 180.93 [164.28–185.24] | 57.02 [56.42–57.33] | 3.17x |
| quintic-log / verification | 35.32 [34.99–51.13] | 24.96 [16.31–25.33] | 1.42x |
| quintic-log / encoding | 36.58 [35.89–38.23] | 16.47 [15.62–26.67] | 2.22x |
| quintic-log / decoding | 79.31 [65.47–80.03] | 29.74 [29.44–30.00] | 2.67x |
| quadratic / integration | 294.67 [279.39–294.90] | 72.88 [72.63–73.30] | 4.04x |
| quadratic / verification | 44.31 [42.15–61.96] | 9.36 [9.29–9.42] | 4.74x |
| quadratic / encoding | 61.73 [46.07–62.40] | 10.18 [9.95–12.00] | 6.06x |
| quadratic / decoding | 79.21 [65.20–81.67] | 20.15 [19.97–21.17] | 3.93x |
| quartic / integration | 836.07 [835.23–843.19] | 167.71 [165.68–199.26] | 4.99x |
| quartic / verification | 148.08 [146.01–148.69] | 20.33 [20.04–31.24] | 7.28x |
| quartic / encoding | 164.17 [146.80–164.84] | 21.96 [21.78–22.07] | 7.48x |
| quartic / decoding | 208.93 [191.82–213.44] | 58.22 [47.67–62.24] | 3.59x |
| repeated-poles / integration | 297.91 [270.67–307.56] | 87.60 [87.48–89.09] | 3.40x |
| repeated-poles / verification | 52.33 [50.60–69.00] | 13.66 [13.58–13.75] | 3.83x |
| repeated-poles / encoding | 53.01 [51.97–59.56] | 14.73 [14.24–16.58] | 3.60x |
| repeated-poles / decoding | 87.12 [75.67–88.04] | 26.66 [25.84–38.98] | 3.27x |
| repeated-residues / integration | 45.88 [45.86–51.28] | 21.69 [20.73–21.95] | 2.11x |
| repeated-residues / verification | 8.90 [8.78–11.12] | 6.49 [6.35–6.52] | 1.37x |
| repeated-residues / encoding | 9.47 [8.62–11.32] | 17.46 [6.28–18.03] | 0.54x |
| repeated-residues / decoding | 18.29 [14.79–18.48] | 10.81 [10.78–11.47] | 1.69x |
| degree-loss / integration | 577.84 [570.85–586.24] | 145.41 [143.37–146.34] | 3.97x |
| degree-loss / verification | 110.34 [109.68–111.93] | 19.89 [19.87–20.81] | 5.55x |
| degree-loss / encoding | 112.87 [111.78–113.70] | 21.10 [20.92–21.61] | 5.35x |
| degree-loss / decoding | 153.38 [153.05–155.98] | 54.50 [53.68–54.78] | 2.81x |
| seeded-0 / integration | 67.32 [65.14–68.95] | 33.03 [32.07–43.48] | 2.04x |
| seeded-0 / verification | 18.90 [17.01–18.98] | 10.54 [10.49–22.51] | 1.79x |
| seeded-0 / encoding | 19.39 [16.03–19.48] | 10.40 [10.19–10.88] | 1.87x |
| seeded-0 / decoding | 29.45 [29.03–30.52] | 16.80 [16.52–30.53] | 1.75x |
| seeded-1 / integration | 65.96 [65.82–69.42] | 32.22 [31.05–42.95] | 2.05x |
| seeded-1 / verification | 18.45 [16.37–19.25] | 9.89 [9.68–10.32] | 1.87x |
| seeded-1 / encoding | 16.56 [16.46–18.87] | 10.04 [9.97–22.68] | 1.65x |
| seeded-1 / decoding | 28.93 [26.81–29.32] | 15.85 [15.39–16.05] | 1.83x |
| seeded-2 / integration | 59.60 [55.87–60.65] | 30.38 [29.45–41.26] | 1.96x |
| seeded-2 / verification | 17.22 [14.07–17.54] | 9.39 [9.36–9.58] | 1.83x |
| seeded-2 / encoding | 14.40 [14.27–17.58] | 9.50 [9.45–21.30] | 1.52x |
| seeded-2 / decoding | 26.55 [25.95–27.02] | 15.49 [14.75–15.74] | 1.71x |

## Quintic resource observations

Counters below are the median among measured runs; RSS and heap ranges are post-operation observations, not precise stage peaks. maxRSS is a cumulative process high-water mark and may include earlier warm-up/cases. Native allocator and GC retention mean these are observations rather than memory guarantees.

| Version / operation | Work | Allocation units | RSS MiB [min–max] | Heap-used MiB [min–max] | Process max RSS MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline / integration | 1,820,283,846 | 54,338,106,514 | 224.4–258.7 | 33.9–75.7 | 258.7 |
| baseline / verification | 353,724,108 | 10,665,993,995 | 224.1–259.4 | 21.3–75.4 | 259.4 |
| baseline / encoding | 354,256,025 | 10,678,395,621 | 224.1–260.1 | 22.2–73.8 | 260.1 |
| baseline / decoding | 381,051,572 | 11,350,326,743 | 224.1–260.8 | 61.7–112.9 | 260.8 |
| candidate / integration | 163,190,203 | 9,841,120,606 | 324.1–329.3 | 38.0–95.0 | 331.5 |
| candidate / verification | 3,786,972 | 53,337,889 | 323.6–330.5 | 59.9–77.2 | 331.5 |
| candidate / encoding | 4,003,921 | 57,710,497 | 324.9–329.4 | 36.5–93.7 | 331.5 |
| candidate / decoding | 15,165,619 | 488,574,580 | 323.6–330.7 | 44.1–60.9 | 332.1 |

## Checkpoints, trust boundaries and remaining cost

- A exploratory single run: 13.72 s complete integration, 2.72 s fresh verification. This did not satisfy either 5x target; proceed to B.
- B exploratory single run: 6.02 s complete integration, 2.64 s fresh verification. Only integration passed; proceed to C.
- C's final full benchmark above satisfies both targets. Implementation stops at this approved checkpoint.
- Integer cache: 2,048 signed values per operation. Owned validation: 4,096 immutable rational/Q-polynomial values per owner/scope, ownership checked first. Custom coefficient domains are not shallow-cached. Root-log proof table: 128 complete immutable obligations per scope, keyed by verifier instance and exact owner/term/evidence identities. Eviction only rechecks work.
- Public entry boundaries start cold; internal modules share a scope. Cleanup removes cache state on return or failure, including exhaustion. Deep eligibility checking rejects mutable nested evidence; no caller object is frozen. No serialized proof flags or cross-operation proof cache exist.
- Cache-hit work/liveness, bounded integer truncation/conversion, native arithmetic result scratch, proof traversal and storage are charged. Historical budget counters change because performed work and accounting change; all four categories remain enforced.
- Shared-denominator conversion reconstructs every coefficient identity. Saved Bézout/gcd-one, inverse, weighted derivative, multiplication columns and independent Newton sums are all checked. Original nonvanishing conditions and final target/coverage checks remain in force.
- Proof construction still uses the general rational-function producer and synchronous BigInt. Its remaining cost is materially greater than replay; a new detailed CPU profile would be needed before assigning exact residual hotspot percentages. No claim of arbitrary-degree interactive latency or general CAS completeness is made.

## Durable memory and handoff

Updated current-state.md, decisions.md, open-questions.md, closed-questions.md, journal/2026-09/2026-09-28.md and this dossier. Specification and reconstruction roadmap updated under docs/architecture/calculus. Concurrent Graphing work was preserved; Graphing commits advanced HEAD independently during this gate and are not part of its patch. Next: separately reviewed rational application adoption, original exclusions, result authority and branch/display contract.

## Authorized commit verification — 2026-09-28

The user subsequently requested this milestone commit. Repository `npm run lint` passes with zero errors and two pre-existing Graphing hook warnings in useGraphWorkspaceController.ts. `npm run build` passes incremental TypeScript and the Vite production build (34.67 s). The original 138-test run plus final 22-test affected delta and accepted benchmark source hashes remain valid; no production implementation changed afterward. Memory/file-size validation and staged diff hygiene were refreshed for the integration-only commit. No full suite or Playwright is required for the isolated backend; no push is authorized.

Staged diff hygiene removed one trailing blank line from rational-decision-internal.ts; the separate final whitespace-only hash is recorded beside the original benchmark hashes. No executable source changed or performance rerun was needed.
