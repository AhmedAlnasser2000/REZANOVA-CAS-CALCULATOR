# EQUATION-CARDANO-FERRARI-COEFFICIENT-READBACK1 Manual App Checklist

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

- Generic full-slot cubic/quartic templates keep compact helper-symbol readback.
- Specialized symbolic, mixed, and numeric coefficient Cardano/Ferrari cases substitute coefficients into the primary answer.
- Generated formula wrappers inherit the corrected primary rows while keeping local definition cards.

## Manual App Steps

- Real Exact: solve `a*x^3+b*x^2+c*x+d=0`; expect generic `A/B/C/p/q/Delta` case readback.
- Real Exact: solve `x^3+p*x+2=0`; expect primary rows with `p` and `2` substituted, not generic `A/B/C` as the answer.
- Complex Exact: solve `x^3+p*x+2=0`; expect `PrincipalRoot_3` branch rows with substituted radicands.
- Real Exact: solve `x^4+p*x^2+r=0`; expect biquadratic rows using `p` and `r`, not `A/B/C/D`.
- Complex Exact: solve `x^4+p*x+2=0`; expect Ferrari branches with substituted coefficient pieces and local helper definitions.
- Real Exact wrapper: solve `|z^3+z+1|=b`; expect grouped formula rows that inherit substituted Cardano output.

## Expected Results

- Generic symbolic templates remain compact.
- Specialized/mixed/numeric cases do not present the abstract helper derivation as the primary exact answer.
- Copy Result, To Editor, History, OOE, app-state, and Tauri compatibility surfaces remain unchanged.
