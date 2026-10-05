# EQUATION-PRESENTATION1: Display of V6 Equation Answers (stage 13b)

Date: 2026-10-05
Status:
- **Part A (proven display rewrites, certified decimals, numeric order)**: implemented and verified on 2026-10-05.
- **Part B (printer, presentation read model, settings, corpus goldens)**: implemented and verified on 2026-10-05, in the same PR. This completes the gate.

Gate: presentation read model plus tests. There are no screens before `EQUATION-ADOPTION1`. Stage 13b of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies:
- [`EQUATION-RESULT-CONTRACT1`](equation-result-contract1-spec.md) (V6 and its read model);
- the precedent [`INTEGRATION-RATIONAL-PRESENTATION1`](../calculus/integration-rational-presentation1-spec.md).

No dependency, schema or production caller is added. Nothing from the old Equation engine is used: in particular, nothing from `src/lib/equation/presentation/`. No file under `src/lib/calculus/new-integration/` is edited.

## User decisions (2026-10-05)

- **Rewrites are proven by the engine.**
  - A nicer form (2√3 for √12, √2 for ½·√8, −asin(⅓) for asin(−⅓)) replaces a value only when the exact core proves the two equal.
  - If the proof cannot finish within the budget, the original form is shown.
  - The canonical V6 document never changes.
- **RootOf view: decimal plus definition.** For example: x ≈ 1.1673039783, "the real root of x⁵ − x − 1 = 0".
  - Every shown digit is certified.
  - Copy keeps the exact definition.
- **Settings now**:
  - Output style (Exact, Decimal, Both);
  - decimal places (`approxDigits`);
  - complex numbers as a + bi.

  Polar and cis forms come at adoption.
- **Families** are written x = π/6 + 2πk, k ∈ ℤ, one row per family.
- **Delivery**: one PR with two commits.

## Part A: values (`src/lib/symbolic-engine/equation/presentation/values.ts`)

This file is registered in the core isolation test as an adapter. It works in a store of its own, under the caller's `ExecutionContext`. Typed resource stops mean "fall back"; every other error propagates.

### Proven rewrites (`displayForm`)

- **Scope**: only subexpressions without free symbols (binder symbols allowed) are rewritten. A subexpression with a parameter or target is left as it is.
- **k-th roots of a positive rational** (`extractPower`):
  - q^(1/k) = (a·b^(k−1))^(1/k)/b;
  - the k-th power part is found by trial division to n^(1/(k+1)), then a perfect-power test of the cofactor. Every remaining prime exceeds n^(1/(k+1)), so at most k remain, and a k-th power part means the cofactor is t^k. The extraction is therefore complete; a budget stop keeps the radical.
  - The store's own numeric folding then gives ½·√8 → √2 and 1/√2 → ½·√2.
- **Odd functions**: asin, atan, sin and tan of a negative constant take the sign out.
- **Proof**: the rewritten node replaces the original only if `provenEqual` proves the difference zero, either structurally, by exact evaluation, or by the certified zero tests (`realSign`, or `complexIsZero` over ℂ).
- **Layout identities** (−(1 − e) → e − 1, positive leading terms first) change no value and belong to the printer (part B).

### Certified decimals (`decimalOf`)

- **Exact values**:
  - rationals rounded half away from zero;
  - real algebraic numbers by `realDecimal`;
  - complex algebraic numbers by `complexDecimal` (real and imaginary parts).
- **Real transcendental values**: enclosures at 64, 128, … bits until both ends round to the same text. Irrational values never tie, so this ends under the budget.
- **No decimal**: values with free symbols, non-real non-algebraic values, undefined values, or a stop.

### Order (`orderPoints`)

- **Real values** come first, ascending. **Non-real values** follow, by real part, then |imaginary part|, positive first, so conjugates sit together. Points are ordered lexicographically by coordinates.
- **Values that are not placed** (free symbols; parametric roots without bounds, which are already in index order) keep their canonical order after the placed ones.
- **An undecided comparison** keeps the canonical order.

## Evidence (part A)

`presentation/values.test.ts`, 13 tests:
- **Rewrites**: √12, ½·√8, 1/√2, √(3/4), ∛54 and 1 + √18, each checked independently by exact evaluation; odd functions; symbolic arguments untouched (√(12a) is stored as √12·√a, and only √12 changes).
- **Power extraction**: complete extraction, including a squared seven-digit prime and a product of two large primes; the budget fallback.
- **Decimals** (mpmath references):
  - √2, ln 2, π/6;
  - −5/8 → −0.63 (a tie);
  - the real root of x⁵ − x − 1;
  - the three roots of x³ + 2 over ℂ;
  - no decimal for a symbolic value or under a tiny budget.
- **Order**:
  - x³ = 1 over ℂ: 1, then −½ + (√3/2)i, then −½ − (√3/2)i;
  - x⁴ = 4 over ℂ: −√2, √2, √2·i, −√2·i;
  - a real quintic in ascending order.

## Part B: printer and read model

### The printer (`src/lib/display/printer/equation-v6.ts`)

The printer is a canonical printer adapter (`equationV6Printer`), plus `printEquationMath` and `printRelation`. It turns V6 math into visible LaTeX and plain text, deterministically, and needs no core. Everything it does is a ring identity; it changes no value:
- **Sums**: a −1 is distributed over an inner sum (−(1 − e) reads e − 1), and a positive term comes first. Polynomial definitions are ordered by descending degree.
- **Products**:
  - constants come first (π, e), then symbols alphabetically (4ac, ax, πx³), then the rest, with i last;
  - rational coefficients and factors with negative integer exponents go under a fraction bar;
  - a common integer factor of a lone sum and the denominator cancels: (6 − 2√2)/14 reads (3 − √2)/7;
  - `\cdot` goes between digits, and a space after a control word (`\pi k`).
- **Powers and functions**: q^(1/n) is shown as √ or ⁿ√; e^u; ln, trig and inverse trig, |u|, log_b, W₀ and W₋₁.
- **Relations**:
  - 0 moves to the right;
  - a lone negative term flips the relation (−b ≥ 0 reads b ≤ 0);
  - a variable term and a constant term separate (1 − a ≥ 0 reads a ≤ 1; k − 1 ≥ 0 reads k ≥ 1);
  - paired bounds chain (−1 ≤ y ≤ 1).
- **Failure**: an unknown head is refused, and the caller falls back to the canonical LaTeX of the leaf.

### The read model (`presentation/layout.ts`)

`presentEquationV6(document, { outputStyle, approxDigits }, ctx)` returns:
- the rows, each with a role (solution, case, definition, message), a depth, LaTeX and text;
- `copyLatex`, always exact;
- `plainText`;
- the owner, for an `incomplete` outcome;
- a `fallback` flag.

**Rows by set kind:**
- **finite sets**: rows in numeric order, as `x = …` or `(x, y) = (…)`, or "No solution";
- **cofinite sets**: "All real/complex numbers except …";
- **intervals**: x ∈ (a, b] ∪ …, or "All real numbers";
- **unions**: their parts in turn;
- **case trees**: "If … and …:" with conditions in reading order, then nested rows;
- **periodic sets**: x = a + Pk, k ∈ ℤ, with a range when restricted;
- **periodic families**: x = value, k ∈ ℤ, constraints;
- **interval families**: x ∈ [lo, hi), k = 0, 1, 2, …;
- **root sets**: "x is any root of p = 0";
- **parametric sets**: x = …, y ∈ ℝ, constraints;
- **reduced forms**: "Equivalent to: …";
- **unconfirmed sets**: "(candidate, not confirmed)";
- **non-answers**: a message with the owner code.

**Values:**
- **Exact form**: proven rewrites first. A binder's closed `form` is used only when the core proves it equal to the root.
- **Output style**: Exact gives `= exact`; Decimal gives `≈ decimal`; Both gives `= exact ≈ decimal`. Integers never repeat as decimals. Values with free symbols always show exact.
- **A root with no closed form**: shows its certified decimal, with the definition on the next line: "the real root of …" when it is the only real root, otherwise "the smallest / 2nd smallest / largest real root of …" (ranked exactly). A complex root shows "a root of …".
- **Roots inside larger expressions**: they keep their name r₁, defined at the end with its decimal ("r₁ ≈ −1.649385: the real root of 256r₁⁵ + 3125 = 0").
- **Copy**: always exact. Every root is defined by its polynomial and its exact isolating interval or disk, so copied text never depends on a decimal.

**Fallback**: a typed stop anywhere in the core work gives the printer-only presentation (canonical values, canonical order, no decimals). The V6 document is never modified.

## Evidence (part B)

- **`display/printer/equation-v6.test.ts`** (20 tests): signs and distribution; roots and fractions; content cancellation; functions; binder names; the `\cdot` and control-word spacing; huge integers; polynomial order; refusal of unknown heads; the adapter contract.
- **`presentation/layout.test.ts`** (76 tests):
  - **goldens**:
    - P4 and P9 (decimal plus ranked definitions);
    - R2 in Exact, Decimal and Both;
    - T1 and T2 families;
    - Q1 and a·x² + 2x + 1 conditions;
    - Katsura-3, intervals, a cofinite set, the circle;
    - x³ = 1 over ℂ in a + bi;
    - cos x = x as incomplete with its owner;
  - **all 67 corpus cases**: each presents, the document is byte-identical afterwards, copy contains no `≈`, and every root in copy is defined;
  - **fallback** under a 1-unit budget;
  - **rejection** of an invalid document.

## Not in this gate

- Screens, settings UI, polar and cis forms (`EQUATION-ADOPTION1`).
- Rewrites with free symbols (parameters, targets).
