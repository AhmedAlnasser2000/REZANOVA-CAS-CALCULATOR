# EQUATION-NTH-ROOT-WRAPPER-FORMULA1 Manual App Checklist

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

- Real Exact one-layer nth-root wrappers `\sqrt[n]{F(target)}=rhs` are live for exact integer `n=3..12`.
- Odd-index roots generate one branch `F=rhs^n` and allow exact negative RHS.
- Even-index roots generate one branch `F=rhs^n` with `rhs\ge0` when RHS is symbolic or compound, collapse exact zero RHS, and stop exact negative RHS.
- Generated degree-3/4 branches can use existing Real Cardano/Ferrari `caseMath` output through `Nth-Root Formula Cases`.

## Manual App Steps

- Real Exact: enter `\sqrt[3]{z^3+z+1}=b`, solve for `z`.
- Real Exact: enter `\sqrt[4]{z^4+z+1}=b`, solve for `z`.
- Real Exact: enter `\sqrt[5]{z^3+z+1}=a+c`, solve for `z`.
- Real Exact: enter `\sqrt[6]{z^3+z+1}=b`, solve for `z`.
- Real Exact rational: enter `\sqrt[3]{(z^3+z+1)/(z-m)}=b`, solve for `z`.
- Real Exact non-`x`: enter `\sqrt[3]{y^3+y+1}=b`, solve for `y`.
- Real Exact signed RHS: enter `\sqrt[3]{z^3+z+1}=-1`, solve for `z`.
- Real Exact zero RHS: enter `\sqrt[5]{z^3+z+1}=0`, solve for `z`.
- Real Exact domain-empty: enter `\sqrt[4]{z^3+z+1}=-1`, solve for `z`.
- Deferred boundaries: try `\sqrt[13]{z^3+z+1}=b`, Complex Exact `\sqrt[3]{z^3+z+1}=b`, `\ln(z^3+z+1)=b`, and `\sin(z^4+z+1)=b`.

## Expected Results

- The cubic nth-root case shows Real Cardano case rows under `Nth-Root Formula Cases`.
- The quartic nth-root case shows Real Ferrari case rows under `Nth-Root Formula Cases`.
- The even-index symbolic RHS cases show `b\ge0`; odd-index cases do not.
- The target-free RHS expression case preserves `a+c`.
- The rational case preserves `z-m\ne0`.
- The exact zero case uses a clean single generated branch.
- Exact negative odd-index RHS solves; exact negative even-index RHS is domain-empty.
- The non-`x` case solves for `y`.
- Complex nth-root, over-cap nth-root, log, and trig wrapper inputs remain unsupported and do not attempt generated formula families.
