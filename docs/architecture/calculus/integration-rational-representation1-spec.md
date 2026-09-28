# INTEGRATION-RATIONAL-REPRESENTATION1

Date: 2026-09-27
Gate: backend, CRITICAL root-only, explicitly approved implementation.
Status: implemented and backend-verified. The user subsequently authorized this milestone commit; no push.

Outcome: **verified rational representation and candidate-derivative infrastructure** inside `src/lib/symbolic-engine/integration/core/`. This is a prerequisite for automatic rational integration, with no application caller or visible capability claim. The broader [roadmap](integration-reconstruction-roadmap.md) remains subject to change when necessary.

## Prerequisites and boundary

The committed [exact algebra foundation](integration-exact-algebra1-spec.md) supplies immutable BigInt rationals, exact polynomial and fraction arithmetic, checked Euclidean algorithms and one explicit execution budget. This gate builds the missing ring/domain capabilities, elimination certificates, square-free quotient arithmetic, root-log representation and executable derivative proof before the next integration algorithm uses them.

Production changes are confined to the private core. No dependencies, shared scalar migration, legacy integration dispatch, Calculus adapter, worker, OOE, result schema or app presentation changes. No subagents were used. Concurrent Graphing and Matrix work remains independent.

## Algebra capabilities

- `ExactRing<E>` supplies owned canonical values, integer embedding, addition, subtraction, negation, multiplication and decidable equality/zero testing.
- `ExactIntegralDomain<E>` adds checked exact division. `PolynomialDomain` constructs this capability from a polynomial ring over an integral domain; it never exposes field inversion.
- `ExactField<E>` adds inversion. Ordinary polynomial division, Euclidean GCD, square-free decomposition, fraction construction and Gaussian elimination require this capability in their types and runtime guards.
- `PolynomialRing<E,D>` stores its coefficient **domain**, not an assumed field. The default domain type remains `ExactField<E>` for the existing field algorithms. Canonical ascending arrays, degree `-1` for zero, immutable operands and explicit context membership remain unchanged.
- `Q[z][x]` is direct nested polynomial arithmetic through `PolynomialDomain(Q[z])`; `Q[x]` and `Q(t)[x]` retain their prior behavior. Matching variable labels never establish ownership.

## Elimination and index conventions

`pseudo-division.ts` returns a quotient, remainder, exponent and multiplier. Verification reconstructs `lc(B)^max(deg(A)-deg(B)+1,0) A = Q B + R` with `deg(R)<deg(B)`. Zero divisors are rejected; zero dividends and constant divisors have explicit tests.

`polynomial-domain.ts` also extracts the monic coefficient content of nested polynomials over a field and the corresponding primitive part. It checks reconstruction and that the primitive coefficients have monic GCD one. Zero maps to zero content and zero primitive part.

`subresultant.ts` implements Brown's scaled PRS over an integral domain. Each step retains its pseudo-division evidence, checked normalization divisor, next remainder and negative principal scalar. The verifier checks exact identities, expected normalization, degree descent, principal-scalar recurrence and termination without generating a second PRS. It then checks scalar and indexed outputs against those relations. Computational coefficient division stays private.

- Input degrees and the internal sorting flag retain original input order. Every indexed output restores the sign `(-1)^((deg(A)-j)(deg(B)-j))` if sorting swapped the inputs. Resultants use `(-1)^(deg(A)deg(B))`.
- Indexed entries are ascending, carry their actual degree and coefficient of degree `j`, and include zero and defective subresultants. Subresultants are **not made monic**.
- With unequal nonzero degrees `m>n`, the highest boundary is `S_n=lc(B)^(m-n-1) B`, explicitly tagged `highest-boundary`. Equal-degree input polynomials are not passed off as an ordinary `S_n`.
- A PRS remainder following degree `p` belongs at index `p-1`; its actual degree can be lower. The principal-scalar recurrence supplies the correctly scaled subresultant at that lower degree. Missing intermediate indices are zero.
- Any zero input has scalar resultant zero and no ordinary indexed entries. Two nonzero constants have resultant one and no indexed entries. A nonzero constant `c` against degree `n` gives `c^n`.
- Separate `scalarResultant` and `indexedSubresultant` accessors perform verification. A requested index outside the defined range is invalid input.
- For `x²+1,x²−1`, the PRS remainder is `−2`, the defective `S_1` is `−2` with principal coefficient zero, and `S_0=Res=4`.

`subresultant-specialization.ts` evaluates `Q[z]` coefficients (generically, polynomial coefficients over an exact field) at an explicitly supplied value. It verifies the source certificate first and preserves original indices and degrees alongside specialized degrees and degree-loss flags. It does not rerun the PRS with smaller degrees or call any specialized entry a GCD. The test pair `z*x²+x+1,z*x+1` specializes at `z=0` to `x+1,1`: the original resultant specializes to zero, whereas the degree-reduced pair would have resultant one.

Algorithm reference: [Brown PRS documented in SymPy 1.14](https://raw.githubusercontent.com/sympy/sympy/1.14.0/sympy/polys/euclidtools.py), `dup_inner_subresultants`. This is a local TypeScript implementation of the mathematics, with no imported CAS implementation or runtime dependency. Small Leibniz determinants of Sylvester minors exist only in the independent tests.

## Quotient algebras and formal primitives

`SquareFreeQuotientAlgebra` constructs `K[z]/q` for an owned monic nonconstant square-free modulus over an exact field, exercised with `K=Q` and `K=Q(x)`. It implements **only `ExactRing`**. Representatives are reduced, immutable and bound to their algebra.

Unit analysis returns zero, a checked inverse with a Bézout witness, or a nonzero nonunit with a verified proper factor and coprime complement. Component creation, projection and CRT recombination verify modulus reconstruction, coprimality, inverse identities and component projections. No irreducibility or complete factorization algorithm is assumed.

`FormalPrimitiveDomain` owns distinct integration and residue indeterminates, both Q-polynomial rings, both nested polynomial orientations, `Q(x)` and `Q(x)[z]`. It constructs:

- `RootLogTerm`: `sum_{q(alpha)=0} w(alpha) log G(x,alpha)`, with monic square-free `q` in `Q[z]`, reduced `w`, and an outer-`x` argument with coefficients reduced modulo `q`.
- `FormalPrimitive`: a normalized rational part in `Q(x)` plus a finite list of root-log terms.
- Retained conditions: the rational part's denominator and the exact norm polynomial `Res_z(q,G)` of every term. A zero norm rejects an argument that vanishes identically on a component. Conditions remain even when weights or derivatives cancel; they are not reduced to the final derivative's denominator.

The root set of each square-free modulus is included once, without enumerating or selecting its roots. Constructor reduction does not multiply a weight by a residue-resultant multiplicity. Moduli may be reducible. These are formal **local complex** logarithmic primitives: local log choices differ by constants. Principal branches, real presentations, root isolation and radical conversion remain outside this gate. Original input-expression exclusions remain a later lowering responsibility; this gate retains the conditions of the represented primitive.

The all-roots logarithmic form follows the rational-integration discussion in [Bronstein's tutorial, section 1.3](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf). Automatic residue extraction and LRT selection are deliberately not implemented here.

## Derivative authority

A log derivative is computed as `Tr(w * G_x * G^-1)` in `Q(x)[z]/q`. The inverse carries the quotient algebra's checked Bézout proof; the derivative evidence checks `h*G=w*G_x` modulo `q`.

`quotient-trace.ts` constructs multiplication columns in the reduced power basis and sums their diagonal. Its verifier checks column congruences and independently computes the trace using Newton sums from the monic modulus. See [Sage's quotient-element trace definition](https://doc.sagemath.org/html/en/reference/polynomial_rings/sage/rings/polynomial/polynomial_quotient_ring_element.html#sage.rings.polynomial.polynomial_quotient_ring_element.PolynomialQuotientRingElement.trace).

`differentiatePrimitive` returns checked derivative evidence and retained conditions. `verifyPrimitiveDerivative` accepts an **explicit separate target** in the same owned `Q(x)` context and checks every term, the rational derivative, their sum and condition coverage. `verifyPrimitive` computes the evidence and proves the supplied candidate against that target. None constructs an integral or infers non-elementarity/completeness.

Known-answer fixtures:

| Modulus, weight, argument | Checked derivative |
| --- | --- |
| `q=z²+1/4`, `w=z`, `G=x+2z` | `1/(x²+1)` |
| `q=z−1/2`, `w=z`, `G=x²−1` | `x/(x²−1)` |
| `q=z⁵−z−1`, `w=1`, `G=x−z` | `(5x⁴−1)/(x⁵−x−1)` |

## Artifact and resource contracts

`primitive-wire.ts` adds the separately tagged private `formal-local-complex-primitive`, version 1. It stores variable labels, exact rational-polynomial structures, rational numerator/denominator, moduli, weights, arguments and retained conditions. Its coefficient leaves use the existing Q-polynomial wire codec; that format is unchanged.

Decode requires expected variable labels, creates fresh owned contexts and repeats representation, square-free, norm, canonicality and condition checks under the caller's budget. It rejects unknown keys/versions, proof flags, accessors, sparse arrays, incompatible variables, noncanonical fractions, unreduced weights/arguments, repeated roots, component-zero arguments and oversize data. No context object, named root, branch choice, execution budget or trusted verification flag is serialized. Target-integrand proof requires that integrand separately; a decoded artifact alone has no such authority.

All nested exact division, PRS steps, quotient operations, trace checks and artifact reconstruction share one `ExecutionContext`. Failure remains typed as invalid input, domain mismatch, division by zero, nonexact division, resource exhaustion or failed verification. Nonunits are a separate checked mathematical result, not a resource failure or guessed zero.

Tests use explicit finite profiles; the heavier derivative cases allow up to one billion logical work units and ten billion cumulative allocation units. These are conservative logical accounting limits, **not heap-byte claims or application defaults**. BigInt calls remain synchronous. Adoption must measure realistic workloads and choose runtime budgets; this milestone does not establish an interactive latency guarantee.

## Verification and handoff

Focused evidence includes the original 60 tests, independent Sylvester-minor checks over Q and Q[z], constants/zero/common-factor/swap/abnormal-drop cases, degree-loss specialization, units/nonunits and CRT over Q and Q(x), all three derivative fixtures, mutation rejection, cancellation conditions, strict replay and exhaustion during final verification. Final evidence: 11 files / 84 tests pass; incremental TypeScript and scoped lint pass; compartment (36), OOE (8), memory (22) and file-size (10) tests plus their validators pass; diff and local-link checks pass. The gate dossier records command results.

Required commands: focused core Vitest with two workers, incremental TypeScript, scoped ESLint, isolation test, compartment/OOE boundaries, memory protocol, file-size validation and diff hygiene. The user-approved commit checkpoint includes repository-wide lint/build. No full suite or Playwright gate is required while the private core has no application caller.

Next: `INTEGRATION-RATIONAL-DECISION1` owns Hermite reduction, residue extraction, LRT subresultant selection and specialization rules, and automatic primitive construction. Product adoption separately requires reviewed result and branch/display contracts. Shared-source migration, dependencies, unresolved equality or public-contract requirements trigger an explicit scope revision.

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

## 2026-09-27 decision-gate handoff

The [rational decision gate](integration-rational-decision1-spec.md) now builds automatic normalized-Q(x) primitives on these representations. It adds a separate full-derivation codec, factors primitive domain binding into `decodePrimitiveInDomain`, and supports replaying supplied norm evidence through `termFromEvidence`. Existing wire formats and this milestone's original candidate-verification contract remain unchanged. Ring-only monic division does not widen field division or turn quotient algebras into fields.
