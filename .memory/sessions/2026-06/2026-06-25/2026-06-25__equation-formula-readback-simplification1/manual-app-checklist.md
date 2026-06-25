# EQUATION-FORMULA-READBACK-SIMPLIFICATION1 Manual App Checklist

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

- Cardano/Ferrari-derived formula rows remove narrow exact-arithmetic and neutral-term readback noise.
- Generic symbolic templates still keep compact helper definitions.
- Specialized and mixed formulas remain coefficient-substituted in the primary answer.

## Manual App Steps

- In Real Exact, solve `x^3+p*x+2=0`.
- In Real Exact, solve `x^4+p*x^2+r=0`.
- In Real Exact, solve `(z^3+z+1)^{10}=0`.
- In Real Exact, solve `(z^4+z+1)^6=b`.
- In Real Exact, solve `|z^3+z+1|=b`.
- In Real Exact, solve `\sqrt[3]{z^3+z+1}=b`.
- In Complex Exact, solve `a*x^3+b*x^2+c*x+d=0`.

## Expected Results

- `x^3+p*x+2=0` should not show `2/2` noise or adjacent-number artifacts such as `32/p`.
- `x^4+p*x^2+r=0` should keep biquadratic square-root rows readable and avoid `0+` or `x=0\pm...` detail noise.
- Wrapper formula answers should inherit the same cleanup while preserving grouped `caseMath`, local branch definitions, and wrapper facts.
- Generic full-slot templates may still use helper symbols such as `A`, `B`, `C`, `p`, `q`, and `\Delta` as the primary compact formula.
- Copy Result and To Editor should remain compatible with existing exact output contracts.
