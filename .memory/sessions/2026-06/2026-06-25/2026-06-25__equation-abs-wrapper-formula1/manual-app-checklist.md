# EQUATION-ABS-WRAPPER-FORMULA1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Real Exact one-layer absolute-value wrappers may hand generated degree-3 and degree-4 equations to Cardano or Ferrari.
- Output is one grouped `caseMath` answer with separate visible groups for `F=b` and `F=-b`.
- Each group keeps local Cardano/Ferrari definitions and case conditions.
- `b\ge0` remains a global wrapper fact, exact `b=0` uses one generated branch, and exact `b<0` is domain-empty.

## Manual App Steps

- Real Exact, Complex Off: solve `|z^3+z+1|=b` for `z`.
  - Expected: succeeds with grouped Real Cardano case output, `b\ge0`, and branch groups for `z^3+z+1=b` and `z^3+z+1=-b`.
- Real Exact, Complex Off: solve `|z^4+z+1|=b` for `z`.
  - Expected: succeeds with grouped Real Ferrari case output, `b\ge0`, and branch-local Ferrari definitions.
- Real Exact, Complex Off: solve `|y^3+y+1|=b` for `y`.
  - Expected: non-`x` target works and the selected target is `y`.
- Real Exact, Complex Off: solve `|(z^3+z+1)/(z-m)|=b` for `z`.
  - Expected: succeeds through grouped Cardano and preserves `z-m\ne0`.
- Real Exact, Complex Off: solve `|(z^4+z+1)/(z-m)|=b` for `z`.
  - Expected: succeeds through grouped Ferrari and preserves `z-m\ne0`.
- Real Exact, Complex Off: solve `|z^3+z+1|=0` for `z`.
  - Expected: succeeds through one generated branch `z^3+z+1=0`, not duplicated plus/minus groups.
- Real Exact, Complex Off: solve `|z^3+z+1|=-1` for `z`.
  - Expected: domain-empty error because absolute values are nonnegative.
- Complex Exact, Complex On: solve `|x^3+x+1|=b` for `x`.
  - Expected: remains unsupported at the guarded complex preimage boundary with no `RootOf` and no `PrincipalRoot` wrapper output.
- Real Exact: try `(z^3+z+1)^2=b`, `ln(z^3+z+1)=b`, and `sin(z^4+z+1)=b`.
  - Expected: remain unsupported and do not attempt generated Cardano/Ferrari formula handoff.
- Real Exact: solve `sqrt(z^3+z+1)=b` and `sqrt(z^4+z+1)=b`.
  - Expected: existing square-root formula wrapper behavior remains unchanged.
- Direct top-level examples such as `z^3+z+1=0` and `z^4+z+1=0`.
  - Expected: unchanged top-level Cardano/Ferrari behavior.
