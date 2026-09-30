# INTEGRATION-DIFFERENTIAL-ARITHMETIC-PERFORMANCE1

Date: 2026-09-30. Backend milestone; approved CRITICAL, root-only.
Status: backend verified at checkpoints A/B; both 5x targets and corpus regression checks pass. User subsequently authorized the milestone commit; no push.

## Contract and prerequisites

Accelerate shared exact differential arithmetic, preserving native BigInt, owned immutable values, normalized fractions, generator orientation, admission rules, independent dual-number derivative verification and all version-1 artifacts. No new integration capability, dependency, parsing, UI behavior, OOE or public-result changes.

Prerequisites already exist: registered differential owners and recursively immutable values, `OwnedValidation`, polynomial operations over exact fields, checked GCD/exact division, independent coefficient/dual derivative paths, full RDE/hyperexponential replay and explicit budgets. Production changes remain in the private core. Custom coefficient domains receive no new validation caching.

## Implemented arithmetic and proofs

A adds a private `OwnedValidation` instance to each differential owner. Membership is checked before lookup. Recursive value validation succeeds before registration; context tokens isolate cache state, every hit charges work/checks liveness, retention is capped at 4,096 values per owner/scope, and cleanup runs on return/failure. New cache containers and entries are charged. Values used in a stricter context are rechecked. No caller certificates are frozen or cached by this change.

B detects denominators `c*t^k` by exact coefficient zero tests. For nonzero numerator n with lowest nonzero power j, cancel min(j,k), divide coefficients by c and construct the monic denominator. Coprimality is checked by the normalized denominator shape and either degree zero or nonzero numerator constant coefficient. The original/new cross-product identity is always reconstructed. Zero remains 0/1.

Addition aligns numerator powers over the larger monic denominator. Multiplication cancels numerator powers against the other denominator before creating the product, with each removed power checked by polynomial reconstruction. It then normalizes and verifies the fraction. Degrees and scratch allocation are checked before shifted arrays. Inversion uses the same constructor. Other denominator shapes retain the original general Euclidean algorithm and verification.

This is a specialization of arithmetic over an exact coefficient field, not a new Laurent representation or function admission. A nonzero constant coefficient is a unit over any such field; no irreducibility assumption is involved. All proof checks remain exact, and the general derivative checker remains independent of the derivative producer.

Checkpoint C is authorized only if A/B fail acceptance: scoped immutable derivative-proof reuse with fresh external boundaries. It is not implemented unless the dossier records that escalation. Stop implementation when both targets and regression/correctness gates pass.

## Performance contract

Baseline: `b4517300`. Same machine, Node version, harness and finite limits; serial measurements with no other heavy verification job. Two warm-ups/five measured runs; median/min/max and work/allocation/RSS/heap observations. Profiles are collected separately. Input setup, file I/O and JSON parsing are excluded; each operation begins without trusted proof state.

Target: at least 5x lower median complete verified integration and fresh verification for exp(-x). Encoding/decoding and every other corpus operation may not regress beyond max(20%,20 ms). The opt-in harness contains timing assertions; ordinary tests do not.

Corpus: eleven single-product positive/negative/zero/shift/rational-coefficient cases, five generator/Laurent/log/tower derivative cases, and the ten-case existing rational corpus including the generic quintic. Initial arithmetic profile: work 20 billion, cumulative allocation 1 trillion, integer bits 2,048, degree 256; differential/artifact bounds 8/64/100,000/16 MiB. Limits are unchanged and counters charge performed work; they are not wall-time or free-memory guarantees.

```sh
node src/lib/symbolic-engine/integration/core/__tests__/differential-performance.ts --core .task_tmp/integration-differential-arithmetic-performance1/baseline/src/lib/symbolic-engine/integration/core --output .task_tmp/integration-differential-arithmetic-performance1/baseline-final.json
node src/lib/symbolic-engine/integration/core/__tests__/differential-performance.ts --output .task_tmp/integration-differential-arithmetic-performance1/candidate-final.json --compare .task_tmp/integration-differential-arithmetic-performance1/baseline-final.json
```

## Verification and handoff

Retain 306 core tests. New tests cover monomial cancellation, general Euclidean and seeded identity oracles, nested fields, independent derivatives, stricter contexts, custom mutable domains, foreign/forged values, cache eviction/failure/exhaustion, shifted allocation bounds and old positive/negative artifacts with producers disabled. Existing mutation/replay tests retain target, rule, admission, alias, condition, mutable-evidence and final-proof coverage.

Run core plus affected New Integration service/result tests with two workers, incremental TypeScript, scoped lint, isolation, OOE/compartments, memory/file-size and diff checks. Inspect polynomial, root-log and source-condition results visually through npm run dev and Playwright because shared arithmetic already has an adopted rational caller. No full suite. Repository lint/build remain gates for a separately authorized commit.

Evidence: [milestone dossier](../../../.memory/sessions/2026-09/2026-09-30/2026-09-30__integration-differential-arithmetic-performance1/verification-summary.md). Finite exponential sums remain a later capability gate; wider admissions and hyperexponential product adoption remain separate. Roadmap sequencing is subject to change when necessary.

## Separate user-requested presentation correction

During implementation the user requested a small sigma-spacing fix. One presentation-only change outside the core removes the expanded sum subscript textstyle override. It has independent visual/display regression evidence and does not widen arithmetic scope or change canonical schemas.

## Accepted result

Final same-machine exp(-x) medians: complete integration 67.418 → 9.696 ms (6.95x); fresh verification 29.521 → 4.899 ms (6.03x); encoding 52.273 → 8.062 ms; decoding 64.602 → 8.551 ms. All 94 measured operations pass their targets/tolerances. 306 retained + 17 new core tests and 36 affected adoption tests pass; final accounting delta is verified. No checkpoint C proof reuse was needed. Full spread, counters, CPU-profile diagnosis and source-commit evidence are in the dossier.
