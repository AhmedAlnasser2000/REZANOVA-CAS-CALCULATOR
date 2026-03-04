# Milestone 02: Discrete Core

## What changed
- `Discrete` and `Combinatorics` pages are now active.
- `∑`, `∏`, `!`, `nCr`, and `nPr` are available and backed by exact integer-focused evaluation.
- `Σ` stays on the Greek page as a letter, while `∑` lives only on the Discrete page as the summation operator.

## What the new pages mean
- `Discrete`: finite sum, finite product, factorial
- `Combinatorics`: combinations and permutations

## Where to find important symbols
- `∑`: `Discrete`
- `∏`: `Discrete`
- `!`: `Discrete`
- `nCr`: `Combinatorics`
- `nPr`: `Combinatorics`

## How to use the new symbols
- Use `∑` for bounded finite sums such as `\sum_{k=1}^{5} k`.
- Use `∏` for bounded finite products such as `\prod_{k=1}^{4} k`.
- Use `!` after a non-negative integer.
- Use `nCr(n,r)` for combinations.
- Use `nPr(n,r)` for permutations.

## Worked examples
1. Finite sum
   - Open `Discrete`
   - Insert `∑`
   - Fill `k`, `1`, `5`, and `k`
   - Press `EXE`
   - Expect `15`
2. Sum of squares
   - Insert `∑`
   - Fill `k`, `1`, `5`, and `k^2`
   - Press `EXE`
   - Expect `55`
3. Finite product
   - Open `Discrete`
   - Insert `∏`
   - Fill `k`, `1`, `4`, and `k`
   - Press `EXE`
   - Expect `24`
4. Combination
   - Open `Combinatorics`
   - Insert `nCr`
   - Fill `5` and `2`
   - Press `EXE`
   - Expect `10`
5. Permutation
   - Insert `nPr`
   - Fill `5` and `2`
   - Press `EXE`
   - Expect `20`

## Common mistakes
- `Σ` is a Greek letter. `∑` is the summation operator.
- Factorial is only for non-negative integers in this milestone.
- `nCr` and `nPr` require integer arguments, and `r` must be less than or equal to `n`.
- This milestone handles finite exact evaluation, not advanced symbolic discrete identities.

## Exact vs numeric
- These operators are designed to return exact integer results when the input is valid.
- Invalid domains return controlled messages instead of raw parser failures.

## Best modes for this milestone
- `Calculate` for direct discrete evaluation
- `Equation` only when discrete operators are part of a larger algebraic expression you are composing
