# EQUATION-SYSTEMS1 — Systems of Equations (slice 6, gate 11)

Date: 2026-10-04
Status:
- **Part A (multivariate atoms and linear systems, with parameters)**: implemented and backend-verified on 2026-10-04; private, no production caller.
- **Part B (Gröbner bases, exact points, triangular infinite sets, kernel elimination)**: next, in the same PR.

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

## Not in this part

- **Part B:** Gröbner bases, exact points of zero-dimensional systems, triangular infinite sets, kernel elimination.
- **Ledger:**
  - complex or algebraic coefficients in systems (the atoms read rational coefficients);
  - nonlinear systems with parameters.
