# EQUATION-HIGHER-EVEN-POWER-WRAPPER-FORMULA1 Manual App Checklist

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

- Real Exact one-layer higher even-power wrappers `F(target)^n=rhs` are live for even `n=4,6,8,10,12`.
- Symbolic or compound target-free RHS expressions generate grouped `F=\sqrt[n]{rhs}` and `F=-\sqrt[n]{rhs}` branches.
- Exact zero RHS collapses to one generated branch.
- Exact negative RHS stops as real-domain empty.
- Generated degree-3/4 branches can use existing Real Cardano/Ferrari `caseMath` output.

## Manual App Steps

- Real Exact: enter `(z^3+z+1)^4=b`, solve for `z`.
- Real Exact: enter `(z^4+z+1)^6=b`, solve for `z`.
- Real Exact: enter `(z^3+z+1)^8=a+c`, solve for `z`.
- Real Exact: enter `((z^3+z+1)/(z-m))^4=b`, solve for `z`.
- Real Exact: enter `(z^3+z+1)^{10}=0`, solve for `z`.
- Real Exact non-`x`: enter `(y^3+y+1)^{12}=b`, solve for `y`.
- Real Exact domain-empty: enter `(z^3+z+1)^4=-1`, solve for `z`.
- Complex Exact: enter `(z^3+z+1)^4=b`, solve for `z`.
- Real Exact deferred boundaries: enter `\sqrt[3]{z^3+z+1}=b`, `\ln(z^3+z+1)=b`, and `\sin(z^4+z+1)=b`.

## Expected Results

- The Real higher even-power cubic case shows grouped Cardano case rows with `b\ge0`.
- The Real higher even-power quartic case shows grouped Ferrari case rows with `b\ge0`.
- The target-free RHS expression case preserves `a+c` and shows `a+c\ge0`.
- The rational case preserves the denominator exclusion `z-m\ne0`.
- The exact zero case uses a clean single generated branch.
- The exact negative case reports no Real solution because even powers are nonnegative.
- The non-`x` case solves for `y`.
- Complex higher even-power, nth-root, log, and trig wrapper inputs remain unsupported and do not attempt generated formula families.
