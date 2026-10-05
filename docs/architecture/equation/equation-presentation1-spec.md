# EQUATION-PRESENTATION1: Display of V6 Equation Answers (stage 13b)

Date: 2026-10-05
Status:
- **Part A (proven display rewrites, certified decimals, numeric order)**: implemented and verified on 2026-10-05.
- **Part B (printer, presentation read model, settings, corpus goldens)**: in progress, in the same PR.

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

## Not in this gate

- Screens, settings UI, polar and cis forms (`EQUATION-ADOPTION1`).
- Rewrites with free symbols (parameters, targets).
