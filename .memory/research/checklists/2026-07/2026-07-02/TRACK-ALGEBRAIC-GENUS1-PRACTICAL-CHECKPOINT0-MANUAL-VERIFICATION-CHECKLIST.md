# TRACK ALGEBRAIC-GENUS1-PRACTICAL-CHECKPOINT0 MANUAL VERIFICATION CHECKLIST

Date: 2026-07-02
primary_agent: codex
primary_agent_model: gpt-5.5
recorded_by_agent: codex
recorded_by_agent_model: gpt-5.5
verified_by_agent: codex
verified_by_agent_model: gpt-5.5
attribution_basis: live

## What Is Achieved Now

- Genus-0 practical radical integration is live for standard one-radical affine/quadratic families.
- Canonical Legendre genus-1 first-, second-, and third-kind templates are live in indefinite integration.
- Canonical rational-in-radical Hermite bridge cases are live for exact and selected symbolic even numerators.
- Elliptic results carry facts, proof detail cards, Copy Result support, History replay support, and overflow-safe answer cards.
- Noncanonical cubic/quartic radicals currently stop as elliptic/genus-1 deferred rather than generic unsupported.

## Manual App Steps

Open Calculus > Integrals > Indefinite.

Run each expression in the main editor:

1. `1/sqrt((1-x^2)(1-m*x^2))`
2. `sqrt((1-m*x^2)/(1-x^2))`
3. `1/((1-n*x^2)*sqrt((1-x^2)(1-m*x^2)))`
4. `(A*x^2+B)/sqrt((1-x^2)(1-m*x^2))`
5. `(A*x^2+B)/((1-n*x^2)*sqrt((1-x^2)(1-m*x^2)))`
6. `sqrt(x^3+x+1)`
7. `1/sqrt(x^3+x+1)`

For successful cases:

- Expand `Valid When`.
- Expand the elliptic proof or Hermite-reduction detail card.
- Use Copy Result.
- Open History and replay the latest entry.
- Confirm long answers scroll within the answer card instead of cropping.

## Expected Results

- Case 1 shows `EllipticF(arcsin(x), m)` with facts for `1-x^2` and `1-m*x^2`.
- Case 2 shows `EllipticE(arcsin(x), m)` with the expected square-root domain facts.
- Case 3 shows `EllipticPi(n, arcsin(x), m)` with characteristic and radical-domain facts.
- Case 4 shows an `EllipticF/E` combination, includes `m != 0`, and copies/replays safely.
- Case 5 shows an `EllipticPi/F` combination, includes `n != 0` and related facts, and copies/replays safely.
- Cases 6 and 7 report elliptic/genus-1 deferred readiness, not a plain generic unsupported error.

## Known Limits

- Generic exact cubic/quartic curves are not live Legendre transformations yet.
- Odd numerators over genus-1 radicals are deferred.
- Multiple radicals, nested radicals, degree `5+` radicals, decimals, `Abs`, broad symbolic branches, and complex elliptic branch handling remain deferred.
