# EQUATION-EXACT-ALGEBRA1 — First Implementation Specification

Date: 2026-10-03
Status: implemented and backend-verified on 2026-10-03; private foundation only, with no production caller.
Gate: backend only, one meaningful milestone. Internal checkpoints are not separate alphabet-suffix commits.

Dependencies: the [design](equation-reconstruction-design.md), and the existing TypeScript/Vitest toolchain with native BigInt. No dependency, schema, workspace or production caller is added.

## Outcome

A tested, private exact-algebra substrate for the Equation core, sufficient for the algebraic-numbers gate and slice 1. It also establishes the core's enforcement rails from day one:

- the isolation test;
- the typed resource model;
- the no-caps ratchet.

## Owned paths

New production files under `src/lib/symbolic-engine/equation/core/`:

- `execution.ts`: the execution context. It counts work and allocation units, and its stop reason is exactly `'work' | 'allocation' | 'cancelled'`. Exhaustion is sticky. Its counters are private. `checkCancelled` is a cooperative hook for adapters.
- `algebra/integer.ts`: bigint helpers: Lehmer/binary GCD, extended GCD, integer square root and bit length. Every operation is charged to the context.
- `algebra/rational.ts`: canonical reduced rationals; the only value ingress.
- `algebra/modular.ts`: arithmetic mod p, deterministic prime selection, Chinese remaindering and rational reconstruction.
- `algebra/polynomial.ts`: immutable dense ascending univariate polynomials over ℚ and ℤ. Includes arithmetic, Karatsuba multiplication above a measured crossover, formal derivative, evaluation, content and primitive part.
- `algebra/polynomial-division.ts`: division, exact division and pseudo-division, each with checked identities.
- `algebra/polynomial-gcd.ts`: modular GCD (Brown), a subresultant PRS fallback, and extended GCD with a Bézout witness.
- `algebra/square-free.ts`: Yun's decomposition, with reconstruction and pairwise-coprimality evidence.
- `algebra/subresultant.ts`: the subresultant chain and resultant, checked against small independent determinant oracles in tests.
- `algebra/linear.ts`: fraction-free Bareiss elimination, with rank, solution, nullspace or an inconsistency witness.
- `algebra/wire.ts`: a private versioned JSON wire format for rationals and polynomials, using decimal integer strings.
- `isolation.test.ts`: the core imports nothing outside itself, and nothing outside the core imports it. There are no adapters yet.
- `no-caps.test.ts`: scans core production files and fails on solver-limit constants matching `MAX_|_LIMIT|_CAP|_DEPTH|_BUDGET`, and on stop reasons other than the three typed ones.
- Co-located focused tests. Respect the 1,000-line production cap and the 1,500-line test cap by splitting by responsibility.

Allowed documentation and memory changes: this spec, the roadmap, the dossier, the journal, current state, and decision/question records.

Forbidden: edits to old `src/lib/equation/`, `symbolic-engine/primitives`, the integration core, shared result contracts, runtime hosts, OOE, UI, package dependencies or file-size baselines. No imports from the integration core (design decision 2).

## Required behavior

1. **No shape limits.**
   - Degree, coefficient size, matrix size and recursion depth are bounded only by the execution context's work and allocation units.
   - Large BigInt operations are charged in proportion to their limb sizes *before* they run, so the budget reflects their cost.
   - A single native BigInt operation is synchronous and cannot be interrupted midway. That is documented, not capped.
2. **Rationals.** These follow the integration precedent:
   - accept bigint, canonical decimal integer strings and safe integers;
   - reject zero denominators;
   - never pass magnitudes through `Number`.
3. **Polynomials.**
   - Canonical immutable arrays with no trailing zeros; zero has degree −1.
   - GCD is monic over ℚ and primitive with a positive leading coefficient over ℤ.
   - Variable identity is explicit: equal names in different rings are not the same ring.
4. **Modular GCD.**
   - Results are verified by exact division of both inputs.
   - An unlucky prime is detected and replaced.
   - The verified result is identical to the subresultant fallback on all fixtures.
5. **Square-free decomposition.**
   - Factors are monic, pairwise coprime and square-free, and their product reconstructs the input exactly.
   - Zero input is invalid; constants return no factors.
6. **Subresultants.** Every chain element has the expected degree, and the resultant equals the determinant oracle on small cases. They work over ℤ and ℚ. A coefficient domain of ℚ[t] is deferred to the parameters gate.
7. **Bareiss.** Covers unique, underdetermined, inconsistent and row-swap systems; results are checked through residual, nullspace and witness. No n! expansion is used anywhere.
8. **Errors.** Every failure has a stable code: `invalid-input`, `domain-mismatch`, `division-by-zero`, `nonexact-division`, `resource` (with reason `work`, `allocation` or `cancelled`) or `verification-failed`. A resource stop never returns a partial mathematical value.

## Acceptance cases

| Group | Required evidence |
| --- | --- |
| Precision | 9007199254740991·3 = 27021597764222973; cross-cancelling 300-digit fractions |
| Laws | Seeded ring and field laws on rationals and polynomials, with known expected values, not only round trips |
| GCD | Modular versus subresultant agreement; Bézout identity; deliberately unlucky-prime fixtures; degree-200 inputs with 500-bit coefficients |
| Square-free | (x−1)³(x+2)² reconstructed; already square-free inputs, high-multiplicity factors and non-monic integer inputs; degree 100 |
| Resultants | Determinant oracle agreement for degrees ≤ 6; a degree-40 pair completes, a size the old 720-term cap rejects |
| Linear | Over ℚ: unique, singular-consistent, inconsistent and empty-dimension cases; mutated witnesses rejected |
| Resources | A tiny shared budget stops nested work deterministically, and a larger budget yields the identical exact value. Large problems succeed under default test budgets; the old engine's caps are not reproduced. |
| Ratchets | Isolation test and no-caps test pass. A deliberately inserted `MAX_DEGREE` constant in a scratch fixture makes the ratchet fail (tested). |

Independent oracles (for example Python `fractions` for selected fixtures) may generate static expected values. They are never a runtime or test dependency.

## Verification and completion

Run:

- `npx vitest run src/lib/symbolic-engine/equation/core --maxWorkers=2`;
- `npx tsc -b --pretty false`;
- scoped ESLint;
- `npm run test:compartments-boundaries` and `npm run test:ooe-boundaries`;
- `npm run test:memory-protocol`, `npm run test:file-sizes` and `git diff --check`.

There is no UI gate and no full suite.

## Stop conditions

Stop and revise the design if any of these happens:

- an algorithm cannot be expressed without a shape limit;
- an identity check fails;
- a dependency or shared-source change becomes necessary.

Report the gap; never insert a floating-point or simplifier shortcut.

## Implemented contracts and evidence

- Production modules under `src/lib/symbolic-engine/equation/core/`:
  - `execution.ts`;
  - `algebra/integer.ts`, `rational.ts`, `modular.ts`, `domain.ts`, `polynomial.ts`, `polynomial-division.ts`, `subresultant.ts`, `polynomial-gcd.ts`, `square-free.ts`, `linear.ts`, `wire.ts`.

  There are about 1,950 lines including tests. Nothing outside the core imports them, and they import nothing outside the core.
- The domains `ZZ` (bigint) and `QQ` (canonical rationals) implement one `ExactDomain` interface. `PolynomialRing` is generic over it, and every ring has its own identity. Karatsuba multiplication switches on at 24 coefficients; a timing probe measured it faster from 32 on (about 2.4× at 256 coefficients with 64-bit entries). The crossover is an algorithm choice, not a limit.
- Cost is charged per 64-bit limb before each bigint operation. There is no degree or integer-size limit anywhere. `EQUATION_STOPS` is exactly `work`, `allocation` and `cancelled`, and the no-caps ratchet enforces it, along with the absence of cap constants and cap fields.
- Modular GCD (Brown):
  - uses word primes below 2^26, so residue products stay exact in JavaScript numbers;
  - detects unlucky primes by degree;
  - terminates by stabilization plus exact trial division;
  - falls back to the subresultant PRS if the prime supply is ever exhausted.
- The subresultant resultant follows Cohen 3.3.7, and the PRS gcd follows Cohen 3.3.1. Pseudo-division follows Cohen 3.1.2.
- Every public result is checked before return:
  - division and pseudo-division identities;
  - exact quotients;
  - gcds as common divisors;
  - the Bézout identity;
  - square-free reconstruction, square-freeness, coprimality and increasing multiplicities;
  - linear residuals, nullspace dimension and basis shape, and the inconsistency witness;
  - CRT and rational reconstruction.
- The private wire format (v1) handles ZZ and QQ polynomials and rationals. It rejects extra or accessor properties, noncanonical integers and rationals, trailing zeros, and mismatched domains or variables.
- Focused evidence: 8 files / 48 tests pass. They include:
  - resultants agreeing with an independent Sylvester-determinant oracle in 80 seeded cases up to degree 6;
  - a degree-40 resultant;
  - modular gcd equal to the PRS gcd in 30 seeded cases;
  - an unlucky-prime fixture built from the first prime the algorithm uses;
  - a degree-200 gcd with 500-bit coefficients;
  - square-free decomposition of a degree-100 input;
  - a 30×30 system;
  - mutated certificates being rejected;
  - typed stops for work, allocation and cancellation, with no partial value returned.
- Incremental TypeScript, scoped ESLint, compartment boundaries (36 tests) and OOE boundaries (8 tests) pass. The compartment manifest needed no change: the new folder lies inside the existing `symbolic-engine` compartment.

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live
