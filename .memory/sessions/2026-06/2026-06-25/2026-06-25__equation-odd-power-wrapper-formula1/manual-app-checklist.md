# EQUATION-ODD-POWER-WRAPPER-FORMULA1 Manual App Checklist

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

- Real Exact one-layer odd-power wrappers `F(target)^n=rhs` are live for odd `n=3,5,7,9,11`.
- Odd-power wrappers generate one real odd-root branch, not a sign split.
- Exact negative RHS is allowed.
- Exact zero RHS collapses to one generated branch.
- No `rhs\ge0` wrapper fact appears for odd powers.
- Generated degree-3/4 branches can use existing Real Cardano/Ferrari `caseMath` output.

## Manual App Steps

- Real Exact: enter `(z^3+z+1)^3=b`, solve for `z`.
- Real Exact: enter `(z^4+z+1)^5=b`, solve for `z`.
- Real Exact: enter `(z^3+z+1)^7=a+c`, solve for `z`.
- Real Exact: enter `((z^3+z+1)/(z-m))^3=b`, solve for `z`.
- Real Exact: enter `(z^3+z+1)^3=0`, solve for `z`.
- Real Exact: enter `(z^3+z)^3=-1`, solve for `z`.
- Real Exact non-`x`: enter `(y^3+y+1)^7=b`, solve for `y`.
- Complex Exact: enter `(z^3+z+1)^3=b`, solve for `z`.
- Real Exact deferred boundaries: enter `(z^3+z+1)^4=b` and `\sqrt[3]{z^3+z+1}=b`.

## Expected Results

- The Real odd-power cubic case shows Real Cardano case rows and no `b\ge0` fact.
- The Real odd-power quartic case shows Real Ferrari case rows and no `b\ge0` fact.
- The target-free RHS expression case preserves `a+c` and shows no `a+c\ge0` fact.
- The rational case preserves the denominator exclusion `z-m\ne0`.
- The exact zero case uses a clean single generated branch.
- The exact negative case succeeds instead of reporting a nonnegative-domain stop.
- The non-`x` case solves for `y`.
- Complex odd-power, higher-even, and nth-root wrapper inputs remain unsupported and do not attempt generated formula families.
