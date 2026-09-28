# INTEGRATION-RATIONAL-PROOF-PERFORMANCE1

Date: 2026-09-28
Gate: backend, CRITICAL root-only, explicitly approved implementation.
Status: backend-verified; correctness, benchmark targets and required repository gates pass. The user subsequently authorized its milestone commit; no push.

Outcome: **faster exact rational proof construction and replay with unchanged verification guarantees**. Production changes stay inside the private integration core. No application caller, dependency, OOE change, staging, commit or push accompanies this gate. The roadmap remains subject to change when necessary.

## Preserved mathematical contract

The existing [decision specification](integration-rational-decision1-spec.md) remains authoritative for normalized Q(x) input, Hermite/LRT selection, exact root-log primitives, complete certificates, retained input/rational denominators and norm conditions. All entry-point signatures and version-1 scalar, polynomial, primitive and decision wire structures are preserved. Successful output still waits for every mandatory proof check. Standalone verification and artifact replay start without trusted proof state.

Prerequisites are the existing immutable owned rational/polynomial values, exact field/ring distinction, monic ring division, square-free quotient algebra, Bézout/inverse evidence, multiplication-basis traces, independent Newton sums and explicit execution limits. No new integration algorithm or equality oracle is introduced.

## Checkpoints and scope boundaries

A replaced repeated integer-size searches with bounded native BigInt truncation before conversion/hashing, exact 32-bit counting for small magnitudes and one binary conversion for larger magnitudes. Bounded integer-size memoization holds at most 2,048 signed values per operation. Owned rational and Q-polynomial validation can be reused within the exact same context and owner. Custom coefficient domains do not acquire polynomial validation caching from a shallow freeze. The exploratory A run was about 13.7 s integration / 2.72 s verification, insufficient for the two 5x targets.

B added operation-local successful root-log derivative proof reuse. Its exploratory result was about 6.02 s / 2.64 s: integration met the target, independent verification did not. C therefore replaced that derivative verifier's nested rational-function arithmetic with checked shared-denominator polynomial identities. The full accepted measurements are recorded in the linked dossier.

## Execution and proof lifetime

- Public decision integration/verification/encoding/decoding and primitive differentiation/verification/encoding/decoding open fresh execution scopes, even when passed the same ExecutionContext. Internal implementation modules compose calls inside a scope.
- Scope exit or failure clears integer entries and invokes cache cleanup unconditionally. No cache authority persists across independent operations, serialization or process restarts.
- Owned validation checks private ownership before reuse. It retains at most 4,096 values per owner/scope. Eviction causes revalidation, never a mathematical restriction.
- Each ScopedProof instance identifies one verifier kind. Its ordered identity key contains owner, term and complete derivative evidence; the target-independent term proof is the only mathematical obligation memoized. The whole primitive's target equality, final assembly and condition coverage are always checked.
- Proof reuse requires a deeply immutable plain record/array graph. Mutable outer or nested evidence, accessors, hidden/symbol members and custom evidence prototypes conservatively disable reuse. Concrete immutable kernel owners are opaque identities, with their mathematical values still covered by normal ownership checks. Caller objects are never frozen or mutated.
- Successful obligations enter the bounded 128-entry table only after full verification and cache-storage accounting. Exceptions and exhaustion do not register success. Every lookup consumes work and checks liveness.
- Integer truncation, conversion/negation, native arithmetic outputs, cache storage, traversal and polynomial scratch are charged. Work, cumulative allocation, bit-length and degree limits remain explicit and adjustable; historical counter totals are not compatibility contracts. Allocation units are logical cumulative accounting, not measured heap bytes. Exhaustion remains sticky.

## Shared-denominator proof arithmetic

For a polynomial in Q(x)[z], SharedDenominator constructs a common nonzero Q[x] denominator and a Q[x][z] numerator. Conversion checks every identity `N_i*d_i = n_i*D` exactly. Owned input views, checked monic modulus data and Newton sums are reused only within that verifier's local arithmetic object.

Bézout checks clear denominators and prove `s*G+t*q=1`; the explicit gcd-one check supplies divisibility. The saved inverse is checked against `s mod q`, and its product with G is checked against one. The weighted logarithmic derivative identity is checked after clearing denominators. Reductions use the existing verified monic-division primitive over Q[x], requiring no field assumption about the square-free quotient.

Every saved multiplication-basis column is still verified against the shifted representative modulo q. Its diagonal sum must equal the saved trace, and an independent Newton-sum evaluation must equal that same trace. The generic quotient algebra and its nonunit/splitting behavior are unchanged. Tests exercise reducible moduli and compare cleared trace checking with the existing general checker.

Clearing a denominator is an exact identity transformation over Q(x), never permission to discard an original nonvanishing condition. All stored certificates, source denominators and norm conditions survive unchanged.

## Acceptance and reproducibility

The opt-in harness is `src/lib/symbolic-engine/integration/core/__tests__/proof-performance.ts`. It runs serially under Node 24 with one warm-up and three measured runs, fresh contexts per operation, identical explicit limits, and separate integration, verification, encoding and decoding measurements. JSON parsing and input setup are outside these timers. It records elapsed time, work/allocation counters, RSS, heap-used and process high-water RSS. Warm-up warms JIT, never mathematical proof state.

The baseline is unchanged commit `3a96622c` extracted into an ignored directory. The same harness and machine measure both versions. `--compare` requires matching Node, limits and run counts, then enforces at least 5x lower quintic integration/verification medians and no other regression above max(20%, 20 ms). Timing assertions are absent from ordinary tests.

```sh
mkdir -p .task_tmp/integration-rational-proof-performance1/baseline
git archive 3a96622c src/lib/symbolic-engine/integration/core | tar -x -C .task_tmp/integration-rational-proof-performance1/baseline
node src/lib/symbolic-engine/integration/core/__tests__/proof-performance.ts --core .task_tmp/integration-rational-proof-performance1/baseline/src/lib/symbolic-engine/integration/core --output .task_tmp/integration-rational-proof-performance1/baseline.json
node src/lib/symbolic-engine/integration/core/__tests__/proof-performance.ts --output .task_tmp/integration-rational-proof-performance1/candidate.json --compare .task_tmp/integration-rational-proof-performance1/baseline.json
```

The corpus includes the generic quintic, its logarithmic derivative, quadratic/quartic denominators, repeated poles/residues, degree-loss specialization and three independent seeded rational/logarithmic derivatives. A tracked baseline quintic artifact proves old version-1 replay without calling Hermite, LRT or Brown producers.

Correctness coverage includes the original 122 tests plus signed exact bit boundaries, stricter contexts, cache eviction/lifetime, failed/exhausted checks, mutable nested certificates, changed domains/moduli/weights/inverse witnesses/traces/targets/conditions, shared-denominator conversion/cancellation, reducible quotients and baseline artifact replay.

Full evidence: [verification dossier](../../../.memory/sessions/2026-09/2026-09-28/2026-09-28__integration-rational-proof-performance1/verification-summary.md). Required gates are focused Vitest with two workers, incremental TypeScript, scoped lint, isolation, compartment/OOE checks, memory/size validation and diff hygiene. Repository lint/build remain required before a separately authorized source commit. No full suite or Playwright applies to this isolated backend.

## Handoff

Proof construction still uses synchronous BigInt and general rational-function normalization in the producer. Faster verification does not establish latency guarantees for arbitrary input degrees. Future profiling should guide any further optimization. Input lowering, original-expression exclusions, result authority, branch/display semantics and application adoption remain separate reviewed work.

## Authorized commit checkpoint — 2026-09-28

After implementation and performance acceptance, the user requested the milestone commit and discussion of the next gate. The commit includes only this integration lane and its evidence. Required repository lint/build and final commit checks are recorded in the dossier. Rational adoption remains a separate design/implementation decision; no push is authorized.
