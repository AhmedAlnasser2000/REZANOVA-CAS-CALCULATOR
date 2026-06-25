# EQUATION-ALGEBRAIC-WRAPPER-FORMULA1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Real Exact one-layer square-root wrappers may hand their generated degree-3 or degree-4 equations to Cardano/Ferrari.
- Generated formula output stays structured as Real `caseMath` with formula definitions and case-local facts preserved.
- Wrapper fact `b\ge0` remains visible for `sqrt(F(target))=b`.
- Complex square-root wrappers and other wrapper families remain unsupported.

## Manual App Steps

- Real Exact, Complex Off: solve `sqrt(z^3+z+1)=b` for `z`.
  - Expected: succeeds with a Real Cardano case answer, `b\ge0`, and Real Cardano definitions/cases.
- Real Exact, Complex Off: solve `sqrt(z^4+z+1)=b` for `z`.
  - Expected: succeeds with a Real Ferrari case answer, `b\ge0`, and Real Ferrari definitions/cases.
- Real Exact, Complex Off: solve `sqrt(y^3+y+1)=b` for `y`.
  - Expected: non-`x` target works and the selected target is `y`.
- Real Exact, Complex Off: solve `sqrt((z^3+z+1)/(z-m))=b` for `z`.
  - Expected: succeeds through generated Cardano and preserves the denominator exclusion.
- Real Exact, Complex Off: solve `\sqrt{\frac{z^3+z+1}{z-m}}=b` for `z` or enter it through the fraction template.
  - Expected: same Cardano result with `b\ge0` and `z-m\ne0`.
- Real Exact, Complex Off: solve `sqrt((z^4+z+1)/(z-m))=b` for `z`.
  - Expected: succeeds through generated Ferrari and preserves the denominator exclusion.
- Real Exact, Complex Off: solve `\sqrt{\frac{z^4+z+1}{z-m}}=b` for `z` or enter it through the fraction template.
  - Expected: same Ferrari result with `b\ge0` and `z-m\ne0`.
- Complex Exact, Complex On: solve `sqrt(x^3+x+1)=b` for `x`.
  - Expected: remains unsupported with no generated formula answer, no `RootOf`, and no `PrincipalRoot` wrapper output.
- Real Exact: try `|z^3+z+1|=b`, `(z^3+z+1)^2=b`, `ln(z^3+z+1)=b`, and `sin(z^4+z+1)=b`.
  - Expected: remain unsupported and do not attempt generated Cardano/Ferrari formula handoff.
- Direct top-level Cardano/Ferrari examples such as `z^3+z+1=0` and `z^4+z+1=0`.
  - Expected: unchanged top-level formula behavior.
