# POLY-RAD1 Completion Report

- Milestone: `POLY-RAD1 — Exact Polynomialized Radical Follow-Ons Across Equation, Factor, and Simplify`
- Status: verified
- Scope completed:
  - extended `src/lib/polynomial-factor-solve.ts` so bounded biquadratic follow-ons can synthesize exact real roots from algebraic `x^2-α` factors and preserve repeated factor multiplicity for repeated biquadratic roots
  - reused the same bounded algebraic follow-on bridge across both radical solve paths:
    - `RAD2` sequential radical isolation
    - outer-inversion / composition handoff into bounded radical carriers
  - widened `Calculate > Factor` for bounded algebraic biquadratic factors without broadening the general polynomial factoring contract
  - widened `Calculate > Simplify` only for direct radical normalization wins such as repeated quadratic-in-even-power perfect squares; simplify does not become a second factor surface
  - kept broader cubic/general quartic radical follow-ons, third-step radical chains, and broader composition expansion out of scope
- Key examples now covered:
  - `\sqrt{x^4-5x^2+4}=1`
  - `\ln(\sqrt{x^4-5x^2+4})=0`
  - a sequential radical family that reduces into a bounded biquadratic exact follow-on
  - `x^4-5x^2+3` in `Calculate > Factor`
  - `\sqrt{x^4-10x^2+25}` and `\sqrt{x^4-2x^2+1}` in `Calculate > Simplify`
