# INTEGRATION-HYPEREXPONENTIAL-DECISION1 verification

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

## Scope and status

2026-09-30; backend, CRITICAL, root-only. Implements the user-approved one-product gate: b(x) exp(r(x)), with b,r in owned Q(x), r nonconstant, producing checked elementary or non-elementary decisions. User subsequently authorized committing the completed milestone; no push. Pre-existing September 28 Agent Attention edits remain outside this task.

## Verification evidence

- Full focused core run: `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2` passed 304 tests in 22 files, 10.29 s. It retained all 240 previous tests, including isolation and existing wire formats, and the initial 64 new tests.
- A subsequent added test specifically exhausts work inside the RDE stage and checks that the same request context is used. All 23 decision tests passed in 1.44 s; no production change followed the full core run. A final owned-context guard rejects prototype-forged field owners with a typed domain-mismatch error before private methods run. The affected hyperexponential/differential/isolation run passes 107 tests in 5 files (two workers, 4.32 s), including that second added test. Combined coverage is 306 core tests (240 retained + 66 new).
- Incremental TypeScript and scoped ESLint pass on the implementation, decoder refactor and new tests.
- OOE boundaries: 8 tests plus validator pass (26 TypeScript / 6 Rust).
- Compartment boundaries: 36 tests plus validator pass (1,577 source files; 26 OOE TypeScript / 6 Rust).
- Existing differential artifacts continue to rebuild completely fresh towers with expected-construction checks. The new composition helper instead binds exactly Q and Q(x) to the supplied owner and reconstructs one fresh extension from evidence. Its function-specific meaning is checked by the hyperexponential verifier.
- Positive, inverse-alias and negative artifacts replay with integration, exponential/logarithmic admission, derivative, RDE, root-search, denominator, degree, matrix and linear-system producers disabled. Nested RDE replay retains its previously verified producer-disabled tests.
- Mutations cover exponent shifts with unchanged derivatives, aliases, admission/derivation hypotheses, reduction identifiers, RDE targets/bounds/witnesses, primitive mapping, derivative evidence and conditions. Strict replay rejects noncanonical data, missing/duplicated evidence, foreign construction, cyclic/sparse/accessor data and oversized envelopes. Mutable/frozen-outer artifacts do not gain trust from an earlier successful replay.
- Resource tests distinguish unsupported constant exponents from invalid ownership, failed proofs and sticky exhaustion during admission, the RDE stage, final verification, encoding and decoding. Whole-envelope bounds apply before nested codecs.
- No Playwright: there is no new application caller, parser, UI or public-result behavior. User subsequently authorized the commit; repository lint/build are run for that checkpoint and recorded below.

## Completeness and authority

The specification documents the Liouville coefficient argument over C(x,T), T=exp(r), and descent through the RDE's rational finite linear system. Checked admission rules out n r'=v'/v over complex rational functions too. Logarithmic derivatives have no positive T power at infinity, forcing the coefficient equation u'+r'u=b. Verified pole/infinity bounds contain every C(x) solution; the rational inconsistency witness remains contradictory after extending constants. This is a documented theorem with executable hypothesis/certificate checking, not a proof-assistant formalization.

Both outcomes retain the full original exponent, including additive constants. The generator alias is checked separately; no inverse-generator source restriction is invented. Input coefficient/exponent denominators and successful primitive-coefficient denominators remain explicit. The RDE universal denominator is never promoted to a source exclusion.

## Representative measurements

Serial run through `npx vite-node .task_tmp/integration-hyperexponential-decision1/measure.ts`, Node v24.19.0, after tests completed and without another heavy verification process. Single observations per operation, with fresh execution/proof state and normalized inputs prepared outside the measured operation. No speed target or timing-sensitive unit assertion. The complete raw observations, including process RSS, are preserved in measurements.jsonl.

Profile: work 20 billion; cumulative allocation 1 trillion; integer bits 2,048; degree 256. Bounds: tower height 8; artifact depth 64; nodes 100,000; bytes 16 MiB. Work/allocation counters are execution safeguards, not free RAM. RSS includes the Vite runner and module-loading overhead (approximately 1.97–1.98 GB in the final run); these observations do not isolate kernel peak/live memory.

| Fixture | Operation | ms | Work | Allocation units |
| --- | --- | ---: | ---: | ---: |
| 2x-exp-x2 | integrate-checked | 22.060 | 733,328 | 6,316,779 |
| 2x-exp-x2 | verify-fresh | 5.085 | 272,413 | 2,212,209 |
| 2x-exp-x2 | encode-checked | 25.148 | 476,481 | 3,817,687 |
| 2x-exp-x2 | decode-replay | 13.585 | 545,981 | 4,399,911 |
| negative-exp-x2 | integrate-checked | 6.701 | 364,685 | 3,543,336 |
| negative-exp-x2 | verify-fresh | 1.830 | 102,077 | 944,092 |
| negative-exp-x2 | encode-checked | 4.296 | 204,984 | 1,799,906 |
| negative-exp-x2 | decode-replay | 4.965 | 244,197 | 2,146,397 |
| negative-exp-x-over-x | integrate-checked | 12.623 | 585,860 | 5,440,942 |
| negative-exp-x-over-x | verify-fresh | 22.152 | 200,751 | 1,759,080 |
| negative-exp-x-over-x | encode-checked | 5.425 | 280,627 | 2,362,877 |
| negative-exp-x-over-x | decode-replay | 7.541 | 359,153 | 3,119,671 |
| negative-exp-inverse-x | integrate-checked | 14.516 | 816,956 | 8,411,212 |
| negative-exp-inverse-x | verify-fresh | 4.603 | 243,049 | 2,460,794 |
| negative-exp-inverse-x | encode-checked | 8.879 | 495,358 | 4,840,880 |
| negative-exp-inverse-x | decode-replay | 25.623 | 671,449 | 6,630,383 |
| inverse-x-positive | integrate-checked | 26.500 | 1,291,750 | 12,276,034 |
| inverse-x-positive | verify-fresh | 8.185 | 474,215 | 4,358,496 |
| inverse-x-positive | encode-checked | 32.276 | 816,960 | 7,412,419 |
| inverse-x-positive | decode-replay | 20.369 | 1,090,088 | 10,139,363 |
| negative-orientation | integrate-checked | 81.399 | 3,272,647 | 27,693,545 |
| negative-orientation | verify-fresh | 47.491 | 1,533,397 | 12,929,462 |
| negative-orientation | encode-checked | 66.349 | 2,705,913 | 22,589,580 |
| negative-orientation | decode-replay | 88.698 | 3,274,024 | 27,459,786 |
| rational-coefficient | integrate-checked | 65.708 | 2,871,788 | 27,197,114 |
| rational-coefficient | verify-fresh | 25.425 | 1,189,943 | 10,996,202 |
| rational-coefficient | encode-checked | 56.240 | 2,058,267 | 18,834,377 |
| rational-coefficient | decode-replay | 53.213 | 2,352,775 | 21,839,307 |
| shifted-exponent | integrate-checked | 8.451 | 469,053 | 4,049,190 |
| shifted-exponent | verify-fresh | 3.209 | 159,332 | 1,277,829 |
| shifted-exponent | encode-checked | 5.786 | 316,192 | 2,425,323 |
| shifted-exponent | decode-replay | 19.612 | 376,357 | 2,910,173 |
| zero-with-pole-exclusion | integrate-checked | 14.926 | 889,239 | 8,818,669 |
| zero-with-pole-exclusion | verify-fresh | 5.601 | 287,150 | 2,771,248 |
| zero-with-pole-exclusion | encode-checked | 9.826 | 578,531 | 5,424,324 |
| zero-with-pole-exclusion | decode-replay | 30.341 | 763,426 | 7,296,566 |

The inverse-generator and rational-coefficient fixtures cost more than simple direct generator arithmetic. This follows their additional normalized recursive fraction operations and proof checks; no optimization claim or acceptance target is inferred. Complete decisions ranged from 6.701 to 81.399 ms in this small corpus. Other accepted rational inputs can require substantially more work or exhaust the explicit profile.

## Final workflow checkpoint

Memory protocol (24 tests plus validator), file sizes (10 tests plus validator; 2,338 files and 5 existing baseline caps) and diff hygiene pass. Commit authorization was received after the initial implementation checkpoint. The final source-commit lint/build and index audit follow below; no push.

## User-requested matched arithmetic comparison

Serial same-process Node v24.19.0 comparison: b=1, r=x versus r=-x. One warm-up and three measured runs for each operation, each with fresh execution/proof state. No other heavy verification job ran concurrently. Counter values are deterministic across the three runs. These small repeated measurements quantify this case, not a universal speed ratio. Raw median/min/max and counters are preserved in arithmetic-comparison.jsonl.

| Operation | exp(x) median (min–max) ms | exp(-x) median (min–max) ms | Time ratio |
| --- | ---: | ---: | ---: |
| integrate | 9.491 (8.976–16.352) | 83.343 (79.101–92.054) | 8.78x |
| verify | 5.487 (4.021–14.975) | 42.481 (32.697–44.272) | 7.74x |
| encode | 6.809 (6.662–6.964) | 69.173 (67.934–78.044) | 10.16x |
| decode | 10.718 (8.422–15.925) | 90.165 (79.037–92.424) | 8.41x |

Complete integration uses 453,494 versus 3,272,647 work units (7.22x), and 3,878,790 versus 27,693,545 cumulative allocation units (7.14x). These allocation units are not RAM bytes. The median complete-run overhead is about 74 ms.

Source inspection identifies a structural cause worth profiling: positive-orientation exponential admission represents exp(-x) as the inverse generator. `RationalFunctionField.make` has a constant-denominator fast path; nonconstant denominators exercise checked GCD/exact division, while the independent dual-number path also evaluates quotient inverses. The general recursive representation is mathematically correct but gives simple inverse monomials substantially more work. No arithmetic optimization was folded into this capability gate.

Recommended next discussion: a private differential-arithmetic performance gate, profiling normalization/validation/proof costs and developing checked monomial/Laurent fast paths if justified, with unchanged proof requirements, entry signatures and saved formats. Target selection requires its own plan. Finite sums follow once that cost is understood; no new implementation is authorized.

## Authorized source commit checks

- `npm run lint`: passed with zero errors and two existing Graphing ref-cleanup warnings in `useGraphWorkspaceController.ts`.
- `npm run build`: passed (`tsc -b` and Vite, 4,565 modules, Vite 37.16 s); existing Graphing mixed static/dynamic import warning remains.
- Final staging is restricted to this gate's core sources/tests, specification, roadmap and durable-memory records. Concurrent Graphing source edits and the two September 28 Agent Attention records are excluded.
- No application caller changed, no Playwright gate applies, and no push is authorized.
