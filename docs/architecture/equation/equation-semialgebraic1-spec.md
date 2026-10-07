# EQUATION-SEMIALGEBRAIC1: cylindrical decomposition, Boolean rows and quantifiers

Stage 16 of the [reconstruction roadmap](equation-reconstruction-roadmap.md), approved by the user on 2026-10-07.

It decides real polynomial problems with inequalities in several unknowns, and lets a row combine relations with
∧, ∨ and ¬. Quantifiers (∀, ∃) and parameters through the decomposition are the second part (PR B).

## User decisions (2026-10-07)

- **Regions as nested cells**, Mathematica `Reduce` style:
  - ranges of the first unknown, then of the next unknown as functions of the earlier ones;
  - adjacent cells merged;
  - closed-form bounds up to degree 2, otherwise "the k-th root of … in y";
  - a new schema-7 set kind, `cylindrical`.
- **∧, ∨ and ¬ inside a row.** Rows stay joined by "and".
- **∀ and ∃** as a prefix in a row (PR B). Bound variables are not unknowns.
- **Any number of unknowns, no caps.** Large problems end in a typed work stop.
- **Tooltips** for every symbol this stage adds, both on New Equation keyboard keys and when hovering the symbol in a typed row. New Equation only; the shared editor and the old UI are unchanged.
- **Verification**: each cell is checked exactly at a sample point, and an independent decomposition in another variable order must agree.

## PR A: Boolean rows, cylindrical decomposition, regions

### A1. Rows with ∧, ∨ and ¬ (`core/representation/formula.ts`, `core/logic/decide.ts`)

- A row reads as a formula:
  - relations and chains under `And`, `Or`, `Not`, `ForAll` and `Exists`;
  - ¬ needs a parenthesized relation, because ¬x < 1 reads as (¬x) < 1 and is a row error.
- Negation is pushed onto the relations (De Morgan, flipped orders, ∀ and ∃ exchanged).
- Formulas are canonical: flattened, deduplicated and sorted, so the problem hash does not depend on how the row was typed.
- `RelationProblem.formulas` is in the hash and the wire only when non-empty.
- **Formulas without quantifiers** that the decomposition does not own (one unknown, ℂ, kernels) are decided disjunct by disjunct:
  - the disjunctive form is charged to the budget and never truncated;
  - each disjunct is decided by its own slice;
  - the answer is the normalized union: intervals are joined, and points inside them are absorbed;
  - any undecided disjunct is the outcome, with nothing partial.
- **The verifier** re-decides and verifies each disjunct and compares the union.

### A2. Cylindrical algebraic decomposition (`core/cad/`)

- `recursive.ts`:
  - recursive dense polynomials over ℤ in x₁…xₙ;
  - subresultant gcd and resultant (Collins; Cohen 3.3.1 and 3.3.7) with exact divisions;
  - contents, square-free parts and a pairwise coprime basis. No multivariate factorization.
- `sign.ts`: the exact sign of an integer polynomial at a real algebraic point.
  - Rational coordinates are substituted exactly.
  - Otherwise, fixed-point interval Horner runs at doubling precision until zero is excluded, or the enclosure falls below Liouville's bound (Waldschmidt, Prop. 3.14), in which case the value is zero.
- `fiber.ts`: the distinct real roots of f(α, xₖ) over a sample α.
  - The norm is iterated resultants with the minimal polynomials of α's coordinates.
  - If that norm vanishes identically, it falls back to the norm over f's own coefficient values, which never vanishes.
  - Candidates are the norm's real roots, made pairwise disjoint. A sign change across a candidate's interval proves it is a root; any other candidate needs the exact zero test.
  - Over a nullified cell, the Lazard evaluation is used: the least-order mixed partial derivative that is not identically zero (McCallum, Parusiński and Paunescu 2019).
- `projection.ts`: Lazard's projection.
  - For each basis element: leading and trailing coefficients and discriminant; for each pair: the resultant. Contents are sent below.
  - It is proven correct without well-orientedness, so there is no "projection failed" path.
  - **Equational constraint**: a top-level equation that is primitive in xₙ reduces the first projection to P_L(E) ∪ {res(e, g)} (Nair, Davenport and Sankaran 2019). Lifting uses only E's sections, and its sectors are false. If E is nullified over a cell (a "curtain"), the projection is recomputed without the constraint.
- `decompose.ts`: lifting.
  - Sectors get simple rational samples (`simplestBetween`); sections get exact algebraic samples.
  - Partial CAD (Collins–Hong): a cell whose truth is fixed by atoms of its level or below is not lifted.
  - Atom signs are computed once, at their own level.
- `atoms.ts`: problem to atoms. For e = n/d: n op 0 for = and ≠, n·d op 0 for orders, plus num(b) ≠ 0 for every non-positive power base (the natural domain).
- `region.ts`: the true region as ∅, finite points, intervals (one unknown) or `cylindrical`.
  - **Bounds:**
    - a constant over fixed outer coordinates, with a proven radical form;
    - −c₀/c₁;
    - (−c₁ ± s√D′)/(2c₂), with D = s²·D′ and the sign taken from c₂'s invariant sign;
    - otherwise the index-th root.
  - **Merging:** cells merge when one description holds on the neighbouring section, evaluated exactly at the section's sample. The descriptions are made of roots of basis polynomials, delineable over the section, so one sample decides the whole section.
    - A section with no points stays a boundary.
    - Bounds from Lazard evaluations are never merged.
- `solve.ts`, routing: `routesToCad` takes real problems in at least two unknowns, with no parameters, every row polynomial, and orders, ∨ or ¬ present. The decision and the verifier route by the same predicate, first in `core/decide.ts`.

### A3. Verifier (`core/cad/verify.ts`)

1. Every claimed cell holds at a sample chosen from its own ends. The test evaluates the original rows exactly (`evaluateExact`), not the polynomials the decomposition used.
2. An independent decomposition in the reversed variable order is run. At every one of its cells' samples, the claimed set must contain the point exactly when the rows hold there. Cell ends are evaluated exactly: closed forms by substitution, root functions by the fibres.

This is re-derivation-strength evidence, not a certificate (ledger).

### A4. Contract and presentation

- **Core kind:** `cylindrical { variables, cells }`, where a cell is `{ lo, hi, loClosed, hiClosed, children? }`. Normalization checks the structure; cell lists are disjoint and ascending.
- **Schema 7:** `CanonicalEquationRegionCell`.
  - An `indexed-real-root` binder may use targets. Such a root is valid only inside cells deeper than every target it uses, where it is a root in that cell's variable.
  - Replay resolves the root's variable from the cell it bounds.
- **Layout:** one row per alternative, with the cells' conditions joined by "and" (−1 < x ≤ −√2/2 and −√(1 − x²) < y < √(1 − x²)).
  - Branching cells head their alternatives ("−1 ≤ x ≤ 1 and:"), and later alternatives read "or".
  - Root functions get definition rows in their own variable ("the smallest real root of y³ + xy + 1 = 0 in y").
- **Golden case:** `new-equation-region`.

### A5. Keyboard and tooltips (`src/app/new-equation/symbols.ts`)

- New Equation rows get the Equation keyboard pages plus a Logic page. Its ∧, ∨ and ¬ keys each carry a tooltip, beside parentheses and relation keys.
- When the pointer rests on ∧, ∨ or ¬ in a typed row, a tooltip appears. MathLive's `getOffsetFromPoint` and `getElementInfo` find the atom under the pointer; it is matched by its LaTeX command.
- The Example menu gains "Region", with x and y chosen.

### Evidence (A6)

- **Unit tests** (`core/cad/*.test.ts`, `core/logic/logic.test.ts`):
  - polynomial algebra;
  - signs and fibres, including conjugate nullification and Lazard evaluation;
  - truth at points;
  - region texts (disc, annulus, ∨ across unknowns, hyperbola, points, all of ℝ², ∅, the 3-unknown disc of a plane in a ball);
  - verification of 12 problems;
  - tampering: a dropped cell, a moved bound, a wrongly closed end, an extra cell.
- **60 s probe:** every region case took 3.6–5.2 s including process start: the disc above the diagonal, the annulus, ∨ across unknowns, x² + y² = 5 ∧ xy = 2 with x, y > 0, the ball and plane, the open ball, y³ + xy + 1 < 0, the empty region, ¬(x² ≤ 1), three constraints in three unknowns, x⁴ + y⁴ − 4xy < 0, y² ≤ x³ − x with x ≤ 2, and the heart curve (x² + y² − 1)³ < x²y³.
- **Fixed while probing:** x⁴ + y⁴ − 4xy < 0 ran out of work in the verifier. Root bounds at algebraic samples went through the generic norm with Liouville zero proofs. Using the fibres plus the sign-change test brought containment from 5.9 s to 0.12 s.
- **Playwright** (`e2e/new-equation.spec.ts`), with screenshots `region.png`, `symbol-tooltip.png` and `region-or.png`:
  - the region answer and its copy text;
  - the ∨ tooltip shown by hovering the symbol in a real MathLive row;
  - a ∨ region.

## PR B (next)

- **Quantifiers** by quantifier elimination: free variables projected outermost.
- **Parameters through the decomposition:** the several-parameter refusals and coupled-assumption pruning.
- **Docs:** the Guide article, examples, and recording the native-core decision.
