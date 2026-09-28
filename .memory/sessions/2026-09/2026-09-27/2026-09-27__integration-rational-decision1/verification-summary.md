# Rational decision verification

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

## Backend evidence — 2026-09-27

- `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2`: **13 files / 122 tests pass**, including all 84 existing tests and production import isolation; final run 44.03s.
- `npx tsc -b --pretty false`: pass on the final run. An earlier run encountered TS1128 in the concurrently edited Graphing file `useGraphGestureSampling.ts`; no change was made to that lane. The later run passed after the other agent's edit settled.
- `npx eslint src/lib/symbolic-engine/integration/core`: pass, no warnings.
- `npm run test:compartments-boundaries`: 36 tests and validator pass.
- `npm run test:ooe-boundaries`: 8 tests and validator pass.
- `npm run test:memory-protocol`: 23 tests and validation pass. `npm run test:file-sizes`: 10 tests and validation pass, no baseline edits. `git diff --check`, new-file whitespace and local specification links pass.
- Logs: `.task_tmp/integration-rational-decision1/` (ignored temporary evidence).
- Repository lint/build were not run: they remain required before a subsequently authorized source commit. No full suite, Playwright or app-visible capability claim belongs to this backend gate.

## Acceptance evidence

- Automatic integration: zero, constants, improper and nonmonic-constructed inputs, repeated linear/irreducible poles, mixed multiplicities, 1/(x²+1)² with independently known rational part, 1/(x²+1), x/(x²−1), 1/(x⁴+1), (5x⁴−1)/(x⁵−x−1), and nontrivial 1/(x⁵−x−1), without root solving.
- Degree-loss fixture 1/x+3/(x−1)−1/(x−2) preserves PRS input degrees [3,2] and original index 1 on both components, while recording specialized B degrees [1,2]. Its tree is factor-first and exact coverage is checked.
- Repeated residues, multiple residue-multiplicity groups, abnormal PRS drops, highest-degree selection, ring monic division with zero divisors, zero/constant/equal/lower-degree divisions and foreign ownership are covered.
- Seed 271828 constructs five independent derivatives of a/(x−pole)+b log(x−pole)+x³/3. Tests compare exact functions, not printed primitives.
- Full JSON round trips cover fresh owner contexts, zero/polynomial, repeated-pole, abnormal-drop, highest-selection and split derivations. Replay succeeds with Hermite, LRT and Brown producers mocked to throw, proving saved certificates are used.
- Rejections cover altered Hermite steps/multiplicities, scaling/indices, specialization degrees, partition order/split factors/duplicate coverage, normalization and final inverse witnesses, monic division, weights, traces, explicit targets, retained conditions, missing/extra nested evidence, noncanonical coefficients, accessors, sparse/cyclic malformed records, wrong variables and wrong expected input.
- Construction, decoding and final verification resource stops are distinct typed failures. Final replay tests exhaust one work unit before a known successful verification/decode completes. No partial mathematical success is returned.
- Rational-function shortcuts retain operand immutability and ownership checks even for zero/one operations; normalization continues checking monicity, coprimality (or the unit-denominator proof), and exact cross multiplication.

## Representative resource measurements

Node v24.19.0; final focused test run, max two workers. Counters include fixture input construction and all mandatory verification; elapsed time covers `integrateRational` only. Allocation is **cumulative logical units**, not live heap bytes. Timings are observations, not product latency guarantees.

Explicit finite profile: work 20,000,000,000; allocation 1,000,000,000,000; integer bits 2,048; degree 256. No application default or algorithmic degree ceiling was introduced.

| Input | Work units | Allocation units | Elapsed |
| --- | ---: | ---: | ---: |
| 0 | 20,364 | 191,337 | 3 ms |
| 3 | 41,231 | 447,992 | 2 ms |
| (x²+1)/(x−1) | 2,069,233 | 21,988,504 | 61 ms |
| 1/(x²+1)² | 14,377,993 | 166,143,949 | 272 ms |
| 1/(x²+1) | 12,931,619 | 143,466,846 | 240 ms |
| x/(x²−1) | 2,478,887 | 26,721,946 | 49 ms |
| 1/(x⁴+1) | 39,153,196 | 459,453,034 | 710 ms |
| (5x⁴−1)/(x⁵−x−1) | 8,169,732 | 135,125,771 | 161 ms |
| 1/(x⁵−x−1) | 1,820,324,223 | 54,338,531,763 | 41,731 ms |
| 1/x+3/(x−1)−1/(x−2) | 28,016,323 | 393,152,037 | 589 ms |

The first exploratory quintic run exhausted a 100-billion allocation profile with integerBits 16,384 before the arithmetic shortcuts. Allocation charging itself depends on the configured integer-bit bound, so those counters are not directly comparable to the final 2,048-bit profile. A subsequent pre-shortcut exploratory run was stopped before completion. The completed final evidence is the table above. Synchronous BigInt verification of a generic quintic is still expensive; application adoption must account for this rather than implying interactive latency.

## 2026-09-27 stage profile and authorized commit checkpoint

The user subsequently authorized committing this milestone and requested an explanation of performance and remaining work. No production change accompanied this investigation; the temporary stage harness called the existing producers/verifiers and stayed in `.task_tmp/integration-rational-decision1/`.

For 1/(x⁵−x−1), stage observations were:

| Stage (including its existing checks) | Elapsed | Work units |
| --- | ---: | ---: |
| Hermite reduction | 27 ms | 715,005 |
| LRT construction | 180 ms | 8,137,110 |
| Primitive assembly/norm rechecks | 10 ms | 488,356 |
| Derivative construction and target verification | 33,168 ms | 1,457,219,148 |
| Final complete decision replay | 8,209 ms | 353,724,108 |

The term has a degree-five residue modulus and a linear-in-x argument whose constant coefficient has residue degree four. The contrasting (5x⁴−1)/(x⁵−x−1) fixture has a degree-one residue modulus, argument degree five in x, and took about 163 ms across those stages (27/46/0/53/37 ms). Thus denominator degree alone does not explain cost. Almost all generic-quintic time is derivative proof construction/verification plus replay. Source inspection shows repeated rational-function normalization/GCD work inside quotient arithmetic and repeated proof checks at nested boundaries; these are optimization candidates, not separately quantified hotspots. This is not a profile of native BigInt internals or a guarantee of the speedup available.

Recommended follow-up for discussion: profile the derivative verifier more finely, then consider shared-denominator/fraction-free quotient arithmetic and reuse of context-bound verified immutable evidence while preserving the required identities. No proof weakening, optimization gate implementation, dependency or OOE change was authorized by this discussion.

Commit checks: repository lint passes with 0 errors and two pre-existing Graphing hook warnings. Repository TypeScript/Vite build passes (34.82s). The 2026-09-28 focused commit rerun passes 122/122 tests with two workers (43.36s). Refreshed memory/file-size and staged-diff checks pass before commit. The operating snapshot and journal reflect the new day; earlier milestone dates remain historical. No full suite or Playwright applies to the isolated backend.
