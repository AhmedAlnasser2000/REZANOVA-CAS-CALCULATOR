# EQUATION-SQUARE-POWER-WRAPPER-FORMULA1 Manual App Checklist

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

- Real Exact one-layer square-power wrappers may hand generated degree-3 and degree-4 equations to Cardano or Ferrari.
- Output is grouped `caseMath` with separate branches for `F=\sqrt{rhs}` and `F=-\sqrt{rhs}`.
- Target-free symbolic RHS expressions are allowed and guarded by `rhs\ge0`.
- Exact zero RHS uses one generated branch; exact negative RHS is domain-empty.

## Manual App Steps

- Real Exact, Complex Off: solve `(z^3+z+1)^2=b` for `z`.
  - Expected: succeeds with grouped Real Cardano case output, `b\ge0`, and branch groups for `z^3+z+1=\sqrt{b}` and `z^3+z+1=-\sqrt{b}`.
- Real Exact, Complex Off: solve `(z^4+z+1)^2=b` for `z`.
  - Expected: succeeds with grouped Real Ferrari case output and branch-local Ferrari definitions.
- Real Exact, Complex Off: solve `(y^3+y+1)^2=b` for `y`.
  - Expected: non-`x` target works and the visible answer uses `y`.
- Real Exact, Complex Off: solve `(z^3+z+1)^2=a+c` for `z`.
  - Expected: succeeds and preserves `a+c\ge0`.
- Real Exact, Complex Off: solve `((z^3+z+1)/(z-m))^2=b` for `z`.
  - Expected: succeeds through grouped Cardano and preserves `z-m\ne0`.
- Real Exact, Complex Off: solve `((z^4+z+1)/(z-m))^2=b` for `z`.
  - Expected: succeeds through grouped Ferrari and preserves `z-m\ne0`.
- Real Exact, Complex Off: solve `(z^3+z+1)^2=0` for `z`.
  - Expected: succeeds through one generated branch `z^3+z+1=0`, without duplicate visible branch labels.
- Real Exact, Complex Off: solve `(z^3+z+1)^2=-1` for `z`.
  - Expected: domain-empty error because square powers are nonnegative.
- Complex Exact, Complex On: solve `(z^3+z+1)^2=b` for `z`.
  - Expected: remains unsupported with no square-power formula handoff.
- Real Exact: try `(z^3+z+1)^4=b`, `ln(z^3+z+1)=b`, and `sin(z^4+z+1)=b`.
  - Expected: remain unsupported and do not attempt generated Cardano/Ferrari formula handoff.
- Real Exact: solve `sqrt(z^3+z+1)=b` and `|z^3+z+1|=b`.
  - Expected: existing square-root and absolute-value formula wrapper behavior remains stable.
