# INTEGRATION-EXACT-ALGEBRA1 — First Implementation Specification

Date: 2026-09-26
Status: ready for task-specific implementation approval; not implemented by the design milestone.
Gate: backend only, one meaningful milestone. Internal checkpoints are not separate alphabet-suffix commits.

Dependencies: [approved direction and investigated design](integration-reconstruction-design.md), existing TypeScript/Vitest toolchain and native BigInt. No missing factorization, field-tower or canonical-result prerequisite is hidden inside this gate.

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

Before completion, record evidence and update the capability ledger as **backend algebra foundation only**. Before any commit, obtain explicit user approval; the current instruction is no commit. Then proceed to the rational representation/subresultant gate after its scope is approved.

## Stop conditions

Stop and revise the design if generic operations require an unresolved equality oracle, if external dependencies become necessary, if a shared source/schema must change, or if mathematical prerequisites exceed the stated scope. Report the gap; do not insert node-simplifier or floating-point shortcuts. A failed law/identity test blocks the gate.

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
