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

## PR B: quantifiers, statements and parameters

### User decisions (2026-10-07)

- The free names of a quantified row are unknowns by default: ∀x: x² + ax + 1 > 0 gives −2 < a < 2.
- A row whose every name is quantified is a statement, and its answer reads True or False. This affects only such rows.
- Rows with no equation (only inequalities, ∨ ∧ ¬ or quantifiers) make every free name an unknown. Rows with equations keep one unknown per equation row.
- Parameter cases read as Reduce-style cells: "If a > 0 and −√a < b ≤ √a:".

### B0. Automatic unknowns (`src/lib/new-equation/parse.ts` `autoTargets`)

With no equation row, every free name is an unknown, so x² + y² < 1, y > x is a region in x and y.

### B1. Quantifiers (`cad/atoms.ts`, `cad/decompose.ts`, `cad/solve.ts`, `cad/verify.ts`)

- **Prenex form.** Each ∀ or ∃ is pulled out in order of appearance, with its variable renamed apart. This is sound because a bound name occurs nowhere else. A denominator in a bound variable is refused, since its domain would sit under the quantifier.
- **Variable order.** The free names are the outer levels and the bound ones the inner levels, outermost quantifier first.
- **Lifting.** Each bound level is decided over its stack: ∀ needs every cell, ∃ some cell, stopping once decided. The free-level cells carry the truth, and the region builder reads them as usual. No equational constraint is used.
- **Statements.** With no free names the answer is the new schema-7 set kind `truth { value }` (no targets), shown as True or False. The validator allows empty targets only with a truth answer or a non-answer, and the request and row checks accept closed rows.
- **Verifier:**
  - rational samples of claimed cells are decided by a smaller decomposition of the statement at that point;
  - algebraic samples are located in a second decomposition, lifted in full (no early truth) with the free names reversed;
  - every cell of that second decomposition must agree with the claimed answer;
  - statements must equal the second decomposition's truth.
- **Keys.** The Logic page gains ∀ and ∃ keys (∀ inserts `\forall □:`), with tooltips on the keys and on hover.

### B2. Parameters through the decomposition (`cad/cases.ts`, `cad/feasible.ts`)

- **What is routed here.** Problems that the parameters and systems slices refused:
  - several relations in one unknown with several parameters;
  - real roots of degree ≥ 3 with several parameters;
  - orders or ∨ in systems with parameters;
  - quantified rows with parameters.
- **Order.** The parameters are the outer levels and the unknowns the inner ones.
- **Cases.** The description reads as a case tree over parameter cells:
  - conditions are the cell ends: p = v, or p ≷ its ends;
  - each case's set is the unknowns' description (points, intervals or `cylindrical`, with bounds in the parameters);
  - parameter cells with no solution stay as "No solution" cases;
  - cases that differ only in E > 0 against −E > 0 with one answer join as E ≠ 0.
- **Simplification:**
  - section values (constants or closed forms) are substituted into deeper bounds;
  - powers of the main variable split off in the projection, so x³ + cyx² − ayx gives 0 and the closed forms of the quadratic;
  - case conditions print with a parameter alone on one side where it stands alone in the sum (`isolate` in the Equation printer), so paired bounds chain: −√a < b ≤ √a.
- **Verifier.** Every cell of a decomposition with all coordinates reversed is checked against the claimed answer, and exactly one case must hold at each parameter value.
- **Assumption pruning** (`parameters/assume.ts`). Conditions coupling several parameters are decided by a partial decomposition (`conditionsSatisfiable`):
  - a case is dropped when its conditions cannot hold with the assumptions;
  - a condition is removed when its negation cannot hold with the rest.
  - So "Some cases could not be checked against the assumptions" no longer appears for polynomial conditions over ℝ.

### B3. Evidence and docs

- **Tests:**
  - `cad/quantifiers.test.ts`: regions of free names, a region in two names, True/False statements, a rejected wrong region and truth;
  - `cad/parameters.test.ts`: case trees for root order, a depressed cubic, a parametric region, a plain parametric set, c ≠ 0 joining with complete assumption pruning, coupled feasibility.
- **60 s probe:** 3.5–3.8 s per case including process start: ∀x: x² + ax + 1 > 0, ∃y: x² + y² < 1, ∀x: x² + 1 > 0, ∀x ∃y: y² = x + a, ∃z: x² + y² + z² < 1, ∀x: x⁴ + ax² + b ≥ 0, x² < a ∧ x > b, x³ + ax + b = 0, x² + y² < a ∧ y > x, x²yc + x³ = axy with a < 0, and ∃x: x³ + px + q = 0.
- **Golden case** `new-equation-forall`.
- **Playwright steps** with screenshots `forall.png`, `statement.png` and `parameter-cases.png`.
- **Guide and menu:** the Guide article explains ∧ ∨ ¬ ∀ ∃, regions and statements; the Example menu adds "For all (∀)" and "Statement".
- **Native core:** recorded in the roadmap. Rust, with a native desktop build and WebAssembly for the web, desktop-first and identical answers everywhere. It is far off: after the other workspace reconstructions (Integration first).
