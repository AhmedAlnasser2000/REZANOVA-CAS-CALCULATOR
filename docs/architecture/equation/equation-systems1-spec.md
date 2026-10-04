# EQUATION-SYSTEMS1 — Systems of Equations (slice 6, gate 11)

Date: 2026-10-04
Status:
- **Part A (multivariate atoms and linear systems, with parameters)**: implemented and backend-verified on 2026-10-04; private, no production caller.
- **Part B (Gröbner bases, exact points, triangular infinite sets, kernel elimination)**: implemented and backend-verified on 2026-10-04, in the same PR. This completes the slice.

Gate: backend only. Stage 11 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: [`EQUATION-PARAMETERS1`](equation-parameters1-spec.md) and every earlier gate. No dependency, schema, workspace or production caller is added. **No code from the old Equation engine is used**. The old `equation/polynomial/system.ts` appears only as the inventory baseline: it had shape caps of 24 candidate pairs and projected degree 12. This core has none.

## User decisions (2026-10-04)

- **Infinite solution sets**:
  - linear systems give exact parametric answers;
  - nonlinear systems that decompose triangularly also give parametric answers, with conditions as cases (part B);
  - anything else goes to the follow-up ledger.
- **Finite solution sets**: exact points, (1, 2), (√2, ½√2), or "the j-th root of …". The rational univariate representation is used internally only (part B).
- **Parameters**:
  - linear systems with parameters get case trees, with each pivot on a parameter a case;
  - nonlinear systems with parameters go to the ledger.
- **Kernels**: eliminate an exactly isolable unknown and hand the remaining one-variable problem to slices 1–5 (part B). Others name `EQUATION-CERTIFIED-NUMERICS1`.
- **Delivery**: one PR, two commits.

**From the roadmap:**
- Inequalities inside a system name `EQUATION-SEMIALGEBRAIC1`.
- ≠ conditions and natural-domain exclusions filter or constrain the answer.

## Semantics

- **A point** is a tuple in the problem's target order. The targets are sorted, so (x, y, z) ordering is alphabetical.
- **A parametric set** `{ variables, values, freeParameters, constraints }` is the set of tuples values(t) for every value of the free targets t that satisfies the constraints. The free targets are their own parameters: x + y = 1 is {(1 − y, y) : y free}.
- **With parameters**, the answer is a case tree whose cases hold points, parametric sets or ∅.

## Method (part A)

### Atoms and routing (`systems/solve.ts`)

- **Routing.** A problem with several targets goes to `decideSystem`.
- **Atoms.** Each relation, condition and natural-domain base becomes a polynomial atom over [targets…, parameters…], using the parameters gate's `parametricAtoms`, which now takes every target:
  - equations: numerator = 0;
  - denominators and natural-domain bases: ≠ 0.
- **Refusals:**
  - orders: `EQUATION-SEMIALGEBRAIC1`;
  - kernels of a target and nonlinear systems: part B.

### Linear systems (`systems/linear.ts`)

**Elimination.** Gauss–Jordan elimination without division: a pivot row r turns every other row j into p·row_j − a_jc·row_r. A nonzero rational pivot is preferred. A pivot candidate that is a non-constant polynomial in the parameters splits the case:
- pivot ≠ 0 continues with it;
- pivot = 0 sets it to zero and tries the next row.

**After the last column:**
- rows without a pivot require their right-hand side to vanish, which gives a condition or ∅;
- each leaf is a point (every column a pivot) or a parametric set in the free targets.

**≠ atoms on a leaf:**
- identically zero gives ∅;
- a condition on the parameters splits;
- one involving free targets becomes a constraint.

**Simplification.** Cases are simplified by the parameters gate's sign-split merging.

| System | Answer |
| --- | --- |
| 2x + y = 3, x − y = 0 | {(1, 1)} |
| x + y = 1 | {(1 − y, y) : y free} |
| x + y = 1, x + y = 2 | ∅ |
| x/y = 2 | {(2y, y) : y free, y ≠ 0} |
| a·x + y = 1, x − y = b | a ≠ −1: one point; a = −1, ab = 1: a line; a = −1, ab ≠ 1: ∅ |
| a·x + y = 1, x + a·y = 1 | a² ≠ 1: one point; a = 1: a line; a = −1: ∅ |

### Verifier (`systems/verify.ts`)

**Without parameters:**
1. The proof is the problem itself.
2. Every claimed point satisfies every atom exactly.
3. A parametric set satisfies every equation identically in its free targets, as a zero numerator over them.
4. **Completeness of a linear system** comes from an independent Bareiss solve over ℚ (`algebra/linear.ts`, itself self-verifying):
   - inconsistent ⇔ ∅;
   - full rank ⇔ the claimed point;
   - rank r ⇔ n − r free targets.
5. Re-derivation must agree.

**With parameters:**
- the parameters gate's verifier specializes every case at samples and compares with the parameter-free decision;
- its re-derivation uses the systems decider;
- parametric sets are compared as rational functions of their free targets.

## Evidence (part A)

`systems/linear.test.ts`, 10 tests:
- **No parameters:** a point, a line, ∅, rank 2 in three unknowns.
- **Exclusions:** checked on the point and kept as constraints on a line.
- **ℂ:** rational coefficients over ℂ.
- **Parameters:** two one-parameter systems and a two-parameter system.
- **Routing:** owners named for what part A does not decide.
- **Tampering:** a wrong point, a lost free direction, a non-identical direction, a dropped case.
- **Also:** wire replay of points, parametric sets and case trees; typed `work` and `cancelled` stops.

## Method (part B)

### Gröbner bases (`systems/groebner.ts`)

- **Polynomials.** Sparse polynomials over ℚ with terms sorted by grevlex or lex.
- **Algorithm.** Buchberger with the Gebauer–Möller pair criteria and the normal selection strategy, giving a reduced basis.
- **Cofactors (optional).** Each basis element can carry cofactors over the inputs (g = Σ cⱼ·fⱼ), so `checkCofactors` proves membership by an exact identity.
- **`isGroebner`** checks Buchberger's criterion independently.

### Exact points (`systems/zero-dim.ts`, `systems/polynomial.ts`)

1. **No solutions.** The basis {1} means no solution over ℂ (hence over ℝ).
2. **Finiteness.** A finite normal set B (every unknown has a pure power among the leading monomials) gives multiplication matrices M_v on B.
3. **Counting.** The Hermite form H = (Tr(M_{bᵢ}·M_{bⱼ})) has rank = the number of distinct complex solutions and signature = the number of distinct real ones. Its rank and signature come from a congruence diagonalization over ℚ (Sylvester's law).
4. **Separating element.** The separating element t = Σ cᵥ·xᵥ is accepted when the square-free part f of χ_t = det(T − M_t) has degree equal to the rank. χ_t comes from Bareiss determinants at T = 0..D and interpolation.
5. **Rational univariate representation** (Rouillier): xᵥ = gᵥ(t)/g₁(t), with g_q(T) = Σᵢ Tr(q·tⁱ)·Σⱼ a_{i+j+1}Tʲ.
6. **Points.** Each root τ of f (over ℝ, a real τ, since a separating t is real exactly at real solutions) is one solution. Each coordinate is the unique root of the eliminant χ_{xᵥ} whose certified disk meets gᵥ(τ)/g₁(τ), with refinement until exactly one candidate remains. Quadratic coordinates get radical forms.
7. **Exclusions.** ≠ atoms g are enforced exactly with fresh unknowns u·g − 1 = 0 (Rabinowitsch), and points are projected back.

### Infinite sets (`systems/polynomial.ts`)

1. **Splitting the targets.** With a lex basis (targets in order), the trailing targets U with no basis element in ℚ[U] are free.
2. **The last dependent** is solved by the parameters gate with U as parameters, using its basis elements as relations.
3. **Each earlier dependent** must have exactly one basis element of the form v + r(later). Otherwise the system is not triangular and goes to the ledger.
4. **Assembly.** The cases become parametric sets in U, constrained by the case conditions. A dependent the gate leaves free stays free.

| System | Answer |
| --- | --- |
| x² + y² = 1 over ℝ | x = ∓½·√(−4(y² − 1)) for −1 ≤ y ≤ 1 (two branches) |
| x² + y² = 1 over ℂ | the same two branches without conditions |
| x·y = 0 | (x, y) with y = 0, x free; (0, y) with y ≠ 0 |
| x² = y, z = x | (z, z², z) |

### Kernels by elimination (`systems/eliminate.ts`)

1. **Isolation.** An equation in which a target v occurs only as c·v, with c a nonzero constant, gives v = −rest/c. Isolations whose value has no other target, and then no kernel, are preferred.
2. **Substitution.** v is substituted everywhere else; each step is an equivalence.
3. **One target left.** Its problem goes to slices 1–5, and the tuples are rebuilt:
   - points (a point where an eliminated expression is undefined is dropped);
   - the `periodic` kind for real or complex families;
   - a parametric curve when no equation is left and the eliminated expressions are defined everywhere.
4. **Nothing isolable** names `EQUATION-CERTIFIED-NUMERICS1`.

| System | Answer |
| --- | --- |
| eˣ + y = 3, y = 1 | {(ln 2, 1)} |
| ln x + y = 0, y = −1 | {(e, −1)} |
| sin x = y, 2y = 1 | (π/6 + 2πk, ½) and (5π/6 + 2πk, ½) |
| sin x = y, x + y = 0 | {(0, 0)} (via the composition slice) |
| y = eˣ | {(x, eˣ) : x free} |
| eˣ = y, y = 2 over ℂ | (ln 2 + 2πik, 2) |

### Verifier (part B)

- **Finite polynomial answers** (`verify-nonlinear.ts`):
  - points are substituted exactly;
  - the extended basis is recomputed with cofactors: every element must equal its combination of the inputs, every input must reduce to zero, and Buchberger's criterion must hold. This proves the basis generates the input ideal.
  - the number of claimed points must equal the Hermite rank (signature over ℝ).
- **Infinite polynomial answers:** the free targets common to every piece are sampled. At each sample the restricted pieces must equal the system with those targets fixed, decided independently.
- **Kernel systems:** points, family members at k ∈ {−1, 0, 1, 2} and free values at small rationals must satisfy every relation (exactly, or by certified sign or complex zero test).
- **Re-derivation** must agree in every case.

## Evidence (part B)

`systems/nonlinear.test.ts`, 15 tests:
- **Rational and radical points:** four rational points; ±√2/2 with forms.
- **A RootOf point:** 1.324717957… (mpmath).
- **Complex-only solutions:** empty over ℝ, two points over ℂ.
- **Katsura-3:** four real solutions, checked against SymPy and mpmath.
- **Exclusions:** exact exclusions and an inconsistent system.
- **Infinite sets:** the circle over ℝ and ℂ, x·y = 0, and a curve in three unknowns.
- **Kernel eliminations:** over ℝ and ℂ, plus a refusal.
- **Tampering:** a missing point, a swapped coordinate, a false empty claim, a dropped branch.
- **Also:** wire replay; typed `work` and `cancelled` stops.

## Not in this gate (follow-up ledger)

- complex or algebraic coefficients in systems;
- nonlinear systems with parameters (comprehensive Gröbner systems);
- kernels with parameters or extra conditions in a system;
- positive-dimensional systems that are not triangular, or whose dependent target needs a root of degree ≥ 3;
- systems with kernels where elimination leaves several targets or interval answers;
- inequalities in systems (`EQUATION-SEMIALGEBRAIC1`).
