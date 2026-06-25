# FORMULA-PRESENTATION-PIPELINE1 Manual App Checklist

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

- Real formula case answers display row-specific guards as `when` conditions.
- Global `Valid When` remains for facts that apply to the entire result.
- Copy/editor/history compatibility remains tied to the existing exact LaTeX payload.

## Manual App Steps

- Real Exact: enter `x^3+p*x+2=0` and confirm each Cardano case row has a visible `when` guard.
- Real Exact: enter `x^4+p*x^2+r=0` and confirm Ferrari radicand guards are attached to the relevant formula row.
- Real Exact: enter `|z^3+z+1|=b` and confirm the generated branch groups remain readable and each row's guard is shown as a row-local condition.
- Complex Exact: enter `a*x^3+b*x^2+c*x+d=0` and confirm Complex Cardano still renders as branch rows, not `caseMath`.

## Expected Results

- Row guards are visible beside their formula rows as `when ...`.
- `Valid When` does not collect case-only discriminant or radicand guards.
- Copy Result still copies the canonical exact answer string.
