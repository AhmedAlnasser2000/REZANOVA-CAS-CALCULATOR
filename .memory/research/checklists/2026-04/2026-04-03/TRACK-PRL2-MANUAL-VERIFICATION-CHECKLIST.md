# TRACK-PRL2 Manual Verification Checklist

Use this only after the automated gate passes. This is an optional confidence pass for real-domain numeric behavior, not the primary proof of correctness.

## Calculate: valid numeric powers
- Enter `2^\pi`.
- Expected:
  - `Evaluate` succeeds with a real numeric result
  - no raw CE complex/`NaN` artifacts appear
- Enter `(-8)^(1/3)`.
- Expected:
  - a real numeric result of `-2`
- Enter `(-8)^(2/3)`.
- Expected:
  - a real numeric result of `4`

## Calculate: rejected real-domain cases
- Enter `(-8)^0.3333333333333333`.
- Expected:
  - controlled real-domain rejection instead of a complex/ambiguous numeric answer
- Enter `0^0`.
- Expected:
  - controlled rejection
- Enter `0^(-1)`.
- Expected:
  - controlled rejection

## Calculate: roots and logs
- Enter `\sqrt[3]{-8}`.
- Expected:
  - `-2`
- Enter `\sqrt{-4}`.
- Expected:
  - controlled real-domain rejection
- Enter `\log_{4}(16)`.
- Expected:
  - `2`
- Enter `\log_{1}(16)` or `\log_{-2}(16)`.
- Expected:
  - controlled invalid-base rejection

## Table behavior
- Open `Table` and enter an expression that mixes valid and invalid samples, such as `\sqrt{x}` over a range containing negative and positive `x`.
- Expected:
  - rows outside the real domain display `undefined`
  - valid rows still render numeric values
  - the table remains usable
  - one warning indicates that some sampled rows were outside the real domain

## Keyboard inserts
- Open the `Functions` page in a mode where it is available.
- Expected:
  - a `log_a` / explicit-base log insert is available
- Open `Table` and browse virtual keyboard pages.
- Expected:
  - the `Algebra` page is visible there
  - the existing `ⁿ√` insert remains available through `Algebra`
