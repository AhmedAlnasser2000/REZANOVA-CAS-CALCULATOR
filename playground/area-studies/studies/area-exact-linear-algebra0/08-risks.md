# AREA-EXACT-LINEAR-ALGEBRA0 Risks

## Correctness Risk

Exact matrix algorithms can silently become wrong if they reuse floating pivot logic, ignore denominator growth, or treat number-backed rationals as unbounded exact integers.

## Honesty Risk

Product-facing exact Matrix behavior would imply more capability than the first core slice should promise.

## Architecture Risk

If exact linear algebra is implemented inside polynomial elimination or Equation solving, Calcwiz will duplicate core matrix logic and make later reuse harder.

## Licensing Risk

Source mirrors are context only. No external algorithm code should be copied or translated line by line.

## Mitigation

- Start with `EXACT-LINEAR-ALGEBRA1`, not product-facing `MATRIX-EXACT1`.
- Keep exact and numeric cores separate.
- Add coefficient and denominator growth caps.
- Return typed stops and pivot/rank metadata.
- Defer bigint scalar work until cap pressure is concrete.
- Keep graphing and elimination out of scope.
