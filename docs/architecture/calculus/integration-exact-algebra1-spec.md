# INTEGRATION-EXACT-ALGEBRA1 — First Implementation Specification

Date: 2026-09-26
Status: implemented and backend-verified on 2026-09-26; private foundation only, not product-adopted. Included in the user-approved INTEGRATION-EXACT-ALGEBRA1 commit checkpoint.
Gate: backend only, one meaningful milestone. Internal checkpoints are not separate alphabet-suffix commits.

Dependencies: [approved direction and investigated design](integration-reconstruction-design.md), existing TypeScript/Vitest toolchain and native BigInt. No missing factorization, field-tower or canonical-result prerequisite is hidden inside this gate. The user explicitly approved implementation of this plan and selected mandatory execution-time identity verification.

## Outcome

Deliver a tested, private exact algebra kernel sufficient to support the next rational-reduction work. It must operate over `Q` and exercise recursive coefficients over `Q(t)`. It does not yet integrate user input or change any visible answer.

## Owned paths

New production files under `src/lib/symbolic-engine/integration/core/`:

- `execution.ts`: bounded arithmetic context and typed internal operation/resource/domain errors.
- `rational.ts`: canonical bigint rational construction and arithmetic.
- `field.ts`: concrete decidable-field contract and rational-field instance.
- `polynomial.ts`: canonical coefficient arrays, arithmetic, formal derivative and field context checks.
- `polynomial-division.ts`: division, exact division, Euclidean GCD and extended GCD.
- `polynomial-square-free.ts`: characteristic-zero square-free decomposition and reconstruction evidence.
- `rational-function.ts`: normalized field of fractions over `K[t]`, including exact inversion and formal differentiation.
- `linear-system.ts`: rectangular exact elimination with particular solution/nullspace or inconsistency evidence.
- `exact-wire.ts`: bounded rational/polynomial test-artifact serialization using decimal integer strings; no public result format.
- Co-located focused test files for these responsibilities. Split naturally if needed to respect size caps; do not create placeholder modules for future integration algorithms.

Allowed documentation/memory changes: the reconstruction design/roadmap, active dossier, journal, current state and relevant decision/question records.

Forbidden in this gate: edits to shared polynomial/scalar consumers, existing integration dispatch/facades, Calculus adapters, runtime hosts, result schemas, frozen files, Graphing, package dependencies or file-size baselines. The new modules have no production caller outside the new core. No source-mirror copying, download or external CAS execution.

## Required behavior

1. **Rationals.** Accept bigint and validated decimal integer strings; normalize sign and GCD; reject zero denominators. Any numeric ingress accepts only safe integer values. Never convert a bigint magnitude through `Number`. Test arithmetic beyond `2^53` and signed/zero normalization.
2. **Fields.** Operations are exact on validated operands and reject context mismatches. `isZero` is a decision for the concrete field, not an unknown-to-false conversion. Resource exhaustion is an execution result/error, not field equality. `fromInteger` uses bigint.
3. **Polynomials.** Use immutable canonical ascending coefficient arrays; strip trailing zero coefficients; zero has degree `-1`. Arithmetic and formal derivatives work over both `Q` and `Q(t)`. GCD is monic except `gcd(0,0)=0`; extended GCD verifies `s*a+t*b=gcd(a,b)`.
4. **Division and square-free decomposition.** Division checks `a=q*b+r` and remainder degree. Exact division rejects nonzero remainder. Square-free decomposition returns unit/content and monic pairwise-coprime factors with positive multiplicities; their product reconstructs the input. Explicitly define zero/constant behavior.
5. **Rational functions.** Reject zero denominator, cancel GCD and normalize denominator monic. Formal derivative follows the quotient rule. Construct the concrete field `Q(t)` using these operations and use it as polynomial coefficients in a separate variable `x`. Algebraically equivalent normalized values compare equal.
6. **Linear systems.** Exact Gaussian elimination over K, including rectangular, singular-consistent and inconsistent systems. A solution carries a particular vector plus kernel basis; verify `A*p=b` and `A*N=0`. Preserve row-operation evidence sufficient to verify inconsistency. A missing pivot alone is not inconsistency.
7. **Execution bounds.** One operation context covers nested arithmetic so recursion cannot reset the budget. Check operation count, coefficient bit lengths and allocation/degree size before large work. Report `resource-limit` with reason; no truncation, rounded fallback or guessed zero. Expose overridable limits for tests; production runtime budget tuning belongs to adoption.
8. **Wire discipline.** Plain JSON data with version/tag, bounded strings/arrays and canonical validation on decode. Reject invalid denominators, malformed integers, unsafe numeric input, and incompatible contexts. Encoding is for the private core's artifacts; raw bigint stays out of existing public envelopes.

## Acceptance cases and independent checks

| Group | Required evidence |
| --- | --- |
| Precision | `9007199254740991 * 3 = 27021597764222973`; `9007199254740992 + 1 = 9007199254740993`; large cross-canceling fractions and negative denominators. |
| Arithmetic laws | Deterministic generated nonzero denominators and signed integers: associativity/distributivity/inverses, canonical equality, and operands unchanged. Include known exact expected values, not only self-round-trips. |
| Polynomial identity | Verify quotient/remainder and Bezout identities using independent reconstruction; division by the zero polynomial is rejected. |
| Square-free | Reconstruct `(x-1)^3*(x+2)^2` with multiplicities; check each factor square-free and distinct factors coprime. Cover zero, constants and non-monic inputs. |
| Recursive coefficients | Divide/gcd polynomials in `x` over `Q(t)`; for example exact cancellation in `(x-t)*(x+t)`. Ensure variable/context mismatch fails rather than conflating `x` and `t`. |
| Linear algebra | Unique, underdetermined, inconsistent and row-swap systems over Q; repeat representative cases over `Q(t)`. Check residuals and nullspace, mutate evidence and require rejection. |
| Serialization | Known bigint literals survive encode/decode and JSON serialization; malformed/oversized inputs fail. No `Number` precision recovery from an already rounded value. |
| Resources | Tiny shared budgets stop nested operations deterministically; a larger budget computes the identical exact value. Exhaustion never returns a partial mathematical success. |
| Isolation | No new production imports outside core, no legacy source changes, no runtime dependency or result-schema change. |

Do not require a new property-testing package. Seeded bounded generators in tests are sufficient. If a separate Python `fractions.Fraction` oracle is used for selected fixtures, keep it a development check with explicit expected values, not a product dependency. No oracle is allowed to replace the kernel's own proof obligations.

## Verification and completion

Run:

- `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2`.
- `npx tsc -b --pretty false`.
- `npm run test:compartments-boundaries` and `npm run test:ooe-boundaries` to confirm isolation.
- `npm run test:memory-protocol`, `npm run test:file-sizes`, and `git diff --check`.
- Repository lint/build before a future runtime/source commit as required by `AGENTS.md`; do not substitute a full unit/UI suite for impact analysis.

No UI gate is claimed because this milestone has no product caller. Every subsequent app-visible adoption requires Playwright evidence. Do not run the whole integration corpus just to test a private arithmetic module.

Completion is recorded as **backend algebra foundation only** in the roadmap and dossier. The earlier design gate was committed as `3c5a292a`; the user subsequently explicitly authorized this implementation checkpoint. No push is authorized. Rational representation/subresultants remain the next separately scoped gate.

## Stop conditions

Stop and revise the design if generic operations require an unresolved equality oracle, if external dependencies become necessary, if a shared source/schema must change, or if mathematical prerequisites exceed the stated scope. Report the gap; do not insert node-simplifier or floating-point shortcuts. A failed law/identity test blocks the gate.

## Implemented contracts and evidence

- All production modules are private to `src/lib/symbolic-engine/integration/core/`; the production import graph is tested in both directions. Test support contains explicit test profiles, not application defaults.
- `ExecutionContext` requires finite safe integer work, integer-bit, degree and cumulative-allocation limits. It is immutable externally, its counters are private, and exhaustion is sticky. Work charges cover primitive calls and loops; allocation units conservatively cover slots, records, characters and integer scratch limbs, not measured heap bytes. Nested computations and their verifiers share the same context. Native BigInt operations remain synchronous.
- `Rational` construction is the only value ingress. Polynomial rings and fraction fields own immutable values with runtime membership checks; equal printed variable names do not confer field identity. Integer strings use canonical decimal notation; signs/GCD of the rational value are normalized.
- Public division, extended GCD/GCD, square-free decomposition, rational-function construction and linear solves perform mandatory checks before success. Verifiers reconstruct identities and may share checked lower-level arithmetic; computational division helpers remain private. Failures throw `AlgebraError` with a stable `code` and `reason`.
- Square-free zero input is invalid; a nonzero constant returns itself as scalar with no factors. Factors are monic and grouped by increasing positive multiplicity. Formal differentiation treats all coefficient-field values as constants.
- Linear input has explicit rows/columns, matrix and RHS. A consistent result returns rank, pivot columns, particular solution and complete canonical nullspace basis; an inconsistent result returns a checked left witness. Both carry frozen row operations and reduced rows. Replay validates invertible operations and echelon shape. Nullspace dimension and free-coordinate identity establish spanning/independence in addition to residual checks. Empty dimensions are supported.
- The private v1 wire codec supports Q and Q[z] only. It rejects extra fields, accessors, nonenumerable properties, malformed integers, noncanonical fractions, trailing zeros, mismatched variables and resource excess. Decoding binds the polynomial to the explicitly supplied Q ring; it does not transport in-process symbol identity or serialize Q(t) fields. Existing public envelopes receive no new payload.
- Focused evidence: 7 files / 60 tests pass, including 16 static large-rational fixtures independently generated with Python standard-library `fractions.Fraction` (seed 90173), seeded algebra/system cases, recursive Q(t) square-free and linear operations, certificate mutation and verification-time exhaustion. Python is not a runtime or test dependency.
- Incremental TypeScript, scoped ESLint, compartment boundaries (36 tests), OOE boundaries (8 tests), memory/file-size checks and diff hygiene pass. The September 27 commit checkpoint also completed repository lint (0 errors, two existing Graphing warnings) and production build. No full suite or app-output gate is claimed.
- Dossier: `.memory/sessions/2026-09/2026-09-26/2026-09-26__integration-exact-algebra1/`. Reconstruction remains subject to change when necessary.

## 2026-09-27 representation-gate update

The next [representation specification](integration-rational-representation1-spec.md) now separates `ExactRing`, `ExactIntegralDomain` and `ExactField`, and names polynomial coefficients `domain`. Ring arithmetic/storage is generic; field algorithms retain explicit type/runtime guards. Q[x], Q(t)[x], the scalar/polynomial wire format and all 60 original tests are preserved. This supersedes the earlier prospective representation handoff without changing the historical exact-algebra checkpoint evidence.

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
